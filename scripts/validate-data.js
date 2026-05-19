const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const sandbox = { window: {} };
sandbox.window.WORDTREE_DATA = {};

for (const file of ["data/wordbooks.js", "data/words.js", "data/families.js", "data/imported-vocabulary.js", "data/generated-families.js"]) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  const code = fs.readFileSync(fullPath, "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
}

const data = sandbox.window.WORDTREE_DATA;
const errors = [];

function fail(message) {
  errors.push(message);
}

function norm(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function uniqueStrings(values) {
  const seen = new Set();
  return (values || []).filter((value) => {
    const text = String(value || "").trim();
    const key = norm(text);
    if (!text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeWords(base, imported) {
  const map = new Map();
  for (const word of [...(base || []), ...(imported || [])]) {
    const key = norm(word.word);
    if (!key || map.has(key)) continue;
    map.set(key, word);
  }
  return [...map.values()];
}

function mergeWordbooks(base, imported) {
  const map = new Map();
  for (const book of [...(base || []), ...(imported || [])]) {
    if (!book?.id) continue;
    const current = map.get(book.id);
    if (!current || (!current.words?.length && book.words?.length)) {
      map.set(book.id, { ...book, words: uniqueStrings(book.words) });
    }
  }
  return [...map.values()];
}

const words = mergeWords(data.words, data.importedWords);
const wordbooks = mergeWordbooks(data.wordbooks, data.importedWordbooks);
const families = [...(data.families || []), ...(data.importedFamilies || [])];

const wordMap = new Map();
for (const word of words || []) {
  const key = norm(word.word);
  if (!key) fail("单词缺少 word 字段");
  if (wordMap.has(key)) fail(`单词重复：${word.word}`);
  wordMap.set(key, word);
  if (!word.pos) fail(`${word.word} 缺少词性`);
  if (!Array.isArray(word.meanings) || word.meanings.length === 0) fail(`${word.word} 缺少 meanings`);
  if (!Array.isArray(word.groups) || word.groups.length === 0) fail(`${word.word} 缺少 groups`);
  for (const group of word.groups || []) {
    if (!group.label) fail(`${word.word} 有义项缺少 label`);
    if (!Array.isArray(group.aliases) || group.aliases.length === 0) fail(`${word.word}/${group.label} 缺少 aliases`);
  }
}

const familyMap = new Map();
for (const family of families || []) {
  if (!family.id) fail("存在缺少 id 的词族");
  if (familyMap.has(family.id)) fail(`词族 id 重复：${family.id}`);
  familyMap.set(family.id, family);

  const nodeMap = new Map();
  for (const node of family.nodes || []) {
    const key = norm(node.word);
    if (!key) fail(`${family.id} 存在缺少 word 的节点`);
    if (nodeMap.has(key)) fail(`${family.id} 节点重复：${node.word}`);
    nodeMap.set(key, node);
    if (!node.pos) fail(`${family.id}/${node.word} 缺少词性`);
    if (!node.meaning) fail(`${family.id}/${node.word} 缺少中文意思`);
    if (!node.rel) fail(`${family.id}/${node.word} 缺少构词关系`);
  }

  const roots = (family.nodes || []).filter((node) => node.parent === null);
  if (roots.length !== 1) fail(`${family.id} 应该有且只有一个根节点，目前是 ${roots.length} 个`);

  for (const node of family.nodes || []) {
    if (node.parent !== null && !nodeMap.has(norm(node.parent))) {
      fail(`${family.id}/${node.word} 的 parent 不存在：${node.parent}`);
    }
  }

  for (const node of family.nodes || []) {
    const seen = new Set();
    let current = node;
    while (current && current.parent !== null) {
      const key = norm(current.word);
      if (seen.has(key)) {
        fail(`${family.id}/${node.word} 存在循环 parent`);
        break;
      }
      seen.add(key);
      current = nodeMap.get(norm(current.parent));
    }
  }
}

for (const word of words || []) {
  if (word.familyId && !familyMap.has(word.familyId)) {
    fail(`${word.word} 引用了不存在的 familyId：${word.familyId}`);
  }
}

for (const book of wordbooks || []) {
  if (!book.id || !book.name) fail("存在缺少 id/name 的词书");
  for (const word of book.words || []) {
    if (!wordMap.has(norm(word))) fail(`词书 ${book.id} 引用了不存在的单词：${word}`);
  }
}

if (errors.length) {
  console.error(`数据校验失败，共 ${errors.length} 个问题：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`数据校验通过：${words.length} 个单词，${families.length} 个词族，${wordbooks.length} 本词书。`);
