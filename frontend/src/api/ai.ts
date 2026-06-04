import request from '@/utils/request'
import type { ApiResponse } from '@/types'

interface DescribeResult {
  title: string
  description: string
  category: string
  condition: string
}

interface RagResult {
  answer: string
}

interface AuditResult {
  passed: boolean
  reason: string
}

export const aiApi = {
  /**
   * AI 智能生成商品描述
   */
  describe: (imageFile: File) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    return request.post<any, ApiResponse<DescribeResult>>('/ai/describe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    })
  },

  /**
   * AI 智能客服问答（支持多轮对话）
   * @param question 用户问题
   * @param sessionId 会话ID，用于多轮记忆
   */
  ragQuery: (question: string, sessionId?: string) =>
    request.post<any, ApiResponse<RagResult>>('/ai/rag', { question, sessionId: sessionId || '' }),

  /**
   * AI 客服介入：基于聊天历史给出调解建议
   */
  aiAdvise: (messages: { sender: string; content: string; time: string }[]) =>
    request.post<any, ApiResponse<RagResult>>('/ai/rag/advise', { messages }),

  /**
   * AI 智能客服流式问答（支持多轮对话）
   * @param question 用户问题
   * @param sessionId 会话ID
   */
  ragQueryStream: (question: string, sessionId?: string): Promise<Response> =>
    fetch('/api/ai/rag/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, sessionId: sessionId || '' })
    }),

  /**
   * AI 自动审核商品
   */
  audit: (data: { title: string; description: string; category: string; condition: string }) =>
    request.post<any, ApiResponse<AuditResult>>('/ai/audit', data)
}
