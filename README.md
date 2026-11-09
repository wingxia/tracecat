<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="img/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="img/banner-light.svg">
    <img src="img/banner-light.svg" alt="AI 原生安全自动化平台" width="85%">
  </picture>
  <p align="center">面向安全团队与 AI 智能体的安全自动化平台 · 简体中文社区版</p>
  <br>
</div>

<div align="center">

![Commits](https://img.shields.io/github/commit-activity/m/TracecatHQ/tracecat?style=for-the-badge&logo=github&color=6E7ED8)
![License](https://img.shields.io/badge/License-AGPL%203.0-6E7ED8?style=for-the-badge&logo=agpl)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/H4XZwsYzY4)

[简体中文](README.md) · [English (upstream)](README.en.md) · [中文部署与维护指南](LOCALIZATION.md)

</div>

## 关于这个中文版本

本仓库是 [TracecatHQ/tracecat](https://github.com/TracecatHQ/tracecat) 的社区 fork，默认使用简体中文界面。已翻译登录、工作空间、工作流、智能体、事件、表格、表单、凭据、集成、组织设置和平台管理等页面的静态文案，并适配中文日期、日历和表格控件。

中文化基于上游提交 `db5545ed4c0d21ab8f4eacc7e5acf109da311a25`。产品名称、API 字段、状态值、表达式和命令保持原有格式。本仓库不是 Tracecat 官方中文发行版；上游完整文档站、第三方集成的动态说明、服务端原始错误以及 AI 生成的内容尚未全面翻译。下方演示动图保留上游英文版本。

**使用中文界面时，请从本仓库源码构建前端。** 上游预构建镜像仍包含上游界面。部署步骤见 [中文指南](LOCALIZATION.md#从源码部署中文版本)。

## 简介

[Tracecat](https://tracecat.com) 是面向安全团队与 AI 智能体的开源安全自动化平台。它将构建智能体、编排工作流、处理事件和管理数据所需的能力整合到一个平台，帮助安全团队自动执行网络防御任务。

## 核心功能

<p align="center">不限数量的智能体、事件、查询表和工作流。</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="img/readme/agents.gif" alt="配置智能体：添加 VirusTotal 工具和审批步骤，查看子智能体，关联技能并发布新版本" width="100%"/>
      <p align="center"><b>智能体与技能</b> — 使用提示词、工具、MCP、子智能体和技能构建自定义智能体</p>
    </td>
    <td width="50%" valign="top">
      <img src="img/readme/cases.gif" alt="查看事件列表、智能体调查结论、时间线、失陷指标和证据" width="100%"/>
      <p align="center"><b>事件管理</b> — 借助智能体跟踪、自动处理和解决安全事件</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="img/readme/workflows.gif" alt="在 Tracecat 编辑器中查看工作流步骤并编辑智能体动作" width="100%"/>
      <p align="center"><b>工作流</b> — 基于 Temporal 可靠、可扩展地执行确定性逻辑</p>
    </td>
    <td width="50%" valign="top">
      <img src="img/readme/tables.gif" alt="浏览工作空间中的实体表与实体观测记录表" width="100%"/>
      <p align="center"><b>表格</b> — 存储与查询结构化数据</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="img/readme/mcp.gif" alt="通过 Claude Code 调用 Tracecat MCP 工具，列出并汇总未关闭的严重事件" width="100%"/>
      <p align="center"><b>Tracecat MCP</b> — 在 Claude Code、Codex、Copilot 等工具中通过提示词创建自动化</p>
    </td>
    <td width="50%" valign="top">
      <img src="img/readme/integrations.gif" alt="管理 Tracecat 凭据、OAuth 集成和托管 MCP 服务" width="100%"/>
      <p align="center"><b>集成</b> — 上游提供 100 多个预置连接器和 50 多个面向安全工具的托管 MCP 服务</p>
    </td>
  </tr>
</table>

## 更多能力

- **预置 MCP 服务**：上游提供 50 多个面向安全运营的托管 MCP 服务。
- **MCP 客户端**：将自定义智能体连接到 MCP 服务，支持远程 HTTP / OAuth，也支持通过 `npx` / `uvx` 运行本地服务。
- **自定义注册表**：将 Git 仓库中的 Python 脚本同步到 Tracecat。
- **隔离执行**：在 `nsjail` 沙箱或 `pid` 运行环境中运行不受信任的代码与智能体。
- **持久化执行**：基于 [Temporal](https://temporal.io) 提供可靠执行与扩展能力。
- **变量复用**：在工作流和智能体之间共享配置值。
- **单点登录**：支持 SAML / OIDC，无需为 SSO 单独付费。
- **免费审计日志**：可导出到 SIEM。
- **灵活部署**：使用 Tracecat Cloud，或通过 Docker、AWS Fargate、Kubernetes 自托管；支持[完全离线部署](https://docs.tracecat.com/self-hosting/air-gapped)。

## 企业版功能

- **多租户**：通过工作空间隔离团队以及开发、生产环境。
- **细粒度访问控制**：面向人员与智能体提供 RBAC、ABAC 和 OAuth 2.0 权限范围。
- **人工审批**：通过统一收件箱、Slack 或电子邮件审核敏感工具调用。
- **工作空间版本控制**：将工作流、智能体和表结构同步到 GitHub、GitLab、Bitbucket 等平台。
- **指标与监控**：监控工作流、智能体和事件。

## 开源版与企业版许可

除以下部分外，本仓库采用 [AGPL-3.0 许可证](LICENSE)：

- `packages/tracecat-ee` 目录中的代码。
- 控制 `ee` 功能访问的代码。

上述例外适用 Tracecat 的付费企业版（EE）许可。按照上游说明，未经许可，不得重新分发、销售、用于生产环境或以其他方式将这些例外部分商业化。中文化不改变许可、功能授权或访问控制；具体条款以仓库中的原始许可证为准。

> Tracecat 企业版提供美国或欧盟托管云服务，也支持配有专属支持的自托管部署。[联系官方了解详情](https://www.tracecat.com/contact)。

## 社区

欢迎在 [Tracecat Discord 社区](https://discord.gg/H4XZwsYzY4)提问、交流和反馈。中文文案问题可在当前 fork 的 Issues 中反馈。

## 技术栈

- 后端：Python、FastAPI、SQLAlchemy、Pydantic、uv。
- 前端：Next.js、TypeScript、React Query、Shadcn UI。
- 持久化工作流与任务：Temporal。
- 沙箱：nsjail。
- 数据库：PostgreSQL。
- 对象存储：兼容 S3。

## 贡献者

感谢所有贡献代码、集成、文档与社区支持的贡献者。参与开发请参阅上游[贡献指南](CONTRIBUTING.md)，维护中文版本请参阅[本地化说明](LOCALIZATION.md#维护翻译)。

<a href="https://github.com/TracecatHQ/tracecat/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=TracecatHQ/tracecat" alt="Tracecat 上游贡献者" />
</a>
