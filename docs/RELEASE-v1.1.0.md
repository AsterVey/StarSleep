# 星眠 v1.1.0 · 夜间工作，随时掌控

这一版，把夜间使用最常见的三个操作放到了手边。

## 新增

- **快捷计时**：30 分钟、1／2／4 小时，或自定义 1–1440 分钟。选关机或闹钟，确认后开始；重新打开软件不会重置截止时间。
- **全部暂停**：主界面、托盘和实际提醒中均可暂停。重启后仍保持暂停，恢复时跳过错过的任务。
- **导入与导出**：选择 JSON 文件，先看预览再导入；去重、跳过过期项，导入后全部停用，核对后开启。

## 界面优化

整理工具栏，突出快捷计时和暂停状态；长计划名可以换行；提醒面板显示准确时间并分行列出同时到期的任务。继续保留冷蓝环形倒计时、波纹与电子音反馈。

![v1.1.0 控制台](https://raw.githubusercontent.com/AsterVey/StarSleep/v1.1.0/docs/images/console.png)

## 下载与升级

- `StarSleep-Setup-1.1.0.exe`：Windows 10/11 x64 安装程序。
- `StarSleep-Source-1.1.0.zip`：对应源码、说明与截图。
- `SHA256SUMS.txt`：安装包与源码的校验值。

建议使用 v1.1.0；[v1.0.0 基础版](https://github.com/AsterVey/StarSleep/releases/tag/v1.0.0)继续保留下载。
升级会保留原计划并备份旧格式数据。需要降级时，请先阅读仓库的 `docs/UPGRADE.md`。

**到点会强制关机，未保存内容可能丢失。** 星眠按时间执行，不判断 Agent 是否完成，也不控制云端计费。软件退出即停止，不创建 Windows 系统定时任务。

测试使用安全关机替代器，未实际关闭开发电脑。当前安装包未使用代码签名证书。

第一作者：[AsterVey](https://github.com/AsterVey)。允许个人和工作场景使用，禁止售卖软件及其改版，完整条款见 LICENSE。

[项目主页](https://github.com/AsterVey/StarSleep) · [反馈问题](https://github.com/AsterVey/StarSleep/issues)
