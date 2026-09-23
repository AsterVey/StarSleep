# v1.7.0 本地验证结果

验证日期：2026-09-22。Windows x64，生产构建和最终 `release/v1.7.0/win-unpacked/星眠.exe`。未发布 GitHub。

## 已通过

- TypeScript、Vite 和 Electron 生产构建；electron-builder 生成 NSIS EXE。
- 全部 **131 项自动测试**通过，包含 15 项新增 Skills 生命周期测试。
- 新增 **5 组桌面检查**：搜索/固定版本审查，隔离安装/同名保护/ZIP 内容，尺寸与键盘可达，重启/移除/恢复，以及限流反馈/关机演示仍可打断工具箱。
- 既有 **14 组桌面回归**：工具箱 6 组、计划与临时暂停 5 组、客户端主题 3 组。
- **真实 GitHub 联网测试**：搜索 `vercel-labs/skills`，发现 `skills/find-skills`，下载提交 `7407f3893ad4dceab546ac002c3ef806e4000c73` 的 SKILL.md 与 MIT 许可证，核对文件 Git blob 标识，安装到隔离 Codex 目录，再移除与恢复，文件保留一致。
- 窗口 1280×820、900×650；100% / 125% / 150% / 200% 页面缩放（宿主 Windows DPI 150%）。重点检查无横向溢出、安装按钮键盘可聚焦、滚动可达。复核搜索、审查、安装与记录截图。

新增核心测试覆盖路径越界、Windows 特殊名称、大小写冲突、伪造下载、符号链接、超限包、无效元数据、二进制阻止、静态线索、缓存、审查过期、三种目录安装、同名拒绝、用户修改保留、备份恢复、自定义目标持久化、损坏记录保护。

## 证据

- `artifacts/v17/unit-tests.txt`：131/131。
- `artifacts/v17/desktop-results.json`：最终 EXE，5 组；网络使用确定性的 GitHub 响应。
- `artifacts/v17/live-github-results.json`：最终 EXE 的真实 GitHub 流程；目标属于隔离数据目录。
- `artifacts/v17/toolbox-regression/results.json`：6 组。
- `artifacts/v17/daily-regression/results.json`：5 组。
- `artifacts/v17/theme-regression/theme-hub-results.json`：3 组。
- `artifacts/v17/*.png`：实际桌面截图；除特别注明的实时截图，仓库与技能内容为 QA 夹具，不是假装的线上榜单。

交付目录 `verification/` 收录以上结果；`screenshots/` 收录新版截图。原有 v1.6.0 及更早发布产物保持不变。

## 未执行及边界

- 没有实际关机；均为安全替代器和隔离计划。
- 本轮没有安装/卸载 NSIS 到用户环境，也没有覆盖现有安装。
- 没有向用户真实的 Codex、Claude 或 DeepSeek 目录安装测试技能；未验证三个客户端实际调用技能、Claude 云端上传、技能外部 API/命令依赖。
- 审查是有限静态规则，不是完整代码审计或安全认证；Cisco 扫描引擎未内置。
- 原生更改目标目录在核心层验证了持久化与既有记录保护；安全体验模式刻意不开放真实目录修改。没有在本机真实 DSH_HOME 上更换目录。
- GitHub 私有仓库、需登录下载、大于当前限制的仓库/技能、带二进制的技能不属于本次支持范围。
