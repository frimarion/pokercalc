import { useMemo } from "react";
import { Hand } from "../hh/types";
import { computeStats, statsByPosition, pct, STAT_ORDER, STAT_LABELS, StatKey } from "../hh/stats";
import { analyzeEv } from "../hh/allinEv";

const money = (cents: number) => `${cents < 0 ? "−" : ""}$${Math.abs(cents / 100).toFixed(2)}`;
const signed = (n: number, digits = 2) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}`;

function winrateColor(bb100: number): string {
  return bb100 > 0 ? "text-emerald-400" : bb100 < 0 ? "text-rose-400" : "text-neutral-300";
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1513] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-1 text-xl font-black ${tone ?? "text-neutral-100"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-500">{hint}</div>}
    </div>
  );
}

/** Сводка, HUD-статы и разбивка по позициям. */
export function HandsStats({ hands }: { hands: Hand[] }) {
  const stats = useMemo(() => computeStats(hands), [hands]);
  const byPos = useMemo(() => statsByPosition(hands), [hands]);
  const ev = useMemo(() => analyzeEv(hands), [hands]);

  if (stats.hands === 0) {
    return <div className="text-sm text-neutral-500">В базе нет раздач с вашим участием.</div>;
  }

  const luck = ev.actual - ev.ev;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Раздач" value={stats.hands.toLocaleString("ru")} hint={`${byPos.length} позиций`} />
        <Tile
          label="Винрейт"
          value={`${signed(stats.bbPer100)} bb/100`}
          hint={money(stats.net)}
          tone={winrateColor(stats.bbPer100)}
        />
        <Tile
          label="EV-винрейт"
          value={`${signed(ev.evBb100)} bb/100`}
          hint={`${ev.spots.length} олл-инов посчитано${ev.skipped > 0 ? `, ${ev.skipped} не удалось` : ""}`}
          tone={winrateColor(ev.evBb100)}
        />
        <Tile
          label={luck >= 0 ? "Забрал сверх EV" : "Недобрал против EV"}
          value={money(Math.abs(luck))}
          hint={`${signed(stats.bbPer100 - ev.evBb100)} bb/100 к дистанции`}
          tone={luck >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Статистика
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {STAT_ORDER.map((k) => {
            const c = stats.counters[k];
            const p = pct(c);
            return (
              <div
                key={k}
                title={STAT_LABELS[k].full}
                className="rounded-lg border border-white/10 bg-[#0f1513] px-3 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[11px] text-neutral-400">{STAT_LABELS[k].short}</span>
                  <span className="text-sm font-bold tabular-nums">
                    {p === null ? "—" : `${p.toFixed(1)}%`}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] tabular-nums text-neutral-600">
                  {c.made} / {c.opp}
                </div>
              </div>
            );
          })}
          <div
            title="Постфлоп-агрессия: (ставки + рейзы) / коллы"
            className="rounded-lg border border-white/10 bg-[#0f1513] px-3 py-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-neutral-400">AF</span>
              <span className="text-sm font-bold tabular-nums">
                {Number.isFinite(stats.af) ? stats.af.toFixed(2) : "∞"}
              </span>
            </div>
            <div className="mt-0.5 text-[10px] tabular-nums text-neutral-600">
              {stats.aggressive} / {stats.passive}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          По позициям
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Место</th>
                <th className="px-3 py-2 text-right font-semibold">Раздач</th>
                {(["vpip", "pfr", "threeBet", "cbetFlop", "wtsd"] as StatKey[]).map((k) => (
                  <th key={k} className="px-3 py-2 text-right font-semibold" title={STAT_LABELS[k].full}>
                    {STAT_LABELS[k].short}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">bb/100</th>
              </tr>
            </thead>
            <tbody>
              {byPos.map(({ position, stats: s }) => (
                <tr key={position} className="border-t border-white/5">
                  <td className="px-3 py-2 font-semibold">{position}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-400">{s.hands}</td>
                  {(["vpip", "pfr", "threeBet", "cbetFlop", "wtsd"] as StatKey[]).map((k) => {
                    const p = pct(s.counters[k]);
                    return (
                      <td key={k} className="px-3 py-2 text-right tabular-nums">
                        {p === null ? <span className="text-neutral-600">—</span> : `${p.toFixed(0)}%`}
                      </td>
                    );
                  })}
                  <td className={`px-3 py-2 text-right tabular-nums ${winrateColor(s.bbPer100)}`}>
                    {signed(s.bbPer100, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-neutral-600">
          Позиции выводятся от места баттона. Раздачи со входом в игру через пропущенный блайнд в
          разбивку не идут — там место определить нельзя.
        </p>
      </section>
    </div>
  );
}
