// Экспорт MTT-чартов в Doyle Academy (проект «doyle timer»).
//
// Doyle Academy — раздел tg-app.html: чарты MTT + префлоп-тренажёр с
// таблицей лидеров по стрику. Тренажёр проверяет ответы НА СЕРВЕРЕ, поэтому
// одни и те же чарты нужны в двух местах:
//
//   1. assets/academy/mtt-charts.json — клиенту, чтобы рисовать матрицы 13×13,
//      стол спота и разбор после ответа;
//   2. supabase/migrations/academy_charts_seed.sql — серверу, чтобы RPC
//      `academy_answer` сверял ответ по своей копии весов, а не по присланным.
//
// Оба файла ГЕНЕРИРУЮТСЯ — руками не править. Источник правды — пресеты
// PokerCalc: там же лежат тесты, которые эти чарты сверяют с картинками пака.
//
// Запуск (из корня pokercalc):
//   npx vite-node tools/export_academy.ts
//
// Пути к репозиторию Дойла берутся из --out (по умолчанию ../doyle timer).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ALL_PRESETS } from "../src/presets/all";
import {
  ActionColor,
  GROUP_LABELS,
  PresetGroup,
  RangePreset,
  defaultActionColor,
  partialWeights,
} from "../src/presets/types";
import {
  QUIZ_SPOTS,
  TRAINER_SECTIONS,
  handWeights,
  interestingHands,
  handFamily,
  familyLabel,
  actionEdges,
} from "../src/presets/quiz";
import { sceneFor } from "../src/presets/scene";
import { gridCells } from "../src/engine/combos";

const MTT_GROUPS: PresetGroup[] = TRAINER_SECTIONS.find((s) => s.key === "mtt")!.groups;

const GRID = gridCells();
const ALL_LABELS = GRID.flat().map((c) => c.label);

/**
 * Действие чарта как плоская карта «рука → вес». Клиент из неё собирает и
 * заливку ячейки (сегменты идут в порядке действий, цвет — из action.color),
 * и суммарные веса raise/call. Держать в JSON обе производные формы значило
 * бы возить одни и те же числа трижды — на мобильной сети это лишние сотни
 * килобайт.
 *
 * Жёлтого «ситуативно» здесь нет: он включается только на кэш-группах
 * (YELLOW_PARTIAL_GROUPS = RFI/SB3BET/3BETIP), а сюда попадают только MTT.
 */
function actionsOf(p: RangePreset) {
  return p.actions.map((action) => {
    const w: Record<string, number> = {};
    for (const label of action.always) w[label] = 1;
    for (const [label, weight] of partialWeights(action)) {
      w[label] = Math.round(Math.min(1, (w[label] ?? 0) + weight) * 1000) / 1000;
    }
    return {
      kind: action.kind,
      label: action.label,
      color: (action.color ?? defaultActionColor(action.kind)) as ActionColor,
      w,
    };
  });
}

const charts = ALL_PRESETS.filter((p) => MTT_GROUPS.includes(p.group)).map((p) => {
  const spot = QUIZ_SPOTS.find((s) => s.presetId === p.id);
  const hands = spot ? spot.hands : interestingHands(p);
  return {
    id: p.id,
    group: p.group,
    groupLabel: GROUP_LABELS[p.group].replace(/^MTT · /, ""),
    position: p.position,
    title: p.title,
    subtitle: p.subtitle,
    // Спот и кнопки ответов задаёт quiz.ts — там же, где тесты. Чарт без
    // спота (все руки очевидны) в тренажёр не попадает, но в разделе «Чарты»
    // показывается, поэтому situation/answers необязательны.
    situation: spot?.situation ?? null,
    answers: spot?.answers ?? null,
    actions: actionsOf(p),
    hands,
    scene: sceneFor(p),
  };
});

// ── Сверка производных, которые клиент считает сам ────────────────────────
// Клиентский academy.js пересобирает из `actions` веса raise/call и подсказку
// о границе ряда. Если он разойдётся с quiz.ts, тренажёр начнёт показывать
// разбор, не соответствующий чарту, — молча и только на отдельных руках.
// Поэтому обе производные пересчитываются здесь тем же кодом, что в клиенте,
// и сверяются с эталоном из PokerCalc прямо при экспорте.
function clientWeights(chart: (typeof charts)[number], hand: string) {
  const w = { raise: 0, call: 0 };
  for (const a of chart.actions) w[a.kind] = Math.min(1, w[a.kind] + (a.w[hand] ?? 0));
  return w;
}

let checked = 0;
for (const chart of charts) {
  const preset = ALL_PRESETS.find((p) => p.id === chart.id)!;
  for (const label of ALL_LABELS) {
    const mine = clientWeights(chart, label);
    const real = handWeights(preset, label);
    if (Math.abs(mine.raise - real.raise) > 0.002 || Math.abs(mine.call - real.call) > 0.002) {
      throw new Error(
        `${chart.id} / ${label}: веса разошлись — ` +
          `экспорт {raise:${mine.raise}, call:${mine.call}}, ` +
          `чарт {raise:${real.raise}, call:${real.call}}`,
      );
    }
    checked++;
  }
  // Границы ряда: клиент считает их по тем же весам, что и actionEdges.
  for (const hand of chart.hands) {
    const family = handFamily(hand);
    for (const kind of ["call", "raise"] as const) {
      if (!preset.actions.some((a) => a.kind === kind)) continue;
      let weakest: string | null = null;
      for (const h of family) if (clientWeights(chart, h)[kind] > 0.01) weakest = h;
      const real = actionEdges(preset, hand).find((e) => e.kind === kind)?.weakest ?? null;
      if (weakest !== real) {
        throw new Error(`${chart.id} / ${hand}: граница ${kind} — ${weakest} вместо ${real}`);
      }
    }
  }
  // Подпись ряда участвует в тексте подсказки — сверяем и её.
  for (const hand of chart.hands) {
    const at = GRID.flat().find((c) => c.label === hand)!;
    const mine =
      at.type === "pair" ? "пары" : `${hand[0]}x${at.type === "suited" ? "s" : "o"}`;
    if (mine !== familyLabel(hand)) {
      throw new Error(`${hand}: подпись ряда «${mine}» вместо «${familyLabel(hand)}»`);
    }
  }
}
console.log(`Сверено весов клиент↔чарт: ${checked}`);

const quizCharts = charts.filter((c) => c.answers !== null);

// ── Порядок групп в UI: от полного стека к короткому, как их учат ──────────
const GROUP_ORDER: PresetGroup[] = [
  "MTTRFI",
  "MTTISO",
  "MTTVSRFI",
  "MTTDEF3BET",
  "MTTBBDEF",
  "MTT3BETPUSH",
  "MTTPUSH",
];
charts.sort((a, b) => {
  const d = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
  return d !== 0 ? d : 0;
});

const groups = GROUP_ORDER.map((g) => ({
  key: g,
  label: GROUP_LABELS[g].replace(/^MTT · /, ""),
  chartIds: charts.filter((c) => c.group === g).map((c) => c.id),
})).filter((g) => g.chartIds.length > 0);

// ── Запись ────────────────────────────────────────────────────────────────

const outRoot = resolve(
  process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "../doyle timer",
);

function write(rel: string, body: string) {
  const path = join(outRoot, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  console.log(`  ${rel} — ${(body.length / 1024).toFixed(1)} КБ`);
}

write(
  "assets/academy/mtt-charts.json",
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), groups, charts }),
);

// SQL-сид: сервер хранит только то, что нужно для проверки ответа —
// веса по «интересным» рукам и список кнопок. Матрицы, сцены и подсказки
// остаются на клиенте: подделать их нельзя, они ни на что не влияют.
const sqlRows = quizCharts.map((c) => {
  // Серверу нужны только суммарные веса по kind и только на тех руках, что
  // тренажёр вообще спрашивает: по ним и решается, засчитан ответ или нет.
  const weights: Record<string, { raise?: number; call?: number }> = {};
  for (const h of c.hands) {
    const w = clientWeights(c, h);
    weights[h] = {
      ...(w.raise > 0.001 ? { raise: Math.round(w.raise * 1000) / 1000 } : {}),
      ...(w.call > 0.001 ? { call: Math.round(w.call * 1000) / 1000 } : {}),
    };
  }
  const esc = (s: string) => s.replace(/'/g, "''");
  const j = (v: unknown) => `'${esc(JSON.stringify(v))}'::jsonb`;
  return `  ('${esc(c.id)}', '${esc(c.group)}', ${j(c.answers)}, ${j(c.hands)}, ${j(weights)})`;
});

write(
  "supabase/migrations/academy_charts_seed.sql",
  `-- Doyle Academy — чарты MTT для серверной проверки ответов.
--
-- СГЕНЕРИРОВАНО скриптом pokercalc/tools/export_academy.ts — РУКАМИ НЕ ПРАВИТЬ.
-- Пересобрать: npx vite-node tools/export_academy.ts (из корня pokercalc).
--
-- Здесь лежит ровно то, что нужно RPC academy_answer, чтобы проверить ответ
-- по своей копии чарта: список «интересных» рук (только их и спрашивает
-- тренажёр), веса действий на каждой из них и набор кнопок ответа.
-- Матрицы 13×13, сцены спота и текст разбора — на клиенте: они не влияют на
-- зачёт стрика, и держать их в БД незачем.
--
-- Чарты: ${quizCharts.length} · руки: ${quizCharts.reduce((n, c) => n + c.hands.length, 0)}
-- Источник: FF START (MTT), пресеты PokerCalc src/presets/mtt/*.

BEGIN;

DELETE FROM academy_charts;

INSERT INTO academy_charts (id, chart_group, answers, hands, weights) VALUES
${sqlRows.join(",\n")};

COMMIT;
`,
);

console.log(
  `\nЧартов: ${charts.length} (в тренажёре ${quizCharts.length}), ` +
    `рук в пуле: ${quizCharts.reduce((n, c) => n + c.hands.length, 0)}`,
);
