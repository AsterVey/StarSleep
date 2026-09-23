# v1.6.0 开源复用与来源记录

## 真正随程序执行的第三方实现

| 项目 | 固定版本 / 许可 | 星眠的用法 |
| --- | --- | --- |
| [ccusage](https://github.com/ccusage/ccusage) | 20.0.24 / MIT，Copyright 2025 ryoppippi | 原版 Windows x64 可执行文件；解析和去重 Codex / Claude Code 本地日志，输出按日 JSON |

构建依赖为 `@ccusage/ccusage-win32-x64@20.0.24`，在 package-lock.json 中锁定 npm 发布地址与完整性值。electron-builder 将该程序作为 extraResources 复制到 `resources/ccusage/ccusage.exe`，不会从用户 PATH 寻找其他同名程序。

固定执行参数为 `codex daily` 或 `claude daily`，加 `--json --offline --no-cost`、最近 30 天起始日期、本机时区和独立配置文件。界面不能传入任意命令或程序路径。统计在子进程运行，不占用主进程同步解析会话文件；超时 60 秒，退出时清理子进程。

星眠新增的适配层只处理 JSON 汇总结构、界面展示、导出与目录选择。没有复制重写 ccusage 的底层 Token 解析器。原 MIT 许可保存在 `resources/licenses/ccusage-MIT.txt`，随应用附在引擎旁边，并加入 THIRD_PARTY_NOTICES.txt。

上游依据：[项目说明](https://github.com/ccusage/ccusage/blob/main/apps/ccusage/README.md)、[Codex 数据来源说明](https://github.com/ccusage/ccusage/blob/main/docs/guide/codex/index.md)。本版针对发布的 20.0.24 JSON 实测，不跟随 main 分支自动升级。

## 资源中心的整理来源

以下仅为作者仓库索引与星眠撰写的用途摘要，不捆绑执行，也不声称已安装。核对日期 2026-09-22。

| 项目 | 用途 | 许可提示 |
| --- | --- | --- |
| [OpenAI Skills](https://github.com/openai/skills) | Codex 官方技能目录 | 各技能单独查看 |
| [Anthropic Skills](https://github.com/anthropics/skills) | Claude 文档与工作流技能 | 示例和文档技能条款不同 |
| [Claude 官方插件目录](https://github.com/anthropics/claude-plugins-official) | Claude Code 插件入口 | 各插件单独查看 |
| [Superpowers](https://github.com/obra/superpowers) | Agent 工程开发流程 | MIT |
| [antfu/skills](https://github.com/antfu/skills) | 前端生态技能 | MIT |
| [Vercel skills](https://github.com/vercel-labs/skills) | 技能发现与管理 CLI | MIT |
| [MCP servers](https://github.com/modelcontextprotocol/servers) | MCP 参考实现 | MIT；外部项目各自许可 |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | 浏览器工具连接 | Apache-2.0 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 官方插件架构与文档 | MIT |

星眠原有 Electron、React、Vite、Lucide 等依赖及各自许可继续保留。本轮不引入自动插件安装器、不下载未知脚本、不改变客户端授权状态。
