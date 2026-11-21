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

git fetch --prune "$upstream" "$branch"

if [[ "$(git rev-parse --abbrev-ref HEAD)" == "main" ]]; then
  echo "warning: you are on main, which mirrors upstream; switch to the fork branch first." >&2
fi

# Fast-forward only: if main carries commits upstream does not, say so instead of
# clobbering them.
if git push origin "${upstream}/${branch}:refs/heads/main"; then
  echo "main now mirrors ${upstream}/${branch}."
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
arrived="$(git ls-files '.github/workflows/*.yml' | grep -v '^\.github/workflows/fork-release\.yml$' || true)"
if [ -n "$arrived" ]; then
  echo
  echo "New workflows arrived from upstream (this fork keeps only fork-release.yml):"
  echo "$arrived" | sed 's|^|  |'
fi
