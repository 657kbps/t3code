import { useEffect, useState } from "react";
import { LinearTransition, ReduceMotion } from "react-native-reanimated";

export const THREAD_LIST_ROW_LAYOUT = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.System,
);

// LegendList selects ReanimatedPositionView based on whether itemLayoutAnimation is set, so keep
// it truthy with ReduceMotion.Always during shelf expand/collapse instead of passing undefined.
const THREAD_LIST_ROW_LAYOUT_SKIPPED = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.Always,
);

// Longer than the row transition: the shelf's newly mounted rows finish their native layout
// pass before the normal transition returns.
const SHELF_LAYOUT_RESTORE_MS = 250;

export function threadListShelfExpansionKey(input: {
  readonly workingShelfExpanded: boolean;
  readonly snoozedShelfExpanded: boolean;
  readonly settledShelfExpanded: boolean;
}): string {
  return `${input.workingShelfExpanded}:${input.snoozedShelfExpanded}:${input.settledShelfExpanded}`;
}

export function useThreadListShelfLayoutAnimation(
  shelfExpansionKey: string,
): typeof THREAD_LIST_ROW_LAYOUT {
  const [settledKey, setSettledKey] = useState(shelfExpansionKey);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- restores the normal transition after the shelf's native layout pass, then re-renders the list through extraData
  useEffect(() => {
    if (settledKey === shelfExpansionKey) return;
    const timer = setTimeout(() => {
      setSettledKey(shelfExpansionKey);
    }, SHELF_LAYOUT_RESTORE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [settledKey, shelfExpansionKey]);
  return settledKey === shelfExpansionKey ? THREAD_LIST_ROW_LAYOUT : THREAD_LIST_ROW_LAYOUT_SKIPPED;
}
