/**
 * Тема. Все цвета интерфейса приходят из themeParams Telegram — в CSS нет
 * ни одного захардкоженного цвета, кроме резервной палитры для демо-режима.
 *
 * Тонкость, из-за которой нельзя просто взять bg_color: Telegram различает фон экрана
 * (secondary_bg_color) и фон блока-секции (section_bg_color). В светлой теме секция белая
 * на сером экране, в тёмной наоборот. Поэтому «карточку» мы не угадываем, а берём из темы,
 * и только если тема их не различает — выводим сами, подмешивая цвет текста.
 */

/**
 * Резервные палитры: демо-режим в браузере и старые клиенты, которые прислали не все ключи.
 * Взяты за основу цвета Telegram, но подсказки, акцент и кнопка затемнены до контраста 4.5:1 —
 * штатные #8e8e93 и #2481cc дают 3.26 и 4.13, а демо открывают по ссылке из портфолио,
 * и читаемым оно должно быть у всех. Внутри мессенджера эти значения не применяются:
 * там побеждает то, что пришло в themeParams.
 */
export const FALLBACK = {
  light: {
    bg_color: "#ffffff",
    secondary_bg_color: "#efeff4",
    section_bg_color: "#ffffff",
    header_bg_color: "#ffffff",
    bottom_bar_bg_color: "#f0f0f0",
    text_color: "#000000",
    hint_color: "#68686d",
    subtitle_text_color: "#68686d",
    link_color: "#1769ac",
    accent_text_color: "#1769ac",
    button_color: "#1769ac",
    button_text_color: "#ffffff",
    destructive_text_color: "#d8341f",
    section_separator_color: "#e0e0e6",
  },
  dark: {
    bg_color: "#17212b",
    secondary_bg_color: "#232e3c",
    section_bg_color: "#17212b",
    header_bg_color: "#17212b",
    bottom_bar_bg_color: "#17212b",
    text_color: "#ffffff",
    hint_color: "#8798ab",
    subtitle_text_color: "#8798ab",
    link_color: "#6ab3f3",
    accent_text_color: "#6ab3f3",
    button_color: "#42759f",
    button_text_color: "#ffffff",
    destructive_text_color: "#ff595a",
    section_separator_color: "#101921",
  },
};

const KEYS = Object.keys(FALLBACK.light);

function parseHex(value) {
  if (typeof value !== "string") return null;
  const hex = value.trim().replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return "#" + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
}

function normalize(color) {
  const rgb = parseHex(color);
  return rgb ? toHex(rgb) : String(color).toLowerCase();
}

function mix(a, b, t) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  return toHex(ca.map((c, i) => c + (cb[i] - c) * t));
}

/** Относительная яркость по WCAG — нужна, чтобы понять, светлая тема или тёмная */
export function luminance(color) {
  const rgb = parseHex(color);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Собирает полный набор цветов: то, что дал Telegram, поверх резервной палитры.
 * @param {object} params themeParams
 * @param {"light"|"dark"} scheme
 */
export function resolveTheme(params, scheme) {
  const base = FALLBACK[scheme === "dark" ? "dark" : "light"];
  const theme = {};
  for (const key of KEYS) {
    theme[key] = parseHex(params?.[key]) ? params[key] : base[key];
  }

  // Экран и секция. Если тема их не различает — разводим сами, иначе блоки сольются с фоном.
  const page = theme.secondary_bg_color;
  let card = theme.section_bg_color;
  if (normalize(page) === normalize(card)) {
    card = mix(page, theme.text_color, scheme === "dark" ? 0.07 : 0.045);
  }

  const accent = theme.accent_text_color || theme.link_color || theme.button_color;

  return {
    ...theme,
    scheme,
    page,
    card,
    // Подложка выбранного элемента: акцент темы, разведённый фоном секции.
    // В светлой теме подмешиваем меньше — на более плотной заливке контраст
    // акцентной подписи поверх неё падал ниже 4.5:1
    selected: mix(card, theme.button_color, scheme === "dark" ? 0.22 : 0.12),
    selectedStrong: mix(card, theme.button_color, scheme === "dark" ? 0.34 : 0.16),
    accent,
    separator: theme.section_separator_color,
    // Перечёркивание занятого слота: заметно, но не кричит
    busy: mix(card, theme.destructive_text_color, scheme === "dark" ? 0.45 : 0.4),
    skeleton: mix(card, theme.text_color, scheme === "dark" ? 0.1 : 0.07),
  };
}

/** Записывает тему в CSS-переменные на <html> */
export function applyTheme(theme) {
  const root = document.documentElement;
  for (const key of KEYS) root.style.setProperty(`--tg-theme-${key.replace(/_/g, "-")}`, theme[key]);
  root.style.setProperty("--sp-page", theme.page);
  root.style.setProperty("--sp-card", theme.card);
  root.style.setProperty("--sp-selected", theme.selected);
  root.style.setProperty("--sp-selected-strong", theme.selectedStrong);
  root.style.setProperty("--sp-accent", theme.accent);
  root.style.setProperty("--sp-separator", theme.separator);
  root.style.setProperty("--sp-busy", theme.busy);
  root.style.setProperty("--sp-skeleton", theme.skeleton);
  root.style.colorScheme = theme.scheme;
  root.dataset.scheme = theme.scheme;
  document.body.style.backgroundColor = theme.page;
}
