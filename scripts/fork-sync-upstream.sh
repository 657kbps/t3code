#!/usr/bin/env bash
# Sync this fork with upstream. Run it on the branch that carries the fork's own
# work (customized); `main` stays an exact mirror of upstream.
#
# Upstream edits .github/workflows constantly, so after deleting them here every
# sync reports a modify/delete conflict for each file it touched. "Deleted by us"
# is the answer for all of those; every other conflict is left for you.
set -euo pipefail

upstream="${1:-upstream}"
branch="${2:-main}"
fork_workflow=".github/workflows/fork-release.yml"

if [[ "$(git rev-parse --abbrev-ref HEAD)" == "main" ]]; then
  echo "warning: you are on main, which mirrors upstream; switch to the fork branch first." >&2
fi

# Only fork-release.yml may run. Upstream's workflows arrive enabled, so they are
# turned off before main is pushed; a workflow that arrives with the push is
# caught afterwards, and any run that started anyway is cancelled.
disable_upstream_workflows() {
  command -v gh >/dev/null 2>&1 || {
    echo "warning: gh is missing; upstream workflows stay enabled." >&2
    return 0
  }
  # Every id is disabled, not just the ones reporting "active": the API answers
  # with stale or truncated pages often enough to miss one. Disabling twice is a
  # no-op that exits nonzero, which the loop ignores.
  local ids="unreachable" attempt
  for attempt in 1 2 3 4 5 6 7 8; do
    if ids="$(gh workflow list --all --json id,path \
      --jq ".[] | select(.path != \"$fork_workflow\") | .id" 2>/dev/null)"; then
      break
    fi
    sleep 5
  done
  if [ "$ids" = "unreachable" ]; then
    echo "warning: could not list workflows; check them in the Actions tab." >&2
    return 0
  fi
  while read -r id; do
    [ -n "$id" ] || continue
    gh workflow disable "$id" >/dev/null 2>&1 && echo "disabled workflow $id"
  done <<< "$ids" || true
}

cancel_main_runs() {
  command -v gh >/dev/null 2>&1 || return 0
  gh run list --branch main --limit 50 --json databaseId,status \
    --jq '.[] | select(.status == "queued" or .status == "in_progress") | .databaseId' 2>/dev/null |
    while read -r run; do
      [ -n "$run" ] || continue
      gh run cancel "$run" >/dev/null 2>&1 && echo "cancelled run $run on main"
    done || true
}

git fetch --prune "$upstream" "$branch"
disable_upstream_workflows

# Fast-forward only: if main carries commits upstream does not, say so instead of
# clobbering them.
if git push origin "${upstream}/${branch}:refs/heads/main"; then
  echo "main now mirrors ${upstream}/${branch}."
  cancel_main_runs
else
  echo "warning: main did not fast-forward; it holds commits upstream does not." >&2
fi

if git merge --no-edit "${upstream}/${branch}"; then
  echo "Merged ${upstream}/${branch} with no conflicts."
  exit 0
fi

while IFS= read -r path; do
  [ -n "$path" ] || continue
  git rm -q -f -- "$path"
  echo "kept deleted: $path"
done < <(git diff --name-only --diff-filter=DU)

if git diff --name-only --diff-filter=U | grep -q .; then
  echo >&2
  echo "Unresolved conflicts remain:" >&2
  git diff --name-only --diff-filter=U >&2
  echo "Resolve them, then: git commit --no-edit" >&2
  exit 1
fi

git commit --no-edit
echo "Merged ${upstream}/${branch}."

# Upstream adds workflows regularly; a new file arrives without a conflict and
# would start running here.
arrived="$(git ls-files '.github/workflows/*.yml' | grep -v "^${fork_workflow}$" || true)"
if [ -n "$arrived" ]; then
  echo
  echo "New workflows arrived from upstream (disable them, or delete them here):"
  echo "$arrived" | sed 's|^|  |'
fi
