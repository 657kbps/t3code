import {
  CLI_RELEASES_PAGE_URL,
  cliReleaseChannelOf,
  cliReleaseIndexPageUrl,
  newestCliReleaseVersion,
} from "@t3tools/shared/cliRelease";
import { compareSemverVersions } from "@t3tools/shared/semver";
import * as Schema from "effect/Schema";
import { msg } from "gt-react-native";

import { m } from "../../i18n/messages";

const Release = Schema.Struct({
  tag_name: Schema.String,
  draft: Schema.optionalKey(Schema.Boolean),
});
const decodeRelease = Schema.decodeUnknownSync(Release);
const decodeReleases = Schema.decodeUnknownSync(Schema.Array(Release));

async function fetchReleases(url: string, accept: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, headers: { Accept: accept } });
  if (!response.ok) {
    throw new Error(
      m(msg("Could not check releases ({status}). Try again.", { status: response.status })),
    );
  }
  return response;
}

/**
 * The newest published release on the channel `currentVersion` runs, or null when the installed
 * version is already current. Stable reads the public release page so devices behind one address
 * do not share the anonymous API quota.
 */
export async function findNewerReleaseVersion(currentVersion: string, signal: AbortSignal) {
  const channel = cliReleaseChannelOf(currentVersion);
  const response = await fetchReleases(
    channel === "stable" ? `${CLI_RELEASES_PAGE_URL}/latest` : `${CLI_RELEASES_PAGE_URL}.atom`,
    channel === "stable" ? "application/json" : "application/atom+xml",
    signal,
  );
  const releases =
    channel === "stable"
      ? [decodeRelease(await response.json())]
      : Array.from(
          (await response.text()).matchAll(
            /<id>tag:github\.com,2008:Repository\/\d+\/([^<]+)<\/id>/g,
          ),
          ([, tag_name = ""]) => ({ tag_name }),
        );
  let version = newestCliReleaseVersion(releases, channel);

  // The feed only includes ten releases, so later nightlies can displace a published preview.
  for (let page = 1; version === undefined; page++) {
    const response = await fetchReleases(
      cliReleaseIndexPageUrl(page),
      "application/vnd.github+json",
      signal,
    );
    const releases = decodeReleases(await response.json());
    version = newestCliReleaseVersion(releases, channel);
    if (releases.length < 100) break;
  }

  if (version === undefined)
    throw new Error(m(msg("No {channel} release was found.", { channel })));
  return compareSemverVersions(version, currentVersion) > 0 ? version : null;
}
