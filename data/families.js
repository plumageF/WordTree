window.WORDTREE_DATA = window.WORDTREE_DATA || {};

window.WORDTREE_DATA.families = [
  {
    id: "act",
    title: "act 词族",
    nodes: [
      { word: "act", pos: "v./n.", meaning: "行动；表演；行为", parent: null, rel: "基础词", level: "core" },
      { word: "action", pos: "n.", meaning: "行动；行为", parent: "act", rel: "act + ion", level: "core" },
      { word: "active", pos: "adj.", meaning: "积极的；活跃的", parent: "act", rel: "act + ive", level: "core" },
      { word: "activity", pos: "n.", meaning: "活动；活跃", parent: "active", rel: "active + ity", level: "core" },
      { word: "actor", pos: "n.", meaning: "演员；行动者", parent: "act", rel: "act + or", level: "core" },
      { word: "activate", pos: "v.", meaning: "激活；启动", parent: "active", rel: "active + ate", level: "extended" },
      { word: "activation", pos: "n.", meaning: "激活；启动", parent: "activate", rel: "activate + ion", level: "extended" },
      { word: "react", pos: "v.", meaning: "反应；回应", parent: "act", rel: "re + act", level: "core" },
      { word: "reaction", pos: "n.", meaning: "反应；回应", parent: "react", rel: "react + ion", level: "core" },
      { word: "interactive", pos: "adj.", meaning: "互动的；交互的", parent: "active", rel: "inter + active", level: "extended" }
    ]
  },
  {
    id: "form",
    title: "form 词族",
    nodes: [
      { word: "form", pos: "n./v.", meaning: "形式；形成", parent: null, rel: "基础词", level: "core" },
      { word: "formal", pos: "adj.", meaning: "正式的；形式上的", parent: "form", rel: "form + al", level: "core" },
      { word: "inform", pos: "v.", meaning: "通知；告知", parent: "form", rel: "in + form", level: "core" },
      { word: "information", pos: "n.", meaning: "信息；资料", parent: "inform", rel: "inform + ation", level: "core" },
      { word: "formation", pos: "n.", meaning: "形成；构成", parent: "form", rel: "form + ation", level: "core" },
      { word: "reform", pos: "v./n.", meaning: "改革；改良", parent: "form", rel: "re + form", level: "core" },
      { word: "transform", pos: "v.", meaning: "转变；改造", parent: "form", rel: "trans + form", level: "core" },
      { word: "transformation", pos: "n.", meaning: "转变；改造", parent: "transform", rel: "transform + ation", level: "extended" },
      { word: "deform", pos: "v.", meaning: "使变形", parent: "form", rel: "de + form", level: "extended" }
    ]
  },
  {
    id: "port",
    title: "port 词族",
    nodes: [
      { word: "port", pos: "n.", meaning: "港口；端口", parent: null, rel: "基础词", level: "core" },
      { word: "portable", pos: "adj.", meaning: "便携的；可携带的", parent: "port", rel: "port + able", level: "core" },
      { word: "porter", pos: "n.", meaning: "搬运工", parent: "port", rel: "port + er", level: "extended" },
      { word: "import", pos: "v./n.", meaning: "进口；输入", parent: "port", rel: "im + port", level: "core" },
      { word: "export", pos: "v./n.", meaning: "出口；输出", parent: "port", rel: "ex + port", level: "core" },
      { word: "transport", pos: "v./n.", meaning: "运输；交通", parent: "port", rel: "trans + port", level: "core" },
      { word: "transportation", pos: "n.", meaning: "运输；交通系统", parent: "transport", rel: "transport + ation", level: "extended" },
      { word: "support", pos: "v./n.", meaning: "支持；支撑", parent: "port", rel: "sup + port", level: "core" }
    ]
  },
  {
    id: "dict",
    title: "dict 词族",
    nodes: [
      { word: "dict", pos: "root", meaning: "说；断言", parent: null, rel: "词根", level: "core" },
      { word: "dictate", pos: "v.", meaning: "口述；命令", parent: "dict", rel: "dict + ate", level: "core" },
      { word: "dictation", pos: "n.", meaning: "听写；口述", parent: "dictate", rel: "dictate + ion", level: "extended" },
      { word: "predict", pos: "v.", meaning: "预测；预言", parent: "dict", rel: "pre + dict", level: "core" },
      { word: "prediction", pos: "n.", meaning: "预测；预言", parent: "predict", rel: "predict + ion", level: "core" },
      { word: "contradict", pos: "v.", meaning: "反驳；矛盾", parent: "dict", rel: "contra + dict", level: "core" },
      { word: "indicate", pos: "v.", meaning: "表明；指出", parent: "dict", rel: "in + dic + ate", level: "core" },
      { word: "dictionary", pos: "n.", meaning: "词典；字典", parent: "dict", rel: "dict + ionary", level: "core" }
    ]
  },
  {
    id: "duct",
    title: "duct 词族",
    nodes: [
      { word: "duct", pos: "root", meaning: "引导；带领", parent: null, rel: "词根", level: "core" },
      { word: "conduct", pos: "v./n.", meaning: "实施；引导；行为", parent: "duct", rel: "con + duct", level: "core" },
      { word: "conductor", pos: "n.", meaning: "指挥；导体；售票员", parent: "conduct", rel: "conduct + or", level: "extended" },
      { word: "introduce", pos: "v.", meaning: "介绍；引入", parent: "duct", rel: "intro + duce", level: "core" },
      { word: "introduction", pos: "n.", meaning: "介绍；引言", parent: "introduce", rel: "introduce + tion", level: "core" },
      { word: "produce", pos: "v./n.", meaning: "生产；产品", parent: "duct", rel: "pro + duce", level: "core" },
      { word: "production", pos: "n.", meaning: "生产；产量", parent: "produce", rel: "produce + tion", level: "core" },
      { word: "reduce", pos: "v.", meaning: "减少；降低", parent: "duct", rel: "re + duce", level: "core" },
      { word: "reduction", pos: "n.", meaning: "减少；降低", parent: "reduce", rel: "reduce + tion", level: "extended" }
    ]
  },
  {
    id: "struct",
    title: "struct 词族",
    nodes: [
      { word: "struct", pos: "root", meaning: "建造；构造", parent: null, rel: "词根", level: "core" },
      { word: "structure", pos: "n./v.", meaning: "结构；构造", parent: "struct", rel: "struct + ure", level: "core" },
      { word: "construct", pos: "v.", meaning: "建造；构建", parent: "struct", rel: "con + struct", level: "core" },
      { word: "construction", pos: "n.", meaning: "建造；建筑", parent: "construct", rel: "construct + ion", level: "core" },
      { word: "instruct", pos: "v.", meaning: "指导；教授", parent: "struct", rel: "in + struct", level: "core" },
      { word: "instruction", pos: "n.", meaning: "指导；说明", parent: "instruct", rel: "instruct + ion", level: "core" },
      { word: "destruct", pos: "v.", meaning: "破坏；毁坏", parent: "struct", rel: "de + struct", level: "extended" },
      { word: "destruction", pos: "n.", meaning: "破坏；毁灭", parent: "destruct", rel: "destruct + ion", level: "extended" }
    ]
  },
  {
    id: "spond",
    title: "spond 词族",
    nodes: [
      { word: "spond", pos: "root", meaning: "回答；承诺", parent: null, rel: "词根", level: "core" },
      { word: "respond", pos: "v.", meaning: "回答；回应", parent: "spond", rel: "re + spond", level: "core" },
      { word: "response", pos: "n.", meaning: "回答；回应", parent: "respond", rel: "respond + se", level: "core" },
      { word: "responsible", pos: "adj.", meaning: "负责的；可靠的", parent: "response", rel: "response + ible", level: "core" },
      { word: "responsibility", pos: "n.", meaning: "责任；职责", parent: "responsible", rel: "responsible + ity", level: "core" },
      { word: "correspond", pos: "v.", meaning: "相一致；通信", parent: "spond", rel: "cor + respond", level: "extended" },
      { word: "correspondence", pos: "n.", meaning: "通信；对应", parent: "correspond", rel: "correspond + ence", level: "extended" }
    ]
  },
  {
    id: "fin",
    title: "fin 词族",
    nodes: [
      { word: "fin", pos: "root", meaning: "边界；结束", parent: null, rel: "词根", level: "core" },
      { word: "final", pos: "adj./n.", meaning: "最终的；决赛", parent: "fin", rel: "fin + al", level: "core" },
      { word: "finally", pos: "adv.", meaning: "最终；终于", parent: "final", rel: "final + ly", level: "core" },
      { word: "define", pos: "v.", meaning: "定义；限定", parent: "fin", rel: "de + fine", level: "core" },
      { word: "definition", pos: "n.", meaning: "定义；释义", parent: "define", rel: "define + ition", level: "core" },
      { word: "definite", pos: "adj.", meaning: "明确的；确定的", parent: "define", rel: "de + finite", level: "core" },
      { word: "infinite", pos: "adj.", meaning: "无限的", parent: "fin", rel: "in + finite", level: "extended" }
    ]
  },
  {
    id: "vis",
    title: "vis / vid 词族",
    nodes: [
      { word: "vis", pos: "root", meaning: "看；见", parent: null, rel: "词根", level: "core" },
      { word: "visible", pos: "adj.", meaning: "可见的；明显的", parent: "vis", rel: "vis + ible", level: "core" },
      { word: "vision", pos: "n.", meaning: "视力；愿景", parent: "vis", rel: "vis + ion", level: "core" },
      { word: "visit", pos: "v./n.", meaning: "参观；访问", parent: "vis", rel: "vis + it", level: "core" },
      { word: "revise", pos: "v.", meaning: "修改；复习", parent: "vis", rel: "re + vise", level: "core" },
      { word: "revision", pos: "n.", meaning: "修改；复习", parent: "revise", rel: "revise + ion", level: "extended" },
      { word: "evidence", pos: "n.", meaning: "证据；根据", parent: "vis", rel: "e + vid + ence", level: "core" },
      { word: "video", pos: "n.", meaning: "视频；录像", parent: "vis", rel: "vid + eo", level: "core" }
    ]
  },
  {
    id: "ceed",
    title: "ceed / cess 词族",
    nodes: [
      { word: "ceed", pos: "root", meaning: "走；前进", parent: null, rel: "词根", level: "core" },
      { word: "proceed", pos: "v.", meaning: "继续进行；前进", parent: "ceed", rel: "pro + ceed", level: "core" },
      { word: "process", pos: "n./v.", meaning: "过程；处理", parent: "ceed", rel: "pro + cess", level: "core" },
      { word: "success", pos: "n.", meaning: "成功", parent: "ceed", rel: "suc + cess", level: "core" },
      { word: "succeed", pos: "v.", meaning: "成功；接替", parent: "success", rel: "suc + ceed", level: "core" },
      { word: "exceed", pos: "v.", meaning: "超过；超出", parent: "ceed", rel: "ex + ceed", level: "core" },
      { word: "access", pos: "n./v.", meaning: "通道；进入", parent: "ceed", rel: "ac + cess", level: "core" }
    ]
  },
  {
    id: "ceive",
    title: "ceive / cept 词族",
    nodes: [
      { word: "ceive", pos: "root", meaning: "拿；取；接受", parent: null, rel: "词根", level: "core" },
      { word: "receive", pos: "v.", meaning: "收到；接待", parent: "ceive", rel: "re + ceive", level: "core" },
      { word: "reception", pos: "n.", meaning: "接待；接收", parent: "receive", rel: "re + cept + ion", level: "core" },
      { word: "perceive", pos: "v.", meaning: "察觉；理解", parent: "ceive", rel: "per + ceive", level: "core" },
      { word: "perception", pos: "n.", meaning: "感知；看法", parent: "perceive", rel: "per + cept + ion", level: "core" },
      { word: "conceive", pos: "v.", meaning: "构想；怀孕", parent: "ceive", rel: "con + ceive", level: "extended" },
      { word: "concept", pos: "n.", meaning: "概念；观念", parent: "conceive", rel: "con + cept", level: "core" }
    ]
  },
  {
    id: "press",
    title: "press 词族",
    nodes: [
      { word: "press", pos: "v./n.", meaning: "按压；新闻界", parent: null, rel: "基础词", level: "core" },
      { word: "pressure", pos: "n.", meaning: "压力；压迫", parent: "press", rel: "press + ure", level: "core" },
      { word: "express", pos: "v./adj.", meaning: "表达；快速的", parent: "press", rel: "ex + press", level: "core" },
      { word: "expression", pos: "n.", meaning: "表达；表情", parent: "express", rel: "express + ion", level: "core" },
      { word: "impress", pos: "v.", meaning: "给人印象；使钦佩", parent: "press", rel: "im + press", level: "core" },
      { word: "impression", pos: "n.", meaning: "印象；感想", parent: "impress", rel: "impress + ion", level: "core" },
      { word: "depress", pos: "v.", meaning: "使沮丧；压低", parent: "press", rel: "de + press", level: "extended" },
      { word: "depression", pos: "n.", meaning: "沮丧；萧条", parent: "depress", rel: "depress + ion", level: "extended" }
    ]
  }
];

window.WORDTREE_DATA.quickWords = [
  "reaction",
  "activate",
  "information",
  "transform",
  "portable",
  "support",
  "predict",
  "construction",
  "visible",
  "process",
  "receive",
  "expression"
];
