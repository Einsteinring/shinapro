/**
 * Кирпичи интерфейса. Ни один из них не знает про состояние приложения:
 * получают данные и колбэк, возвращают DOM-узел.
 */
import { el, clear, prefersReducedMotion, weekdayShort, dayNumber, monthShort, formatDateRu } from "./util.js";
import { formatPrice, plural } from "./pricing.js";

/* ---------- каркас шага ---------- */

/** Рельс из четырёх сегментов. Шаги записи — настоящая последовательность, поэтому прогресс уместен. */
export function rail(current, total = 4) {
  return el(
    "div",
    { class: "rail", role: "progressbar", "aria-valuemin": 1, "aria-valuemax": total, "aria-valuenow": current + 1,
      "aria-label": `Шаг ${current + 1} из ${total}` },
    Array.from({ length: total }, (_, i) =>
      el("span", { class: `rail__seg${i <= current ? " is-done" : ""}` })),
  );
}

export function title(text, sub) {
  return el("header", { class: "head" }, [
    el("h1", { class: "head__title", text }),
    sub ? el("p", { class: "head__sub", text: sub }) : null,
  ]);
}

export function section(label, content, hint) {
  return el("section", { class: "section" }, [
    label ? el("h2", { class: "section__label", text: label }) : null,
    content,
    hint ? el("p", { class: "section__hint", text: hint }) : null,
  ]);
}

export function group(children) {
  return el("div", { class: "group" }, children);
}

/* ---------- выбор услуги ---------- */

export function serviceRow(service, selected, onPick) {
  return el(
    "button",
    {
      class: `srv${selected ? " is-selected" : ""}`,
      type: "button",
      role: "radio",
      "aria-checked": selected ? "true" : "false",
      onclick: () => onPick(service.id),
    },
    [
      el("span", { class: "srv__mark", "aria-hidden": "true" }),
      el("span", { class: "srv__body" }, [
        el("span", { class: "srv__title", text: service.title }),
        el("span", { class: "srv__short", text: service.short }),
        el("span", { class: "srv__meta" }, [
          el("span", { class: "srv__price", text: service.priceFromLabel }),
          el("span", { class: "srv__dur", text: service.duration }),
        ]),
      ]),
    ],
  );
}

/* ---------- сегментированный переключатель ---------- */

export function segmented(options, value, onChange, { label, grid = false } = {}) {
  const node = el("div", {
    class: `seg${grid ? " seg--grid" : ""}`,
    role: "radiogroup",
    "aria-label": label ?? "",
  });
  for (const option of options) {
    const active = String(option.value) === String(value);
    node.append(
      el(
        "button",
        {
          class: `seg__item${active ? " is-active" : ""}`,
          type: "button",
          role: "radio",
          "aria-checked": active ? "true" : "false",
          onclick: () => { if (!active) onChange(option.value); },
        },
        [
          el("span", { class: "seg__label", text: option.label }),
          option.hint ? el("span", { class: "seg__hint", text: option.hint }) : null,
        ],
      ),
    );
  }
  return node;
}

/** Плюс-минус для величин, которым сегменты были бы слишком длинными (до 8 проколов) */
export function stepper(value, { min, max, forms, onChange }) {
  const out = el("div", { class: "stepper" });
  const view = el("span", { class: "stepper__value tabular", text: `${value} ${plural(value, forms)}` });
  const button = (sign, delta, label) =>
    el("button", {
      class: "stepper__btn", type: "button", "aria-label": label,
      disabled: value + delta < min || value + delta > max,
      onclick: () => onChange(value + delta),
    }, [el("span", { "aria-hidden": "true", text: sign })]);
  out.append(button("−", -1, "Меньше"), view, button("+", +1, "Больше"));
  return out;
}

/* ---------- линейка радиусов ---------- */

/**
 * Радиус — это размер, поэтому он и нарисован как размер: высота засечки растёт
 * вместе с диаметром. Сдвиг вправо и рост суммы в чеке происходят в одном кадре.
 */
export function radiusRuler(radii, value, onChange) {
  const track = el("div", { class: "ruler", role: "radiogroup", "aria-label": "Радиус колеса" });
  const min = Math.min(...radii);
  const max = Math.max(...radii);

  for (const r of radii) {
    const active = Number(r) === Number(value);
    const height = 10 + ((r - min) / (max - min)) * 28;
    const item = el(
      "button",
      {
        class: `ruler__item${active ? " is-active" : ""}`,
        type: "button", role: "radio",
        "aria-checked": active ? "true" : "false",
        "aria-label": `R${r}`,
        onclick: () => onChange(r),
      },
      [
        el("span", { class: "ruler__tick", style: `height:${height.toFixed(1)}px`, "aria-hidden": "true" }),
        el("span", { class: "ruler__num tabular", text: String(r), "aria-hidden": "true" }),
      ],
    );
    if (active) item.dataset.active = "1";
    track.append(item);
  }

  // Выбранный радиус подтягиваем в центр — иначе при возврате на шаг он оказывается за краем
  requestAnimationFrame(() => {
    const active = track.querySelector('[data-active="1"]');
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
  });
  return track;
}

/* ---------- чек ---------- */

const EASE = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Док с суммой. Сумма не перерисовывается, а доезжает до нового значения за 420 мс:
 * это единственная анимация в приложении, и она отвечает на действие человека.
 */
export function createPriceDock() {
  const amount = el("output", { class: "dock__amount tabular", "aria-live": "polite" });
  const lines = el("div", { class: "dock__lines" });
  const node = el("div", { class: "dock" }, [
    el("div", { class: "dock__top" }, [el("span", { class: "dock__caption", text: "Итого" }), amount]),
    lines,
  ]);

  let shown = 0;
  let frame = 0;
  let guard = 0;

  function paint(value) {
    amount.textContent = formatPrice(value);
  }

  /**
   * Итог всегда доезжает до настоящего значения.
   * requestAnimationFrame не вызывается, пока вкладка скрыта, а Mini App легко
   * свернуть свайпом посреди выбора — поэтому у анимации есть страховочный таймер:
   * через 600 мс сумма ставится на место, даже если ни один кадр так и не отрисовался.
   */
  function settle(target) {
    cancelAnimationFrame(frame);
    clearTimeout(guard);
    shown = target;
    paint(target);
    node.classList.remove("is-changing");
  }

  function update(result) {
    clear(lines);
    for (const line of result.lines) {
      lines.append(
        el("div", { class: "dock__line" }, [
          el("span", { class: "dock__line-label", text: line.label }),
          el("span", { class: "dock__line-qty tabular", text: `×${line.qty}` }),
          el("span", { class: "dock__line-sum tabular", text: formatPrice(line.total) }),
        ]),
      );
    }
    for (const discount of result.discounts) {
      lines.append(
        el("div", { class: "dock__line dock__line--discount" }, [
          el("span", { class: "dock__line-label", text: discount.label }),
          el("span", { class: "dock__line-qty" }),
          el("span", { class: "dock__line-sum tabular", text: `−${formatPrice(discount.amount)}` }),
        ]),
      );
    }

    const target = result.total;
    if (prefersReducedMotion() || shown === 0 || target === shown) {
      settle(target);
      return;
    }

    cancelAnimationFrame(frame);
    clearTimeout(guard);
    const from = shown;
    const started = performance.now();
    node.classList.add("is-changing");

    const tick = (now) => {
      const t = Math.min(1, (now - started) / 420);
      if (t < 1) {
        paint(from + (target - from) * EASE(t));
        frame = requestAnimationFrame(tick);
      } else {
        settle(target);
      }
    };
    frame = requestAnimationFrame(tick);
    guard = setTimeout(() => settle(target), 600);
  }

  return { node, update };
}

/* ---------- календарь и слоты ---------- */

export function dateStrip(dates, value, onChange) {
  const track = el("div", { class: "dates", role: "radiogroup", "aria-label": "Дата" });
  let lastMonth = null;

  for (const day of dates) {
    const month = monthShort(day.date);
    const showMonth = month !== lastMonth;
    lastMonth = month;
    const active = day.date === value;
    const blocked = day.full || day.closed;
    const note = day.closed ? ", выходной" : day.full ? ", мест нет" : "";
    const caption = day.closed ? "выходной" : day.today ? "сегодня" : showMonth ? month : "";

    const item = el(
      "button",
      {
        class: `date${active ? " is-active" : ""}${day.full ? " is-full" : ""}${day.closed ? " is-closed" : ""}`,
        type: "button", role: "radio",
        "aria-checked": active ? "true" : "false",
        "aria-label": `${formatDateRu(day.date)}${note}`,
        disabled: blocked,
        onclick: () => onChange(day.date),
      },
      [
        el("span", { class: "date__wd", text: weekdayShort(day.date) }),
        el("span", { class: "date__num tabular", text: String(dayNumber(day.date)) }),
        el("span", { class: "date__mo", text: caption }),
      ],
    );
    if (active) item.dataset.active = "1";
    track.append(item);
  }

  requestAnimationFrame(() => {
    track.querySelector('[data-active="1"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  });
  return track;
}

const SLOT_LABEL = { busy: "занято", past: "прошло" };

export function slotGrid(slots, selected, onPick) {
  const grid = el("div", { class: "slots", role: "radiogroup", "aria-label": "Время" });
  for (const slot of slots) {
    const active = slot.time === selected;
    const disabled = slot.state !== "free";
    grid.append(
      el(
        "button",
        {
          class: `slot slot--${slot.state}${active ? " is-active" : ""}`,
          type: "button", role: "radio",
          "aria-checked": active ? "true" : "false",
          "aria-label": `${slot.time}${SLOT_LABEL[slot.state] ? `, ${SLOT_LABEL[slot.state]}` : ""}`,
          disabled,
          onclick: () => onPick(slot.time),
        },
        [el("span", { class: "slot__time tabular", text: slot.time })],
      ),
    );
  }
  return grid;
}

export function slotLegend({ past }) {
  const item = (mod, text) =>
    el("span", { class: "legend__item" }, [
      el("span", { class: `slot slot--${mod} legend__sample`, "aria-hidden": "true" }, [
        el("span", { class: "slot__time tabular", text: "00:00" }),
      ]),
      el("span", { class: "legend__text", text }),
    ]);
  return el("div", { class: "legend" }, [item("busy", "занято"), past ? item("past", "уже прошло") : null]);
}

export function slotsSkeleton(count = 24) {
  return el(
    "div",
    { class: "slots slots--skeleton", "aria-hidden": "true" },
    Array.from({ length: count }, () => el("span", { class: "skeleton skeleton--slot" })),
  );
}

export function datesSkeleton(count = 8) {
  return el(
    "div",
    { class: "dates dates--skeleton", "aria-hidden": "true" },
    Array.from({ length: count }, () => el("span", { class: "skeleton skeleton--date" })),
  );
}

export function cardsSkeleton(count = 2) {
  return el(
    "div",
    { class: "stack", "aria-hidden": "true" },
    Array.from({ length: count }, () => el("span", { class: "skeleton skeleton--card" })),
  );
}

/* ---------- прочее ---------- */

export function notice(text, kind = "info") {
  return el("p", { class: `notice notice--${kind}`, role: kind === "error" ? "alert" : "status", text });
}

export function field({ id, label, value, placeholder, type = "text", inputmode, onInput, onFocus }) {
  const input = el("input", {
    class: "field__input", id, type, value, placeholder,
    inputmode, autocomplete: type === "tel" ? "tel" : "name",
    oninput: (e) => onInput(e.target),
    onfocus: (e) => onFocus?.(e.target),
  });
  return {
    input,
    node: el("label", { class: "field", for: id }, [
      el("span", { class: "field__label", text: label }),
      input,
    ]),
  };
}

export function summaryRow(label, value, { strong = false } = {}) {
  return el("div", { class: `sum__row${strong ? " sum__row--strong" : ""}` }, [
    el("span", { class: "sum__label", text: label }),
    el("span", { class: "sum__value", text: value }),
  ]);
}
