import type { BuildPayload } from "@pobcodes/shared-types";

import type { BuildViewerSelection } from "./build-viewer-selection";

import * as stableCompare from "./build-compare-stable";
import * as v2Compare from "./build-compare-v2";

export type {
  BuildCompareFinding,
  BuildCompareReport,
  BuildCompareRow,
} from "./build-compare-stable";

export type BuildCompareEngine = "stable" | "v2";

export interface BuildCompareOptions {
  engine?: BuildCompareEngine;
}

export const DEFAULT_COMPARE_ENGINE: BuildCompareEngine = "v2";

const COMPARE_ENGINE_IMPL = {
  stable: stableCompare,
  v2: v2Compare,
} satisfies Record<BuildCompareEngine, typeof stableCompare>;

export async function compareBuildAgainstInput(
  currentPayload: BuildPayload,
  currentSelection: BuildViewerSelection,
  input: string,
  options?: BuildCompareOptions,
) {
  return resolveCompareEngine(options?.engine).compareBuildAgainstInput(currentPayload, currentSelection, input);
}

export function buildBuildComparisonReport(
  currentPayload: BuildPayload,
  currentSelection: BuildViewerSelection,
  targetPayload: BuildPayload,
  targetSelection: BuildViewerSelection,
  currentTree?: Parameters<typeof stableCompare.buildBuildComparisonReport>[4],
  targetTree?: Parameters<typeof stableCompare.buildBuildComparisonReport>[5],
  options?: BuildCompareOptions,
) {
  return resolveCompareEngine(options?.engine).buildBuildComparisonReport(
    currentPayload,
    currentSelection,
    targetPayload,
    targetSelection,
    currentTree,
    targetTree,
  );
}

function resolveCompareEngine(engine?: BuildCompareEngine) {
  return COMPARE_ENGINE_IMPL[engine ?? DEFAULT_COMPARE_ENGINE];
}
