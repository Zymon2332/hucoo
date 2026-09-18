# Git 提交规范

本规范适用于 Agent 平台管理端后端项目。所有提交必须遵循 Conventional Commits，并配合 commitlint、husky、lint-staged 做本地校验。

## 1. 提交信息格式

```text
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

要求：

- `type` 和 `scope` 使用小写。
- `subject` 使用中文或英文均可，但同一项目保持一致。
- `subject` 不超过 50 个字符，句末不加句号。
- `body` 每行不超过 72 个字符，说明“为什么改”和“改了什么”。
- `footer` 用于关联 Issue、破坏性变更、共同作者。

## 2. type 类型

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 仅文档变更 |
| `style` | 不影响逻辑的格式调整（空格、分号、缩进） |
| `refactor` | 重构，不新增功能也不修复 Bug |
| `perf` | 性能优化 |
| `test` | 新增或修改测试 |
| `build` | 构建系统或依赖变更（Maven、npm、Docker） |
| `ci` | CI/CD 配置变更 |
| `chore` | 其他不修改 src 或 test 的杂项 |
| `revert` | 回滚某次提交 |

## 3. scope 范围

scope 使用模块名或组件名，与项目结构对应。常用 scope：

- `commons-api`
- `commons-dto`
- `commons-util`
- `commons-exception`
- `dependencies-bom`
- `component-web`
- `component-security`
- `component-cache`
- `component-database`
- `component-observability`
- `component-test`
- `gateway-server`
- `module-tenant`
- `module-identity`
- `module-model-governance`
- `module-tool-mcp`
- `module-agent`
- `module-project`
- `module-billing`
- `module-audit`
- `module-security`
- `module-monitoring`
- `module-integration`
- `application-admin`

如果改动跨多个模块，可使用：

- `global`
- `deps`
- `config`
- `docs`

## 4. subject 描述

- 使用祈使句，说明“做了什么”，不要用“修改了”“更新了”等模糊词。
- 推荐格式：
  - `feat(module-tenant): 新增租户级自定义模型开关`
  - `fix(module-model-governance): 修复 BYOK 密钥轮换失败问题`
  - `refactor(component-database): 重构多租户拦截器初始化逻辑`
  - `docs(agent-backend): 补充 MCP 私有注册审批说明`

## 5. body 正文

- 说明变更背景、原因、影响范围。
- 如果涉及数据库、接口、配置变更，必须写明。
- 如果有关联 Issue，在 footer 中使用 `Closes #123`。

## 6. footer 页脚

- 关联 Issue：`Closes #123`, `Refs #456`
- 破坏性变更：`BREAKING CHANGE:` 说明具体影响和迁移方式
- 共同作者：`Co-authored-by: Name <email>`

## 7. 完整示例

```text
feat(module-model-governance): 支持用户 BYOK 密钥轮换

- 新增密钥轮换接口与审计日志
- 增加密钥指纹校验，禁止明文回显
- 补充租户级开关 allowUserPrivateModel

Closes #128

BREAKING CHANGE: 自定义模型注册接口字段 keyRef 改为 keyId，
旧字段将在 1.2.0 移除，迁移方式见 docs/migration.md。
```

```text
fix(component-database): 修复多租户拦截器未忽略系统表的问题

- 在 TenantTableIgnore 中增加 sys_、qrtz_ 前缀
- 补充单元测试
```

## 8. 分支命名规范

推荐使用以下前缀：

| 前缀 | 说明 |
|------|------|
| `feature/` | 新功能 |
| `bugfix/` | 修复 Bug |
| `hotfix/` | 紧急修复 |
| `refactor/` | 重构 |
| `docs/` | 文档 |
| `chore/` | 杂项 |
| `release/` | 发布分支 |

示例：

- `feature/tenant-custom-model`
- `bugfix/byok-key-rotation`
- `hotfix/gateway-route-404`
- `refactor/mybatis-plus-tenant`
- `release/1.0.0`

## 9. 提交频率与粒度

- 一个提交只做一件事，避免巨型提交。
- 功能开发建议按“接口 → 实现 → 测试 → 文档”拆分提交。
- 禁止提交无法编译的代码。
- 禁止提交本地配置、密钥、IDE 文件、target 目录。

## 10. 分支合并与 PR 规范

- 所有变更通过 Pull Request / Merge Request 合并。
- PR 标题遵循 Conventional Commits 格式。
- PR 描述必须包含：
  - 变更类型
  - 变更内容
  - 影响范围
  - 测试方式
  - 关联 Issue
  - 是否涉及数据库、接口、配置变更
- 至少 1 名 Reviewer 通过。
- CI 必须通过：编译、单元测试、静态检查。
- 合并前请先 rebase 或 squash，保持提交历史整洁。

## 11. 工具与配置

推荐使用：

- commitlint：校验提交信息格式
- husky：Git hooks 管理
- lint-staged：提交前对暂存文件执行格式化
- standard-version 或 release-please：自动生成 CHANGELOG 和版本号

commitlint 配置示例（`commitlint.config.js`）：

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor', 'perf',
      'test', 'build', 'ci', 'chore', 'revert'
    ]],
    'scope-enum': [2, 'always', [
      'commons-api', 'commons-dto', 'commons-util', 'commons-exception',
      'dependencies-bom', 'component-web', 'component-security',
      'component-cache', 'component-database', 'component-observability',
      'component-test', 'gateway-server', 'module-tenant', 'module-identity',
      'module-model-governance', 'module-tool-mcp', 'module-agent',
      'module-project', 'module-billing', 'module-audit', 'module-security',
      'module-monitoring', 'module-integration', 'application-admin',
      'global', 'deps', 'config', 'docs'
    ]],
    'subject-case': [0],
    'subject-max-length': [2, 'always', 50],
    'body-max-line-length': [2, 'always', 72]
  }
};
```

husky 配置示例（`package.json`）：

```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.java": ["mvn -q spotless:apply", "git add"],
    "*.md": ["prettier --write", "git add"]
  }
}
```

## 12. 禁止事项

- 禁止使用无意义的提交信息，如 `update`、`fix bug`、`提交`。
- 禁止一个提交包含多个不相关变更。
- 禁止提交密钥、Token、密码、本地配置文件。
- 禁止在 `main` / `master` 上直接提交，必须走 PR。
- 禁止强制推送已共享的公共分支。
- 禁止绕过 CI 或 commitlint 校验。

> 一句话总结：提交信息要能让人一眼看懂“改了什么、为什么改、影响哪里”，格式统一、粒度合理、可追溯、可回滚。
