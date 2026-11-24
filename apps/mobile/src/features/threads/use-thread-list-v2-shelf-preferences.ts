import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";

import { mobilePreferencesAtom, saveMobilePreferences } from "../../state/preferences";
import { useAtomCommand } from "../../state/use-atom-command";

const SHELF_LOADED = 1 << 0;
const SNOOZED_EXPANDED = 1 << 1;
const SETTLED_EXPANDED = 1 << 2;
const WORKING_ENABLED = 1 << 3;
const WORKING_EXPANDED = 1 << 4;

export function useThreadListV2ShelfPreferences() {
  const flags = useAtomValue(mobilePreferencesAtom, (result) => {
    if (!AsyncResult.isSuccess(result)) return 0;
    const prefs = result.value;
    return (
      SHELF_LOADED |
      (prefs.threadListSnoozedShelfExpanded === true ? SNOOZED_EXPANDED : 0) |
      (prefs.threadListSettledShelfExpanded === true ? SETTLED_EXPANDED : 0) |
      (prefs.workingShelfEnabled !== false ? WORKING_ENABLED : 0) |
      (prefs.threadListWorkingShelfExpanded === true ? WORKING_EXPANDED : 0)
    );
  });
  const savePreferences = useAtomCommand(saveMobilePreferences);
  const loaded = (flags & SHELF_LOADED) !== 0;
  const snoozedShelfExpanded = (flags & SNOOZED_EXPANDED) !== 0;
  const settledShelfExpanded = (flags & SETTLED_EXPANDED) !== 0;
  const workingShelfEnabled = (flags & WORKING_ENABLED) !== 0;
  const workingShelfExpanded = (flags & WORKING_EXPANDED) !== 0;

  // Transforms read optimistic state so same-frame presses toggle twice.
  const toggleSnoozedShelf = () => {
    if (!loaded) return;
    void savePreferences({
      transform: (current) => ({
        threadListSnoozedShelfExpanded: current.threadListSnoozedShelfExpanded !== true,
      }),
    });
  };
  const toggleSettledShelf = () => {
    if (!loaded) return;
    void savePreferences({
      transform: (current) => ({
        threadListSettledShelfExpanded: current.threadListSettledShelfExpanded !== true,
      }),
    });
  };
  const toggleWorkingShelf = () => {
    if (!loaded) return;
    void savePreferences({
      transform: (current) => ({
        threadListWorkingShelfExpanded: current.threadListWorkingShelfExpanded !== true,
      }),
    });
  };

  return {
    loaded,
    settledShelfExpanded,
    snoozedShelfExpanded,
    workingShelfEnabled,
    workingShelfExpanded,
    toggleSettledShelf,
    toggleSnoozedShelf,
    toggleWorkingShelf,
  } as const;
}
