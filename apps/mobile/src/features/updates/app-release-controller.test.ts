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
});
