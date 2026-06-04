const router = require('express').Router()
const multer = require('multer')
const path = require('path')
const { execFile } = require('child_process')
const fs = require('fs')

// 临时存储上传的图片
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads', 'ai_temp'),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, uniqueSuffix + path.extname(file.originalname))
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  }
})

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads', 'ai_temp')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

/**
 * POST /api/ai/describe
 * 接收图片文件，调用 describe.py 生成商品描述
 */
router.post('/describe', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, message: '请上传图片' })
  }

  const imagePath = req.file.path
  const scriptPath = path.join(__dirname, '..', 'agent', 'describe.py')
  const apiKey = process.env.DASHSCOPE_API_KEY || 'sk-6c8d44c8b61742abae46c8907b974133'

  execFile(
    'python',
    [scriptPath, '--image', imagePath, '--api-key', apiKey],
    {
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    },
    (err, stdout, stderr) => {
      // 清理临时文件
      fs.unlink(imagePath, () => {})

      if (err) {
        console.error('describe.py 执行失败:', stderr || err.message)
        return res.status(500).json({
          code: 500,
          message: 'AI 分析失败',
          detail: stderr || err.message
        })
      }

      try {
        const result = JSON.parse(stdout.trim())
        if (result.error) {
          return res.status(500).json({ code: 500, message: result.error })
        }
        res.json({ code: 200, data: result })
      } catch (e) {
        res.status(500).json({
          code: 500,
          message: 'AI 返回解析失败',
          raw: stdout.trim()
        })
      }
    }
  )
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

  try {
    const http = require('http')

    const result = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({ question: question.trim(), session_id: sessionId || '' })
      const options = {
        hostname: 'localhost',
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
    hostname: 'localhost',
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
      hostname: 'localhost',
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
      hostname: 'localhost',
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
