// Префлоп-пресеты Green Charts 2024 (Greenline Poker), кэш NL2–NL200.
// Диапазоны оцифрованы из официального PDF (см. tools/extract_charts.py).

import { RangePreset, PresetGroup } from "./types";
import { RFI_PRESETS } from "./rfi";
import { SB3BET_PRESETS } from "./sbDefense";
import { BBDEF_PRESETS } from "./bbDefense";
import { THREEBET_IP_PRESETS } from "./threeBetIP";
import { DEF3BETIP_PRESETS, DEF3BETOOP_PRESETS } from "./defenseVs3bet";

export type {
  RangePreset,
  PresetGroup,
  PresetAction,
  ActionKind,
  ActionColor,
  ColorSegment,
} from "./types";
export { SITUATIONAL_WEIGHT, GROUP_LABELS, actionWeights, defaultActionColor } from "./types";
export { RFI_PRESETS } from "./rfi";
export { SB3BET_PRESETS } from "./sbDefense";
export { BBDEF_PRESETS } from "./bbDefense";
export { THREEBET_IP_PRESETS } from "./threeBetIP";
export { DEF3BETIP_PRESETS, DEF3BETOOP_PRESETS } from "./defenseVs3bet";
export { ALL_PRESETS, presetById } from "./all";

export type { TreeNode, TreeOption, Seat } from "./tree";
export { ACTION_TREE, resolvePath, presetForPath, presetWidthPct } from "./tree";

/** Пресеты, сгруппированные по типу чарта. */
export const PRESET_GROUPS: { group: PresetGroup; presets: RangePreset[] }[] = [
  { group: "RFI", presets: RFI_PRESETS },
  { group: "SB3BET", presets: SB3BET_PRESETS },
  { group: "BBDEF", presets: BBDEF_PRESETS },
  { group: "3BETIP", presets: THREEBET_IP_PRESETS },
  { group: "DEF3BETIP", presets: DEF3BETIP_PRESETS },
  { group: "DEF3BETOOP", presets: DEF3BETOOP_PRESETS },
];
