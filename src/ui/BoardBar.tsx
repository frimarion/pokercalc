import { Card, RANKS, SUIT_SYMBOLS, cardRank, cardSuit } from "../engine/cards";
import { useStore, PickerTarget } from "../state/store";
import { suitColor } from "./colors";
import { CardPicker } from "./CardPicker";

function CardSlot({
  card,
  target,
  placeholder,
}: {
  card: Card | null;
  target: PickerTarget;
  placeholder?: string;
}) {
  const openPicker = useStore((s) => s.openPicker);
  const clearCardAt = useStore((s) => s.clearCardAt);
  const picker = useStore((s) => s.picker);
  const active = picker?.kind === target.kind && picker?.index === target.index;

  return (
    <button
      onClick={() => openPicker(target)}
      onContextMenu={(e) => {
        e.preventDefault();
        clearCardAt(target);
      }}
      className={`flex h-16 w-12 flex-col items-center justify-center rounded-lg border text-lg font-bold transition ${
        active ? "border-emerald-400" : "border-white/10"
      } ${card ? "bg-[#161d1a]" : "bg-[#0d1210] hover:bg-[#141a17]"}`}
      title={card !== null ? "ЛКМ — сменить · ПКМ — убрать" : placeholder}
    >
      {card !== null ? (
        <span style={{ color: suitColor(cardSuit(card)) }}>
          {RANKS[cardRank(card)]}
          <span className="ml-[1px] text-sm">{SUIT_SYMBOLS[cardSuit(card)]}</span>
        </span>
      ) : (
        <span className="text-xs text-neutral-600">{placeholder ?? "+"}</span>
      )}
    </button>
  );
}

export function BoardBar() {
  const heroCards = useStore((s) => s.heroCards);
  const board = useStore((s) => s.board);
  const randomBoard = useStore((s) => s.randomBoard);
  const clearBoard = useStore((s) => s.clearBoard);

  return (
    <div className="relative flex flex-wrap items-end gap-6">
      {/* Hero */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Hero
        </div>
        <div className="flex gap-2">
          {heroCards.map((c, i) => (
            <CardSlot key={i} card={c} target={{ kind: "hero", index: i }} placeholder="?" />
          ))}
        </div>
      </div>

      {/* Board */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Board (флоп / тёрн / ривер)
        </div>
        <div className="flex gap-2">
          {board.map((c, i) => (
            <CardSlot
              key={i}
              card={c}
              target={{ kind: "board", index: i }}
              placeholder={i < 3 ? "" : i === 3 ? "T" : "R"}
            />
          ))}
        </div>
      </div>

      {/* Действия с бордом */}
      <div className="flex gap-2">
        <button
          onClick={randomBoard}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5"
        >
          🎲 Рандом флоп
        </button>
        <button
          onClick={clearBoard}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-rose-400 hover:bg-white/5"
        >
          Очистить
        </button>
      </div>

      <CardPicker />
    </div>
  );
}
