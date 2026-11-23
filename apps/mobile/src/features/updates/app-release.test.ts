import { CLI_RELEASES_PAGE_URL, CLI_RELEASE_REPOSITORY } from "@t3tools/shared/cliRelease";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { supportsApkUpdates, appReleaseApkFileName, findAppReleaseUpdate } from "./app-release";

afterEach(() => vi.unstubAllGlobals());

const signal = new AbortController().signal;

function latestRelease(tagName: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ tag_name: tagName })),
  );
}

describe("findAppReleaseUpdate", () => {
  it("offers the release APK when a newer stable release is published", async () => {
    latestRelease("v0.1.11-fork.9");

    await expect(findAppReleaseUpdate("0.1.11-fork.8", signal)).resolves.toEqual({
      version: "0.1.11-fork.9",
      fileName: "T3-Code-0.1.11-fork.9-arm64-v8a.apk",
      downloadUrl: `https://github.com/${CLI_RELEASE_REPOSITORY}/releases/download/v0.1.11-fork.9/T3-Code-0.1.11-fork.9-arm64-v8a.apk`,
    });
    expect(fetch).toHaveBeenCalledWith(`${CLI_RELEASES_PAGE_URL}/latest`, {
      signal,
      headers: { Accept: "application/json" },
    });
  });

  it("reports no update when the installed release is current or newer", async () => {
    latestRelease("v0.1.11-fork.8");
    await expect(findAppReleaseUpdate("0.1.11-fork.8", signal)).resolves.toBeNull();

    latestRelease("v0.1.11-fork.7");
    await expect(findAppReleaseUpdate("0.1.11-fork.8", signal)).resolves.toBeNull();
  });

  it("leaves nightly and preview builds to their own update track", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(findAppReleaseUpdate("0.1.11-nightly.20260923.1", signal)).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports a failed release lookup instead of claiming the app is current", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    );

    await expect(findAppReleaseUpdate("0.1.11-fork.8", signal)).rejects.toThrow("403");
  });

  it("names the Android asset the release workflow uploads", () => {
    expect(appReleaseApkFileName("0.1.11-fork.9")).toBe("T3-Code-0.1.11-fork.9-arm64-v8a.apk");
  });

  it("only offers APK updates to Android builds that opt in", () => {
    expect(supportsApkUpdates("android", true)).toBe(true);
    expect(supportsApkUpdates("android", false)).toBe(false);
    expect(supportsApkUpdates("ios", true)).toBe(false);
  });
});
