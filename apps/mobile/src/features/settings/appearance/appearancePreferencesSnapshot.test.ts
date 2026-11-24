import { AsyncResult } from "effect/reactivity";
import { describe, expect, it } from "vite-plus/test";

import {
  appearancePreferencesSnapshotsEqual,
  selectAppearancePreferences,
} from "./appearancePreferencesSnapshot";

describe("appearance preference snapshot", () => {
  it("keeps the math rendering preference", () => {
    const snapshot = selectAppearancePreferences(
      AsyncResult.success({ mathRenderingEnabled: true, baseFontSize: 17 }),
    );

    expect(snapshot.isReady).toBe(true);
    expect(snapshot.mathRenderingEnabled).toBe(true);
    expect(snapshot.baseFontSize).toBe(17);
  });

  it("treats a math rendering change as a new snapshot", () => {
    const disabled = selectAppearancePreferences(AsyncResult.success({}));
    const enabled = selectAppearancePreferences(
      AsyncResult.success({ mathRenderingEnabled: true }),
    );

    expect(appearancePreferencesSnapshotsEqual(disabled, enabled)).toBe(false);
    expect(
      appearancePreferencesSnapshotsEqual(
        enabled,
        selectAppearancePreferences(AsyncResult.success({ mathRenderingEnabled: true })),
      ),
    ).toBe(true);
  });

  it("does not report stale values before preferences load", () => {
    const snapshot = selectAppearancePreferences(AsyncResult.initial(true));

    expect(snapshot.isReady).toBe(false);
    expect(snapshot.baseFontSize).toBeUndefined();
    expect(snapshot.mathRenderingEnabled).toBeUndefined();
  });
});
