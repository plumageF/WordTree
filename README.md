# WordTree

WordTree 是一个本地优先的英语单词学习 Demo，支持认词卡片、限时拼写、词族树谱和本地练习记录。

## 功能

- 认词卡片：支持英语到汉语、汉语到英语，并记录背过/没背过。
- 限时输入：看中文释义拼写英文，按单词长度动态限时，支持暂停和提前结束。
- 词族树谱：支持按词族查阅和考试补全。
- 练习记录：本地保存练习结果，可按词书和记忆状态查询单词。
- 词书数据：已导入多类词书，训练时使用去重后的单词列表，显示时保留源词书条目数。

## 本地运行

直接打开 `index.html` 可以运行；更推荐启动本地静态服务：

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:8766/
```

## 本地应用安装包

项目已支持 Electron 桌面应用打包。普通用户可以从 GitHub Release 下载 `.pkg`、`.dmg` 或 `.exe` 安装包，本地安装后直接运行，不需要自己启动服务器。

开发者打包前先安装依赖：

```bash
npm install
```

macOS 生成安装向导：

```bash
chmod +x scripts/create-mac-icon.sh
npm run desktop:icon
npm run desktop:dist:mac
```

更多发布步骤见 `docs/DESKTOP_RELEASE.md`。

## 校验数据

```bash
node scripts/validate-data.js
```

## 目录

```text
.
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── words.js
│   ├── wordbooks.js
│   ├── families.js
│   ├── imported-vocabulary.js
│   └── generated-families.js
├── scripts/
│   ├── import-kylebing-vocabulary.js
│   ├── generate-imported-families.js
│   └── validate-data.js
└── docs/
    └── PROJECT_STRUCTURE.md
```

## 部署建议

这是纯静态项目，不需要后端服务器。可以部署到 GitHub Pages、Netlify、Vercel 静态站点，也可以作为本地 HTML 应用使用。

## 数据来源说明

当前完整词书数据来自本地导入的 KyleBing/english-vocabulary 数据。仓库内保留生成后的运行数据文件，不依赖运行时网络请求。
