import { useGT } from "gt-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { AppText as Text } from "../../components/ui/AppText";
import { ListActionRow as SettingsActionRow } from "../../components/ui/ListActionRow";
import { Progress } from "../../components/ui/Progress";
import { AppReleaseController, type AppUpdateState } from "../updates/app-release-controller";
import { SettingsSection } from "./components/SettingsSection";

export function AppUpdatesSection({ currentVersion }: { readonly currentVersion: string }) {
  const gt = useGT();
  const [state, setState] = useState<AppUpdateState>({ status: "idle" });
  const [controller] = useState(() => new AppReleaseController(setState));
  // Leaving About must not leave a large download running in the background.
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- aborting an in-flight network task is an external lifecycle.
  useEffect(() => () => controller.dispose(), [controller]);

  const busy =
    state.status === "checking" || state.status === "downloading" || state.status === "installing";
  const statusText =
    state.status === "checking"
      ? gt("Checking…")
      : state.status === "current"
        ? gt("Up to date")
        : state.status === "available"
          ? gt("Version {version} is available.", { version: state.update.version })
          : state.status === "downloading"
            ? gt("Downloading update…")
            : state.status === "installing"
              ? gt("Installing update…")
              : state.status === "ready"
                ? gt("Update ready")
                : state.status === "failed"
                  ? state.message
                  : null;
  const update =
    state.status === "idle" || state.status === "checking" || state.status === "current"
      ? null
      : state.update;
  const updateLabel = !update
    ? null
    : state.status === "ready"
      ? gt("Install Now")
      : state.status === "failed"
        ? gt("Retry update")
        : gt("Update to {version}", { version: update.version });

  return (
    <SettingsSection title={gt("Updates")}>
      {statusText ? (
        <View className="gap-1 p-4">
          <Text
            selectable={state.status === "failed"}
            accessibilityRole={state.status === "failed" ? "alert" : undefined}
            className={
              state.status === "failed"
                ? "text-sm text-danger-foreground"
                : "text-sm text-foreground-muted"
            }
          >
            {statusText}
          </Text>
          {state.status === "downloading" ? (
            <Progress value={state.fraction} label={gt("Downloading update…")} className="pt-2" />
          ) : null}
        </View>
      ) : null}
      <SettingsActionRow
        icon="arrow.clockwise"
        label={gt("Check for updates")}
        disabled={busy}
        loading={state.status === "checking"}
        onPress={() => void controller.check(currentVersion)}
      />
      {update && updateLabel ? (
        <SettingsActionRow
          icon="arrow.up.circle"
          label={updateLabel}
          disabled={busy}
          loading={state.status === "downloading" || state.status === "installing"}
          onPress={() => {
            if (state.status === "ready") void controller.openInstaller(update, state.uri);
            else if (state.status === "failed" && state.uri !== undefined) {
              void controller.openInstaller(update, state.uri);
            } else void controller.downloadAndInstall(update);
          }}
        />
      ) : null}
    </SettingsSection>
  );
}
