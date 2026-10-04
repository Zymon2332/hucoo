#!/usr/bin/env bash
#
# 重新生成管理端 OpenAPI 契约。
#
# 契约内容取自运行时 GET /v3/api-docs（test profile：关闭 Nacos 与安全拦截，Mock 持久化），
# 通过测试导出到 target/openapi/openapi.json，再同步到版本化的 doc/openapi.json。
#
# 用法（在 backend/ 目录下执行）：
#   ./scripts/export-openapi.sh
#
# 前端消费方式（二选一）：
#   1. 直接读版本化契约：backend/doc/openapi.json（可在 git diff 中审阅变更）
#   2. 直连运行中的后端：http://localhost:8081/v3/api-docs
#
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODULE="hucoo-server/hucoo-application-admin"
GENERATED="${BACKEND_DIR}/${MODULE}/target/openapi/openapi.json"
TARGET="${BACKEND_DIR}/doc/openapi.json"

cd "${BACKEND_DIR}"

echo "==> 导出 OpenAPI 契约（test profile）"
./mvnw -q -pl "${MODULE}" test -Dtest=OpenApiContractExportTests -Dsurefire.failIfNoSpecifiedTests=false

if [[ ! -f "${GENERATED}" ]]; then
    echo "ERROR: 未生成契约文件：${GENERATED}" >&2
    exit 1
fi

cp "${GENERATED}" "${TARGET}"

echo "==> 同步契约与接口清单"
python3 - "${TARGET}" "${BACKEND_DIR}/doc/ENDPOINTS.md" <<'PY'
import json
import sys
from collections import defaultdict
from pathlib import Path

spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
endpoints_md = Path(sys.argv[2])

paths = spec.get("paths", {})
operations = sum(
    1
    for item in paths.values()
    for method in item
    if method in ("get", "post", "put", "patch", "delete")
)
schemas = spec.get("components", {}).get("schemas", {})

groups = defaultdict(list)
for path, item in paths.items():
    for method, operation in item.items():
        if method not in ("get", "post", "put", "patch", "delete"):
            continue
        tag = (operation.get("tags") or ["未分类"])[0]
        groups[tag].append((path, method.upper(), operation.get("summary") or ""))

lines = [
    "# 管理端接口清单",
    "",
    "> 本文件由 `doc/openapi.json` 生成，请勿手工编辑；变更接口后先跑 `./scripts/export-openapi.sh` 再提交。",
    "",
    f"接口总数 **{operations}**，路径 **{len(paths)}** 条，资源分组 **{len(groups)}** 个。",
    "所有路径前缀为 `/api/admin/v1`，响应统一为 `Result<T>` 信封（见 [API_CONTRACT.md](API_CONTRACT.md)）。",
    "",
]
for tag in sorted(groups):
    lines += [f"## {tag}", "", "| 方法 | 路径 | 说明 |", "| --- | --- | --- |"]
    for path, method, summary in sorted(groups[tag], key=lambda x: (x[0], x[1])):
        lines.append(f"| `{method}` | `{path}` | {summary} |")
    lines.append("")

endpoints_md.write_text("\n".join(lines), encoding="utf-8")

print(f"==> 契约已同步：{sys.argv[1]}")
print(f"    openapi {spec.get('openapi')} | 路径 {len(paths)} | 操作 {operations} | schema {len(schemas)}")
print(f"==> 接口清单已同步：{endpoints_md}（{len(groups)} 个分组）")
PY
