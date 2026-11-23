import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";

vi.mock("react-native-reanimated", () => {
  type Transition = {
    readonly label: string;
    readonly duration: (ms: number) => Transition;
    readonly reduceMotion: (mode: string) => Transition;
  };
  const make = (durationMs: number, motion: string): Transition => ({
    label: `${durationMs}:${motion}`,
    duration: (ms) => make(ms, motion),
    reduceMotion: (mode) => make(durationMs, mode),
  });
  return {
    LinearTransition: make(0, "system"),
    ReduceMotion: { System: "system", Always: "always", Never: "never" },
  };
});

import { useThreadListShelfLayoutAnimation } from "./threadListAnimations";

const ANIMATED = "180:system";
const SKIPPED = "180:always";

// The module above stands in for Reanimated's transition builders, so identity is a label.
const labelOf = (transition: unknown) => (transition as { readonly label: string }).label;

it("skips the row layout animation for the commit that changes a shelf, then restores it", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  using _globals = { [Symbol.dispose]: () => vi.unstubAllGlobals() };
  const seen: string[] = [];
  function Probe(props: { readonly shelfExpansionKey: string }) {
    seen.push(labelOf(useThreadListShelfLayoutAnimation(props.shelfExpansionKey)));
    return null;
  }

  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Probe shelfExpansionKey="false:false:false" />));
  expect(seen.at(-1)).toBe(ANIMATED);

  // The expand commit itself never animates; the effect releases the animation after it paints.
  await act(async () => root.render(<Probe shelfExpansionKey="false:false:true" />));
  expect(seen.slice(1)).toEqual([SKIPPED, ANIMATED]);
  act(() => root.unmount());
});
