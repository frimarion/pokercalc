import { makeCard, RANKS, SUIT_SYMBOLS } from "../engine/cards";
import { useStore, usedCards } from "../state/store";
import { suitColor } from "./colors";

// Ранги A..2 (по убыванию) для раскладки пикера.
const RANK_ORDER = [...RANKS.keys()].reverse();
// Масти в порядке отображения: h, d, c, s (красные сверху, как в референсе).
const SUIT_ORDER = [2, 1, 0, 3];

export function CardPicker() {
  const picker = useStore((s) => s.picker);
  const setCard = useStore((s) => s.setCard);
  const closePicker = useStore((s) => s.closePicker);
  const heroCards = useStore((s) => s.heroCards);
  const board = useStore((s) => s.board);
  const used = new Set(usedCards({ heroCards, board }));

  if (!picker) return null;

  return (
    <div className="absolute left-0 top-full z-30 mt-2 rounded-xl border border-white/10 bg-[#0f1614] p-3 shadow-2xl">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">
        Выбери карту
      </div>
      <div className="flex flex-col gap-[4px]">
        {SUIT_ORDER.map((suit) => (
          <div key={suit} className="flex gap-[4px]">
            {RANK_ORDER.map((rank) => {
              const card = makeCard(rank, suit);
              const isUsed = used.has(card);
              return (
                <button
                  key={card}
                  disabled={isUsed}
                  onClick={() => setCard(card)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-20 hover:brightness-125"
                  style={{
                    background: "#1a2420",
                    color: suitColor(suit),
                  }}
                >
                  {RANKS[rank]}
                  <span className="ml-[1px] text-[10px]">{SUIT_SYMBOLS[suit]}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <button
        onClick={closePicker}
        className="mt-3 w-full rounded-md border border-white/10 py-1 text-xs text-neutral-400 hover:bg-white/5"
      >
        Закрыть
      </button>
    </div>
  );
}
