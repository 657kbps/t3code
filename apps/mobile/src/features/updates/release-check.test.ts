import { CLI_RELEASES_PAGE_URL, cliReleaseIndexPageUrl } from "@t3tools/shared/cliRelease";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { findNewerReleaseVersion } from "./release-check";

afterEach(() => vi.unstubAllGlobals());

const feed = (...tags: ReadonlyArray<string>) =>
  new Response(
    `<feed><id>tag:github.com,2008:https://github.com/releases</id>${tags
      .map((tag) => `<entry><id>tag:github.com,2008:Repository/1/${tag}</id></entry>`)
      .join("")}</feed>`,
  );

describe("findNewerReleaseVersion", () => {
  const signal = new AbortController().signal;

  it("keeps nightly and preview hosts on their channel without using the anonymous API quota", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === `${CLI_RELEASES_PAGE_URL}.atom`
          ? feed(
              "desktop-preview",
              "v1.0.0-preview.20260924.3",
              "v1.0.0-nightly.20260924.2",
              "v1.0.0",
              "v1.0.0-nightly.20260923.1",
            )
          : new Response(null, { status: 403 }),
      ),
    );
    expect(await findNewerReleaseVersion("1.0.0-nightly.20260923.1", signal)).toBe(
      "1.0.0-nightly.20260924.2",
    );
    expect(await findNewerReleaseVersion("1.0.0-nightly.20260924.2", signal)).toBeNull();
    expect(await findNewerReleaseVersion("1.0.0-preview.20260923.1", signal)).toBe(
      "1.0.0-preview.20260924.3",
    );
    expect(await findNewerReleaseVersion("1.0.0-preview.20260925.1", signal)).toBeNull();
  });

  it("finds a published preview beyond the ten-entry feed and first API page", async () => {
    const nightlies = Array.from({ length: 10 }, (_, i) => `v1.0.0-nightly.20260930.${i}`);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === `${CLI_RELEASES_PAGE_URL}.atom`) return feed(...nightlies);
        if (url === cliReleaseIndexPageUrl(1)) {
          return Response.json(Array.from({ length: 100 }, () => ({ tag_name: "v2.0.0" })));
        }
        if (url === cliReleaseIndexPageUrl(2)) {
          return Response.json([
            { tag_name: "v1.0.0-preview.20260925.1", draft: true },
            { tag_name: "v1.0.0-preview.20260924.3" },
          ]);
        }
        throw new Error(`Unexpected release request: ${url}`);
      }),
    );
    expect(await findNewerReleaseVersion("1.0.0-preview.20260923.1", signal)).toBe(
      "1.0.0-preview.20260924.3",
    );
  });

  it("reports failed checks instead of claiming the server is current", async () => {
    for (const status of [403, 429]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
      await expect(findNewerReleaseVersion("1.0.0", signal)).rejects.toThrow(String(status));
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith(".atom") ? feed("v1.0.0") : Response.json([{ tag_name: "v1.0.0" }]),
      ),
    );
    await expect(findNewerReleaseVersion("1.0.0-nightly.20260923.1", signal)).rejects.toThrow(
      "No nightly release",
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "invalid" })));
    await expect(findNewerReleaseVersion("1.0.0", signal)).rejects.toThrow();
  });
});
