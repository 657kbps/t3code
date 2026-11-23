import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AppReleaseController, type AppUpdateState } from "./app-release-controller";

const releaseMocks = vi.hoisted(() => ({
  download: vi.fn(),
  find: vi.fn(),
  install: vi.fn(),
}));

vi.mock("./app-release", () => ({
  downloadAppRelease: releaseMocks.download,
  findAppReleaseUpdate: releaseMocks.find,
  openAppReleaseInstaller: releaseMocks.install,
}));

const update = {
  version: "0.1.11-fork.9",
  fileName: "T3-Code-0.1.11-fork.9-arm64-v8a.apk",
  downloadUrl:
    "https://github.com/657kbps/t3code/releases/download/v0.1.11-fork.9/T3-Code-0.1.11-fork.9-arm64-v8a.apk",
};

afterEach(() => {
  vi.clearAllMocks();
});

function makeController() {
  const states: AppUpdateState[] = [];
  return { states, controller: new AppReleaseController((state) => states.push(state)) };
}

describe("AppReleaseController", () => {
  it("offers the newer release and reports when the app is current", async () => {
    const { controller, states } = makeController();
    releaseMocks.find.mockResolvedValueOnce(update);

    await controller.check("0.1.11-fork.8");
    expect(states).toEqual([{ status: "checking" }, { status: "available", update }]);

    releaseMocks.find.mockResolvedValueOnce(null);
    await controller.check("0.1.11-fork.9");
    expect(states.at(-1)).toEqual({ status: "current" });
  });

  it("reuses the downloaded APK when the installer fails, instead of downloading it again", async () => {
    const { controller, states } = makeController();
    releaseMocks.download.mockResolvedValue("file:///cache/t3-app-updates/update.apk");
    releaseMocks.install.mockRejectedValueOnce(new Error("Could not open the Android installer."));

    await controller.downloadAndInstall(update);

    expect(states.at(-1)).toMatchObject({
      status: "failed",
      update,
      uri: "file:///cache/t3-app-updates/update.apk",
    });

    releaseMocks.install.mockResolvedValueOnce(undefined);
    await controller.openInstaller(update, "file:///cache/t3-app-updates/update.apk");

    expect(releaseMocks.download).toHaveBeenCalledOnce();
    expect(releaseMocks.install).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toEqual({
      status: "ready",
      update,
      uri: "file:///cache/t3-app-updates/update.apk",
    });
  });

  it("forwards byte progress and cancels back to available without blocking a retry", async () => {
    const { controller, states } = makeController();
    let rejectFirst!: (reason?: unknown) => void;
    releaseMocks.download.mockImplementationOnce(
      ({ onProgress, signal }: { onProgress?: (p: unknown) => void; signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
          onProgress?.({ fraction: 0.5, bytesWritten: 512, totalBytes: 1024 });
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    const firstDownload = controller.downloadAndInstall(update);
    expect(states.at(-1)).toEqual({
      status: "downloading",
      update,
      fraction: 0.5,
      bytesWritten: 512,
      totalBytes: 1024,
    });

    controller.cancelDownload(update);
    expect(states.at(-1)).toEqual({ status: "available", update });

    releaseMocks.download.mockResolvedValueOnce("file:///cache/t3-app-updates/update.apk");
    releaseMocks.install.mockResolvedValueOnce(undefined);
    await controller.downloadAndInstall(update);
    await firstDownload.catch(() => rejectFirst());

    expect(states.at(-1)).toEqual({
      status: "ready",
      update,
      uri: "file:///cache/t3-app-updates/update.apk",
    });
  });

  it("allows a fresh check after dispose aborts an in-flight check", async () => {
    const { controller, states } = makeController();
    releaseMocks.find.mockImplementationOnce(
      (_version: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    const initialCheck = controller.check("0.1.11-fork.8");
    controller.dispose();
    await initialCheck;

    releaseMocks.find.mockResolvedValueOnce(null);
    await controller.check("0.1.11-fork.8");
    expect(states.at(-1)).toEqual({ status: "current" });
  });
});
