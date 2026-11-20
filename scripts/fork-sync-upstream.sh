#!/usr/bin/env bash
# Merge upstream main into this fork, keeping this fork's deleted files deleted.
#
# Upstream edits .github/workflows constantly, so after deleting them here every
# sync reports a modify/delete conflict for each file it touched. "Deleted by
# us" is the answer for all of those; every other conflict is left for you.
set -euo pipefail

upstream="${1:-upstream}"
branch="${2:-main}"

git fetch --prune "$upstream" "$branch"
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
