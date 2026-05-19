const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const downloadsRoot = "/Users/mac/Downloads/english-vocabulary-master";
const extractedJsonDir = path.join(root, "vendor", "english-vocabulary-master", "json");
const downloadsJsonDir = path.join(downloadsRoot, "json");
const downloadedJsonDir = path.join(root, "vendor", "english-vocabulary-json");
const downloadsSimpleDir = path.join(downloadsRoot, "json_original", "json-simple");
const sourceDirs = [downloadsJsonDir, extractedJsonDir, downloadedJsonDir];

const bookSources = [
  { id: "junior-full", name: "初中词汇", files: ["1-初中-顺序.json", "junior.json"] },
  { id: "senior-full", name: "高中词汇", files: ["2-高中-顺序.json", "senior.json"] },
  { id: "cet4-full", name: "大学英语四级", files: ["3-CET4-顺序.json", "cet4.json"] },
  { id: "cet6-full", name: "大学英语六级", files: ["4-CET6-顺序.json", "cet6.json"] },
  { id: "postgrad-full", name: "考研英语", files: ["5-考研-顺序.json", "postgrad.json"] },
  { id: "toefl-full", name: "托福", files: ["6-托福-顺序.json", "toefl.json"] },
  { id: "sat-full", name: "SAT", files: ["7-SAT-顺序.json", "sat.json"] },
  { id: "ielts-full", name: "雅思 IELTS", simplePrefix: "IELTS_" },
  { id: "gre-full", name: "GRE", simplePrefix: "GRE_" },
  { id: "gmat-full", name: "GMAT", simplePrefix: "GMAT_" },
  { id: "bec-full", name: "BEC 商务英语", simplePrefix: "BEC_" },
  { id: "tem4-full", name: "英语专业四级", simplePrefix: "Level4_" },
  { id: "tem8-full", name: "英语专业八级", simplePrefix: "Level8_" },
  { id: "pep-primary", name: "人教版小学英语", simplePrefix: "PEPXiaoXue" },
  { id: "pep-junior", name: "人教版初中英语", simplePrefix: "PEPChuZhong" },
  { id: "fltrp-junior", name: "外研社初中英语", simplePrefix: "WaiYanSheChuZhong" },
  { id: "pep-senior", name: "人教版高中英语", simplePrefix: "PEPGaoZhong" },
  { id: "beishi-senior", name: "北师大高中英语", simplePrefix: "BeiShiGaoZhong" },
];

function readExistingData() {
  const sandbox = { window: { WORDTREE_DATA: {} } };
  for (const file of ["data/words.js", "data/families.js"]) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInNewContext(code, sandbox, { filename: file });
  }
  return sandbox.window.WORDTREE_DATA;
}

function cleanEn(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const text = String(value || "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function normalizeMeaningKey(value) {
  return String(value || "")
    .replace(/[·•\s]/g, "")
    .replace(/[的地得者子儿]/g, "")
    .replace(/[，。；;、,.!！?？:：()[\]（）"'“”‘’]/g, "")
    .toLowerCase();
}

function cleanMeaning(value) {
  return String(value || "")
    .replace(/�/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/【[^】]+】/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/（[^）]*）/g, "")
    .replace(/^[a-z.&/ ]+\./i, "")
    .replace(/^[［\[]?[^］\]]+[］\]]/, "")
    .replace(/\s+/g, "")
    .trim();
}

function isLowValueMeaning(value) {
  return /人名|地名|姓氏|商标|品牌|缩写|略语|复数|过去式|过去分词|现在分词|比较级|最高级|=/.test(value);
}

function compactMeanings(values, limit = 5) {
  const out = [];
  for (const raw of values || []) {
    const text = cleanMeaning(raw);
    if (!text || !/[\u3400-\u9fff]/.test(text) || text.length > 12 || isLowValueMeaning(text)) continue;
    const key = normalizeMeaningKey(text);
    if (!key) continue;
    const duplicateIndex = out.findIndex((item) => {
      const current = normalizeMeaningKey(item);
      return current === key || (current.length >= 2 && key.includes(current)) || (key.length >= 2 && current.includes(key));
    });
    if (duplicateIndex >= 0) {
      if (text.length < out[duplicateIndex].length) out[duplicateIndex] = text;
      continue;
    }
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function compactGroups(groups, limit = 5) {
  const out = [];
  for (const group of groups || []) {
    const text = cleanMeaning(group.label);
    if (!text || !/[\u3400-\u9fff]/.test(text) || text.length > 12 || isLowValueMeaning(text)) continue;
    const key = normalizeMeaningKey(text);
    if (!key) continue;
    const duplicateIndex = out.findIndex((item) => {
      const current = normalizeMeaningKey(item.label);
      return current === key || (current.length >= 2 && key.includes(current)) || (key.length >= 2 && current.includes(key));
    });
    if (duplicateIndex >= 0) {
      const existing = out[duplicateIndex];
      if (text.length < existing.label.length) existing.label = text;
      existing.aliases = [existing.label];
      existing.pos = formatPos([existing.pos, group.pos]);
      continue;
    }
    out.push({ label: text, aliases: [text], pos: group.pos || "词" });
    if (out.length >= limit) break;
  }
  return out;
}

function splitChinese(text) {
  return compactMeanings(unique(
    String(text || "")
      .replace(/�/g, "")
      .split(/[；;，,、]/)
      .map(cleanMeaning),
  ));
}

function normalizePosToken(type) {
  return String(type || "")
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[()（）]/g, "")
    .replace(/\s+/g, "")
    .replace(/形容词/g, "adj")
    .replace(/副词/g, "adv")
    .replace(/名词/g, "n")
    .replace(/动词/g, "v")
    .split(/[&/|,;，；+]+/)
    .map((token) => token.replace(/\.$/, ""))
    .flatMap((token) => {
      if (token === "a") return ["adj"];
      if (token === "n&a") return ["n", "adj"];
      if (token === "nadv") return ["n", "adv"];
      if (token === "vi" || token === "vt") return ["v"];
      if (token.startsWith("n")) return ["n"];
      if (token.startsWith("adj")) return ["adj"];
      if (token.startsWith("adv")) return ["adv"];
      if (token.startsWith("pron")) return ["pron"];
      if (token.startsWith("prep")) return ["prep"];
      if (token.startsWith("conj")) return ["conj"];
      if (token.startsWith("int")) return ["int"];
      if (token.startsWith("num")) return ["num"];
      if (token.startsWith("art")) return ["art"];
      if (token.startsWith("aux")) return ["aux"];
      if (token.startsWith("v")) return ["v"];
      return token ? [token] : [];
    });
}

function formatPos(types) {
  const normalized = unique((types || []).flatMap(normalizePosToken))
    .map((type) => (type.endsWith(".") ? type : `${type}.`));
  return normalized.length ? normalized.join("/") : "词";
}

function correctPosForWord(word, pos) {
  const key = cleanEn(word);
  if (/^(any|some|every|no)(body|one)$/.test(key) && pos.includes("prep.")) {
    return formatPos(pos.split("/").map((item) => item === "prep." ? "pron." : item));
  }
  return pos;
}

function sourcePathsFor(book) {
  if (book.simplePrefix) {
    if (!fs.existsSync(downloadsSimpleDir)) return [];
    return fs.readdirSync(downloadsSimpleDir)
      .filter((file) => file.startsWith(book.simplePrefix) && file.endsWith(".json") && !file.includes("luan"))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
      .map((file) => path.join(downloadsSimpleDir, file));
  }

  const paths = [];
  for (const dir of sourceDirs) {
    for (const file of book.files || []) {
      const candidate = path.join(dir, file);
      if (fs.existsSync(candidate)) {
        paths.push(candidate);
        return paths;
      }
    }
  }
  return paths;
}

function wordFromItem(item, familyByWord, bookId) {
  const word = String(item.word || "").trim();
  if (!word || !/^[a-z][a-z -]*$/i.test(word)) return null;
  const translations = Array.isArray(item.translations) ? item.translations : [];
  const types = translations.map((entry) => entry.type).filter(Boolean);
  const groups = compactGroups(translations.flatMap((entry) => {
    const pos = correctPosForWord(word, formatPos([entry.type]));
    return splitChinese(entry.translation).map((label) => ({ label, aliases: [label], pos }));
  }), 5);
  const meanings = groups.map((group) => group.label);
  if (!meanings.length) return null;
  return {
    word,
    pos: formatPos(groups.map((group) => group.pos)),
    phonetic: item.usphone ? `/${item.usphone}/` : item.ukphone ? `/${item.ukphone}/` : "",
    meanings,
    groups,
    familyId: familyByWord.get(cleanEn(word)) || null,
    tags: [bookId, "imported"],
  };
}

function mergeWord(target, incoming) {
  target.pos = target.pos || incoming.pos;
  target.phonetic = target.phonetic || incoming.phonetic;
  target.familyId = target.familyId || incoming.familyId;
  target.groups = compactGroups([...(target.groups || []), ...(incoming.groups || [])], 5);
  target.meanings = target.groups.map((group) => group.label);
  target.pos = formatPos([target.pos, incoming.pos, ...target.groups.map((group) => group.pos)]);
  target.tags = unique([...(target.tags || []), ...(incoming.tags || [])]);
}

function main() {
  const data = readExistingData();
  const existingByKey = new Map((data.words || []).map((word) => [cleanEn(word.word), word.word]));
  const familyByWord = new Map();
  for (const family of data.families || []) {
    for (const node of family.nodes || []) familyByWord.set(cleanEn(node.word), family.id);
  }

  const imported = new Map();
  const books = [];
  const missing = [];

  for (const book of bookSources) {
    const sourcePaths = sourcePathsFor(book);
    if (!sourcePaths.length) {
      missing.push(book.files?.[0] || book.simplePrefix);
      continue;
    }
    const words = [];
    let sourceCount = 0;
    for (const sourcePath of sourcePaths) {
      const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
      sourceCount += raw.length;
      for (const item of raw) {
        const entry = wordFromItem(item, familyByWord, book.id);
        if (!entry) continue;
        const key = cleanEn(entry.word);
        if (existingByKey.has(key)) {
          words.push(existingByKey.get(key));
          continue;
        }
        if (!imported.has(key)) imported.set(key, entry);
        else mergeWord(imported.get(key), entry);
        words.push(imported.get(key).word);
      }
    }
    const uniqueWords = unique(words);
    books.push({
      id: book.id,
      name: book.name,
      description: `从 KyleBing/english-vocabulary 导入，源文件 ${sourceCount} 条，去重后 ${uniqueWords.length} 个训练词。`,
      sourceCount,
      uniqueCount: uniqueWords.length,
      words: uniqueWords,
    });
  }

  if (missing.length) {
    console.error(`缺少词书源文件：${missing.join("、")}`);
    process.exit(1);
  }

  const words = [...imported.values()].sort((a, b) => a.word.localeCompare(b.word));
  const output = `window.WORDTREE_DATA = window.WORDTREE_DATA || {};

window.WORDTREE_DATA.importedMeta = ${JSON.stringify({
    source: "KyleBing/english-vocabulary",
    generatedAt: new Date().toISOString(),
    importedWords: words.length,
    books: books.map((book) => ({ id: book.id, sourceCount: book.sourceCount, uniqueCount: book.words.length })),
  }, null, 2)};

window.WORDTREE_DATA.importedWordbooks = ${JSON.stringify(books)};

window.WORDTREE_DATA.importedWords = ${JSON.stringify(words)};
`;

  fs.writeFileSync(path.join(root, "data", "imported-vocabulary.js"), output);
  console.log(`已生成 data/imported-vocabulary.js：${words.length} 个新增词，${books.length} 本词书。`);
}

main();
