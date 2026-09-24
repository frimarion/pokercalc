// Вкладка «ICM»: пуш-фолд по ICM, как ICMIZER, в очках рейтинга Doyle.
//
// Слева — постановка: рейтинг турнира (входы, аддоны, гарантия, ПКО) даёт
// выплаты ровно по формуле админки Дойла, ниже блайнды и стеки за столом.
// Справа — результат: сводная таблица «кто с чем пушит и коллирует» и
// матрица 13×13 для выбранного узла с разницей EV в очках на подсказке.
//
// Пересчёт автоматический с дебаунсом: решение идёт в воркере и занимает
// доли секунды, кнопка «Рассчитать» тут только мешала бы.

import { useEffect, useMemo, useRef, useState } from "react";
import { gridCells } from "../engine/combos";
import { doylePayouts } from "../icm/payouts";
import { icmValues } from "../icm/icm";
import { HAND_LABELS, PushFoldInput, PushFoldResult, positionNames, rangeWidth } from "../icm/pushfold";
import type { IcmRequest, IcmResponse } from "../workers/icm.worker";

const GRID = gridCells();
const HAND_INDEX = new Map(HAND_LABELS.map((l, i) => [l, i]));

interface Settings {
  payoutMode: "doyle" | "custom";
  entries: number;
  addons: number;
  guarantee: number;
  pko: boolean;
  useKo: boolean;
  custom: string;
  sb: number;
  bb: number;
  ante: number;
  anteMode: "bb" | "each";
  stacks: number[];
}

const DEFAULTS: Settings = {
  payoutMode: "doyle",
  entries: 40,
  addons: 0,
  guarantee: 800,
  pko: false,
  useKo: true,
  custom: "50, 30, 20",
  sb: 1000,
  bb: 2000,
  ante: 2000,
  anteMode: "bb",
  stacks: [52000, 31000, 24000, 18000, 45000, 70000],
};

const STORAGE_KEY = "pokercalc.icm.v1";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* приватный режим — просто дефолты */
  }
  return DEFAULTS;
}

type Node = { kind: "push"; seat: number } | { kind: "call"; pusher: number; seat: number };

const fmt = (x: number, d = 1) => x.toLocaleString("ru-RU", { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (x: number) => `${fmt(x * 100)}%`;

const PUSH_RGB = "238, 76, 155"; // розовый олл-ин, как в MTT-легенде
const CALL_RGB = "52, 199, 123"; // зелёный колл

export function Icm() {
  const [s, setS] = useState<Settings>(loadSettings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* не критично */
    }
  }, [s]);

  const n = s.stacks.length;
  const positions = positionNames(n);

  const doyle = useMemo(
    () => doylePayouts({ entries: s.entries, addons: s.addons, guarantee: s.guarantee, pko: s.pko }),
    [s.entries, s.addons, s.guarantee, s.pko],
  );
  const payouts = useMemo(() => {
    if (s.payoutMode === "doyle") return doyle.payouts;
    return s.custom
      .split(/[\s,;]+/)
      .map(Number)
      .filter((x) => Number.isFinite(x) && x >= 0);
  }, [s.payoutMode, s.custom, doyle]);
  const koBounty = s.payoutMode === "doyle" && s.useKo ? doyle.koValue : 0;

  // В хедз-апе у Дойла анте не берётся (так и на дисплее турнира).
  const ante = n === 2 && s.anteMode === "bb" ? 0 : s.ante;

  const input: PushFoldInput | null = useMemo(() => {
    if (s.stacks.some((x) => !(x > 0))) return null;
    if (!(s.bb > 0)) return null;
    return {
      stacks: s.stacks,
      sb: s.sb,
      bb: s.bb,
      ante,
      anteMode: s.anteMode,
      payouts,
      koBounty,
    };
  }, [s.stacks, s.sb, s.bb, ante, s.anteMode, payouts, koBounty]);

  const [result, setResult] = useState<PushFoldResult | null>(null);
  const [status, setStatus] = useState<{ busy: boolean; ms?: number; error?: string }>({ busy: false });
  const workerRef = useRef<Worker | null>(null);
  const ridRef = useRef(0);

  useEffect(() => {
    if (!input) return;
    const rid = ++ridRef.current;
    setStatus((p) => ({ ...p, busy: true }));
    const t = setTimeout(() => {
      // Недосчитанный прошлый запрос не нужен — воркер просто пересоздаётся.
      workerRef.current?.terminate();
      const w = new Worker(new URL("../workers/icm.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = w;
      w.onmessage = (e: MessageEvent<IcmResponse>) => {
        if (e.data.rid !== ridRef.current) return;
        if (e.data.kind === "done") {
          setResult(e.data.result);
          setStatus({ busy: false, ms: e.data.ms });
        } else setStatus({ busy: false, error: e.data.message });
        w.terminate();
      };
      w.onerror = () => setStatus({ busy: false, error: "Решатель упал. Проверьте стеки и блайнды." });
      const req: IcmRequest = { rid, input };
      w.postMessage(req);
    }, 350);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  // Результат мог прийти для другого числа мест — показываем только совместимый.
  const res = result && result.positions.length === n ? result : null;

  const [node, setNode] = useState<Node>({ kind: "push", seat: 0 });
  const validNode: Node =
    node.kind === "push" && node.seat < n - 1
      ? node
      : node.kind === "call" && node.seat < n && node.pusher < node.seat
        ? node
        : { kind: "push", seat: 0 };

  const icmNow = useMemo(() => icmValues(s.stacks, payouts), [s.stacks, payouts]);
  const bubble = n > payouts.filter((p) => p > 0).length;

  const setStack = (i: number, v: number) => set("stacks", s.stacks.map((x, k) => (k === i ? v : x)));
  const setCount = (m: number) => {
    const cur = s.stacks;
    const next = m > cur.length ? [...cur, ...Array(m - cur.length).fill(cur[cur.length - 1] ?? 20000)] : cur.slice(cur.length - m);
    set("stacks", next);
  };

  const inputCls =
    "w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-emerald-500/60";
  const label = "text-[11px] uppercase tracking-wide text-neutral-500";
  const card = "rounded-xl border border-white/10 bg-[#0f1614] p-4";

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* ── Постановка ── */}
      <div className="flex flex-col gap-4">
        <div className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Выплаты</h2>
            <div className="flex gap-1">
              {(["doyle", "custom"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => set("payoutMode", m)}
                  className={`rounded-md px-2 py-1 text-xs ${
                    s.payoutMode === m ? "bg-emerald-500 font-semibold text-black" : "border border-white/10 text-neutral-400"
                  }`}
                >
                  {m === "doyle" ? "Рейтинг Doyle" : "Свои"}
                </button>
              ))}
            </div>
          </div>

          {s.payoutMode === "doyle" ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className={label}>Входов</span>
                  <input type="number" min={1} className={inputCls} value={s.entries} onChange={(e) => set("entries", Number(e.target.value))} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={label}>Аддонов</span>
                  <input type="number" min={0} className={inputCls} value={s.addons} onChange={(e) => set("addons", Number(e.target.value))} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={label}>Гарантия</span>
                  <input type="number" min={0} step={10} className={inputCls} value={s.guarantee} onChange={(e) => set("guarantee", Number(e.target.value))} />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-300">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={s.pko} onChange={(e) => set("pko", e.target.checked)} /> ПКО
                </label>
                <label className="flex items-center gap-1.5" title="Выбивший получает очки за нокаут — это расширяет коллы против коротких">
                  <input type="checkbox" checked={s.useKo} onChange={(e) => set("useKo", e.target.checked)} /> учитывать KO ({doyle.koValue} очк.)
                </label>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Пул {doyle.total} = {doyle.itmPool} на места + {doyle.koPool} под нокауты · платят {doyle.places}
              </p>
            </>
          ) : (
            <label className="flex flex-col gap-1">
              <span className={label}>Выплаты за 1-е, 2-е… место</span>
              <input className={inputCls} value={s.custom} onChange={(e) => set("custom", e.target.value)} />
            </label>
          )}

          <div className="mt-3 flex flex-wrap gap-1">
            {payouts.slice(0, Math.max(n, 3)).map((p, i) => (
              <span
                key={i}
                className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${i < n ? "bg-white/10 text-neutral-200" : "bg-white/5 text-neutral-500"}`}
              >
                {i + 1}: {p}
              </span>
            ))}
            {payouts.length > Math.max(n, 3) && <span className="px-1 text-[11px] text-neutral-500">…</span>}
          </div>
        </div>

        <div className={card}>
          <h2 className="mb-3 text-sm font-bold">Блайнды</h2>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className={label}>SB</span>
              <input type="number" min={0} className={inputCls} value={s.sb} onChange={(e) => set("sb", Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>BB</span>
              <input type="number" min={1} className={inputCls} value={s.bb} onChange={(e) => set("bb", Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Анте</span>
              <input type="number" min={0} className={inputCls} value={s.ante} onChange={(e) => set("ante", Number(e.target.value))} />
            </label>
          </div>
          <div className="mt-2 flex gap-3 text-xs text-neutral-300">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={s.anteMode === "bb"} onChange={() => set("anteMode", "bb")} /> BB-анте
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={s.anteMode === "each"} onChange={() => set("anteMode", "each")} /> с каждого
            </label>
          </div>
          {n === 2 && s.anteMode === "bb" && s.ante > 0 && (
            <p className="mt-2 text-xs text-neutral-500">В хедз-апе BB-анте не берётся — как на дисплее турнира.</p>
          )}
        </div>

        <div className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Стол</h2>
            <label className="flex items-center gap-2 text-xs text-neutral-400">
              игроков
              <select className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm" value={n} onChange={(e) => setCount(Number(e.target.value))}>
                {[2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <th className="pb-1 font-normal">Место</th>
                <th className="pb-1 font-normal">Стек</th>
                <th className="pb-1 text-right font-normal">bb</th>
                <th className="pb-1 text-right font-normal">ICM</th>
              </tr>
            </thead>
            <tbody>
              {s.stacks.map((st, i) => (
                <tr key={i}>
                  <td className="py-0.5 pr-2 text-xs font-semibold text-neutral-300">{positions[i]}</td>
                  <td className="py-0.5 pr-2">
                    <input type="number" min={1} step={500} className={inputCls} value={st} onChange={(e) => setStack(i, Number(e.target.value))} />
                  </td>
                  <td className="py-0.5 text-right tabular-nums text-neutral-400">{fmt(st / (s.bb || 1))}</td>
                  <td className="py-0.5 text-right tabular-nums text-neutral-200">{fmt(icmNow[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-neutral-500">
            Считается, что за столом все, кто остался в турнире.
            {bubble && <span className="text-amber-400"> Баббл: призов меньше, чем игроков.</span>}
          </p>
        </div>
      </div>

      {/* ── Результат ── */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className={card}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Равновесие пуш-фолд</h2>
            <span className="text-xs text-neutral-500">
              {status.error ? (
                <span className="text-rose-400">{status.error}</span>
              ) : status.busy ? (
                "считаю…"
              ) : status.ms !== undefined ? (
                `${fmt(status.ms / 1000, 2)} с`
              ) : null}
            </span>
          </div>
          {res ? <Summary res={res} node={validNode} onPick={setNode} /> : <p className="text-sm text-neutral-500">Нет данных</p>}
          <p className="mt-2 text-[11px] text-neutral-500">
            Строка — кто ходит. «Пуш» — олл-ин первым, дальше — колл против пуша места из столбца. Клик — открыть матрицу.
          </p>
        </div>

        {res && <NodeMatrix res={res} node={validNode} bb={s.bb} stacks={s.stacks} />}
      </div>
    </div>
  );
}

function Summary({ res, node, onPick }: { res: PushFoldResult; node: Node; onPick: (n: Node) => void }) {
  const n = res.positions.length;
  const active = (k: Node) =>
    k.kind === node.kind && k.seat === node.seat && (k.kind === "push" || (node.kind === "call" && k.pusher === node.pusher));
  const cell = (k: Node, w: number, rgb: string) => (
    <button
      onClick={() => onPick(k)}
      className={`w-full rounded px-1.5 py-1 text-right tabular-nums text-xs ${active(k) ? "ring-2 ring-white/70" : ""}`}
      style={{ background: `rgba(${rgb}, ${0.12 + 0.6 * Math.min(1, w * 1.6)})` }}
    >
      {pct(w)}
    </button>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-neutral-500">
            <th className="text-left font-normal">Игрок</th>
            <th className="font-normal">Пуш</th>
            {res.positions.slice(0, n - 1).map((p) => (
              <th key={p} className="font-normal">
                vs {p}
              </th>
            ))}
            <th className="text-right font-normal">EV</th>
          </tr>
        </thead>
        <tbody>
          {res.positions.map((p, j) => (
            <tr key={p}>
              <td className="pr-2 text-xs font-semibold text-neutral-300">{p}</td>
              <td className="min-w-[64px]">{j < n - 1 ? cell({ kind: "push", seat: j }, rangeWidth(res.push[j]), PUSH_RGB) : null}</td>
              {res.positions.slice(0, n - 1).map((_, i) => (
                <td key={i} className="min-w-[64px]">
                  {i < j ? cell({ kind: "call", pusher: i, seat: j }, rangeWidth(res.call[i][j]), CALL_RGB) : null}
                </td>
              ))}
              <td
                className="whitespace-nowrap pl-2 text-right text-xs tabular-nums text-neutral-400"
                title="ICM сейчас → ожидание при игре по равновесию"
              >
                {fmt(res.icmBefore[j])} → <span className={res.evAfter[j] >= res.icmBefore[j] ? "text-emerald-400" : "text-rose-400"}>{fmt(res.evAfter[j])}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NodeMatrix({ res, node, bb, stacks }: { res: PushFoldResult; node: Node; bb: number; stacks: number[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const isPush = node.kind === "push";
  const freq = isPush ? res.push[node.seat] : res.call[node.pusher][node.seat];
  const margin = isPush ? res.pushMargin[node.seat] : res.callMargin[node.pusher][node.seat];
  const rgb = isPush ? PUSH_RGB : CALL_RGB;
  const who = res.positions[node.seat];
  const title = isPush
    ? `${who} пушит первым`
    : `${who} коллирует пуш ${res.positions[node.pusher]}`;
  const eff = isPush ? stacks[node.seat] : Math.min(stacks[node.seat], stacks[node.pusher]);
  const h = hover !== null ? HAND_INDEX.get(hover)! : null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1614] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">
          {title} <span className="font-normal text-neutral-500">· {fmt(eff / bb)}bb эфф.</span>
        </h2>
        <span className="text-sm tabular-nums" style={{ color: `rgb(${rgb})` }}>
          {pct(rangeWidth(freq))} рук
        </span>
      </div>
      {eff / bb > 15 && (
        <p className="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Эффективно {fmt(eff / bb)}bb — глубже 15bb пуш-фолд перестаёт быть равновесной игрой: там выгоднее
          рейз-фолд, а его модель не знает. Диапазон верен только при условии «либо олл-ин, либо фолд».
        </p>
      )}
      <div className="mx-auto max-w-[620px]">
        <div className="grid select-none gap-[3px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
          {GRID.flat().map((c) => {
            const i = HAND_INDEX.get(c.label)!;
            const w = freq[i];
            const p = Math.round(w * 100);
            const bg =
              w <= 0.005
                ? "rgb(22, 25, 24)"
                : w >= 0.995
                  ? `rgb(${rgb})`
                  : `linear-gradient(to right, rgb(${rgb}) ${p}%, rgb(22, 25, 24) ${p}%)`;
            return (
              <div
                key={c.label}
                onMouseEnter={() => setHover(c.label)}
                onMouseLeave={() => setHover(null)}
                className="flex aspect-square flex-col items-center justify-center rounded-[3px] text-[10px] font-semibold leading-none sm:text-[11px]"
                style={{ background: bg, color: w > 0.5 ? "#0a0e0d" : "#8b9a93" }}
              >
                {c.label}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 h-5 text-center text-xs text-neutral-400">
        {h !== null && hover ? (
          <>
            <b className="text-neutral-200">{hover}</b>: {isPush ? "пуш" : "колл"} {Math.round(freq[h] * 100)}% · EV{" "}
            {isPush ? "пуша" : "колла"} относительно фолда{" "}
            <span className={margin[h] >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {margin[h] >= 0 ? "+" : ""}
              {fmt(margin[h], 2)} очк.
            </span>
          </>
        ) : (
          "Наведите на руку — покажу, сколько очков приносит решение"
        )}
      </p>
    </div>
  );
}
