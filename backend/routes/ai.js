const router = require('express').Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// 确保上传目录存在（增强健壮性，添加错误处理）
const uploadDir = path.join(__dirname, '..', 'uploads', 'ai_temp')
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
    console.log('[ai] 已创建上传目录:', uploadDir)
  }
} catch (err) {
  console.error('[ai] 无法创建上传目录:', uploadDir, err.message)
}

// 临时存储上传的图片
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // 回调中再次确保目录存在（防止竞态）
      if (!fs.existsSync(uploadDir)) {
        try { fs.mkdirSync(uploadDir, { recursive: true }) } catch (e) {
          return cb(new Error('无法创建上传目录: ' + e.message))
        }
      }
      cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, uniqueSuffix + path.extname(file.originalname))
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (!allowed.includes(ext)) {
      return cb(new Error('不支持的图片格式: ' + ext))
    }
    cb(null, true)
  }
})

/**
/**
 * POST /api/ai/describe
 * 接收图片文件，通过千问 VL Max API 生成商品描述（纯 Node.js 实现）
 */
router.post('/describe', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, message: '请上传图片' })
  }

  const imagePath = req.file.path
  const apiKey = process.env.DASHSCOPE_API_KEY || 'sk-6c8d44c8b61742abae46c8907b974133'

  // 读取图片并转 base64
  let imageB64, mimeType
  try {
    const ext = path.extname(imagePath).toLowerCase()
    const mimeMap = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp'
    }
    mimeType = mimeMap[ext] || 'image/jpeg'
    imageB64 = fs.readFileSync(imagePath).toString('base64')
  } catch (e) {
    fs.unlink(imagePath, () => {})
    console.error('[ai] 读取图片失败:', e.message)
    return res.status(500).json({ code: 500, message: '读取图片失败', detail: e.message })
  }

  const prompt = (
    '请根据这张商品图片，生成以下信息，以 JSON 格式返回：\n' +
    'title（商品标题，20字以内）、\n' +
    'description（详细描述，50-100字）、\n' +
    'category（分类，从 数码/家居/服饰/图书/美妆/运动/其他 中选择）、\n' +
    'condition（成色，从 全新/几乎全新/轻微使用/明显使用 中选择）。\n' +
    '只输出 JSON，不要其他内容。'
  )

  const payload = JSON.stringify({
    model: 'qwen-vl-max',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageB64}` } }
      ]
    }],
    max_tokens: 500,
    temperature: 0.3
  })

  const https = require('https')

  const httpReq = https.request({
    hostname: 'dashscope.aliyuncs.com',
    path: '/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: 30000
  }, (apiRes) => {
    let data = ''
    apiRes.on('data', chunk => data += chunk)
    apiRes.on('end', () => {
      // 清理临时文件
      fs.unlink(imagePath, () => {})

      if (apiRes.statusCode !== 200) {
        console.error('[ai] 千问 API 返回非 200:', apiRes.statusCode, data.substring(0, 300))
        return res.status(500).json({
          code: 500,
          message: 'AI 分析服务异常',
          detail: `API 返回 ${apiRes.statusCode}: ${data.substring(0, 200)}`
        })
      }

      try {
        const apiResult = JSON.parse(data)
        let content = apiResult.choices[0].message.content.trim()

        // 去掉可能的 markdown 代码块标记
        if (content.startsWith('```')) {
          const lines = content.split('\n')
          if (lines[0].startsWith('```')) {
            lines.shift()
            if (lines[lines.length - 1]?.trim() === '```') lines.pop()
            content = lines.join('\n')
          }
        }

        // 解析 JSON
        let result
        try {
          result = JSON.parse(content)
        } catch {
          const match = content.match(/\{[^{}]*\}/)
          if (match) {
            result = JSON.parse(match[0])
          } else {
            throw new Error('无法解析模型返回')
          }
        }

        res.json({ code: 200, data: result })
      } catch (e) {
        console.error('[ai] 解析千问返回失败:', e.message, data.substring(0, 200))
        res.status(500).json({
          code: 500,
          message: 'AI 返回解析失败',
          detail: data.substring(0, 300)
        })
      }
    })
  })

  httpReq.on('error', (err) => {
    fs.unlink(imagePath, () => {})
    console.error('[ai] 千问 API 请求失败:', err.message)
    res.status(500).json({ code: 500, message: 'AI 分析请求失败', detail: err.message })
  })

  httpReq.on('timeout', () => {
    httpReq.destroy()
    fs.unlink(imagePath, () => {})
    res.status(500).json({ code: 500, message: 'AI 分析超时，请稍后重试' })
  })

  httpReq.write(payload)
  httpReq.end()
})

/**
 * POST /api/ai/rag
 * 转发 RAG 查询到 Python RAG 服务
 */
router.post('/rag', async (req, res) => {
  const { question, sessionId } = req.body

  if (!question || !question.trim()) {
    return res.status(400).json({ code: 400, message: '请输入问题' })
  }

  // 日期类查询拦截：直接返回服务器时间，不消耗 Token
  const q = question.trim().toLowerCase()
  if (q.includes('今天几月几日') || q.includes('今天几号') || q.includes('今天日期') || 
      q.includes('现在几月几日') || q.includes('现在几号') || q.includes('现在日期')) {
    const now = new Date()
    now.setHours(now.getHours() + 8) // UTC+8
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const date = String(now.getDate()).padStart(2, '0')
    return res.json({ code: 200, data: { answer: `今天是${year}年${month}月${date}日。` } })
  }

  try {
    const http = require('http')

    const result = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({ question: question.trim(), session_id: sessionId || '' })
      const options = {
        hostname: 'rag',
        port: 8899,
        path: '/api/rag/query',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000
      }

      const proxyReq = http.request(options, (proxyRes) => {
        let data = ''
        proxyRes.on('data', chunk => data += chunk)
        proxyRes.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve({ answer: data })
          }
        })
      })

      proxyReq.on('error', reject)
      proxyReq.on('timeout', () => {
        proxyReq.destroy()
        reject(new Error('RAG 服务超时'))
      })
      proxyReq.write(postData)
      proxyReq.end()
    })

    res.json({ code: 200, data: result })
  } catch (err) {
    console.error('RAG 请求失败:', err.message)
    res.status(503).json({
      code: 503,
      message: 'AI 客服暂不可用，请稍后重试',
      detail: err.message
    })
  }
})

/**
 * POST /api/ai/rag/stream
 * 流式转发 RAG 查询到 Python RAG 服务（SSE）
 */
router.post('/rag/stream', (req, res) => {
  const { question, sessionId } = req.body

  if (!question || !question.trim()) {
    return res.status(400).json({ code: 400, message: '请输入问题' })
  }

  // 日期类查询拦截：直接返回服务器时间，不消耗 Token
  const q = question.trim().toLowerCase()
  if (q.includes('今天几月几日') || q.includes('今天几号') || q.includes('今天日期') || 
      q.includes('现在几月几日') || q.includes('现在几号') || q.includes('现在日期')) {
    const now = new Date()
    now.setHours(now.getHours() + 8) // UTC+8
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const date = String(now.getDate()).padStart(2, '0')
    res.write(`data: ${JSON.stringify({ token: `今天是${year}年${month}月${date}日。` })}\n\n`)
    res.write('data: [DONE]\n\n')
    return res.end()
  }

  const http = require('http')

  // 设置 SSE 响应头，禁用缓冲
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const postData = JSON.stringify({ question: question.trim(), session_id: sessionId || '' })

  const options = {
    hostname: 'rag',
    port: 8899,
    path: '/api/rag/query/stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 30000
  }

  const proxyReq = http.request(options, (proxyRes) => {
    proxyRes.setEncoding('utf8')
    proxyRes.on('data', (chunk) => {
      res.write(chunk)
    })
    proxyRes.on('end', () => {
      res.end()
    })
  })

  proxyReq.on('error', (err) => {
    console.error('RAG 流式请求失败:', err.message)
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI 服务暂不可用' })}\n\n`)
      res.end()
    }
  })

  proxyReq.on('timeout', () => {
    proxyReq.destroy()
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI 服务超时' })}\n\n`)
      res.end()
    }
  })

  proxyReq.write(postData)
  proxyReq.end()

  // 客户端断连时终止上游请求
  req.on('close', () => {
    proxyReq.destroy()
  })
})

/**
 * POST /api/ai/rag/advise
 * AI 客服介入：基于聊天历史给出中立调解建议
 */
router.post('/rag/advise', async (req, res) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ code: 400, message: '请提供聊天历史' })
  }

  try {
    const http = require('http')

    const postData = JSON.stringify({ messages })
    const options = {
      hostname: 'rag',
      port: 8899,
      path: '/api/rag/advise',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 20000
    }

    const result = await new Promise((resolve, reject) => {
      const proxyReq = http.request(options, (proxyRes) => {
        let data = ''
        proxyRes.on('data', chunk => data += chunk)
        proxyRes.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve({ answer: data })
          }
        })
      })
      proxyReq.on('error', reject)
      proxyReq.on('timeout', () => {
        proxyReq.destroy()
        reject(new Error('RAG 服务超时'))
      })
      proxyReq.write(postData)
      proxyReq.end()
    })

    res.json({ code: 200, data: result })
  } catch (err) {
    console.error('AI 客服介入请求失败:', err.message)
    res.status(503).json({
      code: 503,
      message: 'AI 客服暂不可用，请稍后重试',
      detail: err.message
    })
  }
})

/**
 * POST /api/ai/audit
 * AI 自动审核商品，检测违禁品/虚假描述
 */
router.post('/audit', async (req, res) => {
  const { title, description, category, condition } = req.body

  if (!title || !description) {
    return res.status(400).json({ code: 400, message: '请提供商品标题和描述' })
  }

  try {
    const http = require('http')

    const postData = JSON.stringify({ title, description, category: category || '', condition: condition || '' })
    const options = {
      hostname: 'rag',
      port: 8899,
      path: '/api/audit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    }

    const result = await new Promise((resolve, reject) => {
      const proxyReq = http.request(options, (proxyRes) => {
        let data = ''
        proxyRes.on('data', chunk => data += chunk)
        proxyRes.on('end', () => {
          try { resolve(JSON.parse(data)) } catch { resolve({ passed: true, reason: '解析失败，默认通过' }) }
        })
      })
      proxyReq.on('error', reject)
      proxyReq.on('timeout', () => {
        proxyReq.destroy()
        reject(new Error('审核服务超时'))
      })
      proxyReq.write(postData)
      proxyReq.end()
    })

    res.json({ code: 200, data: result })
  } catch (err) {
    console.error('审核请求失败:', err.message)
    // 审核失败默认通过，不阻塞发布
    res.json({ code: 200, data: { passed: true, reason: '审核服务暂不可用，默认通过' } })
  }
})

module.exports = router
