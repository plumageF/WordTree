# 项目结构说明

## 入口文件

- `index.html`：页面结构和静态资源入口。
- `styles.css`：全局视觉样式、深浅色主题、挑战界面布局。
- `app.js`：核心交互逻辑、记忆状态、选词策略、练习记录、词族渲染。

## 数据目录

- `data/words.js`：基础 Demo 单词。
- `data/wordbooks.js`：基础 Demo 词书入口。
- `data/families.js`：基础词族树。
- `data/imported-vocabulary.js`：完整词书导入结果。
- `data/generated-families.js`：按导入词库生成的词族数据。

数据以 `window.WORDTREE_DATA` 暴露，避免 `file://` 下 `fetch` 受限。

## 脚本目录

- `scripts/import-kylebing-vocabulary.js`：从本地词书源生成 `data/imported-vocabulary.js`。
- `scripts/generate-imported-families.js`：根据导入单词生成词族数据。
- `scripts/validate-data.js`：校验单词、词书引用和词族结构。

## 本地状态

用户学习记录保存在浏览器 `localStorage` 中，主要键包括：

- `wtWordMemory`：单词记忆状态。
- `wtPracticeReports`：练习记录。
- `wtStats`：基础统计。
- `wtTheme`：主题选择。

这些数据不会提交到仓库。

## 归档策略

建议提交运行必需文件：

- `index.html`
- `styles.css`
- `app.js`
- `data/`
- `scripts/`
- `README.md`
- `DATA_GUIDE.md`
- `docs/`
- `package.json`

建议排除：

- `vendor/english-vocabulary.zip`
- `release/`
- `.DS_Store`
- `node_modules/`
