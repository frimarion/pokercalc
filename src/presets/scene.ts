// Спот тренажёра как СТОЛ, а не как строчка текста: кто где сидит, кто что
// успел сделать до нас и на какой сумме мы принимаем решение. Из этого
// `ui/PokerTable.tsx` рисует стол и проигрывает действия по очереди.
//
// Главное правило то же, что и в дереве событий: НЕ ВЫДУМЫВАТЬ ДАННЫХ.
// Если чарт задан процентом («защита от 3бета 12%») или группой позиций
// («vs ранние»), конкретное место соперника неизвестно — такое место так и
// подписывается («3бет 12%», «ранние»), а не подставляется наугад. Известен
// только порядок: кто до нас, кто после.

import { PresetGroup, RangePreset } from "./types";

/** Что игрок сделал. Влияет на подпись, цвет и на то, летят ли фишки. */
export type SceneActionKind =
  | "fold"
  | "blind"
  | "limp"
  | "call"
  | "raise"
  | "3bet"
  | "4bet"
  | "push"
  | "check";

export interface SceneSeat {
  /** Уникален в пределах сцены: место либо служебный id для безымянных. */
  id: string;
  /** Подпись на столе: «CO», «ранние», «3бет 12%». */
  label: string;
  hero: boolean;
  /** Место известно точно (из чарта), а не выведено из группы/процента. */
  exact: boolean;
}

export interface SceneStep {
  seat: string;
  kind: SceneActionKind;
  label: string;
  /** Сколько всего стоит перед игроком после хода, bb. Для фишек и банка. */
  amount?: number;
}

export interface Scene {
  seats: SceneSeat[];
  heroId: string;
  /** Действия до хода героя — проигрываются по очереди. */
  steps: SceneStep[];
  /** Глубина стека, если она часть спота (MTT). */
  stack?: string;
}

const CASH_SEATS = ["UTG", "MP", "CO", "BU", "SB", "BB"];
/** MTT-пак FF START — 8-max; на 6-max первая позиция MP, но чарты общие. */
const MTT_SEATS = ["EP+1", "EP+2", "MP", "HJ", "CO", "BU", "SB", "BB"];

/** Сайзинг опена по Green Charts: CO и BU открывают 2.5bb, остальные 3bb. */
function cashOpenSize(seat: string): number {
  return seat === "CO" || seat === "BU" ? 2.5 : 3;
}

interface Builder {
  seats: SceneSeat[];
  steps: SceneStep[];
}

function seat(id: string, label = id, opts: Partial<SceneSeat> = {}): SceneSeat {
  return { id, label, hero: false, exact: true, ...opts };
}

/**
 * Стол из мест по кругу: все до опенера сдают, опенер (если есть) ставит,
 * все между опенером и героем сдают. Возвращает места в порядке хода.
 */
function ring(
  order: string[],
  heroSeat: string,
  opener?: { seat: string; kind: SceneActionKind; label: string; amount: number },
  /** Места, чью подпись нельзя взять из id: безымянный лимпер и т.п. */
  labels: Record<string, SceneSeat> = {},
): Builder {
  const heroIdx = order.indexOf(heroSeat);
  const openerIdx = opener ? order.indexOf(opener.seat) : -1;
  const seats: SceneSeat[] = [];
  const steps: SceneStep[] = [];
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    seats.push(labels[id] ?? seat(id, id, { hero: id === heroSeat }));
    if (id === heroSeat) continue;
    if (i === openerIdx) {
      steps.push({ seat: id, kind: opener!.kind, label: opener!.label, amount: opener!.amount });
    } else if (i < heroIdx) {
      steps.push({ seat: id, kind: "fold", label: "Фолд" });
    }
  }
  return { seats, steps };
}

/** Блайнды выставляются до всех решений — показываем их как первый ход. */
function withBlinds(b: Builder, order: string[]): Builder {
  const posted: SceneStep[] = [];
  if (order.includes("SB")) posted.push({ seat: "SB", kind: "blind", label: "SB", amount: 0.5 });
  if (order.includes("BB")) posted.push({ seat: "BB", kind: "blind", label: "BB", amount: 1 });
  // Блайнд, который потом сдаёт/ходит, свой ход всё равно сделает ниже.
  return { seats: b.seats, steps: [...posted, ...b.steps] };
}

/** Место соперника, заданное не позицией, а описанием («ранние», «3бет 12%»). */
function vague(id: string, label: string): SceneSeat {
  return { id, label, hero: false, exact: false };
}

/**
 * Безымянное место. За столом всегда шесть (кэш) или восемь (MTT) игроков, и
 * они не исчезают оттого, что чарт задан процентом. Но и назвать их нельзя:
 * если чарт говорит «3бет 12%», неизвестно, с какого стула он пришёл, а тогда
 * неизвестны и места остальных. Поэтому такой стул честно подписан «?» —
 * видно, что игрок есть и что он сдал, но позиция не выдумана.
 */
function unknown(i: number): SceneSeat {
  return { id: `seat${i}`, label: "?", hero: false, exact: false };
}

const FOLD = { kind: "fold" as const, label: "Фолд" };

/**
 * Часть MTT-чартов подписана просто «EP» — это одна из ранних позиций, но
 * какая именно, пак не уточняет. Стол при этом всё равно восьмиместный,
 * поэтому перед таким героем садится безымянный ранний стул.
 */
const EARLY_PAD: Record<string, SceneSeat> = { early: { ...unknown(0), id: "early" } };

function mttOrder(heroSeat: string): string[] {
  return MTT_SEATS.includes(heroSeat)
    ? MTT_SEATS
    : ["early", heroSeat, ...MTT_SEATS.slice(2)];
}

interface Slot {
  seat: SceneSeat;
  /** Блайнд этого места — выставляется до всех решений. */
  blind?: number;
  /** Ход до решения героя. Нет — значит место ещё не ходило. */
  step?: { kind: SceneActionKind; label: string; amount?: number };
}

/** Безымянные места, которые сдали до нас. */
function folded(from: number, count: number): Slot[] {
  return Array.from({ length: count }, (_, i) => ({ seat: unknown(from + i), step: FOLD }));
}

/** Безымянные места, до которых очередь ещё не дошла. */
function waiting(from: number, count: number): Slot[] {
  return Array.from({ length: count }, (_, i) => ({ seat: unknown(from + i) }));
}

/**
 * Сцена из мест в порядке хода. Блайнды идут первыми (их ставят до решений),
 * дальше ходы в порядке посадки, `extra` — то, что случилось после круга
 * (ответ опенера на наш 3бет).
 */
function fromSlots(
  slots: Slot[],
  heroId: string,
  opts: { extra?: SceneStep[]; stack?: string } = {},
): Scene {
  const blinds = slots
    .filter((s) => s.blind !== undefined)
    .map((s): SceneStep => ({
      seat: s.seat.id,
      kind: "blind",
      label: s.blind! >= 1 ? "BB" : "SB",
      amount: s.blind,
    }));
  const acts = slots
    .filter((s) => s.step)
    .map((s): SceneStep => ({ seat: s.seat.id, ...s.step! }));
  return {
    seats: slots.map((s) => s.seat),
    heroId,
    steps: [...blinds, ...acts, ...(opts.extra ?? [])],
    stack: opts.stack,
  };
}

/** Процент из подписи чарта: «OOP vs 3bet 12%» → «12%». */
function percentOf(p: RangePreset): string {
  return p.position.match(/(\d+)%/)?.[1] ?? "";
}

/** «vs BU 2.5bb» → место опенера и его сайзинг. */
function openerOf(p: RangePreset): { seat: string; size: number } {
  const m = p.position.replace(/^vs\s+/, "").match(/^([A-Z]+)\s*(?:(\d+(?:\.\d+)?)bb)?/);
  const s = m?.[1] ?? "CO";
  return { seat: s, size: m?.[2] ? Number(m[2]) : cashOpenSize(s) };
}

/** Место героя и глубина стека из подписи вида «CO · 10-14bb». */
function seatAndStack(position: string): { seat: string; stack?: string } {
  const [s, stack] = position.split(" · ");
  return { seat: s, stack };
}

/**
 * Изолэйт-сцена: кто-то до нас влимпил. Конкретного лимпера чарт не называет,
 * поэтому берётся место прямо перед героем — ближайший стул хотя бы
 * гарантированно успел походить. Если героя посадили первым (MTT-чарт «EP»),
 * такого стула нет, и лимпер садится отдельным безымянным местом: сажать
 * позади себя выдуманное «EP+0» было бы хуже.
 */
function isoRing(order: string[], heroSeat: string): Builder {
  const heroIdx = order.indexOf(heroSeat);
  const limp = { kind: "limp" as const, label: "Лимп", amount: 1 };
  if (heroIdx > 0) {
    return withBlinds(
      ring(order, heroSeat, { seat: order[heroIdx - 1], ...limp }, EARLY_PAD),
      order,
    );
  }
  const full = ["limper", ...order];
  return withBlinds(
    ring(full, heroSeat, { seat: "limper", ...limp }, {
      ...EARLY_PAD,
      limper: vague("limper", "лимпер"),
    }),
    full,
  );
}

export function sceneFor(p: RangePreset): Scene {
  const g: PresetGroup = p.group;

  switch (g) {
    case "RFI": {
      const b = withBlinds(ring(CASH_SEATS, p.position), CASH_SEATS);
      return { seats: b.seats, heroId: p.position, steps: b.steps };
    }

    case "ISO": {
      const b = isoRing(CASH_SEATS, p.position);
      return { seats: b.seats, heroId: p.position, steps: b.steps };
    }

    case "SB3BET":
    case "BBDEF": {
      const hero = g === "SB3BET" ? "SB" : "BB";
      const { seat: op, size } = openerOf(p);
      const b = withBlinds(
        ring(CASH_SEATS, hero, { seat: op, kind: "raise", label: `Рейз ${size}bb`, amount: size }),
        CASH_SEATS,
      );
      // На BB между опенером и нами есть ещё SB — он сдаёт (ring это уже сделал).
      return { seats: b.seats, heroId: hero, steps: b.steps };
    }

    case "3BETIP": {
      // Ширина опена задана процентом, место соперника неизвестно — но стол
      // от этого не пустеет: двое сдали до опенера, блайнды сидят позади нас
      // и ещё не ходили, потому что мы в позиции.
      return fromSlots(
        [
          ...folded(1, 2),
          {
            seat: vague("opener", `опен ${percentOf(p)}%`),
            step: { kind: "raise", label: "Рейз", amount: 2.5 },
          },
          { seat: seat("hero", "Вы · в позиции", { hero: true }) },
          { seat: seat("SB"), blind: 0.5 },
          { seat: seat("BB"), blind: 1 },
        ],
        "hero",
      );
    }

    case "DEF3BETIP":
    case "DEF3BETOOP": {
      const pct = percentOf(p);
      // Отдельный чарт «SB vs BB» — единственный на этих страницах, где места
      // названы: там и стол собирается из настоящих позиций.
      if (p.position.includes("SB vs BB")) {
        return fromSlots(
          [
            ...folded(1, 4),
            {
              seat: seat("SB", "SB (вы)", { hero: true }),
              blind: 0.5,
              step: { kind: "raise", label: "Опен 3bb", amount: 3 },
            },
            {
              seat: seat("BB", `BB · 3бет ${pct}%`),
              blind: 1,
              step: { kind: "3bet", label: "3бет", amount: 11 },
            },
          ],
          "SB",
        );
      }
      const hero = { seat: seat("hero", "", { hero: true, exact: false }) };
      const villain = {
        seat: vague("villain", `3бет ${pct}%`),
        step: { kind: "3bet" as const, label: "3бет", amount: 11 },
      };
      const open = { kind: "raise" as const, label: "Опен 2.5bb", amount: 2.5 };
      if (g === "DEF3BETIP") {
        // В позиции мы остаёмся, только если 3бет пришёл с блайнда: иначе
        // 3бетор сидел бы после нас. Значит, второй блайнд уже сдал.
        return fromSlots(
          [
            ...folded(1, 3),
            { ...hero, seat: { ...hero.seat, label: "Вы · в позиции" }, step: open },
            { seat: unknown(4), blind: 0.5, step: FOLD },
            { ...villain, seat: vague("villain", `блайнд · 3бет ${pct}%`), blind: 1 },
          ],
          "hero",
        );
      }
      // Вне позиции: 3бетор сидит после нас, а блайнды сдают уже после его
      // 3бета — и это видно на столе, ход возвращается к нам последними.
      return fromSlots(
        [
          ...folded(1, 2),
          { ...hero, seat: { ...hero.seat, label: "Вы · вне позиции" }, step: open },
          villain,
          { seat: unknown(3), blind: 0.5, step: FOLD },
          { seat: unknown(4), blind: 1, step: FOLD },
        ],
        "hero",
      );
    }

    case "BLINDS4BET": {
      const sbVsBb = p.position.includes("BB vs SB");
      const { seat: op, size } = sbVsBb ? { seat: "SB", size: 3 } : openerOf(p);
      const hero = sbVsBb ? "BB" : "blind";
      const raise = { kind: "raise" as const, label: `Рейз ${size}bb`, amount: size };
      const threeBet = { kind: "3bet" as const, label: "3бет", amount: 12 };
      const answer: SceneStep = { seat: op, kind: "4bet", label: "4бет", amount: 27 };

      if (sbVsBb) {
        return fromSlots(
          [
            ...folded(1, 4),
            { seat: seat("SB"), blind: 0.5, step: raise },
            { seat: seat("BB", "BB (вы)", { hero: true }), blind: 1, step: threeBet },
          ],
          "BB",
          { extra: [answer] },
        );
      }
      // Место опенера чарт называет, а вот с какого блайнда мы 3бетнули — нет.
      // Поэтому места до опенера настоящие (они сдали), а блайнды подписаны
      // блайндами: который из них наш, чарт не уточняет.
      const before = CASH_SEATS.slice(0, CASH_SEATS.indexOf(op));
      const between = CASH_SEATS.slice(CASH_SEATS.indexOf(op) + 1, CASH_SEATS.indexOf("SB"));
      return fromSlots(
        [
          ...before.map((id) => ({ seat: seat(id), step: FOLD })),
          { seat: seat(op), step: raise },
          ...between.map((id) => ({ seat: seat(id), step: FOLD })),
          { seat: unknown(1), blind: 0.5, step: FOLD },
          { seat: { ...vague("blind", "Вы · блайнд"), hero: true }, blind: 1, step: threeBet },
        ],
        hero,
        { extra: [answer] },
      );
    }

    case "MTTRFI": {
      const b = withBlinds(ring(MTT_SEATS, p.position), MTT_SEATS);
      return { seats: b.seats, heroId: p.position, steps: b.steps, stack: "25bb+" };
    }

    case "MTTISO": {
      if (p.position === "vs 2+") {
        // Чарт общий для всех позиций, поэтому не названо ни наше место, ни
        // места лимперов — но за столом всё равно восемь человек.
        const limp = { kind: "limp" as const, label: "Лимп", amount: 1 };
        return fromSlots(
          [
            { seat: vague("limp1", "лимпер"), step: limp },
            { seat: vague("limp2", "лимпер"), step: limp },
            { seat: seat("hero", "Вы", { hero: true, exact: false }) },
            ...waiting(3, 3),
            { seat: seat("SB"), blind: 0.5 },
            { seat: seat("BB"), blind: 1 },
          ],
          "hero",
        );
      }
      const b = isoRing(mttOrder(p.position), p.position);
      return { seats: b.seats, heroId: p.position, steps: b.steps };
    }

    case "MTTVSRFI": {
      // Место героя чарт задаёт группой («Ранние»), кроме отдельного чарта SB.
      const open = { kind: "raise" as const, label: "Рейз 2bb", amount: 2 };
      const opener = { seat: vague("opener", "опенер"), step: open };
      if (p.position === "SB") {
        return fromSlots(
          [
            ...folded(1, 5),
            opener,
            { seat: seat("SB", "SB (вы)", { hero: true }), blind: 0.5 },
            { seat: seat("BB"), blind: 1 },
          ],
          "SB",
          { stack: "40bb+" },
        );
      }
      return fromSlots(
        [
          ...folded(1, 2),
          opener,
          { seat: { ...vague("hero", `Вы · ${p.position.toLowerCase()}`), hero: true } },
          ...waiting(3, 2),
          { seat: seat("SB"), blind: 0.5 },
          { seat: seat("BB"), blind: 1 },
        ],
        "hero",
        { stack: "40bb+" },
      );
    }

    case "MTTDEF3BET": {
      // Наше место чарт называет, значит места до нас тоже известны — они
      // сдали. А вот кто из оставшихся 3бетнул, чарт не говорит, поэтому
      // места после нас безымянные: назвать их значило бы решить за чарт,
      // с какого стула пришёл 3бет.
      const before = MTT_SEATS.slice(0, MTT_SEATS.indexOf(p.position));
      const after = MTT_SEATS.length - before.length - 2;
      return fromSlots(
        [
          ...before.map((id) => ({ seat: seat(id), step: FOLD })),
          {
            seat: seat(p.position, p.position, { hero: true }),
            step: { kind: "raise", label: "Опен 2bb", amount: 2 },
          },
          ...folded(1, after),
          {
            seat: vague("villain", "3бет"),
            step: { kind: "3bet", label: "3бет 5-7bb", amount: 6 },
          },
        ],
        p.position,
        { stack: "40bb+" },
      );
    }

    case "MTTBBDEF": {
      // Опенер задан группой мест («ранние»), поэтому и он, и те, кто сдал
      // после него, остаются безымянными: конкретный стул чарт не называет.
      const who = p.position.replace(/^vs\s+/, "");
      return fromSlots(
        [
          ...folded(1, 2),
          {
            seat: vague("opener", who),
            step: { kind: "raise", label: "Рейз 2-2.2bb", amount: 2.2 },
          },
          ...folded(3, 3),
          { seat: unknown(6), blind: 0.5, step: FOLD },
          { seat: seat("BB", "BB (вы)", { hero: true }), blind: 1 },
        ],
        "BB",
      );
    }

    case "MTTPUSH": {
      const { seat: hero, stack } = seatAndStack(p.position);
      const order = mttOrder(hero);
      const b = withBlinds(ring(order, hero, undefined, EARLY_PAD), order);
      return { seats: b.seats, heroId: hero, steps: b.steps, stack };
    }

    case "MTT3BETPUSH": {
      const [heroPart, openerPart] = p.position.split(" vs ");
      const opener = {
        seat: vague("opener", `опенер · ${openerPart}`),
        step: { kind: "raise" as const, label: "Рейз 2bb", amount: 2 },
      };
      const hero = { ...vague("hero", `Вы · ${heroPart.toLowerCase()}`), hero: true };
      // «Блайнды vs …» — мы на блайнде, значит сидим последними и второй
      // блайнд к нашему решению уже сдал.
      if (heroPart === "Блайнды") {
        return fromSlots(
          [
            ...folded(1, 4),
            opener,
            { seat: unknown(5), step: FOLD },
            { seat: unknown(6), blind: 0.5, step: FOLD },
            { seat: hero, blind: 1 },
          ],
          "hero",
          { stack: "16-22bb" },
        );
      }
      return fromSlots(
        [
          ...folded(1, 2),
          opener,
          { seat: hero },
          ...waiting(3, 2),
          { seat: seat("SB"), blind: 0.5 },
          { seat: seat("BB"), blind: 1 },
        ],
        "hero",
        { stack: "16-22bb" },
      );
    }
  }
}

/** Банк после всех показанных шагов — то, на что мы принимаем решение. */
export function potAfter(steps: SceneStep[], upTo: number): number {
  const bySeat = new Map<string, number>();
  for (const s of steps.slice(0, upTo)) {
    if (s.kind === "fold" || s.kind === "check") continue;
    // Ставка не складывается, а поднимается до суммы: рейз «до 3bb» после
    // своего же блайнда кладёт 3bb всего, а не 3.5.
    bySeat.set(s.seat, Math.max(bySeat.get(s.seat) ?? 0, s.amount ?? 0));
  }
  let pot = 0;
  for (const v of bySeat.values()) pot += v;
  return Math.round(pot * 10) / 10;
}
