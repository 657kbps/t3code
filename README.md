# T3 Code (personal fork)

My own fork of [T3 Code](https://github.com/pingdotgg/t3code), a minimal GUI for coding
agents. It exists so I can carry a few local modifications and cut my own releases.
Nothing here is meant for anyone else.

- Upstream project: <https://github.com/pingdotgg/t3code>
- Docs: [docs/README.md](docs/README.md) — still the upstream docs
- License: [MIT](LICENSE)

## What differs from upstream

This fork keeps no CI. Every upstream workflow is deleted, and
`.github/workflows/fork-release.yml` is the only one that runs — upstream's are
disabled, so a sync cannot start one. On dispatch it reads the version from the
manifests, tags `v<version>-fork.<n>`, and attaches to a GitHub Release:

- the `t3` CLI archives for linux x64 and macOS arm64, plus `SHA256SUMS` for `t3 update`
- an Android APK for arm64-v8a

It builds no desktop installers.

Nothing runs on push, and no release ever writes a version number into a tracked file.

## Branches

- `main` mirrors upstream `main` and carries nothing of ours.
- `customized` (default) is where this fork lives, and where releases are cut from.

## Sync and release

```bash
git switch customized
git fetch upstream main
git merge upstream/main
```

[docs/operations/fork-changes.md](docs/operations/fork-changes.md) is what a merge has
to keep, and [AGENTS.md](AGENTS.md) explains why the version is never committed here.
