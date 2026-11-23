import { cliReleaseAssetUrl, cliReleaseChannelOf } from "@t3tools/shared/cliRelease";
import { msg } from "gt-react-native";

import { m } from "../../i18n/messages";
import { beginForegroundHandoff } from "../../lib/foreground-handoff";
import { findNewerReleaseVersion } from "./release-check";

const APP_UPDATE_DIRECTORY = "t3-app-updates";
const ANDROID_PACKAGE_MIME_TYPE = "application/vnd.android.package-archive";

/** Builds from `fork-release.yml` opt into APK updates through this config flag. */
export function supportsApkUpdates(platform: string, apkUpdates: unknown): boolean {
  return platform === "android" && apkUpdates === true;
}

export interface AppReleaseUpdate {
  readonly version: string;
  readonly fileName: string;
  readonly downloadUrl: string;
}

/** The asset fork-release.yml attaches for Android phones. */
export function appReleaseApkFileName(version: string): string {
  return `T3-Code-${version}-arm64-v8a.apk`;
}

export async function findAppReleaseUpdate(
  currentVersion: string,
  signal: AbortSignal,
): Promise<AppReleaseUpdate | null> {
  // The fork publishes APKs on the stable track only.
  if (cliReleaseChannelOf(currentVersion) !== "stable") return null;
  const version = await findNewerReleaseVersion(currentVersion, signal);
  if (version === null) return null;
  const fileName = appReleaseApkFileName(version);
  return { version, fileName, downloadUrl: cliReleaseAssetUrl(version, fileName) };
}

export async function downloadAppRelease(input: {
  readonly release: AppReleaseUpdate;
  readonly signal: AbortSignal;
  readonly onProgress?: (progress: { readonly fraction: number }) => void;
}): Promise<string> {
  const { Directory, File, Paths } = await import("expo-file-system");
  const directory = new Directory(Paths.cache, APP_UPDATE_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });
  try {
    for (const entry of directory.list()) {
      if (
        entry instanceof File &&
        entry.name.endsWith(".apk") &&
        entry.name !== input.release.fileName
      ) {
        entry.delete();
      }
    }
  } catch (error) {
    console.warn("[app-release] could not remove an older downloaded APK", error);
  }

  const file = new File(directory, input.release.fileName);
  let lastFraction = -1;
  try {
    await File.downloadFileAsync(input.release.downloadUrl, file, {
      idempotent: true,
      signal: input.signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (totalBytes <= 0) return;
        const fraction = Math.min(1, bytesWritten / totalBytes);
        if (fraction - lastFraction < 0.01) return;
        lastFraction = fraction;
        input.onProgress?.({ fraction });
      },
    });
  } catch (cause) {
    try {
      if (file.exists) file.delete();
    } catch (error) {
      console.warn("[app-release] could not remove an incomplete APK", error);
    }
    if (input.signal.aborted) throw cause;
    throw new Error(m(msg("Could not download the update.")), { cause });
  }
  input.onProgress?.({ fraction: 1 });
  return file.uri;
}

/** The Android package installer is another app's viewer, so the shared file opener starts it. */
export async function openAppReleaseInstaller(uri: string): Promise<void> {
  const { requireNativeModule } = await import("expo");
  const endHandoff = beginForegroundHandoff();
  try {
    await requireNativeModule<{ openFile(uri: string, mimeType: string): Promise<void> }>(
      "T3NativeControls",
    ).openFile(uri, ANDROID_PACKAGE_MIME_TYPE);
  } catch (cause) {
    throw new Error(m(msg("Could not open the Android installer.")), { cause });
  } finally {
    endHandoff();
  }
}
