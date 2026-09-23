# Agent 夜间联动与原界面美化：调研与实施边界

调研日期：2026-09-22。基线：本地 v1.3.0，提交 `a7a3d8b`。本文是新增需求的调研记录，**不是已实现或已通过实机验收的功能清单**。v1.3.0 安装包不包含本页的新功能。

后续实现状态：v1.4.0 开发预览已加入接入与配置入口，原客户端美化的具体能力及本机限制见 [客户端美化说明](CLIENT-THEMES.md)。以下适配方向保留为研究记录，不能理解为全部已经交付。

## 已确认的需求

- 联动 Codex、官方 DeepSeek Harness、Claude 桌面版，在用户选定的夜间任务完成后关机。
- 美化这三个软件自己的界面。用户可以自行下载和导入美化包，由星眠帮助识别、配置、应用与恢复。
- 保留“只有星眠运行时才允许自动关机”。退出即解除当晚监控，不注册系统任务、后台服务或自动启动。
- 本地开发与验证，不发布 GitHub，不覆盖历史交付。

## 原界面美化的可行路径

| 客户端 | 已查到的路径 | 格式与实际限制 | 星眠适配方向 |
| --- | --- | --- | --- |
| Codex | 官方外观设置；社区 Codex Dream Skin | 官方支持颜色、字体及主题分享。Dream Skin 支持带 JSON、CSS、背景图的 ZIP；CDP 路线对部分 Windows owl 版本失效 | 官方主题优先；壁纸皮肤单独检测兼容性。导入库与应用分开，不能用文件复制成功表示换肤成功 |
| DeepSeek Harness | 官方 `ctx.theme` 扩展；`dsh-ui-appearance`；`deepseek-harness-themes` | 包括配色 JSON 与客户端插件，不是统一 ZIP 标准。Web 和 Desktop 可以使用不同 profile；部分偏好和壁纸存在浏览器中 | 识别具体格式和 profile，通过对应扩展应用，避免写错另一浏览器或另一个客户端的数据 |
| Claude 桌面版 | Windows `claude-theme-mod` | 颜色 JSON 需要主题加载器；所查实现修改 Electron fuses 和 app.asar，客户端更新会重置修改 | 列为需单独验证的高级适配。导入颜色文件不等于官方客户端已支持主题；应用前展示具体修改、备份和恢复方式 |

来源：

- [Codex 官方外观设置](https://learn.chatgpt.com/docs/reference/settings)。
- [Codex Dream Skin](https://github.com/Fei-Away/Codex-Dream-Skin)、[Windows 兼容说明](https://github.com/Fei-Away/Codex-Dream-Skin/blob/main/windows/README.md)、[已报告的 owl 问题 #235](https://github.com/Fei-Away/Codex-Dream-Skin/issues/235)。上游 README 已明确未保证受影响版本可用；这不是当前电脑的实测结论。
- [dsh-ui-appearance](https://github.com/TQSY114514/dsh-ui-appearance)、[deepseek-harness-themes](https://github.com/orxz/deepseek-harness-themes)、[后者主题类型说明](https://github.com/orxz/deepseek-harness-themes/blob/main/docs/theme-spec.md)。
- [claude-theme-mod](https://github.com/sillyhappydog/claude-theme-mod)。另一个 [claude-desktop-extra](https://github.com/patrickjaja/claude-desktop-extra) 面向 Linux，不能作为 Windows 已兼容的依据。

以上是原项目的能力说明，未在当前客户端安装或验证。参考代码时核对对应提交的许可证；星眠继续保留 AsterVey 署名和现有禁止售卖许可，第三方代码与素材保留各自许可声明。主题作者、来源与素材权利单独保存，不把社区主题整包默认再分发。

## 美化包管理的具体交互

1. 选择目标软件，检测安装类型与版本；展示“可用 / 需配置 / 不兼容 / 未验证”。
2. 拖入或选择本地美化包，也可粘贴该格式支持的主题文本。自动识别格式；无法识别时列明缺少什么，保留原文件。
3. 展示名称、作者、来源、目标软件、背景预览和需要的适配器。预览只展示样式，不执行包内脚本。
4. 导入加入本地主题库，不立即改变正在工作的客户端。明确显示本次将改动哪些配置、是否需要重启。
5. 应用时备份受影响的主题字段或文件，通过目标适配器生效；应用后读取回执或实界面结果。无法确认时显示“未验证”，不能提示“成功”。
6. 提供切换、重新应用、导出原包、移除库中主题、恢复默认，以及恢复上一次配置。恢复不得覆盖用户之后修改的模型、密钥或其他设置。

格式逐个适配，不承诺任意 ZIP 都能用于任意软件。主题文件不带自动执行权限；插件安装与纯主题导入是两种操作。压缩包解析限制条目、大小和展开路径，拒绝路径穿越及链接。CSS 或脚本扩展只由明确支持的适配器处理。

## 任务完成事件：已查证与尚未查证

| 来源 | 已查证 | 尚需验证 |
| --- | --- | --- |
| Codex | App Server 的 `turn/completed` 区分 completed、interrupted、failed；生命周期 hooks 包含 Stop、Interrupt、PermissionRequest 等 | 当前桌面任务的事件接入方式、子任务/自动续跑/待输入识别。新开 app-server 进程不等于订阅已运行桌面任务 |
| DeepSeek Harness | 官方会话 `turn/end` 区分 completed、aborted、blocked、error、max-tokens、interrupted；Agent 有队列和 idle/running 状态 | 当前版本插件接入、父子任务与后续队列是否耗尽、实际本地 profile 生命周期 |
| Claude 桌面 Code 标签 | 官方明确桌面 Code 与 CLI 共享 hooks 设置；StopFailure 与正常 Stop 分开 | Stop 之后其他 hook 的继续执行、后台任务、审批与会话归属；须在桌面版真实验证 |
| Claude 桌面 Cowork | 官方插件说明支持 hooks | 本地/云端执行环境如何把事件可靠交给这台 Windows、完整终止状态；不能直接套用 Code 标签的路径 |
| Claude 桌面 Chat 标签 | 官方插件说明不在 Chat 运行 hooks | 尚未证实可靠的外部完成事件接口，不能把看见回复停止当作任务成功 |

来源：

- [Codex App Server](https://learn.chatgpt.com/docs/app-server)、[Codex hooks](https://learn.chatgpt.com/docs/hooks)。
- [tele-codex](https://github.com/Kentaczi/tele-codex)：学习事件分类；其事件流 watcher 明确不能自行附着已经运行的桌面或 CLI 会话。
- [claude-agent-notify](https://github.com/CHOCH2R/claude-agent-notify)：学习 Windows 通知与错误区分，不以通知出现作为关机许可。
- [DeepSeek Harness session 类型](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/session.md)、[Agent runtime 类型](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent/src/runtime-types.ts)。
- [Claude 桌面 Code 文档](https://code.claude.com/docs/en/desktop)、[Claude hooks](https://code.claude.com/docs/en/hooks)、[Claude 插件适用范围](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)。

## 夜间联动规则

以下为拟实现行为，须通过真实客户端接入验证后才能启用自动关机。

- 用户选择今晚要等待的会话并主动开启监控。默认等待全部选定任务，而不是任意一条完成即关机。
- 明确区分运行、等待用户、失败、中断、失联、完成候选和已确认完成。初次接入读到的历史完成记录不触发。
- 收到本次执行的正常结束，且关联任务、排队工作与续跑均已结束后，才进入星眠现有关机提醒流程。不能用低 CPU、无输出、退出进程或回复中的“完成”字样代替。
- 新工作、未决输入、错误、状态过期或事件通道断开撤销联动倒计时；恢复连接后先获取完整当前状态，不补发旧的关机。
- 事件重复和乱序不重复执行。提醒阶段提供取消；延后后到点重新核验任务状态。
- 暂停全部、存储故障和退出星眠均阻止联动关机。重新打开默认未开启当晚监控。
- 关机资格的检查与实际执行在主进程，主题配置独立，不改变调度权限。

## 实现顺序与完成条件

1. 固定三个客户端的实际版本、安装类型及可用入口。先用纯观察模式证明开始、完成、等待、失败、续跑与失联各状态准确；不接真实关机。
2. 先打通能够取得完整状态的一个客户端，从会话选择到安全执行器、取消和退出形成可测试闭环，再添加其他适配器。
3. 美化先打通原生主题和 DSH 的受支持格式，再处理 Dream Skin ZIP。Claude 程序修改与不兼容 Codex 版本单列，不能用通用注入兜底宣称支持。
4. 复用星眠现有提醒、暂停与日志；新增集成设置独立保存，不改版本 2 的计划数据。
5. 验证：两个任务先后结束、结束后继续、审批暂停、额度错误、重复/旧事件、断线重连、监控时休眠恢复、提醒时退出；全部使用隔离数据和替代关机执行器。
6. 主题验证：支持格式的导入/应用/恢复，未知格式、破损 ZIP、错误目标、版本不兼容、更新后失效、失败回滚、配置冲突和正在运行的任务不被重启打断。

## 本轮实测范围

已完成官方文档、社区 README 与部分类型源码的核对；已确认本地 Codex CLI 版本为 `0.155.0-alpha.9.2`。Appx/命令搜索未返回可用的客户端版本清单，不能据此判定它们未安装。没有安装外部美化工具，没有改动 Codex/Claude/DSH 配置，没有开启调试端口，没有做真实关机。新增集成功能尚未编写，本文不能用于对外宣称兼容。
