/**
 * Единственная точка соприкосновения с Telegram.WebApp.
 *
 * Внутри мессенджера работают настоящие MainButton, BackButton, HapticFeedback и showConfirm.
 * Если initData пустой (приложение открыли в обычном браузере по ссылке из портфолио) —
 * ровно тот же интерфейс эмулируется своими элементами в стиле Telegram, поэтому весь
 * остальной код не знает, где он выполняется, и не содержит ни одной проверки isDemo.
 */
import { el } from "./util.js";
import { FALLBACK, resolveTheme, applyTheme } from "./theme.js";

const webApp = window.Telegram?.WebApp;
/** Демо включается именно по пустому initData, а не по отсутствию SDK: так ловятся оба случая */
const isDemo = !webApp || !webApp.initData;

const listeners = { theme: [], viewport: [] };
let demoScheme = "light";
let mainHandler = null;
let backHandler = null;
const mainState = { text: "", enabled: true, loading: false };

/* ---------- тема ---------- */

function currentTheme() {
  if (isDemo) return resolveTheme(FALLBACK[demoScheme], demoScheme);
  return resolveTheme(webApp.themeParams || {}, webApp.colorScheme === "dark" ? "dark" : "light");
}

function pushTheme() {
  const theme = currentTheme();
  applyTheme(theme);
  if (!isDemo) {
    // Чтобы шапка и нижняя панель самого Telegram не спорили с фоном приложения
    try { webApp.setBackgroundColor(theme.page); } catch { /* старый клиент */ }
    try { webApp.setHeaderColor(theme.header_bg_color); } catch { /* старый клиент */ }
    try { webApp.setBottomBarColor(theme.bottom_bar_bg_color); } catch { /* до 7.10 нет */ }
  }
  for (const cb of listeners.theme) cb(theme);
  return theme;
}

/* ---------- высота вьюпорта ---------- */

/**
 * Две высоты, и разница между ними важна:
 * stable — высота без клавиатуры, по ней рассчитывается запас под нижнюю панель;
 * live — текущая видимая высота. Раскладка строится по live, поэтому при открытой
 * клавиатуре экран сжимается, а поле ввода телефона остаётся над ней, а не под.
 */
function pushViewport() {
  const stable = (!isDemo && webApp.viewportStableHeight) || window.innerHeight;
  const live = isDemo
    ? window.visualViewport?.height || window.innerHeight
    : webApp.viewportHeight || stable;

  const root = document.documentElement.style;
  root.setProperty("--tg-viewport-stable-height", `${Math.round(stable)}px`);
  root.setProperty("--tg-viewport-height", `${Math.round(live)}px`);
  // Telegram 8.0+ отдаёт отступ под вырез экрана
  root.setProperty("--tg-content-top", `${(!isDemo && webApp.contentSafeAreaInset?.top) || 0}px`);

  for (const cb of listeners.viewport) cb(live);
}

/* ---------- демо-хром: шапка, плашка и нижняя кнопка ---------- */

let demoUI = null;

function buildDemoChrome() {
  const back = el("button", {
    class: "demo-back", type: "button", "aria-label": "Назад", hidden: true,
    onclick: () => backHandler?.(),
  }, [el("span", { class: "demo-back__chevron", "aria-hidden": "true" }), "Назад"]);

  const toggle = el("button", {
    class: "demo-toggle", type: "button",
    onclick: () => { demoScheme = demoScheme === "dark" ? "light" : "dark"; syncToggle(); pushTheme(); },
  });

  const header = el("div", { class: "demo-header" }, [
    back,
    el("span", { class: "demo-header__title", text: "ШинаПро" }),
    toggle,
  ]);

  const banner = el("p", {
    class: "demo-banner",
    text: "Демонстрационный режим. Внутри Telegram запись отправляется мастеру",
  });

  const label = el("span", { class: "demo-mb__label" });
  const spinner = el("span", { class: "demo-mb__spinner", "aria-hidden": "true" });
  const button = el("button", {
    class: "demo-mb__button", type: "button",
    onclick: () => mainHandler?.(),
  }, [label, spinner]);
  const bar = el("div", { class: "demo-mb", hidden: true }, [button]);

  document.body.prepend(header, banner);
  document.body.append(bar);

  // На кнопке написано, что произойдёт по нажатию, а не что включено сейчас
  function syncToggle() {
    toggle.textContent = demoScheme === "dark" ? "Светлая тема" : "Тёмная тема";
  }
  syncToggle();

  return { back, header, banner, bar, button, label, spinner };
}

function renderMainButton() {
  const { text, enabled, loading } = mainState;
  if (isDemo) {
    demoUI.bar.hidden = false;
    demoUI.label.textContent = text;
    demoUI.button.disabled = !enabled || loading;
    demoUI.button.classList.toggle("is-loading", loading);
    document.body.classList.add("has-main-button");
    return;
  }
  const mb = webApp.MainButton;
  mb.setParams({ text, is_active: enabled && !loading, is_visible: true });
  if (loading) mb.showProgress(true);
  else mb.hideProgress();
  mb.show();
}

/* ---------- эмуляция showConfirm / showAlert ---------- */

function demoDialog({ message, confirmText, cancelText, destructive }) {
  return new Promise((resolve) => {
    const close = (result) => { overlay.remove(); document.removeEventListener("keydown", onKey); resolve(result); };
    const onKey = (e) => { if (e.key === "Escape") close(false); };

    const buttons = [];
    if (cancelText) buttons.push(el("button", { class: "demo-dialog__btn", type: "button", text: cancelText, onclick: () => close(false) }));
    buttons.push(el("button", {
      class: `demo-dialog__btn demo-dialog__btn--primary${destructive ? " demo-dialog__btn--danger" : ""}`,
      type: "button", text: confirmText, onclick: () => close(true),
    }));

    const overlay = el("div", { class: "demo-dialog", role: "dialog", "aria-modal": "true" }, [
      el("div", { class: "demo-dialog__box" }, [
        el("p", { class: "demo-dialog__text", text: message }),
        el("div", { class: "demo-dialog__row" }, buttons),
      ]),
    ]);
    document.body.append(overlay);
    document.addEventListener("keydown", onKey);
    buttons.at(-1).focus();
  });
}

/* ---------- публичный интерфейс ---------- */

export const tg = {
  isDemo,
  platform: isDemo ? "browser" : webApp.platform,
  version: isDemo ? null : webApp.version,
  initData: isDemo ? "" : webApp.initData,

  /** Имя из Telegram для подстановки в форму. В демо — правдоподобное имя. */
  get user() {
    if (isDemo) return { id: 0, first_name: "Иван", last_name: "Князев" };
    return webApp.initDataUnsafe?.user ?? null;
  },

  get theme() {
    return currentTheme();
  },

  mainButton: {
    /** @param {{text:string, enabled?:boolean, loading?:boolean, onClick?:Function}} opts */
    set({ text, enabled = true, loading = false, onClick }) {
      mainHandler = onClick ?? null;
      Object.assign(mainState, { text, enabled, loading });
      renderMainButton();
    },

    setLoading(loading) {
      mainState.loading = loading;
      renderMainButton();
    },

    setEnabled(enabled) {
      mainState.enabled = enabled;
      renderMainButton();
    },

    hide() {
      mainHandler = null;
      if (isDemo) {
        demoUI.bar.hidden = true;
        document.body.classList.remove("has-main-button");
        return;
      }
      webApp.MainButton.hideProgress();
      webApp.MainButton.hide();
    },
  },

  backButton: {
    show(onClick) {
      backHandler = onClick;
      if (isDemo) { demoUI.back.hidden = false; return; }
      webApp.BackButton.show();
    },
    hide() {
      backHandler = null;
      if (isDemo) { demoUI.back.hidden = true; return; }
      webApp.BackButton.hide();
    },
  },

  haptic: {
    select() { try { webApp?.HapticFeedback?.selectionChanged(); } catch { /* нет поддержки */ } },
    success() { try { webApp?.HapticFeedback?.notificationOccurred("success"); } catch { /* нет поддержки */ } },
    error() { try { webApp?.HapticFeedback?.notificationOccurred("error"); } catch { /* нет поддержки */ } },
  },

  /** Нативный диалог Telegram; в демо — его копия */
  confirm(message, { confirmText = "Да", cancelText = "Отмена", destructive = false } = {}) {
    if (isDemo) return demoDialog({ message, confirmText, cancelText, destructive });
    return new Promise((resolve) => {
      try {
        webApp.showConfirm(message, (ok) => resolve(Boolean(ok)));
      } catch {
        resolve(window.confirm(message)); // клиенты до 6.2
      }
    });
  },

  alert(message) {
    if (isDemo) return demoDialog({ message, confirmText: "Понятно", cancelText: null });
    return new Promise((resolve) => {
      try { webApp.showAlert(message, () => resolve()); } catch { window.alert(message); resolve(); }
    });
  },

  onThemeChanged(cb) { listeners.theme.push(cb); },
  onViewportChanged(cb) { listeners.viewport.push(cb); },

  /** Спрашивать подтверждение при закрытии — только пока человек внутри сценария записи */
  setClosingConfirmation(on) {
    if (isDemo) return;
    try {
      if (on) webApp.enableClosingConfirmation();
      else webApp.disableClosingConfirmation();
    } catch { /* до 6.2 нет */ }
  },

  /** Стартовая последовательность: ready → expand → тема → вьюпорт */
  init() {
    if (isDemo) {
      demoUI = buildDemoChrome();
      document.documentElement.classList.add("is-demo");
      window.addEventListener("resize", pushViewport);
      window.visualViewport?.addEventListener("resize", pushViewport);
    } else {
      webApp.ready();
      webApp.expand();
      // Иначе свайп вниз по сетке слотов сворачивает приложение на середине сценария
      try { webApp.disableVerticalSwipes(); } catch { /* до 7.7 нет */ }
      webApp.onEvent("themeChanged", pushTheme);
      webApp.onEvent("viewportChanged", pushViewport);
      webApp.onEvent("safeAreaChanged", pushViewport);
      webApp.onEvent("contentSafeAreaChanged", pushViewport);
      webApp.MainButton.onClick(() => mainHandler?.());
      webApp.BackButton.onClick(() => backHandler?.());
    }
    pushTheme();
    pushViewport();
  },
};
