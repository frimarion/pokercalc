// Спот тренажёра как СТОЛ, а не как строчка текста: кто где сидит, кто что
// успел сделать до нас и на какой сумме мы принимаем решение. Из этого
// `ui/PokerTable.tsx` рисует стол и проигрывает действия по очереди.
//
// Главное правило то же, что и в дереве событий: НЕ ВЫДУМЫВАТЬ ДАННЫХ.
// Если чарт задан процентом («защита от 3бета 12%») или группой позиций
// («vs ранние»), сам чарт места соперника не называет — это остаётся в `note`
// («3бет 12%», «ранние») и помечается `exact: false`.
//
// Но позиция у места есть всегда. Стол полный (6 или 8 мест), порядок посадки
// известен, блайнды сидят последними — значит, стоит посадить героя, и места
// всех остальных определены однозначно. Поэтому позиции не «?», а выводятся из
// посадки (`finalize`), и оттуда же берётся баттон. Там, где чарт задан
// группой, герой садится на стул своей же группы (`MTT_HERO_SEAT`), иначе
// выведенная позиция спорила бы с подписью чарта.

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
  /** Позиция за столом. Известна всегда — выводится из посадки. */
  pos: string;
  /** Что о месте говорит сам чарт: «3бет 12%», «ранние», «лимпер». */
  note?: string;
  hero: boolean;
  /** Позицию назвал чарт. Иначе она выведена из посадки — одна из возможных. */
  exact: boolean;
  /** Стек на начало раздачи, bb. */
  stack: number;
}

/** Место до того, как посадка раздаст позиции и стеки. */
type RawSeat = Omit<SceneSeat, "pos" | "stack">;

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
  /** Место с баттоном. */
  buttonId: string;
  /** Действия до хода героя — проигрываются по очереди. */
  steps: SceneStep[];
  /**
   * Анте, bb. В MTT это big blind ante: за стол его платит один BB, и в банке
   * он лежит ещё до первого решения. В кэше анте нет — там 0.
   */
  ante: number;
  /** Глубина стека, если она часть спота (MTT). */
  stack?: string;
  /** Она же числом, bb: у кэша 100. */
  startStack: number;
}

const CASH_SEATS = ["UTG", "MP", "CO", "BU", "SB", "BB"];
/** MTT-пак FF START — 8-max; на 6-max первая позиция MP, но чарты общие. */
const MTT_SEATS = ["EP+1", "EP+2", "MP", "HJ", "CO", "BU", "SB", "BB"];

/** Сайзинг опена по Green Charts: CO и BU открывают 2.5bb, остальные 3bb. */
function cashOpenSize(seat: string): number {
  return seat === "CO" || seat === "BU" ? 2.5 : 3;
}

/**
 * 3бет считается от опена и зависит от позиции 3бетора: вне позиции ×4, в
 * позиции ×3 — вне позиции приходится брать банк дороже. Позиция здесь та же,
 * что и в названии чарта: «защита от 3бета в позиции» значит, что 3бетнул тот,
 * кто сидит вне позиции.
 */
function threeBetSize(open: number, inPosition: boolean): number {
  return open * (inPosition ? 3 : 4);
}

/** 4бет опенера — примерно 2.4 от 3бета, до половины блайнда. */
function fourBetSize(threeBet: number): number {
  return Math.round(threeBet * 2.4 * 2) / 2;
}

/**
 * Глубина каждого диапазона из пака — одним числом, чтобы за столом стояла
 * конкретная сумма. Середина диапазона годится не везде: на «0-9bb» она даёт
 * 5bb, а это уже не спот, а формальность — с такого стека пуш-фолд перестаёт
 * быть выбором. Поэтому на коротких глубинах взята рабочая часть диапазона
 * (8bb и 12bb), а у открытых сверху — нижняя граница, на ней чарт и
 * начинает работать.
 */
const MTT_STACK_BB: Record<string, number> = {
  "0-9bb": 8,
  "10-14bb": 12,
  "16-22bb": 19,
  "25bb+": 25,
  "40bb+": 40,
};

/** Стек числом. У кэша он один — 100bb, в MTT задан глубиной спота. */
function stackBb(stack?: string): number {
  if (!stack) return 100;
  const known = MTT_STACK_BB[stack];
  if (known !== undefined) return known;
  // Незнакомая подпись: середина диапазона либо единственное число в ней.
  const nums = (stack.match(/\d+/g) ?? []).map(Number);
  if (nums.length === 0) return 100;
  return nums.length > 1 ? Math.round((nums[0] + nums[1]) / 2) : nums[0];
}

/**
 * Раздать позиции по посадке и собрать сцену. Мест ровно столько, сколько за
 * столом, поэтому i-е место — это i-я позиция, а баттон находится по позиции.
 *
 * Блайнды выставляются здесь же, а не в каждом чарте: их ставят правила стола,
 * а не спот. Пока это было делом каждого билдера, в MTT-защите от 3бета их
 * просто забыли поставить — на столе без стеков это было незаметно.
 */
function finalize(
  seats: RawSeat[],
  heroId: string,
  steps: SceneStep[],
  stack?: string,
): Scene {
  const order = seats.length > CASH_SEATS.length ? MTT_SEATS : CASH_SEATS;
  const bb = stackBb(stack);
  const full = seats.map((s, i): SceneSeat => ({ ...s, pos: order[i], stack: bb }));
  const blinds: SceneStep[] = [];
  for (const [pos, amount] of [["SB", 0.5], ["BB", 1]] as const) {
    const s = full.find((x) => x.pos === pos);
    if (s) blinds.push({ seat: s.id, kind: "blind", label: pos, amount });
  }
  const button = full.find((s) => s.pos === "BU") ?? full[0];
  return {
    seats: full,
    heroId,
    buttonId: button.id,
    steps: [...blinds, ...steps],
    // Восемь мест — это MTT-пак, а он весь считается с big blind ante.
    ante: order === MTT_SEATS ? 1 : 0,
    stack,
    startStack: bb,
  };
}

interface Builder {
  seats: RawSeat[];
  steps: SceneStep[];
}

function seat(id: string, extra: Partial<RawSeat> = {}): RawSeat {
  return { id, hero: false, exact: true, ...extra };
}

/** Место соперника, заданное не позицией, а описанием («ранние», «3бет 12%»). */
function vague(id: string, note: string, extra: Partial<RawSeat> = {}): RawSeat {
  return { id, note, hero: false, exact: false, ...extra };
}

/**
 * Безымянное место. За столом всегда шесть (кэш) или восемь (MTT) игроков, и
 * они не исчезают оттого, что чарт задан процентом. Своей подписи у такого
 * места нет — только позиция, выведенная из посадки, и та приглушена.
 */
function unknown(i: number): RawSeat {
  return { id: `seat${i}`, hero: false, exact: false };
}

/**
 * Стол из мест по кругу: все до опенера сдают, опенер (если есть) ставит,
 * все между опенером и героем сдают. Возвращает места в порядке хода.
 */
function ring(
  order: string[],
  heroSeat: string,
  opener?: { seat: string; kind: SceneActionKind; label: string; amount: number },
  /** Правки мест, которых чарт на самом деле не называет: лимпер, «EP» и т.п. */
  marks: Record<string, Partial<RawSeat>> = {},
): Builder {
  const heroIdx = order.indexOf(heroSeat);
  const openerIdx = opener ? order.indexOf(opener.seat) : -1;
  const seats: RawSeat[] = [];
  const steps: SceneStep[] = [];
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    seats.push(seat(id, { hero: id === heroSeat, ...marks[id] }));
    if (id === heroSeat) continue;
    if (i === openerIdx) {
      steps.push({ seat: id, kind: opener!.kind, label: opener!.label, amount: opener!.amount });
    } else if (i < heroIdx) {
      steps.push({ seat: id, kind: "fold", label: "Фолд" });
    }
  }
  return { seats, steps };
}

const FOLD = { kind: "fold" as const, label: "Фолд" };

/**
 * Часть MTT-чартов подписана просто «EP» — это одна из ранних позиций, но
 * какая именно, пак не уточняет. Стол при этом всё равно восьмиместный,
 * поэтому перед таким героем садится ранний стул, чью позицию мы вывели сами.
 */
const EARLY_PAD: Record<string, Partial<RawSeat>> = { early: { exact: false } };

function mttOrder(heroSeat: string): string[] {
  return MTT_SEATS.includes(heroSeat)
    ? MTT_SEATS
    : ["early", heroSeat, ...MTT_SEATS.slice(2)];
}

/**
 * Стул для чарта, заданного группой мест. Конкретной позиции пак не называет,
 * но посадить героя надо внутрь его же группы: иначе выведенная из посадки
 * позиция будет спорить с подписью чарта («Ранние», а сидит на HJ).
 */
const MTT_HERO_SEAT: [string, string][] = [
  ["ранн", "EP+2"],
  ["средн", "MP"],
  ["поздн", "BU"],
  ["блайнд", "BB"],
];
/** Опенер той же группы садится раньше героя — он же ходил до нас. */
const MTT_OPENER_SEAT: [string, string][] = [
  ["ранн", "EP+1"],
  ["средн", "MP"],
  ["поздн", "CO"],
];

function groupSeat(table: [string, string][], text: string, fallback: string): string {
  const t = text.toLowerCase().replace(/^vs\s+/, "");
  return table.find(([k]) => t.startsWith(k))?.[1] ?? fallback;
}

interface Slot {
  seat: RawSeat;
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
 * Сцена из мест в порядке хода: ходы идут в порядке посадки, `extra` — то, что
 * случилось после круга (ответ опенера на наш 3бет). Блайнды доставит
 * `finalize` — они одинаковы во всех спотах.
 */
function fromSlots(
  slots: Slot[],
  heroId: string,
  opts: { extra?: SceneStep[]; stack?: string } = {},
): Scene {
  const acts = slots
    .filter((s) => s.step)
    .map((s): SceneStep => ({ seat: s.seat.id, ...s.step! }));
  return finalize(
    slots.map((s) => s.seat),
    heroId,
    [...acts, ...(opts.extra ?? [])],
    opts.stack,
  );
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
 * такого стула нет, и лимпер садится отдельным местом: сажать позади себя
 * выдуманное «EP+0» было бы хуже.
 */
function isoRing(order: string[], heroSeat: string): Builder {
  const heroIdx = order.indexOf(heroSeat);
  const limp = { kind: "limp" as const, label: "Лимп", amount: 1 };
  if (heroIdx > 0) {
    const limper = order[heroIdx - 1];
    return ring(order, heroSeat, { seat: limper, ...limp }, {
      ...EARLY_PAD,
      [limper]: { note: "лимпер", exact: false },
    });
  }
  const full = ["limper", ...order];
  return ring(full, heroSeat, { seat: "limper", ...limp }, {
    ...EARLY_PAD,
    limper: { note: "лимпер", exact: false },
  });
}

export function sceneFor(p: RangePreset): Scene {
  const g: PresetGroup = p.group;

  switch (g) {
    case "RFI": {
      const b = ring(CASH_SEATS, p.position);
      return finalize(b.seats, p.position, b.steps);
    }

    case "ISO": {
      const b = isoRing(CASH_SEATS, p.position);
      return finalize(b.seats, p.position, b.steps);
    }

    case "SB3BET":
    case "BBDEF": {
      const hero = g === "SB3BET" ? "SB" : "BB";
      const { seat: op, size } = openerOf(p);
      const b = ring(CASH_SEATS, hero, {
        seat: op,
        kind: "raise",
        label: `Рейз ${size}bb`,
        amount: size,
      });
      // На BB между опенером и нами есть ещё SB — он сдаёт (ring это уже сделал).
      return finalize(b.seats, hero, b.steps);
    }

    case "3BETIP": {
      // Ширина опена задана процентом, место соперника чарт не называет — но
      // стол от этого не пустеет: двое сдали до опенера, блайнды сидят позади
      // нас и ещё не ходили, потому что мы в позиции. А раз известны блайнды
      // и наше место, то и позиция опенера определена посадкой.
      return fromSlots(
        [
          ...folded(1, 2),
          {
            seat: vague("opener", `опен ${percentOf(p)}%`),
            step: { kind: "raise", label: "Рейз", amount: 2.5 },
          },
          { seat: seat("hero", { hero: true, note: "в позиции" }) },
          { seat: seat("SB") },
          { seat: seat("BB") },
        ],
        "hero",
      );
    }

    case "DEF4BETIP": {
      // Тот же стол, что и в 3BETIP, только раздача ушла на шаг дальше: мы уже
      // 3бетнули в позиции, блайнды позади нас сдали, и опенер ответил 4бетом.
      const open = 2.5;
      const my3bet = threeBetSize(open, true);
      const their4bet = fourBetSize(my3bet);
      return fromSlots(
        [
          ...folded(1, 2),
          {
            seat: vague("opener", `опен ${percentOf(p)}%`),
            step: { kind: "raise", label: `Рейз ${open}bb`, amount: open },
          },
          {
            seat: seat("hero", { hero: true, note: "в позиции" }),
            step: { kind: "3bet", label: `3бет ${my3bet}bb`, amount: my3bet },
          },
          { seat: seat("SB"), step: FOLD },
          { seat: seat("BB"), step: FOLD },
        ],
        "hero",
        {
          extra: [
            {
              seat: "opener",
              kind: "4bet",
              label: `4бет ${their4bet}bb`,
              amount: their4bet,
            },
          ],
        },
      );
    }

    case "DEF3BETIP":
    case "DEF3BETOOP": {
      const pct = percentOf(p);
      // Отдельный чарт «SB vs BB» — единственный на этих страницах, где места
      // названы: там и стол собирается из настоящих позиций.
      if (p.position.includes("SB vs BB")) {
        // Блайнд на блайнд: 3бетит BB, а он к опену SB как раз в позиции.
        const bb3bet = threeBetSize(3, true);
        return fromSlots(
          [
            ...folded(1, 4),
            {
              seat: seat("SB", { hero: true }),
              step: { kind: "raise", label: "Опен 3bb", amount: 3 },
            },
            {
              seat: seat("BB", { note: `3бет ${pct}%` }),
              step: { kind: "3bet", label: `3бет ${bb3bet}bb`, amount: bb3bet },
            },
          ],
          "SB",
        );
      }
      const openSize = 2.5;
      // Наша позиция задана группой чарта, у 3бетора она противоположна.
      const villainSize = threeBetSize(openSize, g === "DEF3BETOOP");
      const villain = {
        seat: vague("villain", `3бет ${pct}%`),
        step: {
          kind: "3bet" as const,
          label: `3бет ${villainSize}bb`,
          amount: villainSize,
        },
      };
      const open = { kind: "raise" as const, label: `Опен ${openSize}bb`, amount: openSize };
      if (g === "DEF3BETIP") {
        // В позиции мы остаёмся, только если 3бет пришёл с блайнда: иначе
        // 3бетор сидел бы после нас. Значит, второй блайнд уже сдал.
        return fromSlots(
          [
            ...folded(1, 3),
            { seat: vague("hero", "в позиции", { hero: true }), step: open },
            { seat: unknown(4), step: FOLD },
            { ...villain },
          ],
          "hero",
        );
      }
      // Вне позиции: 3бетор сидит после нас, а блайнды сдают уже после его
      // 3бета — и это видно на столе, ход возвращается к нам последними.
      return fromSlots(
        [
          ...folded(1, 2),
          { seat: vague("hero", "вне позиции", { hero: true }), step: open },
          villain,
          { seat: unknown(3), step: FOLD },
          { seat: unknown(4), step: FOLD },
        ],
        "hero",
      );
    }

    case "BLINDS4BET": {
      const sbVsBb = p.position.includes("BB vs SB");
      const { seat: op, size } = sbVsBb ? { seat: "SB", size: 3 } : openerOf(p);
      const hero = sbVsBb ? "BB" : "blind";
      const raise = { kind: "raise" as const, label: `Рейз ${size}bb`, amount: size };
      // 3бетим мы: против опена с блайнда — вне позиции, и только на BB против
      // SB оказываемся в позиции.
      const my3bet = threeBetSize(size, sbVsBb);
      const my4bet = fourBetSize(my3bet);
      const threeBet = { kind: "3bet" as const, label: `3бет ${my3bet}bb`, amount: my3bet };
      const answer: SceneStep = {
        seat: op,
        kind: "4bet",
        label: `4бет ${my4bet}bb`,
        amount: my4bet,
      };

      if (sbVsBb) {
        return fromSlots(
          [
            ...folded(1, 4),
            { seat: seat("SB"), step: raise },
            { seat: seat("BB", { hero: true }), step: threeBet },
          ],
          "BB",
          { extra: [answer] },
        );
      }
      // Место опенера чарт называет, а вот с какого блайнда мы 3бетнули — нет.
      // Поэтому места до опенера настоящие (они сдали), а нашу подпись держит
      // `note`: за столом мы сидим на BB, но чарт годится для обоих блайндов.
      const before = CASH_SEATS.slice(0, CASH_SEATS.indexOf(op));
      const between = CASH_SEATS.slice(CASH_SEATS.indexOf(op) + 1, CASH_SEATS.indexOf("SB"));
      return fromSlots(
        [
          ...before.map((id) => ({ seat: seat(id), step: FOLD })),
          { seat: seat(op), step: raise },
          ...between.map((id) => ({ seat: seat(id), step: FOLD })),
          { seat: unknown(1), step: FOLD },
          { seat: vague("blind", "с любого блайнда", { hero: true }), step: threeBet },
        ],
        hero,
        { extra: [answer] },
      );
    }

    case "MTTRFI": {
      const b = ring(MTT_SEATS, p.position);
      return finalize(b.seats, p.position, b.steps, "25bb+");
    }

    case "MTTISO": {
      if (p.position === "vs 2+") {
        // Чарт общий для всех позиций, поэтому не названо ни наше место, ни
        // места лимперов — но за столом всё равно восемь человек, и посадка
        // задаёт им позиции: двое влимпили прямо перед нами.
        const limp = { kind: "limp" as const, label: "Лимп", amount: 1 };
        return fromSlots(
          [
            ...folded(1, 2),
            { seat: vague("limp1", "лимпер"), step: limp },
            { seat: vague("limp2", "лимпер"), step: limp },
            { seat: vague("hero", "любое место", { hero: true }) },
            ...waiting(3, 1),
            { seat: seat("SB") },
            { seat: seat("BB") },
          ],
          "hero",
        );
      }
      const b = isoRing(mttOrder(p.position), p.position);
      return finalize(b.seats, p.position, b.steps);
    }

    case "MTTVSRFI": {
      // Место героя чарт задаёт группой («Ранние»), кроме отдельного чарта SB.
      const open = { kind: "raise" as const, label: "Рейз 2bb", amount: 2 };
      if (p.position === "SB") {
        return fromSlots(
          [
            ...folded(1, 5),
            { seat: vague("opener", "опенер"), step: open },
            { seat: seat("SB", { hero: true }) },
            { seat: seat("BB") },
          ],
          "SB",
          { stack: "40bb+" },
        );
      }
      // Герой садится на стул своей группы, опенер — прямо перед ним.
      const hero = groupSeat(MTT_HERO_SEAT, p.position, "MP");
      const opener = MTT_SEATS[MTT_SEATS.indexOf(hero) - 1];
      const b = ring(MTT_SEATS, hero, { seat: opener, ...open }, {
        [hero]: { note: p.position.toLowerCase(), exact: false },
        [opener]: { note: "опенер", exact: false },
      });
      return finalize(b.seats, hero, b.steps, "40bb+");
    }

    case "MTTDEF3BET": {
      // Наше место чарт называет, значит места до нас тоже известны — они
      // сдали. А вот кто из оставшихся 3бетнул, чарт не говорит: 3бетор садится
      // последним из тех, кто ещё мог ходить, и его подпись остаётся «3бет».
      const before = MTT_SEATS.slice(0, MTT_SEATS.indexOf(p.position));
      const after = MTT_SEATS.length - before.length - 2;
      return fromSlots(
        [
          ...before.map((id) => ({ seat: seat(id), step: FOLD })),
          {
            seat: seat(p.position, { hero: true }),
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
      // Опенер задан группой мест («ранние») — сажаем его на стул этой группы,
      // а те, кто сдал после него, остаются без своей подписи.
      const who = p.position.replace(/^vs\s+/, "");
      const opener = groupSeat(MTT_OPENER_SEAT, who, "CO");
      const b = ring(
        MTT_SEATS,
        "BB",
        { seat: opener, kind: "raise", label: "Рейз 2-2.2bb", amount: 2.2 },
        { [opener]: { note: who, exact: false } },
      );
      return finalize(b.seats, "BB", b.steps);
    }

    case "MTTPUSH": {
      const { seat: hero, stack } = seatAndStack(p.position);
      const order = mttOrder(hero);
      const b = ring(order, hero, undefined, EARLY_PAD);
      return finalize(b.seats, hero, b.steps, stack);
    }

    case "MTT3BETPUSH": {
      const [heroPart, openerPart] = p.position.split(" vs ");
      const hero = groupSeat(MTT_HERO_SEAT, heroPart, "BU");
      const opener = groupSeat(MTT_OPENER_SEAT, openerPart, "CO");
      const b = ring(
        MTT_SEATS,
        hero,
        { seat: opener, kind: "raise", label: "Рейз 2bb", amount: 2 },
        {
          [hero]: { note: heroPart.toLowerCase(), exact: false },
          [opener]: { note: `опенер · ${openerPart}`, exact: false },
        },
      );
      return finalize(b.seats, hero, b.steps, "16-22bb");
    }
  }
}

/**
 * Банк после всех показанных шагов — то, на что мы принимаем решение. Анте
 * лежит в банке с самого начала: его ставят до раздачи, а не в свою очередь.
 */
export function potAfter(steps: SceneStep[], upTo: number, ante = 0): number {
  const bySeat = new Map<string, number>();
  for (const s of steps.slice(0, upTo)) {
    if (s.kind === "fold" || s.kind === "check") continue;
    // Ставка не складывается, а поднимается до суммы: рейз «до 3bb» после
    // своего же блайнда кладёт 3bb всего, а не 3.5.
    bySeat.set(s.seat, Math.max(bySeat.get(s.seat) ?? 0, s.amount ?? 0));
  }
  let pot = ante;
  for (const v of bySeat.values()) pot += v;
  return Math.round(pot * 10) / 10;
}
