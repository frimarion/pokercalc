// Плоский список всех пресетов. Вынесен из index.ts отдельно, чтобы
// tree.ts мог искать чарты по id, а index.ts — реэкспортировать дерево,
// без циклического импорта между ними.

import { RangePreset } from "./types";
import { RFI_PRESETS } from "./rfi";
import { ISO_PRESETS } from "./iso";
import { SB3BET_PRESETS } from "./sbDefense";
import { BBDEF_PRESETS } from "./bbDefense";
import { THREEBET_IP_PRESETS } from "./threeBetIP";
import { DEF3BETIP_PRESETS, DEF3BETOOP_PRESETS } from "./defenseVs3bet";
import { MTT_RFI_PRESETS } from "./mtt/rfi";

export const ALL_PRESETS: RangePreset[] = [
  ...RFI_PRESETS,
  ...ISO_PRESETS,
  ...SB3BET_PRESETS,
  ...BBDEF_PRESETS,
  ...THREEBET_IP_PRESETS,
  ...DEF3BETIP_PRESETS,
  ...DEF3BETOOP_PRESETS,
  ...MTT_RFI_PRESETS,
];

export function presetById(id: string): RangePreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}
