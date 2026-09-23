# v1.8.0 开源复用与主题来源

星眠第一作者 AsterVey，软件继续使用现有禁止售卖许可。第三方代码与主题不改署名，适用各自许可。

| 项目 | 固定版本 / 提交 | 实际复用 |
| --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | 0.180.0 · MIT | 单个 WebGL 渲染器、透视相机、星门、轨道、星尘和光轨；无新增窗口 |
| [React Bits Hyperspeed](https://github.com/DavidHDev/react-bits/tree/9481af758aae6cfb34c3652ec40a1c099360331f/src/ts-default/Backgrounds/Hyperspeed) | 9481af758aae6cfb34c3652ec40a1c099360331f | 改造 CarLights 的循环纵深光轨公式及加速长度，用于星际场景；未引入整个道路组件或 postprocessing |
| [Claude Warm for Codex](https://github.com/YuChenSSR/claude-warm-codex-app-theme) | b64856ea8739d736146ab2d64932dc231ce4e42e · MIT | 两个原生主题下载；许可证与 NOTICE 收入离线目录 |
| [Claude Theme Mod](https://github.com/sillyhappydog/claude-theme-mod) | a0484699fb1e91dd25b994f894d7570734bc3dd7 · MIT | Arizona / Moonside 原始 JSON；新增 mode、glassEffect、glowEffect 的受限字段识别；不执行补丁安装器 |
| [DeepSeek Dream Skin](https://github.com/RevolutionLA/dsh-dream-skin) | dafb41a36f2efd015e8234579d16eec2f15f6b1e · MIT | 作者 Aurora Test 原生数据包下载与既有配置适配器 |
| [Codex Dream Skin](https://github.com/Fei-Away/Codex-Dream-Skin) | 34335d27d54300eccb325cc652f6c93fef428b84 · MIT | 作者引擎与主题入口；不自动安装或运行其脚本 |
| [DeepSeek 社区市场](https://github.com/keman-ai/dsh-skin-market) | 社区入口，2026-09-22 核验 | 仅外部链接，不托管主题，不自动安装可执行市场插件 |

React Bits 使用 **MIT + Commons Clause**，不是无附加条件的 MIT。它允许作为应用的一部分分发，同时限制售卖、再许可和单独/打包/移植分发组件本身。本项目仅将改造后的逻辑嵌入星眠，不提供独立组件产品。完整原文位于 `resources/licenses/React-Bits-LICENSE.txt`，也合并到随程序分发的 `THIRD_PARTY_NOTICES.txt`。

主题目录记录来源、作者、完整提交、文件 SHA-256、许可和核验日期。社区主题按需下载；预览为受限配色生成的示意，不加载远程 CSS/HTML/脚本。主进程使用内置资源标识解析地址，页面不提供任意下载 URL。

延续使用 ccusage 20.0.24、Vercel Skills 名称处理、fflate、React、Electron、Vite 等既有组件，详见 [v1.7.0 清单](OPEN-SOURCE-v1.7.0.md) 与完整第三方声明。
