import type { TimelessJewelType } from "../timeless-jewel-descriptor";

export interface TimelessResolveRequest {
  builds: {
    current: TimelessResolveBuildInput;
    target: TimelessResolveBuildInput;
  };
}

export interface TimelessResolveBuildInput {
  jewels: TimelessResolveJewelInput[];
}

export interface TimelessResolveJewelInput {
  conqueror: string;
  itemId: number;
  jewelType: TimelessJewelType;
  nodeIds: number[];
  seed: number;
  socketNodeId: number;
}

export interface TimelessResolvedNodeEffect {
  isKeystone: boolean;
  isNotable: boolean;
  lines: string[];
  nodeId: number;
  originalName: string;
  replacedName?: string;
}

export interface TimelessResolvedJewel {
  conqueror: string;
  itemId: number;
  jewelType: TimelessJewelType;
  nodeEffects: TimelessResolvedNodeEffect[];
  seed: number;
  socketNodeId: number;
}

export interface TimelessResolvedBuild {
  jewels: TimelessResolvedJewel[];
}

export interface TimelessResolveResponse {
  builds: {
    current: TimelessResolvedBuild;
    target: TimelessResolvedBuild;
  };
}
