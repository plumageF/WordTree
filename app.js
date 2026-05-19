const data = window.WORDTREE_DATA || {};
const quickWords = data.quickWords || [];

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[char]));
const cleanEn = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, "");
const cleanCn = (v) => String(v || "").trim().toLowerCase().replace(/[，。；;、,.!！?？\s]/g, "");
const stat0 = { known: 0, unknown: 0, passed: 0, practice: 0 };
const posNames = {
  "n.": "名",
  "v.": "动",
  "adj.": "形",
  "adv.": "副",
  "pron.": "代",
  "prep.": "介",
  "conj.": "连",
  "int.": "感",
  "num.": "数",
  "art.": "冠",
  "aux.": "助",
};

function splitPos(pos) {
  return String(pos || "词")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);
}

function posLabel(pos) {
  return splitPos(pos).map((item) => posNames[item] || item.replace(/\.$/, "")).join("/");
}

function meaningBuckets(word) {
  const groups = (word.groups || []).length
    ? word.groups
    : (word.meanings || []).map((label) => ({ label, pos: word.pos }));
  const buckets = [];
  for (const group of groups) {
    const pos = group.pos || word.pos || "词";
    let bucket = buckets.find((item) => item.pos === pos);
    if (!bucket) {
      bucket = { pos, labels: [] };
      buckets.push(bucket);
    }
    if (group.label && !bucket.labels.includes(group.label)) bucket.labels.push(group.label);
  }
  return buckets.filter((bucket) => bucket.labels.length);
}

function meaningText(word) {
  const buckets = meaningBuckets(word);
  if (!buckets.length) return (word.meanings || []).join("；");
  return buckets.map((bucket) => `【${posLabel(bucket.pos)}】${bucket.labels.join("；")}`).join(" ｜ ");
}

function meaningHtml(word) {
  return meaningBuckets(word)
    .map((bucket) => `<div class="meaningLine"><span>【${escapeHtml(posLabel(bucket.pos))}】</span>${escapeHtml(bucket.labels.join("；"))}</div>`)
    .join("");
}

function meaningBlocksHtml(word, className = "") {
  const buckets = meaningBuckets(word);
  if (!buckets.length) return `<div class="meaningBlock ${className}">${escapeHtml((word.meanings || []).join("；"))}</div>`;
  return `<div class="meaningBlocks ${className}">
    ${buckets.map((bucket) => `
      <div class="meaningBlock">
        <span>${escapeHtml(posLabel(bucket.pos))}</span>
        <div>${bucket.labels.map((label) => `<b>${escapeHtml(label)}</b>`).join("")}</div>
      </div>
    `).join("")}
  </div>`;
}

function uniqueStrings(values) {
  const seen = new Set();
  return (values || []).filter((value) => {
    const text = String(value || "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeWordLists(lists) {
  const map = new Map();
  for (const list of lists) {
    for (const word of list || []) {
      const key = cleanEn(word.word);
      if (!key) continue;
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          ...word,
          meanings: uniqueStrings(word.meanings),
          groups: word.groups || [],
          tags: uniqueStrings(word.tags),
        });
        continue;
      }
      current.pos = current.pos || word.pos;
      current.phonetic = current.phonetic || word.phonetic;
      current.familyId = current.familyId || word.familyId || null;
      current.meanings = uniqueStrings([...(current.meanings || []), ...(word.meanings || [])]);
      for (const group of word.groups || []) {
        if (!group?.label) continue;
        const existing = current.groups.find((item) => cleanCn(item.label) === cleanCn(group.label));
        if (existing) existing.pos = uniqueStrings([existing.pos, group.pos]).join("/");
        else current.groups.push(group);
      }
      current.tags = uniqueStrings([...(current.tags || []), ...(word.tags || [])]);
    }
  }
  return [...map.values()];
}

function mergeWordbooks(lists) {
  const map = new Map();
  for (const list of lists) {
    for (const book of list || []) {
      if (!book?.id) continue;
      const current = map.get(book.id);
      if (!current || (!current.words?.length && book.words?.length)) {
        const words = uniqueStrings(book.words);
        map.set(book.id, {
          ...book,
          sourceCount: book.sourceCount || words.length,
          uniqueCount: book.uniqueCount || words.length,
          words,
        });
      } else {
        current.words = uniqueStrings([...(current.words || []), ...(book.words || [])]);
        current.sourceCount = Math.max(current.sourceCount || 0, book.sourceCount || book.words?.length || 0);
        current.uniqueCount = current.words.length;
        current.name = book.name || current.name;
        current.description = book.description || current.description;
      }
    }
  }
  return [...map.values()];
}

function bookDisplayCount(book) {
  const count = Number(book?.sourceCount);
  return Number.isFinite(count) && count > 0 ? count : book?.words?.length || 0;
}

function mergeFamilies(lists) {
  const map = new Map();
  for (const list of lists) {
    for (const family of list || []) {
      if (!family?.id || map.has(family.id)) continue;
      map.set(family.id, family);
    }
  }
  return [...map.values()];
}

const allWords = mergeWordLists([data.words || [], data.importedWords || []]);
const wordbooks = mergeWordbooks([data.wordbooks || [], data.importedWordbooks || []]);
let families = mergeFamilies([data.families || [], data.importedFamilies || []]);
const activeWordCache = new Map();
const wordByKey = new Map(allWords.map((word) => [cleanEn(word.word), word]));
const familyByWord = new Map();
let generatedFamiliesLoading = false;
let generatedFamiliesLoaded = Boolean(data.importedFamilies?.length);

function rebuildFamilyIndex() {
  familyByWord.clear();
  families.forEach((family) => {
    (family.nodes || []).forEach((node) => {
      const key = cleanEn(node.word);
      if (key && !familyByWord.has(key)) familyByWord.set(key, family);
    });
  });
}

rebuildFamilyIndex();
const savedWordbookId = localStorage.getItem("wtWordbook");
const initialWordbookId = !savedWordbookId || savedWordbookId === "all" || wordbooks.some((book) => book.id === savedWordbookId)
  ? savedWordbookId || wordbooks[0]?.id || "all"
  : wordbooks[0]?.id || "all";
const reviewIntervals = [60 * 60 * 1000, 8 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 2 * 24 * 60 * 60 * 1000, 4 * 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000, 15 * 24 * 60 * 60 * 1000, 30 * 24 * 60 * 60 * 1000];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function readArrayStorage(key) {
  const value = readStorage(key, []);
  if (Array.isArray(value)) return value;
  localStorage.removeItem(key);
  return [];
}

function readObjectStorage(key) {
  const value = readStorage(key, {});
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  localStorage.removeItem(key);
  return {};
}

function loadGeneratedFamilies(done = () => {}) {
  if (generatedFamiliesLoaded) {
    done();
    return;
  }
  if (generatedFamiliesLoading) return;
  generatedFamiliesLoading = true;
  const script = document.createElement("script");
  script.src = "data/generated-families.js";
  script.onload = () => {
    generatedFamiliesLoaded = true;
    generatedFamiliesLoading = false;
    families = mergeFamilies([data.families || [], data.importedFamilies || []]);
    rebuildFamilyIndex();
    if (!families.some((family) => family.id === state.familyId)) state.familyId = families[0]?.id || "";
    state.familyDirectoryReady = false;
    done();
  };
  script.onerror = () => {
    generatedFamiliesLoading = false;
    done();
  };
  document.body.appendChild(script);
}
const comboTiers = [
  {
    tier: 1,
    min: 0,
    max: 19,
    color: "#2f7657",
    soft: "rgba(47, 118, 87, .16)",
    gradient: "linear-gradient(135deg, #2f7657, #8bd8b2)",
    aura: "rgba(47, 118, 87, .16)",
    strong: "rgba(47, 118, 87, .28)",
  },
  {
    tier: 2,
    min: 20,
    max: 39,
    color: "#3b82f6",
    soft: "rgba(59, 130, 246, .16)",
    gradient: "linear-gradient(135deg, #2563eb, #93c5fd)",
    aura: "rgba(59, 130, 246, .18)",
    strong: "rgba(59, 130, 246, .32)",
  },
  {
    tier: 3,
    min: 40,
    max: 59,
    color: "#a855f7",
    soft: "rgba(168, 85, 247, .16)",
    gradient: "linear-gradient(135deg, #7e22ce, #d8b4fe)",
    aura: "rgba(168, 85, 247, .2)",
    strong: "rgba(168, 85, 247, .36)",
  },
  {
    tier: 4,
    min: 60,
    max: 99,
    color: "#ec4899",
    soft: "rgba(236, 72, 153, .16)",
    gradient: "linear-gradient(135deg, #db2777, #f9a8d4)",
    aura: "rgba(236, 72, 153, .22)",
    strong: "rgba(236, 72, 153, .38)",
  },
  {
    tier: 5,
    min: 100,
    max: 149,
    color: "#d6a11f",
    soft: "rgba(214, 161, 31, .18)",
    gradient: "linear-gradient(135deg, #b7791f, #fde68a)",
    aura: "rgba(214, 161, 31, .24)",
    strong: "rgba(214, 161, 31, .42)",
  },
  {
    tier: 6,
    min: 150,
    max: Infinity,
    color: "#facc15",
    soft: "rgba(250, 204, 21, .2)",
    gradient: "linear-gradient(135deg, #fff1a6, #ffd36a, #c084fc, #67e8f9)",
    aura: "rgba(250, 204, 21, .26)",
    strong: "rgba(250, 204, 21, .48)",
  },
];

const state = {
  view: "cards",
  cardDir: "en",
  cardIndex: 0,
  revealed: false,
  quizIndex: 0,
  locked: false,
  left: 10,
  timeLimit: 10,
  timer: null,
  nextTimer: null,
  treeMode: "browse",
  familyId: families[0]?.id || "",
  wordbookId: initialWordbookId,
  theme: localStorage.getItem("wtTheme") || "light",
  sideCollapsed: localStorage.getItem("wtSideCollapsed") === "true",
  stats: readStorage("wtStats", { ...stat0 }) || { ...stat0 },
  memory: readObjectStorage("wtWordMemory"),
  reports: readArrayStorage("wtPracticeReports"),
  recordWordbookId: localStorage.getItem("wtRecordWordbook") || initialWordbookId || "all",
  memoryStatusFilter: localStorage.getItem("wtMemoryStatusFilter") || "all",
  cardPickMode: localStorage.getItem("wtCardPickMode") || "smart",
  cardPickCount: localStorage.getItem("wtCardPickCount") || "10",
  cardSelected: new Set(readArrayStorage("wtCardSelected")),
  cardSession: {
    words: [],
    answered: 0,
    known: 0,
    unknown: 0,
    startedAt: 0,
    complete: false,
    reportOffered: false,
  },
  quizPickMode: localStorage.getItem("wtQuizPickMode") || "smart",
  quizSelected: new Set(readArrayStorage("wtQuizSelected")),
  challenge: {
    size: localStorage.getItem("wtChallengeSize") || "10",
    customSize: localStorage.getItem("wtCustomChallengeSize") || "",
    words: [],
    target: 0,
    answered: 0,
    correct: 0,
    wrong: 0,
    currentStreak: 0,
    bestStreak: 0,
    records: [],
    history: [],
    active: false,
    paused: false,
  },
  soundOn: localStorage.getItem("wtSoundOn") !== "false",
  speechOn: localStorage.getItem("wtSpeechOn") !== "false",
  lastSpeechKey: "",
  familyDirectoryReady: false,
};

const titles = {
  cards: ["认词卡片", "看英语或汉语，翻面后标记背过或没背过。"],
  quiz: ["限时输入", "按单词长度动态限时，超时会自动显示答案并加入待练习。"],
  tree: ["词族树谱", "输入树谱中的任意单词即可查看完整结构，命中词会高亮。"],
  records: ["练习记录", "查看保存在本地的认词和测试记录，可按词书、模块或错误单词搜索。"],
};

function saveStats() {
  localStorage.setItem("wtStats", JSON.stringify(state.stats));
}

function saveMemory() {
  try {
    localStorage.setItem("wtWordMemory", JSON.stringify(state.memory));
  } catch {
    const entries = Object.entries(state.memory)
      .sort((a, b) => (b[1].l || 0) - (a[1].l || 0))
      .slice(0, 8000);
    state.memory = Object.fromEntries(entries);
    localStorage.setItem("wtWordMemory", JSON.stringify(state.memory));
  }
}

function saveReports() {
  state.reports = state.reports.slice(-80);
  try {
    localStorage.setItem("wtPracticeReports", JSON.stringify(state.reports));
  } catch {
    state.reports = state.reports.slice(-30);
    localStorage.setItem("wtPracticeReports", JSON.stringify(state.reports));
  }
}

function memoryFor(word) {
  return state.memory[cleanEn(word?.word || word)] || null;
}

function statusIcon(word) {
  const item = memoryFor(word);
  if (!item) return "·";
  if (item.s === 1) return "✓";
  if (item.s === -1) return "!";
  return "·";
}

function memoryStatus(word) {
  const item = memoryFor(word);
  if (!item) return "unlearned";
  if (item.s === 1) return (item.d || 0) <= Date.now() ? "due" : "learned";
  if (item.s === -1) return "weak";
  return "seen";
}

function memoryStatusText(word) {
  const map = {
    learned: "已背过",
    due: "待复习",
    weak: "需加强",
    seen: "已认词",
    unlearned: "未背过",
  };
  return map[memoryStatus(word)] || "未背过";
}

function updateMemory(word, outcome, source) {
  if (!word) return;
  const key = cleanEn(word.word);
  const now = Date.now();
  const item = state.memory[key] || {};
  item.n = (item.n || 0) + 1;
  item.l = now;
  item.src = source;
  if (outcome === "pass") {
    item.s = 1;
    item.p = (item.p || 0) + 1;
    item.i = Math.min((item.i || 0) + 1, reviewIntervals.length - 1);
    item.d = now + reviewIntervals[item.i];
  } else if (outcome === "weak") {
    item.s = -1;
    item.f = (item.f || 0) + 1;
    item.i = 0;
    item.d = now + 10 * 60 * 1000;
  } else {
    item.s = item.s === 1 ? 1 : 0;
    item.d = item.d || now + reviewIntervals[0];
  }
  state.memory[key] = item;
  saveMemory();
}

function dueScore(word, mode) {
  const item = memoryFor(word);
  const now = Date.now();
  if (!item) return mode === "cards" ? 1000 : 120;
  const overdue = Math.max(0, now - (item.d || 0)) / (60 * 60 * 1000);
  if (mode === "cards") {
    if (item.s === -1) return 380 + overdue;
    if (item.s === 0) return 240 + overdue;
    return Math.max(0, overdue);
  }
  if (item.s === -1) return 900 + overdue * 3;
  if (item.s === 1) return (item.d || 0) <= now ? 560 + overdue * 2 : 120 - (item.i || 0) * 8;
  return 220 + overdue;
}

function seededRandom() {
  return Math.random() - 0.5;
}

function smartPick(words, count, mode) {
  return words
    .map((word) => ({ word, score: dueScore(word, mode), jitter: Math.random() }))
    .sort((a, b) => b.score - a.score || b.jitter - a.jitter)
    .slice(0, Math.min(count, words.length))
    .map((item) => item.word);
}

function pickPool(words, pickMode, mode) {
  if (pickMode === "new") {
    const pool = words.filter((word) => memoryStatus(word) === "unlearned");
    return pool.length ? pool : words;
  }
  if (pickMode === "review") {
    const pool = words.filter((word) => ["weak", "due", "seen", "learned"].includes(memoryStatus(word)));
    return pool.length ? pool : words;
  }
  return words;
}

function countFrom(value, fallback, max) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), max);
  if (value === "all") return max;
  return Math.min(fallback, max);
}

function wordsFromSelection(selected, fallbackWords) {
  const picked = [...selected].map((key) => wordByKey.get(key)).filter(Boolean);
  return picked.length ? picked.filter((word) => fallbackWords.some((item) => cleanEn(item.word) === cleanEn(word.word))) : [];
}

function reportPayload(type, result) {
  const wrongWords = result.wrongWords || [];
  return {
    t: Date.now(),
    m: type,
    b: state.wordbookId,
    n: result.total,
    ok: result.correct,
    er: result.wrong,
    w: wrongWords.map((word) => cleanEn(word)).slice(0, 80),
  };
}

function offerPracticeReport(type, result) {
  if (!result.total) return;
  const ok = window.confirm(`是否保存本组练习记录？\n数量 ${result.total}，正确 ${result.correct}，错误 ${result.wrong}`);
  if (!ok) return;
  state.reports.push(reportPayload(type, result));
  saveReports();
}

function applyChromeState() {
  document.documentElement.dataset.theme = state.theme;
  document.body.classList.toggle("side-collapsed", state.sideCollapsed);
  $("#themeToggle").textContent = state.theme === "dark" ? "浅色" : "深色";
  $("#soundToggle").textContent = state.soundOn ? "音效开" : "音效关";
  $("#speechToggle").textContent = state.speechOn ? "读音开" : "读音关";
  $("#sideToggle").setAttribute("aria-label", state.sideCollapsed ? "展开侧边栏" : "收起侧边栏");
}

function comboTierForStreak(streak) {
  return comboTiers.find((tier) => streak >= tier.min && streak <= tier.max) || comboTiers[0];
}

function lowerTierStart(streak) {
  const current = comboTierForStreak(streak);
  const lower = comboTiers[Math.max(0, current.tier - 2)];
  return lower.min;
}

function applyComboVisuals() {
  const root = document.documentElement;
  if (state.view !== "quiz") {
    document.body.classList.remove("combo-active");
    ["--green", "--green-soft", "--combo-color", "--combo-gradient", "--combo-aura", "--combo-aura-strong"].forEach((name) => {
      root.style.removeProperty(name);
    });
    const pill = $("#comboPill");
    if (pill) pill.textContent = "T1 · 连击 0";
    return;
  }

  const tier = comboTierForStreak(state.challenge.currentStreak);
  document.body.classList.add("combo-active");
  root.style.setProperty("--green", tier.color);
  root.style.setProperty("--green-soft", tier.soft);
  root.style.setProperty("--combo-color", tier.color);
  root.style.setProperty("--combo-gradient", tier.gradient);
  root.style.setProperty("--combo-aura", tier.aura);
  root.style.setProperty("--combo-aura-strong", tier.strong);
  const pill = $("#comboPill");
  if (pill) pill.textContent = `T${tier.tier} · 连击 ${state.challenge.currentStreak}`;
}

function wordsForBook(bookId) {
  const key = bookId || "all";
  if (activeWordCache.has(key)) return activeWordCache.get(key);
  const book = wordbooks.find((item) => item.id === key);
  if (!book) {
    activeWordCache.set(key, allWords);
    return allWords;
  }
  const allowed = new Set(book.words.map(cleanEn));
  const words = allWords.filter((word) => allowed.has(cleanEn(word.word)));
  activeWordCache.set(key, words);
  return words;
}

function activeWords() {
  return wordsForBook(state.wordbookId);
}

function challengeTarget() {
  const words = activeWords();
  const custom = Number(state.challenge.customSize);
  if (Number.isFinite(custom) && custom > 0) return Math.min(custom, words.length);
  if (state.challenge.size === "all") return words.length;
  return Math.min(Number(state.challenge.size), words.length);
}

function buildCardSession() {
  const sourceWords = activeWords();
  const words = pickPool(sourceWords, state.cardPickMode, "cards");
  const target = countFrom(state.cardPickCount, 10, words.length);
  let selected = [];
  if (state.cardPickMode === "custom") selected = wordsFromSelection(state.cardSelected, sourceWords);
  if (!selected.length && state.cardPickMode === "order") selected = words.slice(0, target);
  if (!selected.length) selected = smartPick(words, target, "cards");
  state.cardSession = {
    words: selected.slice(0, Math.max(1, target)),
    answered: 0,
    known: 0,
    unknown: 0,
    startedAt: Date.now(),
    complete: false,
    reportOffered: false,
  };
  state.cardIndex = 0;
  state.revealed = false;
  renderCard();
}

function sessionWords() {
  if (!state.challenge.words.length) resetChallenge();
  return state.challenge.words.length ? state.challenge.words : activeWords().slice(0, Math.max(1, challengeTarget()));
}

function currentCardWord() {
  if (!state.cardSession.words.length) buildCardSession();
  const words = state.cardSession.words;
  return words[state.cardIndex % words.length];
}

function currentQuizWord() {
  const words = sessionWords();
  return words[state.quizIndex % words.length];
}

function currentVisibleWord() {
  if (state.view === "quiz") return currentQuizWord();
  if (state.view === "cards") return currentCardWord();
  return null;
}

function timeLimitForWord(word) {
  if (!word) return 10;
  const letterCount = cleanEn(word.word).length;
  return Math.min(18, Math.max(6, Math.ceil(letterCount * 1.35 + 2)));
}

function renderWordbookSelects() {
  const options = [
    `<option value="all" ${state.wordbookId === "all" ? "selected" : ""}>全部词库 (${allWords.length})</option>`,
    ...wordbooks.map(
      (book) => `<option value="${book.id}" ${book.id === state.wordbookId ? "selected" : ""} ${book.words.length ? "" : "disabled"}>${book.name}${bookDisplayCount(book) ? ` (${bookDisplayCount(book)})` : ""}</option>`,
    ),
  ].join("");
  $("#wordbookSelect").innerHTML = options;
  $("#quizWordbookSelect").innerHTML = options;
  if ($("#recordWordbookSelect")) {
    $("#recordWordbookSelect").innerHTML = [
      `<option value="all" ${state.recordWordbookId === "all" ? "selected" : ""}>全部词库 (${allWords.length})</option>`,
      ...wordbooks.map((book) => `<option value="${book.id}" ${book.id === state.recordWordbookId ? "selected" : ""}>${book.name}${bookDisplayCount(book) ? ` (${bookDisplayCount(book)})` : ""}</option>`),
    ].join("");
  }
  if ($("#cardPickMode")) $("#cardPickMode").value = state.cardPickMode;
  if ($("#quizPickMode")) $("#quizPickMode").value = state.quizPickMode;
  if ($("#cardPickCount")) $("#cardPickCount").value = state.cardPickCount;
  if ($("#memoryStatusSelect")) $("#memoryStatusSelect").value = state.memoryStatusFilter;
}

function setWordbook(id) {
  state.wordbookId = id;
  state.cardIndex = 0;
  state.quizIndex = 0;
  state.revealed = false;
  localStorage.setItem("wtWordbook", id);
  renderWordbookSelects();
  buildCardSession();
  resetChallenge();
  renderPickers();
  if (state.view === "quiz") startQuiz();
}

function resetChallenge() {
  const sourceWords = activeWords();
  const pool = pickPool(sourceWords, state.quizPickMode, "quiz");
  const target = challengeTarget();
  let selected = [];
  if (state.quizPickMode === "custom") selected = wordsFromSelection(state.quizSelected, sourceWords);
  if (!selected.length && state.quizPickMode === "order") selected = pool.slice(0, target);
  if (!selected.length) selected = smartPick(pool, target, "quiz");
  state.challenge.target = target;
  state.challenge.words = selected.slice(0, Math.max(1, target));
  state.challenge.target = state.challenge.words.length;
  state.challenge.answered = 0;
  state.challenge.correct = 0;
  state.challenge.wrong = 0;
  state.challenge.currentStreak = 0;
  state.challenge.bestStreak = 0;
  state.challenge.records = [];
  state.challenge.history = [{ step: 0, correct: 0, wrong: 0, remaining: state.challenge.target }];
  state.challenge.active = true;
  state.challenge.paused = false;
  state.challenge.reportOffered = false;
  state.quizIndex = 0;
  renderSessionPanel();
}

function renderShell() {
  $("#title").textContent = titles[state.view][0];
  $("#subtitle").textContent = titles[state.view][1];
  $$(".nav").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === state.view));
  $("#stats").innerHTML = [
    ["背过", state.stats.known],
    ["没背过", state.stats.unknown],
    ["输入通过", state.stats.passed],
    ["待练习", state.stats.practice],
  ].map(([k, v]) => `<div class="stat"><strong>${v}</strong><span>${k}</span></div>`).join("");
  applyComboVisuals();
  if (state.view === "records") {
    renderWordbookSelects();
    renderReports();
    renderMemoryLookup();
  }
}

function renderCard() {
  const words = state.cardSession.words.length ? state.cardSession.words : activeWords();
  const w = currentCardWord();
  if (!w) {
    $("#card").innerHTML = `<span><span class="big">暂无单词</span><span class="hint">请检查词书数据</span></span>`;
    $("#cardActions").classList.add("hide");
    $("#cardAnswer").textContent = "当前词书为空。";
    return;
  }

  const prompt = state.cardDir === "en"
    ? `<span class="big">${escapeHtml(w.word)}</span>`
    : meaningBlocksHtml(w, "cardMeaningPrompt");
  $("#card").innerHTML = `<span><span class="memoryMark ${statusIcon(w) === "✓" ? "good" : statusIcon(w) === "!" ? "badmark" : ""}">${statusIcon(w)}</span><span class="posBadge">${w.pos}</span>${prompt}<span class="hint">${state.revealed ? `第 ${(state.cardIndex % words.length) + 1} / ${words.length} 词` : "点击或按 Enter 查看答案"}</span></span>`;
  $("#cardActions").classList.toggle("hide", !state.revealed);
  $("#cardAnswer").innerHTML = state.revealed
    ? `<span class="posBadge">${w.pos}</span>${state.cardDir === "en" ? meaningBlocksHtml(w) : `<span class="word">${escapeHtml(w.word)}</span>`}<div>${w.phonetic || ""}</div>${state.cardDir === "cn" ? `<div class="meaningList">${meaningHtml(w)}</div>` : ""}${w.familyId ? `<p>词族：${w.familyId}</p>` : ""}`
    : "点击左侧卡片查看答案";
  $$("[data-card-dir]").forEach((b) => b.classList.toggle("on", b.dataset.cardDir === state.cardDir));
  speakWordOnce(w.word, `card:${state.cardIndex}:${state.cardDir}:${w.word}`);
}

function markCard(type) {
  const words = state.cardSession.words.length ? state.cardSession.words : activeWords();
  const word = currentCardWord();
  if (type === "known") {
    state.cardSession.known += 1;
    updateMemory(word, "seen", "card");
  } else {
    state.cardSession.unknown += 1;
    updateMemory(word, "weak", "card");
  }
  state.cardSession.answered += 1;
  state.stats[type] += 1;
  saveStats();
  if (state.cardSession.answered >= words.length && !state.cardSession.reportOffered) {
    state.cardSession.complete = true;
    state.cardSession.reportOffered = true;
    offerPracticeReport("card", {
      total: words.length,
      correct: state.cardSession.known,
      wrong: state.cardSession.unknown,
      wrongWords: words.filter((item) => memoryFor(item)?.s === -1).map((item) => item.word),
    });
  }
  state.cardIndex = (state.cardIndex + 1) % words.length;
  state.revealed = false;
  renderShell();
  renderCard();
  renderPickers();
}

function startQuiz() {
  stopQuiz();
  if (!state.challenge.active) resetChallenge();
  if (state.challenge.answered >= state.challenge.target) {
    renderQuizComplete();
    return;
  }
  state.locked = false;
  state.challenge.paused = false;
  state.timeLimit = timeLimitForWord(currentQuizWord());
  state.left = state.timeLimit;
  renderQuiz();
  tickUi();
  startQuizTimer();
}

function startQuizTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (state.challenge.paused) return;
    state.left -= 1;
    tickUi();
    if (state.left <= 0) finishQuiz("timeout");
  }, 1000);
}

function stopQuiz() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  if (state.nextTimer) clearTimeout(state.nextTimer);
  state.nextTimer = null;
}

function tickUi() {
  $("#time").textContent = Math.max(0, state.left);
  $("#bar").style.width = `${(Math.max(0, state.left) / Math.max(1, state.timeLimit)) * 100}%`;
  $("#bar").style.background = state.left <= 3 ? "var(--red)" : "var(--green)";
}

function renderQuiz() {
  const w = currentQuizWord();
  if (!w) {
    $("#quizPrompt").innerHTML = `<strong>暂无单词</strong><p>请检查词书数据。</p>`;
    $("#quizInput").disabled = true;
    return;
  }

  $("#quizPrompt").innerHTML = `<div class="quizMeaningHead"><span class="memoryMark ${statusIcon(w) === "✓" ? "good" : statusIcon(w) === "!" ? "badmark" : ""}">${statusIcon(w)}</span><span class="quizPos">${w.pos}</span></div><div class="quizMeaningScroll">${meaningBlocksHtml(w, "quizMeaningPrompt")}</div><p class="quizHintLine">首字母提示 <span class="firstHint">${cleanEn(w.word)[0] || ""}</span>，本词限时 ${state.timeLimit} 秒，仍需拼完整单词</p><div class="letterSlots" id="letterSlots">${letterSlots(w.word, "")}</div>`;
  $("#quizInput").value = "";
  $("#quizInput").setAttribute("maxlength", String(w.word.length));
  $("#quizInput").disabled = false;
  $("#quizFeedback").className = "feedback hide";
  $("#quizInput").focus();
  updateChallengeControls();
  renderSessionPanel();
  speakWordOnce(w.word, `quiz:${state.quizIndex}:${w.word}`);
}

function renderQuizComplete(reason = "complete") {
  state.locked = true;
  state.challenge.paused = false;
  const completed = reason === "complete";
  const total = completed ? state.challenge.target : state.challenge.answered;
  $("#quizPrompt").innerHTML = `<strong>${completed ? "本组完成" : "本组已结束"}</strong><p>已答 ${state.challenge.answered}，正确 ${state.challenge.correct}，错误 ${state.challenge.wrong}。可以调整本组词数后重新开始。</p>`;
  $("#quizInput").value = "";
  $("#quizInput").disabled = true;
  $("#quizFeedback").className = "feedback okay";
  $("#quizFeedback").innerHTML = `<strong>${completed ? "闯关结束。" : "已提前结束本组。"}</strong><br>统计 ${total} 词，正确 ${state.challenge.correct}，错误 ${state.challenge.wrong}。`;
  tickUi();
  updateChallengeControls();
  renderSessionPanel();
  if (total > 0 && !state.challenge.reportOffered) {
    state.challenge.reportOffered = true;
    offerPracticeReport("quiz", {
      total,
      correct: state.challenge.correct,
      wrong: state.challenge.wrong,
      wrongWords: state.challenge.records.filter((row) => row.result !== "正确").map((row) => row.word),
    });
  }
}

function abortChallenge() {
  stopQuiz();
  state.locked = true;
  state.left = 0;
  state.challenge.words = [];
  state.challenge.target = challengeTarget();
  state.challenge.answered = 0;
  state.challenge.correct = 0;
  state.challenge.wrong = 0;
  state.challenge.currentStreak = 0;
  state.challenge.bestStreak = 0;
  state.challenge.records = [];
  state.challenge.history = [{ step: 0, correct: 0, wrong: 0, remaining: state.challenge.target }];
  state.challenge.active = false;
  state.challenge.paused = false;
  state.challenge.reportOffered = true;
  state.quizIndex = 0;
  $("#quizPrompt").innerHTML = `<strong>挑战已终止</strong><p>本组进度已清空，不会保存练习记录。</p>`;
  $("#quizInput").value = "";
  $("#quizInput").disabled = true;
  $("#quizFeedback").className = "feedback warn";
  $("#quizFeedback").innerHTML = `<strong>已终止当前挑战。</strong><br>点击“开始闯关”会重新生成一组。`;
  tickUi();
  updateChallengeControls();
  renderSessionPanel();
  applyComboVisuals();
}

function finishChallengeEarly() {
  if (!state.challenge.active || state.challenge.answered <= 0) {
    abortChallenge();
    return;
  }
  stopQuiz();
  state.challenge.active = false;
  state.challenge.paused = false;
  state.left = 0;
  renderQuizComplete("manual");
}

function togglePauseChallenge() {
  if (state.locked || !state.challenge.active) return;
  state.challenge.paused = !state.challenge.paused;
  if (state.challenge.paused) {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    $("#quizInput").disabled = true;
  } else {
    $("#quizInput").disabled = false;
    $("#quizInput").focus();
    startQuizTimer();
  }
  updateChallengeControls();
}

function updateChallengeControls() {
  const pause = $("#pauseChallenge");
  const finish = $("#finishChallenge");
  if (pause) {
    pause.textContent = state.challenge.paused ? "继续" : "暂停";
    pause.disabled = state.locked || !state.challenge.active;
  }
  if (finish) finish.disabled = !state.challenge.active && state.challenge.answered <= 0;
}

function letterSlots(word, value) {
  const chars = cleanEn(value).split("");
  return cleanEn(word)
    .split("")
    .map((_, index) => `<span class="letterSlot">${chars[index] || ""}</span>`)
    .join("");
}

function refreshLetterSlots() {
  const w = currentQuizWord();
  const slots = $("#letterSlots");
  if (slots && w) slots.innerHTML = letterSlots(w.word, $("#quizInput").value);
  renderSessionPanel();
}

function queueNextQuiz(delay = 850) {
  if (state.nextTimer) clearTimeout(state.nextTimer);
  state.nextTimer = window.setTimeout(() => {
    state.nextTimer = null;
    if (state.view !== "quiz") return;
    if (state.challenge.answered >= state.challenge.target) {
      renderQuizComplete();
      return;
    }
    const words = sessionWords();
    state.quizIndex = (state.quizIndex + 1) % words.length;
    startQuiz();
  }, delay);
}

function finishQuiz(type, missing = []) {
  if (state.locked) return;
  stopQuiz();
  state.locked = true;
  $("#quizInput").disabled = true;
  const w = currentQuizWord();
  const box = $("#quizFeedback");
  const passed = type === "pass";
  const streak = recordChallengeResult(w, passed, type);
  updateMemory(w, passed ? "pass" : "weak", "quiz");
  renderSessionPanel();
  if (type === "pass") {
    state.stats.passed += 1;
    box.className = "feedback okay";
    box.innerHTML = `<strong>通过，进入下一题。</strong><br>${w.word}：${meaningText(w)}`;
    triggerCorrectReward(streak);
    queueNextQuiz(420);
  } else {
    state.stats.practice += 1;
    box.className = `feedback ${type === "timeout" ? "warn" : "fail"}`;
    box.innerHTML = `<strong>${type === "timeout" ? "已超时" : "未通过"}，已加入待练习并进入下一题。</strong><br>正确答案：${w.word}，${meaningText(w)}${missing.length ? `<br>缺少义项：${missing.join("；")}` : ""}`;
    triggerWrongFeedback();
    queueNextQuiz(1050);
  }
  saveStats();
  renderShell();
  renderPickers();
}

function recordChallengeResult(word, passed, type) {
  if (!state.challenge.active) resetChallenge();
  state.challenge.answered += 1;
  if (passed) {
    state.challenge.correct += 1;
    state.challenge.currentStreak += 1;
    state.challenge.bestStreak = Math.max(state.challenge.bestStreak, state.challenge.currentStreak);
  } else {
    state.challenge.wrong += 1;
    state.challenge.currentStreak = lowerTierStart(state.challenge.currentStreak);
  }

  const elapsed = Math.max(0, state.timeLimit - state.left);
  state.challenge.records.push({
    index: state.challenge.answered,
    word: word.word,
    result: passed ? "正确" : type === "timeout" ? "超时" : "错误",
    elapsed,
  });
  state.challenge.history.push({
    step: state.challenge.answered,
    correct: state.challenge.correct,
    wrong: state.challenge.wrong,
    remaining: Math.max(0, state.challenge.target - state.challenge.answered),
  });
  return state.challenge.currentStreak;
}

function renderSessionPanel() {
  if (!$("#recordStats")) return;
  const target = state.challenge.target || challengeTarget();
  const remaining = Math.max(0, target - state.challenge.answered);
  $("#sessionLabel").textContent = `本组 ${target} 词`;
  $("#recordStats").innerHTML = [
    ["总数", target],
    ["正确", state.challenge.correct],
    ["错误", state.challenge.wrong],
    ["剩余", remaining],
  ].map(([label, value]) => `<div class="recordStat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#streakMeter").innerHTML = `
    <div class="streakBox" id="currentStreakBox"><strong>${state.challenge.currentStreak}</strong><span>当前连对</span></div>
    <div class="streakBox"><strong>${state.challenge.bestStreak}</strong><span>最佳连对</span></div>
  `;
  applyComboVisuals();
  $("#recordRows").innerHTML = state.challenge.records.length
    ? state.challenge.records
        .slice()
        .reverse()
        .map((row) => `<tr><td>${row.index}</td><td>${row.word}</td><td class="${row.result === "正确" ? "resultOk" : "resultBad"}">${row.result}</td><td>${row.elapsed}s</td></tr>`)
        .join("")
    : `<tr><td colspan="4">开始闯关后记录会显示在这里。</td></tr>`;
  renderProgressChart();
}

function renderProgressChart() {
  const svg = $("#progressChart");
  if (!svg) return;
  const target = Math.max(1, state.challenge.target || challengeTarget());
  const width = 420;
  const height = 190;
  const left = 88;
  const right = 28;
  const barWidth = width - left - right;
  const currentWord = currentQuizWord();
  const input = $("#quizInput");
  const inputRatio = currentWord && input && state.view === "quiz" && !state.locked
    ? cleanEn(input.value).length / Math.max(1, cleanEn(currentWord.word).length)
    : 0;
  const rows = [
    { label: "正确", value: state.challenge.correct, max: target, cls: "barCorrect", y: 32 },
    { label: "错误", value: state.challenge.wrong, max: target, cls: "barWrong", y: 72 },
    { label: "剩余", value: Math.max(0, target - state.challenge.answered), max: target, cls: "barRemain", y: 112 },
    { label: "当前拼写", value: Math.round(inputRatio * 100), max: 100, cls: "barInput", y: 152, suffix: "%" },
  ];
  const bars = rows.map((row) => {
    const ratio = Math.max(0, Math.min(1, row.value / row.max));
    const filled = ratio * barWidth;
    return `
      <text class="chartLabel" x="24" y="${row.y + 15}">${row.label}</text>
      <rect class="barBg" x="${left}" y="${row.y}" width="${barWidth}" height="18" rx="9"></rect>
      <rect class="${row.cls}" x="${left}" y="${row.y}" width="${filled}" height="18" rx="9"></rect>
      <text class="barValue" x="${left + barWidth - 4}" y="${row.y + 14}" text-anchor="end">${row.value}${row.suffix || ""}</text>
    `;
  }).join("");

  svg.innerHTML = `
    <text class="chartLabel" x="24" y="18">本组进度</text>
    <text class="chartLabel" x="${width - 72}" y="18">目标 ${target}</text>
    ${bars}
  `;
}

function bookNameById(id) {
  if (id === "all") return "全部词库";
  return wordbooks.find((book) => book.id === id)?.name || id || "未知词书";
}

function reportMatches(report, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const text = [
    report.m === "quiz" ? "测试" : "认词",
    report.m,
    bookNameById(report.b),
    ...(report.w || []),
  ].join(" ").toLowerCase();
  return text.includes(q);
}

function renderReports(selectedIndex = 0) {
  if (!$("#reportRows")) return;
  const query = $("#recordSearch")?.value || "";
  const rows = state.reports
    .map((report, index) => ({ report, index }))
    .filter(({ report }) => reportMatches(report, query))
    .reverse();
  $("#reportCount").textContent = `${rows.length} / ${state.reports.length} 条`;
  $("#reportRows").innerHTML = rows.length
    ? rows.map(({ report, index }) => `
      <tr data-report-index="${index}">
        <td>${new Date(report.t).toLocaleString()}</td>
        <td>${report.m === "quiz" ? "测试" : "认词"}</td>
        <td>${escapeHtml(bookNameById(report.b))}</td>
        <td>${report.n}</td>
        <td class="resultOk">${report.ok}</td>
        <td class="resultBad">${report.er}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">暂无匹配记录。</td></tr>`;

  $$("[data-report-index]").forEach((row) => {
    row.onclick = () => renderReportDetail(Number(row.dataset.reportIndex));
  });
  renderReportDetail(rows[selectedIndex]?.index);
}

function renderReportDetail(index) {
  const report = state.reports[index];
  const box = $("#reportDetail");
  if (!box) return;
  if (!report) {
    box.innerHTML = "暂无错误单词。";
    return;
  }
  const words = (report.w || []).map((key) => wordByKey.get(key)?.word || key);
  box.innerHTML = `
    <div class="reportMeta">
      <strong>${report.m === "quiz" ? "测试" : "认词"} · ${escapeHtml(bookNameById(report.b))}</strong>
      <p>${new Date(report.t).toLocaleString()} · 数量 ${report.n} · 正确 ${report.ok} · 错误 ${report.er}</p>
    </div>
    ${words.length
      ? `<div class="bookTags">${words.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}</div>`
      : `<div class="feedback okay">本组没有错误单词。</div>`}
  `;
}

function memoryMatchesStatus(word, filter) {
  const status = memoryStatus(word);
  if (filter === "all") return true;
  if (filter === "learned") return status === "learned" || status === "due";
  return status === filter;
}

function renderMemoryLookup() {
  const list = $("#wordMemoryList");
  if (!list) return;
  const query = $("#memorySearch")?.value || "";
  const statusFilter = $("#memoryStatusSelect")?.value || state.memoryStatusFilter || "all";
  const bookId = $("#recordWordbookSelect")?.value || state.recordWordbookId || "all";
  const sourceWords = wordsForBook(bookId);
  const visible = sourceWords
    .filter((word) => memoryMatchesStatus(word, statusFilter))
    .filter((word) => wordMatches(word, query))
    .slice(0, 500);

  $("#memoryLookupCount").textContent = `${visible.length} / ${sourceWords.length} 词`;
  list.innerHTML = visible.length
    ? visible.map((word) => {
      const status = memoryStatus(word);
      const icon = statusIcon(word);
      return `
        <div class="memoryWordRow">
          <span class="memoryMark ${icon === "✓" ? "good" : icon === "!" ? "badmark" : ""}">${icon}</span>
          <strong>${escapeHtml(word.word)}</strong>
          <span class="memoryState ${status}">${memoryStatusText(word)}</span>
          <span class="pickMeaning">${escapeHtml(meaningText(word))}</span>
        </div>
      `;
    }).join("")
    : `<div class="emptyState">暂无匹配单词。</div>`;
}

function wordMatches(word, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return word.word.toLowerCase().includes(q) || (word.meanings || []).join("；").includes(q);
}

function renderPicker(type) {
  const isCard = type === "card";
  const panel = $(`#${isCard ? "card" : "quiz"}Picker`);
  if (!panel || panel.classList.contains("hide")) return;
  const list = $(`#${isCard ? "card" : "quiz"}PickList`);
  const summary = $(`#${isCard ? "card" : "quiz"}PickerSummary`);
  const search = $(`#${isCard ? "card" : "quiz"}PickerSearch`)?.value || "";
  const selected = isCard ? state.cardSelected : state.quizSelected;
  const words = activeWords();
  const visible = words.filter((word) => wordMatches(word, search)).slice(0, 360);
  summary.textContent = `已选 ${selected.size} 个，当前显示 ${visible.length} / ${words.length} 个`;
  list.innerHTML = visible.map((word) => {
    const key = cleanEn(word.word);
    const icon = statusIcon(word);
    return `
      <label class="pickRow">
        <input type="checkbox" data-${type}-pick="${key}" ${selected.has(key) ? "checked" : ""}>
        <span class="memoryMark ${icon === "✓" ? "good" : icon === "!" ? "badmark" : ""}">${icon}</span>
        <span class="pickWord">${escapeHtml(word.word)}</span>
        <span class="pickMeaning">${escapeHtml(meaningText(word))}</span>
      </label>
    `;
  }).join("");
  $$(`[data-${type}-pick]`).forEach((input) => {
    input.onchange = () => {
      const key = input.dataset[`${type}Pick`];
      input.checked ? selected.add(key) : selected.delete(key);
      localStorage.setItem(isCard ? "wtCardSelected" : "wtQuizSelected", JSON.stringify([...selected]));
      renderPicker(type);
    };
  });
}

function renderPickers() {
  renderPicker("card");
  renderPicker("quiz");
}

function audioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!window.__wordTreeAudioCtx) window.__wordTreeAudioCtx = new AudioCtx();
  return window.__wordTreeAudioCtx;
}

function speakWord(word, force = false) {
  if (!state.speechOn && !force) return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.88;
  utterance.pitch = 1;
  utterance.volume = 0.9;
  window.speechSynthesis.speak(utterance);
}

function speakWordOnce(word, key) {
  if (!word || state.lastSpeechKey === key) return;
  state.lastSpeechKey = key;
  window.setTimeout(() => speakWord(word), 80);
}

function tone(freq, start, duration, type = "sine", gain = 0.035) {
  if (!state.soundOn) return;
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const volume = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  volume.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  volume.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(volume);
  volume.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

function playCorrectSound(streak) {
  const tier = comboTierForStreak(streak).tier;
  if (tier >= 5) {
    tone(523, 0, .12, "triangle", .044);
    tone(659, .08, .14, "triangle", .042);
    tone(784, .18, .16, "triangle", .04);
    tone(1046, .30, .18, "sine", .034);
    tone(1318, .42, .2, "sine", .03);
    tone(1568, .56, .22, "sine", .024);
    return;
  }
  if (tier >= 3) {
    tone(392, 0, .11, "triangle", .04);
    tone(523, .08, .12, "triangle", .04);
    tone(659, .16, .14, "triangle", .038);
    tone(784, .27, .18, "sine", .032);
    return;
  }
  if (tier === 2) {
    tone(540, 0, .1, "triangle", .034);
    tone(720, .08, .12, "triangle", .03);
    tone(900, .18, .15, "sine", .024);
    return;
  }
  tone(660, 0, .09, "sine", .028);
  tone(880, .055, .11, "sine", .023);
}

function playWrongSound() {
  tone(196, 0, .12, "sine", .026);
}

function rewardTier(streak) {
  if (comboTiers.some((tier) => tier.min === streak && tier.min > 0)) return "high";
  if ([3, 5, 10, 15].includes(streak)) return "low";
  return "tick";
}

function triggerCorrectReward(streak) {
  playCorrectSound(streak);
  bumpQuizCard(comboTierForStreak(streak).tier > 1);
  bumpStreakBox();
  const tier = rewardTier(streak);
  if (tier === "tick") return;
  showRewardToast(streak, tier);
  spawnParticles(tier);
  if (tier === "high") flashScreen();
}

function triggerWrongFeedback() {
  playWrongSound();
  const quiz = $(".quizbox");
  quiz.classList.remove("reward-wrong");
  void quiz.offsetWidth;
  quiz.classList.add("reward-wrong");
}

function bumpQuizCard(strong = false) {
  const quiz = $(".quizbox");
  quiz.classList.remove("reward-success", "reward-strong");
  void quiz.offsetWidth;
  quiz.classList.add(strong ? "reward-strong" : "reward-success");
}

function bumpStreakBox() {
  const box = $("#currentStreakBox");
  if (!box) return;
  box.classList.remove("bump");
  void box.offsetWidth;
  box.classList.add("bump");
}

function showRewardToast(streak, tier) {
  const toast = $("#rewardToast");
  const title = $("#rewardTitle");
  const text = $("#rewardText");
  title.textContent = tier === "high" ? `闯关连击 ${streak}` : `连对 ${streak}`;
  text.textContent = tier === "high"
    ? "强势连胜，进入闯关状态"
    : tier === "mid"
      ? "节奏稳定，保持当前专注"
      : "状态不错，继续推进";
  toast.className = `rewardToast show-${tier}`;
}

function spawnParticles(tier) {
  const source = $("#quizForm .primary") || $(".quizbox");
  const rect = source.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const count = tier === "high" ? 34 : tier === "mid" ? 16 : 8;
  const colors = ["var(--green)", "var(--blue)", "var(--amber)"];
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "rewardParticle";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.background = colors[index % colors.length];
    const spread = tier === "high" ? 190 : tier === "mid" ? 130 : 80;
    const angle = (-140 + Math.random() * 280) * Math.PI / 180;
    const distance = 45 + Math.random() * spread;
    particle.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--y", `${Math.sin(angle) * distance - 42}px`);
    document.body.appendChild(particle);
    window.setTimeout(() => particle.remove(), 850);
  }
}

function flashScreen() {
  const flash = document.createElement("span");
  flash.className = "screenFlash";
  document.body.appendChild(flash);
  window.setTimeout(() => flash.remove(), 760);
}

function checkQuiz(e) {
  e.preventDefault();
  if (state.locked || state.challenge.paused) return;
  const w = currentQuizWord();
  const value = $("#quizInput").value;
  finishQuiz(cleanEn(value) === cleanEn(w.word) ? "pass" : "wrong");
}

function findFamily(term) {
  const q = cleanEn(term);
  if (!q) return families[0];
  return familyByWord.get(q) || null;
}

function findWord(term) {
  const q = cleanEn(term);
  if (!q) return null;
  return allWords.find((word) => cleanEn(word.word) === q) || null;
}

function bookNamesForWord(term) {
  const q = cleanEn(term);
  return wordbooks
    .filter((book) => (book.words || []).some((word) => cleanEn(word) === q))
    .map((book) => book.name.replace(/（待导入）/g, ""));
}

function wordDetailHtml(word) {
  const books = bookNamesForWord(word.word);
  return `
    <div class="wordLookupCard">
      <div class="nodeHead">
        <span class="nodeWord">${escapeHtml(word.word)}</span>
        <span class="pos">${escapeHtml(word.pos || "")}</span>
      </div>
      <div class="meaning">${meaningHtml(word)}</div>
      ${word.phonetic ? `<div class="rel">${escapeHtml(word.phonetic)}</div>` : ""}
      ${books.length ? `<div class="bookTags">${books.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</div>` : ""}
      <p>这个单词已导入词库，但暂未整理到词族树。后续可以为它补充派生词、词根关系和树谱层级。</p>
    </div>
  `;
}

function treeHtml(family, hit, exam = false) {
  const byParent = new Map();
  family.nodes.forEach((n) => {
    const key = n.parent || "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(n);
  });
  const render = (n) => {
    const kids = byParent.get(n.word) || [];
    const isRoot = !n.parent;
    return `<li><div class="node ${cleanEn(n.word) === cleanEn(hit) ? "hit" : ""}">
      <div class="nodeHead"><span class="nodeWord">${exam && !isRoot ? "待填写" : n.word}</span><span class="pos">${n.pos}</span></div>
      <div class="meaning">${n.meaning}</div><div class="rel">${n.rel}${n.level === "extended" ? " · 拓展" : ""}</div>
      ${exam && !isRoot ? `<input class="examInput" data-answer="${n.word}" autocomplete="off">` : ""}
    </div>${kids.length ? `<ul>${kids.map(render).join("")}</ul>` : ""}</li>`;
  };
  return `<ul class="tree">${(byParent.get("__root__") || []).map(render).join("")}</ul>`;
}

function renderTree() {
  $$("[data-tree-mode]").forEach((b) => b.classList.toggle("on", b.dataset.treeMode === state.treeMode));
  $("#browseMode").classList.toggle("active", state.treeMode === "browse");
  $("#examMode").classList.toggle("active", state.treeMode === "exam");
  const term = $("#treeSearch").value;
  const family = findFamily(term);
  if (!family) {
    const word = findWord(term);
    $("#familyName").textContent = word ? "已找到单词" : "未找到词族";
    $("#treeNote").innerHTML = word
      ? `已在词库中找到 <strong>${escapeHtml(word.word)}</strong>，但还没有完整词族树。`
      : `暂未在词族库或词书中找到 <strong>${escapeHtml(term)}</strong>。`;
    $("#treeView").innerHTML = word
      ? wordDetailHtml(word)
      : `<div class="feedback warn">可以试试上方快捷词，或后续把该词加入对应词族数据。</div>`;
    $("#familySelect").innerHTML = families.map((f) => `<option value="${f.id}" ${f.id === state.familyId ? "selected" : ""}>${f.title}</option>`).join("");
    const fallbackExamFamily = families.find((f) => f.id === state.familyId) || families[0];
    $("#examTree").innerHTML = treeHtml(fallbackExamFamily, "", true);
    return;
  }
  $("#familyName").textContent = family.title;
  const hit = family.nodes.find((node) => cleanEn(node.word) === cleanEn(term));
  $("#treeNote").innerHTML = `当前显示 <strong>${family.title}</strong>，共 ${family.nodes.length} 个节点。${hit ? `<br>已高亮：<strong>${hit.word}</strong>` : ""}`;
  $("#treeView").innerHTML = treeHtml(family, term);
  $("#familySelect").innerHTML = families.map((f) => `<option value="${f.id}" ${f.id === state.familyId ? "selected" : ""}>${f.title}</option>`).join("");
  const examFamily = families.find((f) => f.id === state.familyId) || families[0];
  $("#examTree").innerHTML = treeHtml(examFamily, "", true);
}

function renderFamilyDirectory() {
  state.familyDirectoryReady = true;
  const grouped = families.reduce((acc, family) => {
    const root = family.nodes.find((node) => node.parent === null)?.word || family.id;
    const letter = cleanEn(root)[0]?.toUpperCase() || "#";
    if (!acc.has(letter)) acc.set(letter, []);
    acc.get(letter).push({ family, root });
    return acc;
  }, new Map());

  $("#familyDirectory").innerHTML = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, items], index) => `
      <details class="familyGroup" ${index === 0 ? "open" : ""}>
        <summary>${letter}</summary>
        <div class="familyLinks">
          ${items
            .sort((a, b) => a.root.localeCompare(b.root))
            .map(({ family, root }) => `<button type="button" data-family-root="${root}">${family.title}</button>`)
            .join("")}
        </div>
      </details>
    `)
    .join("");

  $$("[data-family-root]").forEach((button) => {
    button.onclick = () => {
      $("#treeSearch").value = button.dataset.familyRoot;
      renderTree();
    };
  });
}

function checkExam(e) {
  e.preventDefault();
  const missing = [];
  let good = 0;
  $$(".examInput").forEach((i) => {
    const ok = cleanEn(i.value) === cleanEn(i.dataset.answer);
    i.classList.toggle("good", ok);
    i.classList.toggle("wrong", !ok);
    ok ? good++ : missing.push(i.dataset.answer);
  });
  const box = $("#examResult");
  box.className = `feedback ${missing.length ? "warn" : "okay"}`;
  box.innerHTML = `<strong>完成度：${good} / ${$$(".examInput").length}</strong>${missing.length ? `<br>还需要补全：${missing.join("；")}` : "<br>整棵词族树已补全。"}`;
}

function bind() {
  $("#themeToggle").onclick = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("wtTheme", state.theme);
    applyChromeState();
  };
  $("#soundToggle").onclick = () => {
    state.soundOn = !state.soundOn;
    localStorage.setItem("wtSoundOn", String(state.soundOn));
    applyChromeState();
    if (state.soundOn) playCorrectSound(Math.max(1, state.challenge.currentStreak));
  };
  $("#speechToggle").onclick = () => {
    state.speechOn = !state.speechOn;
    localStorage.setItem("wtSpeechOn", String(state.speechOn));
    applyChromeState();
    if (state.speechOn) speakWord(currentVisibleWord()?.word, true);
  };
  $("#repeatSpeech").onclick = () => {
    speakWord(currentVisibleWord()?.word, true);
  };
  $("#sideToggle").onclick = () => {
    state.sideCollapsed = !state.sideCollapsed;
    localStorage.setItem("wtSideCollapsed", String(state.sideCollapsed));
    applyChromeState();
  };
  $$(".nav").forEach((b) => b.onclick = () => {
    state.view = b.dataset.view;
    if (state.view !== "quiz") stopQuiz();
    renderShell();
    if (state.view === "tree") {
      loadGeneratedFamilies(() => {
        if (!state.familyDirectoryReady) renderFamilyDirectory();
        renderTree();
      });
    }
    if (state.view === "quiz") startQuiz();
  });
  $$("[data-card-dir]").forEach((b) => b.onclick = () => {
    state.cardDir = b.dataset.cardDir;
    state.revealed = false;
    renderCard();
  });
  $("#wordbookSelect").onchange = (event) => setWordbook(event.target.value);
  $("#quizWordbookSelect").onchange = (event) => setWordbook(event.target.value);
  $("#cardPickMode").onchange = (event) => {
    state.cardPickMode = event.target.value;
    localStorage.setItem("wtCardPickMode", state.cardPickMode);
    buildCardSession();
  };
  $("#cardPickCount").oninput = (event) => {
    state.cardPickCount = event.target.value;
    localStorage.setItem("wtCardPickCount", state.cardPickCount);
  };
  $("#buildCardSession").onclick = buildCardSession;
  $("#openCardPicker").onclick = () => {
    $("#cardPicker").classList.remove("hide");
    renderPicker("card");
  };
  $("#closeCardPicker").onclick = () => $("#cardPicker").classList.add("hide");
  $("#cardPickerSearch").oninput = () => renderPicker("card");
  $("#applyCardSelection").onclick = () => {
    state.cardPickMode = "custom";
    localStorage.setItem("wtCardPickMode", "custom");
    $("#cardPickMode").value = "custom";
    buildCardSession();
  };
  $("#card").onclick = () => {
    state.revealed = true;
    renderCard();
  };
  $("#card").onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      state.revealed = true;
      renderCard();
    }
  };
  $("#known").onclick = () => markCard("known");
  $("#unknown").onclick = () => markCard("unknown");
  $("#resetStats").onclick = () => {
    state.stats = { ...stat0 };
    saveStats();
    renderShell();
  };
  $("#challengeSize").value = state.challenge.size;
  $("#quizPickMode").value = state.quizPickMode;
  $("#customChallengeSize").value = state.challenge.customSize;
  $("#quizPickMode").onchange = (event) => {
    state.quizPickMode = event.target.value;
    localStorage.setItem("wtQuizPickMode", state.quizPickMode);
    resetChallenge();
    if (state.view === "quiz") startQuiz();
  };
  $("#challengeSize").onchange = (event) => {
    state.challenge.size = event.target.value;
    state.challenge.customSize = "";
    $("#customChallengeSize").value = "";
    localStorage.setItem("wtChallengeSize", state.challenge.size);
    localStorage.setItem("wtCustomChallengeSize", "");
    resetChallenge();
    if (state.view === "quiz") startQuiz();
  };
  $("#customChallengeSize").oninput = (event) => {
    state.challenge.customSize = event.target.value;
    localStorage.setItem("wtCustomChallengeSize", state.challenge.customSize);
    resetChallenge();
    if (state.view === "quiz") startQuiz();
  };
  $("#startChallenge").onclick = () => {
    resetChallenge();
    startQuiz();
  };
  if ($("#abortChallenge")) $("#abortChallenge").onclick = abortChallenge;
  $("#pauseChallenge").onclick = togglePauseChallenge;
  $("#finishChallenge").onclick = finishChallengeEarly;
  $("#openQuizPicker").onclick = () => {
    $("#quizPicker").classList.remove("hide");
    renderPicker("quiz");
  };
  $("#closeQuizPicker").onclick = () => $("#quizPicker").classList.add("hide");
  $("#quizPickerSearch").oninput = () => renderPicker("quiz");
  $("#applyQuizSelection").onclick = () => {
    state.quizPickMode = "custom";
    localStorage.setItem("wtQuizPickMode", "custom");
    $("#quizPickMode").value = "custom";
    resetChallenge();
    if (state.view === "quiz") startQuiz();
  };
  $("#nextQuiz").onclick = () => {
    const words = sessionWords();
    state.quizIndex = (state.quizIndex + 1) % words.length;
    startQuiz();
  };
  $("#quizForm").onsubmit = checkQuiz;
  $("#quizInput").oninput = refreshLetterSlots;
  $("#quizInput").onkeydown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      $("#quizForm").requestSubmit();
    }
  };
  $$("[data-tree-mode]").forEach((b) => b.onclick = () => {
    state.treeMode = b.dataset.treeMode;
    renderTree();
  });
  $("#treeSearch").oninput = renderTree;
  $("#chips").innerHTML = quickWords.map((w) => `<button>${w}</button>`).join("");
  $$("#chips button").forEach((b) => b.onclick = () => {
    $("#treeSearch").value = b.textContent;
    renderTree();
  });
  $("#familySelect").onchange = (e) => {
    state.familyId = e.target.value;
    renderTree();
  };
  $("#examForm").onsubmit = checkExam;
  $("#resetExam").onclick = renderTree;
  $("#recordSearch").oninput = () => renderReports();
  $("#recordWordbookSelect").onchange = (event) => {
    state.recordWordbookId = event.target.value;
    localStorage.setItem("wtRecordWordbook", state.recordWordbookId);
    renderMemoryLookup();
  };
  $("#memoryStatusSelect").onchange = (event) => {
    state.memoryStatusFilter = event.target.value;
    localStorage.setItem("wtMemoryStatusFilter", state.memoryStatusFilter);
    renderMemoryLookup();
  };
  $("#memorySearch").oninput = renderMemoryLookup;
  $("#clearReports").onclick = () => {
    if (!window.confirm("确认清空本地练习记录？")) return;
    state.reports = [];
    saveReports();
    renderReports();
  };
}

bind();
applyChromeState();
renderWordbookSelects();
renderShell();
buildCardSession();
renderCard();
resetChallenge();
renderPickers();
renderTree();
renderReports();
