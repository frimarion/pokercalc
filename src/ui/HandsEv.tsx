import { useMemo } from "react";
import { Hand } from "../hh/types";
import { analyzeEv, cachedAllInSpot } from "../hh/allinEv";

const money = (cents: number) => `${cents < 0 ? "−" : ""}$${Math.abs(cents / 100).toFixed(2)}`;

const STREET_LABEL: Record<string, string> = {
  preflop: "префлоп",
  flop: "флоп",
  turn: "тёрн",
  river: "ривер",
};

interface Point {
  x: number;
  actual: number;
  ev: number;
}

function luckInBb(hands: Hand[]): number {
  let luck = 0;
  for (const h of hands) {
    const hero = h.players.find((p) => p.name === h.hero);
    if (!hero) continue;
    const net = hero.collected - hero.contributed;
    luck += (net - (cachedAllInSpot(h)?.ev ?? net)) / h.bb;
  }
  return luck;
}

/** Накопленный итог героя в bb: фактический и EV-скорректированный. */
function buildCurve(hands: Hand[]): Point[] {
  const out: Point[] = [];
  let actual = 0;
  let ev = 0;
  let i = 0;
  for (const h of hands) {
    const hero = h.players.find((p) => p.name === h.hero);
    if (!hero) continue;
    const net = hero.collected - hero.contributed;
    const spot = cachedAllInSpot(h);
    actual += net / h.bb;
    ev += (spot ? spot.ev : net) / h.bb;
    out.push({ x: ++i, actual, ev });
  }
  return out;
}

/** График накопленного выигрыша — линия факта и линия EV. */
function Chart({ points }: { points: Point[] }) {
  const W = 640;
  const H = 220;
  const PAD = 8;
  if (points.length < 2) return null;

  const values = points.flatMap((p) => [p.actual, p.ev]);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - 2 * PAD);

  const path = (get: (p: Point) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(get(p)).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: `${W}/${H}` }}>
      <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      <path d={path((p) => p.ev)} fill="none" stroke="#38bdf8" strokeWidth={1.5} opacity={0.85} />
      <path d={path((p) => p.actual)} fill="none" stroke="#22c07b" strokeWidth={1.8} />
    </svg>
  );
}

/** EV-скорректированный винрейт и разбор каждого олл-ина. */
export function HandsEv({ hands }: { hands: Hand[] }) {
  const ev = useMemo(() => analyzeEv(hands), [hands]);
  const points = useMemo(() => buildCurve(hands), [hands]);

  if (ev.spots.length === 0) {
    return (
      <div className="space-y-4">
        <Chart points={points} />
        <div className="text-sm text-neutral-500">
          Олл-инов со вскрытием в базе нет — EV-линия совпадает с фактической.
        </div>
      </div>
    );
  }

  const luck = ev.actual - ev.ev;
  const luckBb = luckInBb(hands);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-[#0f1513] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-[#22c07b]" /> факт: {money(ev.actual)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-[#38bdf8]" /> по EV: {money(ev.ev)}
          </span>
          <span className={`ml-auto font-semibold ${luck >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {luck >= 0 ? "Выше EV на " : "Ниже EV на "}
            {money(Math.abs(luck))} ({Math.abs(luckBb).toFixed(1)} bb)
          </span>
        </div>
        <Chart points={points} />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Олл-ины ({ev.spots.length})
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
                    <tr key={s.handId} className="border-t border-white/5">
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
