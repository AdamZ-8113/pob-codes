export const SECONDARY_ASCENDANCY_NAMES_BY_ID: Readonly<Record<number, string>> = {
  1: "Warden of the Maji",
  2: "Warlock of the Mists",
  3: "Wildwood Primalist",
  4: "Chaos Bloodline",
  5: "Oshabi Bloodline",
  6: "Nameless Bloodline",
  7: "Catarina Bloodline",
  8: "Aul Bloodline",
  9: "Lycia Bloodline",
  10: "Olroth Bloodline",
  11: "Farrul Bloodline",
  12: "Delirious Bloodline",
  13: "Breachlord Bloodline",
  14: "Saresh Bloodline",
};

export function getSecondaryAscendancyName(secondaryAscendancyId?: number) {
  if (!secondaryAscendancyId) {
    return undefined;
  }

  return SECONDARY_ASCENDANCY_NAMES_BY_ID[secondaryAscendancyId];
}
