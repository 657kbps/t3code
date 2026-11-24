import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { AppUpdatesSection } from "./AppUpdatesSection";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    find: vi.fn(),
    download: vi.fn(),
    install: vi.fn(),
    openExternalUrl: vi.fn(async () => true),
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => (
    <button aria-label={accessibilityLabel} onClick={onPress}>
      {children}
    </button>
  ),
}));

vi.mock("react-native-reanimated", () => ({
  default: {
    View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  },
  LinearTransition: {
    duration: () => ({
      reduceMotion: () => undefined,
    }),
  },
  ReduceMotion: { System: "system" },
}));

vi.mock("uniwind", () => ({
  useResolveClassNames: () => ({ backgroundColor: "#000000" }),
}));

vi.mock("gt-react-native", () => ({
  useGT: () => (template: string, params?: Record<string, string>) =>
    params
      ? Object.entries(params).reduce(
          (text, [key, value]) => text.replaceAll(`{${key}}`, value),
          template,
        )
      : template,
  msg: (text: string) => text,
}));

vi.mock("../../i18n/messages", () => ({
  m: (text: string) => text,
}));

vi.mock("../../components/StatusPill", () => ({
  StatusPill: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("../../components/ui/AppActivityIndicator", () => ({
  AppActivityIndicator: () => <span data-spinner="true" />,
}));

vi.mock("../../components/ui/AppSymbol", () => ({
  SymbolView: () => null,
}));

vi.mock("../../components/ui/AppText", () => ({
  AppText: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock("../../components/ui/Button", () => ({
  Button: ({
    label,
    disabled,
    onPress,
  }: {
    label: string;
    disabled?: boolean;
    onPress: () => void;
  }) => (
    <button disabled={disabled} onClick={onPress}>
      {label}
    </button>
  ),
}));

vi.mock("../../components/ui/ListActionRow", () => ({
  ListActionRow: ({
    label,
    disabled,
    onPress,
  }: {
    label: string;
    disabled?: boolean;
    onPress: () => void;
  }) => (
    <button disabled={disabled} onClick={onPress}>
      {label}
    </button>
  ),
}));

vi.mock("../../components/ui/ListRowLayout", () => ({
  ListRowLayout: ({ label, detail }: { label: string; detail?: string }) => (
    <span>
      {label} {detail}
    </span>
  ),
}));

vi.mock("../../components/ui/Progress", () => ({
  Progress: ({ value }: { value?: number }) => <progress value={value ?? 0} max={1} />,
}));

vi.mock("../../components/ui/RowPressable", () => ({
  RowPressable: ({
    children,
    onPress,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
  }) => (
    <button aria-label={accessibilityLabel} onClick={onPress}>
      {children}
    </button>
  ),
}));

vi.mock("./components/SettingsSection", () => ({
  SettingsSection: ({
    title,
    trailing,
    footer,
    children,
  }: {
    title?: string;
    trailing?: ReactNode;
    footer?: string;
    children?: ReactNode;
  }) => (
    <section data-title={title}>
      {trailing}
      {children}
      {footer ? <p>{footer}</p> : null}
    </section>
  ),
}));

vi.mock("../../lib/openExternalUrl", () => ({
  tryOpenExternalUrl: mocks.openExternalUrl,
}));

vi.mock("../updates/app-release", () => ({
  appReleasePageUrl: (version: string) =>
    `https://github.com/657kbps/t3code/releases/tag/v${encodeURIComponent(version)}`,
  findAppReleaseUpdate: mocks.find,
  downloadAppRelease: mocks.download,
  openAppReleaseInstaller: mocks.install,
}));

const update = {
  version: "0.1.11-fork.9",
  fileName: "T3-Code-0.1.11-fork.9-arm64-v8a.apk",
  downloadUrl:
    "https://github.com/657kbps/t3code/releases/download/v0.1.11-fork.9/T3-Code-0.1.11-fork.9-arm64-v8a.apk",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function findButton(label: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label),
  );
}

describe("AppUpdatesSection", () => {
  it("auto-checks on mount and shows up-to-date status", async () => {
    mocks.find.mockResolvedValueOnce(null);

    await act(async () => {
      root.render(<AppUpdatesSection currentVersion="0.1.11-fork.8" />);
    });
    await flushMicrotasks();

    expect(mocks.find).toHaveBeenCalledWith("0.1.11-fork.8", expect.any(AbortSignal));
    expect(container.textContent).toContain("You’re up to date");
    expect(container.textContent).toContain("Version 0.1.11-fork.8 is the latest release.");
    expect(findButton("Check for updates")).toBeUndefined();
    expect(findButton("Check again")).toBeTruthy();
  });

  it("shows download progress, allows cancelling back to available, and recovers on installer error", async () => {
    mocks.find.mockResolvedValueOnce(update);

    await act(async () => {
      root.render(<AppUpdatesSection currentVersion="0.1.11-fork.8" />);
    });
    await flushMicrotasks();

    expect(container.textContent).toContain("Update available");
    expect(container.textContent).toContain("v0.1.11-fork.8 → v0.1.11-fork.9");

    await act(async () => {
      findButton("Release notes")?.click();
    });
    expect(mocks.openExternalUrl).toHaveBeenCalledWith(
      "https://github.com/657kbps/t3code/releases/tag/v0.1.11-fork.9",
    );

    let rejectFirst!: (reason?: unknown) => void;
    mocks.download.mockImplementationOnce(
      ({ onProgress, signal }: { onProgress?: (p: unknown) => void; signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
          onProgress?.({ fraction: 0.5, bytesWritten: 512 * 1024, totalBytes: 1024 * 1024 });
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    await act(async () => {
      findButton("Download & install")?.click();
    });
    expect(container.textContent).toContain("Downloading update…");
    expect(container.textContent).toContain("50%");
    expect(container.textContent).toContain("512 KB / 1.0 MB");

    await act(async () => {
      findButton("Cancel")?.click();
    });
    await flushMicrotasks().catch(() => rejectFirst());
    expect(container.textContent).toContain("Update available");
    expect(findButton("Download & install")).toBeTruthy();

    mocks.download.mockResolvedValueOnce("file:///cache/t3-app-updates/update.apk");
    mocks.install.mockRejectedValueOnce(new Error("Permission required"));

    await act(async () => {
      findButton("Download & install")?.click();
    });
    await flushMicrotasks();

    expect(container.textContent).toContain("Could not start installer");
    expect(container.textContent).toContain("Permission required");
    expect(findButton("Retry install")).toBeTruthy();
    expect(findButton("Download again")).toBeTruthy();
  });
});
