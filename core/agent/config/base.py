"""配置基类。

所有配置模型继承 ``BaseConfig``，统一从环境变量读取。
环境变量由 ``main.py`` 中的 ``load_dotenv()`` 从 ``.env`` 注入，
因此配置的 getter 必须在 ``load_dotenv()`` 之后惰性调用，
不要在模块导入期实例化配置。
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseConfig(BaseSettings):
    """所有配置模型的基类。

    子类只需通过 ``model_config = SettingsConfigDict(env_prefix=...)`` 补充前缀，
    其余通用项会与基类配置合并。
    """

    model_config = SettingsConfigDict(
        extra="ignore",
        case_sensitive=False,
    )
