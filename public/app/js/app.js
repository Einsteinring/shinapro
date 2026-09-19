/**
 * Сценарий записи: услуга → параметры → филиал, дата и время → подтверждение → готово.
 * Состояние одно на всё приложение, каждый шаг — чистая функция от него.
 *
 * Заявка отсюда уходит в ту же таблицу, что и заявка с сайта, и дальше живёт
 * в админке. Поэтому слоты у сайта и у приложения общие: занятое здесь недоступно там.
 */
import { tg } from "./tg.js";
import * as UI from "./ui.js";
import { api, demoStore, fetchPricing, initApi, messageFor } from "./api.js";
import {
  setPricing, pricing, calculate, getBranch, getService, getUnit,
  fullLabelOf, formatPrice, plural, pluralMonths, pickMonths,
} from "./pricing.js";
import {
  el, clear, addDays, addMonths, daySlots, hoursFor, nowInZone, timeToMinutes,
  formatDateRu, formatDateShortRu, formatPhone, isPhoneComplete, normalizePhone,
  PHONE_PLACEHOLDER,
} from "./util.js";

const screen = document.getElementById("screen");
const scroll = document.getElementById("scroll");
const dock = document.getElementById("dock");

const state = {
  step: "service",
  service: "seasonal",
  branchId: null,
  radius: 16,
  vehicle: "sedan",
  wheelType: "alloy",
  count: 4,
  months: 6,
  date: null,
  time: null,
  name: "",
  phone: "",
  busy: {},
  closed: new Set(),
  /** Филиал, для которого загружено расписание: смена филиала требует нового запроса */
  loadedBranch: null,
  scheduleState: "idle", // idle | loading | ready | error
  error: null,
  booking: null,
  myBookings: null,
  myState: "idle",
};

let priceDock = null;

/* ---------- календарь ---------- */

const today = () => nowInZone(pricing().schedule.timeZone).date;
const nowMinutes = () => nowInZone(pricing().schedule.timeZone).minutes;

function horizon() {
  const start = today();
  return Array.from({ length: pricing().schedule.horizonDays }, (_, i) => addDays(start, i));
}

/** Состояние каждого получасового слота дня: свободен, занят или уже прошёл */
function slotsFor(date) {
  const { slotMinutes, leadMinutes } = pricing().schedule;
  const hours = hoursFor(getBranch(state.branchId), date);
  if (!hours) return [];

  const busy = new Set(state.busy[date] ?? []);
  const limit = date === today() ? nowMinutes() + leadMinutes : -Infinity;

  return daySlots(hours, slotMinutes).map((time) => ({
    time,
    state: timeToMinutes(time) < limit ? "past" : busy.has(time) ? "busy" : "free",
  }));
}

function dayModels() {
  const storage = getService(state.service).storage;
  const ready = state.scheduleState === "ready";
  return horizon().map((date) => {
    const closed = state.closed.has(date);
    return {
      date,
      today: date === today(),
      closed,
      // У хранения слотов нет, поэтому «мест нет» к нему не применимо
      full: !closed && !storage && ready && slotsFor(date).every((s) => s.state !== "free"),
    };
  });
}

function firstOpenDate(days) {
  return (days.find((d) => !d.closed && !d.full) ?? days[0]).date;
}

/* ---------- навигация ---------- */

const RAIL = { service: 0, params: 1, when: 2, confirm: 3 };
const ORDER = ["service", "params", "when", "confirm"];

function go(step) {
  state.step = step;
  state.error = null;
  render();
  scroll.scrollTop = 0;
}

function back() {
  const index = ORDER.indexOf(state.step);
  if (index > 0) return go(ORDER[index - 1]);
  if (state.step === "bookings") return go(state.booking ? "done" : "service");
  return go("service");
}

/* ---------- шаг 1: услуга ---------- */

function stepService() {
  const list = UI.group(
    pricing().services.map((service) =>
      UI.serviceRow(service, service.id === state.service, (id) => {
        if (id === state.service) return;
        const next = getService(id);
        state.service = id;
        state.count = next.defaultCount;
        state.months = next.defaultMonths ?? 6;
        state.date = null;
        state.time = null;
        tg.haptic.select();
        render();
      }),
    ),
  );
  list.setAttribute("role", "radiogroup");
  list.setAttribute("aria-label", "Услуга");

  screen.append(
    UI.rail(RAIL.service),
    UI.title("Что сделать?", "Параметры и цену уточним на следующем шаге"),
    list,
  );

  tg.backButton.hide();
  tg.setClosingConfirmation(false);
  tg.mainButton.set({ text: "Дальше", onClick: () => go("params") });
}

/* ---------- шаг 2: параметры и цена ---------- */

function stepParams() {
  const P = pricing();
  const service = getService(state.service);
  const unit = getUnit(service);

  screen.append(
    UI.rail(RAIL.params),
    UI.title(service.storage ? "Что и сколько храним?" : "Какие колёса?", service.title),
  );

  screen.append(
    UI.section(
      "Радиус",
      UI.radiusRuler(P.radii, state.radius, (radius) => {
        state.radius = radius;
        tg.haptic.select();
        render();
      }),
    ),
  );

  // Для хранения тип авто и тип дисков на цену не влияют, поэтому их и не показываем
  if (!service.storage) {
    screen.append(
      UI.section(
        "Тип авто",
        UI.segmented(
          P.vehicle.map((v) => ({ value: v.id, label: v.label })),
          state.vehicle,
          (vehicle) => { state.vehicle = vehicle; tg.haptic.select(); render(); },
          { label: "Тип авто", grid: true },
        ),
        P.vehicle.find((v) => v.id === state.vehicle)?.hint,
      ),
      UI.section(
        "Диски",
        UI.segmented(
          P.wheelType.map((w) => ({ value: w.id, label: w.label })),
          state.wheelType,
          (wheelType) => { state.wheelType = wheelType; tg.haptic.select(); render(); },
          { label: "Тип дисков" },
        ),
        P.wheelType.find((w) => w.id === state.wheelType)?.hint,
      ),
    );
  }

  const setCount = (count) => {
    state.count = Math.min(Math.max(1, count), unit.max);
    tg.haptic.select();
    render();
  };

  screen.append(
    UI.section(
      unit.label,
      unit.max <= 4
        ? UI.segmented(
            Array.from({ length: unit.max }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
            state.count,
            setCount,
            { label: unit.label },
          )
        : UI.stepper(state.count, { min: 1, max: unit.max, forms: unit.forms, onChange: setCount }),
    ),
  );

  if (service.storage) {
    const months = pickMonths(service, state.months);
    screen.append(
      UI.section(
        "Срок",
        UI.segmented(
          service.months.map((m) => ({ value: m, label: `${m} мес.` })),
          months,
          (value) => { state.months = value; tg.haptic.select(); render(); },
          { label: "Срок хранения" },
        ),
        months >= P.storage.longTermFrom
          ? "Со скидкой за длительное хранение"
          : `От ${P.storage.longTermFrom} месяцев действует скидка ${P.storage.longTermDiscountPercent}%`,
      ),
    );
  }

  priceDock ??= UI.createPriceDock();
  dock.append(priceDock.node);
  priceDock.update(calculate(state));

  tg.backButton.show(back);
  tg.setClosingConfirmation(true);
  tg.mainButton.set({
    text: service.storage ? "Выбрать дату" : "Выбрать время",
    onClick: () => go("when"),
  });
}

/* ---------- шаг 3: филиал, дата и время ---------- */

async function loadSchedule() {
  const branchId = state.branchId;
  state.scheduleState = "loading";
  render();
  try {
    const { busy, closed } = await api.schedule(branchId);
    if (state.branchId !== branchId) return; // филиал успели переключить
    state.busy = busy;
    state.closed = new Set(closed);
    state.loadedBranch = branchId;
    state.scheduleState = "ready";
  } catch (error) {
    state.scheduleState = "error";
    state.error = messageFor(error);
  }
  if (state.step === "when") render();
}

function branchPicker() {
  const P = pricing();
  const branch = getBranch(state.branchId);
  return UI.section(
    "Филиал",
    UI.segmented(
      P.branches.map((b) => ({ value: b.id, label: b.shortName })),
      state.branchId,
      (id) => {
        if (id === state.branchId) return;
        state.branchId = id;
        state.date = null;
        state.time = null;
        state.scheduleState = "idle";
        tg.haptic.select();
        render();
      },
      { label: "Филиал" },
    ),
    `${branch.address}. ${branch.hoursLabel}`,
  );
}

function stepWhen() {
  const service = getService(state.service);
  screen.append(UI.rail(RAIL.when));
  screen.append(
    service.storage
      ? UI.title("Когда привезёте шины?", "Время бронировать не нужно")
      : UI.title("Когда приехать?", "Свободное время обновляется вместе с записями с сайта"),
  );

  // Сообщение про уведённый слот живёт над сеткой и переживает перезагрузку расписания
  if (state.error && state.scheduleState !== "error") {
    screen.append(UI.notice(state.error, "error"));
  }

  screen.append(branchPicker());

  // Только из idle: пока идёт загрузка, повторный запуск отсюда закрутил бы
  // бесконечный цикл «render → запрос → render»
  if (state.scheduleState === "idle") queueMicrotask(loadSchedule);

  if (state.scheduleState === "idle" || state.scheduleState === "loading") {
    screen.append(UI.section(null, UI.datesSkeleton()));
    if (!service.storage) screen.append(UI.section(null, UI.slotsSkeleton()));
    tg.backButton.show(back);
    tg.mainButton.set({ text: "Дальше", enabled: false, loading: true });
    return;
  }

  if (state.scheduleState === "error") {
    screen.append(
      UI.notice(state.error ?? "Не удалось загрузить расписание", "error"),
      el("button", {
        class: "btn-ghost", type: "button", text: "Попробовать ещё раз",
        onclick: () => { state.scheduleState = "idle"; render(); },
      }),
    );
    tg.backButton.show(back);
    tg.mainButton.set({ text: "Дальше", enabled: false });
    return;
  }

  const days = dayModels();
  const pickable = days.filter((d) => !d.closed && !d.full).map((d) => d.date);
  if (!state.date || !pickable.includes(state.date)) {
    state.date = firstOpenDate(days);
    state.time = null;
  }

  screen.append(
    UI.section(null, UI.dateStrip(days, state.date, (date) => {
      state.date = date;
      state.time = null;
      state.error = null;
      tg.haptic.select();
      render();
    })),
  );

  return service.storage ? whenStorage(service) : whenSlots();
}

function whenSlots() {
  const slots = slotsFor(state.date);
  const free = slots.filter((s) => s.state === "free").length;

  screen.append(
    UI.section(
      formatDateRu(state.date),
      el("div", {}, [
        free === 0
          ? UI.notice("На этот день всё разобрали. Выберите другую дату — свободные подсвечены выше")
          : UI.slotGrid(slots, state.time, (time) => {
              state.time = time;
              state.error = null;
              tg.haptic.select();
              render();
            }),
        free > 0 ? UI.slotLegend({ past: slots.some((s) => s.state === "past") }) : null,
      ]),
      free > 0
        ? `Свободно ${free} ${plural(free, ["слот", "слота", "слотов"])}, работа занимает ${getService(state.service).duration}`
        : null,
    ),
  );

  tg.backButton.show(back);
  tg.mainButton.set({
    text: state.time ? `Дальше, ${state.time}` : "Выберите время",
    enabled: Boolean(state.time),
    onClick: () => go("confirm"),
  });
}

/** Хранение — единственная услуга без получасового слота: бронируется день сдачи шин */
function whenStorage(service) {
  const months = pickMonths(service, state.months);
  const until = addMonths(state.date, months);
  state.time = null;

  screen.append(
    UI.section(
      "Шины на хранении",
      el("div", { class: "period" }, [
        el("div", { class: "period__ends" }, [
          el("span", { class: "period__date tabular", text: formatDateShortRu(state.date) }),
          el("span", { class: "period__date tabular", text: formatDateShortRu(until) }),
        ]),
        el("div", { class: "period__bar", "aria-hidden": "true" }, [
          el("span", { class: "period__cap" }),
          el("span", { class: "period__line" }),
          el("span", { class: "period__cap" }),
        ]),
        el("div", { class: "period__ends period__ends--labels" }, [
          el("span", { class: "period__label", text: "сдаёте" }),
          el("span", { class: "period__label", text: "забираете" }),
        ]),
      ]),
      `${months} ${pluralMonths(months)} на отапливаемом складе. Перед следующей переобувкой привезём комплект в бокс`,
    ),
    UI.section(
      null,
      el("p", {
        class: "plain",
        text: `Колёса принимает кладовщик в любое время в часы работы филиала: пост шиномонтажа для этого не нужен, отдельное время бронировать не надо.`,
      }),
    ),
    UI.section("Куда везти", addressBlock()),
  );

  tg.backButton.show(back);
  tg.mainButton.set({
    text: `Дальше, ${formatDateShortRu(state.date)}`,
    enabled: Boolean(state.date),
    onClick: () => go("confirm"),
  });
}

/* ---------- шаг 4: подтверждение ---------- */

function stepConfirm() {
  const P = pricing();
  const service = getService(state.service);
  const unit = getUnit(service);
  const result = calculate(state);
  const months = pickMonths(service, state.months);

  screen.append(
    UI.rail(RAIL.confirm),
    UI.title("Всё верно?", "Заявка сразу попадёт мастеру, подтверждать её отдельно не нужно"),
  );

  const rows = [
    UI.summaryRow("Услуга", service.title),
    UI.summaryRow("Филиал", getBranch(state.branchId).shortName),
    UI.summaryRow("Радиус", `R${state.radius}`),
  ];
  if (!service.storage) {
    rows.push(
      UI.summaryRow("Авто", fullLabelOf(P.vehicle, state.vehicle)),
      UI.summaryRow("Диски", fullLabelOf(P.wheelType, state.wheelType)),
    );
  }
  rows.push(UI.summaryRow(unit.label, `${state.count} ${plural(state.count, unit.forms)}`));
  if (service.storage) {
    rows.push(
      UI.summaryRow("Сдаёте", formatDateRu(state.date, { weekday: false })),
      UI.summaryRow("Забираете", formatDateRu(addMonths(state.date, months), { weekday: false })),
    );
  } else {
    rows.push(UI.summaryRow("Когда", `${formatDateRu(state.date, { weekday: false })}, ${state.time}`));
  }
  rows.push(UI.summaryRow("Итого", formatPrice(result.total), { strong: true }));

  screen.append(UI.section(null, el("div", { class: "sum" }, rows)));

  if (!state.name) {
    const user = tg.user;
    state.name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  }

  const name = UI.field({
    id: "name", label: "Как к вам обращаться", value: state.name, placeholder: "Имя",
    onInput: (input) => { state.name = input.value; syncSubmit(); },
    onFocus: keepAboveKeyboard,
  });

  const phone = UI.field({
    id: "phone", label: "Телефон", value: state.phone, placeholder: PHONE_PLACEHOLDER,
    type: "tel", inputmode: "tel",
    onInput: (input) => {
      input.value = formatPhone(input.value);
      input.setSelectionRange(input.value.length, input.value.length);
      state.phone = input.value;
      syncSubmit();
    },
    onFocus: keepAboveKeyboard,
  });

  const errorSlot = el("div", { class: "slot-error" });
  screen.append(
    UI.section(null, el("div", { class: "fields" }, [name.node, phone.node, errorSlot])),
    el("p", {
      class: "fine",
      text: "Позвоним, только если что-то поменяется. Оплата на месте, наличными или картой.",
    }),
  );

  const canSubmit = () => state.name.trim().length >= 2 && isPhoneComplete(state.phone);
  const syncSubmit = () => tg.mainButton.setEnabled(canSubmit());

  tg.backButton.show(back);
  tg.mainButton.set({
    text: "Записаться",
    enabled: canSubmit(),
    onClick: () => submit(errorSlot),
  });
}

/** Поле не должно уезжать под клавиатуру: после её появления подтягиваем его в центр */
function keepAboveKeyboard(input) {
  setTimeout(() => input.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
}

async function submit(errorSlot) {
  const service = getService(state.service);
  clear(errorSlot);
  tg.mainButton.set({ text: "Записываем…", enabled: false, loading: true });

  try {
    const booking = await api.book({
      service: state.service,
      branchId: state.branchId,
      radius: state.radius,
      vehicle: state.vehicle,
      wheelType: state.wheelType,
      count: state.count,
      months: service.storage ? pickMonths(service, state.months) : 0,
      date: state.date,
      time: service.storage ? null : state.time,
      name: state.name.trim(),
      phone: normalizePhone(state.phone),
    });
    state.booking = booking;
    state.myBookings = null;
    state.myState = "idle";
    tg.haptic.success();
    go("done");
  } catch (error) {
    tg.haptic.error();
    if (error.code === "slot_taken") {
      // Слот увели, пока человек заполнял форму: возвращаем на сетку с обновлённой занятостью
      state.time = null;
      state.scheduleState = "idle";
      state.step = "when";
      state.error = messageFor(error);
      render();
      return;
    }
    errorSlot.append(UI.notice(messageFor(error), "error"));
    tg.mainButton.set({ text: "Записаться", enabled: true, onClick: () => submit(errorSlot) });
  }
}

/* ---------- готово ---------- */

function screenDone() {
  const booking = state.booking;
  const branch = getBranch(booking.branchId);

  screen.append(
    el("div", { class: "done" }, [
      el("span", { class: "done__mark", "aria-hidden": "true", html: CHECK_SVG }),
      el("h1", { class: "done__title", text: "Записали" }),
      el("p", {
        class: "done__lead",
        text: booking.time
          ? `${formatDateRu(booking.date)} в ${booking.time}`
          : `Ждём шины ${formatDateRu(booking.date, { weekday: false })}`,
      }),
    ]),
  );

  const rows = [
    UI.summaryRow("Услуга", booking.serviceTitle),
    UI.summaryRow("Филиал", branch.shortName),
    UI.summaryRow("Параметры", booking.summary.split(" · ").at(-1)),
  ];
  if (booking.until) {
    rows.push(UI.summaryRow("Заберёте", formatDateRu(booking.until, { weekday: false })));
  }
  rows.push(
    UI.summaryRow("Итого", formatPrice(booking.total), { strong: true }),
    UI.summaryRow("Номер", booking.number),
  );

  screen.append(
    UI.section(null, el("div", { class: "sum" }, rows)),
    UI.section("Куда ехать", addressBlock(branch.id)),
    el("button", {
      class: "btn-ghost", type: "button", text: "Записаться ещё раз",
      onclick: () => { resetOrder(); go("service"); },
    }),
  );

  tg.backButton.hide();
  tg.setClosingConfirmation(false);
  tg.mainButton.set({ text: "Мои записи", onClick: () => go("bookings") });
}

function addressBlock(branchId = state.branchId) {
  const branch = getBranch(branchId);
  return el("div", { class: "addr" }, [
    el("p", { class: "addr__line", text: branch.address }),
    el("p", { class: "addr__hint", text: `${branch.metro} · ${branch.hoursLabel}` }),
    el("a", {
      class: "addr__phone tabular",
      href: `tel:${branch.phone.replace(/[^\d+]/g, "")}`,
      text: branch.phone,
    }),
  ]);
}

function resetOrder() {
  const first = pricing().services[0];
  Object.assign(state, {
    service: first.id,
    count: first.defaultCount,
    months: first.defaultMonths ?? 6,
    date: null,
    time: null,
    scheduleState: "idle",
    error: null,
  });
}

/* ---------- мои записи ---------- */

async function loadMine() {
  state.myState = "loading";
  render();
  try {
    state.myBookings = await api.mine();
    state.myState = "ready";
  } catch (error) {
    state.myState = "error";
    state.error = messageFor(error);
  }
  if (state.step === "bookings") render();
}

function screenBookings() {
  screen.append(UI.title("Мои записи", "Активные заявки в ШинаПро"));

  if (state.myState === "idle") queueMicrotask(loadMine);

  if (state.myState === "idle" || state.myState === "loading") {
    screen.append(UI.cardsSkeleton(2));
  } else if (state.myState === "error") {
    screen.append(
      UI.notice(state.error ?? "Не удалось загрузить записи", "error"),
      el("button", {
        class: "btn-ghost", type: "button", text: "Попробовать ещё раз",
        onclick: () => { state.myState = "idle"; render(); },
      }),
    );
  } else if (!state.myBookings.length) {
    screen.append(
      el("div", { class: "empty" }, [
        el("p", { class: "empty__title", text: "Здесь пока пусто" }),
        el("p", {
          class: "empty__text",
          text: "Запишитесь — и заявка появится в этом списке. Отменить её можно будет в одно касание.",
        }),
      ]),
    );
  } else {
    screen.append(el("div", { class: "stack" }, state.myBookings.map(bookingCard)));
  }

  tg.backButton.show(back);
  tg.mainButton.set({ text: "Записаться", onClick: () => { resetOrder(); go("service"); } });
}

function bookingCard(booking) {
  const branch = getBranch(booking.branchId);
  const when = booking.time
    ? `${formatDateRu(booking.date, { weekday: false })}, ${booking.time}`
    : `${formatDateShortRu(booking.date)} — ${formatDateShortRu(booking.until)}`;

  return el("article", { class: "card" }, [
    el("div", { class: "card__head" }, [
      el("h3", { class: "card__title", text: booking.serviceTitle }),
      el("span", { class: "card__sum tabular", text: formatPrice(booking.total) }),
    ]),
    el("p", { class: "card__when tabular", text: when }),
    booking.until
      ? el("p", { class: "card__note", text: "Привезти в любое время в часы работы склада" })
      : null,
    el("p", { class: "card__params", text: `${branch.shortName} · ${booking.summary.split(" · ").at(-1)}` }),
    el("div", { class: "card__foot" }, [
      el("span", { class: "card__id tabular", text: booking.number }),
      el("button", {
        class: "card__cancel", type: "button", text: "Отменить",
        onclick: (e) => cancelBooking(booking, e.currentTarget),
      }),
    ]),
  ]);
}

async function cancelBooking(booking, button) {
  // Название услуги отдельным предложением: так не приходится склонять «сезонную замену комплекта»
  const when = booking.time
    ? `${formatDateRu(booking.date, { weekday: false })} в ${booking.time}`
    : `с ${formatDateRu(booking.date, { weekday: false })}`;
  const ok = await tg.confirm(`«${booking.serviceTitle}», ${when}. Отменить запись?`, {
    confirmText: "Отменить запись",
    cancelText: "Оставить",
    destructive: true,
  });
  if (!ok) return;

  button.disabled = true;
  button.textContent = "Отменяем…";
  try {
    await api.cancel(booking.id);
    tg.haptic.success();
    if (state.booking?.id === booking.id) state.booking = null;
    state.myState = "idle";
    state.scheduleState = "idle";
    render();
  } catch (error) {
    tg.haptic.error();
    button.disabled = false;
    button.textContent = "Отменить";
    await tg.alert(messageFor(error));
  }
}

/* ---------- сборка ---------- */

const SCREENS = {
  service: stepService,
  params: stepParams,
  when: stepWhen,
  confirm: stepConfirm,
  done: screenDone,
  bookings: screenBookings,
};

function render() {
  clear(screen);
  clear(dock);
  SCREENS[state.step]();
}

const CHECK_SVG =
  '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 24.5 20.5 32 35 17"/></svg>';

async function boot() {
  // Перерисовка по themeChanged не нужна: все цвета живут в CSS-переменных,
  // и смена темы перекрашивает уже отрисованный экран без единого касания DOM.
  tg.init();

  let data;
  try {
    data = await fetchPricing();
  } catch {
    clear(screen);
    screen.append(
      UI.notice("Не удалось загрузить прайс. Проверьте соединение и откройте приложение заново", "error"),
    );
    document.getElementById("boot")?.remove();
    tg.mainButton.hide();
    return;
  }

  setPricing(data);
  initApi(data);
  state.branchId = data.branches[0].id;
  document.getElementById("boot")?.remove();
  render();

  // Демо-режим: занять слот «чужой» записью прямо из консоли, чтобы увидеть,
  // как приложение отрабатывает гонку за один слот. В Telegram этого объекта нет.
  if (tg.isDemo) {
    window.shinapro = {
      occupy: (date, time) => demoStore()._occupy(state.branchId, date, time),
      state,
    };
  }
}

boot();
