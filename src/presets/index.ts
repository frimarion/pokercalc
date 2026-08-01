// Префлоп-пресеты Green Charts 2024 (Greenline Poker), кэш NL2–NL200.
// Диапазоны оцифрованы из официального PDF (см. tools/extract_charts.py).

import { RangePreset, PresetGroup } from "./types";
import { TreeNode, ACTION_TREE } from "./tree";
import { MTT_TREE } from "./mtt/tree";
import { MTT_RFI_PRESETS } from "./mtt/rfi";
import { MTT_ISO_PRESETS } from "./mtt/iso";
import { MTT_VS_RFI_PRESETS } from "./mtt/vsRfi";
import { MTT_DEF3BET_PRESETS } from "./mtt/defVs3bet";
import { MTT_BBDEF_PRESETS } from "./mtt/bbDefense";
import { MTT_PUSH_PRESETS } from "./mtt/push";
import { MTT_3BETPUSH_PRESETS } from "./mtt/threeBetPush";
import { RFI_PRESETS } from "./rfi";
import { ISO_PRESETS } from "./iso";
import { SB3BET_PRESETS } from "./sbDefense";
import { BBDEF_PRESETS } from "./bbDefense";
import { THREEBET_IP_PRESETS } from "./threeBetIP";
import { DEF3BETIP_PRESETS, DEF3BETOOP_PRESETS } from "./defenseVs3bet";
import { BLINDS4BET_PRESETS } from "./blinds4bet";

export type {
  RangePreset,
  PresetGroup,
  PresetAction,
  ActionKind,
  ActionColor,
  ColorSegment,
} from "./types";
export {
  SITUATIONAL_WEIGHT,
  GROUP_LABELS,
  actionWeights,
  partialWeights,
  defaultActionColor,
} from "./types";
export { RFI_PRESETS } from "./rfi";
export { ISO_PRESETS } from "./iso";
export { SB3BET_PRESETS } from "./sbDefense";
export { BBDEF_PRESETS } from "./bbDefense";
export { THREEBET_IP_PRESETS } from "./threeBetIP";
export { DEF3BETIP_PRESETS, DEF3BETOOP_PRESETS } from "./defenseVs3bet";
export { BLINDS4BET_PRESETS } from "./blinds4bet";
export { MTT_RFI_PRESETS } from "./mtt/rfi";
export { MTT_ISO_PRESETS } from "./mtt/iso";
export { MTT_VS_RFI_PRESETS } from "./mtt/vsRfi";
export { MTT_DEF3BET_PRESETS } from "./mtt/defVs3bet";
export { MTT_BBDEF_PRESETS } from "./mtt/bbDefense";
export { MTT_PUSH_PRESETS } from "./mtt/push";
export { MTT_3BETPUSH_PRESETS } from "./mtt/threeBetPush";
export { ALL_PRESETS, presetById } from "./all";

export type { TreeNode, TreeOption, Seat } from "./tree";
export { ACTION_TREE, resolvePath, presetForPath, presetWidthPct } from "./tree";
export { MTT_TREE } from "./mtt/tree";

/**
 * Формат игры. Кэш и MTT — это разные столы (6-max против 8-max) и разные
 * сайзинги, поэтому у каждого своя ветка событий, а не общий список чартов.
 */
export type FormatKey = "cash" | "mtt";

export const FORMATS: { key: FormatKey; label: string; note: string; tree: TreeNode }[] = [
  { key: "cash", label: "Кэш", note: "6-max · Green Charts", tree: ACTION_TREE },
  { key: "mtt", label: "MTT", note: "FF START · по глубине стека", tree: MTT_TREE },
];

/** Пресеты, сгруппированные по типу чарта. */
export const PRESET_GROUPS: { group: PresetGroup; presets: RangePreset[] }[] = [
  { group: "RFI", presets: RFI_PRESETS },
  { group: "ISO", presets: ISO_PRESETS },
  { group: "SB3BET", presets: SB3BET_PRESETS },
  { group: "BBDEF", presets: BBDEF_PRESETS },
  { group: "3BETIP", presets: THREEBET_IP_PRESETS },
  { group: "DEF3BETIP", presets: DEF3BETIP_PRESETS },
  { group: "DEF3BETOOP", presets: DEF3BETOOP_PRESETS },
  { group: "BLINDS4BET", presets: BLINDS4BET_PRESETS },
  { group: "MTTRFI", presets: MTT_RFI_PRESETS },
  { group: "MTTISO", presets: MTT_ISO_PRESETS },
  { group: "MTTVSRFI", presets: MTT_VS_RFI_PRESETS },
  { group: "MTTDEF3BET", presets: MTT_DEF3BET_PRESETS },
  { group: "MTTBBDEF", presets: MTT_BBDEF_PRESETS },
  { group: "MTTPUSH", presets: MTT_PUSH_PRESETS },
  { group: "MTT3BETPUSH", presets: MTT_3BETPUSH_PRESETS },
];
