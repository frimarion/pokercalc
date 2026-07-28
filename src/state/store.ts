import { create } from "zustand";
import { Card, cardsToMask } from "../engine/cards";
import { Range, comboIndicesForLabel } from "../engine/combos";
import { filterRange, MadeCategory, DrawType } from "../engine/categorize";
import {
  ALL_PRESETS,
  SITUATIONAL_WEIGHT,
  ActionKind,
  ActionColor,
  ColorSegment,
  PresetGroup,
  defaultActionColor,
} from "../presets";

// В RFI/SB3BET/3BETIP — одно действие "raise", но два цвета в оригинале:
// красный (always, сплошная заливка) и жёлтый (situational, тоже сплошная —
// это НЕ визуальный раздел ячейки, просто другой цвет чернил в PDF).
// В BB/DEF3BET частичный вес — это настоящий раздел ячейки между двумя
// действиями (call/raise), там оба уже цветные сами по себе.
const YELLOW_PARTIAL_GROUPS: PresetGroup[] = ["RFI", "SB3BET", "3BETIP"];

export type DisplayMode = "pct" | "count" | "both";
export type Street = "flop" | "turn" | "river";
export type Side = "hero" | "villain";

const SCENARIO_KEY = "pokercalc:scenario";

/** Что сейчас редактируется пикером карт. */
export interface PickerTarget {
  kind: "hero" | "board";
  index: number;
}

interface AppState {
  // Два диапазона: hero и villain. rev увеличивается при любом изменении весов,
  // чтобы React перерисовывал (Float32Array мутируется на месте).
  ranges: Record<Side, Range>;
  rev: number;
  activeSide: Side; // какой диапазон редактирует матрица

  heroCards: (Card | null)[]; // длина 2 — опциональная конкретная рука hero
  board: (Card | null)[]; // длина 5 (флоп3 + тёрн + ривер)

  brushWeight: number; // 0.25 | 0.5 | 0.75 | 1
  displayMode: DisplayMode;
  heatmap: boolean;
  picker: PickerTarget | null;

  // Раскладка последнего применённого пресета по цветам действия (для
  // режима «цвета пресета»). Инвалидируется любой ручной правкой диапазона.
  presetView: Record<Side, Map<string, ColorSegment[]> | null>;
  /** Что означают цвета текущего чарта — подписи берутся из его действий. */
  presetLegend: Record<Side, { color: ActionColor; label: string }[] | null>;
  presetColorMode: boolean;
  togglePresetColorMode: () => void;

  // ── экшены диапазона ──
  setActiveSide: (s: Side) => void;
  setBrush: (w: number) => void;
  setHandWeight: (label: string, weight: number) => void; // в активный диапазон
  clearRange: () => void; // активный диапазон
  morphActiveRange: (keepMade: MadeCategory[], keepDraws: DrawType[]) => void;
  /** actionKind не задан → применяются все действия пресета сразу. */
  applyPreset: (
    id: string,
    includeSituational: boolean,
    actionKind?: ActionKind,
  ) => void;

  // ── сценарии ──
  resetAll: () => void;
  saveScenario: () => void;
  loadScenario: () => boolean; // false, если сохранения нет

  // ── экшены карт ──
  openPicker: (t: PickerTarget) => void;
  closePicker: () => void;
  setCard: (card: Card) => void;
  clearCardAt: (t: PickerTarget) => void;
  clearBoard: () => void;
  randomBoard: () => void;

  // ── режимы показа ──
  setDisplayMode: (m: DisplayMode) => void;
  toggleHeatmap: () => void;
}

/** Все занятые карты (hero + борд) как список. */
export function usedCards(s: { heroCards: (Card | null)[]; board: (Card | null)[] }): Card[] {
  return [...s.heroCards, ...s.board].filter((c): c is Card => c !== null);
}

/** Битовая маска блокеров из hero + борда. */
export function blockerMask(s: { heroCards: (Card | null)[]; board: (Card | null)[] }): bigint {
  return cardsToMask(usedCards(s));
}

/** Текущая улица по числу карт на борде. */
export function currentStreet(board: (Card | null)[]): Street {
  const n = board.filter((c) => c !== null).length;
  if (n >= 5) return "river";
  if (n >= 4) return "turn";
  return "flop";
}

export const useStore = create<AppState>((set, get) => ({
  ranges: { hero: new Range(), villain: new Range() },
  rev: 0,
  activeSide: "hero",
  heroCards: [null, null],
  board: [null, null, null, null, null],
  brushWeight: 1,
  displayMode: "count",
  heatmap: false,
  picker: null,
  presetView: { hero: null, villain: null },
  presetLegend: { hero: null, villain: null },
  presetColorMode: false,

  setActiveSide: (s) => set({ activeSide: s }),
  setBrush: (w) => set({ brushWeight: w }),
  togglePresetColorMode: () => set((s) => ({ presetColorMode: !s.presetColorMode })),

  setHandWeight: (label, weight) => {
    const { ranges, activeSide, presetView } = get();
    for (const idx of comboIndicesForLabel(label)) ranges[activeSide].weights[idx] = weight;
    set((s) => ({
      rev: s.rev + 1,
      presetView: { ...presetView, [activeSide]: null },
      presetLegend: { ...s.presetLegend, [activeSide]: null },
    }));
  },

  clearRange: () => {
    const { ranges, activeSide, presetView } = get();
    ranges[activeSide].clear();
    set((s) => ({
      rev: s.rev + 1,
      presetView: { ...presetView, [activeSide]: null },
      presetLegend: { ...s.presetLegend, [activeSide]: null },
    }));
  },

  applyPreset: (id, includeSituational, actionKind) => {
    const preset = ALL_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const actions = actionKind
      ? preset.actions.filter((a) => a.kind === actionKind)
      : preset.actions;
    const { ranges, activeSide, presetView, presetLegend } = get();
    const r = ranges[activeSide];
    r.clear();

    const segments = new Map<string, ColorSegment[]>();
    const legend: { color: ActionColor; label: string }[] = [];
    const legendSeen = new Set<ActionColor>();
    const addLegend = (color: ActionColor, label: string) => {
      if (legendSeen.has(color)) return;
      legendSeen.add(color);
      legend.push({ color, label });
    };
    const yellowPartial = YELLOW_PARTIAL_GROUPS.includes(preset.group);
    const addSegment = (label: string, color: ActionColor, weight: number) => {
      if (weight <= 0) return;
      const list = segments.get(label) ?? [];
      const used = list.reduce((sum, seg) => sum + seg.weight, 0);
      const w = Math.min(weight, Math.max(0, 1 - used));
      if (w > 0) list.push({ color, weight: w });
      segments.set(label, list);
    };

    for (const action of actions) {
      const color = action.color ?? defaultActionColor(action.kind);
      const partialColor = yellowPartial ? "yellow" : color;
      for (const label of action.always) {
        r.setHand(label, 1);
        addSegment(label, color, 1);
      }
      if (action.always.length > 0) addLegend(color, action.label);
      if (!includeSituational) continue;
      const partial: [string, number][] = [
        ...(action.threeQuarter ?? []).map((h) => [h, 0.75] as [string, number]),
        ...action.situational.map((h) => [h, SITUATIONAL_WEIGHT] as [string, number]),
        ...(action.quarter ?? []).map((h) => [h, 0.25] as [string, number]),
      ];
      if (partial.length > 0) {
        addLegend(partialColor, yellowPartial ? `${action.label} ситуативно` : action.label);
      }
      for (const [label, weight] of partial) {
        // Рука может входить в два действия частично (напр. 3бет/колл) —
        // при выборе «всё» такие складываются в полный вес.
        r.setHand(label, Math.min(1, r.handWeight(label) + weight));
        addSegment(label, partialColor, weight);
      }
    }
    set((s) => ({
      rev: s.rev + 1,
      presetView: { ...presetView, [activeSide]: segments },
      presetLegend: { ...presetLegend, [activeSide]: legend },
    }));
  },

  morphActiveRange: (keepMade, keepDraws) => {
    const { ranges, activeSide, board, presetView } = get();
    const boardCards = board.filter((c): c is Card => c !== null);
    const mask = blockerMask(get());
    const w = filterRange(
      ranges[activeSide],
      boardCards,
      mask,
      new Set(keepMade),
      new Set(keepDraws),
    );
    ranges[activeSide].weights.set(w);
    set((s) => ({
      rev: s.rev + 1,
      presetView: { ...presetView, [activeSide]: null },
      presetLegend: { ...s.presetLegend, [activeSide]: null },
    }));
  },

  resetAll: () =>
    set((s) => ({
      ranges: { hero: new Range(), villain: new Range() },
      heroCards: [null, null],
      board: [null, null, null, null, null],
      rev: s.rev + 1,
      presetView: { hero: null, villain: null },
      presetLegend: { hero: null, villain: null },
    })),

  saveScenario: () => {
    const { ranges, heroCards, board } = get();
    const data = {
      hero: Array.from(ranges.hero.weights),
      villain: Array.from(ranges.villain.weights),
      heroCards,
      board,
    };
    localStorage.setItem(SCENARIO_KEY, JSON.stringify(data));
  },

  loadScenario: () => {
    const raw = localStorage.getItem(SCENARIO_KEY);
    if (!raw) return false;
    try {
      const d = JSON.parse(raw);
      set((s) => ({
        ranges: {
          hero: new Range(Float32Array.from(d.hero)),
          villain: new Range(Float32Array.from(d.villain)),
        },
        heroCards: d.heroCards,
        board: d.board,
        rev: s.rev + 1,
        presetView: { hero: null, villain: null },
      presetLegend: { hero: null, villain: null },
      }));
      return true;
    } catch {
      return false;
    }
  },

  openPicker: (t) => set({ picker: t }),
  closePicker: () => set({ picker: null }),

  setCard: (card) => {
    const { picker } = get();
    if (!picker) return;
    if (usedCards(get()).includes(card)) return;
    if (picker.kind === "hero") {
      const heroCards = [...get().heroCards];
      heroCards[picker.index] = card;
      set({ heroCards });
    } else {
      const board = [...get().board];
      board[picker.index] = card;
      set({ board });
    }
    set({ picker: null });
  },

  clearCardAt: (t) => {
    if (t.kind === "hero") {
      const heroCards = [...get().heroCards];
      heroCards[t.index] = null;
      set({ heroCards });
    } else {
      const board = [...get().board];
      board[t.index] = null;
      set({ board });
    }
  },

  clearBoard: () => set({ board: [null, null, null, null, null] }),

  randomBoard: () => {
    const blocked = new Set<Card>(get().heroCards.filter((c): c is Card => c !== null));
    const deck: Card[] = [];
    for (let c = 0; c < 52; c++) if (!blocked.has(c)) deck.push(c);
    for (let i = 0; i < 3; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    set({ board: [deck[0], deck[1], deck[2], null, null] });
  },

  setDisplayMode: (m) => set({ displayMode: m }),
  toggleHeatmap: () => set((s) => ({ heatmap: !s.heatmap })),
}));
