#!/usr/bin/env python3
"""RAG 智能客服服务 - FastAPI + FAISS 实现平台规则问答"""

import os
import json
import numpy as np
import requests
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

# 配置
API_KEY = os.environ.get("DASHSCOPE_API_KEY", "sk-6c8d44c8b61742abae46c8907b974133")
API_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"
KNOWLEDGE_FILE = os.path.join(os.path.dirname(__file__), "knowledge", "platform_rules.txt")

app = FastAPI(title="闲趣二手智能客服", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 知识库与向量索引（纯内存，无文件依赖）
# ============================================================
_chunks: list[str] = []
_embeddings: np.ndarray | None = None


def load_knowledge() -> list[str]:
    """加载知识库，按规则条目拆分"""
    with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
        text = f.read()

    chunks = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("#") and not line[1:].strip()[0].isdigit():
            continue
        if line and (line[0].isdigit() and "." in line[:4]):
            chunks.append(line)
        elif chunks and not line.startswith("#"):
            chunks[-1] = chunks[-1] + " " + line

    return chunks


def get_embeddings(texts: list[str]) -> np.ndarray:
    """调用千问 text-embedding-v3 获取向量（批量）"""
    from openai import OpenAI

    client = OpenAI(api_key=API_KEY, base_url=API_BASE)
    all_embeddings = []

    # 千问 embedding API 单次限制 10 条，分批处理
    batch_size = 10
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        resp = client.embeddings.create(model="text-embedding-v3", input=batch)
        for d in resp.data:
            all_embeddings.append(d.embedding)

    return np.array(all_embeddings, dtype=np.float32)


def get_query_embedding(text: str) -> np.ndarray:
    """获取单个查询的向量"""
    from openai import OpenAI

    client = OpenAI(api_key=API_KEY, base_url=API_BASE)
    resp = client.embeddings.create(model="text-embedding-v3", input=[text])
    return np.array(resp.data[0].embedding, dtype=np.float32)


def init_index():
    """初始化知识库向量索引（纯内存）"""
    global _chunks, _embeddings
    print("正在加载知识库...")
    _chunks = load_knowledge()
    print(f"已加载 {len(_chunks)} 条规则，正在生成向量...")
    _embeddings = get_embeddings(_chunks)
    print(f"向量索引初始化完成，维度 {_embeddings.shape[1]}")


def search_similar(query: str, k: int = 5) -> list[str]:
    """余弦相似度搜索"""
    if _embeddings is None:
        return []
    q_vec = get_query_embedding(query)
    # 归一化后点积 = 余弦相似度
    q_norm = q_vec / (np.linalg.norm(q_vec) + 1e-10)
    e_norm = _embeddings / (np.linalg.norm(_embeddings, axis=1, keepdims=True) + 1e-10)
    scores = np.dot(e_norm, q_norm)
    top_indices = np.argsort(scores)[::-1][:k]
    return [_chunks[i] for i in top_indices if scores[i] > 0.3]


def web_search_fallback(query: str, k: int = 5) -> list[dict]:
    """当本地向量库无匹配时，使用 DuckDuckGo 搜索兜底"""
    import requests
    
    try:
        url = "https://api.duckduckgo.com/"
        params = {
            "q": f"二手交易 {query}",
            "format": "json",
            "no_html": 1,
            "skip_disambig": 1,
        }
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
        
        results = []
        # Abstract
        if data.get("AbstractText"):
            results.append({
                "title": data.get("AbstractSource", "DuckDuckGo"),
                "snippet": data["AbstractText"],
                "url": data.get("AbstractURL", "")
            })
        # Related topics
        for topic in data.get("RelatedTopics", [])[:k]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("FirstURL", "").split("/")[-1] if topic.get("FirstURL") else "搜索结果",
                    "snippet": topic["Text"],
                    "url": topic.get("FirstURL", "")
                })
        
        return results[:k]
    except Exception as e:
        print(f"联网搜索失败: {e}")
        return []


# ============================================================
# RAG 回答生成
# ============================================================
def generate_answer(question: str, context_chunks: list[str], history: list[dict] = None) -> str:
    """基于检索到的上下文，调用千问生成回答"""
    from openai import OpenAI

    client = OpenAI(api_key=API_KEY, base_url=API_BASE)

    context_text = "\n".join(f"- {chunk}" for chunk in context_chunks)

    if any("【联网搜索结果】" in c for c in context_chunks):
        system_prompt = (
            "你是闲趣二手交易平台的智能客服助手。以下信息来自互联网搜索结果，仅供参考。\n"
            "要求：\n"
            "1. 回答要准确、简洁、友好\n"
            "2. 如果搜索结果信息不确定，请标注\"根据网络信息\"\n"
            "3. 建议用户以平台官方规则为准\n"
            "4. 使用中文回答\n\n"
            f"参考信息：\n{context_text}"
        )
    else:
        system_prompt = (
            "你是闲趣二手交易平台的智能客服助手。请根据以下平台规则回答用户问题。\n"
            "要求：\n"
            "1. 回答要准确、简洁、友好\n"
            "2. 如果规则中没有相关信息，请诚实告知用户\n"
            "3. 使用中文回答\n\n"
            f"平台规则：\n{context_text}"
        )

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history[-MAX_HISTORY * 2:])
    messages.append({"role": "user", "content": question})

    response = client.chat.completions.create(
        model="qwen-turbo",
        messages=messages,
        max_tokens=600,
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()


def generate_answer_stream(question: str, context_chunks: list[str], history: list[dict] = None):
    """基于检索到的上下文，调用千问流式生成回答（SSE 格式）"""
    from openai import OpenAI

    client = OpenAI(api_key=API_KEY, base_url=API_BASE)

    context_text = "\n".join(f"- {chunk}" for chunk in context_chunks)

    if any("【联网搜索结果】" in c for c in context_chunks):
        system_prompt = (
            "你是闲趣二手交易平台的智能客服助手。以下信息来自互联网搜索结果，仅供参考。\n"
            "要求：\n"
            "1. 回答要准确、简洁、友好\n"
            "2. 如果搜索结果信息不确定，请标注\"根据网络信息\"\n"
            "3. 建议用户以平台官方规则为准\n"
            "4. 使用中文回答\n\n"
            f"参考信息：\n{context_text}"
        )
    else:
        system_prompt = (
            "你是闲趣二手交易平台的智能客服助手。请根据以下平台规则回答用户问题。\n"
            "要求：\n"
            "1. 回答要准确、简洁、友好\n"
            "2. 如果规则中没有相关信息，请诚实告知用户\n"
            "3. 使用中文回答\n\n"
            f"平台规则：\n{context_text}"
        )

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history[-MAX_HISTORY * 2:])
    messages.append({"role": "user", "content": question})

    # 第一个 chunk：通知流开始
    yield f"data: {json.dumps({'type': 'start'}, ensure_ascii=False)}\n\n"

    # 流式调用千问
    stream = client.chat.completions.create(
        model="qwen-turbo",
        messages=messages,
        max_tokens=600,
        temperature=0.3,
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield f"data: {json.dumps({'type': 'delta', 'content': delta.content}, ensure_ascii=False)}\n\n"

    # 最后一个 chunk：通知流结束
    yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"


# ============================================================
# 多轮对话记忆（session 管理）
# ============================================================
_sessions: dict[str, list[dict]] = {}  # { session_id: [{role, content}, ...] }
MAX_HISTORY = 10  # 保留最近 10 轮对话


def get_session_history(session_id: str) -> list[dict]:
    return _sessions.get(session_id, [])


def append_session(session_id: str, role: str, content: str):
    if session_id not in _sessions:
        _sessions[session_id] = []
    _sessions[session_id].append({"role": role, "content": content})
    # 只保留最近 N 轮
    if len(_sessions[session_id]) > MAX_HISTORY * 2:
        _sessions[session_id] = _sessions[session_id][-(MAX_HISTORY * 2):]


# ============================================================
# API 模型
# ============================================================
class QueryRequest(BaseModel):
    question: str
    session_id: str = ""


class AdviseRequest(BaseModel):
    messages: list[dict]


class AuditRequest(BaseModel):
    title: str
    description: str
    category: str = ""
    condition: str = ""


class QueryResponse(BaseModel):
    answer: str


# ============================================================
# 路由
# ============================================================
@app.post("/api/rag/query", response_model=QueryResponse)
async def rag_query(req: QueryRequest):
    if _embeddings is None:
        raise HTTPException(status_code=503, detail="向量索引未就绪")

    try:
        context_chunks = search_similar(req.question, k=5)
        if not context_chunks:
            web_results = web_search_fallback(req.question)
            if web_results:
                context_chunks = [f"【联网搜索结果】{r['title']}: {r['snippet']}" for r in web_results]
            else:
                return QueryResponse(answer="抱歉，我目前没有找到与您问题相关的信息。建议您联系人工客服获取帮助。")

        history = get_session_history(req.session_id) if req.session_id else None
        answer = generate_answer(req.question, context_chunks, history)

        # 记录本轮对话
        if req.session_id:
            append_session(req.session_id, "user", req.question)
            append_session(req.session_id, "assistant", answer)

        return QueryResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rag/query/stream")
def rag_query_stream(req: QueryRequest):
    """流式 RAG 查询接口，使用 SSE 格式逐字推送回答"""
    if _embeddings is None:
        raise HTTPException(status_code=503, detail="向量索引未就绪")

    try:
        context_chunks = search_similar(req.question, k=5)
        if not context_chunks:
            web_results = web_search_fallback(req.question)
            if web_results:
                context_chunks = [f"【联网搜索结果】{r['title']}: {r['snippet']}" for r in web_results]
            else:
                def _no_result():
                    yield f"data: {json.dumps({'type': 'start'}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'delta', 'content': '抱歉，我目前没有找到与您问题相关的信息。建议您联系人工客服获取帮助。'}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
                return StreamingResponse(_no_result(), media_type="text/event-stream")

        history = get_session_history(req.session_id) if req.session_id else None

        # 流式场景需要提前记录用户问题，回答在流结束后记录
        if req.session_id:
            append_session(req.session_id, "user", req.question)

        def _stream_with_session():
            full_answer = ""
            for chunk_data in generate_answer_stream(req.question, context_chunks, history):
                yield chunk_data
                # 收集完整回答用于记录
                try:
                    s = chunk_data.strip()
                    if s.startswith("data:"):
                        obj = json.loads(s[5:].strip())
                        if obj.get("type") == "delta":
                            full_answer += obj.get("content", "")
                except:
                    pass
            if req.session_id and full_answer:
                append_session(req.session_id, "assistant", full_answer)

        return StreamingResponse(
            _stream_with_session(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        def _error():
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
        return StreamingResponse(_error(), media_type="text/event-stream", status_code=500)


def generate_advise(messages: list[dict]) -> str:
    """基于聊天历史，结合平台规则，生成中立调解建议"""
    from openai import OpenAI

    client = OpenAI(api_key=API_KEY, base_url=API_BASE)

    # 将聊天历史格式化为可读文本
    chat_lines = []
    for m in messages:
        sender = m.get("sender", "未知")
        content = m.get("content", "")
        time_str = m.get("time", "")
        chat_lines.append(f"[{time_str}] {sender}: {content}")
    chat_history = "\n".join(chat_lines)

    # 检索相关平台规则
    chat_text_for_search = " ".join(m.get("content", "") for m in messages[-10:])
    rule_chunks = search_similar(chat_text_for_search, k=5)
    rules_text = "\n".join(f"- {chunk}" for chunk in rule_chunks) if rule_chunks else "暂无直接相关规则"

    system_prompt = (
        "你是闲趣二手交易平台的智能客服调解助手。请分析以下买家与卖家的聊天记录，"
        "结合平台规则，给出中立、公正的调解建议。\n\n"
        "要求：\n"
        "1. 语气中立、温和，不要偏袒任何一方\n"
        "2. 明确指出聊天中涉及的关键争议点\n"
        "3. 引用平台规则给出具体建议\n"
        "4. 如果规则未覆盖当前情况，诚实说明并建议联系人工客服\n"
        "5. 使用中文，条理清晰\n\n"
        f"平台规则：\n{rules_text}"
    )

    response = client.chat.completions.create(
        model="qwen-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请分析以下聊天记录并给出调解建议：\n\n{chat_history}"},
        ],
        max_tokens=800,
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()


@app.post("/api/rag/advise", response_model=QueryResponse)
async def rag_advise(req: AdviseRequest):
    if _embeddings is None:
        raise HTTPException(status_code=503, detail="向量索引未就绪")

    try:
        answer = generate_advise(req.messages)
        return QueryResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 自动审核接口
# ============================================================
@app.post("/api/audit")
async def audit_goods(req: AuditRequest):
    """AI 自动审核商品，检测违禁品、虚假描述等"""
    from openai import OpenAI

    if _embeddings is None:
        return {"passed": True, "reason": "审核服务未就绪，默认通过"}

    client = OpenAI(api_key=API_KEY, base_url=API_BASE)

    # 检索相关规则
    query = f"{req.title} {req.description} {req.category}"
    rule_chunks = search_similar(query, k=5)
    rules_text = "\n".join(f"- {chunk}" for chunk in rule_chunks) if rule_chunks else "暂无直接相关规则"

    system_prompt = (
        "你是闲趣二手交易平台的商品审核助手。请根据平台规则严格审核以下商品。\n\n"
        f"平台规则：\n{rules_text}\n\n"
        "审核维度：\n"
        "1. 违禁品：是否属于假冒伪劣、虚拟商品、活体动物、食品保健品、药品、烟草酒类等\n"
        "2. 虚假描述：描述是否夸大、是否与分类/成色矛盾、是否盗用网络图片特征\n"
        "3. 价格异常：价格是否明显过高或过低，偏离市场行情\n"
        "4. 分类匹配：商品分类是否与实际描述一致\n\n"
        "请严格审核，有疑问宁可拒绝也不要放过。返回纯 JSON：\n"
        '{"passed": true/false, "reason": "审核意见（passed为true时简短，false时说明具体违规点和依据的规则编号）"}\n'
        "只返回 JSON，不要包含其他文字。"
    )

    user_prompt = (
        f"商品标题：{req.title}\n"
        f"商品描述：{req.description}\n"
        f"分类：{req.category or '未指定'}\n"
        f"成色：{req.condition or '未指定'}"
    )

    try:
        response = client.chat.completions.create(
            model="qwen-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=300,
            temperature=0.1,
        )

        raw = response.choices[0].message.content.strip()
        # 提取 JSON（模型有时会多输出 markdown 包裹）
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
        result = json.loads(raw)
        return result
    except json.JSONDecodeError:
        return {"passed": True, "reason": "审核解析异常，默认通过"}
    except Exception as e:
        return {"passed": True, "reason": f"审核服务异常，默认通过: {str(e)}"}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "chunks": len(_chunks) if _embeddings is not None else 0,
    }


# ============================================================
# 启动
# ============================================================
if __name__ == "__main__":
    init_index()
    print("RAG 服务启动在 http://localhost:8899")
    uvicorn.run(app, host="0.0.0.0", port=8899, log_level="info")
