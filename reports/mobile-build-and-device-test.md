# Mobile build & real-device test attempt

## Scope
Request: export installation files (`.apk`/`.ipa`) and verify runtime flow on a real device.

## What was run

### 1) Android local build bootstrap
```bash
cd android && ./gradlew -v
```
Result: **failed** because Gradle wrapper could not download distribution from `services.gradle.org` due to proxy policy (`HTTP 403 Forbidden`).

### 2) iOS toolchain availability
```bash
xcodebuild -version
```
Result: **failed** (`xcodebuild: command not found`) because this environment is Linux and does not have Xcode.

### 3) EAS CLI availability
```bash
npx --no-install eas --version
```
Result: **failed** with npm registry access forbidden (`403`) so EAS build cannot be started from this runner.

## Conclusion
In this execution environment, it is **not possible** to produce `.apk/.ipa` artifacts nor run on a physical device because:
- outbound package/download endpoints are blocked by proxy policy,
- no iOS build toolchain (Xcode),
- no connected Android/iOS device.

## Exact commands to run on a dev machine/CI with proper access

### Android APK (debug) local
```bash
cd android
./gradlew assembleDebug
# APK output:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Android release APK/AAB (signed)
```bash
cd android
./gradlew assembleRelease
./gradlew bundleRelease
# Outputs:
# android/app/build/outputs/apk/release/app-release.apk
# android/app/build/outputs/bundle/release/app-release.aab
```

### iOS IPA (requires macOS + Xcode)
```bash
npx expo prebuild --platform ios
# open ios/*.xcworkspace in Xcode and archive/export IPA
```

### Real-device smoke test checklist
1. Install APK/IPA on device.
2. Launch app and verify startup/auth.
3. Test Chat AI send/receive.
4. Test CookAI voice control: start mic, next/back step, finish cooking.
5. Test image upload flows (Cloudinary env present).
6. Verify no crash in logs (adb logcat / Xcode Devices logs).
