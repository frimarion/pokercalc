import { useEffect, useMemo, useRef, useState } from "react";
import { Hand } from "../hh/types";
import { analyzeEv } from "../hh/allinEv";
import { buildGraph } from "../hh/graph";
import { EvChart } from "./EvChart";

const money = (cents: number) => `${cents < 0 ? "−" : ""}$${Math.abs(cents / 100).toFixed(2)}`;

const STREET_LABEL: Record<string, string> = {
  preflop: "префлоп",
  flop: "флоп",
  turn: "тёрн",
  river: "ривер",
};

/** EV-скорректированный винрейт и разбор каждого олл-ина. */
export function HandsEv({ hands }: { hands: Hand[] }) {
  const ev = useMemo(() => analyzeEv(hands), [hands]);
  const points = useMemo(() => buildGraph(hands), [hands]);
  const [focus, setFocus] = useState<string | null>(null);
  const rows = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const chart = useRef<HTMLDivElement>(null);

  // Клик по отметке олл-ина на графике — прокрутить таблицу к этой раздаче.
  const focusFromChart = (id: string) => {
    setFocus(id);
    rows.current.get(id)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  useEffect(() => setFocus(null), [hands]);

  if (ev.spots.length === 0) {
    return (
      <div className="space-y-4">
        <EvChart points={points} />
        <div className="text-sm text-neutral-500">
          Олл-инов со вскрытием в базе нет — EV-линия совпадает с фактической.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div ref={chart} className="rounded-2xl border border-white/10 bg-[#0f1513] p-4">
        <EvChart points={points} focusId={focus} onFocus={focusFromChart} />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Олл-ины ({ev.spots.length})
          <span className="ml-2 font-normal normal-case tracking-normal text-neutral-600">
            клик по строке — показать на графике
          </span>
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Раздача</th>
                <th className="px-3 py-2 text-left font-semibold">Улица</th>
                <th className="px-3 py-2 text-right font-semibold">Эквити</th>
                <th className="px-3 py-2 text-right font-semibold">Банк</th>
                <th className="px-3 py-2 text-right font-semibold">Факт</th>
                <th className="px-3 py-2 text-right font-semibold">EV</th>
                <th className="px-3 py-2 text-right font-semibold">Разница</th>
              </tr>
            </thead>
            <tbody>
              {[...ev.spots]
                .sort((a, b) => a.actual - a.ev - (b.actual - b.ev))
                .map((s) => {
                  const diff = s.actual - s.ev;
                  return (
                    <tr
                      key={s.handId}
                      ref={(el) => {
                        if (el) rows.current.set(s.handId, el);
                        else rows.current.delete(s.handId);
                      }}
                      onClick={() => {
                        const next = focus === s.handId ? null : s.handId;
                        setFocus(next);
                        if (next) chart.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                      }}
                      className={`cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03] ${
                        focus === s.handId ? "bg-amber-500/10" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-neutral-500">{s.handId}</td>
                      <td className="px-3 py-2 text-neutral-400">{STREET_LABEL[s.street]}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(s.equity * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-400">
                        {money(s.pot)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${s.actual >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {money(s.actual)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-300">
                        {money(Math.round(s.ev))}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold tabular-nums ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {diff >= 0 ? "+" : "−"}${Math.abs(diff / 100).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-neutral-600">
          Считаются только хедз-ап олл-ины, где вскрылись оба: эквити берётся на момент, когда
          ставки кончились, и умножается на банк без рейка. Многовей требует разбора сайд-потов —
          такие раздачи{ev.skipped > 0 ? ` (${ev.skipped} шт.)` : ""} входят в EV фактическим
          результатом. Раннаут до тёрна и ривера перебирается точно, префлоп — методом
          Монте-Карло с фиксированным зерном, поэтому цифра не пляшет между запусками.
        </p>
      </section>
    </div>
  );
}
