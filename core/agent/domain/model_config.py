"""模型配置。

用于统一通过 langchain 的 init_chat_model 创建模型实例，
所有配置都由调用方显式传入，不依赖环境变量。
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ModelConfig(BaseModel):
    """调用 init_chat_model 所需的模型配置。

    Attributes:
        model: 模型名，例如 "gpt-4o"、"deepseek-chat"。
        model_provider: provider 名（openai / deepseek / anthropic ...）。
            不传时由 init_chat_model 根据模型名前缀推断。
        api_key: 该 provider 的 API Key。
        base_url: 自建网关或代理地址。
        temperature: 采样温度。
        max_tokens: 最大输出 token 数。
        timeout: 单次请求超时（秒）。
        max_retries: 失败重试次数。
        extra: provider 特有参数（如 top_p、reasoning_effort 等），
            会直接透传给模型构造函数。
    """

    model: str = Field(description="模型名")
    model_provider: str | None = Field(default=None, description="模型 provider")
    api_key: str = Field(description="API Key")
    base_url: str = Field(description="自定义 base_url")
    context_length: int = Field(description="model context length")
    temperature: float | None = Field(default=None, description="采样温度")
    max_tokens: int | None = Field(default=None, description="最大输出 token")
    timeout: float | None = Field(default=None, description="请求超时（秒）")
    max_retries: int | None = Field(default=None, description="重试次数")
    extra: dict[str, Any] = Field(
        default_factory=dict, description="provider 特有参数"
    )
