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
    return withBlinds(ring(order, heroSeat, { seat: order[heroIdx - 1], ...limp }), order);
  }
  const full = ["limper", ...order];
  return withBlinds(
    ring(full, heroSeat, { seat: "limper", ...limp }, { limper: vague("limper", "лимпер") }),
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
      // Ширина опена задана процентом, место соперника неизвестно.
      const seats = [
        vague("opener", `опен ${percentOf(p)}%`),
        seat("hero", "Вы · в позиции", { hero: true }),
      ];
      return {
        seats,
        heroId: "hero",
        steps: [{ seat: "opener", kind: "raise", label: "Рейз", amount: 2.5 }],
      };
    }

    case "DEF3BETIP":
    case "DEF3BETOOP": {
      const ip = g === "DEF3BETIP";
      const sbVsBb = p.position.includes("SB vs BB");
      const heroLabel = sbVsBb ? "SB (вы)" : ip ? "Вы · в позиции" : "Вы · вне позиции";
      const opLabel = sbVsBb ? "BB · 3бет 18%" : `3бет ${percentOf(p)}%`;
      // В позиции мы, если 3бет пришёл с блайнда — соперник ходит после нас
      // только в порядке улицы, а на префлопе он всё равно уже ответил.
      const seats = [
        seat("hero", heroLabel, { hero: true, exact: sbVsBb }),
        vague("villain", opLabel),
      ];
      return {
        seats,
        heroId: "hero",
        steps: [
          { seat: "hero", kind: "raise", label: "Опен", amount: sbVsBb ? 3 : 2.5 },
          { seat: "villain", kind: "3bet", label: "3бет", amount: 11 },
        ],
      };
    }

    case "BLINDS4BET": {
      const sbVsBb = p.position.includes("BB vs SB");
      const { seat: op, size } = sbVsBb ? { seat: "SB", size: 3 } : openerOf(p);
      const hero = sbVsBb ? "BB" : "blind";
      // Кто именно из блайндов 3бетнул, чарт не уточняет — кроме «BB vs SB».
      const seats: SceneSeat[] = sbVsBb
        ? [seat("SB", "SB"), seat("BB", "BB (вы)", { hero: true })]
        : [seat(op, op), { ...vague("blind", "Вы · блайнд"), hero: true }];
      return {
        seats,
        heroId: hero,
        steps: [
          { seat: op, kind: "raise", label: `Рейз ${size}bb`, amount: size },
          { seat: hero, kind: "3bet", label: "3бет", amount: 12 },
          { seat: op, kind: "4bet", label: "4бет", amount: 27 },
        ],
      };
    }

    case "MTTRFI": {
      const b = withBlinds(ring(MTT_SEATS, p.position), MTT_SEATS);
      return { seats: b.seats, heroId: p.position, steps: b.steps, stack: "25bb+" };
    }

    case "MTTISO": {
      if (p.position === "vs 2+") {
        const seats = [
          vague("limp1", "лимпер"),
          vague("limp2", "лимпер"),
          seat("hero", "Вы", { hero: true }),
        ];
        return {
          seats,
          heroId: "hero",
          steps: [
            { seat: "limp1", kind: "limp", label: "Лимп", amount: 1 },
            { seat: "limp2", kind: "limp", label: "Лимп", amount: 1 },
          ],
        };
      }
      // В MTT-паке первая ранняя позиция подписана просто «EP».
      const order = p.position === "EP" ? ["EP", ...MTT_SEATS.slice(2)] : MTT_SEATS;
      const b = isoRing(order, p.position);
      return { seats: b.seats, heroId: p.position, steps: b.steps };
    }

    case "MTTVSRFI": {
      // Место героя чарт задаёт группой («Ранние»), кроме отдельного чарта SB.
      const sb = p.position === "SB";
      const heroLabel = sb ? "SB (вы)" : `Вы · ${p.position.toLowerCase()}`;
      const seats: SceneSeat[] = [
        vague("opener", "опенер"),
        { ...seat("hero", heroLabel, { hero: true }), exact: sb },
      ];
      return {
        seats,
        heroId: "hero",
        steps: [{ seat: "opener", kind: "raise", label: "Рейз 2bb", amount: 2 }],
        stack: "40bb+",
      };
    }

    case "MTTDEF3BET": {
      const seats = [seat(p.position, p.position, { hero: true }), vague("villain", "3бет")];
      return {
        seats,
        heroId: p.position,
        steps: [
          { seat: p.position, kind: "raise", label: "Опен 2bb", amount: 2 },
          { seat: "villain", kind: "3bet", label: "3бет 5-7bb", amount: 6 },
        ],
        stack: "40bb+",
      };
    }

    case "MTTBBDEF": {
      const who = p.position.replace(/^vs\s+/, "");
      const seats = [vague("opener", who), seat("BB", "BB (вы)", { hero: true })];
      return {
        seats,
        heroId: "BB",
        steps: [
          { seat: "BB", kind: "blind", label: "BB", amount: 1 },
          { seat: "opener", kind: "raise", label: "Рейз 2-2.2bb", amount: 2.2 },
        ],
      };
    }

    case "MTTPUSH": {
      const { seat: hero, stack } = seatAndStack(p.position);
      const order = MTT_SEATS.includes(hero) ? MTT_SEATS : [hero, ...MTT_SEATS.slice(2)];
      const b = withBlinds(ring(order, hero), order);
      return { seats: b.seats, heroId: hero, steps: b.steps, stack };
    }

    case "MTT3BETPUSH": {
      const [heroPart, openerPart] = p.position.split(" vs ");
      const seats: SceneSeat[] = [
        vague("opener", `опенер · ${openerPart}`),
        { ...vague("hero", `Вы · ${heroPart.toLowerCase()}`), hero: true },
      ];
      return {
        seats,
        heroId: "hero",
        steps: [{ seat: "opener", kind: "raise", label: "Рейз 2bb", amount: 2 }],
        stack: "16-22bb",
      };
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
