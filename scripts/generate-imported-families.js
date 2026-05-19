const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function loadData() {
  const sandbox = { window: { WORDTREE_DATA: {} } };
  for (const file of ["data/words.js", "data/families.js", "data/imported-vocabulary.js"]) {
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
    const key = cleanEn(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function isFamilyWord(word) {
  return /^[a-z][a-z-]{2,}$/i.test(word) && !word.includes("--");
}

function meaningFor(entry) {
  return unique(entry.meanings).slice(0, 4).join("；") || "已导入词库";
}

function allWords(data) {
  const map = new Map();
  for (const entry of [...(data.words || []), ...(data.importedWords || [])]) {
    const key = cleanEn(entry.word);
    if (!key || map.has(key)) continue;
    map.set(key, entry);
  }
  return [...map.values()];
}

const suffixRules = [
  ["ization", ["ize", "ise", "e", ""]],
  ["isation", ["ise", "ize", "e", ""]],
  ["ational", ["e", "", "ation"]],
  ["fulness", ["ful", ""]],
  ["ousness", ["ous", ""]],
  ["iveness", ["ive", "e", ""]],
  ["ability", ["able", "e", ""]],
  ["ibility", ["ible", "e", ""]],
  ["ically", ["ic", "ical", ""]],
  ["ation", ["", "e", "ate"]],
  ["ition", ["", "e"]],
  ["tion", ["", "e"]],
  ["sion", ["", "e", "d"]],
  ["ment", ["", "e"]],
  ["ness", ["", "y"]],
  ["less", [""]],
  ["ful", [""]],
  ["able", ["", "e"]],
  ["ible", ["", "e"]],
  ["ally", ["al", ""]],
  ["ical", ["ic", ""]],
  ["ious", ["y", ""]],
  ["ous", ["", "e"]],
  ["ive", ["", "e"]],
  ["ity", ["", "e", "y"]],
  ["ty", ["", "e"]],
  ["ence", ["ent", "e", ""]],
  ["ance", ["ant", "e", ""]],
  ["ent", ["", "e"]],
  ["ant", ["", "e"]],
  ["ism", ["ist", ""]],
  ["ist", [""]],
  ["ship", [""]],
  ["hood", [""]],
  ["dom", [""]],
  ["age", ["", "e"]],
  ["al", ["", "e"]],
  ["ic", [""]],
  ["ize", ["", "e"]],
  ["ise", ["", "e"]],
  ["er", ["", "e"]],
  ["or", ["", "e"]],
  ["ed", ["", "e"]],
  ["ing", ["", "e"]],
  ["ly", [""]],
  ["ies", ["y"]],
  ["ied", ["y"]],
  ["es", ["", "e"]],
  ["s", [""]],
];

const prefixes = [
  "counter",
  "under",
  "inter",
  "trans",
  "super",
  "over",
  "anti",
  "post",
  "pre",
  "sub",
  "mis",
  "non",
  "dis",
  "un",
  "re",
  "de",
  "in",
  "im",
  "il",
  "ir",
];

function parentCandidates(word) {
  const out = [];
  for (const [suffix, replacements] of suffixRules) {
    if (word.length <= suffix.length + 2 || !word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    for (const replacement of replacements) out.push(stem + replacement);
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) out.push(stem.slice(0, -1));
  }

  if (word.endsWith("ying")) out.push(`${word.slice(0, -4)}ie`);
  for (const prefix of prefixes) {
    if (word.length <= prefix.length + 3 || !word.startsWith(prefix)) continue;
    out.push(word.slice(prefix.length));
  }
  return unique(out).filter((item) => item.length >= 3 && item !== word);
}

function relation(parent, child) {
  if (child.startsWith(parent)) return `${parent} + ${child.slice(parent.length)}`;
  if (child.endsWith(parent)) return `${child.slice(0, child.length - parent.length)} + ${parent}`;
  return `由 ${parent} 派生`;
}

function generatedFamilyId(rootWord, index) {
  const base = cleanEn(rootWord).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `auto-${base || "family"}-${index}`;
}

function buildFamilies(data) {
  const existingFamilyWords = new Set();
  const existingFamilyIds = new Set((data.families || []).map((family) => family.id));
  for (const family of data.families || []) {
    for (const node of family.nodes || []) existingFamilyWords.add(cleanEn(node.word));
  }

  const entries = allWords(data).filter((entry) => isFamilyWord(entry.word));
  const entryByKey = new Map(entries.map((entry) => [cleanEn(entry.word), entry]));
  const parentByChild = new Map();

  for (const entry of entries) {
    const word = cleanEn(entry.word);
    if (existingFamilyWords.has(word)) continue;
    const parent = parentCandidates(word)
      .filter((candidate) => entryByKey.has(candidate) && candidate.length < word.length)
      .filter((candidate) => !existingFamilyWords.has(candidate))
      .sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
    if (parent) parentByChild.set(word, parent);
  }

  const neighbors = new Map();
  for (const [child, parent] of parentByChild) {
    if (!neighbors.has(child)) neighbors.set(child, new Set());
    if (!neighbors.has(parent)) neighbors.set(parent, new Set());
    neighbors.get(child).add(parent);
    neighbors.get(parent).add(child);
  }

  const visited = new Set();
  const components = [];
  for (const word of neighbors.keys()) {
    if (visited.has(word)) continue;
    const stack = [word];
    const component = [];
    visited.add(word);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      for (const next of neighbors.get(current) || []) {
        if (visited.has(next)) continue;
        visited.add(next);
        stack.push(next);
      }
    }
    if (component.length >= 2) components.push(component);
  }

  const families = [];
  components
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach((component) => {
      const set = new Set(component);
      const roots = component.filter((word) => !parentByChild.has(word) || !set.has(parentByChild.get(word)));
      const root = roots.sort((a, b) => a.length - b.length || a.localeCompare(b))[0] || component[0];
      const index = families.length + 1;
      let id = generatedFamilyId(root, index);
      while (existingFamilyIds.has(id)) id = generatedFamilyId(root, index + families.length + 1);
      existingFamilyIds.add(id);

      const ordered = [...component].sort((a, b) => a.length - b.length || a.localeCompare(b));
      const nodes = ordered.map((word) => {
        const entry = entryByKey.get(word);
        const parent = word === root ? null : parentByChild.get(word) || root;
        return {
          word: entry.word,
          pos: entry.pos || "词",
          meaning: meaningFor(entry),
          parent: parent ? entryByKey.get(parent).word : null,
          rel: parent ? relation(entryByKey.get(parent).word, entry.word) : "基础词",
          level: "generated",
        };
      });

      families.push({
        id,
        title: `${entryByKey.get(root).word} 词族`,
        nodes,
      });
    });

  return families;
}

function main() {
  const data = loadData();
  const families = buildFamilies(data);
  const nodeCount = families.reduce((sum, family) => sum + family.nodes.length, 0);
  const output = `window.WORDTREE_DATA = window.WORDTREE_DATA || {};
window.WORDTREE_DATA.importedFamiliesMeta = ${JSON.stringify({
    generatedAt: new Date().toISOString(),
    familyCount: families.length,
    nodeCount,
  })};
window.WORDTREE_DATA.importedFamilies = ${JSON.stringify(families)};
`;
  fs.writeFileSync(path.join(root, "data", "generated-families.js"), output);
  console.log(`已生成 data/generated-families.js：${families.length} 个词族，${nodeCount} 个节点。`);
}

main();
