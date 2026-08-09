// Защита блайндов против опен-пуша на коротком стеке — РАСЧЁТ, а не чарт пака.
//
// FF START даёт только пуш-диапазоны (стр. 7-8), коллирующих в паке нет вовсе.
// Дорисовать их можно честно: пуш-диапазон известен, значит эквити каждой руки
// против него считается, а порог колла — арифметика банка. Это чистый chipEV
// без ICM: структуры выплат у нас нет, а выдумывать её хуже, чем не учитывать.
//
// Результат уезжает в Doyle Academy отдельным файлом (не в mtt-charts.js): тот
// генерируется export_academy.ts из пресетов, и подмешивать в него расчётное
// значило бы стереть границу между оцифровкой пака и нашей производной.
// Тренажёра это не касается — он проверяет ответы на сервере по своей копии
// чартов пака, и расчётные диапазоны туда не попадают.
//
// Запуск (из корня pokercalc):
//   npx vite-node tools/calc_push_defense.ts
//
// ── Порог колла ────────────────────────────────────────────────────────────
// Пушер ставит S. В банке уже лежат блайнды и BB-анте (1bb, как в сценах пака).
//
//   BB: доплата S−1, банк после колла 2S+1.5  → eq ≥ (S−1)/(2S+1.5)
//   SB: доплата S−0.5, банк после колла 2S+2  → eq ≥ (S−0.5)/(2S+2)
//
// SB считается ХЕДЗ-АП, хотя за ним ещё сидит BB: запас на «сзади могут
// проснуться» — это уже поправка вроде ICM, а мы условились без них. В подписи
// чарта это сказано прямо.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Range, gridCells, rangeFromLabels } from "../src/engine/combos";
import { computeEquity } from "../src/engine/equity";
import { ALL_PRESETS } from "../src/presets/all";
import { RangePreset } from "../src/presets/types";

const OUT_ROOT = resolve(process.argv.slice(2).find((a) => a.startsWith("--out="))?.slice(6) ??
  "../Дойл/poker-timer");

const GRID = gridCells();
const ALL_LABELS = GRID.flat().map((c) => c.label);

/** Точность важнее скорости: диапазон бинарный, дрожание у порога видно глазом. */
const SAMPLES = 120_000;

/**
 * ГПСЧ с фиксированным зерном: пересборка файла не должна двигать границу
 * диапазона туда-сюда на одних и тех же данных.
 */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Верхняя граница глубины: «0-9bb» → 9. Порог колла там самый тугой. */
const STACK_BB: Record<string, number> = { "0-9bb": 9, "10-14bb": 14 };

const ANTE = 1;

function threshold(seat: "SB" | "BB", stack: number): number {
  return seat === "BB"
    ? (stack - 1) / (2 * stack + 0.5 + ANTE)
    : (stack - 0.5) / (2 * stack + 1 + ANTE);
}

/** Пуш-диапазон чарта. Чарты пака бинарные — всё лежит в always. */
function pushRange(p: RangePreset): Range {
  const raise = p.actions.find((a) => a.kind === "raise")!;
  return rangeFromLabels(raise.always);
}

const SEAT_ORDER = ["EP+1", "EP+2", "MP", "HJ", "CO", "BU", "SB", "BB"];

/** Место пушера из подписи пресета: «EP · 10-14bb» → «EP». */
function pusherSeat(p: RangePreset): string {
  return p.position.split(" · ")[0];
}

function stackLabel(p: RangePreset): string {
  const m = /стек (\d+-\d+bb)/.exec(p.subtitle);
  if (!m) throw new Error(`не разобрал глубину: ${p.subtitle}`);
  return m[1];
}

const pushPresets = ALL_PRESETS.filter((p) => p.group === "MTTPUSH");
if (pushPresets.length === 0) throw new Error("пуш-чартов не нашлось");

interface DefChart {
  id: string;
  group: "MTTPUSHDEF";
  position: string;
  title: string;
  subtitle: string;
  situation: string;
  computed: { pusher: string; stack: number; threshold: number; source: string };
  actions: Array<{ kind: "call"; label: string; color: "green"; w: Record<string, number> }>;
}

const charts: DefChart[] = [];
let done = 0;

for (const p of pushPresets) {
  const pusher = pusherSeat(p);
  const stackName = stackLabel(p);
  const stack = STACK_BB[stackName];
  if (!stack) throw new Error(`неизвестная глубина: ${stackName}`);
  const villain = pushRange(p);
  const pushWidth = (villain.totalCombos() / 1326) * 100;

  // Считаем только тех, кто сидит ПОЗАДИ пушера: SB против пуша с SB не бывает.
  const seats: Array<"SB" | "BB"> = [];
  if (SEAT_ORDER.indexOf(pusher) < SEAT_ORDER.indexOf("SB")) seats.push("SB");
  seats.push("BB");

  for (const seat of seats) {
    const need = threshold(seat, stack);
    const w: Record<string, number> = {};
    let width = 0;

    ALL_LABELS.forEach((label, i) => {
      const hero = new Range();
      hero.setHand(label, 1);
      const res = computeEquity(hero, villain, [], {
        samples: SAMPLES,
        // Зерно зависит от спота и руки: одинаковая цепочка на всех руках
        // подряд коррелировала бы соседние ячейки.
        rng: seeded(0x5eed + i * 7919 + stack * 104729 + seat.charCodeAt(0) * 31 + pusher.length),
      });
      if (res.a.equity >= need) {
        w[label] = 1;
        width += hero.totalCombos();
      }
    });

    charts.push({
      id: `mtt-pushdef-${stackName.replace(/bb$/, "")}-${seat.toLowerCase()}-vs-${pusher.toLowerCase().replace(/\+/g, "")}`,
      group: "MTTPUSHDEF",
      position: `${seat} vs пуш ${pusher}`,
      title: `MTT колл пуша · ${seat} vs ${pusher} · ${stackName}`,
      subtitle:
        `расчёт, а не чарт пака: коллируем всё, что бьёт пуш ${pusher} ` +
        `(${pushWidth.toFixed(1)}%) минимум на ${(need * 100).toFixed(1)}% ` +
        `(${((width / 1326) * 100).toFixed(1)}%)`,
      situation: `Вы на ${seat}, стек ${stackName}. ${pusher} пошёл олл-ин, остальные сфолдили.`,
      computed: {
        pusher,
        stack,
        threshold: Math.round(need * 10000) / 10000,
        source: p.id,
      },
      actions: [{ kind: "call", label: "колл олл-ина", color: "green", w }],
    });
    done += 1;
    console.log(
      `${charts[charts.length - 1].id.padEnd(34)} порог ${(need * 100).toFixed(1)}% → ` +
        `${((width / 1326) * 100).toFixed(1)}% рук`,
    );
  }
}

function write(rel: string, body: string) {
  const path = join(OUT_ROOT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
  console.log(`→ ${path} (${(Buffer.byteLength(body) / 1024).toFixed(0)} КБ)`);
}

// Скриптом, а не JSON: приложение открывается с doylepoker.ru/app/, а статика
// лежит на timer.doylepoker.ru — fetch оттуда межсайтовый и режется CORS, а
// теги <script> под него не подпадают. Та же причина, что у mtt-charts.js.
write(
  "assets/academy/push-defense.js",
  `// Doyle Academy — защита блайндов против опен-пуша (0-9bb и 10-14bb).
//
// СГЕНЕРИРОВАНО скриптом pokercalc/tools/calc_push_defense.ts — РУКАМИ НЕ ПРАВИТЬ.
// Пересобрать: npx vite-node tools/calc_push_defense.ts (из корня pokercalc).
//
// Это НЕ чарты FF START: коллирующих диапазонов пак не даёт вовсе. Здесь
// расчёт chipEV — эквити руки против пуш-диапазона того же пака против порога
// банка, без ICM. Чарты 13×13 бинарные: колл или фолд.
window.ACADEMY_PUSH_DEFENSE = ${JSON.stringify({ charts }, null, 0)};
`,
);

console.log(`\nПосчитано чартов: ${done} (${SAMPLES.toLocaleString("ru")} раздач на руку)`);
