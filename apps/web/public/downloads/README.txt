# Downloads Folder

Current environment lacks Xcode tools to build the native installers (`.dmg`, `.msi`).

**Instructions for Release:**
1. Run `pnpm build:enterprise` on a machine with Xcode installed.
2. Copy the resulting artifacts from `apps/sidecar/dist/installers` to this folder.
3. Rename them to:
   - `sidecar-installer-universal.dmg`
   - `sidecar-installer-x64.msi`
