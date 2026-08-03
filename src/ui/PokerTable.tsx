import { useEffect, useMemo, useRef, useState } from "react";
import { Scene, SceneActionKind, SceneStep, potAfter } from "../presets/scene";
import { SUIT_SYMBOLS, SuitIndex } from "../engine/cards";
import { suitColor } from "./colors";

/** Пауза между ходами соперников, мс. */
const STEP_MS = 520;
/** Блайнды выставляются быстрее: это не решение, а формальность. */
const BLIND_MS = 200;

export interface HeroAction {
  label: string;
  kind: SceneActionKind;
  /** Верно ли сыграно — красит фишку и облако. Null, пока не проверено. */
  correct: boolean | null;
}

const KIND_STYLE: Record<SceneActionKind, { bg: string; text: string }> = {
  fold: { bg: "bg-neutral-700/70", text: "text-neutral-300" },
  blind: { bg: "bg-neutral-600/60", text: "text-neutral-200" },
  check: { bg: "bg-sky-600/70", text: "text-sky-50" },
  limp: { bg: "bg-sky-600/70", text: "text-sky-50" },
  call: { bg: "bg-emerald-600/80", text: "text-emerald-50" },
  raise: { bg: "bg-amber-500/80", text: "text-amber-950" },
  "3bet": { bg: "bg-orange-500/85", text: "text-orange-950" },
  "4bet": { bg: "bg-rose-600/85", text: "text-rose-50" },
  push: { bg: "bg-fuchsia-600/85", text: "text-fuchsia-50" },
};

/**
 * Места по эллипсу: герой всегда внизу по центру, остальные разложены по
 * кругу в порядке хода. Так стол читается одинаково в любом споте.
 */
function seatPos(index: number, heroIndex: number, n: number): { left: string; top: string } {
  const rel = (index - heroIndex + n) % n;
  const angle = (Math.PI / 2) + (rel * 2 * Math.PI) / n;
  return {
    left: `${50 + 41 * Math.cos(angle)}%`,
    // По вертикали радиус меньше: место героя внизу — самое высокое (карты
    // крупнее рубашек), и на 39% его фишки уже вылезали за пределы стола.
    top: `${50 + 34 * Math.sin(angle)}%`,
  };
}

function Chips({ amount, tone }: { amount: number; tone: string }) {
  return (
    <div className="pc-pop flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold shadow">
      <span className={`inline-block h-2.5 w-2.5 rounded-full border border-black/40 ${tone}`} />
      <span className="text-neutral-200">{amount}bb</span>
    </div>
  );
}

function MiniCard({ rank, suit }: { rank: string; suit: SuitIndex }) {
  return (
    <div className="pc-deal flex h-11 w-8 flex-col items-center justify-center rounded-md border border-white/20 bg-[#111815] text-sm font-black leading-none">
      <span style={{ color: suitColor(suit) }}>{rank}</span>
      <span style={{ color: suitColor(suit) }} className="text-xs">
        {SUIT_SYMBOLS[suit]}
      </span>
    </div>
  );
}

/** Рубашка карт — у всех, кто ещё в раздаче. */
function CardBacks() {
  return (
    <div className="flex gap-0.5">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-6 w-4 rounded-[3px] border border-white/15 bg-gradient-to-br from-[#1d3a30] to-[#12241d]"
        />
      ))}
    </div>
  );
}

export function PokerTable({
  scene,
  cards,
  heroAction,
  /** Меняется на каждый новый вопрос — по нему сцена играется заново. */
  questionKey,
}: {
  scene: Scene;
  cards: { rank: string; suit: SuitIndex }[];
  heroAction: HeroAction | null;
  questionKey: string;
}) {
  const [shown, setShown] = useState(0);
  const timer = useRef<number | null>(null);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      setShown(scene.steps.length);
      return;
    }
    setShown(0);
    if (scene.steps.length === 0) return;
    let i = 0;
    const tick = () => {
      i += 1;
      setShown(i);
      if (i < scene.steps.length) {
        timer.current = window.setTimeout(
          tick,
          scene.steps[i].kind === "blind" ? BLIND_MS : STEP_MS,
        );
      }
    };
    timer.current = window.setTimeout(tick, scene.steps[0].kind === "blind" ? BLIND_MS : 320);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
    // questionKey — тот самый «новый вопрос»: сцена одного спота переигрывается
    // и при повторе того же чарта с другой рукой.
  }, [questionKey, scene, reduced]);

  /** Ответ игрока обрывает проигрывание: стол сразу в состоянии решения. */
  useEffect(() => {
    if (!heroAction) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    setShown(scene.steps.length);
  }, [heroAction, scene.steps.length]);

  const skip = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setShown(scene.steps.length);
  };

  const done = shown >= scene.steps.length;

  /** Последнее показанное действие каждого места. */
  const acted = useMemo(() => {
    const m = new Map<string, SceneStep>();
    for (const s of scene.steps.slice(0, shown)) {
      // Блайнд — не решение: его затирает любой последующий ход этого места.
      if (s.kind === "blind" && m.has(s.seat)) continue;
      m.set(s.seat, s);
    }
    return m;
  }, [scene, shown]);

  const bets = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scene.steps.slice(0, shown)) {
      if (s.kind === "fold" || s.kind === "check" || s.amount === undefined) continue;
      m.set(s.seat, Math.max(m.get(s.seat) ?? 0, s.amount));
    }
    return m;
  }, [scene, shown]);

  const pot = potAfter(scene.steps, shown);
  const heroIndex = Math.max(0, scene.seats.findIndex((s) => s.id === scene.heroId));

  return (
    <div
      onClick={done ? undefined : skip}
      className={`relative aspect-[16/9] w-full select-none ${done ? "" : "cursor-pointer"}`}
    >
      {/* Сукно */}
      <div className="absolute inset-[8%] rounded-[50%] border-4 border-[#0d1a15] bg-[radial-gradient(ellipse_at_center,#17352b_0%,#0f231d_70%,#0b1a15_100%)] shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]" />

      {/* Банк */}
      {/* Банк выше центра: внизу к нему подступает облако действия героя. */}
      <div className="absolute left-1/2 top-[36%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
        {pot > 0 && (
          <>
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="pc-pop inline-block h-2 w-2 rounded-full bg-amber-400/80 shadow"
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-amber-200/90">Банк {pot}bb</span>
          </>
        )}
        {scene.stack && (
          <span className="text-[10px] uppercase tracking-wider text-emerald-300/50">
            стек {scene.stack}
          </span>
        )}
      </div>

      {scene.seats.map((s, i) => {
        const pos = seatPos(i, heroIndex, scene.seats.length);
        const step = acted.get(s.id);
        const bet = bets.get(s.id);
        const folded = step?.kind === "fold";
        const isHero = s.id === scene.heroId;
        const action = isHero && heroAction ? heroAction : null;
        const style =
          KIND_STYLE[action ? action.kind : step && step.kind !== "blind" ? step.kind : "blind"];
        // Свой ход красим по вердикту, чужие — по типу действия.
        const bubbleClass = action
          ? action.correct === null
            ? "bg-neutral-600/80 text-neutral-100"
            : action.correct
              ? "bg-emerald-500 text-black"
              : "bg-rose-600 text-white"
          : `${style.bg} ${style.text}`;

        return (
          <div
            key={s.id}
            className="absolute flex flex-col items-center gap-1"
            // Место героя выше остальных (карты крупнее рубашек) и стоит у
            // нижнего края — центрируй его как все, и фишки уедут под стол.
            style={{ ...pos, transform: `translate(-50%, ${isHero ? "-72%" : "-50%"})` }}
          >
            {/* Облако действия — над местом */}
            <div className="h-5">
              {(step && step.kind !== "blind") || action ? (
                <span
                  className={`pc-pop inline-block rounded-full px-2 py-0.5 text-[10px] font-bold shadow ${bubbleClass}`}
                >
                  {action ? action.label : step!.label}
                </span>
              ) : null}
            </div>

            {/* Само место */}
            <div
              className={`flex flex-col items-center gap-1 rounded-xl border px-2.5 py-1.5 transition-all duration-300 ${
                isHero
                  ? "border-emerald-400/70 bg-[#10201a] shadow-[0_0_18px_rgba(52,199,123,0.25)]"
                  : "border-white/10 bg-[#0e1512]"
              } ${folded ? "opacity-30 grayscale" : ""} ${
                isHero && !action && done ? "pc-turn" : ""
              }`}
            >
              <span
                className={`text-[11px] font-bold ${
                  isHero ? "text-emerald-300" : s.exact ? "text-neutral-300" : "text-neutral-500"
                }`}
              >
                {s.label}
              </span>
              {isHero ? (
                <div className="flex gap-1">
                  {cards.map((c, k) => (
                    <MiniCard key={k} rank={c.rank} suit={c.suit} />
                  ))}
                </div>
              ) : folded ? (
                <div className="h-6 text-[10px] leading-6 text-neutral-600">—</div>
              ) : (
                <CardBacks />
              )}
            </div>

            {/* Фишки перед местом */}
            <div className="h-4">
              {bet !== undefined && !folded && (
                <Chips
                  amount={bet}
                  tone={
                    step?.kind === "blind"
                      ? "bg-neutral-400"
                      : step?.kind === "limp"
                        ? "bg-sky-400"
                        : "bg-amber-400"
                  }
                />
              )}
            </div>
          </div>
        );
      })}

      {!done && (
        <span className="absolute bottom-1 right-2 text-[10px] text-neutral-600">
          клик — пропустить раздачу
        </span>
      )}
    </div>
  );
}
