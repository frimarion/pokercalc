// Решатель пуш-фолда по ICM — то, что делает ICMIZER.
//
// Игра: игроки по очереди (от первого к BB) либо пушат, либо фолдят. Первый
// пуш получает ответы остальных: колл или фолд. Коллер — максимум ОДИН: после
// колла все, кто сзади, фолдят. Это стандартное упрощение быстрых пуш-фолд
// калькуляторов; оверколлы на коротких стеках редки, а трёхсторонняя таблица
// эквити заняла бы десятки мегабайт.
//
// Стратегия — частота пуша/колла у каждой из 169 рук в каждом узле:
//   push[i]       — i открывает пушем, до него все сфолдили;
//   call[i][j]    — j коллирует пуш i, между ними все сфолдили.
//
// Все исходы раздачи (кто кого выбил, кто украл блайнды) — конечный список
// векторов стеков. ICM по ним считается ОДИН раз до итераций, а внутри
// итераций меняются только вероятности. Поэтому решение укладывается в
// ~0.1 с на хедз-апе и ~1 с на девяти игроках.
//
// Равновесие ищется фиктивной игрой (fictitious play): на каждой итерации
// каждый узел отвечает наилучшим образом на СРЕДНИЕ стратегии остальных, и
// средняя сдвигается к этому ответу (с линейным усреднением, см. step). В хедз-апе это доказанно сходится к
// Нэшу; на многих игроках — практически сходится, так делает и ICMIZER.
//
// Карточные блокеры учтены между пушером и коллером (таблица эквити
// считалась по непересекающимся комбо, веса — по числу совместимых пар комбо),
// но не с третьими игроками.

import { ALL_COMBOS, comboIndicesForLabel, gridCells } from "../engine/combos";
import { icmValues } from "./icm";
import { PREFLOP_EQUITY_B64 } from "./preflopEquity";

export const HAND_LABELS: string[] = gridCells().flat().map((c) => c.label);
export const H = HAND_LABELS.length; // 169

// ─── Таблицы по рукам ───────────────────────────────────────────────────

let EQ: Float32Array | null = null;
let PAIRS: Float32Array | null = null;
let PRIOR: Float32Array | null = null;

/** Эквити класса h против класса g. */
export function equityTable(): Float32Array {
  if (EQ) return EQ;
  const bin = atob(PREFLOP_EQUITY_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const u16 = new Uint16Array(bytes.buffer);
  EQ = new Float32Array(H * H);
  for (let i = 0; i < H * H; i++) EQ[i] = u16[i] / 65535;
  // Класс против самого себя — ровно 50% по симметрии мастей, без шума MC.
  for (let h = 0; h < H; h++) EQ[h * H + h] = 0.5;
  return EQ;
}

/** Число НЕ пересекающихся пар комбо классов h и g (AA×AA = 1, AKo×AKo = 84…). */
export function pairCounts(): Float32Array {
  if (PAIRS) return PAIRS;
  const combos = HAND_LABELS.map((l) => comboIndicesForLabel(l).map((i) => ALL_COMBOS[i]));
  PAIRS = new Float32Array(H * H);
  for (let h = 0; h < H; h++) {
    for (let g = h; g < H; g++) {
      let n = 0;
      for (const a of combos[h])
        for (const b of combos[g])
          if (a[0] !== b[0] && a[0] !== b[1] && a[1] !== b[0] && a[1] !== b[1]) n++;
      PAIRS[h * H + g] = PAIRS[g * H + h] = n;
    }
  }
  return PAIRS;
}

/** Доля класса среди 1326 комбо: пара 6, suited 4, offsuit 12. */
export function handPrior(): Float32Array {
  if (PRIOR) return PRIOR;
  PRIOR = new Float32Array(H);
  HAND_LABELS.forEach((l, h) => (PRIOR![h] = comboIndicesForLabel(l).length / 1326));
  return PRIOR;
}

/** Эквити класса h против диапазона (веса по 169 классам) с учётом блокеров. */
export function equityVsRange(h: number, range: ArrayLike<number>): number {
  const eq = equityTable();
  const n = pairCounts();
  let num = 0;
  let den = 0;
  for (let g = 0; g < H; g++) {
    const w = n[h * H + g] * range[g];
    num += w * eq[h * H + g];
    den += w;
  }
  return den > 0 ? num / den : 0.5;
}

// ─── Постановка ─────────────────────────────────────────────────────────

export interface PushFoldInput {
  /** Стеки в порядке префлоп-хода: первый ходящий … SB, BB. На двоих — SB(BU), BB. */
  stacks: number[];
  sb: number;
  bb: number;
  ante: number;
  /** "bb" — анте платит только BB (big blind ante), "each" — каждый. */
  anteMode: "bb" | "each";
  /** Выплата за 1-е, 2-е… место. Игроков за столом = всего осталось в турнире. */
  payouts: number[];
  /** Добавка выбившему за нокаут, в тех же единицах, что и выплаты. */
  koBounty?: number;
  iterations?: number;
}

export interface PushFoldResult {
  positions: string[];
  /** push[i][h] — частота пуша первым с места i (у BB — пусто). */
  push: number[][];
  /** call[i][j][h] — частота колла места j против пуша i (j > i). */
  call: number[][][];
  /** Разница EV пуша и фолда в единицах выплат, по рукам (ICMIZER показывает её цветом). */
  pushMargin: number[][];
  callMargin: number[][][];
  /** ICM-оценка стеков до раздачи. */
  icmBefore: number[];
  /** Ожидаемая оценка каждого, если все играют по найденной стратегии. */
  evAfter: number[];
  /** Сумма изменений стратегий на последних итерациях — индикатор сходимости. */
  residual: number;
  iterations: number;
}

/** Названия мест по числу игроков, в порядке хода. */
export function positionNames(n: number): string[] {
  if (n === 2) return ["SB", "BB"];
  const full = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BU", "SB", "BB"];
  return full.slice(full.length - n);
}

/** Сколько каждый поставил вслепую до решений: [анте, блайнд]. */
export function postings(inp: PushFoldInput): { ante: number[]; blind: number[] } {
  const n = inp.stacks.length;
  const ante = inp.stacks.map((s, i) => {
    if (inp.ante <= 0) return 0;
    if (inp.anteMode === "each") return Math.min(s, inp.ante);
    return i === n - 1 ? Math.min(s, inp.ante) : 0;
  });
  const blind = inp.stacks.map((s, i) => {
    const b = i === n - 1 ? inp.bb : i === n - 2 ? inp.sb : 0;
    return Math.min(s - ante[i], b);
  });
  return { ante, blind };
}

// ─── Решатель ───────────────────────────────────────────────────────────

export function solvePushFold(inp: PushFoldInput): PushFoldResult {
  const n = inp.stacks.length;
  if (n < 2 || n > 9) throw new Error("Игроков за столом должно быть от 2 до 9");
  const S = inp.stacks;
  const { ante, blind } = postings(inp);
  const posted = S.map((_, i) => ante[i] + blind[i]);
  const bounty = inp.koBounty ?? 0;
  const iters = inp.iterations ?? 400;

  const icm = (stacks: number[]) => icmValues(stacks, inp.payouts);

  // Все забирают блайнды и анте без вскрытия: i пушнул, остальные сфолдили
  // (или все сфолдили до BB — тогда «пушер» это BB).
  const steal: number[][] = [];
  for (let i = 0; i < n; i++) {
    const st = S.map((s, k) => s - posted[k]);
    st[i] = S[i] + posted.reduce((a, p, k) => (k === i ? a : a + p), 0);
    steal.push(icm(st));
  }

  // Вскрытие i против j: исход «победил i» и «победил j». Ничья в эквити
  // уже сидит половиной, делёж банка отдельно не разбирается.
  const win: number[][][] = []; // win[i][j] — вектор оценок, если выиграл i
  const lose: number[][][] = []; // lose[i][j] — если выиграл j
  for (let i = 0; i < n; i++) {
    win.push([]);
    lose.push([]);
    for (let j = 0; j < n; j++) {
      if (j <= i) {
        win[i].push([]);
        lose[i].push([]);
        continue;
      }
      const m = Math.min(S[i] - ante[i], S[j] - ante[j]);
      const inv_i = ante[i] + m;
      const inv_j = ante[j] + m;
      const pot = posted.reduce((a, p, k) => (k === i || k === j ? a : a + p), 0) + inv_i + inv_j;
      const base = S.map((s, k) => s - posted[k]);
      base[i] = S[i] - inv_i;
      base[j] = S[j] - inv_j;
      const wi = [...base];
      wi[i] += pot;
      const wj = [...base];
      wj[j] += pot;
      const vi = icm(wi);
      if (wi[j] <= 0) vi[i] += bounty;
      const vj = icm(wj);
      if (wj[i] <= 0) vj[j] += bounty;
      win[i].push(vi);
      lose[i].push(vj);
    }
  }

  const eq = equityTable();
  const pairs = pairCounts();
  const prior = handPrior();

  // Средние стратегии (результат) и текущий наилучший ответ.
  const push = Array.from({ length: n }, () => new Float64Array(H).fill(0.5));
  const call = Array.from({ length: n }, () => Array.from({ length: n }, () => new Float64Array(H).fill(0.5)));
  const pushMargin = Array.from({ length: n }, () => new Float64Array(H));
  const callMargin = Array.from({ length: n }, () => Array.from({ length: n }, () => new Float64Array(H)));

  const width = (r: Float64Array) => {
    let s = 0;
    for (let h = 0; h < H; h++) s += prior[h] * r[h];
    return s;
  };

  let residual = 0;
  const cont = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => new Float64Array(n)));
  const foldTo = Array.from({ length: n + 1 }, () => new Float64Array(n));
  const tmp = new Float64Array(H);

  for (let t = 0; t < iters; t++) {
    // 1. Оценки поддеревьев при текущих средних стратегиях.
    //    cont[i][k] — i пушнул, до k все сфолдили, ходит k.
    for (let i = 0; i < n - 1; i++) {
      cont[i][n].set(steal[i]);
      for (let k = n - 1; k > i; k--) {
        const pc = width(call[i][k]);
        // Эквити диапазона пуша против диапазона колла.
        let num = 0;
        let den = 0;
        for (let h = 0; h < H; h++) {
          const ph = push[i][h];
          if (ph === 0) continue;
          for (let g = 0; g < H; g++) {
            const w = ph * call[i][k][g] * pairs[h * H + g];
            num += w * eq[h * H + g];
            den += w;
          }
        }
        const e = den > 0 ? num / den : 0.5;
        const next = cont[i][k + 1];
        for (let p = 0; p < n; p++) {
          const sd = e * win[i][k][p] + (1 - e) * lose[i][k][p];
          cont[i][k][p] = pc * sd + (1 - pc) * next[p];
        }
      }
    }
    foldTo[n - 1].set(steal[n - 1]); // все сфолдили до BB
    for (let p = n - 2; p >= 0; p--) {
      const pp = width(push[p]);
      for (let q = 0; q < n; q++) foldTo[p][q] = pp * cont[p][p + 1][q] + (1 - pp) * foldTo[p + 1][q];
    }

    // 2. Наилучшие ответы и сдвиг средних.
    // Линейное усреднение: итерация t входит в среднюю с весом ∝ t. Классическое
    // 1/t держит в средней ранние, заведомо плохие ответы — на 9 игроках после
    // 800 итераций у него оставалось ~50 «смешанных» ячеек, которые на самом
    // деле просто не досходились; с 2/t то же решение выходит за 200.
    const step = 2 / (t + 2);
    residual = 0;

    // Коллер j против пуша i.
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const evFold = cont[i][j + 1][j];
        const vWin = lose[i][j][j]; // j выиграл
        const vLose = win[i][j][j];
        const rng = push[i];
        for (let g = 0; g < H; g++) {
          const e = equityVsRange(g, rng);
          const margin = e * vWin + (1 - e) * vLose - evFold;
          callMargin[i][j][g] = margin;
          const br = margin > 0 ? 1 : 0;
          const d = (br - call[i][j][g]) * step;
          call[i][j][g] += d;
          residual += Math.abs(d);
        }
      }
    }

    // Пушер i: EV пуша по конкретной руке h — с блокерами против каждого коллера.
    for (let i = 0; i < n - 1; i++) {
      const evFold = foldTo[i + 1][i];
      tmp.fill(0);
      const reach = new Float64Array(H).fill(1);
      for (let k = i + 1; k < n; k++) {
        const c = call[i][k];
        for (let h = 0; h < H; h++) {
          let pc = 0; // вероятность колла k при руке h у пушера
          let den = 0;
          let num = 0;
          for (let g = 0; g < H; g++) {
            const pr = pairs[h * H + g];
            den += pr;
            const w = pr * c[g];
            pc += w;
            num += w * eq[h * H + g];
          }
          const e = pc > 0 ? num / pc : 0.5;
          pc = den > 0 ? pc / den : 0;
          tmp[h] += reach[h] * pc * (e * win[i][k][i] + (1 - e) * lose[i][k][i]);
          reach[h] *= 1 - pc;
        }
      }
      for (let h = 0; h < H; h++) {
        const margin = tmp[h] + reach[h] * steal[i][i] - evFold;
        pushMargin[i][h] = margin;
        const br = margin > 0 ? 1 : 0;
        const d = (br - push[i][h]) * step;
        push[i][h] += d;
        residual += Math.abs(d);
      }
    }
  }

  // Итоговая оценка: всё дерево от первого ходящего.
  const evAfter = Array.from(foldTo[0]);

  return {
    positions: positionNames(n),
    push: push.map((r, i) => (i === n - 1 ? [] : Array.from(r))),
    call: call.map((row, i) => row.map((r, j) => (j > i ? Array.from(r) : []))),
    pushMargin: pushMargin.map((r, i) => (i === n - 1 ? [] : Array.from(r))),
    callMargin: callMargin.map((row, i) => row.map((r, j) => (j > i ? Array.from(r) : []))),
    icmBefore: icmValues(S, inp.payouts),
    evAfter,
    residual,
    iterations: iters,
  };
}

/** Доля комбо (0..1), которую покрывает стратегия по 169 рукам. */
export function rangeWidth(r: ArrayLike<number>): number {
  const prior = handPrior();
  let s = 0;
  for (let h = 0; h < H; h++) s += prior[h] * r[h];
  return s;
}
