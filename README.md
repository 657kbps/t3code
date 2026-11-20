# T3 Code (personal fork)

My own fork of [T3 Code](https://github.com/pingdotgg/t3code), a minimal GUI for coding
agents. It exists so I can carry a few local modifications and build my own installers.
Nothing here is meant for anyone else.

- Upstream project: <https://github.com/pingdotgg/t3code>
- Docs: [docs/README.md](docs/README.md) — still the upstream docs
- License: [MIT](LICENSE)

## What differs from upstream

This fork keeps no CI. Every upstream workflow is deleted, and
`.github/workflows/fork-release.yml` is the only one left. On dispatch it reads the
version from the manifests, tags `v<version>-fork.<n>`, and attaches to a GitHub
Release:

- desktop installers for linux x64 (rpm), windows x64 (nsis) and macOS arm64 (dmg)
- the `t3` CLI archives for linux x64 and macOS arm64, plus `SHA256SUMS` for `t3 update`
- an Android APK for arm64-v8a

Nothing runs on push, and no release ever writes a version number into a tracked file.

## Sync and release

```bash
./scripts/fork-sync-upstream.sh
```

Merges `upstream/main`, keeping this fork's deletions deleted. Then run **Fork release**
in the Actions tab. [AGENTS.md](AGENTS.md) explains both, why the version is never
committed here, and which local patches upstream edits will conflict with.

## Install on Fedora

The rpm is served from a dnf repository built from the release:

```bash
sudo tee /etc/yum.repos.d/t3code.repo >/dev/null <<'EOF'
[t3code]
name=T3 Code (personal fork)
baseurl=https://657kbps.github.io/t3code/
enabled=1
gpgcheck=0
EOF
sudo dnf install t3
```

`t3 update` reads this fork's releases, so the CLI updates itself from here.
