# T3 Code (personal fork)

My own fork of [T3 Code](https://github.com/pingdotgg/t3code), a minimal GUI for coding
agents. It exists so I can carry a few local modifications and build my own installers.
Nothing here is meant for anyone else.

- Upstream project: <https://github.com/pingdotgg/t3code>
- Docs: [docs/README.md](docs/README.md) — still the upstream docs
- License: [MIT](LICENSE)

## What differs from upstream

This fork keeps no CI. Every upstream workflow is deleted, and
`.github/workflows/fork-release.yml` is the only one left: on dispatch it reads the
version from the manifests, tags `v<version>-fork.<n>`, builds desktop installers, and
attaches them to a GitHub Release. Nothing runs on push, and no release ever writes a
version number into a tracked file.

## Sync and release

```bash
./scripts/fork-sync-upstream.sh
```

Merges `upstream/main`, keeping this fork's deletions deleted. Then run **Fork release**
in the Actions tab. [AGENTS.md](AGENTS.md) explains both, and why the version is never
committed here.
