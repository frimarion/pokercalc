import { useMemo } from "react";
import { Hand, heroPlayer } from "../hh/types";
import { handLog } from "../hh/log";
import { GraphPoint } from "../hh/graph";
import { limitLabel } from "../hh/filters";
import { Card, HandLogBody, LogFocus, bb } from "./HandLogView";

const money = (cents: number) => `${cents > 0 ? "+" : cents < 0 ? "−" : ""}$${Math.abs(cents / 100).toFixed(2)}`;

/**
 * Раздача, выбранная на графике: шапка с итогом и EV олл-ина, лог по улицам
 * и листание соседних раздач. Олл-ин героя подсвечивается в логе так же, как
 * разбираемое решение в сверке с чартами.
 */
export function HandView({
  hand,
  point,
  total,
  onStep,
  onClose,
}: {
  hand: Hand;
  point: GraphPoint;
  /** Всего точек на графике — для «N из M» и границ листания. */
  total: number;
  onStep: (delta: number) => void;
  onClose: () => void;
}) {
  const log = useMemo(() => handLog(hand), [hand]);
  const hero = heroPlayer(hand);
  const spot = point.allIn;

  const focus = useMemo((): LogFocus | undefined => {
    if (!spot) return undefined;
    const index = hand.actions.findIndex((a) => a.player === hand.hero && a.allIn);
    if (index < 0) return undefined;
    const lucky = spot.actual >= spot.ev;
    return {
      index,
      bad: !lucky,
      label: `олл-ин · эквити ${(spot.equity * 100).toFixed(1)}%`,
      tone: lucky ? "text-emerald-400" : "text-rose-400",
    };
  }, [hand, spot]);

  const nav = "rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:bg-white/5 disabled:opacity-30";

  return (
    <div className="rounded-2xl border border-white/15 bg-[#0f1513]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {hero?.cards?.map((c) => <Card key={c} card={c} />)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            Раздача {point.n.toLocaleString("ru")} из {total.toLocaleString("ru")}
            {hero && <span className="text-neutral-400"> · {hero.position}</span>}
            <span
              className={`ml-2 tabular-nums ${point.net[1] > 0 ? "text-emerald-400" : point.net[1] < 0 ? "text-rose-400" : "text-neutral-400"}`}
            >
              {bb(point.net[0])} ({money(point.net[1])})
            </span>
          </div>
          <div className="truncate text-[11px] text-neutral-500">
            {new Date(hand.time).toLocaleString("ru")} · {limitLabel(hand.bb)} · {hand.table} · {hand.id}
          </div>
          {spot && (
            <div className="mt-0.5 text-[11px] text-neutral-400">
              Олл-ин, эквити {(spot.equity * 100).toFixed(1)}% · по EV {bb(spot.ev / hand.bb)} · удача{" "}
              <span className={spot.actual >= spot.ev ? "text-emerald-400" : "text-rose-400"}>
                {bb((spot.actual - spot.ev) / hand.bb)}
              </span>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button className={nav} disabled={point.n <= 1} onClick={() => onStep(-1)} title="Предыдущая раздача (←)">
            ←
          </button>
          <button className={nav} disabled={point.n >= total} onClick={() => onStep(1)} title="Следующая раздача (→)">
            →
          </button>
          <button className={nav} onClick={onClose} title="Esc">
            Закрыть
          </button>
        </div>
      </div>
      <div className="p-4">
        <HandLogBody log={log} focus={focus} />
      </div>
    </div>
  );
}
