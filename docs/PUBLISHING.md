# 发布维护说明

首次版本为 `v1.0.0`。源码、README、安装包、版权与作者署名均使用 AsterVey。
GitHub 地址配置为新账号 `AsterVey`；公开发布前必须核实账号已注册并由作者登录。

账号改名尚未由本项目执行。若改名，先用 `node scripts/set-github-owner.mjs 新用户名`
统一更新作者和仓库链接，再运行测试、重新打包、刷新截图并生成校验文件。

仓库 About 简介见 `GITHUB-ABOUT.txt`，Release 正文见 `RELEASE-v1.0.0.md`。
仓库应新建为公开的 `StarSleep`，不得覆盖其他现有项目。

## 准备发布

```powershell
npm ci
npm test
npm run build
npm run qa
npm run package
```

只提交源码、文档、许可与公开截图。不要上传 `.qa-data`、`.cache`、`artifacts`
或本机的 `schedules.json`。安装包作为 Release 附件上传，不写入 Git 历史。

生成干净提交后，使用 `git archive --format=zip --prefix=StarSleep/ --output=release/StarSleep-Source-1.0.0.zip HEAD`
导出源码，再为安装程序和源码 ZIP 计算 SHA-256，保存至 `release/SHA256SUMS.txt`。

## GitHub 发布

登录 GitHub CLI 后，先确认当前登录账号与 package.json 中的仓库所有者一致。
新建公开仓库、推送 main，创建 `v1.0.0` Release 草稿，标题使用：

> 星眠 v1.0.0 · 给夜间 Agent 工作设一个终点

正文从 `docs/RELEASE-v1.0.0.md` 读取，附上安装程序、源码 ZIP 与校验文件。
核对下载附件和 README 图片后发布草稿。若 `v1.0.0` 已存在，不覆盖其附件或标签；
有新变更应增加版本号。

公开发布前须确认 GitHub 页面中的实际地址；准备文档中的地址并不代表仓库已创建。
