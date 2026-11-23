import { useGT } from "gt-react-native";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import Animated, { LinearTransition, ReduceMotion } from "react-native-reanimated";
import { useResolveClassNames } from "uniwind";

import { StatusPill } from "../../components/StatusPill";
import { AppActivityIndicator } from "../../components/ui/AppActivityIndicator";
import { SymbolView, type AppSymbolName } from "../../components/ui/AppSymbol";
import { AppText as Text } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { ListActionRow as SettingsActionRow } from "../../components/ui/ListActionRow";
import { ListRowLayout } from "../../components/ui/ListRowLayout";
import { Progress } from "../../components/ui/Progress";
import { RowPressable } from "../../components/ui/RowPressable";
import { MOBILE_MOTION } from "../../lib/designTokens";
import { formatBytes } from "../../lib/formatBytes";
import { tryOpenExternalUrl } from "../../lib/openExternalUrl";
import { appReleasePageUrl } from "../updates/app-release";
import { AppReleaseController, type AppUpdateState } from "../updates/app-release-controller";
import { SettingsSection } from "./components/SettingsSection";

const CARD_LAYOUT_TRANSITION = LinearTransition.duration(MOBILE_MOTION.enter).reduceMotion(
  ReduceMotion.System,
);

type BadgeTone = "loading" | "update" | "success" | "danger";

const BADGE_SURFACE_BY_TONE: Record<BadgeTone, string> = {
  loading: "bg-update",
  update: "bg-update",
  success: "bg-adaptive-emerald-500-a12-a16",
  danger: "bg-danger",
};

const BADGE_ICON_COLOR_BY_TONE: Record<Exclude<BadgeTone, "loading">, string> = {
  update: "accent-update-foreground",
  success: "accent-adaptive-emerald-700-300",
  danger: "accent-danger-foreground",
};

function UpdateStatusBadge({
  tone,
  icon,
}: {
  readonly tone: BadgeTone;
  readonly icon?: AppSymbolName;
}) {
  return (
    <View
      className={`size-10 shrink-0 items-center justify-center rounded-full ${BADGE_SURFACE_BY_TONE[tone]}`}
    >
      {tone === "loading" ? (
        <AppActivityIndicator size="small" />
      ) : (
        <SymbolView
          name={icon ?? "info.circle"}
          size={20}
          tintColorClassName={BADGE_ICON_COLOR_BY_TONE[tone]}
          type="monochrome"
          weight="regular"
        />
      )}
    </View>
  );
}

function ReleaseNotesRow({ version }: { readonly version: string }) {
  const gt = useGT();
  const rippleStyle = useResolveClassNames("bg-subtle-strong");
  return (
    <View className="border-t border-border-subtle">
      <RowPressable
        accessibilityRole="link"
        accessibilityLabel={gt("Release notes")}
        onPress={() => void tryOpenExternalUrl(appReleasePageUrl(version))}
        android_ripple={{ color: rippleStyle.backgroundColor }}
        unstable_pressDelay={Platform.OS === "android" ? 50 : undefined}
        className="bg-grouped-card"
      >
        <ListRowLayout
          icon="doc.text"
          label={gt("Release notes")}
          detail="GitHub"
          accessory={
            <SymbolView
              name="arrow.up.right"
              size={15}
              tintColorClassName="accent-chevron"
              type="monochrome"
              weight="semibold"
            />
          }
        />
      </RowPressable>
    </View>
  );
}

export function AppUpdatesSection({ currentVersion }: { readonly currentVersion: string }) {
  const gt = useGT();
  const [state, setState] = useState<AppUpdateState>({ status: "checking" });
  const [controller] = useState(() => new AppReleaseController(setState));
  // Automatically check when About opens, and abort any in-flight check or download on leave.
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- auto-check on About entry and abort on unmount are external network lifecycles.
  useEffect(() => {
    void controller.check(currentVersion);
    return () => controller.dispose();
  }, [controller, currentVersion]);

  const showTrailingCheckAgain =
    state.status === "current" ||
    state.status === "available" ||
    state.status === "ready" ||
    (state.status === "failed" && state.update !== null);

  const footer =
    state.status === "ready"
      ? gt(
          "If Android asks for permission to install unknown apps, allow it and tap Install now again.",
        )
      : state.status === "failed" && state.uri !== undefined
        ? gt("Allow T3 Code to install unknown apps in Android settings, then tap Retry install.")
        : undefined;

  return (
    <SettingsSection
      title={gt("Updates")}
      trailing={
        showTrailingCheckAgain ? (
          <Button
            label={gt("Check again")}
            tone="text"
            onPress={() => void controller.check(currentVersion)}
          />
        ) : undefined
      }
      footer={footer}
    >
      <Animated.View layout={CARD_LAYOUT_TRANSITION}>
        <AppUpdateCardBody state={state} currentVersion={currentVersion} controller={controller} />
      </Animated.View>
    </SettingsSection>
  );
}

function AppUpdateCardBody({
  state,
  currentVersion,
  controller,
}: {
  readonly state: AppUpdateState;
  readonly currentVersion: string;
  readonly controller: AppReleaseController;
}) {
  const gt = useGT();

  if (state.status === "idle" || state.status === "checking") {
    return (
      <View className="flex-row items-center gap-3.5 p-4">
        <UpdateStatusBadge tone="loading" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text textRole="body" className="font-t3-medium text-foreground">
            {gt("Checking for updates…")}
          </Text>
          <Text textRole="footnote" className="text-foreground-muted tabular-nums">
            {gt("Current version {version}", { version: currentVersion })}
          </Text>
        </View>
      </View>
    );
  }

  if (state.status === "current") {
    return (
      <View className="flex-row items-center gap-3.5 p-4">
        <UpdateStatusBadge tone="success" icon="checkmark.circle.fill" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text textRole="body" className="font-t3-medium text-foreground">
            {gt("You’re up to date")}
          </Text>
          <Text textRole="footnote" className="text-foreground-muted tabular-nums">
            {gt("Version {version} is the latest release.", { version: currentVersion })}
          </Text>
        </View>
      </View>
    );
  }

  if (state.status === "available") {
    return (
      <>
        <View className="gap-3.5 p-4">
          <View className="flex-row items-center gap-3.5">
            <UpdateStatusBadge tone="update" icon="tray.and.arrow.down" />
            <View className="min-w-0 flex-1 gap-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text textRole="body" className="font-t3-semibold text-foreground">
                  {gt("Update available")}
                </Text>
                <StatusPill
                  label={`v${state.update.version}`}
                  pillClassName="bg-update"
                  textClassName="text-update-foreground"
                  size="compact"
                />
              </View>
              <Text textRole="footnote" className="text-foreground-muted tabular-nums">
                {`v${currentVersion} → v${state.update.version}`}
              </Text>
            </View>
          </View>
          <Button
            tone="primary"
            icon="tray.and.arrow.down"
            label={gt("Download & install")}
            fullWidth
            onPress={() => void controller.downloadAndInstall(state.update)}
          />
        </View>
        <ReleaseNotesRow version={state.update.version} />
      </>
    );
  }

  if (state.status === "downloading") {
    const percent = state.fraction === undefined ? undefined : Math.round(state.fraction * 100);
    const byteSummary =
      state.bytesWritten !== undefined && state.totalBytes !== undefined && state.totalBytes > 0
        ? `${formatBytes(state.bytesWritten)} / ${formatBytes(state.totalBytes)}`
        : gt("Preparing download…");
    return (
      <View className="gap-3 p-4">
        <View className="flex-row items-center gap-3.5">
          <UpdateStatusBadge tone="update" icon="tray.and.arrow.down" />
          <View className="min-w-0 flex-1 gap-0.5">
            <Text textRole="body" className="font-t3-semibold text-foreground">
              {gt("Downloading update…")}
            </Text>
            <Text textRole="footnote" className="text-foreground-muted tabular-nums">
              {`v${state.update.version}`}
            </Text>
          </View>
          {percent !== undefined ? (
            <Text textRole="footnote" className="font-t3-bold text-update-foreground tabular-nums">
              {`${percent}%`}
            </Text>
          ) : null}
        </View>
        <Progress value={state.fraction} label={gt("Downloading update…")} />
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text textRole="footnote" className="text-foreground-muted tabular-nums">
            {byteSummary}
          </Text>
          <Button
            tone="text"
            label={gt("Cancel")}
            onPress={() => controller.cancelDownload(state.update)}
          />
        </View>
      </View>
    );
  }

  if (state.status === "installing") {
    return (
      <View className="flex-row items-center gap-3.5 p-4">
        <UpdateStatusBadge tone="loading" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text textRole="body" className="font-t3-semibold text-foreground">
            {gt("Opening installer…")}
          </Text>
          <Text textRole="footnote" className="text-foreground-muted">
            {gt("Confirm installation in the Android system dialog.")}
          </Text>
        </View>
      </View>
    );
  }

  if (state.status === "ready") {
    return (
      <>
        <View className="gap-3.5 p-4">
          <View className="flex-row items-center gap-3.5">
            <UpdateStatusBadge tone="success" icon="checkmark.circle.fill" />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text textRole="body" className="font-t3-semibold text-foreground">
                {gt("Ready to install")}
              </Text>
              <Text textRole="footnote" className="text-foreground-muted tabular-nums">
                {gt("v{version} is downloaded and ready.", { version: state.update.version })}
              </Text>
            </View>
          </View>
          <Button
            tone="primary"
            icon="checkmark.circle"
            label={gt("Install now")}
            fullWidth
            onPress={() => void controller.openInstaller(state.update, state.uri)}
          />
        </View>
        <ReleaseNotesRow version={state.update.version} />
      </>
    );
  }

  const failedUpdate = state.update;
  const failedUri = state.uri;
  const failedTitle =
    failedUri !== undefined
      ? gt("Could not start installer")
      : failedUpdate !== null
        ? gt("Download failed")
        : gt("Update check failed");

  return (
    <>
      <View className="gap-3.5 p-4">
        <View className="flex-row items-start gap-3.5">
          <UpdateStatusBadge tone="danger" icon="exclamationmark.triangle" />
          <View className="min-w-0 flex-1 gap-1">
            <Text textRole="body" className="font-t3-semibold text-foreground">
              {failedTitle}
            </Text>
            <Text
              selectable
              accessibilityRole="alert"
              textRole="footnote"
              className="text-danger-foreground"
            >
              {state.message}
            </Text>
          </View>
        </View>
        {failedUpdate && failedUri !== undefined ? (
          <Button
            tone="primary"
            icon="arrow.clockwise"
            label={gt("Retry install")}
            fullWidth
            onPress={() => void controller.openInstaller(failedUpdate, failedUri)}
          />
        ) : failedUpdate ? (
          <Button
            tone="primary"
            icon="arrow.clockwise"
            label={gt("Retry download")}
            fullWidth
            onPress={() => void controller.downloadAndInstall(failedUpdate)}
          />
        ) : (
          <Button
            tone="secondary"
            icon="arrow.clockwise"
            label={gt("Try again")}
            fullWidth
            onPress={() => void controller.check(currentVersion)}
          />
        )}
      </View>
      {failedUpdate && failedUri !== undefined ? (
        <View className="border-t border-border-subtle">
          <SettingsActionRow
            icon="tray.and.arrow.down"
            label={gt("Download again")}
            onPress={() => void controller.downloadAndInstall(failedUpdate)}
          />
        </View>
      ) : null}
    </>
  );
}
