// Таблица префлоп-эквити 169×169 для ICM-решателя (src/icm/preflopEquity.ts).
//
//   npx vite-node tools/gen_preflop_equity.ts            # весь расчёт, ~1 мин на 16 ядрах
//   npx vite-node tools/gen_preflop_equity.ts --samples=20000   # быстрее и грубее
//
// Решатель пуш-фолда перебирает руки миллионы раз, поэтому эквити «рука против
// руки» считается один раз заранее. Ячейка [h][g] — эквити класса h против
// класса g (ничья = половина), усреднённая по всем НЕ пересекающимся парам
// комбо: так AA против AKs уже учитывает, что туз в руке соперника забран.
//
// Счёт — Монте-Карло с ГПСЧ, засеянным номером пары: перегенерация даёт тот же
// файл байт в байт. 100k раскладов на пару → σ ≈ 0.15 п.п.
//
// Без --shard скрипт — дирижёр: запускает по процессу на ядро (каждый считает
// свою долю пар), потом склеивает результат и пишет TS-файл.

import { spawn } from "node:child_process";
import { cpus } from "node:os";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evaluate } from "../src/engine/evaluator";
import { ALL_COMBOS, comboIndicesForLabel, gridCells } from "../src/engine/combos";

const LABELS = gridCells().flat().map((c) => c.label);
const N = LABELS.length; // 169
const COMBOS = LABELS.map((l) => comboIndicesForLabel(l).map((i) => ALL_COMBOS[i]));

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const SAMPLES = Number(arg("samples") ?? 100_000);
const TMP = join(process.cwd(), "node_modules", ".cache", "preflop-equity");

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Эквити класса h против класса g. */
function pairEquity(h: number, g: number): number {
  const rnd = mulberry32(h * 1000 + g + 1);
  const A = COMBOS[h];
  const B = COMBOS[g];
  const used = new Uint8Array(52);
  const a7 = [0, 0, 0, 0, 0, 0, 0];
  const b7 = [0, 0, 0, 0, 0, 0, 0];
  let score = 0;
  for (let s = 0; s < SAMPLES; s++) {
    // Равномерно по непересекающимся парам комбо — отбраковкой.
    let a, b;
    do {
      a = A[(rnd() * A.length) | 0];
      b = B[(rnd() * B.length) | 0];
    } while (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]);
    used.fill(0);
    used[a[0]] = used[a[1]] = used[b[0]] = used[b[1]] = 1;
    a7[0] = a[0]; a7[1] = a[1];
    b7[0] = b[0]; b7[1] = b[1];
    for (let k = 2; k < 7; k++) {
      let c;
      do c = (rnd() * 52) | 0;
      while (used[c]);
      used[c] = 1;
      a7[k] = b7[k] = c;
    }
    const va = evaluate(a7);
    const vb = evaluate(b7);
    score += va > vb ? 2 : va === vb ? 1 : 0;
  }
  return score / (2 * SAMPLES);
}

/** Пары (h ≤ g) по порядку; шард k берёт каждую shards-ю. */
function pairs(): [number, number][] {
  const out: [number, number][] = [];
  for (let h = 0; h < N; h++) for (let g = h; g < N; g++) out.push([h, g]);
  return out;
}

const shardArg = arg("shard");
if (shardArg !== undefined) {
  const [k, of] = shardArg.split("/").map(Number);
  const res: [number, number, number][] = [];
  const all = pairs();
  for (let i = k; i < all.length; i += of) {
    const [h, g] = all[i];
    res.push([h, g, pairEquity(h, g)]);
  }
  writeFileSync(join(TMP, `shard-${k}.json`), JSON.stringify(res));
} else {
  mkdirSync(TMP, { recursive: true });
  const shards = cpus().length;
  const t0 = Date.now();
  console.log(`${pairs().length} пар × ${SAMPLES} раскладов, процессов: ${shards}`);
  await Promise.all(
    Array.from({ length: shards }, (_, k) =>
      new Promise<void>((resolve, reject) => {
        const p = spawn(
          process.platform === "win32" ? "npx.cmd" : "npx",
          ["vite-node", "tools/gen_preflop_equity.ts", "--", `--shard=${k}/${shards}`, `--samples=${SAMPLES}`],
          { stdio: "inherit", shell: process.platform === "win32" },
        );
        p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`shard ${k}: ${code}`))));
      }),
    ),
  );

  const eq = new Uint16Array(N * N);
  for (let k = 0; k < shards; k++) {
    for (const [h, g, e] of JSON.parse(readFileSync(join(TMP, `shard-${k}.json`), "utf8"))) {
      // Ровно симметрично: eq[g][h] = 1 − eq[h][g] и в квантованном виде.
      const q = Math.round(e * 65535);
      // Диагональ (класс против себя) по симметрии ровно 50% — её ставит загрузчик.
      eq[g * N + h] = 65535 - q;
      eq[h * N + g] = q;
    }
  }
  const b64 = Buffer.from(eq.buffer).toString("base64");
  const ts = `// СГЕНЕРИРОВАНО tools/gen_preflop_equity.ts — не править руками.
// Эквити класса h против класса g (порядок классов — gridCells().flat()),
// Uint16 little-endian, 65535 = 100%. Монте-Карло, ${SAMPLES} раскладов на пару.
export const PREFLOP_EQUITY_B64 =
  "${b64}";
`;
  writeFileSync("src/icm/preflopEquity.ts", ts);
  console.log(`готово за ${((Date.now() - t0) / 1000).toFixed(0)} с → src/icm/preflopEquity.ts`);
}
