import type { ManagedPolicySummary, ServerProviderRuntimeMode } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  draftRuntimeModeLimitsInstance,
  draftSupportedRuntimeModes,
  resolveCompatibleRuntimeMode,
  resolveRuntimeModeOptions,
  runtimeModeOptions,
} from "./runtimeModeConfig";

const SPARROW_MODES: ReadonlyArray<ServerProviderRuntimeMode> = [
  {
    mode: "read-only",
    label: "Read only",
    description: "Allow read and search tools only.",
    icon: "eye",
  },
  {
    mode: "workspace-write",
    label: "Workspace write",
    description: "Allow workspace edits and confined shell commands.",
    icon: "shield-check",
  },
  {
    mode: "full-access",
    label: "Full access",
    description: "Disable the write sandbox.",
    icon: "shield-off",
  },
];

describe("runtimeModeConfig per-provider overrides", () => {
  it("preserves the classic four runtime modes when providerRuntimeModes is unset", () => {
    expect(resolveCompatibleRuntimeMode("auto", undefined)).toEqual({
      modes: runtimeModeOptions,
      mode: "auto",
    });
    expect(resolveCompatibleRuntimeMode("auto", ["approval-required", "full-access"])).toEqual({
      modes: ["approval-required", "full-access"],
      mode: "approval-required",
    });
  });

  it("uses providerRuntimeModes directly and maps classic modes onto workspace-write fallback", () => {
    expect(
      resolveCompatibleRuntimeMode(
        "auto",
        SPARROW_MODES.map((m) => m.mode),
        SPARROW_MODES,
      ),
    ).toEqual({
      modes: ["read-only", "workspace-write", "full-access"],
      mode: "workspace-write",
    });

    const policy: ManagedPolicySummary = {
      organization: "Acme",
      lockedSettings: [],
      limits: { maxRuntimeMode: "workspace-write" },
    };
    const options = resolveRuntimeModeOptions(
      ["read-only", "workspace-write", "full-access"],
      policy,
      undefined,
      SPARROW_MODES,
    );
    expect(options.map((o) => [o.mode, o.label, o.disabledReason])).toEqual([
      ["read-only", "Read only", undefined],
      ["workspace-write", "Workspace write", undefined],
      ["full-access", "Full access", "Acme limits threads to Workspace write."],
    ]);
  });
});

describe("draftSupportedRuntimeModes", () => {
  const supervisedOnly = {
    instanceId: "fx",
    supportedRuntimeModes: ["approval-required"],
  } as const;
  const noAuto = {
    instanceId: "muse",
    supportedRuntimeModes: ["approval-required", "full-access"],
  } as const;
  const everyMode = { instanceId: "codex" };
  const providers = [supervisedOnly, noAuto, everyMode];

  it.each([
    { label: "one provider that supports it", selections: [supervisedOnly, noAuto] },
    { label: "a provider that reports no modes", selections: [supervisedOnly, everyMode] },
  ])("shows Full access when a multi-model draft includes $label", ({ selections }) => {
    const modes = draftSupportedRuntimeModes(
      supervisedOnly.supportedRuntimeModes,
      selections,
      providers,
    );
    expect(resolveCompatibleRuntimeMode("full-access", modes).mode).toBe("full-access");
  });

  it("falls back only when no selected provider can run the mode", () => {
    const modes = draftSupportedRuntimeModes(undefined, [supervisedOnly, noAuto], providers);
    expect(resolveCompatibleRuntimeMode("auto", modes).mode).toBe("approval-required");
  });
});

describe("draftRuntimeModeLimitsInstance", () => {
  const claude = { instanceId: "claude" };
  const codex = { instanceId: "codex" };

  it.each([
    { label: "no multi-model selection", selections: null, expected: "active" },
    { label: "an empty multi-model selection", selections: [], expected: "active" },
    { label: "one selected model", selections: [claude], expected: "claude" },
    { label: "models that share one provider", selections: [claude, claude], expected: "claude" },
    { label: "models on different providers", selections: [claude, codex], expected: undefined },
  ])("checks the limits of the provider every thread uses: $label", ({ selections, expected }) => {
    expect(draftRuntimeModeLimitsInstance("active", selections)).toBe(expected);
  });
});

describe("resolveRuntimeModeOptions", () => {
  it("keeps a mode the provider cannot run in this folder listed, disabled with the reason", () => {
    const options = resolveRuntimeModeOptions(runtimeModeOptions, undefined, undefined, undefined, [
      { mode: "auto", reason: "project-settings" },
    ]);
    expect(options.map((option) => [option.mode, option.disabledReason])).toEqual([
      ["approval-required", undefined],
      ["auto-accept-edits", undefined],
      ["auto", "This project's Claude settings turn auto mode off."],
      ["full-access", undefined],
    ]);
  });
});
