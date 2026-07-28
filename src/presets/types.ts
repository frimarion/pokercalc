// Общие типы префлоп-пресетов (Green Charts 2024, Greenline Poker).

export type PresetGroup = "RFI" | "SB3BET" | "BBDEF" | "3BETIP" | "DEF3BETIP" | "DEF3BETOOP";

/** Действие, которым разыгрывается часть диапазона. */
export type ActionKind = "raise" | "call";

export interface PresetAction {
  kind: ActionKind;
  /** Подпись для UI: «открытие», «3бет», «колл». */
  label: string;
  /** Руки, играемые этим действием всегда → вес 1.0. */
  always: string[];
  /**
   * Руки, играемые этим действием частично → вес 0.5.
   * В RFI/SB это жёлтый «ситуативно»; в BB — ячейки, закрашенные наполовину
   * (смешанная стратегия «половину раздач 3бет, половину колл»).
   */
  situational: string[];
  /**
   * Составные ячейки не всегда делятся 50/50 — на чартах Defense vs 3Bet
   * встречаются доли в четверть. threeQuarter → вес 0.75, quarter → вес 0.25.
   */
  threeQuarter?: string[];
  quarter?: string[];
  /**
   * Цвет действия для раскраски матрицы под легенду чарта (режим «цвета
   * пресета»). Если не задан, берётся дефолт по kind (raise→red, call→green).
   */
  color?: ActionColor;
}

export type ActionColor = "green" | "red" | "purple" | "yellow";

export function defaultActionColor(kind: ActionKind): ActionColor {
  return kind === "call" ? "green" : "red";
}

/** Раскраска ячейки по действию пресета — цветной сегмент и его доля веса. */
export interface ColorSegment {
  color: ActionColor;
  weight: number;
}

export interface RangePreset {
  id: string;
  group: PresetGroup;
  /** Короткая метка для кнопки: "UTG", "vs BU". */
  position: string;
  title: string;
  subtitle: string;
  actions: PresetAction[];
}

/**
 * Вес частичных рук. Проценты, подписанные в Green Charts, сходятся
 * только по формуле «полные + частичные/2» — половинный вес заложен
 * самим автором чартов.
 */
export const SITUATIONAL_WEIGHT = 0.5;

export const GROUP_LABELS: Record<PresetGroup, string> = {
  RFI: "RFI — открытие",
  SB3BET: "SB — 3бет защита",
  BBDEF: "BB — защита",
  "3BETIP": "3бет IP — против опена",
  DEF3BETIP: "Защита на 3бет — в позиции",
  DEF3BETOOP: "Защита на 3бет — без позиции",
};

/** Собрать один действие-набор в плоский список [рука, вес]. */
export function actionWeights(action: PresetAction): [string, number][] {
  return [
    ...action.always.map((h) => [h, 1] as [string, number]),
    ...(action.threeQuarter ?? []).map((h) => [h, 0.75] as [string, number]),
    ...action.situational.map((h) => [h, SITUATIONAL_WEIGHT] as [string, number]),
    ...(action.quarter ?? []).map((h) => [h, 0.25] as [string, number]),
  ];
}
