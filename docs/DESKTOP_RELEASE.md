# WordTree Desktop Release

WordTree can be packaged as a local desktop app with Electron. The app still runs fully locally and does not require a backend server.

## One-Time Setup

Install Node.js, then install the desktop packaging dependencies:

```bash
npm install
```

On macOS, generate the app icon before building:

```bash
chmod +x scripts/create-mac-icon.sh
npm run desktop:icon
```

## Development Preview

```bash
npm run desktop:start
```

This opens WordTree as a desktop window using the same local files as the browser demo.

## Build Installers

macOS installer with an installation wizard:

```bash
npm run desktop:dist:mac
```

This creates a `.pkg` file in `dist/`. The `.pkg` file is the macOS installer wizard format.

Optional macOS installer plus DMG:

```bash
npm run desktop:dist:mac:all
```

Windows installer with an installation wizard:

```bash
npm run desktop:dist:win
```

This creates an `.exe` installer in `dist/`.

## GitHub Release Flow

1. Run `npm run validate`.
2. Build the installer for the target system.
3. Create a GitHub Release, for example `v1.0.0`.
4. Upload the generated files from `dist/`.
5. Users download the installer from the Release page and install WordTree locally.

## Notes

- The macOS `.pkg` target provides the installer wizard experience.
- The `.dmg` target provides the common drag-to-Applications installation style.
- The Windows `.exe` target uses NSIS with a selectable installation directory.
- Practice records are stored locally in the app's browser storage on the user's machine.
