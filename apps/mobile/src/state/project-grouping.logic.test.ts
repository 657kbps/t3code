import { describe, expect, it } from "vite-plus/test";

import { resolveMobileProjectGroupingSettings } from "./project-grouping.logic";

describe("resolveMobileProjectGroupingSettings", () => {
  it("uses the explicit mode ahead of the legacy boolean", () => {
    expect(
      resolveMobileProjectGroupingSettings({
        projectGroupingMode: "separate",
        projectGroupingEnabled: true,
      }).sidebarProjectGroupingMode,
    ).toBe("separate");
  });

  it("keeps honoring the legacy boolean when no mode was saved", () => {
    expect(
      resolveMobileProjectGroupingSettings({ projectGroupingEnabled: false })
        .sidebarProjectGroupingMode,
    ).toBe("separate");
  });

  it("defaults to grouping by repository", () => {
    expect(resolveMobileProjectGroupingSettings({}).sidebarProjectGroupingMode).toBe("repository");
  });
});
