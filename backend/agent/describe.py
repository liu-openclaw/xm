#!/usr/bin/env python3
"""智能商品描述生成服务 - 通过命令行调用千问 VL API 分析图片并生成商品信息"""

import argparse
import base64
import json
import sys
import os


def encode_image(image_path: str) -> str:
    """读取图片并转为 base64 字符串"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_mime_type(image_path: str) -> str:
    ext = os.path.splitext(image_path)[1].lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
    }
    return mime_map.get(ext, "image/jpeg")


def call_qwen_vl(image_path: str, api_key: str, api_base: str) -> dict:
    """调用千问 VL API 分析图片"""
    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url=api_base)
    image_b64 = encode_image(image_path)
    mime_type = get_mime_type(image_path)

    prompt = (
        "请根据这张商品图片，生成以下信息，以 JSON 格式返回：\n"
        "title（商品标题，20字以内）、\n"
        "description（详细描述，50-100字）、\n"
        "category（分类，从 数码/家居/服饰/图书/美妆/运动/其他 中选择）、\n"
        "condition（成色，从 全新/几乎全新/轻微使用/明显使用 中选择）。\n"
        "只输出 JSON，不要其他内容。"
    )

    response = client.chat.completions.create(
        model="qwen-vl-max",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_b64}"
                        },
                    },
                ],
            }
        ],
        max_tokens=500,
        temperature=0.3,
    )

    content = response.choices[0].message.content.strip()

    # 尝试提取 JSON（模型可能在 JSON 外加了 ```json 标记）
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:]) if lines[0].startswith("```") else content
        if content.endswith("```"):
            content = content[: content.rfind("```")].strip()

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        # 尝试用正则提取 JSON 对象
        import re

        match = re.search(r"\{[^{}]*\}", content, re.DOTALL)
        if match:
            result = json.loads(match.group())
        else:
            print(json.dumps({"error": "无法解析模型返回", "raw": content}), flush=True)
            sys.exit(1)

    return result


def main():
    parser = argparse.ArgumentParser(description="商品图片智能描述生成")
    parser.add_argument("--image", required=True, help="商品图片路径")
    parser.add_argument("--api-key", required=True, help="千问 API Key")
    parser.add_argument(
        "--api-base",
        default="https://dashscope.aliyuncs.com/compatible-mode/v1",
        help="千问 API 地址",
    )
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({"error": f"图片不存在: {args.image}"}), flush=True)
        sys.exit(1)

    try:
        result = call_qwen_vl(args.image, args.api_key, args.api_base)
        print(json.dumps(result, ensure_ascii=False), flush=True)
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
