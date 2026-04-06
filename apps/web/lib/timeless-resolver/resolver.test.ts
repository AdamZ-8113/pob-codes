import { describe, expect, it } from "vitest";

import { loadTimelessDataSet } from "./data";
import { resolveTimelessBuild } from "./resolver";

describe("resolveTimelessBuild", () => {
  it("resolves known Elegant Hubris notable effects from the upstream data set", async () => {
    const data = await loadTimelessDataSet();
    const eagleEyeGraphId = data.passiveSkillsByIndex.get(88)?.PassiveSkillGraphID;
    const instabilityGraphId = data.passiveSkillsByIndex.get(411)?.PassiveSkillGraphID;

    expect(eagleEyeGraphId).toBeTypeOf("number");
    expect(instabilityGraphId).toBeTypeOf("number");

    const result = await resolveTimelessBuild({
      jewels: [
        {
          conqueror: "Cadiro",
          itemId: 1,
          jewelType: "Elegant Hubris",
          nodeIds: [eagleEyeGraphId!, instabilityGraphId!],
          seed: 2000,
          socketNodeId: 99,
        },
      ],
    });

    const nodeEffectsById = new Map(result.jewels[0]?.nodeEffects.map((nodeEffect) => [nodeEffect.nodeId, nodeEffect]));
    expect(nodeEffectsById.get(eagleEyeGraphId!)?.lines).toContain("80% increased Physical Damage");
    expect(nodeEffectsById.get(instabilityGraphId!)?.lines).toContain("30% increased Effect of Shock");
  });
});
