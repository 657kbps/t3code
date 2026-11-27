import { AsyncResult } from "effect/reactivity";

import type { Preferences } from "../../../persistence/mobile-preferences";

/** The preference fields the appearance provider reads, kept in one stable snapshot. */
export interface AppearancePreferencesSnapshot {
  readonly isReady: boolean;
  readonly baseFontSize: Preferences["baseFontSize"];
  readonly markdownFontSize: Preferences["markdownFontSize"];
  readonly terminalFontSize: Preferences["terminalFontSize"];
  readonly codeFontSize: Preferences["codeFontSize"];
  readonly codeWordBreak: Preferences["codeWordBreak"];
  readonly androidNavigationStyle: Preferences["androidNavigationStyle"];
  readonly themeMode: Preferences["themeMode"];
  readonly themeId: Preferences["themeId"];
  readonly lightThemeId: Preferences["lightThemeId"];
  readonly darkThemeId: Preferences["darkThemeId"];
  readonly mathRenderingEnabled: Preferences["mathRenderingEnabled"];
  readonly fontId: Preferences["fontId"];
  readonly monoFontId: Preferences["monoFontId"];
}

export function selectAppearancePreferences(
  result: AsyncResult.AsyncResult<Preferences, never>,
): AppearancePreferencesSnapshot {
  const isReady = AsyncResult.isSuccess(result);
  const preferences = isReady ? result.value : null;
  return {
    isReady,
    baseFontSize: preferences?.baseFontSize,
    markdownFontSize: preferences?.markdownFontSize,
    terminalFontSize: preferences?.terminalFontSize,
    codeFontSize: preferences?.codeFontSize,
    codeWordBreak: preferences?.codeWordBreak,
    androidNavigationStyle: preferences?.androidNavigationStyle,
    themeMode: preferences?.themeMode,
    themeId: preferences?.themeId,
    lightThemeId: preferences?.lightThemeId,
    darkThemeId: preferences?.darkThemeId,
    mathRenderingEnabled: preferences?.mathRenderingEnabled,
    fontId: preferences?.fontId,
    monoFontId: preferences?.monoFontId,
  };
}

export function appearancePreferencesSnapshotsEqual(
  left: AppearancePreferencesSnapshot,
  right: AppearancePreferencesSnapshot,
): boolean {
  return (
    left.isReady === right.isReady &&
    left.baseFontSize === right.baseFontSize &&
    left.markdownFontSize === right.markdownFontSize &&
    left.terminalFontSize === right.terminalFontSize &&
    left.codeFontSize === right.codeFontSize &&
    left.codeWordBreak === right.codeWordBreak &&
    left.androidNavigationStyle === right.androidNavigationStyle &&
    left.themeMode === right.themeMode &&
    left.themeId === right.themeId &&
    left.lightThemeId === right.lightThemeId &&
    left.darkThemeId === right.darkThemeId &&
    left.mathRenderingEnabled === right.mathRenderingEnabled &&
    left.fontId === right.fontId &&
    left.monoFontId === right.monoFontId
  );
}
