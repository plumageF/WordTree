# WordTree Android

WordTree now includes a Capacitor Android wrapper. The app still uses the existing local HTML/CSS/JS vocabulary experience, but it can be opened and debugged as a native Android project.

## Prerequisites

Install Android Studio, then install:

- Android SDK Platform
- Android SDK Build-Tools
- Android Emulator
- Android SDK Platform-Tools

Create one Android Virtual Device in Android Studio:

```text
Android Studio -> Device Manager -> Create Virtual Device
```

Recommended first emulator:

```text
Pixel 7 / API 35 or newer
```

## Prepare Android Project

```bash
npm install
npm run android:sync
npm run android:icon
```

The sync command copies the current web app into `www/`, then syncs it into the Android project.
The icon command refreshes Android launcher icons from `assets/wordtree-logo.png`.

## Open Debug Window

```bash
npm run android:open
```

Android Studio will open the `android/` project. Start the emulator from Device Manager, then click Run.

If `adb` and `emulator` are available in your shell, you can also run:

```bash
npm run android:run
```

## Build APK

From Android Studio:

```text
Build -> Build Bundle(s) / APK(s) -> Build APK(s)
```

Or from terminal after Android SDK is configured:

```bash
cd android
./gradlew assembleDebug
```

The debug APK will be generated under:

```text
android/app/build/outputs/apk/debug/
```

## Notes

- `www/` is generated and intentionally ignored by Git.
- Update the source files in the project root, then run `npm run android:sync` again.
- Practice records stay local to the installed app's WebView storage.
- The current desktop `.pkg` release is separate from Android APK output.
