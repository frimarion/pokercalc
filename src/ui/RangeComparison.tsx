import { useMemo, useRef, useState } from "react";
import { Card, cardsToMask, cardSuit, fullDeck, prettyCard } from "../engine/cards";
import { ALL_COMBOS, comboIndicesForLabel, gridCells, Range } from "../engine/combos";
import { breakdownRange, DRAW_ORDER, DrawType, filterRange, MADE_ORDER, MadeCategory } from "../engine/categorize";
import { ComboEquity, EquityResult } from "../engine/equity";
import { formatRangeText, parseRangeText } from "../engine/rangeText";
import { Side, useStore } from "../state/store";
import { MADE_LABELS, DRAW_LABELS } from "./MadeBreakdown";
import { suitColor } from "./colors";
import { useEquity } from "./useEquity";

const GRID = gridCells().flat().map((cell) => ({ ...cell, indices: comboIndicesForLabel(cell.label) }));
const BOX = "rounded-2xl border border-white/10 bg-[#0f1614] p-3 sm:p-4";
const BTN = "rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-30";
const COLOR = { hero: "#34d399", villain: "#38bdf8" };
type Filters = { made: MadeCategory[]; draws: DrawType[] };
const emptyFilters = (): Filters => ({ made: [], draws: [] });
const hasFilters = (f: Filters) => f.made.length + f.draws.length > 0;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function RangeEditor({ side, mask, filtered, eq, heatmap }: {
  side: Side; mask: bigint; filtered: Range; eq?: ComboEquity[]; heatmap: boolean;
}) {
  const range = useStore((s) => s.ranges[side]);
  useStore((s) => s.rev);
  const replace = useStore((s) => s.replaceRange);
  const setWeight = useStore((s) => s.setHandWeight);
  const [brush, setBrush] = useState(100);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dragging = useRef<{ pointer: number; weight: number } | null>(null);
  const color = COLOR[side];
  const equity = new Map(eq?.map((c) => [c.index, c]));
  const live = range.totalCombos(mask);
  const shown = filtered.totalCombos(mask);
  const text = draft ?? formatRangeText(range);

  return <section className={BOX} aria-label={`Диапазон ${side}`}>
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-bold" style={{ color }}>{side === "hero" ? "Hero" : "Villain"}</h2>
      <span className="text-xs text-neutral-400">{shown.toFixed(1)} / {live.toFixed(1)} комбо · {pct(range.totalCombos() / 1326)} рук</span>
    </div>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <label className="text-xs text-neutral-400">Вес <input aria-label={`Вес ${side}`} type="number" min="1" max="100" value={brush}
        onChange={(e) => setBrush(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="w-14 rounded border border-white/15 p-1 text-white" /> %</label>
      <button className={BTN} onClick={() => replace(side, new Range(new Float32Array(1326).fill(1)))}>Все</button>
      <button className={BTN} onClick={() => replace(side, new Range())}>Очистить</button>
      <button className={BTN} onClick={() => replace(side, useStore.getState().ranges[side === "hero" ? "villain" : "hero"])}>Копия {side === "hero" ? "Villain" : "Hero"}</button>
    </div>
    <div className="grid touch-none select-none grid-cols-13 gap-[2px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
      onPointerMove={(e) => {
        if (!dragging.current || e.buttons === 0) return;
        const label = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-hand]")?.dataset.hand;
        if (label && e.currentTarget.contains(document.elementFromPoint(e.clientX, e.clientY))) setWeight(label, dragging.current.weight, side);
      }}
      onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
      {GRID.map(({ label, indices }) => {
        const available = indices.filter((i) => ALL_COMBOS[i].every((c) => !(mask & (1n << BigInt(c)))));
        const selected = available.reduce((n, i) => n + filtered.weights[i], 0);
        const weight = range.handWeight(label);
        const rows = available.flatMap((i) => equity.has(i) ? [equity.get(i)!] : []);
        const mass = rows.reduce((n, r) => n + r.weight, 0);
        const strength = mass ? rows.reduce((n, r) => n + r.equity * r.weight, 0) / mass : null;
        const bg = heatmap && strength !== null ? `hsl(${strength * 130} 55% 35%)` : color;
        return <button key={label} data-hand={label} disabled={!available.length}
          aria-label={`${side} ${label}, вес ${Math.round(weight * 100)}%`}
          title={`${label}: ${selected.toFixed(2)} комбо${strength !== null ? ` · эквити ${pct(strength)}` : ""}`}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.parentElement?.setPointerCapture(e.pointerId);
            const w = Math.abs(weight - brush / 100) < 0.001 ? 0 : brush / 100;
            dragging.current = { pointer: e.pointerId, weight: w };
            setWeight(label, w, side);
          }}
          onClick={(e) => { if (e.detail === 0) setWeight(label, weight ? 0 : brush / 100, side); }}
          className="relative flex aspect-square min-w-0 flex-col items-center justify-center overflow-hidden rounded text-[9px] font-semibold sm:text-[11px] disabled:opacity-20"
          style={{ background: weight > 0 ? `${color}20` : "#1a2420", color: weight > 0 ? "#f0fdfa" : "#7b8c83", opacity: weight && !selected ? 0.35 : 1 }}>
          {weight > 0 && <span className="pointer-events-none absolute inset-y-0 left-0 opacity-50" style={{ width: `${weight * 100}%`, background: bg }} />}
          <span className="pointer-events-none relative">{label}</span>
          <span className="pointer-events-none relative text-[8px] opacity-70">{heatmap && strength !== null ? pct(strength) : selected > 0 ? selected.toFixed(1) : "·"}</span>
        </button>;
      })}
    </div>
    <details className="mt-3 text-xs text-neutral-400">
      <summary className="cursor-pointer">Ввод / экспорт диапазона</summary>
      <p className="my-2">Пример: QQ+, AJs+, KTs-KQs:50, AhKd. Вес после «:» — в процентах. Последнее значение заменяет предыдущее.</p>
      <textarea aria-label={`Диапазон ${side} строкой`} value={text} onChange={(e) => { setDraft(e.target.value); setError(""); }}
        className="min-h-20 w-full rounded-lg border border-white/15 p-2 font-mono text-xs" />
      <div className="mt-2 flex gap-2">
        <button className={BTN} onClick={() => { try { replace(side, parseRangeText(text)); setDraft(null); setError(""); } catch (e) { setError((e as Error).message); } }}>Применить строку</button>
        <button className={BTN} onClick={() => { setDraft(null); setError(""); }}>Текущий диапазон</button>
      </div>
      {error && <p role="alert" className="mt-2 text-rose-400">{error}</p>}
    </details>
  </section>;
}

function ComparisonCards() {
  const board = useStore((s) => s.comparisonBoard);
  const dead = useStore((s) => s.comparisonDead);
  const setCards = useStore((s) => s.setComparisonCards);
  const [target, setTarget] = useState<"board" | "dead">("board");
  return <section className={BOX}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-wrap gap-5">
        {(["board", "dead"] as const).map((kind) => <div key={kind}>
          <button className={`${BTN} ${target === kind ? "bg-white/10 text-white" : "text-neutral-500"}`} onClick={() => setTarget(kind)}>{kind === "board" ? "Борд" : "Мёртвые карты"}</button>
          <div className="mt-2 flex min-h-10 flex-wrap gap-1">
            {(kind === "board" ? board : dead).map((c) => <button key={c} className="rounded border border-white/15 bg-white/5 px-2 py-2 text-sm font-bold" style={{ color: suitColor(cardSuit(c)) }} title="Убрать карту"
              onClick={() => setCards(kind === "board" ? board.filter((x) => x !== c) : board, kind === "dead" ? dead.filter((x) => x !== c) : dead)}>{prettyCard(c)} ×</button>)}
            {kind === "board" && Array.from({ length: 5 - board.length }, (_, i) => <button key={i} className="w-10 rounded border border-dashed border-white/15 text-neutral-600" onClick={() => setTarget("board")}>+</button>)}
            {kind === "dead" && !dead.length && <span className="self-center text-xs text-neutral-600">Нет исключённых карт</span>}
          </div>
        </div>)}
      </div>
      <div className="flex gap-2">
        <button className={BTN} onClick={() => {
          const deck = fullDeck().filter((c) => !dead.includes(c));
          for (let i = 0; i < 3; i++) { const j = i + Math.floor(Math.random() * (deck.length - i)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
          setCards(deck.slice(0, 3), dead);
        }}>Случайный флоп</button>
        <button className={BTN} onClick={() => setCards([], [])}>Очистить карты</button>
      </div>
    </div>
    <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
      {[2, 0, 1, 3].flatMap((suit) => Array.from({ length: 13 }, (_, r) => (12 - r) * 4 + suit)).map((c) => <button key={c}
        disabled={board.includes(c) || dead.includes(c) || (target === "board" && board.length === 5) || (target === "dead" && dead.length >= 43)}
        onClick={() => setCards(target === "board" ? [...board, c] : board, target === "dead" ? [...dead, c] : dead)}
        className="rounded bg-white/5 py-1.5 text-[10px] font-semibold hover:bg-white/15 disabled:opacity-15 sm:text-xs" style={{ color: suitColor(cardSuit(c)) }} aria-label={`Добавить ${prettyCard(c)}: ${target === "board" ? "борд" : "мёртвая карта"}`}>{prettyCard(c)}</button>)}
    </div>
    <p className="mt-2 text-[11px] text-neutral-500">Добавление: {target === "board" ? "борд" : "мёртвые карты"}. Нажмите выбранную карту, чтобы убрать её. Борд этого сравнения сохраняется отдельно от вкладки «Диапазоны».</p>
  </section>;
}

function ComparisonStats({ ranges, board, mask, filters, setFilters }: {
  ranges: Record<Side, Range>; board: Card[]; mask: bigint; filters: Record<Side, Filters>;
  setFilters: (side: Side, value: Filters) => void;
}) {
  const bd = { hero: breakdownRange(ranges.hero, board, mask), villain: breakdownRange(ranges.villain, board, mask) };
  if (board.length < 3) return <section className={BOX}><h2 className="font-semibold">Попадания в борд</h2><p className="mt-2 text-sm text-neutral-500">Выберите флоп, чтобы сравнить готовые руки и дро.</p></section>;
  return <section className={BOX}>
    <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Попадания в борд</h2><button className={BTN} onClick={() => { setFilters("hero", emptyFilters()); setFilters("villain", emptyFilters()); }}>Снять фильтры</button></div>
    <div className="mb-2 grid grid-cols-[minmax(100px,1fr)_1fr_1fr] gap-3 text-xs text-neutral-500"><span>Категория</span><span className="text-emerald-400">Hero</span><span className="text-sky-400">Villain</span></div>
    {[...MADE_ORDER, ...DRAW_ORDER].map((key) => {
      const made = MADE_ORDER.includes(key as MadeCategory);
      return <div key={key} className="grid grid-cols-[minmax(100px,1fr)_1fr_1fr] items-center gap-3 border-t border-white/5 py-1 text-[11px]">
        <span className="text-neutral-400">{made ? MADE_LABELS[key as MadeCategory] : DRAW_LABELS[key as DrawType]}</span>
        {(["hero", "villain"] as const).map((side) => {
          const count = made ? bd[side].made[key as MadeCategory] : bd[side].draws[key as DrawType];
          const share = bd[side].total ? count / bd[side].total : 0;
          const selected = made ? filters[side].made.includes(key as MadeCategory) : filters[side].draws.includes(key as DrawType);
          return <button key={side} aria-pressed={selected} aria-label={`${side}: ${made ? MADE_LABELS[key as MadeCategory] : DRAW_LABELS[key as DrawType]}`} title={`${side}: ${count.toFixed(2)} взвешенных комбо. Нажмите для фильтрации.`}
            className={`relative overflow-hidden rounded px-2 py-1 text-right tabular-nums ${selected ? "ring-1 ring-white/60" : "hover:bg-white/5"}`}
            onClick={() => {
              const f = filters[side];
              setFilters(side, made ? { ...f, made: selected ? f.made.filter((k) => k !== key) : [...f.made, key as MadeCategory] }
                : { ...f, draws: selected ? f.draws.filter((k) => k !== key) : [...f.draws, key as DrawType] });
            }}>
            <span className="absolute inset-y-0 left-0 opacity-20" style={{ width: pct(share), background: COLOR[side] }} />
            <span className="relative">{selected ? "✓ " : ""}{pct(share)} <span className="text-neutral-500">· {count.toFixed(1)}</span></span>
          </button>;
        })}
      </div>;
    })}
    <p className="mt-3 text-[11px] text-neutral-500">Доли от исходного диапазона с учётом борда и мёртвых карт. Выбранные категории объединяются по «ИЛИ» и фильтруют эквити. Дро пересекаются с готовыми руками.</p>
  </section>;
}

function EquityDetails({ result }: { result: EquityResult | null }) {
  const [side, setSide] = useState<Side>("hero");
  const [limit, setLimit] = useState(30);
  const a = [...(result?.combos?.a ?? [])].sort((x, y) => y.equity - x.equity);
  const b = [...(result?.combos?.b ?? [])].sort((x, y) => y.equity - x.equity);
  const rows = side === "hero" ? a : b;
  const path = (list: ComboEquity[]) => {
    const total = list.reduce((n, c) => n + c.weight, 0);
    let x = 0;
    return list.map((c, i) => { const start = x; x += c.weight / total * 440; return `${i ? "L" : "M"}${40 + start},${170 - c.equity * 150} L${40 + x},${170 - c.equity * 150}`; }).join(" ");
  };
  return <section className={BOX}>
    <h2 className="font-semibold">Распределение эквити</h2>
    {!result?.valid ? <p className="mt-3 text-sm text-neutral-500">График и комбинации появятся после расчёта.</p> : <>
      <svg viewBox="0 0 500 200" className="mt-3 w-full" role="img" aria-label="Эквити комбинаций от сильных к слабым: Hero зелёный, Villain голубой">
        {[0, 0.5, 1].map((v) => <g key={v}><line x1="40" x2="480" y1={170 - v * 150} y2={170 - v * 150} stroke="#ffffff15" /><text x="4" y={174 - v * 150} fill="#888" fontSize="10">{v * 100}%</text></g>)}
        <path d={path(a)} fill="none" stroke={COLOR.hero} strokeWidth="2" /><path d={path(b)} fill="none" stroke={COLOR.villain} strokeWidth="2" />
        <text x="40" y="190" fill="#888" fontSize="10">Сильнее</text><text x="410" y="190" fill="#888" fontSize="10">Слабее →</text>
      </svg>
      <p className="text-[11px] text-neutral-500"><span className="text-emerald-400">Hero</span> · <span className="text-sky-400">Villain</span>. По горизонтали — накопленный вес рассчитанных комбо. {result.exact ? "Точный перебор." : "Monte Carlo: редкие комбо менее точны; невыбранные в симуляции комбо не показаны."}</p>
      <div className="my-3 flex items-center gap-2">{(["hero", "villain"] as const).map((s) => <button key={s} className={`${BTN} ${side === s ? "bg-white/10" : ""}`} onClick={() => { setSide(s); setLimit(30); }}>{s === "hero" ? "Hero" : "Villain"}</button>)}<span className="text-xs text-neutral-500">{rows.length} комбо</span></div>
      <div className="max-h-72 overflow-auto"><table className="w-full text-right text-xs tabular-nums"><thead className="sticky top-0 bg-[#0f1614] text-neutral-500"><tr><th className="py-2 text-left">Комбо</th><th>Вес</th><th>Эквити</th><th>Победа</th><th>Ничья</th><th>N</th></tr></thead><tbody>
        {rows.slice(0, limit).map((r) => <tr key={r.index} className="border-t border-white/5"><td className="py-1.5 text-left">{ALL_COMBOS[r.index].map((c) => <span key={c} style={{ color: suitColor(cardSuit(c)) }}>{prettyCard(c)} </span>)}</td><td>{pct(r.weight)}</td><td style={{ color: COLOR[side] }}>{pct(r.equity)}</td><td>{pct(r.win)}</td><td>{pct(r.tie)}</td><td className="text-neutral-500">{r.samples}</td></tr>)}
      </tbody></table></div>
      {rows.length > limit && <button className={`${BTN} mt-2 w-full`} onClick={() => setLimit(rows.length)}>Показать все комбинации</button>}
    </>}
  </section>;
}

export function RangeComparison() {
  const ranges = useStore((s) => s.ranges);
  const rev = useStore((s) => s.rev);
  const board = useStore((s) => s.comparisonBoard);
  const dead = useStore((s) => s.comparisonDead);
  const filters = useStore((s) => s.comparisonFilters);
  const setFilter = useStore((s) => s.setComparisonFilters);
  const [samples, setSamples] = useState(80_000);
  const [heatmap, setHeatmap] = useState(false);
  const [nextCards, setNextCards] = useState(false);
  const [run, setRun] = useState(0);
  const mask = cardsToMask([...board, ...dead]);
  const filtered = useMemo(() => {
    const apply = (side: Side) => board.length >= 3 && hasFilters(filters[side])
      ? new Range(filterRange(ranges[side], board, mask, new Set(filters[side].made), new Set(filters[side].draws))) : ranges[side];
    return { hero: apply("hero"), villain: apply("villain") };
  }, [ranges, rev, board, mask, filters]);
  const validBoard = board.length === 0 || board.length >= 3;
  const signature = `${rev}|${board}|${dead}|${JSON.stringify(filters)}|${run}`;
  const { result, computing, error } = useEquity(validBoard ? filtered.hero : new Range(), filtered.villain, board, dead, signature, { samples, detail: true, nextCards });
  const filteredOn = board.length >= 3 && (hasFilters(filters.hero) || hasFilters(filters.villain));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-bold">Диапазон против диапазона</h1><p className="mt-1 text-xs text-neutral-500">Два диапазона, один борд. Пресеты из вкладки «Диапазоны» доступны здесь автоматически.</p></div>
      <label className="text-xs text-neutral-400"><input type="checkbox" checked={heatmap} onChange={(e) => setHeatmap(e.target.checked)} className="mr-2" />Матрицы по эквити</label>
    </div>
    <ComparisonCards />
    <div className={`${BOX} space-y-3`} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">Эквити {filteredOn && <span className="text-amber-400">· фильтры включены</span>}</h2>
        <div className="flex items-center gap-2"><select aria-label="Точность Monte Carlo" value={samples} onChange={(e) => setSamples(Number(e.target.value))} className="rounded border border-white/15 p-2 text-xs"><option value={80_000}>MC · 80 000</option><option value={300_000}>MC · 300 000</option><option value={1_000_000}>MC · 1 000 000</option></select><button className={BTN} onClick={() => setRun((r) => r + 1)}>Пересчитать</button></div>
      </div>
      {!validBoard ? <p className="text-sm text-amber-400">Добавьте все три карты флопа или очистите борд для префлопа.</p> : error ? <p role="alert" className="text-rose-400">{error}</p> : computing ? <p className="text-sm text-neutral-400">Расчёт эквити…</p> : !result?.valid ? <p className="text-sm text-neutral-400">Задайте два непустых диапазона. После блокеров и фильтров должна остаться хотя бы одна совместимая пара рук.</p> : <>
        <div className="flex justify-between gap-4">{(["a", "b"] as const).map((s) => <div key={s} className={s === "b" ? "text-right" : ""}><div className="text-xs text-neutral-500">{s === "a" ? "Hero" : "Villain"}</div><div className="text-3xl font-bold" style={{ color: s === "a" ? COLOR.hero : COLOR.villain }}>{pct(result[s].equity)}</div><div className="text-[11px] text-neutral-500">Победа {pct(result[s].win)} · ничья {pct(result[s].tie)}</div></div>)}</div>
        <div className="flex h-2 overflow-hidden rounded-full bg-sky-400"><div className="bg-emerald-400" style={{ width: pct(result.a.equity) }} /></div>
        <p className="text-[11px] text-neutral-500">{result.exact ? "Точный перебор" : "Оценка Monte Carlo"} · {result.samples.toLocaleString("ru-RU")} раскладов · Ничья делится поровну.</p>
      </>}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <RangeEditor side="hero" mask={mask} filtered={filtered.hero} eq={result?.combos?.a} heatmap={heatmap} />
      <RangeEditor side="villain" mask={mask} filtered={filtered.villain} eq={result?.combos?.b} heatmap={heatmap} />
    </div>
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <ComparisonStats ranges={ranges} board={board} mask={mask} filters={filters} setFilters={setFilter} />
      <EquityDetails result={result} />
    </div>
    <section className={BOX}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Следующая карта · Hotness</h2><label className="text-xs text-neutral-400"><input type="checkbox" checked={nextCards} onChange={(e) => setNextCards(e.target.checked)} className="mr-2" />Рассчитать все карты</label></div>
      <p className="mt-2 text-xs text-neutral-500">На флопе и тёрне: эквити Hero после выхода каждой карты. Зелёный — рост, красный — снижение. Веса текущего отфильтрованного диапазона фиксированы; новые блокеры учитываются. «≈» — оценка по 10 000 раскладов.</p>
      {nextCards && (board.length === 3 || board.length === 4) && computing && <p className="mt-3 text-sm text-neutral-400">Расчёт следующих карт…</p>}
      {result?.nextCards && <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-13">{[...result.nextCards].sort((a, b) => b.card - a.card).map(({ card, equity, exact }) => <div key={card} className="rounded-lg border border-white/10 p-2 text-center" style={{ background: equity === null ? "transparent" : equity >= result.a.equity ? "#34d39918" : "#fb718518" }}>
        <div className="text-sm font-bold" style={{ color: suitColor(cardSuit(card)) }}>{prettyCard(card)}</div><div className="mt-1 text-xs">{equity === null ? "—" : `${exact ? "" : "≈"}${pct(equity)}`}</div>
        {equity !== null && <div className="text-[10px] text-neutral-500">{equity >= result.a.equity ? "+" : ""}{((equity - result.a.equity) * 100).toFixed(1)} п.п.</div>}
      </div>)}</div>}
    </section>
  </div>;
}
