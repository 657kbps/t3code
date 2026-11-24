import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vite-plus/test";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native-reanimated", () => {
  const createTransition = (reduceMotion = "system") => ({
    reduceMotionMode: reduceMotion,
    duration: () => createTransition(reduceMotion),
    reduceMotion: (mode: string) => createTransition(mode),
  });
  return {
    LinearTransition: createTransition(),
    ReduceMotion: {
      System: "system",
      Always: "always",
    },
  };
});

import {
  THREAD_LIST_ROW_LAYOUT,
  threadListShelfExpansionKey,
  useThreadListShelfLayoutAnimation,
} from "./threadListAnimations";

const activeRoots: Root[] = [];
const activeContainers: HTMLDivElement[] = [];

afterEach(async () => {
  while (activeRoots.length > 0) {
    const root = activeRoots.pop();
    if (!root) continue;
    await act(async () => {
      root.unmount();
    });
  }
  while (activeContainers.length > 0) {
    activeContainers.pop()?.remove();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("uses a motionless layout transition across shelf toggles and restores it after the layout settles", async () => {
  vi.useFakeTimers();

  const observed: Array<unknown> = [];
  function Harness({ settledExpanded }: { readonly settledExpanded: boolean }) {
    const animation = useThreadListShelfLayoutAnimation(
      threadListShelfExpansionKey({
        workingShelfExpanded: false,
        snoozedShelfExpanded: false,
        settledShelfExpanded: settledExpanded,
      }),
    );
    observed.push((animation as unknown as { reduceMotionMode: string }).reduceMotionMode);
    return null;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  activeContainers.push(container);
  const root = createRoot(container);
  activeRoots.push(root);

  expect((THREAD_LIST_ROW_LAYOUT as unknown as { reduceMotionMode: string }).reduceMotionMode).toBe(
    "system",
  );

  await act(async () => {
    root.render(<Harness settledExpanded={false} />);
  });
  expect(observed.at(-1)).toBe("system");

  await act(async () => {
    root.render(<Harness settledExpanded />);
  });
  expect(observed.at(-1)).toBe("always");

  await act(async () => {
    vi.advanceTimersByTime(249);
  });
  expect(observed.at(-1)).toBe("always");

  await act(async () => {
    vi.advanceTimersByTime(1);
  });
  expect(observed.at(-1)).toBe("system");
});
