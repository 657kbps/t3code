import { useAtomValue } from "@effect/atom-react";
import { msg } from "gt-react-native";
import { AsyncResult } from "effect/reactivity";
import { Platform } from "react-native";
import {
  NAVIGATION_TAB_LABELS,
  navigationCustomizationAvailable,
  resolveHiddenNavigationTabs,
  enabledNavigationTabs,
  sharedSlotAbsentee,
  type NavigationTab,
} from "./navigation-tab-order";
import type { AppSymbolName } from "../../../components/ui/AppSymbol";
import { mobilePreferencesAtom } from "../../../state/preferences";
import { PullRequestGlyph } from "../../pull-requests/pullRequestGlyphs";
import { useWorkspaceTabs } from "./WorkspaceTabsContext";
import { resolveWorkspaceTabOrder } from "./workspace-tabs-state";

export const WORKSPACE_TAB_LABELS = {
  ...NAVIGATION_TAB_LABELS,
  ...(Platform.OS === "ios"
    ? {
        threads: msg("Chats", { $context: "navigation tab, list of chat threads" }),
        pullRequests: msg("PRs", { $context: "navigation tab, pull requests" }),
      }
    : {}),
};

export const NAVIGATION_TAB_ICONS = {
  threads: "text.bubble",
  pullRequests: PullRequestGlyph.pullRequest,
  issues: "git.issue",
  workflows: "point.3.connected.trianglepath.dotted",
  usage: "chart.bar.xaxis",
} as const satisfies Readonly<Record<NavigationTab, AppSymbolName>>;

export function useNavigationTabOrder() {
  const saved = useAtomValue(mobilePreferencesAtom, (preferences) =>
    AsyncResult.isSuccess(preferences) ? preferences.value.navigationTabOrder : undefined,
  );
  return resolveWorkspaceTabOrder(saved);
}

export function useHiddenNavigationTabs() {
  const hiddenNavigationTabs = useAtomValue(mobilePreferencesAtom, (preferences) =>
    AsyncResult.isSuccess(preferences) ? preferences.value.hiddenNavigationTabs : undefined,
  );
  const sharedSlotTab = useAtomValue(mobilePreferencesAtom, (preferences) =>
    AsyncResult.isSuccess(preferences) ? preferences.value.sharedSlotTab : undefined,
  );
  const selected = useWorkspaceTabs()?.state.selectedTab ?? "threads";
  return [
    ...(navigationCustomizationAvailable()
      ? resolveHiddenNavigationTabs(hiddenNavigationTabs)
      : []),
    sharedSlotAbsentee(selected, sharedSlotTab),
  ];
}

export function useEnabledNavigationTabs() {
  const order = useNavigationTabOrder();
  const hidden = useHiddenNavigationTabs();
  return enabledNavigationTabs(order, hidden);
}
