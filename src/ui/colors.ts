import { HandType } from "../engine/combos";
import { SuitIndex } from "../engine/cards";
import { ActionColor, ColorSegment } from "../presets";

type RGB = [number, number, number];

// Акцент выбранной руки — один нейтральный цвет на все три зоны матрицы.
// Раньше тип руки задавал оттенок (зелёный/синий/оранжевый), но тогда цвет
// нёс сразу два смысла; теперь оттенок свободен под раскраску по действиям
// чарта, а дефолтная заливка говорит только о весе.
const NEUTRAL: RGB = [148, 163, 175];
const NEUTRAL_BASE: RGB = [26, 28, 30];

const ACCENT: Record<HandType, RGB> = {
  pair: NEUTRAL,
  suited: NEUTRAL,
  offsuit: NEUTRAL,
};

// Тёмная база невыбранной ячейки.
const BASE: Record<HandType, RGB> = {
  pair: NEUTRAL_BASE,
  suited: NEUTRAL_BASE,
  offsuit: NEUTRAL_BASE,
};

const css = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;

/**
 * Фон ячейки матрицы: заливка акцентом слева пропорционально весу (0..1),
 * остаток — база по типу руки. Как в GTO Wizard: частичный вес — это
 * доля площади ячейки, а не приглушённый цвет.
 */
export function cellBackground(type: HandType, weight: number): string {
  if (weight <= 0) return css(BASE[type]);
  if (weight >= 1) return css(ACCENT[type]);
  const pct = Math.round(weight * 100);
  return `linear-gradient(to right, ${css(ACCENT[type])} ${pct}%, ${css(BASE[type])} ${pct}%)`;
}

/** Цвет текста ячейки: тёмный на залитых, приглушённый на пустых. */
export function cellText(weight: number): string {
  if (weight <= 0) return "#8b9a93";
  return weight > 0.5 ? "#0a0e0d" : "#e7ece9";
}

/** Акцент типа руки — для легенды и подписей. */
export function handTypeColor(type: HandType): string {
  return css(ACCENT[type]);
}

// Цвета действий пресета (режим «цвета пресета») — приближены к легенде
// Green Charts: зелёный=колл, красный=3бет/4бет-фолд, фиолетовый=4бет-пуш,
// жёлтый=ситуативно (только там, где это отдельный цвет в оригинале, не
// раздел ячейки — см. YELLOW_PARTIAL_GROUPS в store.ts).
const ACTION_RGB: Record<ActionColor, RGB> = {
  green: [52, 199, 123],
  red: [239, 68, 68],
  purple: [168, 85, 247],
  yellow: [217, 180, 40],
  // Оранжевый и розовый — из легенды FF START (MTT): оранжевый отделяет
  // обычный изолейт от крупного (тот красный), розовый — олл-ин.
  orange: [245, 130, 42],
  pink: [238, 76, 155],
};
const FOLD_BASE: RGB = [22, 25, 24];

/** Акцент цвета действия — для легенды. */
export function actionColorCss(color: ActionColor): string {
  return css(ACTION_RGB[color]);
}

/**
 * Фон ячейки в режиме «цвета пресета»: сегменты идут подряд слева направо
 * в своих цветах действия, остаток (фолд) — тёмный. Та же идея, что и
 * cellBackground, только акцент — не по типу руки, а по действию.
 */
export function presetCellBackground(segments: ColorSegment[]): string {
  if (segments.length === 0) return css(FOLD_BASE);
  let acc = 0;
  const stops: string[] = [];
  for (const seg of segments) {
    const from = Math.round(acc * 100);
    acc += seg.weight;
    const to = Math.round(acc * 100);
    const color = css(ACTION_RGB[seg.color]);
    stops.push(`${color} ${from}%`, `${color} ${to}%`);
  }
  const totalPct = Math.round(acc * 100);
  if (totalPct < 100) {
    const base = css(FOLD_BASE);
    stops.push(`${base} ${totalPct}%`, `${base} 100%`);
  }
  if (stops.length === 2 && acc >= 1) return css(ACTION_RGB[segments[0].color]);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

// Цвета мастей (4-color deck): c=green, d=blue, h=red, s=white.
const SUIT_COLORS: Record<SuitIndex, string> = {
  0: "#2fb673", // clubs ♣
  1: "#3b82f6", // diamonds ♦
  2: "#ef4444", // hearts ♥
  3: "#e7ece9", // spades ♠
};

export function suitColor(suit: SuitIndex): string {
  return SUIT_COLORS[suit];
}
