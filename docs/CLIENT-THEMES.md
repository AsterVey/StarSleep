# 给 Codex、Claude 和 DeepSeek 原界面配置主题

星眠是配置助手。导入美化包不会改变星眠的皮肤，也不代表目标客户端已经应用了主题。

## Codex：原生配色与字体

1. 在“Agent 与美化 → 原界面美化”中检测客户端。
2. 导入 `codex-theme-v1:` 主题代码或保存该代码的 TXT 文件。支持原始 JSON 与 URL 编码两种分享形式。
3. 选择“应用到 Codex”，确认目标配置文件。星眠保存原外观字段，然后修改 `config.toml` 的 `[desktop]` 外观配置。
4. 重新打开 Codex，在原界面确认效果。星眠不会主动结束正在运行的 Codex 任务。
5. 使用“恢复 Codex 原外观”还原首次配置前的主题。其他模型、项目和后续非主题设置保留；主题在外部被修改过时停止还原，避免覆盖。

只处理明确识别的外观字段。复杂 TOML 写法、无效配置和不认识的主题选项会拒绝写入，此时可复制主题代码，通过 Codex 自带外观设置导入。

2026-09-22 在本机识别到 Codex **26.915.4065.0**。已只读核实原生主题字段、类型和空字体的持久化规则，并在真实配置的隔离副本上完成应用和还原。**未改变当前 Codex 的真实主题，尚未完成原客户端视觉验收。**

带壁纸和 CSS 的 Dream Skin ZIP 需要其独立引擎。当前星眠支持结构检查、收纳和原包导出，**不声称已自动安装引擎或应用背景皮肤**。请先核对 [Dream Skin Windows 兼容说明](https://github.com/Fei-Away/Codex-Dream-Skin/blob/main/windows/README.md)。

## Claude 桌面：先确认加载器

Claude Theme Mod 的颜色 JSON 依赖加载器。星眠检查独立安装版的程序资源中是否存在该加载器；检测通过后才能“应用到 Claude”。单独写入 `theme.json` 不算美化成功。

1. 打开界面中的“三端配置指南”，核对 [Claude Theme Mod](https://github.com/sillyhappydog/claude-theme-mod) 支持的安装版。
2. 该社区方案会改动程序文件与 Electron 完整性设置；客户端升级可能重置修改。星眠当前不自动执行加载器安装，也不替换用户的 Claude 安装。
3. 对已配置加载器的兼容独立安装版，重新检测、导入颜色 JSON、选择“应用到 Claude”。加载器读取用户目录 `.claude/theme.json`，与 Claude Code 的自定义配置目录不是同一个约定。
4. 切换到 Claude 确认实际颜色。支持恢复原主题文件；检测到外部修改时停止还原。

本机识别到 **Claude 1.52386.6.0 商店版**，未接入该加载器，当前不能直接应用。已验证的是隔离配置文件的写入、备份与恢复，**不是此商店版已经完成美化**。

## 安全体验与适配范围

安全体验模式把三端配置重定向到隔离测试目录，不修改真实客户端。检测界面会明确显示“隔离测试客户端／加载器”。需要配置真实客户端时，正常启动星眠，再由用户主动选择应用。

## v1.4.3：DeepSeek Dream Skin 与通用导入

| 文件 | 适用客户端 | 星眠能做什么 |
| --- | --- | --- |
| Codex 主题 TXT / 原生 JSON | Codex | 配色与字体配置、备份、恢复 |
| Theme Mod 配色 JSON | Claude Desktop | 检测加载器后配置；codeBg 支持半透明 RGB / HSL |
| dsh-dream-skin/pack v1 JSON | DeepSeek + Dream Skin 9.x | 检测数据目录、配置主题、备份与恢复 |
| dsh-ui-appearance 配色 JSON | 使用旧外观插件的 DeepSeek | 收藏、复制、导出到对应插件 |
| Dream Skin ZIP | Codex Dream Skin | 检查结构、收藏、原包导出，由兼容引擎安装 |
| CSS | 作者指定的客户端及加载器 | 收藏、复制、原样导出，不在星眠内执行 |
| PNG / JPEG / WebP | DeepSeek Dream Skin | 预览、导出、配置背景、恢复 |

主题文本最多 1 MB，库内最多 100 项；ZIP 最多 32 MB，支持根目录或一层目录中的 theme.json、theme.css、一张 background 图片及允许的签名 / 说明文件。图片最多 10 MB、8192 边长、3200 万像素；最多 24 张个人图片。未知插件包、脚本和安装程序不是美化导入格式。

DeepSeek 配置步骤：

1. 安装并启用 [Dream Skin](https://github.com/RevolutionLA/dsh-dream-skin)。适配器检测 9.x 和对应持久化实现；本机只读核实为 9.16.0。
2. 选择包含 profiles 的数据目录 **DSH_HOME**，不是程序安装目录。本机官方源码版为 `E:\DeepSeekHarness\OfficialData`。
3. 导入原生主题包，选择“应用到 DeepSeek”；或进入背景页选择“配置到 DeepSeek”。
4. **完全退出 DeepSeek，再确认配置。** 运行中的插件可能覆盖文件修改；星眠不会结束任务。配置后重新打开客户端核对效果。
5. 星眠只修改 dream-skin.json 的相关外观字段；主题配置保留背景，背景配置保留主题与透明度 / 模糊。使用“恢复 DeepSeek 原外观”恢复星眠首次修改的字段，保留其他设置。

还原记录位于星眠数据目录 themes/dsh-restore.json，绑定选定的数据目录。切换目录前先恢复；外观在外部修改或文件损坏时停止覆盖，需保留现有设置与备份后手动处理。移除星眠主题库条目不修改已应用外观。

本轮验证三端隔离文件的配置 / 恢复及界面操作，只读检测实际 DeepSeek 插件，没有改动正在使用的客户端主题，也未执行真实关机。

参考：[Codex 官方设置](https://learn.chatgpt.com/docs/reference/settings)、[Codex Dream Skin](https://github.com/Fei-Away/Codex-Dream-Skin)、[Claude Theme Mod](https://github.com/sillyhappydog/claude-theme-mod)。星眠独立实现配置适配器，不随包分发这些客户端程序或修改后的二进制。
