# Tracecat 简体中文版本

## 翻译范围

本版本直接翻译前端源码中的静态文案，默认界面语言为 `zh-CN`。主要覆盖：

- 登录、注册、邀请、身份验证和账户设置。
- 工作空间、导航、组织与平台管理、角色与权限设置。
- 工作流编辑器、触发器、动作配置、执行历史和结果查看。
- 智能体、技能、对话、工具选择与人工审批。
- 安全事件、任务、评论、关联记录、字段与表单。
- 表格、凭据、密钥、OAuth / MCP 集成和 Git 同步。
- 相关错误提示、校验信息、无障碍标签、日期和时间显示。

AG Grid 使用与组件相同版本的官方简体中文语言包。日期使用 `date-fns` 的 `zhCN` 区域设置；日期显示使用中文格式，但时区沿用原功能的规则，UTC 标记仍然明确显示。紧凑时长保留 `d` / `h` / `m` / `s` 等短单位，详细时长显示中文。

下列内容仍可能显示英文：上游文档站及演示图片、第三方服务和集成返回的说明、服务端原始错误、用户自己填写的数据、AI 生成内容、技术标识符和部分代码编辑器内置提示。需要中文 AI 回复时，可在智能体提示词中指定回复语言。当前版本没有语言切换菜单；英文原始 README 保存在 [README.en.md](README.en.md)。

## 从源码部署中文版本

以下步骤用于新部署。已有环境升级前应备份数据库、对象存储与 `.env`，并阅读上游迁移说明。

1. 准备上游要求的 Docker（26 或以上）和 Docker Compose（2.29 或以上），并确保构建环境可以访问所需镜像、依赖源和字体下载服务。
2. 在当前 fork 的 **Code** 菜单复制克隆地址，替换下面的占位符后执行：

   ```bash
   git clone <当前中文仓库的克隆地址> tracecat-zh
   cd tracecat-zh
   ./env.sh
   ```

3. 按脚本提示选择运行模式、访问地址、PostgreSQL SSL 模式及首位超级管理员邮箱。脚本会生成服务密钥、数据库加密密钥和数据库角色密码，并写入 `.env`。已有 `.env` 时不要随意覆盖。
4. 核对 `.env`。首次使用基础认证时，保持 `TRACECAT__AUTH_TYPES=basic`；`TRACECAT__AUTH_SUPERADMIN_EMAIL` 必须是准备注册的邮箱，注意大小写一致。`PUBLIC_APP_URL` 与 `PUBLIC_API_URL` 必须对应实际访问地址；使用 HTTPS 反向代理时同步调整这些地址。
5. 使用包含源码构建配置的 Compose 文件：

   ```bash
   docker compose -f docker-compose.local.yml up -d --build
   docker compose -f docker-compose.local.yml ps
   ```

   `docker-compose.local.yml` 会从当前仓库的 `frontend` 构建中文 UI，也会构建所需后端服务。仅拉取上游预构建的 UI 镜像不会包含本次翻译。首次构建及数据库初始化可能需要较长时间。

6. 访问 `.env` 中的 `PUBLIC_APP_URL`。使用第 3 步指定的超级管理员邮箱注册账户，再登录初始化平台。后续模型、凭据和集成配置按实际环境填写。

查看服务日志：

```bash
docker compose -f docker-compose.local.yml logs --tail=100 ui api
```

完整部署要求、网络配置与版本迁移说明仍以上游 [Docker Compose 文档](https://docs.tracecat.com/self-hosting/docker-compose)为准。本次中文化未改变后端服务、认证逻辑、数据库结构或企业版许可。

### 使用独立 PostgreSQL

在 `.env` 中将 `TRACECAT__DB_URI` 指向独立应用库。使用单一数据库账号时，清空 `TRACECAT__DB_ADMIN_URI`，并确保该账号具有执行数据库迁移所需的 DDL 权限。`env.sh` 会生成指向内置库的管理员 URI，切换时需要清空或替换。

如果需要自动配置独立的 `app` 与 `migrator` 角色，将 `TRACECAT__DB_ADMIN_URI` 指向同一个外部数据库，并设置 `TRACECAT__DB_APP_PASSWORD` 和 `TRACECAT__DB_MIGRATOR_PASSWORD`；此时 `TRACECAT__DB_URI` 应使用 `app` 账号及对应密码。完整示例见 [独立 PostgreSQL 部署说明](docs/self-hosting/docker-compose.mdx#use-an-independent-postgresql-instance)。

叠加外置数据库覆盖文件启动：

```bash
docker compose \
  -f docker-compose.local.yml \
  -f docker-compose.external-db.yml \
  up -d --build
```

该覆盖文件使 `postgres_db` 不再随应用启动，并移除迁移容器对它的健康检查依赖；Temporal 继续使用内置数据库。外部应用库需要 PostgreSQL 15 或更高版本，在 `public` schema 中启用 `vector`（至少 0.8.0）与 `pg_trgm` 扩展；迁移账号没有安装权限时，请由数据库管理员预先启用。已有部署需另行迁移数据，覆盖文件不会复制数据或停止已经运行的内置数据库容器。

## 前端开发与检查

使用 Node.js 22 和仓库指定的 pnpm 10.30.3：

```bash
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend check
pnpm --dir frontend run typecheck
pnpm --dir frontend test --runInBand
```

运行和构建前端需要配置有效的应用与 API 地址。例如本地开发时：

```bash
export NEXT_PUBLIC_APP_URL=http://localhost:3000
export NEXT_PUBLIC_API_URL=http://localhost:8000
export TRACECAT__CSP_CONNECT_SRC_ORIGINS=http://localhost:8000
pnpm --dir frontend dev
```

前端单独启动不能代替完整后端环境。进行真实的登录、工作流执行、智能体或数据持久化测试时，需要按项目开发说明启动配套服务。

## 术语约定

| 原文 | 中文 |
| --- | --- |
| Workspace | 工作空间 |
| Workflow | 工作流 |
| Agent | 智能体 |
| Skill | 技能 |
| Case | 事件 |
| Execution event | 执行事件 |
| Action | 动作 |
| Credential | 凭据 |
| Secret | 密钥 |
| Registry | 注册表 |
| Trigger | 触发器 |

产品名称、API 路径、字段键名、枚举值、资源 ID、表达式语法、YAML 配置键和命令标识符保持原样。例如，界面可显示“输入”，但 API 属性仍为 `input`；表单命令可显示“标题”，其命令和 YAML 键仍为 `heading`。

## 维护翻译

以 [TracecatHQ/tracecat](https://github.com/TracecatHQ/tracecat) 为上游。合并新版本时检查新增的界面文案，保留数据协议和标识符，再运行格式检查、类型检查与前端测试。检查按钮和提示文字的测试断言也应随文案更新；测试中的 API 数据和状态值不应因翻译而改变。

中文文本长度可能与英文不同。新增或修改页面后，检查窄屏、弹窗、菜单、错误提示及无障碍标签是否完整显示。

本次中文化的上游基线：`db5545ed4c0d21ab8f4eacc7e5acf109da311a25`。原始许可证和企业版授权限制保持不变。

## 本次验证

2026-11-09 使用 Node.js 22 和 pnpm 10.30.3 完成：

- 前端格式与静态检查通过。
- TypeScript 类型检查通过。
- Jest 全量测试通过：291 个测试套件、2,890 个测试。
- Next.js 生产构建通过。
- 浏览器检查了中文登录、邮箱到密码的切换、密码校验、注册页面和窄屏布局。浏览器检查使用本地模拟 API，未部署完整后端，也未验证真实工作流执行或外部集成。
