import { useMemo } from "react";
import { Hand } from "../hh/types";
import { handLog } from "../hh/log";
import { Decision, DEVIATIONS, VERDICT_LABELS, Verdict } from "../hh/deviations";
import { presetById } from "../presets/all";
import { actionEdges, familyLabel, questionWeights } from "../presets/quiz";
import { cardRank, cardSuit, RANKS, SUIT_SYMBOLS } from "../engine/cards";
import { suitColor } from "./colors";
import { useStore } from "../state/store";

const VERDICT_TONE: Record<Verdict, string> = {
  ok: "text-emerald-400",
  mixed: "text-sky-400",
  loose: "text-amber-400",
  tight: "text-violet-400",
  action: "text-rose-400",
};

const ACTION_LABELS: Record<Decision["action"], string> = {
  raise: "рейз",
  call: "колл",
  fold: "фолд",
};

const bb = (n: number) =>
  Math.abs(n) < 0.05 ? "0bb" : `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}bb`;

function Card({ card }: { card: number }) {
  const suit = cardSuit(card);
  return (
    <span
      className="inline-flex h-7 w-6 items-center justify-center rounded border border-white/15 bg-[#141a18] text-xs font-bold"
      style={{ color: suitColor(suit) }}
    >
      {RANKS[cardRank(card)]}
      {SUIT_SYMBOLS[suit]}
    </span>
  );
}

/** Полоска частот чарта: сколько времени рука играется каждым действием. */
function Frequencies({ weights }: { weights: Record<"raise" | "call" | "fold", number> }) {
  const parts: { key: "raise" | "call" | "fold"; label: string; color: string }[] = [
    { key: "raise", label: "рейз", color: "#ef4444" },
    { key: "call", label: "колл", color: "#22c07b" },
    { key: "fold", label: "фолд", color: "#4b5551" },
  ];
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded bg-white/5">
        {parts.map(({ key, label, color }) =>
          weights[key] < 0.005 ? null : (
            <div
              key={key}
              title={`${label} ${Math.round(weights[key] * 100)}%`}
              style={{ width: `${weights[key] * 100}%`, background: color }}
            />
          ),
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-neutral-400">
        {parts.map(({ key, label, color }) =>
          weights[key] < 0.005 ? null : (
            <span key={key} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
              {label} {Math.round(weights[key] * 100)}%
            </span>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Разбор одной раздачи: что говорит чарт, где проходит граница и полный лог
 * с подсветкой того самого решения.
 */
export function HandLogView({
  hand,
  decision,
  onClose,
}: {
  hand: Hand;
  decision: Decision;
  onClose: () => void;
}) {
  const log = useMemo(() => handLog(hand), [hand]);
  const preset = presetById(decision.presetId);
  const applyPreset = useStore((s) => s.applyPreset);

  const weights = preset ? questionWeights(preset, decision.label) : null;
  const edges = preset ? actionEdges(preset, decision.label) : [];
  const hero = log.results.find((r) => r.isHero);
  const isDeviation = DEVIATIONS.includes(decision.verdict);

  return (
    <div className="rounded-2xl border border-white/15 bg-[#0f1513]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {hero?.cards?.map((c) => <Card key={c} card={c} />)}
        </div>
        <div>
          <div className="text-sm font-semibold">
            {decision.label} · {decision.spot}
          </div>
          <div className="text-[11px] text-neutral-500">
            {new Date(decision.time).toLocaleString("ru")} · раздача {decision.handId}
            {!decision.fullRing && " · стол неполный"}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-400 hover:bg-white/5"
        >
          Закрыть
        </button>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {/* ── Что говорит чарт ── */}
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs text-neutral-500">Вы сыграли</span>
              <span className="font-semibold">{ACTION_LABELS[decision.action]}</span>
              <span className={`ml-auto text-xs font-semibold ${VERDICT_TONE[decision.verdict]}`}>
                {VERDICT_LABELS[decision.verdict]}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-neutral-500">
              Чарт играет так {Math.round(decision.weight * 100)}% времени
            </div>
          </div>

          {weights && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <span className="text-xs text-neutral-500">Чарт для {decision.label}</span>
                <button
                  onClick={() => applyPreset(decision.presetId, true)}
                  title="Открыть этот чарт в матрице на вкладке «Диапазоны»"
                  className="ml-auto rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 hover:bg-white/5"
                >
                  {decision.presetId}
                </button>
              </div>
              <Frequencies weights={weights} />
              {decision.note && (
                <div className="mt-2 text-[11px] text-neutral-500">{decision.note}</div>
              )}
            </div>
          )}

          {edges.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs text-neutral-500">
                Граница среди {familyLabel(decision.label)}
              </div>
              <ul className="mt-1.5 space-y-1 text-sm">
                {edges.map((e) => (
                  <li key={e.kind}>
                    <span className="text-neutral-400">
                      {e.kind === "call" ? "колл" : "рейз"} —{" "}
                    </span>
                    <span className="font-semibold">до {e.weakest}</span>
                    {e.partial && <span className="text-neutral-500"> (частично)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Лог раздачи ── */}
        <div className="space-y-3">
          {log.streets.map((s) => (
            <div key={s.street}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  {s.label}
                </span>
                <span className="flex gap-1">
                  {s.board.slice(s.street === "flop" ? 0 : -1).map((c) => (
                    <Card key={c} card={c} />
                  ))}
                </span>
                <span className="ml-auto text-[11px] text-neutral-600">
                  банк {s.potBefore.toFixed(1)}bb
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border border-white/10">
                {s.actions.map((a) => {
                  const focused = a.index === decision.actionIndex;
                  return (
                    <div
                      key={a.index}
                      className={`flex items-center gap-2 px-2.5 py-1 text-sm ${
                        focused
                          ? isDeviation
                            ? "bg-rose-500/15 ring-1 ring-inset ring-rose-500/40"
                            : "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40"
                          : a.isHero
                            ? "bg-white/[0.04]"
                            : ""
                      } ${a.isPost ? "text-neutral-600" : ""}`}
                    >
                      <span
                        className={`w-9 shrink-0 text-[11px] font-semibold ${
                          a.isHero ? "text-emerald-400" : "text-neutral-500"
                        }`}
                      >
                        {a.position}
                      </span>
                      <span className={a.isHero && !a.isPost ? "font-semibold" : ""}>{a.text}</span>
                      {focused && (
                        <span
                          className={`ml-auto text-[10px] font-semibold uppercase ${VERDICT_TONE[decision.verdict]}`}
                        >
                          ← {isDeviation ? "отклонение" : "разбираемое решение"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {log.runs.length > 1 && (
            <div className="text-[11px] text-neutral-500">
              Борд разыгран {log.runs.length} раза (run it twice).
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-white/10">
            <div className="border-b border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-wide text-neutral-500">
              Итог · банк {log.pot.toFixed(1)}bb, рейк {log.rake.toFixed(1)}bb
            </div>
            {log.results.map((r) => (
              <div
                key={r.position}
                className={`flex items-center gap-2 px-2.5 py-1 text-sm ${r.isHero ? "bg-white/[0.04]" : ""}`}
              >
                <span
                  className={`w-9 shrink-0 text-[11px] font-semibold ${
                    r.isHero ? "text-emerald-400" : "text-neutral-500"
                  }`}
                >
                  {r.position}
                </span>
                <span className="flex gap-1">
                  {r.cards?.map((c) => <Card key={c} card={c} />) ?? (
                    <span className="text-[11px] text-neutral-600">
                      {r.folded ? "сфолдил" : "не вскрылся"}
                    </span>
                  )}
                </span>
                <span
                  className={`ml-auto tabular-nums ${
                    r.net > 0 ? "text-emerald-400" : r.net < 0 ? "text-rose-400" : "text-neutral-500"
                  }`}
                >
                  {bb(r.net)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
