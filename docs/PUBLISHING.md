# 发布维护说明

同时发布 `v1.0.0` 基础版与 `v1.1.0` 优化版，后者标记为最新版本。源码、README、安装包、版权与作者署名均使用 AsterVey。
GitHub 地址配置为新账号 `AsterVey`；公开发布前必须核实账号已注册并由作者登录。

账号改名尚未由本项目执行。若改名，先用 `node scripts/set-github-owner.mjs 新用户名`
统一更新作者和仓库链接，再运行测试、重新打包、刷新截图并生成校验文件。

仓库 About 简介见 `GITHUB-ABOUT.txt`，两版 Release 正文分别见 `RELEASE-v1.0.0.md` 和 `RELEASE-v1.1.0.md`。
仓库应新建为公开的 `StarSleep`，不得覆盖其他现有项目。

## 准备发布

```powershell
npm ci
npm test
npm run build
npm run qa
node scripts/qa-v11.cjs
npm run package
node scripts/qa-upgrade.cjs
```

只提交源码、文档、许可与公开截图。不要上传 `.qa-data`、`.cache`、`artifacts`
或本机的 `schedules.json`。安装包作为 Release 附件上传，不写入 Git 历史。

生成干净提交和版本标签后，分别从 `v1.0.0` 和 `v1.1.0` 标签导出源码 ZIP。
产物放入各自的 `release/v1.0.0`、`release/v1.1.0` 目录，文件名带对应版本号，
并在每个目录生成安装程序与源码 ZIP 的 `SHA256SUMS.txt`。不得用 main 的新版源码替代旧版源码。

## GitHub 发布

登录 GitHub CLI 后，先确认当前登录账号与 package.json 中的仓库所有者一致。
核实新账号归属后新建公开仓库，推送 main 与两个版本标签，分别创建两份 Release 草稿。标题使用：

> 星眠 v1.0.0 · 给夜间 Agent 工作设一个终点

> 星眠 v1.1.0 · 夜间工作，随时掌控

正文从对应版本的 Release 文档读取，附上各自的安装程序、源码 ZIP 与校验文件。
核对下载附件和截图后发布两份草稿，将 v1.1.0 标记为最新。若某版本已存在，不覆盖其附件或标签；
有新变更应增加版本号。

公开发布前须确认 GitHub 页面中的实际地址；准备文档中的地址并不代表仓库已创建。
