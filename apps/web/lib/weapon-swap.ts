const WEAPON_SWAP_SLOT_NAMES = new Set([
  "Weapon 1 Swap",
  "Weapon 2 Swap",
  "Off Hand 2",
  "Off Hand Swap",
]);

export function isWeaponSwapSlot(slotName: string | undefined | null): boolean {
  if (!slotName) {
    return false;
  }

  return WEAPON_SWAP_SLOT_NAMES.has(slotName.trim());
}
