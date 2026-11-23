import { useEffect, useState } from "react";
import { LinearTransition, ReduceMotion } from "react-native-reanimated";

export const THREAD_LIST_ROW_LAYOUT = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.System,
);

// LegendList builds its item containers from whether the prop is set, so a skipped commit passes
// a motionless transition instead of `undefined`.
const THREAD_LIST_ROW_LAYOUT_SKIPPED = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.Always,
);

export function threadListShelfExpansionKey(input: {
  readonly workingShelfExpanded: boolean;
  readonly snoozedShelfExpanded: boolean;
  readonly settledShelfExpanded: boolean;
}): string {
  return `${input.workingShelfExpanded}:${input.snoozedShelfExpanded}:${input.settledShelfExpanded}`;
}

/**
 * Expanding or collapsing a shelf inserts every revealed row in one commit, and animating those
 * inserts runs Reanimated's layout updates against the frames that mount the rows. The motionless
 * transition covers that commit and the positions it produces, then ordinary moves animate again.
 */
export function useThreadListShelfLayoutAnimation(
  shelfExpansionKey: string,
): typeof THREAD_LIST_ROW_LAYOUT {
  const [committedKey, setCommittedKey] = useState(shelfExpansionKey);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- releases the skipped transition only after the expand/collapse commit paints
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect, react/no-deriving-state-in-effects -- one commit behind on purpose: the skip has to survive that commit
    setCommittedKey(shelfExpansionKey);
  }, [shelfExpansionKey]);
  return committedKey === shelfExpansionKey
    ? THREAD_LIST_ROW_LAYOUT
    : THREAD_LIST_ROW_LAYOUT_SKIPPED;
}
