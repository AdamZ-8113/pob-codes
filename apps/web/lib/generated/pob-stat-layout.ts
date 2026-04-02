/* This file is generated from local-pob-mirror/src/Modules/BuildDisplayStats.lua */
export interface PobStatLayoutEntry {
  key: string;
  label?: string;
  color?: string;
  fmt?: string;
  hidden: boolean;
  overCapStat?: string;
  pc?: boolean;
  flags?: string[];
  notFlags?: string[];
  section: number;
}

export const POB_PLAYER_STAT_LAYOUT: PobStatLayoutEntry[] = [
  {
    "key": "ActiveMinionLimit",
    "label": "Active Minion Limit",
    "fmt": "d",
    "hidden": false,
    "section": 0
  },
  {
    "key": "AverageHit",
    "label": "Average Hit",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "PvpAverageHit",
    "label": "PvP Average Hit",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "isPvP"
    ],
    "section": 0
  },
  {
    "key": "AverageDamage",
    "label": "Average Damage",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "attack"
    ],
    "section": 0
  },
  {
    "key": "AverageDamage",
    "label": "Average Damage",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "monsterExplode"
    ],
    "section": 0
  },
  {
    "key": "AverageBurstDamage",
    "label": "Average Burst Damage",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "PvpAverageDamage",
    "label": "PvP Average Damage",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "attackPvP"
    ],
    "section": 0
  },
  {
    "key": "Speed",
    "label": "Attack Rate",
    "fmt": ".2f",
    "hidden": false,
    "flags": [
      "attack"
    ],
    "section": 0
  },
  {
    "key": "Speed",
    "label": "Cast Rate",
    "fmt": ".2f",
    "hidden": false,
    "flags": [
      "spell"
    ],
    "section": 0
  },
  {
    "key": "Speed",
    "label": "Effective Trigger Rate",
    "fmt": ".2f",
    "hidden": false,
    "notFlags": [
      "skipEffectiveRate"
    ],
    "section": 0
  },
  {
    "key": "WarcryCastTime",
    "label": "Cast Time",
    "fmt": ".2fs",
    "hidden": false,
    "flags": [
      "warcry"
    ],
    "section": 0
  },
  {
    "key": "HitSpeed",
    "label": "Hit Rate",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "HitTime",
    "label": "Channel Time",
    "fmt": ".2fs",
    "hidden": false,
    "flags": [
      "channelRelease"
    ],
    "section": 0
  },
  {
    "key": "ChannelTimeToTrigger",
    "label": "Channel Time",
    "fmt": ".2fs",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TrapThrowingTime",
    "label": "Trap Throwing Time",
    "fmt": ".2fs",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TrapCooldown",
    "label": "Trap Cooldown",
    "fmt": ".3fs",
    "hidden": false,
    "section": 0
  },
  {
    "key": "MineLayingTime",
    "label": "Mine Throwing Time",
    "fmt": ".2fs",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TrapThrowCount",
    "label": "Avg. Traps per Throw",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "MineThrowCount",
    "label": "Avg. Mines per Throw",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TotemPlacementTime",
    "label": "Totem Placement Time",
    "fmt": ".2fs",
    "hidden": false,
    "section": 0
  },
  {
    "key": "PreEffectiveCritChance",
    "label": "Crit Chance",
    "fmt": ".2f%%",
    "hidden": false,
    "flags": [
      "hit"
    ],
    "section": 0
  },
  {
    "key": "CritChance",
    "label": "Effective Crit Chance",
    "fmt": ".2f%%",
    "hidden": false,
    "flags": [
      "hit"
    ],
    "section": 0
  },
  {
    "key": "CritMultiplier",
    "label": "Crit Multiplier",
    "fmt": "d%%",
    "hidden": false,
    "pc": true,
    "section": 0
  },
  {
    "key": "HitChance",
    "label": "Hit Chance",
    "fmt": ".0f%%",
    "hidden": false,
    "flags": [
      "attack"
    ],
    "section": 0
  },
  {
    "key": "HitChance",
    "label": "Hit Chance",
    "fmt": ".0f%%",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TotalDPS",
    "label": "Hit DPS",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "notAverage"
    ],
    "section": 0
  },
  {
    "key": "PvpTotalDPS",
    "label": "PvP Hit DPS",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "notAveragePvP"
    ],
    "section": 0
  },
  {
    "key": "TotalDPS",
    "label": "Hit DPS",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "showAverage"
    ],
    "section": 0
  },
  {
    "key": "TotalDot",
    "label": "DoT DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "WithDotDPS",
    "label": "Total DPS inc. DoT",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "notAverage"
    ],
    "section": 0
  },
  {
    "key": "BleedDPS",
    "label": "Bleed DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "CorruptingBloodDPS",
    "label": "Corrupting Blood DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "BleedDamage",
    "label": "Total Damage per Bleed",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "showAverage"
    ],
    "section": 0
  },
  {
    "key": "WithBleedDPS",
    "label": "Total DPS inc. Bleed",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "notAverage"
    ],
    "section": 0
  },
  {
    "key": "IgniteDPS",
    "label": "Ignite DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "IgniteDamage",
    "label": "Total Damage per Ignite",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "showAverage"
    ],
    "section": 0
  },
  {
    "key": "BurningGroundDPS",
    "label": "Burning Ground DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "MirageBurningGroundDPS",
    "label": "Mirage Burning Ground DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "WithIgniteDPS",
    "label": "Total DPS inc. Ignite",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "notAverage"
    ],
    "section": 0
  },
  {
    "key": "WithIgniteAverageDamage",
    "label": "Average Dmg. inc. Ignite",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "PoisonDPS",
    "label": "Single Poison DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "CausticGroundDPS",
    "label": "Caustic Ground DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "MirageCausticGroundDPS",
    "label": "Mirage Caustic Ground DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "PoisonDamage",
    "label": "Total Damage per Poison",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "WithPoisonDPS",
    "label": "Total DPS inc. Poison",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "poison",
      "notAverage"
    ],
    "section": 0
  },
  {
    "key": "DecayDPS",
    "label": "Decay DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TotalDotDPS",
    "label": "Total DoT DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ImpaleDPS",
    "label": "Impale Damage",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "impale",
      "showAverage"
    ],
    "section": 0
  },
  {
    "key": "WithImpaleDPS",
    "label": "Damage inc. Impale",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "impale",
      "showAverage"
    ],
    "section": 0
  },
  {
    "key": "ImpaleDPS",
    "label": "Impale DPS",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "impale",
      "notAverage"
    ],
    "section": 0
  },
  {
    "key": "WithImpaleDPS",
    "label": "Total DPS inc. Impale",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "impale",
      "notAverage"
    ],
    "section": 0
  },
  {
    "key": "MirageDPS",
    "label": "Total Mirage DPS",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "mirageArcher"
    ],
    "section": 0
  },
  {
    "key": "MirageDPS",
    "label": "Total Wisp DPS",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "wisp"
    ],
    "section": 0
  },
  {
    "key": "CullingDPS",
    "label": "Culling DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ReservationDPS",
    "label": "Reservation DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "CombinedDPS",
    "label": "Combined DPS",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "notAverage"
    ],
    "section": 0
  },
  {
    "key": "CombinedAvg",
    "label": "Combined Total Damage",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "showAverage"
    ],
    "section": 0
  },
  {
    "key": "ExplodeChance",
    "label": "Total Explode Chance",
    "fmt": ".0f%%",
    "hidden": false,
    "section": 0
  },
  {
    "key": "CombinedAvgToMonsterLife",
    "label": "Enemy Life Equivalent",
    "fmt": ".1f%%",
    "hidden": false,
    "section": 0
  },
  {
    "key": "Cooldown",
    "label": "Skill Cooldown",
    "fmt": ".3fs",
    "hidden": false,
    "notFlags": [
      "skipEffectiveRate"
    ],
    "section": 0
  },
  {
    "key": "SealCooldown",
    "label": "Seal Gain Frequency",
    "fmt": ".2fs",
    "hidden": false,
    "section": 0
  },
  {
    "key": "SealMax",
    "label": "Max Number of Seals",
    "fmt": "d",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TimeMaxSeals",
    "label": "Time to Gain Max Seals",
    "fmt": ".2fs",
    "hidden": false,
    "section": 0
  },
  {
    "key": "AreaOfEffectRadiusMetres",
    "label": "AoE Radius",
    "fmt": ".1fm",
    "hidden": false,
    "section": 0
  },
  {
    "key": "BrandAttachmentRangeMetre",
    "label": "Attachment Range",
    "fmt": ".1fm",
    "hidden": false,
    "flags": [
      "brand"
    ],
    "section": 0
  },
  {
    "key": "BrandTicks",
    "label": "Activations per Brand",
    "fmt": "d",
    "hidden": false,
    "flags": [
      "brand"
    ],
    "section": 0
  },
  {
    "key": "ManaCost",
    "label": "Mana Cost",
    "color": "#7070FF",
    "fmt": "d",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ManaPercentCost",
    "label": "Mana Cost",
    "color": "#7070FF",
    "fmt": "d%%",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ManaPerSecondCost",
    "label": "Mana Cost per second",
    "color": "#7070FF",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ManaPercentPerSecondCost",
    "label": "Mana Cost per second",
    "color": "#7070FF",
    "fmt": ".2f%%",
    "hidden": false,
    "section": 0
  },
  {
    "key": "LifeCost",
    "label": "Life Cost",
    "color": "#E05030",
    "fmt": "d",
    "hidden": false,
    "section": 0
  },
  {
    "key": "LifePercentCost",
    "label": "Life Cost",
    "color": "#E05030",
    "fmt": "d%%",
    "hidden": false,
    "section": 0
  },
  {
    "key": "LifePerSecondCost",
    "label": "Life Cost per second",
    "color": "#E05030",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "LifePercentPerSecondCost",
    "label": "Life Cost per second",
    "color": "#E05030",
    "fmt": ".2f%%",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ESCost",
    "label": "Energy Shield Cost",
    "color": "#88FFFF",
    "fmt": "d",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ESPerSecondCost",
    "label": "ES Cost per second",
    "color": "#88FFFF",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ESPercentPerSecondCost",
    "label": "ES Cost per second",
    "color": "#88FFFF",
    "fmt": ".2f%%",
    "hidden": false,
    "section": 0
  },
  {
    "key": "RageCost",
    "label": "Rage Cost",
    "color": "#FF9922",
    "fmt": "d",
    "hidden": false,
    "section": 0
  },
  {
    "key": "RagePerSecondCost",
    "label": "Rage Cost per second",
    "color": "#FF9922",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "SoulCost",
    "label": "Soul Cost",
    "color": "#FF9922",
    "fmt": "d",
    "hidden": false,
    "section": 0
  },
  {
    "key": "Str",
    "label": "Strength",
    "color": "#E05030",
    "fmt": "d",
    "hidden": false,
    "section": 1
  },
  {
    "key": "ReqStr",
    "label": "Strength Required",
    "color": "#E05030",
    "fmt": "d",
    "hidden": false,
    "section": 1
  },
  {
    "key": "Dex",
    "label": "Dexterity",
    "color": "#70FF70",
    "fmt": "d",
    "hidden": false,
    "section": 1
  },
  {
    "key": "ReqDex",
    "label": "Dexterity Required",
    "color": "#70FF70",
    "fmt": "d",
    "hidden": false,
    "section": 1
  },
  {
    "key": "Int",
    "label": "Intelligence",
    "color": "#7070FF",
    "fmt": "d",
    "hidden": false,
    "section": 1
  },
  {
    "key": "ReqInt",
    "label": "Intelligence Required",
    "color": "#7070FF",
    "fmt": "d",
    "hidden": false,
    "section": 1
  },
  {
    "key": "Omni",
    "label": "Omniscience",
    "color": "#FFFF77",
    "fmt": "d",
    "hidden": false,
    "section": 1
  },
  {
    "key": "ReqOmni",
    "label": "Omniscience Required",
    "color": "#FFFF77",
    "fmt": "d",
    "hidden": false,
    "section": 1
  },
  {
    "key": "Devotion",
    "label": "Devotion",
    "color": "#FFFF77",
    "fmt": "d",
    "hidden": false,
    "section": 2
  },
  {
    "key": "TotalEHP",
    "label": "Effective Hit Pool",
    "fmt": ".0f",
    "hidden": false,
    "section": 3
  },
  {
    "key": "PvPTotalTakenHit",
    "label": "PvP Hit Taken",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "isPvP"
    ],
    "section": 3
  },
  {
    "key": "PhysicalMaximumHitTaken",
    "label": "Phys Max Hit",
    "color": "#C8C8C8",
    "fmt": ".0f",
    "hidden": false,
    "section": 3
  },
  {
    "key": "LightningMaximumHitTaken",
    "label": "Elemental Max Hit",
    "color": "#ADAA47",
    "fmt": ".0f",
    "hidden": false,
    "section": 3
  },
  {
    "key": "FireMaximumHitTaken",
    "label": "Fire Max Hit",
    "color": "#B97123",
    "fmt": ".0f",
    "hidden": false,
    "section": 3
  },
  {
    "key": "ColdMaximumHitTaken",
    "label": "Cold Max Hit",
    "color": "#3F6DB3",
    "fmt": ".0f",
    "hidden": false,
    "section": 3
  },
  {
    "key": "LightningMaximumHitTaken",
    "label": "Lightning Max Hit",
    "color": "#ADAA47",
    "fmt": ".0f",
    "hidden": false,
    "section": 3
  },
  {
    "key": "ChaosMaximumHitTaken",
    "label": "Chaos Max Hit",
    "color": "#D02090",
    "fmt": ".0f",
    "hidden": false,
    "section": 3
  },
  {
    "key": "MainHandAccuracy",
    "label": "MH Accuracy",
    "fmt": "d",
    "hidden": false,
    "section": 4
  },
  {
    "key": "OffHandAccuracy",
    "label": "OH Accuracy",
    "fmt": "d",
    "hidden": false,
    "section": 4
  },
  {
    "key": "Life",
    "label": "Total Life",
    "color": "#E05030",
    "fmt": "d",
    "hidden": false,
    "section": 4
  },
  {
    "key": "Spec:LifeInc",
    "label": "%Inc Life from Tree",
    "color": "#E05030",
    "fmt": "d%%",
    "hidden": false,
    "section": 4
  },
  {
    "key": "LifeUnreserved",
    "label": "Unreserved Life",
    "color": "#E05030",
    "fmt": "d",
    "hidden": false,
    "section": 4
  },
  {
    "key": "LifeRecoverable",
    "label": "Life Recoverable",
    "color": "#E05030",
    "fmt": "d",
    "hidden": false,
    "section": 4
  },
  {
    "key": "LifeUnreservedPercent",
    "label": "Unreserved Life",
    "color": "#E05030",
    "fmt": "d%%",
    "hidden": false,
    "section": 4
  },
  {
    "key": "LifeRegenRecovery",
    "label": "Life Regen",
    "color": "#E05030",
    "fmt": ".1f",
    "hidden": false,
    "section": 4
  },
  {
    "key": "LifeRegenRecovery",
    "label": "Life Recovery",
    "color": "#E05030",
    "fmt": ".1f",
    "hidden": false,
    "section": 4
  },
  {
    "key": "LifeRecharge",
    "label": "Life Recharge",
    "color": "#E05030",
    "fmt": ".1f",
    "hidden": false,
    "section": 4
  },
  {
    "key": "LifeLeechGainRate",
    "label": "Life Leech/On Hit Rate",
    "color": "#E05030",
    "fmt": ".1f",
    "hidden": false,
    "section": 4
  },
  {
    "key": "LifeLeechGainPerHit",
    "label": "Life Leech/Gain per Hit",
    "color": "#E05030",
    "fmt": ".1f",
    "hidden": false,
    "section": 4
  },
  {
    "key": "Mana",
    "label": "Total Mana",
    "color": "#7070FF",
    "fmt": "d",
    "hidden": false,
    "section": 5
  },
  {
    "key": "Spec:ManaInc",
    "label": "%Inc Mana from Tree",
    "color": "#7070FF",
    "fmt": "d%%",
    "hidden": false,
    "section": 5
  },
  {
    "key": "ManaUnreserved",
    "label": "Unreserved Mana",
    "color": "#7070FF",
    "fmt": "d",
    "hidden": false,
    "section": 5
  },
  {
    "key": "ManaUnreservedPercent",
    "label": "Unreserved Mana",
    "color": "#7070FF",
    "fmt": "d%%",
    "hidden": false,
    "section": 5
  },
  {
    "key": "ManaRegenRecovery",
    "label": "Mana Regen",
    "color": "#7070FF",
    "fmt": ".1f",
    "hidden": false,
    "section": 5
  },
  {
    "key": "ManaRegenRecovery",
    "label": "Mana Recovery",
    "color": "#7070FF",
    "fmt": ".1f",
    "hidden": false,
    "section": 5
  },
  {
    "key": "ManaLeechGainRate",
    "label": "Mana Leech/On Hit Rate",
    "color": "#7070FF",
    "fmt": ".1f",
    "hidden": false,
    "section": 5
  },
  {
    "key": "ManaLeechGainPerHit",
    "label": "Mana Leech/Gain per Hit",
    "color": "#7070FF",
    "fmt": ".1f",
    "hidden": false,
    "section": 5
  },
  {
    "key": "EnergyShield",
    "label": "Energy Shield",
    "color": "#88FFFF",
    "fmt": "d",
    "hidden": false,
    "section": 6
  },
  {
    "key": "EnergyShieldRecoveryCap",
    "label": "Recoverable ES",
    "color": "#88FFFF",
    "fmt": "d",
    "hidden": false,
    "section": 6
  },
  {
    "key": "Spec:EnergyShieldInc",
    "label": "%Inc ES from Tree",
    "color": "#88FFFF",
    "fmt": "d%%",
    "hidden": false,
    "section": 6
  },
  {
    "key": "EnergyShieldRegenRecovery",
    "label": "ES Regen",
    "color": "#88FFFF",
    "fmt": ".1f",
    "hidden": false,
    "section": 6
  },
  {
    "key": "EnergyShieldRegenRecovery",
    "label": "ES Recovery",
    "color": "#88FFFF",
    "fmt": ".1f",
    "hidden": false,
    "section": 6
  },
  {
    "key": "EnergyShieldLeechGainRate",
    "label": "ES Leech/On Hit Rate",
    "color": "#88FFFF",
    "fmt": ".1f",
    "hidden": false,
    "section": 6
  },
  {
    "key": "EnergyShieldLeechGainPerHit",
    "label": "ES Leech/Gain per Hit",
    "color": "#88FFFF",
    "fmt": ".1f",
    "hidden": false,
    "section": 6
  },
  {
    "key": "Ward",
    "label": "Ward",
    "color": "#FFFF77",
    "fmt": "d",
    "hidden": false,
    "section": 7
  },
  {
    "key": "Rage",
    "label": "Rage",
    "color": "#FF9922",
    "fmt": "d",
    "hidden": false,
    "section": 8
  },
  {
    "key": "RageRegenRecovery",
    "label": "Rage Regen",
    "color": "#FF9922",
    "fmt": ".1f",
    "hidden": false,
    "section": 8
  },
  {
    "key": "TotalBuildDegen",
    "label": "Total Degen",
    "fmt": ".1f",
    "hidden": false,
    "section": 9
  },
  {
    "key": "TotalNetRegen",
    "label": "Total Net Recovery",
    "fmt": "+.1f",
    "hidden": false,
    "section": 9
  },
  {
    "key": "NetLifeRegen",
    "label": "Net Life Recovery",
    "color": "#E05030",
    "fmt": "+.1f",
    "hidden": false,
    "section": 9
  },
  {
    "key": "NetManaRegen",
    "label": "Net Mana Recovery",
    "color": "#7070FF",
    "fmt": "+.1f",
    "hidden": false,
    "section": 9
  },
  {
    "key": "NetEnergyShieldRegen",
    "label": "Net ES Recovery",
    "color": "#88FFFF",
    "fmt": "+.1f",
    "hidden": false,
    "section": 9
  },
  {
    "key": "Evasion",
    "label": "Evasion rating",
    "color": "#33FF77",
    "fmt": "d",
    "hidden": false,
    "section": 10
  },
  {
    "key": "Spec:EvasionInc",
    "label": "%Inc Evasion from Tree",
    "color": "#33FF77",
    "fmt": "d%%",
    "hidden": false,
    "section": 10
  },
  {
    "key": "MeleeEvadeChance",
    "label": "Evade Chance",
    "color": "#33FF77",
    "fmt": "d%%",
    "hidden": false,
    "section": 10
  },
  {
    "key": "MeleeEvadeChance",
    "label": "Melee Evade Chance",
    "color": "#33FF77",
    "fmt": "d%%",
    "hidden": false,
    "section": 10
  },
  {
    "key": "ProjectileEvadeChance",
    "label": "Projectile Evade Chance",
    "color": "#33FF77",
    "fmt": "d%%",
    "hidden": false,
    "section": 10
  },
  {
    "key": "Armour",
    "label": "Armour",
    "fmt": "d",
    "hidden": false,
    "section": 11
  },
  {
    "key": "Spec:ArmourInc",
    "label": "%Inc Armour from Tree",
    "fmt": "d%%",
    "hidden": false,
    "section": 11
  },
  {
    "key": "PhysicalDamageReduction",
    "label": "Phys. Damage Reduction",
    "fmt": "d%%",
    "hidden": false,
    "section": 11
  },
  {
    "key": "EffectiveBlockChance",
    "label": "Block Chance",
    "fmt": ".3f%%",
    "hidden": false,
    "overCapStat": "BlockChanceOverCap",
    "section": 12
  },
  {
    "key": "EffectiveSpellBlockChance",
    "label": "Spell Block Chance",
    "fmt": ".3f%%",
    "hidden": false,
    "overCapStat": "SpellBlockChanceOverCap",
    "section": 12
  },
  {
    "key": "AttackDodgeChance",
    "label": "Attack Dodge Chance",
    "fmt": "d%%",
    "hidden": false,
    "overCapStat": "AttackDodgeChanceOverCap",
    "section": 12
  },
  {
    "key": "SpellDodgeChance",
    "label": "Spell Dodge Chance",
    "fmt": "d%%",
    "hidden": false,
    "overCapStat": "SpellDodgeChanceOverCap",
    "section": 12
  },
  {
    "key": "EffectiveSpellSuppressionChance",
    "label": "Spell Suppression Chance",
    "fmt": ".2f%%",
    "hidden": false,
    "overCapStat": "SpellSuppressionChanceOverCap",
    "section": 12
  },
  {
    "key": "FireResist",
    "label": "Fire Resistance",
    "color": "#B97123",
    "fmt": "d%%",
    "hidden": false,
    "overCapStat": "FireResistOverCap",
    "section": 13
  },
  {
    "key": "FireResistOverCap",
    "label": "Fire Res. Over Max",
    "fmt": "d%%",
    "hidden": true,
    "section": 13
  },
  {
    "key": "ColdResist",
    "label": "Cold Resistance",
    "color": "#3F6DB3",
    "fmt": "d%%",
    "hidden": false,
    "overCapStat": "ColdResistOverCap",
    "section": 13
  },
  {
    "key": "ColdResistOverCap",
    "label": "Cold Res. Over Max",
    "fmt": "d%%",
    "hidden": true,
    "section": 13
  },
  {
    "key": "LightningResist",
    "label": "Lightning Resistance",
    "color": "#ADAA47",
    "fmt": "d%%",
    "hidden": false,
    "overCapStat": "LightningResistOverCap",
    "section": 13
  },
  {
    "key": "LightningResistOverCap",
    "label": "Lightning Res. Over Max",
    "fmt": "d%%",
    "hidden": true,
    "section": 13
  },
  {
    "key": "ChaosResist",
    "label": "Chaos Resistance",
    "color": "#D02090",
    "fmt": "d%%",
    "hidden": false,
    "overCapStat": "ChaosResistOverCap",
    "section": 13
  },
  {
    "key": "ChaosResistOverCap",
    "label": "Chaos Res. Over Max",
    "fmt": "d%%",
    "hidden": true,
    "section": 13
  },
  {
    "key": "EffectiveMovementSpeedMod",
    "label": "Movement Speed Modifier",
    "fmt": "+d%%",
    "hidden": false,
    "section": 14
  },
  {
    "key": "QuantityMultiplier",
    "label": "Quantity Multiplier",
    "fmt": "+d%%",
    "hidden": false,
    "section": 14
  },
  {
    "key": "StoredUses",
    "label": "Stored Uses",
    "fmt": "d",
    "hidden": false,
    "section": 14
  },
  {
    "key": "Duration",
    "label": "Skill Duration",
    "fmt": ".2f",
    "hidden": false,
    "flags": [
      "duration"
    ],
    "section": 14
  },
  {
    "key": "DurationSecondary",
    "label": "Secondary Duration",
    "fmt": ".2f",
    "hidden": false,
    "flags": [
      "duration"
    ],
    "section": 14
  },
  {
    "key": "AuraDuration",
    "label": "Aura Duration",
    "fmt": ".2f",
    "hidden": false,
    "section": 14
  },
  {
    "key": "ReserveDuration",
    "label": "Reserve Duration",
    "fmt": ".2f",
    "hidden": false,
    "section": 14
  },
  {
    "key": "SoulGainPreventionDuration",
    "label": "Soul Gain Prevent.",
    "fmt": ".2f",
    "hidden": false,
    "section": 14
  },
  {
    "key": "SustainableTrauma",
    "label": "Sustainable Trauma",
    "fmt": "d",
    "hidden": false,
    "section": 14
  },
  {
    "key": "ProjectileCount",
    "label": "Projectile Count",
    "fmt": "d",
    "hidden": false,
    "flags": [
      "projectile"
    ],
    "section": 14
  },
  {
    "key": "PierceCountString",
    "label": "Pierce Count",
    "fmt": "d",
    "hidden": false,
    "section": 14
  },
  {
    "key": "ForkCountString",
    "label": "Fork Count",
    "fmt": "d",
    "hidden": false,
    "section": 14
  },
  {
    "key": "ChainMaxString",
    "label": "Max Chain Count",
    "fmt": "d",
    "hidden": false,
    "section": 14
  },
  {
    "key": "SplitCountString",
    "label": "Proj, Split Count",
    "fmt": "d",
    "hidden": false,
    "flags": [
      "projectile"
    ],
    "section": 14
  },
  {
    "key": "ProjectileSpeedMod",
    "label": "Proj. Speed Mod",
    "fmt": ".2f",
    "hidden": false,
    "flags": [
      "projectile"
    ],
    "section": 14
  },
  {
    "key": "BounceCount",
    "label": "Bounces Count",
    "fmt": "d",
    "hidden": false,
    "flags": [
      "bounce"
    ],
    "section": 14
  },
  {
    "key": "AuraEffectMod",
    "label": "Aura Effect Mod",
    "fmt": ".2f",
    "hidden": false,
    "section": 14
  },
  {
    "key": "CurseEffectMod",
    "label": "Curse Effect Mod",
    "fmt": ".2f",
    "hidden": false,
    "section": 14
  },
  {
    "key": "LootQuantity",
    "label": "Item Quantity",
    "fmt": "+d%%",
    "hidden": false,
    "section": 14
  },
  {
    "key": "LootRarity",
    "label": "Item Rarity",
    "fmt": "+d%%",
    "hidden": false,
    "section": 14
  },
  {
    "key": "FullDPS",
    "label": "Full DPS",
    "color": "#AA9E82",
    "fmt": ".1f",
    "hidden": false,
    "section": 15
  },
  {
    "key": "FullDotDPS",
    "label": "Full Dot DPS",
    "color": "#AA9E82",
    "fmt": ".1f",
    "hidden": false,
    "section": 15
  },
  {
    "key": "SkillDPS",
    "label": "Skill DPS",
    "hidden": false,
    "section": 16
  }
];

export const POB_MINION_STAT_LAYOUT: PobStatLayoutEntry[] = [
  {
    "key": "AverageDamage",
    "label": "Average Damage",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "Speed",
    "label": "Attack/Cast Rate",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "HitSpeed",
    "label": "Hit Rate",
    "fmt": ".2f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "Speed",
    "label": "Effective Trigger Rate",
    "fmt": ".2f",
    "hidden": false,
    "notFlags": [
      "skipEffectiveRate"
    ],
    "section": 0
  },
  {
    "key": "TotalDPS",
    "label": "Hit DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TotalDot",
    "label": "DoT DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "WithDotDPS",
    "label": "Total DPS inc. DoT",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "BleedDPS",
    "label": "Bleed DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "WithBleedDPS",
    "label": "Total DPS inc. Bleed",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "IgniteDPS",
    "label": "Ignite DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "WithIgniteDPS",
    "label": "Total DPS inc. Ignite",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "PoisonDPS",
    "label": "Poison DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "PoisonDamage",
    "label": "Total Damage per Poison",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "WithPoisonDPS",
    "label": "Total DPS inc. Poison",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "DecayDPS",
    "label": "Decay DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "TotalDotDPS",
    "label": "Total DoT DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ImpaleDPS",
    "label": "Impale DPS",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "impale"
    ],
    "section": 0
  },
  {
    "key": "WithImpaleDPS",
    "label": "Total DPS inc. Impale",
    "fmt": ".1f",
    "hidden": false,
    "flags": [
      "impale"
    ],
    "section": 0
  },
  {
    "key": "CullingDPS",
    "label": "Culling DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "ReservationDPS",
    "label": "Reservation DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "CombinedDPS",
    "label": "Combined DPS",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "Cooldown",
    "label": "Skill Cooldown",
    "fmt": ".3fs",
    "hidden": false,
    "notFlags": [
      "skipEffectiveRate"
    ],
    "section": 0
  },
  {
    "key": "Life",
    "label": "Total Life",
    "color": "#E05030",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "LifeRegenRecovery",
    "label": "Life Recovery",
    "color": "#E05030",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "LifeLeechGainRate",
    "label": "Life Leech/On Hit Rate",
    "color": "#E05030",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "EnergyShield",
    "label": "Energy Shield",
    "color": "#88FFFF",
    "fmt": "d",
    "hidden": false,
    "section": 0
  },
  {
    "key": "EnergyShieldRegenRecovery",
    "label": "ES Recovery",
    "color": "#88FFFF",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  },
  {
    "key": "EnergyShieldLeechGainRate",
    "label": "ES Leech/On Hit Rate",
    "color": "#88FFFF",
    "fmt": ".1f",
    "hidden": false,
    "section": 0
  }
];

export const POB_EXTRA_SAVE_STAT_LAYOUT: PobStatLayoutEntry[] = [
  {
    "hidden": false,
    "key": "PowerCharges",
    "section": 17
  },
  {
    "hidden": false,
    "key": "PowerChargesMax",
    "section": 17
  },
  {
    "hidden": false,
    "key": "FrenzyCharges",
    "section": 17
  },
  {
    "hidden": false,
    "key": "FrenzyChargesMax",
    "section": 17
  },
  {
    "hidden": false,
    "key": "EnduranceCharges",
    "section": 17
  },
  {
    "hidden": false,
    "key": "EnduranceChargesMax",
    "section": 17
  },
  {
    "hidden": false,
    "key": "ActiveTotemLimit",
    "section": 17
  },
  {
    "hidden": false,
    "key": "ActiveMinionLimit",
    "section": 17
  }
];
