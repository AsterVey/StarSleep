# v1.7.0 开源复用与参考

本轮从现有项目和官方格式入手；下表明确区分实际复用与设计参考，不把参考项目宣称为内置引擎。

| 来源 | 本轮用途 | 许可与边界 |
| --- | --- | --- |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | 参考客户端目录安装机制；实际改编 `src/installer.ts` 的 `sanitizeName` 函数，追加 Windows 路径校验与 64 字符限制 | MIT；提交 `7407f3893ad4dceab546ac002c3ef806e4000c73`；完整许可证随第三方声明提供。没有内置整个 CLI，也不运行 npx 安装器 |
| [openai/skills 的 skill-installer](https://github.com/openai/skills/tree/main/skills/.system/skill-installer) | 参考 GitHub 仓库/路径选择、SKILL.md 检查、拒绝覆盖的工作流程 | 本轮未复制其 Python 实现 |
| [fflate](https://github.com/101arrowz/fflate) | 复用项目现有压缩库生成 Claude 上传 ZIP | MIT，已在第三方声明中保留 |
| [GitHub REST API](https://docs.github.com/en/rest/search/search) | 实时搜索、读取仓库元数据、提交及目录树；固定版本下载和文件校验 | 不嵌入不受控网页，不索取登录凭据；遵守接口限流 |
| [Cisco Skill Scanner](https://github.com/cisco-ai-defense/skill-scanner) | 调研风险分类与审查边界 | 本轮未内置其 Python/Go/模型扫描引擎；界面静态线索由星眠有限规则提供，不借用其安全认证名义 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 核对 `packages/skill/skill-filesystem/src/index.ts` 的用户级 `DSH_HOME/skills` 和 `.agents/skills` 发现逻辑 | 没有修改或复制其客户端代码 |
| [OpenAI Skills 文档](https://learn.chatgpt.com/docs/build-skills) | 核对用户级共享 Skills 路径 | 客户端实际加载需新对话确认 |
| [Claude Skills 官方说明](https://support.claude.com/en/articles/12512180-use-skills-in-claude) | 区分本地 Claude Code 与 Claude 桌面聊天的 ZIP 上传流程 | 不把本地目录写入描述为云端安装成功 |

v1.6.0 的 ccusage 原版 Windows 引擎继续保留，见 [此前复用记录](OPEN-SOURCE-v1.6.0.md)。搜索和按需下载连接 GitHub，其余定时、资料和本地用量功能继续按原有规则运行。
