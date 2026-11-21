# T3 Code (personal fork)

My own fork of [T3 Code](https://github.com/pingdotgg/t3code), a minimal GUI for coding
agents. It exists so I can carry a few local modifications and build my own installers.
Nothing here is meant for anyone else.

- Upstream project: <https://github.com/pingdotgg/t3code>
- Docs: [docs/README.md](docs/README.md) — still the upstream docs
- License: [MIT](LICENSE)

## What differs from upstream

This fork keeps no CI. Every upstream workflow is deleted, and
`.github/workflows/fork-release.yml` is the only one that runs — upstream's are
disabled, so a sync cannot start one. On dispatch it reads the version from the
manifests, tags `v<version>-fork.<n>`, and attaches to a GitHub Release:

- desktop installers for linux x64 (rpm), windows x64 (nsis) and macOS arm64 (dmg)
- the `t3` CLI archives for linux x64 and macOS arm64, plus `SHA256SUMS` for `t3 update`
- an Android APK for arm64-v8a

Nothing runs on push, and no release ever writes a version number into a tracked file.

## Branches

- `main` mirrors upstream `main` and carries nothing of ours.
- `customized` (default) is where this fork lives, and where releases are cut from.

## Sync and release

```bash
git switch customized
./scripts/fork-sync-upstream.sh
```

Fast-forwards `main` to upstream, then merges `upstream/main` into `customized`
keeping this fork's deletions deleted. Then run **Fork release** in the Actions tab.
[AGENTS.md](AGENTS.md) explains both, why the version is never committed here, and
which local patch upstream edits will conflict with.

## Install on Fedora

```bash
sudo dnf install https://github.com/657kbps/t3code/releases/download/v0.1.11-fork.2/T3-Code-0.1.11-fork.2-x86_64.rpm
```

There is no package repository: GitHub refuses any file over 100 MB, and the rpm is
163 MB. `t3 update` reads this fork's releases, so the CLI updates itself from here.
