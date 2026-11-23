import { useAtomValue } from "@effect/atom-react";
import { AsyncResult, Atom } from "effect/reactivity";

import { mobilePreferencesAtom, saveMobilePreferences } from "../../state/preferences";
import { useAtomCommand } from "../../state/use-atom-command";

type PreferencesResult = Atom.Type<typeof mobilePreferencesAtom>;

// A toggle's optimistic patch, its saved copy and every unrelated preference write replace the
// atom value; selecting one flag keeps them from re-rendering the list that reads it.
const selectLoaded = (result: PreferencesResult) => AsyncResult.isSuccess(result);
const selectSnoozedShelfExpanded = (result: PreferencesResult) =>
  AsyncResult.isSuccess(result) && result.value.threadListSnoozedShelfExpanded === true;
const selectSettledShelfExpanded = (result: PreferencesResult) =>
  AsyncResult.isSuccess(result) && result.value.threadListSettledShelfExpanded === true;
const selectWorkingShelfEnabled = (result: PreferencesResult) =>
  AsyncResult.isSuccess(result) && result.value.workingShelfEnabled !== false;
const selectWorkingShelfExpanded = (result: PreferencesResult) =>
  AsyncResult.isSuccess(result) && result.value.threadListWorkingShelfExpanded === true;

export function useThreadListV2ShelfPreferences() {
  const savePreferences = useAtomCommand(saveMobilePreferences);
  const loaded = useAtomValue(mobilePreferencesAtom, selectLoaded);
  const snoozedShelfExpanded = useAtomValue(mobilePreferencesAtom, selectSnoozedShelfExpanded);
  const settledShelfExpanded = useAtomValue(mobilePreferencesAtom, selectSettledShelfExpanded);
  const workingShelfEnabled = useAtomValue(mobilePreferencesAtom, selectWorkingShelfEnabled);
  const workingShelfExpanded = useAtomValue(mobilePreferencesAtom, selectWorkingShelfExpanded);

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
