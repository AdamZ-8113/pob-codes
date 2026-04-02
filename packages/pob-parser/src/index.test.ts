import { describe, expect, it } from "vitest";

import { parseBuildXmlToPayload } from "./index";

describe("pob-parser", () => {
  it("parses a minimal poe1 xml payload", () => {
    const xml = `<PathOfBuilding>
      <Build level="95" className="Ranger" ascendClassName="Deadeye" mainSocketGroup="1">
        <PlayerStat stat="AverageDamage" value="12345.6" />
        <PlayerStat stat="Life" value="4500" />
        <PlayerStat stat="FireResist" value="75" />
      </Build>
      <Items activeItemSet="1">
        <Item id="1">Rarity: UNIQUE\nBisco's Collar\nGold Amulet\nItem Level: 84\n{crafted}+# to maximum Life</Item>
        <ItemSet id="1" title="Default">
          <Slot name="Amulet" itemId="1" active="true" />
        </ItemSet>
      </Items>
      <Skills activeSkillSet="1">
        <SkillSet id="1" title="Default">
          <Skill enabled="true" mainActiveSkill="1" slot="Body Armour">
            <Gem nameSpec="Tornado Shot" level="20" quality="20" gemId="Metadata/Items/Gems/SkillGemTornadoShot" enabled="true" corrupted="true" />
            <Gem nameSpec="Awakened Elemental Damage with Attacks Support" level="5" quality="20" gemId="Metadata/Items/Gems/SupportGemElementalDamageWithAttacksPlus" enabled="true" />
          </Skill>
        </SkillSet>
      </Skills>
      <Tree activeSpec="1">
        <Spec classId="2" ascendClassId="1" treeVersion="3_27" nodes="123,456" masteryEffects="{100,200}">
          <URL>https://www.pathofexile.com/passive-skill-tree/AAA</URL>
          <Sockets>
            <Socket nodeId="123" itemId="1" />
          </Sockets>
          <Overrides>
            <Override nodeId="123" dn="Tattoo">+10 to Strength</Override>
          </Overrides>
        </Spec>
      </Tree>
      <Notes>Example Notes</Notes>
      <Config activeConfigSet="2">
        <ConfigSet id="1" title="Mapping">
          <Input name="enemyIsBoss" boolean="false" />
        </ConfigSet>
        <ConfigSet id="2" title="Bossing">
          <Input name="enemyIsBoss" boolean="true" />
          <Input name="enemyShocked" boolean="true" />
          <Placeholder name="projectileDistance" number="40" />
        </ConfigSet>
        <Placeholder name="enemyLightningResist" number="50" />
      </Config>
    </PathOfBuilding>`;

    const payload = parseBuildXmlToPayload(xml);
    expect(payload.gameVersion).toBe("poe1");
    expect(payload.build.className).toBe("Ranger");
    expect(payload.itemSets[0]?.slots[0]?.name).toBe("Amulet");
    expect(payload.items[0]?.crafted[0]).toContain("maximum Life");
    expect(payload.skillSets[0]?.groups[0]?.gems[1]?.support).toBe(true);
    expect(payload.skillSets[0]?.groups[0]?.gems[0]?.corrupted).toBe(true);
    expect(payload.skillSets[0]?.groups[0]?.gems[1]?.corrupted).toBe(false);
    expect(payload.treeSpecs[0]?.nodes).toEqual([123, 456]);
    expect(payload.treeSpecs[0]?.active).toBe(true);
    expect(payload.stats.playerRows).toEqual([
      { stat: "AverageDamage", value: "12345.6" },
      { stat: "Life", value: "4500" },
      { stat: "FireResist", value: "75" },
    ]);
    expect(payload.stats.player.FireResist).toBe("75");
    expect(payload.notes).toContain("Example Notes");
    expect(payload.configSets).toEqual([
      {
        active: false,
        id: 1,
        inputs: {
          enemyIsBoss: false,
        },
        placeholders: {},
        title: "Mapping",
      },
      {
        active: true,
        id: 2,
        inputs: {
          enemyIsBoss: true,
          enemyShocked: true,
        },
        placeholders: {
          projectileDistance: 40,
          enemyLightningResist: 50,
        },
        title: "Bossing",
      },
    ]);
    expect(payload.activeConfigSetId).toBe(2);
    expect(payload.config.enemyIsBoss).toBe(true);
    expect(payload.config.enemyShocked).toBe(true);
    expect(payload.config.projectileDistance).toBeUndefined();
    expect(payload.config.enemyLightningResist).toBeUndefined();
    expect(payload.configPlaceholders?.projectileDistance).toBe(40);
    expect(payload.configPlaceholders?.enemyLightningResist).toBe(50);
  });

  it("rejects non-poe1 roots", () => {
    const xml = `<?xml version="1.0"?><UnsupportedBuild><Build level="12" className="Mercenary" mainSocketGroup="1" /></UnsupportedBuild>`;
    expect(() => parseBuildXmlToPayload(xml)).toThrowError("Only Path of Exile 1 Path of Building exports are supported");
  });
});
