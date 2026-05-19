# WordTree 数据维护说明

当前 demo 为了支持直接用 `file://` 打开，数据使用 `data/*.js` 暴露到 `window.WORDTREE_DATA`，而不是通过 `fetch` 加载 JSON。

## 文件

- `data/words.js`：普通背词数据。
- `data/families.js`：词族树数据。
- `data/wordbooks.js`：词书和词书内单词范围。
- `data/imported-vocabulary.js`：完整词书导入后的单词和词书。
- `data/generated-families.js`：根据完整词书生成的词族树。
- `scripts/validate-data.js`：数据校验脚本。

## 普通单词字段

```js
{
  word: "predict",
  pos: "v.",
  phonetic: "/prɪˈdɪkt/",
  meanings: ["预测", "预言"],
  groups: [
    { label: "预测", aliases: ["预测", "预判"] },
    { label: "预言", aliases: ["预言"] }
  ],
  familyId: "dict",
  tags: ["core", "root"]
}
```

`groups` 用于管理一个单词的核心中文义项。每个核心义项都应有一个 `label`，并配置可接受的 `aliases`，方便后续做义项覆盖、错题分析或词卡展示。

## 词族节点字段

```js
{
  word: "prediction",
  pos: "n.",
  meaning: "预测；预言",
  parent: "predict",
  rel: "predict + ion",
  level: "core"
}
```

一个词族必须有且只有一个 `parent: null` 的根节点。考试模式目前会让用户填写根节点以外的所有节点。

## 校验

每次改完数据后运行：

```bash
node scripts/validate-data.js
```

校验会检查重复单词、词书引用、`familyId` 引用、词族 parent 断裂和循环引用。

## 完整词书导入

完整词书当前写入 `data/imported-vocabulary.js`，页面启动时会与基础 Demo 数据合并。

词书字段中有两类数量：

- `sourceCount`：源文件原始条目数，用于界面展示词书原始规模。
- `words.length` / `uniqueCount`：去重后的训练单词数，实际练习只使用这部分，避免重复词在同一本词书里叠加出现。

重新导入时运行：

```bash
node scripts/import-kylebing-vocabulary.js
node scripts/generate-imported-families.js
node scripts/validate-data.js
```

建议导入字段：

```js
{
  word: "example",
  pos: "n.",
  phonetic: "/ɪɡˈzæmpəl/",
  meanings: ["例子", "范例"],
  groups: [
    { label: "例子", aliases: ["例子", "例"] },
    { label: "范例", aliases: ["范例", "样例"] }
  ],
  familyId: null,
  tags: ["cet4"]
}
```

不要直接复制来源不明或版权不明确的整本商业词表。完整词书导入后必须运行校验脚本。
