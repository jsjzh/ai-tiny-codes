export const THEME_STORAGE_KEY = "ai-tiny-codes:calendar-theme";

export const THEME_IDS = [
  "blueprint",
  "warm",
  "night",
  "botanical",
  "swiss",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ChartTheme = {
  ink: string;
  muted: string;
  rule: string;
  primary: string;
  primarySoft: string;
  paper: string;
  sheet: string;
  avg7: string;
  avg30: string;
  changeRate: string;
  isDark: boolean;
};

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  english: string;
  description: string;
  swatches: [string, string, string];
  chart: ChartTheme;
};

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    id: "blueprint",
    label: "制图台",
    english: "Blueprint",
    description: "冷白纸 · 靛蓝 · 信号橙",
    swatches: ["#f7f8fa", "#1d3a8a", "#ff5a1f"],
    chart: {
      ink: "#101828",
      muted: "#667085",
      rule: "#d5dae3",
      primary: "#1d3a8a",
      primarySoft: "#eef1f9",
      paper: "#f7f8fa",
      sheet: "#ffffff",
      avg7: "#0f766e",
      avg30: "#b45309",
      changeRate: "#c2410c",
      isDark: false,
    },
  },
  {
    id: "warm",
    label: "暖纸编辑部",
    english: "Warm Editorial",
    description: "燕麦纸 · 陶土 · 苔藓绿",
    swatches: ["#f3eee5", "#8a3f2a", "#5b7048"],
    chart: {
      ink: "#2b2620",
      muted: "#756a5d",
      rule: "#d7cdbd",
      primary: "#8a3f2a",
      primarySoft: "#f2e4dc",
      paper: "#f3eee5",
      sheet: "#fffaf2",
      avg7: "#5b7048",
      avg30: "#b07d2b",
      changeRate: "#7c3f5d",
      isDark: false,
    },
  },
  {
    id: "night",
    label: "夜航仪表盘",
    english: "Night Ops",
    description: "近黑 · 石墨 · 电光蓝",
    swatches: ["#0e1116", "#2563eb", "#f0b429"],
    chart: {
      ink: "#e6edf3",
      muted: "#8b949e",
      rule: "#30363d",
      primary: "#2563eb",
      primarySoft: "#1e2a3a",
      paper: "#0e1116",
      sheet: "#161b22",
      avg7: "#2dd4bf",
      avg30: "#f0b429",
      changeRate: "#c084fc",
      isDark: true,
    },
  },
  {
    id: "botanical",
    label: "苔原笔记",
    english: "Botanical",
    description: "鼠尾草 · 奶油白 · 黏土",
    swatches: ["#eef2e8", "#3f6247", "#a16207"],
    chart: {
      ink: "#24352a",
      muted: "#5f6e63",
      rule: "#cbd5c5",
      primary: "#3f6247",
      primarySoft: "#e0eade",
      paper: "#eef2e8",
      sheet: "#fbfcf7",
      avg7: "#2f6f5e",
      avg30: "#a16207",
      changeRate: "#7c5cbf",
      isDark: false,
    },
  },
  {
    id: "swiss",
    label: "瑞士信号",
    english: "Swiss Signal",
    description: "纯白 · 黑 · 红",
    swatches: ["#ffffff", "#d7192d", "#1d4ed8"],
    chart: {
      ink: "#0a0a0a",
      muted: "#525252",
      rule: "#cfcfcf",
      primary: "#d7192d",
      primarySoft: "#fbe7e9",
      paper: "#ffffff",
      sheet: "#ffffff",
      avg7: "#0f766e",
      avg30: "#d97706",
      changeRate: "#7c3aed",
      isDark: false,
    },
  },
];

export const THEME_MAP = new Map(
  THEME_DEFINITIONS.map((theme) => [theme.id, theme]),
);

export const DEFAULT_THEME: ThemeId = "blueprint";
export const DEFAULT_CHART_THEME: ChartTheme = THEME_DEFINITIONS[0].chart;

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as readonly string[]).includes(value)
  );
}

export function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "night" ? "dark" : "light";

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", getChartTheme(theme).paper);
}

export function getChartTheme(theme: ThemeId): ChartTheme {
  return (THEME_MAP.get(theme) ?? THEME_MAP.get(DEFAULT_THEME))!.chart;
}

function parseHexColor(color: string): [number, number, number] | null {
  const value = color.trim();
  const short = value.match(/^#([0-9a-f]{3})$/i);

  if (short) {
    return [
      Number.parseInt(`${short[1][0]}${short[1][0]}`, 16),
      Number.parseInt(`${short[1][1]}${short[1][1]}`, 16),
      Number.parseInt(`${short[1][2]}${short[1][2]}`, 16),
    ];
  }

  const full = value.match(/^#([0-9a-f]{6})$/i);

  if (!full) {
    return null;
  }

  return [
    Number.parseInt(full[1].slice(0, 2), 16),
    Number.parseInt(full[1].slice(2, 4), 16),
    Number.parseInt(full[1].slice(4, 6), 16),
  ];
}

export function resolveChartColor(
  theme: ThemeId,
  eventColor: string,
): string {
  if (!getChartTheme(theme).isDark) {
    return eventColor;
  }

  const rgb = parseHexColor(eventColor);

  if (!rgb) {
    return eventColor;
  }

  const mix = (value: number) =>
    Math.round(value + (255 - value) * 0.38)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(rgb[0])}${mix(rgb[1])}${mix(rgb[2])}`;
}

export function getMetricColor(
  theme: ChartTheme,
  metric: "daily" | "avg7" | "avg30" | "changeRate",
  eventColor: string,
): string {
  if (metric === "avg7") {
    return theme.avg7;
  }

  if (metric === "avg30") {
    return theme.avg30;
  }

  if (metric === "changeRate") {
    return theme.changeRate;
  }

  return eventColor;
}
