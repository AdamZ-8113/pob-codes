/* This file is generated from local-pob-mirror/src/Modules/ConfigOptions.lua */
export interface PobConfigChoice {
  label: string;
  value: boolean | number | string;
}

export interface PobConfigOption {
  choices?: PobConfigChoice[];
  column?: number;
  defaultValue?: boolean | number | string;
  key: string;
  label?: string;
  section?: string;
  type?: string;
}

export const POB_CONFIG_OPTIONS: PobConfigOption[] = [
  {
    "choices": [
      {
        "label": "None",
        "value": 0
      },
      {
        "label": "Act 5 (-30%)",
        "value": -30
      },
      {
        "label": "Act 10 (-60%)",
        "value": -60
      }
    ],
    "column": 1,
    "defaultValue": -60,
    "key": "resistancePenalty",
    "label": "Resistance penalty",
    "section": "General",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Kill all",
        "value": "None"
      },
      {
        "label": "Help Oak",
        "value": "Oak"
      },
      {
        "label": "Help Kraityn",
        "value": "Kraityn"
      },
      {
        "label": "Help Alira",
        "value": "Alira"
      }
    ],
    "column": 1,
    "defaultValue": "None",
    "key": "bandit",
    "label": "Bandit quest",
    "section": "General",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Nothing",
        "value": "None"
      },
      {
        "label": "Soul of the Brine King",
        "value": "TheBrineKing"
      },
      {
        "label": "Soul of Lunaris",
        "value": "Lunaris"
      },
      {
        "label": "Soul of Solaris",
        "value": "Solaris"
      },
      {
        "label": "Soul of Arakaali",
        "value": "Arakaali"
      }
    ],
    "column": 1,
    "defaultValue": "None",
    "key": "pantheonMajorGod",
    "label": "Major God",
    "section": "General",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Nothing",
        "value": "None"
      },
      {
        "label": "Soul of Gruthkul",
        "value": "Gruthkul"
      },
      {
        "label": "Soul of Yugul",
        "value": "Yugul"
      },
      {
        "label": "Soul of Abberath",
        "value": "Abberath"
      },
      {
        "label": "Soul of Tukohama",
        "value": "Tukohama"
      },
      {
        "label": "Soul of Garukhan",
        "value": "Garukhan"
      },
      {
        "label": "Soul of Ralakesh",
        "value": "Ralakesh"
      },
      {
        "label": "Soul of Ryslatha",
        "value": "Ryslatha"
      },
      {
        "label": "Soul of Shakari",
        "value": "Shakari"
      }
    ],
    "column": 1,
    "defaultValue": "None",
    "key": "pantheonMinorGod",
    "label": "Minor God",
    "section": "General",
    "type": "list"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "detonateDeadCorpseLife",
    "label": "Enemy Corpse Life",
    "section": "General",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "conditionStationary",
    "label": "Time spent stationary",
    "section": "General",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionMoving",
    "label": "Are you always moving?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionFullLife",
    "label": "Are you always on Full Life?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLowLife",
    "label": "Are you always on Low Life?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionFullMana",
    "label": "Are you always on Full Mana?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLowMana",
    "label": "Are you always on Low Mana?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionFullEnergyShield",
    "label": "Are you always on Full Energy Shield?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLowEnergyShield",
    "label": "Are you always on Low Energy Shield?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHaveEnergyShield",
    "label": "Do you always have Energy Shield?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionsConditionFullLife",
    "label": "Are your Minions always on Full Life?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionsConditionLowLife",
    "label": "Are your Minions always on Low Life?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionsConditionFullEnergyShield",
    "label": "Minion is always on Full Energy Shield?",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionsConditionCreatedRecently",
    "label": "Have your Minions been created Recently?",
    "section": "General",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Crits Only",
        "value": "CRIT"
      }
    ],
    "column": 1,
    "defaultValue": "AVERAGE",
    "key": "ailmentMode",
    "label": "Ailment calculation mode",
    "section": "General",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Fire",
        "value": "FIRE"
      },
      {
        "label": "Cold",
        "value": "COLD"
      },
      {
        "label": "Lightning",
        "value": "LIGHTNING"
      }
    ],
    "column": 1,
    "defaultValue": "AVERAGE",
    "key": "physMode",
    "label": "Random element mode",
    "section": "General",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Minimum",
        "value": "MIN"
      },
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Burst",
        "value": "FULL"
      }
    ],
    "column": 1,
    "defaultValue": "MIN",
    "key": "lifeRegenMode",
    "label": "Life regen calculation mode",
    "section": "General",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Minimum",
        "value": "MIN"
      },
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Maximum",
        "value": "MAX"
      }
    ],
    "column": 1,
    "defaultValue": "AVERAGE",
    "key": "resourceGainMode",
    "label": "Resource gain calculation mode",
    "section": "General",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Average",
        "value": 1
      },
      {
        "label": "Unlucky",
        "value": 2
      },
      {
        "label": "Very Unlucky",
        "value": 4
      }
    ],
    "column": 1,
    "defaultValue": 1,
    "key": "EHPUnluckyWorstOf",
    "label": "EHP calc unlucky",
    "section": "General",
    "type": "list"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "DisableEHPGainOnBlock",
    "label": "Disable EHP gain when hit",
    "section": "General",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "Minimum",
        "value": "MIN"
      },
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Maximum",
        "value": "MAX"
      }
    ],
    "column": 1,
    "defaultValue": "MIN",
    "key": "armourCalculationMode",
    "label": "Armour calculation mode",
    "section": "General",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Max Hit",
        "value": "MAX"
      }
    ],
    "column": 1,
    "defaultValue": "AVERAGE",
    "key": "warcryMode",
    "label": "Exerted/Boosted calc mode",
    "section": "General",
    "type": "list"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "EVBypass",
    "label": "Disable Emperor's Vigilance Bypass",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "ignoreItemDisablers",
    "label": "Don't disable items",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "ignoreJewelLimits",
    "label": "Ignore Jewel Limits",
    "section": "General",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideEmptyRedSockets",
    "label": "# of Empty Red Sockets",
    "section": "General",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideEmptyGreenSockets",
    "label": "# of Empty Green Sockets",
    "section": "General",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideEmptyBlueSockets",
    "label": "# of Empty Blue Sockets",
    "section": "General",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideEmptyWhiteSockets",
    "label": "# of Empty White Sockets",
    "section": "General",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "arcaneCloakUsedRecentlyCheck",
    "label": "Include in Mana spent Recently?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "aspectOfTheAvianAviansMight",
    "label": "Is Avian's Might active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "aspectOfTheAvianAviansFlight",
    "label": "Is Avian's Flight active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "aspectOfTheCatCatsStealth",
    "label": "Is Cat's Stealth active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "aspectOfTheCatCatsAgility",
    "label": "Is Cat's Agility active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "overrideCrabBarriers",
    "label": "# of Crab Barriers (if not maximum)",
    "section": "Skill Options",
    "type": "countAllowZero"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "aspectOfTheSpiderWebStacks",
    "label": "# of Spider's Web Stacks",
    "section": "Skill Options",
    "type": "countAllowZero"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "bannerPlanted",
    "label": "Is Banner Planted?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "bannerValour",
    "label": "Banner Valour",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "barkskinStacks",
    "label": "# of Barkskin Stacks",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "Unbound",
    "label": "Are you Unbound?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "bladestormInBloodstorm",
    "label": "Are you in a Bloodstorm?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "bladestormInSandstorm",
    "label": "Are you in a Sandstorm?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 1,
    "key": "bloodsoakedBannerStages",
    "label": "# of Bloodsoaked Banner stacks on enemy",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "bloodSacramentReservationEHP",
    "label": "Count Skill Reservation towards eHP?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "ActiveBrands",
    "label": "# of active Brands",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "BrandsAttachedToEnemy",
    "label": "# of Brands attached to the enemy",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "targetBrandedEnemy",
    "label": "Skill is targeting the Branded enemy",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "BrandsInLastQuarter",
    "label": "Last 25% of attached duration?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "BrandsInLastHalf",
    "label": "Last 50% of attached duration?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "carrionGolemNearbyMinion",
    "label": "# of Nearby Non-Golem Minions",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "carrionGolemEqualsChaosGolem",
    "label": "# Carrion Golem = # Chaos Golem",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "chaosGolemEqualsStoneGolem",
    "label": "# Chaos Golem = # Stone Golem",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "cinderflameStacks",
    "label": "# of Cinderflame stacks on enemy",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "stoneGolemEqualsCarrionGolem",
    "label": "# Stone Golem = # Carrion Golem",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "closeCombatCombatRush",
    "label": "Is Combat Rush active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "ColdSnapBypassCD",
    "label": "Bypass CD?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "ConcPathBypassCD",
    "label": "Bypass CD?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 1,
    "key": "conditionCorruptingCryStages",
    "label": "# of Corrupting Cry stacks on enemy",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "overrideCruelty",
    "label": "Damage % (if not maximum)",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "channellingCycloneCheck",
    "label": "Are you Channelling Cyclone?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "darkPactSkeletonLife",
    "label": "Skeleton Life",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "divineSentinelPhysAsFire",
    "label": "Phys as Fire",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "divineSentinelPhysAsLightning",
    "label": "Phys as Lightning",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "divineSentinelRegenLife",
    "label": "Regen Life",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "divineSentinelRegenMana",
    "label": "Mana Regeneration Rate",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "divineSentinelChaosResistance",
    "label": "Chaos Resistance",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "divineSentinelSelfCurseEffect",
    "label": "Curse Effect on Self",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "Curse Expiration",
        "value": "expiration"
      },
      {
        "label": "Curse Replacement",
        "value": "replacement"
      },
      {
        "label": "Vixen's Curse",
        "value": "vixen"
      },
      {
        "label": "Hexblast Replacement",
        "value": "hexblast"
      }
    ],
    "column": 2,
    "defaultValue": "vixen",
    "key": "doomBlastSource",
    "label": "Doom Blast Trigger Source",
    "section": "Skill Options",
    "type": "list"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "curseOverlaps",
    "label": "Curse overlaps",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "choices": [
      {
        "label": "None",
        "value": 0
      },
      {
        "label": "Fire",
        "value": "Fire"
      },
      {
        "label": "Cold",
        "value": "Cold"
      },
      {
        "label": "Lightning",
        "value": "Lightning"
      }
    ],
    "column": 2,
    "defaultValue": 0,
    "key": "elementalArmyExposureType",
    "label": "Exposure Type",
    "section": "Skill Options",
    "type": "list"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "embraceMadnessActive",
    "label": "Is Embrace Madness active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 10,
    "key": "touchedDebuffsCount",
    "label": "Glorious Madness Stacks",
    "section": "Skill Options",
    "type": "countAllowZero"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "feedingFrenzyFeedingFrenzyActive",
    "label": "Is Feeding Frenzy active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "flameWallAddedDamage",
    "label": "Projectile Travelled through Flame Wall?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "FlickerStrikeBypassCD",
    "label": "Bypass CD?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "freshMeatBuffs",
    "label": "Is Fresh Meat active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "frostShieldStages",
    "label": "Stages",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "Disgorged",
    "label": "Is Disgorge active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "greaterHarbingerOfTimeSlipstream",
    "label": "Is Slipstream active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "harbingerOfTimeSlipstream",
    "label": "Is Slipstream active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "multiplierHexDoom",
    "label": "Doom on Hex",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "heraldOfAgonyVirulenceStack",
    "label": "# of Virulence Stacks",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "hoaOverkill",
    "label": "Overkill damage",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "heraldOfTheHivePressure",
    "label": "# of Otherworldly Pressure Stacks",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "inventionMineTrapPlacedDuration",
    "label": "Placed duration of Mine / Traps",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "iceNovaCastOnFrostbolt",
    "label": "Cast on Frostbolt?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "infusedChannellingInfusion",
    "label": "Is Infusion active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "innervateInnervation",
    "label": "Is Innervation active?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "intensifyIntensity",
    "label": "# of Intensity",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "OverloadedIntensity",
    "label": "# of Overloaded Intensity",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "multiplierLinkedTargets",
    "label": "# of linked Targets",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "linkedToMinion",
    "label": "Linked To Minion?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "linkedSourceRate",
    "label": "Source rate for Intuitive Link",
    "section": "Skill Options",
    "type": "float"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "manabondMissingUnreservedManaPercentage",
    "label": "Missing Unreserved Mana %",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "minionPactLife",
    "label": "Damageable Minion Life",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "conditionEnemyMalignantMadness",
    "label": "Enemy has Malignant Madness?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "meatShieldEnemyNearYou",
    "label": "Is the enemy near you?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "enemyHitMistyReflection",
    "label": "Enemy hit by Misty Reflection?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "MomentumStacks",
    "label": "# of Momentum (if not average)",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "MomentumSwiftnessStacks",
    "label": "Swiftness # of Momentum Removed",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "choices": [
      {
        "label": "Incubating",
        "value": "INC"
      },
      {
        "label": "Infecting",
        "value": "INF"
      }
    ],
    "column": 2,
    "defaultValue": "INC",
    "key": "plagueBearerState",
    "label": "State",
    "section": "Skill Options",
    "type": "list"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "perforateSpikeOverlap",
    "label": "# of Overlapping Spikes",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "physicalAegisDepleted",
    "label": "Is Physical Aegis depleted?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "deathmarkDeathmarkActive",
    "label": "Is the enemy marked with Signal Prey?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "Initial effect",
        "value": "MIN"
      },
      {
        "label": "Maximum effect",
        "value": "MAX"
      }
    ],
    "column": 2,
    "defaultValue": "MIN",
    "key": "prideEffect",
    "label": "Pride Aura Effect",
    "section": "Skill Options",
    "type": "list"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "sacrificedRageCount",
    "label": "Amount of Rage Sacrificed (if not maximum)",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "raiseSpectreEnableBuffs",
    "label": "Enable buffs",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "raiseSpectreEnableCurses",
    "label": "Enable curses",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "conditionSummonedSpectreInPast8Sec",
    "label": "Summoned Spectre in past 8 Seconds?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "raiseSpectreBladeVortexBladeCount",
    "label": "Blade Vortex blade count",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "raiseSpectreKaomFireBeamTotemStage",
    "label": "Scorching Ray Totem stage count",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "raiseSpectreEnableSummonedUrsaRallyingCry",
    "label": "Enable Summoned Ursa's Rallying Cry",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "raiseSpectreEnableSlashingHorrorEnrage",
    "label": "Disable Slashing Horror's Enrage",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "raiseSpectreEnableSanguimancerDemonLowLife",
    "label": "Sanguimancer Demon not on Low Life",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "raiseSpidersSpiderCount",
    "label": "# of Spiders",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "conditionSummonedZombieInPast8Sec",
    "label": "Summoned Zombie in past 8 Seconds?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "animateWeaponLingeringBlade",
    "label": "Are you animating Lingering Blades?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "ShrapnelBallistaProjectileOverlap",
    "label": "# of Shotgunning Projectiles",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "sigilOfPowerStages",
    "label": "Stages",
    "section": "Skill Options",
    "type": "countAllowZero"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "siphoningTrapAffectedEnemies",
    "label": "# of Enemies affected",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "configSnipeStages",
    "label": "# of Snipe stages",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "configSpectralTigerCount",
    "label": "# of Active Spectral Tigers",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "configSpectralWolfCount",
    "label": "# of Active Spectral Wolves",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "choices": [
      {
        "label": "Blood Stance",
        "value": "BLOOD"
      },
      {
        "label": "Sand Stance",
        "value": "SAND"
      }
    ],
    "column": 2,
    "defaultValue": "BLOOD",
    "key": "bloodSandStance",
    "label": "Stance",
    "section": "Skill Options",
    "type": "list"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "changedStance",
    "label": "Changed Stance recently?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "shardsConsumed",
    "label": "Steel Shards consumed",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "steelWards",
    "label": "Steel Wards",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "stormRainBeamOverlap",
    "label": "# of Overlapping Beams",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "stormRainActiveArrows",
    "label": "# of Active Arrows",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "summonElementalRelicEnableAngerAura",
    "label": "Enable Anger Aura",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "summonElementalRelicEnableHatredAura",
    "label": "Enable Hatred Aura",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "summonElementalRelicEnableWrathAura",
    "label": "Enable Wrath Aura",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "summonHolyRelicEnableHolyRelicBoon",
    "label": "Enable Holy Relic's Boon Aura",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "summonLightningGolemEnableWrath",
    "label": "Enable Wrath Aura",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "summonReaperConsumeRecently",
    "label": "Reaper Consumed recently?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "weepingBlackStacks",
    "label": "# of Weeping Black stacks on enemy",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "nearbyBleedingEnemies",
    "label": "# of Nearby Bleeding Enemies",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "tornadoShotSecondaryHitChance",
    "label": "% chance for second proj to hit",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "toxicRainPodOverlap",
    "label": "# of Overlapping Pods",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "traumaStacks",
    "label": "# of Trauma Stacks",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "configResonanceCount",
    "label": "Lowest Resonance Count",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "configUnholyResonanceCount",
    "label": "Lowest Resonance Count",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "conditionInsane",
    "label": "Are you Insane?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": true,
    "key": "VigilantStrikeBypassCD",
    "label": "Bypass CD?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "voltaxicBurstSpellsQueued",
    "label": "# of Casts currently waiting",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "vortexCastOnFrostbolt",
    "label": "Cast on Frostbolt?",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "multiplierWarcryPower",
    "label": "Warcry Power",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "choices": [
      {
        "label": "None",
        "value": 0
      },
      {
        "label": "Fire",
        "value": "Fire"
      },
      {
        "label": "Cold",
        "value": "Cold"
      },
      {
        "label": "Lightning",
        "value": "Lightning"
      }
    ],
    "column": 2,
    "defaultValue": 0,
    "key": "waveOfConvictionExposureType",
    "label": "Exposure Type",
    "section": "Skill Options",
    "type": "list"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "multiplierWoCExpiredDuration",
    "label": "% Wave of Conviction duration expired",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "absolutionSkillDamageCountedOnce",
    "label": "Absolution: Count skill damage once",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "dominatingBlowSkillDamageCountedOnce",
    "label": "Dom. Blow: Count skill damage once",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "holyStrikeSkillDamageCountedOnce",
    "label": "Holy Strike: Count skill damage once",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "MoltenShellDamageMitigated",
    "label": "Damage mitigated",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "VaalMoltenShellDamageMitigated",
    "label": "Damage mitigated",
    "section": "Skill Options",
    "type": "count"
  },
  {
    "choices": [
      {
        "label": "Small",
        "value": "Small"
      },
      {
        "label": "Medium",
        "value": "Medium"
      },
      {
        "label": "Large",
        "value": "Large"
      },
      {
        "label": "Huge",
        "value": "Huge"
      }
    ],
    "column": 2,
    "defaultValue": "Medium",
    "key": "enemySizePreset",
    "label": "Enemy size preset",
    "section": "Skill Options",
    "type": "list"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "enemyRadius",
    "label": "Enemy radius",
    "section": "Skill Options",
    "type": "integer"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "TotalSpectreLife",
    "label": "Total Spectre Life",
    "section": "Skill Options",
    "type": "integer"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "TotalTotemLife",
    "label": "Total Totem Life",
    "section": "Skill Options",
    "type": "integer"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "TotalRadianceSentinelLife",
    "label": "Total life pool of Sentinel of Radiance",
    "section": "Skill Options",
    "type": "integer"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "TotalVoidSpawnLife",
    "label": "Total life pool of Void Spawn",
    "section": "Skill Options",
    "type": "integer"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "TotalVaalRejuvenationTotemLife",
    "label": "Total Vaal Rejuvenation Totem Life",
    "section": "Skill Options",
    "type": "integer"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastConductivity",
    "label": "Conductivity self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastDespair",
    "label": "Despair self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastElementalWeakness",
    "label": "Elemental Weakness self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastEnfeeble",
    "label": "Enfeeble self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastFlammability",
    "label": "Flammability self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastFrostbite",
    "label": "Frostbite self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastPunishment",
    "label": "Punishment self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastTemporalChains",
    "label": "Temporal Chains self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "balanceOfTerrorSelfCastVulnerability",
    "label": "Vulnerability self-only",
    "section": "Skill Options",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "multiplierSextant",
    "label": "# of Sextants affecting the area",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "multiplierMapModEffect",
    "label": "% increased effect of map mods",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "choices": [
      {
        "label": "Red",
        "value": "HIGH"
      },
      {
        "label": "Yellow",
        "value": "MED"
      },
      {
        "label": "White",
        "value": "LOW"
      }
    ],
    "column": 2,
    "defaultValue": "HIGH",
    "key": "multiplierMapModTier",
    "label": "Map Tier",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "key": "MapPrefix1",
    "label": "Prefix",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "key": "MapPrefix2",
    "label": "Prefix",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "key": "MapPrefix3",
    "label": "Prefix",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "key": "MapPrefix4",
    "label": "Prefix",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "key": "MapSuffix1",
    "label": "Suffix",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "key": "MapSuffix2",
    "label": "Suffix",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "key": "MapSuffix3",
    "label": "Suffix",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "key": "MapSuffix4",
    "label": "Suffix",
    "section": "Map Modifiers and Player Debuffs",
    "type": "list"
  },
  {
    "column": 2,
    "defaultValue": false,
    "key": "PvpScaling",
    "label": "PvP damage scaling in effect",
    "section": "Map Modifiers and Player Debuffs",
    "type": "check"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithAssassinsMark",
    "label": "Assassin's Mark",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithConductivity",
    "label": "Conductivity",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithDespair",
    "label": "Despair",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithElementalWeakness",
    "label": "Elemental Weakness",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithEnfeeble",
    "label": "Enfeeble",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithFlammability",
    "label": "Flammability",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithFrostbite",
    "label": "Frostbite",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithPoachersMark",
    "label": "Poacher's Mark",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithProjectileWeakness",
    "label": "Projectile Weakness",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithPunishment",
    "label": "Punishment",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithTemporalChains",
    "label": "Temporal Chains",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithVulnerability",
    "label": "Vulnerability",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 2,
    "defaultValue": 0,
    "key": "playerCursedWithWarlordsMark",
    "label": "Warlord's Mark",
    "section": "Map Modifiers and Player Debuffs",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "usePowerCharges",
    "label": "Do you use Power Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overridePowerCharges",
    "label": "# of Power Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "useFrenzyCharges",
    "label": "Do you use Frenzy Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideFrenzyCharges",
    "label": "# of Frenzy Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "useEnduranceCharges",
    "label": "Do you use Endurance Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideEnduranceCharges",
    "label": "# of Endurance Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "useSiphoningCharges",
    "label": "Do you use Siphoning Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideSiphoningCharges",
    "label": "# of Siphoning Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "useChallengerCharges",
    "label": "Do you use Challenger Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideChallengerCharges",
    "label": "# of Challenger Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "useBlitzCharges",
    "label": "Do you use Blitz Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideBlitzCharges",
    "label": "# of Blitz Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierGaleForce",
    "label": "# of Gale Force",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideInspirationCharges",
    "label": "# of Inspiration Charges (if not maximum)",
    "section": "When In Combat",
    "type": "countAllowZero"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "useGhostShrouds",
    "label": "Do you use Ghost Shrouds?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideGhostShrouds",
    "label": "# of Ghost Shrouds (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "waitForMaxSeals",
    "label": "Do you wait for Max Unleash Seals?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "None",
        "value": "NONE"
      },
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Final only",
        "value": "FINAL"
      },
      {
        "label": "Final (all hits use final)",
        "value": "FINAL_DPS"
      }
    ],
    "column": 1,
    "defaultValue": "AVERAGE",
    "key": "repeatMode",
    "label": "Repeat Mode",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Max Effect",
        "value": "MAX"
      }
    ],
    "column": 1,
    "defaultValue": "AVERAGE",
    "key": "ruthlessSupportMode",
    "label": "Ruthless Support Mode",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Minimum",
        "value": "MIN"
      },
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Max Effect",
        "value": "MAX"
      }
    ],
    "column": 1,
    "defaultValue": "AVERAGE",
    "key": "ChanceToIgnoreEnemyPhysicalDamageReductionMode",
    "label": "Chance To Ignore PDR Mode",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideBloodCharges",
    "label": "# of Blood Charges (if not maximum)",
    "section": "When In Combat",
    "type": "countAllowZero"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideSpiritCharges",
    "label": "# of Spirit Charges",
    "section": "When In Combat",
    "type": "countAllowZero"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionsUsePowerCharges",
    "label": "Do your Minions use Power Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionsUseFrenzyCharges",
    "label": "Do your Minions use Frenzy Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionsUseEnduranceCharges",
    "label": "Do your Minions use Endur. Charges?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "minionsOverridePowerCharges",
    "label": "# of Power Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "minionsOverrideFrenzyCharges",
    "label": "# of Frenzy Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "minionsOverrideEnduranceCharges",
    "label": "# of Endurance Charges (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierRampage",
    "label": "# of Rampage Kills",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierSoulEater",
    "label": "# of Soul Eater Stacks",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierMinionSoulEater",
    "label": "# of Minion Soul Eater Stacks",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionFocused",
    "label": "Are you Focused?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffLifetap",
    "label": "Do you have Lifetap?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffOnslaught",
    "label": "Do you have Onslaught?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffArcaneSurge",
    "label": "Do you have Arcane Surge?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionBuffOnslaught",
    "label": "Do your minions have Onslaught?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffUnholyMight",
    "label": "Do you have Unholy Might?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionbuffUnholyMight",
    "label": "Do your minions have Unholy Might?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffChaoticMight",
    "label": "Do you have Chaotic Might?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffSacrificialZeal",
    "label": "Do you have Sacrificial Zeal?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionbuffChaoticMight",
    "label": "Do your minions have Chaotic Might?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffPhasing",
    "label": "Do you have Phasing?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffFortification",
    "label": "Are you Fortified?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideFortification",
    "label": "# of Fortification Stacks (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffTailwind",
    "label": "Do you have Tailwind?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffAdrenaline",
    "label": "Do you have Adrenaline?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionChangedStanceLastSecond",
    "label": "Changed Stance in the last 1s?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffAlchemistsGenius",
    "label": "Do you have Alchemist's Genius?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffVaalArcLuckyHits",
    "label": "Do you have Vaal Arc's Lucky Buff?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffElusive",
    "label": "Are you Elusive?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideBuffElusive",
    "label": "Effect of Elusive (if not average)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffDivinity",
    "label": "Do you have Divinity?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierDefiance",
    "label": "Defiance",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierRage",
    "label": "Rage",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffWildSavagery",
    "label": "Do you have Wild Savagery?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLeeching",
    "label": "Are you Leeching?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLeechingLife",
    "label": "Are you Leeching Life?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLeechingEnergyShield",
    "label": "Are you Leeching Energy Shield?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLeechingMana",
    "label": "Are you Leeching Mana?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionsConditionLeechingEnergyShield",
    "label": "Minion is Leeching Energy Shield?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsingFlask",
    "label": "Do you have a Flask active?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedAmethystFlaskRecently",
    "label": "Used an Amethyst Flask recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedSapphireFlaskRecently",
    "label": "Used a Sapphire Flask recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedTopazFlaskRecently",
    "label": "Used a Topaz Flask recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsingTincture",
    "label": "Do you have a Tincture active?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierManaBurnStacks",
    "label": "Mana Burn Stacks",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHaveTotem",
    "label": "Do you have a Totem summoned?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSummonedTotemRecently",
    "label": "Have you Summoned a Totem Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "TotemsSummoned",
    "label": "# of Summoned Totems (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSummonedGolemInPast8Sec",
    "label": "Summoned Golem in past 8 Seconds?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSummonedGolemInPast10Sec",
    "label": "Summoned Golem in past 10 Seconds?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierNearbyAlly",
    "label": "# of Nearby Allies",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierNearbyCorpse",
    "label": "# of Nearby Corpses",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierSummonedMinion",
    "label": "# of Summoned Minions",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierNonVaalSummonedMinion",
    "label": "# of non-vaal skill Summoned Minions",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionOnConsecratedGround",
    "label": "Are you on Consecrated Ground?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionOnProfaneGround",
    "label": "Are you on Profane Ground?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "minionConditionOnProfaneGround",
    "label": "Minion on Profane Ground?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionOnCausticGround",
    "label": "Are you on Caustic Ground?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionOnFungalGround",
    "label": "Are you on Fungal Ground?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionOnBurningGround",
    "label": "Are you on Burning Ground?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionOnChilledGround",
    "label": "Are you on Chilled Ground?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionOnShockedGround",
    "label": "Are you on Shocked Ground?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBlinded",
    "label": "Are you Blinded?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBurning",
    "label": "Are you Burning?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionIgnited",
    "label": "Are you Ignited?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionScorched",
    "label": "Are you Scorched?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionChilled",
    "label": "Are you Chilled?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "conditionChilledEffect",
    "label": "Effect of Chill",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionFrozen",
    "label": "Are you Frozen?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBrittle",
    "label": "Are you Brittle?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionShocked",
    "label": "Are you Shocked?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "conditionPlayerShockEffect",
    "label": "Effect of Shock",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSapped",
    "label": "Are you Sapped?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBleeding",
    "label": "Are you Bleeding?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionPoisoned",
    "label": "Are you Poisoned?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionCanBeCurseImmune",
    "label": "Are you Immune to Curses?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierPoisonOnSelf",
    "label": "# of Poison on You",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierWitheredStackCountSelf",
    "label": "# of Withered Stacks on you",
    "section": "When In Combat",
    "type": "countAllowZero"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierNearbyEnemies",
    "label": "# of nearby Enemies",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierNearbyRareOrUniqueEnemies",
    "label": "# of nearby Rare or Unique Enemies",
    "section": "When In Combat",
    "type": "countAllowZero"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHitRecently",
    "label": "Have you Hit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHitSpellRecently",
    "label": "Have you Hit with a Spell Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionCritRecently",
    "label": "Have you Crit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSkillCritRecently",
    "label": "Have your Skills Crit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionCritWithHeraldSkillRecently",
    "label": "Have your Herald Skills Crit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierCritRecently",
    "label": "# of times your Attacks have Crit Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "LostNonVaalBuffRecently",
    "label": "Lost a Non-Vaal Guard Skill buff recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionNonCritRecently",
    "label": "Have you dealt a Non-Crit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionChannelling",
    "label": "Are you Channelling?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierChannelling",
    "label": "Channeling for # seconds",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHitRecentlyWithWeapon",
    "label": "Have you Hit Recently with Your Weapon?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionKilledRecently",
    "label": "Have you Killed Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierKilledRecently",
    "label": "# of Enemies Killed Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionKilledLast3Seconds",
    "label": "Have you Killed in the last 3 Seconds?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionKilledPoisonedLast2Seconds",
    "label": "Killed a poisoned enemy in the last 2 Seconds?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionKilledTauntedEnemyRecently",
    "label": "Killed a taunted enemy recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionTotemsNotSummonedInPastTwoSeconds",
    "label": "No summoned Totems in the past 2 seconds?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionTotemsKilledRecently",
    "label": "Have your Totems Killed Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionTotemsHitRecently",
    "label": "Have your Totems Hit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionTotemsHitSpellRecently",
    "label": "Have your Totems Hit with a Spell Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedBrandRecently",
    "label": "Have you used a Brand Skill recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierTotemsKilledRecently",
    "label": "# of Enemies Killed by Totems Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionMinionsKilledRecently",
    "label": "Have your Minions Killed Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionMinionsDiedRecently",
    "label": "Has a Minion Died Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierMinionsKilledRecently",
    "label": "# of Enemies Killed by Minions Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionKilledAffectedByDoT",
    "label": "Killed enemy affected by your DoT Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierShockedEnemyKilledRecently",
    "label": "# of Shocked Enemies Killed Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierShockedNonShockedEnemyRecently",
    "label": "# of Non-Shocked Enemies Shocked Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionFrozenEnemyRecently",
    "label": "Have you Frozen an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionChilledEnemyRecently",
    "label": "Have you Chilled an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionShatteredEnemyRecently",
    "label": "Have you Shattered an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionIgnitedEnemyRecently",
    "label": "Have you Ignited an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierIgniteAppliedRecently",
    "label": "# of Ignites applied Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionShockedEnemyRecently",
    "label": "Have you Shocked an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionStunnedEnemyRecently",
    "label": "Have you Stunned an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionStunnedRecently",
    "label": "Have you been Stunned Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionPoisonedEnemyRecently",
    "label": "Have you Poisoned an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierPoisonAppliedRecently",
    "label": "# of Poisons applied Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierLifeSpentRecently",
    "label": "# of Life spent Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierManaSpentRecently",
    "label": "# of Mana spent Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionWardBrokenPast2Seconds",
    "label": "Has your Ward broken in the past 2s?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBeenHitRecently",
    "label": "Have you been Hit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierBeenHitRecently",
    "label": "# of times you have been Hit Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBeenHitByAttackRecently",
    "label": "Have you been Hit by an Attack Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBeenCritRecently",
    "label": "Have you been Crit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionConsumed12SteelShardsRecently",
    "label": "Consumed 12 Steel Shards Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionGainedPowerChargeRecently",
    "label": "Gained a Power Charge Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionGainedFrenzyChargeRecently",
    "label": "Gained a Frenzy Charge Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBeenSavageHitRecently",
    "label": "Have you taken a Savage Hit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHitByFireDamageRecently",
    "label": "Have you been hit by Fire Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHitByColdDamageRecently",
    "label": "Have you been hit by Cold Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHitByLightningDamageRecently",
    "label": "Have you been hit by Light. Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHitBySpellDamageRecently",
    "label": "Have you taken Spell Damage Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionTakenFireDamageFromEnemyHitRecently",
    "label": "Taken Fire Damage from enemy Hit Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBlockedRecently",
    "label": "Have you Blocked Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBlockedAttackRecently",
    "label": "Have you Blocked an Attack Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBlockedSpellRecently",
    "label": "Have you Blocked a Spell Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnergyShieldRechargeRecently",
    "label": "Energy Shield Recharge started Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnergyShieldRechargePastTwoSec",
    "label": "ES Recharge started past 2 seconds?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionStoppedTakingDamageOverTimeRecently",
    "label": "Have you stopped taking DoT recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionConvergence",
    "label": "Do you have Convergence?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "None",
        "value": 0
      },
      {
        "label": "Area of Effect",
        "value": "AREA"
      },
      {
        "label": "Elemental Damage",
        "value": "DAMAGE"
      }
    ],
    "column": 1,
    "defaultValue": 0,
    "key": "buffPendulum",
    "label": "Is Pendulum of Destruction active?",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "None",
        "value": 0
      },
      {
        "label": "Chilling",
        "value": "CHILLING"
      },
      {
        "label": "Shocking",
        "value": "SHOCKING"
      },
      {
        "label": "Igniting",
        "value": "IGNITING"
      },
      {
        "label": "Chill + Shock + Ignite",
        "value": "ALL"
      }
    ],
    "column": 1,
    "defaultValue": 0,
    "key": "buffConflux",
    "label": "Conflux Buff",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "Default",
        "value": "NONE"
      },
      {
        "label": "Physical",
        "value": "Physical"
      },
      {
        "label": "Lightning",
        "value": "Lightning"
      },
      {
        "label": "Cold",
        "value": "Cold"
      },
      {
        "label": "Fire",
        "value": "Fire"
      },
      {
        "label": "Chaos",
        "value": "Chaos"
      }
    ],
    "column": 1,
    "defaultValue": "NONE",
    "key": "highestDamageType",
    "label": "Highest damage type Override",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "None",
        "value": 0
      },
      {
        "label": "Average",
        "value": "AVERAGE"
      },
      {
        "label": "Hit",
        "value": "HIT"
      },
      {
        "label": "Damage over Time",
        "value": "DOT"
      }
    ],
    "column": 1,
    "defaultValue": 0,
    "key": "buffHeartstopper",
    "label": "Heartstopper Mode",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffBastionOfHope",
    "label": "Is Bastion of Hope active?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffNgamahuFlamesAdvance",
    "label": "Is Magmatic Strikes active?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffHerEmbrace",
    "label": "Are you in Her Embrace?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": true,
    "key": "conditionChampionIntimidate",
    "label": "Is Champion's Intimidate active?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedSkillRecently",
    "label": "Have you used a Skill Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierSkillUsedRecently",
    "label": "# of Skills Used Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionAttackedRecently",
    "label": "Have you Attacked Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionCastSpellRecently",
    "label": "Have you Cast a Spell Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierNonInstantSpellCastRecently",
    "label": "# of Non-Instant Spells Cast Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierAppliedAilmentsRecently",
    "label": "# of Recently Applied Ailments",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLinkedRecently",
    "label": "Have you Linked recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionStunnedWhileCastingRecently",
    "label": "Stunned while Casting Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionCastLast1Seconds",
    "label": "Have you Cast a Spell in the last second?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierCastLast8Seconds",
    "label": "How many spells cast in the last 8 seconds?",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSuppressedRecently",
    "label": "Have you Suppressed Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierHitsSuppressedRecently",
    "label": "# of Hits Suppressed Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedFireSkillRecently",
    "label": "Have you used a Fire Skill Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedColdSkillRecently",
    "label": "Have you used a Cold Skill Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedMinionSkillRecently",
    "label": "Have you used a Minion Skill Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedTravelSkillRecently",
    "label": "Have you used a Travel Skill Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedDashRecently",
    "label": "Have you cast Dash Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedMovementSkillRecently",
    "label": "Have you used a Movement Skill Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedVaalSkillRecently",
    "label": "Have you used a Vaal Skill Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierUsedVaalSkillInPast8Seconds",
    "label": "# of Vaal Skills used in the past 8 Seconds",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSoulGainPrevention",
    "label": "Do you have Soul Gain Prevention?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": true,
    "key": "conditionSacrificeMinion",
    "label": "Sacrifice Minion on Attack",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedWarcryRecently",
    "label": "Have you used a Warcry Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionUsedWarcryInPast8Seconds",
    "label": "Used a Warcry in the past 8 seconds?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierAffectedByWarcryBuffDuration",
    "label": "# of seconds Affected by a Warcry Buff",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "DetonatedMinesRecently",
    "label": "Have you Detonated a Mine Recently",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierMineDetonatedRecently",
    "label": "# of Mines Detonated Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "minesPerThrow",
    "label": "# of Mines per throw",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "TriggeredTrapsRecently",
    "label": "Have you Triggered a Trap Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierTrapTriggeredRecently",
    "label": "# of Traps Triggered Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionThrownTrapOrMineRecently",
    "label": "Have you thrown a Trap or Mine Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "trapsPerThrow",
    "label": "# of Traps per throw",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionCursedEnemyRecently",
    "label": "Have you Cursed an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionCastMarkRecently",
    "label": "Have you cast a Mark Spell Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSpawnedCorpseRecently",
    "label": "Spawned a corpse Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionConsumedCorpseRecently",
    "label": "Consumed a corpse Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionConsumedCorpseInPast2Sec",
    "label": "Consumed a corpse in the past 2s?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierCorpseConsumedRecently",
    "label": "# of Corpses Consumed Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionRavenousCorpseConsumed",
    "label": "Has Ravenous consumed a corpse?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierWarcryUsedRecently",
    "label": "# of Warcries Used Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionTauntedEnemyRecently",
    "label": "Taunted an enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionLostEnduranceChargeInPast8Sec",
    "label": "Lost an Endurance Charge in the past 8s?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierEnduranceChargesLostRecently",
    "label": "# of Endurance Charges lost Recently",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBlockedHitFromUniqueEnemyInPast10Sec",
    "label": "Blocked a Hit from a Unique enemy in the past 10s?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionKilledUniqueEnemy",
    "label": "Killed a Rare or Unique enemy Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "BlockedPast10Sec",
    "label": "Number of times you've Blocked in the past 10s",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionImpaledRecently",
    "label": "Impaled an enemy recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierImpalesOnEnemy",
    "label": "# of Impales on enemy (if not maximum)",
    "section": "When In Combat",
    "type": "countAllowZero"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionCausedBleedingRecently",
    "label": "Have you caused Bleeding Recently?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierBleedsOnEnemy",
    "label": "# of Bleeds on enemy (if not maximum)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierFragileRegrowth",
    "label": "# of Fragile Regrowth Stacks",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHaveArborix",
    "label": "Do you have Iron Reflexes?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "Elemental Overload",
        "value": "EleOverload"
      },
      {
        "label": "Resolute Technique",
        "value": "ResTechnique"
      }
    ],
    "column": 1,
    "defaultValue": "EleOverload",
    "key": "conditionHaveAugyre",
    "label": "Augyre rotating buff",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHaveVulconus",
    "label": "Do you have Avatar Of Fire?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHaveManaStorm",
    "label": "Do you have Manastorm's Buff?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "-40%",
        "value": -40
      },
      {
        "label": "-20%",
        "value": -20
      },
      {
        "label": "0%",
        "value": 0
      },
      {
        "label": "20%",
        "value": 20
      },
      {
        "label": "30%",
        "value": 30
      },
      {
        "label": "40%",
        "value": 40
      },
      {
        "label": "60%",
        "value": 60
      },
      {
        "label": "80%",
        "value": 80
      },
      {
        "label": "100%",
        "value": 100
      }
    ],
    "column": 1,
    "defaultValue": 30,
    "key": "GamblesprintMovementSpeed",
    "label": "Gamblesprint Movement Speed",
    "section": "When In Combat",
    "type": "list"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "EverlastingSacrifice",
    "label": "Do you have Everlasting Sacrifice?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffFanaticism",
    "label": "Do you have Fanaticism?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionHitsAlwaysStun",
    "label": "Do your hits always stun?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierPvpTvalueOverride",
    "label": "PvP Tvalue override (ms)",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierPvpDamage",
    "label": "Custom PvP Damage multiplier percent",
    "section": "When In Combat",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffAccelerationShrine",
    "label": "Have Acceleration Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffBrutalShrine",
    "label": "Have Brutal Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffDiamondShrine",
    "label": "Have Diamond Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffDivineShrine",
    "label": "Have Divine Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffEchoingShrine",
    "label": "Have Echoing Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffGloomShrine",
    "label": "Have Gloom Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffGreaterFreezingShrine",
    "label": "Have Greater Freezing Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffGreaterShockingShrine",
    "label": "Have Greater Shocking Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffGreaterSkeletalShrine",
    "label": "Have Greater Skeletal Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffImpenetrableShrine",
    "label": "Have Impenetrable Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffMassiveShrine",
    "label": "Have Massive Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffReplenishingShrine",
    "label": "Have Replenishing Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffResistanceShrine",
    "label": "Have Resistance Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffResonatingShrine",
    "label": "Have Resonating Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffLesserAccelerationShrine",
    "label": "Have Lesser Acceleration Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffLesserBrutalShrine",
    "label": "Have Lesser Brutal Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffLesserImpenetrableShrine",
    "label": "Have Lesser Impenetrable Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffLesserMassiveShrine",
    "label": "Have Lesser Massive Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffLesserReplenishingShrine",
    "label": "Have Lesser Replenishing Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "buffLesserResistanceShrine",
    "label": "Have Lesser Resistance Shrine?",
    "section": "When In Combat",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "skillForkCount",
    "label": "# of times Skill has Forked",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "skillChainCount",
    "label": "# of times Skill has Chained",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "skillPierceCount",
    "label": "# of times Skill has Pierced",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "meleeDistance",
    "label": "Melee distance to enemy",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "projectileDistance",
    "label": "Projectile travel distance",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionAtCloseRange",
    "label": "Is the enemy at Close Range?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "enemyMultiplierEnemyPresenceSeconds",
    "label": "Enemy in Your Presence Duration",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyMoving",
    "label": "Is the enemy Moving?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyFullLife",
    "label": "Is the enemy on Full Life?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyLowLife",
    "label": "Is the enemy on Low Life?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyCursed",
    "label": "Is the enemy Cursed?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyStunned",
    "label": "Is the enemy Stunned?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyBleeding",
    "label": "Is the enemy Bleeding?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideBleedStackPotential",
    "label": "Bleed Stack Potential override",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionSingleBleed",
    "label": "Cap to Single Bleed on enemy?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierRuptureStacks",
    "label": "# of Rupture stacks?",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyPoisoned",
    "label": "Is the enemy Poisoned?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierPoisonOnEnemy",
    "label": "# of Poison on enemy",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionNonPoisonedOnly",
    "label": "Is the enemy non-Poisoned?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierCurseExpiredOnEnemy",
    "label": "#% of Curse Expired on enemy",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierCurseDurationExpiredOnEnemy",
    "label": "Curse Duration Expired on enemy",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierWitheredStackCount",
    "label": "# of Withered Stacks",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierCorrosionStackCount",
    "label": "# of Corrosion Stacks",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierEnsnaredStackCount",
    "label": "# of Ensnare Stacks",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyMaimed",
    "label": "Is the enemy Maimed?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyHindered",
    "label": "Is the enemy Hindered?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyExcommunicated",
    "label": "Is the enemy Excommunicated?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyBlinded",
    "label": "Is the enemy Blinded?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideBuffBlinded",
    "label": "Effect of Blind (if not maximum)",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyTaunted",
    "label": "Is the enemy Taunted?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyDebilitated",
    "label": "Is the enemy Debilitated?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyPacified",
    "label": "Is the enemy Pacified?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyBurning",
    "label": "Is the enemy Burning?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyIgnited",
    "label": "Is the enemy Ignited?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "overrideIgniteStackPotential",
    "label": "Ignite Stack Potential override",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyScorched",
    "label": "Is the enemy Scorched?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "conditionScorchedEffect",
    "label": "Effect of Scorched",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "ScorchStacks",
    "label": "Scorch Stacks",
    "section": "For Effective DPS",
    "type": "integer"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyOnScorchedGround",
    "label": "Is the enemy on Scorched Ground?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyChilled",
    "label": "Is the enemy Chilled?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierChilledByYouSeconds",
    "label": "Seconds of chill on enemy?",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "conditionEnemyChilledEffect",
    "label": "Effect of Chill",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyChilledByYourHits",
    "label": "Is the enemy Chilled by your Hits?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "HoarfrostStacks",
    "label": "Hoarfrost Stacks",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyFrozen",
    "label": "Is the enemy Frozen?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierFrozenByYouSeconds",
    "label": "Seconds of freeze on enemy?",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyBrittle",
    "label": "Is the enemy Brittle?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "conditionBrittleEffect",
    "label": "Effect of Brittle",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyOnBrittleGround",
    "label": "Is the enemy on Brittle Ground?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyShocked",
    "label": "Is the enemy Shocked?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "conditionShockEffect",
    "label": "Effect of Shock",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "ShockStacks",
    "label": "Shock Stacks",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyOnShockedGround",
    "label": "Is the enemy on Shocked Ground?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemySapped",
    "label": "Is the enemy Sapped?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "conditionSapEffect",
    "label": "Effect of Sap",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyOnSappedGround",
    "label": "Is the enemy on Sapped Ground?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierFreezeShockIgniteOnEnemy",
    "label": "# of Freeze / Shock / Ignite on enemy",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyFireExposure",
    "label": "Is the enemy Exposed to Fire?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyColdExposure",
    "label": "Is the enemy Exposed to Cold?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyLightningExposure",
    "label": "Is the enemy Exposed to Lightning?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyIntimidated",
    "label": "Is the enemy Intimidated?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyCrushed",
    "label": "Is the enemy Crushed?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyHallowingFlame",
    "label": "Is enemy affected by Hallowing Flame?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierEnemyHallowingFlame",
    "label": "Hallowing Flame Stacks",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierHallowingFlameStacksRemovedByAlly",
    "label": "Hallowing Flames removed by an ally recently",
    "section": "For Effective DPS",
    "type": "countAllowZero"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionNearLinkedTarget",
    "label": "Is the enemy near you Linked target?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyUnnerved",
    "label": "Is the enemy Unnerved?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyCoveredInAsh",
    "label": "Is the enemy covered in Ash?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyCoveredInFrost",
    "label": "Is the enemy covered in Frost?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyOnConsecratedGround",
    "label": "Is the enemy on Consecrated Ground?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyHaveEnergyShield",
    "label": "Does the enemy have Energy Shield?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyOnProfaneGround",
    "label": "Is the enemy on Profane Ground?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 0,
    "key": "multiplierEnemyAffectedByGraspingVines",
    "label": "# of Grasping Vines affecting enemy",
    "section": "For Effective DPS",
    "type": "count"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyOnFungalGround",
    "label": "Is the enemy on Fungal Ground?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyInChillingArea",
    "label": "Is the enemy in a Chilling area?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyInFrostGlobe",
    "label": "Is the enemy in the Frost Shield area?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyLifeHigherThanPlayer",
    "label": "Is the enemy Life% higher than yours?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "enemyConditionHitByFireDamage",
    "label": "Enemy was Hit by Fire Damage?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "enemyConditionHitByColdDamage",
    "label": "Enemy was Hit by Cold Damage?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "enemyConditionHitByLightningDamage",
    "label": "Enemy was Hit by Light. Damage?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "enemyInRFOrScorchingRay",
    "label": "Is the enemy in RF or Scorching Ray",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "EEIgnoreHitDamage",
    "label": "Ignore Skill Hit Damage?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionBetweenYouAndLinkedTarget",
    "label": "Is the enemy in your Link beams?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyFireResZero",
    "label": "Enemy hit you with Fire Damage?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyColdResZero",
    "label": "Enemy hit you with Cold Damage?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": false,
    "key": "conditionEnemyLightningResZero",
    "label": "Enemy hit you with Light. Damage?",
    "section": "For Effective DPS",
    "type": "check"
  },
  {
    "column": 1,
    "defaultValue": 15,
    "key": "maniaDebuffsCount",
    "label": "# of Mania Stacks",
    "section": "For Effective DPS",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyLevel",
    "label": "Enemy Level",
    "section": "Enemy Stats",
    "type": "count"
  },
  {
    "column": 3,
    "defaultValue": false,
    "key": "conditionEnemyRareOrUnique",
    "label": "Is the enemy Rare or Unique?",
    "section": "Enemy Stats",
    "type": "check"
  },
  {
    "choices": [
      {
        "label": "No",
        "value": "None"
      },
      {
        "label": "Standard Boss",
        "value": "Boss"
      },
      {
        "label": "Guardian/Pinnacle Boss",
        "value": "Pinnacle"
      },
      {
        "label": "Uber Pinnacle Boss",
        "value": "Uber"
      }
    ],
    "column": 3,
    "defaultValue": "Pinnacle",
    "key": "enemyIsBoss",
    "label": "Is the enemy a Boss?",
    "section": "Enemy Stats",
    "type": "list"
  },
  {
    "choices": [
      {
        "label": "None",
        "value": 0
      },
      {
        "label": "20% Delirious",
        "value": "20Percent"
      },
      {
        "label": "40% Delirious",
        "value": "40Percent"
      },
      {
        "label": "60% Delirious",
        "value": "60Percent"
      },
      {
        "label": "80% Delirious",
        "value": "80Percent"
      },
      {
        "label": "100% Delirious",
        "value": "100Percent"
      }
    ],
    "column": 3,
    "defaultValue": 0,
    "key": "deliriousPercentage",
    "label": "Delirious Effect",
    "section": "Enemy Stats",
    "type": "list"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyPhysicalReduction",
    "label": "Enemy Phys. Damage Reduction",
    "section": "Enemy Stats",
    "type": "integer"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyLightningResist",
    "label": "Enemy Lightning Resistance",
    "section": "Enemy Stats",
    "type": "integer"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyColdResist",
    "label": "Enemy Cold Resistance",
    "section": "Enemy Stats",
    "type": "integer"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyFireResist",
    "label": "Enemy Fire Resistance",
    "section": "Enemy Stats",
    "type": "integer"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyChaosResist",
    "label": "Enemy Chaos Resistance",
    "section": "Enemy Stats",
    "type": "integer"
  },
  {
    "column": 3,
    "defaultValue": false,
    "key": "enemyMaxResist",
    "label": "Enemy Max Resistance is always 75%",
    "section": "Enemy Stats",
    "type": "check"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyBlockChance",
    "label": "Enemy Block Chance",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyEvasion",
    "label": "Enemy Base Evasion",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyArmour",
    "label": "Enemy Base Armour",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "key": "presetBossSkills",
    "label": "Boss Skill Preset",
    "section": "Enemy Stats",
    "type": "list"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyDamageRollRange",
    "label": "Enemy Skill Roll Range %",
    "section": "Enemy Stats",
    "type": "integer"
  },
  {
    "choices": [
      {
        "label": "Average",
        "value": "Average"
      },
      {
        "label": "Untyped",
        "value": "Untyped"
      },
      {
        "label": "Damage Over Time",
        "value": "DamageOverTime"
      },
      {
        "label": "Melee",
        "value": "Melee"
      },
      {
        "label": "Projectile",
        "value": "Projectile"
      },
      {
        "label": "Spell",
        "value": "Spell"
      },
      {
        "label": "Projectile Spell",
        "value": "SpellProjectile"
      }
    ],
    "column": 3,
    "defaultValue": "Average",
    "key": "enemyDamageType",
    "label": "Enemy Damage Type",
    "section": "Enemy Stats",
    "type": "list"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemySpeed",
    "label": "Enemy attack / cast time in ms",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyMultiplierPvpDamage",
    "label": "Custom PvP Damage multiplier percent",
    "section": "Enemy Stats",
    "type": "count"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyCritChance",
    "label": "Enemy critical strike chance",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyCritDamage",
    "label": "Enemy critical strike multiplier",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyPhysicalDamage",
    "label": "Enemy Skill Physical Damage",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyPhysicalOverwhelm",
    "label": "Enemy Skill Physical Overwhelm",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyLightningDamage",
    "label": "Enemy Skill Lightning Damage",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyLightningPen",
    "label": "Enemy Skill Lightning Pen",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyColdDamage",
    "label": "Enemy Skill Cold Damage",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyColdPen",
    "label": "Enemy Skill Cold Pen",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyFireDamage",
    "label": "Enemy Skill Fire Damage",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyFirePen",
    "label": "Enemy Skill Fire Pen",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 3,
    "defaultValue": 0,
    "key": "enemyChaosDamage",
    "label": "Enemy Skill Chaos Damage",
    "section": "Enemy Stats",
    "type": "countAllowZero"
  },
  {
    "column": 1,
    "key": "customMods",
    "label": "Custom Modifiers",
    "section": "Custom Modifiers",
    "type": "text"
  }
];
