const BRAND_GLOW = "radial-gradient(ellipse at 0% 0%, rgba(116, 84, 200, 0.18) 0%, rgba(116, 84, 200, 0) 48%), radial-gradient(ellipse at 100% 0%, rgba(215, 196, 242, 0.36) 0%, rgba(215, 196, 242, 0) 42%)";

export const CAMP = {
  nt: { id: "nt", name: "分析家", color: "#805FBE", soft: "#F4EFFA" },
  nf: { id: "nf", name: "外交家", color: "#3B9C80", soft: "#E8F6F1" },
  sj: { id: "sj", name: "守护者", color: "#4F91CA", soft: "#EAF4FB" },
  sp: { id: "sp", name: "探险家", color: "#CA8C36", soft: "#FBF5EA" },
};

export const ELEMENTS = {
  fire: { id: "fire", name: "火", color: "#E57C68", soft: "#FDEEEC" },
  earth: { id: "earth", name: "土", color: "#78A78A", soft: "#EEF6F1" },
  air: { id: "air", name: "风", color: "#6AADD3", soft: "#EAF5FB" },
  water: { id: "water", name: "水", color: "#8B82D1", soft: "#F1F0FA" },
};

const ELEMENT_KEY = { "火": "fire", "土": "earth", "风": "air", "水": "water" };

export function campId(typeCode) {
  const code = String(typeCode || "").toUpperCase();
  if (code[1] === "N" && code[2] === "T") return "nt";
  if (code[1] === "N" && code[2] === "F") return "nf";
  if (code[1] === "S" && code[3] === "J") return "sj";
  if (code[1] === "S" && code[3] === "P") return "sp";
  return "nt";
}

export function elementKey(name) {
  return ELEMENT_KEY[name] || "water";
}

export const THEMES = [
  {
    id: "cream",
    name: "月光紫",
    bg: "#F5F0FC",
    ink: "#352942",
    muted: "#61586C",
    card: "#FFFFFF",
    line: "#D4C4F3",
    accent: "#7454C8",
    accentHover: "#6448AC",
    accentSoft: "#E9DDFC",
    gold: "#D4B56E",
    decor: "#D7C4F2",
    bar: "rgba(245, 240, 252, 0.96)",
    orb: "#E9DDFC",
    shadow: "0 10px 24px rgba(116, 84, 200, 0.28)",
    pageImage: BRAND_GLOW,
    paper: "#F5F0FC",
    paperBottom: "#EEE4FC",
    cardAccent: "#7454C8",
    cardInk: "#352942",
    cardMuted: "#61586C",
    cardGold: "#D4B56E",
    cardLine: "#D4C4F3",
    cardFrame: "#BFABEA",
    cardSoft: "#E9DDFC",
    cardPanel: "#F6F1FE",
  },
  {
    id: "sky",
    name: "晴空蓝",
    bg: "#F1F7FF",
    ink: "#263D58",
    muted: "#56687D",
    card: "#FFFFFF",
    line: "#BDD7F2",
    accent: "#2D70B8",
    accentHover: "#27609E",
    accentSoft: "#DDEEFF",
    gold: "#D2B56A",
    decor: "#C5DFF8",
    bar: "rgba(241, 247, 255, 0.96)",
    orb: "#DDEEFF",
    shadow: "0 10px 24px rgba(45, 112, 184, 0.22)",
    pageImage: "radial-gradient(ellipse at 100% 0%, #C5DFF8 0%, rgba(197, 223, 248, 0) 55%)",
    paper: "#F1F7FF",
    paperBottom: "#E5F1FF",
    cardAccent: "#2D70B8",
    cardInk: "#263D58",
    cardMuted: "#56687D",
    cardGold: "#D2B56A",
    cardLine: "#BDD7F2",
    cardFrame: "#9DC0E5",
    cardSoft: "#DDEEFF",
    cardPanel: "#F1F8FF",
  },
  {
    id: "peach",
    name: "蜜桃粉",
    bg: "#FFF5F7",
    ink: "#50303D",
    muted: "#765E68",
    card: "#FFFFFF",
    line: "#EDC9D7",
    accent: "#AC557A",
    accentHover: "#944969",
    accentSoft: "#FBE2EB",
    gold: "#D0A878",
    decor: "#F6D0DC",
    bar: "rgba(255, 245, 247, 0.96)",
    orb: "#FBE2EB",
    shadow: "0 10px 24px rgba(172, 85, 122, 0.24)",
    pageImage: "radial-gradient(ellipse at 100% 0%, #F6D0DC 0%, rgba(246, 208, 220, 0) 55%)",
    paper: "#FFF5F7",
    paperBottom: "#FDE9F0",
    cardAccent: "#AC557A",
    cardInk: "#50303D",
    cardMuted: "#765E68",
    cardGold: "#D0A878",
    cardLine: "#EDC9D7",
    cardFrame: "#DFAFC3",
    cardSoft: "#FBE2EB",
    cardPanel: "#FDF3F7",
  },
  {
    id: "celadon",
    name: "森林绿",
    bg: "#F0FAF6",
    ink: "#2C473D",
    muted: "#5A6F68",
    card: "#FFFFFF",
    line: "#BCDBD0",
    accent: "#2D806F",
    accentHover: "#276E5F",
    accentSoft: "#DCEFE5",
    gold: "#C9B67A",
    decor: "#C9E6DA",
    bar: "rgba(240, 250, 246, 0.96)",
    orb: "#DCEFE5",
    shadow: "0 10px 24px rgba(45, 128, 111, 0.22)",
    pageImage: "radial-gradient(ellipse at 100% 0%, #C9E6DA 0%, rgba(201, 230, 218, 0) 55%)",
    paper: "#F0FAF6",
    paperBottom: "#E4F3EB",
    cardAccent: "#2D806F",
    cardInk: "#2C473D",
    cardMuted: "#5A6F68",
    cardGold: "#C9B67A",
    cardLine: "#BCDBD0",
    cardFrame: "#9DC7BB",
    cardSoft: "#DCEFE5",
    cardPanel: "#F0F8F4",
  },
];

let currentId = "cream";

export function currentTheme() {
  for (let i = 0; i < THEMES.length; i += 1) {
    if (THEMES[i].id === currentId) return THEMES[i];
  }
  return THEMES[0];
}

export function applyTheme(id) {
  let next = THEMES[0];
  for (let i = 0; i < THEMES.length; i += 1) {
    if (THEMES[i].id === id) next = THEMES[i];
  }
  currentId = next.id;
  if (typeof document === "undefined") return next;
  const root = document.documentElement;
  root.dataset.theme = next.id;
  const vars = {
    "--bg": next.bg,
    "--ink": next.ink,
    "--muted": next.muted,
    "--card": next.card,
    "--line": next.line,
    "--accent": next.accent,
    "--accent-hover": next.accentHover,
    "--accent-soft": next.accentSoft,
    "--gold": next.gold,
    "--peach": next.decor,
    "--decor-soft": next.accentSoft,
    "--bar": next.bar,
    "--orb": next.orb,
    "--shadow-float": next.shadow,
    "--page-image": next.pageImage,
  };
  const keys = Object.keys(vars);
  for (let i = 0; i < keys.length; i += 1) root.style.setProperty(keys[i], vars[keys[i]]);
  return next;
}
