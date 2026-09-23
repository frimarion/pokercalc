import { CSSProperties, useMemo } from "react";
import { Scene, SceneActionKind, SceneSeat, SceneStep } from "../presets/scene";
import { SUIT_SYMBOLS, SuitIndex } from "../engine/cards";
import { suitColor } from "./colors";
import { useIsCompact } from "./useMedia";

export interface HeroAction {
  label: string;
  kind: SceneActionKind;
  /** Верно ли сыграно — красит фишку и облако. Null, пока не проверено. */
  correct: boolean | null;
  /** Сколько фишек кладёт герой — только когда размер однозначен (колл, пуш). */
  amount?: number;
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
 * Форма стола. На десктопе он лежачий (16:9) с широким горизонтальным
 * радиусом, на телефоне — стоячий, как в мобильных покерных клиентах: в
 * ширину места разъехаться некуда, а вниз экран длинный. Радиусы меняются
 * вместе с пропорцией, иначе места налезают друг на друга (на 8-max SB
 * буквально скрывался за BB).
 */
function tableShape(compact: boolean, seats: number) {
  if (!compact) return { ratio: 16 / 9, rx: 41, ry: 34, inset: "8%" };
  // 8-max тянется вверх сильнее: там по три места в каждой боковой колонке.
  return { ratio: seats > 6 ? 4 / 5 : 6 / 5, rx: 35, ry: 40, inset: "5%" };
}

/**
 * Места по эллипсу: герой всегда внизу по центру, остальные разложены по
 * кругу в порядке хода. Так стол читается одинаково в любом споте.
 */
function seatPos(
  index: number,
  heroIndex: number,
  n: number,
  shape: { rx: number; ry: number },
): { left: string; top: string } {
  const rel = (index - heroIndex + n) % n;
  const angle = (Math.PI / 2) + (rel * 2 * Math.PI) / n;
  return {
    left: `${50 + shape.rx * Math.cos(angle)}%`,
    // По вертикали радиус меньше: место героя внизу — самое высокое (карты
    // крупнее рубашек), и на 39% его фишки уже вылезали за пределы стола.
    top: `${50 + shape.ry * Math.sin(angle)}%`,
  };
}

/** 97.5 → «97.5», 100 → «100»: копейки в стеке только мешают читать. */
function fmtBb(v: number): string {
  return String(Math.round(v * 10) / 10);
}

// Размер хода лежит фишками на сукне, и в облаке он лишний: «Рейз 2-2.2bb»
// рядом с «2.2bb» читается как два разных числа. Срезаем размер только у
// ходов со ставкой — у них фишки и есть; «Фолд» и «Лимп» остаются как есть.
const STEP_SIZE_RE = /\s+\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*bb$/i;

function stepLabel(step: SceneStep): string {
  return step.amount === undefined ? step.label : step.label.replace(STEP_SIZE_RE, "");
}

type ChipsSide = "n" | "ne" | "nw" | "s" | "e" | "w";

/**
 * Ставка лежит на сукне со стороны банка, как за живым столом, а не под
 * картами игрока: нижней половине стола — над плашкой, верхним боковым —
 * сбоку, самому верхнему — под плашкой. Простое «всегда к центру» не годится:
 * соседи по одному борту (SB и BB) сводят фишки в одну точку, а соседи героя
 * кладут их прямо на его карты.
 */
function chipsSide(index: number, heroIndex: number, n: number): ChipsSide {
  const rel = (index - heroIndex + n) % n;
  const angle = Math.PI / 2 + (rel * 2 * Math.PI) / n;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const lateral = Math.abs(cos) > 0.5;
  if (sin > 0.15) return lateral ? (cos < 0 ? "ne" : "nw") : "n";
  return lateral ? (cos < 0 ? "e" : "w") : "s";
}

/** Где висят фишки относительно места. С облаком хода нижние поднимаются над ним. */
function chipsStyle(side: ChipsSide, hasBubble: boolean): CSSProperties {
  switch (side) {
    case "n":
      return { bottom: "100%", left: "50%", transform: `translate(-50%, ${hasBubble ? -24 : -4}px)` };
    case "ne":
      return { left: "100%", top: 0, transform: `translate(-4px, ${hasBubble ? -40 : -22}px)` };
    case "nw":
      return { right: "100%", top: 0, transform: `translate(4px, ${hasBubble ? -40 : -22}px)` };
    case "s":
      return { top: "100%", left: "50%", transform: "translate(-50%, 6px)" };
    case "e":
      return { left: "100%", top: "50%", transform: "translate(5px, -50%)" };
    case "w":
      return { right: "100%", top: "50%", transform: "translate(-5px, -50%)" };
  }
}

function Chips({ amount, tone, compact }: { amount: string; tone: string; compact: boolean }) {
  return (
    <div
      className={`pc-pop flex items-center gap-1 whitespace-nowrap rounded-full bg-black/60 px-1.5 py-0.5 font-bold shadow ${
        compact ? "text-[9px]" : "text-[10px]"
      }`}
    >
      <span
        className={`inline-block rounded-full border border-black/40 ${
          compact ? "h-2 w-2" : "h-2.5 w-2.5"
        } ${tone}`}
      />
      <span className="text-neutral-200">{amount}bb</span>
    </div>
  );
}

function MiniCard({ rank, suit, compact }: { rank: string; suit: SuitIndex; compact: boolean }) {
  return (
    <div
      className={`pc-deal flex flex-col items-center justify-center rounded-md border border-white/20 bg-[#111815] font-black leading-none ${
        compact ? "h-8 w-6 text-xs" : "h-11 w-8 text-sm"
      }`}
    >
      <span style={{ color: suitColor(suit) }}>{rank}</span>
      <span style={{ color: suitColor(suit) }} className={compact ? "text-[10px]" : "text-xs"}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </div>
  );
}

/** Баттон — деревянная фишка дилера у места. */
function DealerButton() {
  return (
    <span className="absolute -right-2 -top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-black/50 bg-neutral-100 text-[9px] font-black leading-none text-black shadow">
      D
    </span>
  );
}

/** Рубашка карт — у всех, кто ещё в раздаче. */
function CardBacks({ compact }: { compact: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`rounded-[3px] border border-white/15 bg-gradient-to-br from-[#1d3a30] to-[#12241d] ${
            compact ? "h-4 w-3" : "h-6 w-4"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Стол рисуется сразу в состоянии решения, без проигрывания чужих ходов.
 *
 * Раньше ходы выкладывались по очереди раз в полсекунды — в Doyle Academy
 * это убрали первым: семь «Фолдов» до героя стоили трёх секунд ожидания на
 * каждом вопросе. Что было до героя, видно и так: облака ходов и фишки на
 * сукне остаются на местах.
 */
export function PokerTable({
  scene,
  cards,
  heroAction,
}: {
  scene: Scene;
  cards: { rank: string; suit: SuitIndex }[];
  heroAction: HeroAction | null;
}) {
  const compact = useIsCompact();

  /** Последнее действие каждого места. */
  const acted = useMemo(() => {
    const m = new Map<string, SceneStep>();
    for (const s of scene.steps) {
      // Блайнд — не решение: его затирает любой последующий ход этого места.
      if (s.kind === "blind" && m.has(s.seat)) continue;
      m.set(s.seat, s);
    }
    return m;
  }, [scene]);

  const bets = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scene.steps) {
      if (s.kind === "fold" || s.kind === "check" || s.amount === undefined) continue;
      m.set(s.seat, Math.max(m.get(s.seat) ?? 0, s.amount));
    }
    // Своего хода в steps нет — фишки за героя кладём отдельно, когда размер
    // его ставки известен.
    if (heroAction?.amount !== undefined) {
      m.set(scene.heroId, Math.max(m.get(scene.heroId) ?? 0, heroAction.amount));
    }
    return m;
  }, [scene, heroAction]);

  // Банк: анте плюс самая крупная ставка каждого места — ставка «до суммы»
  // не складывается с уже выставленным блайндом (как и в `potAfter`).
  const pot = Math.round(([...bets.values()].reduce((a, b) => a + b, 0) + scene.ante) * 10) / 10;
  /** Анте платит один BB — у него это списание сверх блайнда. */
  const anteOf = (s: SceneSeat) => (s.pos === "BB" ? scene.ante : 0);
  const heroIndex = Math.max(0, scene.seats.findIndex((s) => s.id === scene.heroId));
  const shape = tableShape(compact, scene.seats.length);

  return (
    <div className="relative w-full select-none" style={{ aspectRatio: shape.ratio }}>
      {/* Сукно */}
      <div
        className="absolute rounded-[50%] border-4 border-[#0d1a15] bg-[radial-gradient(ellipse_at_center,#17352b_0%,#0f231d_70%,#0b1a15_100%)] shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]"
        style={{ inset: shape.inset }}
      />

      {/* В центре только банк: блайнды и так видны фишками, а стек — в
          подписи каждого места. */}
      {pot > 0 && (
        <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[13px] font-bold text-amber-200/90 [text-shadow:0_1px_4px_rgba(0,0,0,.75)]">
          Банк {fmtBb(pot)}bb
        </div>
      )}

      {scene.seats.map((s, i) => {
        const pos = seatPos(i, heroIndex, scene.seats.length, shape);
        const step = acted.get(s.id);
        const bet = bets.get(s.id);
        const folded = step?.kind === "fold";
        const isHero = s.id === scene.heroId;
        const action = isHero && heroAction ? heroAction : null;
        const hasBubble = !!((step && step.kind !== "blind") || action);
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
        // У героя `step` — это его блайнд, а фишки перед ним уже его ответ:
        // красить их серым «как блайнд» значит спорить с облаком над ними.
        const tone =
          action?.amount !== undefined
            ? "bg-amber-400"
            : step?.kind === "blind"
              ? "bg-neutral-400"
              : step?.kind === "limp"
                ? "bg-sky-400"
                : "bg-amber-400";

        return (
          <div
            key={s.id}
            className="absolute flex flex-col items-center"
            // Место героя выше остальных (карты крупнее рубашек) и стоит у
            // нижнего края — центрируй его как все, и карты уедут под стол.
            style={{ ...pos, transform: `translate(-50%, ${isHero ? "-80%" : "-50%"})` }}
          >
            <div
              className={`relative flex flex-col items-center gap-1 rounded-xl border ${
                compact ? "gap-0.5 px-1.5 py-1" : "px-2.5 py-1.5"
              } ${
                isHero
                  ? "border-emerald-400/70 bg-[#10201a] shadow-[0_0_18px_rgba(52,199,123,0.25)]"
                  : "border-white/10 bg-[#0e1512]"
              } ${folded ? "opacity-30 grayscale" : ""}`}
            >
              {/* Облако хода висит над местом вне потока: резерв под него на
                  каждом месте раздувал стол по вертикали. */}
              {hasBubble && (
                <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2">
                  <span
                    className={`pc-pop inline-block whitespace-nowrap rounded-full px-1.5 py-0.5 font-bold shadow ${
                      compact ? "text-[9px]" : "px-2 text-[10px]"
                    } ${bubbleClass}`}
                  >
                    {action ? action.label : stepLabel(step!)}
                  </span>
                </div>
              )}
              {s.id === scene.buttonId && <DealerButton />}
              {/* Позиция и стек одной строкой, как в покерных клиентах. */}
              <span
                className={`flex items-baseline gap-1 whitespace-nowrap font-bold ${
                  compact ? "text-[10px]" : "text-[11px]"
                } ${isHero ? "text-emerald-300" : s.exact ? "text-neutral-300" : "text-neutral-500"}`}
              >
                {s.pos}
                <span
                  className={`font-semibold text-amber-200/60 ${compact ? "text-[8px]" : "text-[9px]"}`}
                >
                  {fmtBb(s.stack - (bet ?? 0) - anteOf(s))}bb
                </span>
              </span>
              {isHero ? (
                <div className="flex gap-1">
                  {cards.map((c, k) => (
                    <MiniCard key={k} rank={c.rank} suit={c.suit} compact={compact} />
                  ))}
                </div>
              ) : folded ? (
                <div
                  className={`text-[10px] text-neutral-600 ${compact ? "h-4 leading-4" : "h-6 leading-6"}`}
                >
                  —
                </div>
              ) : (
                <CardBacks compact={compact} />
              )}
              {/* Чего чарт про это место НЕ говорит — приглушённой строкой:
                  позиция выведена из посадки, а подпись чарта вот эта. */}
              {s.note && (
                <span
                  className={`truncate leading-none text-neutral-500 ${
                    compact ? "max-w-[56px] text-[8px]" : "max-w-[76px] text-[9px]"
                  }`}
                >
                  {s.note}
                </span>
              )}
            </div>

            {/* Фишки — вне потока, со стороны банка. */}
            {bet !== undefined && !folded && (
              <div
                className="absolute z-10"
                style={chipsStyle(chipsSide(i, heroIndex, scene.seats.length), hasBubble)}
              >
                <Chips compact={compact} amount={fmtBb(bet)} tone={tone} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
