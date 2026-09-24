import { useMemo } from "react";
import { Hand } from "../hh/types";
import {
  EMPTY_FILTER,
  FISH_THRESHOLDS,
  FishThreshold,
  PlayerVpip,
  isFilterActive,
  limitLabel,
  limitsOf,
} from "../hh/filters";
import { useHhStore } from "../state/hhStore";

const DAY = 24 * 60 * 60 * 1000;

/** «2026-07-28» из поля даты → локальная полночь. */
function parseDay(s: string): number | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function formatDay(t: number | null): string {
  if (t === null) return "";
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function startOfDay(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const chip = (on: boolean) =>
  `rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
    on ? "bg-emerald-500 text-black" : "border border-white/10 text-neutral-400 hover:bg-white/5"
  }`;

/**
 * Период, лимиты и состав стола. Периоды считаются от последней раздачи в
 * базе, а не от сегодняшнего дня: «последние 7 дней» у старой выгрузки
 * иначе были бы пустыми.
 */
export function HandsFilter({
  hands,
  shown,
  vpips,
}: {
  hands: Hand[];
  shown: number;
  vpips: Map<string, PlayerVpip>;
}) {
  const filter = useHhStore((s) => s.filter);
  const setFilter = useHhStore((s) => s.setFilter);

  const limits = useMemo(() => limitsOf(hands), [hands]);
  const [first, last] = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const h of hands) {
      if (h.time < lo) lo = h.time;
      if (h.time > hi) hi = h.time;
    }
    return [lo, hi];
  }, [hands]);

  const lastDay = startOfDay(last);
  const periods: { label: string; from: number | null; to: number | null }[] = [
    { label: "Всё время", from: null, to: null },
    { label: "Последний день", from: lastDay, to: null },
    { label: "7 дней", from: lastDay - 6 * DAY, to: null },
    { label: "30 дней", from: lastDay - 29 * DAY, to: null },
  ];

  const toggleLimit = (bb: number) => {
    const set = new Set(filter.limits);
    if (set.has(bb)) set.delete(bb);
    else set.add(bb);
    setFilter({ limits: [...set].sort((a, b) => a - b) });
  };

  /** Сколько соперников в базе набрали выборку и сколько из них выше порога. */
  const known = useMemo(() => {
    let n = 0;
    const above: Record<number, number> = {};
    for (const [name, v] of vpips) {
      if (name === "Hero" || v.hands < filter.minHands) continue;
      n++;
      for (const t of FISH_THRESHOLDS) if (v.vpip >= t) above[t] = (above[t] ?? 0) + 1;
    }
    return { n, above };
  }, [vpips, filter.minHands]);

  const label = "text-[11px] uppercase tracking-wide text-neutral-500 w-24 shrink-0";

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0b100e] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={label}>Период</span>
        {periods.map((p) => (
          <button
            key={p.label}
            className={chip(filter.from === p.from && filter.to === p.to)}
            onClick={() => setFilter({ from: p.from, to: p.to })}
          >
            {p.label}
          </button>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
          с
          <input
            type="date"
            value={formatDay(filter.from)}
            min={formatDay(startOfDay(first))}
            max={formatDay(lastDay)}
            onChange={(e) => setFilter({ from: parseDay(e.target.value) })}
            className="rounded-md border border-white/10 bg-[#0f1513] px-2 py-1 text-xs text-neutral-200 [color-scheme:dark]"
          />
          по
          <input
            type="date"
            // `to` хранится не включительно — полночь следующего дня.
            value={filter.to === null ? "" : formatDay(filter.to - DAY)}
            min={formatDay(startOfDay(first))}
            max={formatDay(lastDay)}
            onChange={(e) => {
              const d = parseDay(e.target.value);
              setFilter({ to: d === null ? null : d + DAY });
            }}
            className="rounded-md border border-white/10 bg-[#0f1513] px-2 py-1 text-xs text-neutral-200 [color-scheme:dark]"
          />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={label}>Лимит</span>
        <button className={chip(filter.limits.length === 0)} onClick={() => setFilter({ limits: [] })}>
          Все
        </button>
        {limits.map((l) => (
          <button key={l.bb} className={chip(filter.limits.includes(l.bb))} onClick={() => toggleLimit(l.bb)}>
            {limitLabel(l.bb)} <span className="font-normal opacity-60">{l.count.toLocaleString("ru")}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={label}>За столом</span>
        <button className={chip(filter.fish === 0)} onClick={() => setFilter({ fish: 0 })}>
          Любой состав
        </button>
        {(["with", "without"] as const).map((mode) =>
          FISH_THRESHOLDS.map((t) => (
            <button
              key={`${mode}${t}`}
              className={chip(filter.fish === t && filter.fishMode === mode)}
              onClick={() => setFilter({ fish: t as FishThreshold, fishMode: mode })}
              title={`${known.above[t] ?? 0} игроков в базе с VPIP ≥ ${t}%`}
            >
              {mode === "with" ? "есть" : "нет"} VPIP {t}+
            </button>
          )),
        )}
        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
          выборка от
          <select
            value={filter.minHands}
            onChange={(e) => setFilter({ minHands: Number(e.target.value) })}
            className="rounded-md border border-white/10 bg-[#0f1513] px-1.5 py-1 text-xs text-neutral-200"
          >
            {[10, 20, 30, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          раздач
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <span>
          Показано <b className="text-neutral-200">{shown.toLocaleString("ru")}</b> из{" "}
          {hands.length.toLocaleString("ru")} раздач
        </span>
        {filter.fish !== 0 && (
          <span>
            VPIP соперников — по всей базе; известны {known.n.toLocaleString("ru")} игроков с выборкой от{" "}
            {filter.minHands} раздач
          </span>
        )}
        {isFilterActive(filter) && (
          <button
            className="text-emerald-400 hover:underline"
            onClick={() => setFilter({ ...EMPTY_FILTER, minHands: filter.minHands })}
          >
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
