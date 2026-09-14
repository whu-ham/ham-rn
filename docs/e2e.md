# End-to-end testing

## Scope

The e2e suite exercises the **debug shell** in `ios/` and `android/`, not the
real ham-ios / ham-android host apps. It proves the RN bundle boots inside a
native container and that the score calculator screen renders — the
integration between the bundled JS and the native host. It does not prove
behaviour of the shipped app.

Flows run against a **Release** build, so the bundle is embedded in the app and
no Metro server is involved. See [Build Release, not Debug](#build-release-not-debug).

What each screen actually renders is worth knowing before writing assertions:
`RNCommon` renders an empty `<View />`, and `RNFetchCourseView` /
`RNFetchScoreView` show only a spinner before calling back into native code.
Only `RNScoreCalcView` has meaningful UI to assert on. See
[What is worth testing](#what-is-worth-testing).

## Prerequisites

### Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME"/.maestro/bin
maestro --version
```

### Build Release, not Debug

This matters more than anything else here, and it is not obvious.

In a Debug build, the app does not contain a JS bundle — it expects a Metro
server to serve one:

- **iOS**: `react-native-xcode.sh` skips bundling for Debug + Simulator builds
  ("Skipping bundling in Debug for the Simulator since the packager bundles for
  you"), and `AppDelegate.mm`'s `#if DEBUG` branch returns
  `jsBundleURLForBundleRoot`, i.e. a `localhost:8081` URL.
- **Android**: the RN Gradle plugin skips bundling for `debuggableVariants`
  (default: `debug`), and `RNContainer.kt` runs with
  `useDevSupport = BuildConfig.DEBUG`, also looking for a packager.

So a Debug app with no Metro running shows a **blank screen** — every
`assertVisible` times out, and the failure looks like a flow problem rather
than a missing bundle.

Build Release instead. Release embeds `main.jsbundle` / the release APK bundle
and needs no packager at all:

```bash
# iOS
pnpm embed
cd ios && pod install && cd ..
xcodebuild -workspace ios/ham-rn.xcworkspace -scheme ham-rn \
  -sdk iphonesimulator -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath ios/build/e2e build \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""

# Android — release is already signed with the checked-in debug keystore,
# so no extra secrets are needed
pnpm embed
cd android && ./gradlew assembleRelease --no-daemon
```

`pnpm ios` / `pnpm android` build **Debug** and are not what you want here.

Maestro drives an already-installed app; it does not build or install one.
Install the Release build yourself before running flows.

### CI runners, and the Android ABI trap

The two e2e jobs deliberately run on different operating systems:

- **iOS on `macos-15`** — the simulator needs Xcode.
- **Android on `ubuntu-latest`** — Linux runners expose `/dev/kvm`, so the
  emulator gets hardware acceleration. macOS runners have none, and the same
  emulator falls back to software rendering and Maestro times out waiting for
  the app. The workflow enables KVM group permissions before the emulator
  starts; without that step the runner user cannot open `/dev/kvm`.

On Android the **APK's ABI must match the emulator**. `android/gradle.properties`
sets `reactNativeArchitectures=arm64-v8a`, so `assembleRelease` produces an
arm64-only APK by default. Installing that on the x86_64 emulator CI used to
run crashed the app in `MainApplication.onCreate`:

```
SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so
```

The app dies before any RN content renders, so every assertion times out and
the failure looks like a flow problem rather than an ABI mismatch. The workflow
passes `-PreactNativeArchitectures=x86_64` to override the gradle property for
the e2e build only, leaving the arm64 default intact for the other Android
workflows. If you ever switch the emulator to `arm64-v8a`, drop the override.

## Running

CI runs only the scorecalc flow, on both platforms. See
[What is worth testing](#what-is-worth-testing) for why smoke is excluded, and
[Known instability](#known-instability-across-repeated-runs) for what to expect
if you run flows repeatedly by hand.

```bash
# iOS (simulator must already be running, Release app already installed)
maestro test .maestro/ios/scorecalc.yaml

# Android (emulator must already be running, release APK already installed)
maestro test .maestro/android/scorecalc.yaml

# The whole directory, if you want the smoke flows too (expect smoke to fail —
# see "Why there is no 'every screen boots' smoke flow")
maestro test .maestro/ios/
```

Pass `--device <udid>` to target a specific simulator; without it Maestro picks
one, which is fragile when several are booted.

```bash
maestro test --device "$(xcrun simctl list devices | grep -i booted | grep -oE '[0-9A-F-]{36}' | head -1)" \
  .maestro/ios/scorecalc.yaml
```

Set `MAESTRO_DRIVER_STARTUP_TIMEOUT` if the app takes longer than the default
to boot on a cold simulator.

## Writing flows

### The debug shell is English, the RN content is not

The shell's navigation labels are hardcoded English (`ios/ham-rn/HomeView.swift`
and `android/.../HomeActivity.kt`): `CasMobileLoginView`, `RNFetchCourseView`,
`RNFetchScoreView`, `RNScoreCalcView`, `RNCommon`.

The RN screens render through i18next. Which language you get depends on
`NativeCommonModule.getLocale()`, a native module reading the device locale.
That means the language **varies per device** and is not something a flow can
pin — so avoid asserting on translated copy entirely.

The only safe anchors are the two things that never change:

- the shell's navigation labels (hardcoded English in `HomeView.swift` /
  `HomeActivity.kt`), and
- `RNScoreCalcView`'s two script titles, which are hardcoded Chinese in
  `src/business/education/scorecalc/fetch.ts` regardless of locale.

This is why the flows do not assert `'Loading'`, `'In use'`, or any other
i18next string: they would pass on one machine and fail on another.

### Prefer `id` over `text` where the shell exposes it

Android Compose screens can expose `Modifier.testTag`; the debug shell does not
currently set any, so both platforms fall back to text matching. Text matching
is brittle against copy changes — if you add a tag, prefer `id:` in the flow.

### `assertVisible` has no timeout — use `extendedWaitUntil` to wait

`assertVisible` takes **only a selector**. There is no `timeout` property; the
command retries for a fixed ~7 seconds and then fails. This is easy to get
wrong, and the error is unhelpful:

```
Unknown Property: timeout at .maestro/ios/scorecalc.yaml:-1:-1
```

7 seconds is not reliably enough for a cold RN bundle launch, so anything that
has to wait for RN content should use `extendedWaitUntil`, which does take a
`timeout`:

```yaml
- extendedWaitUntil:
    visible: '计算机学院综测计算（F2）'
    timeout: 60000      # iOS: 60s; use 120s on Android, emulators are slower
```

Use `assertVisible` for things that are already on screen, and
`extendedWaitUntil` for anything that appears after a tap or a bundle launch.

On Android, `extendedWaitUntil` also scrolls while searching, so it replaces an
explicit `scrollUntilVisible` for elements below the fold.

Longer timeouts make each step more patient — but they do **not** fix the
simulator degrading across repeated runs. See
[Known instability](#known-instability-across-repeated-runs).

### Do not rely on pinning the simulator language

```bash
xcrun simctl spawn booted defaults write -g AppleLanguages '("en")'
```

This sets the OS-level language, but it does **not** change what i18next picks:
`NativeCommonModule.getLocale()` ignores it. Do not add assertions that depend
on it working. (CI no longer runs this step at all.)

## What is worth testing

| Screen | Worth an e2e flow? | Why |
|---|---|---|
| `RNScoreCalcView` | **Yes** | The only screen with real UI: script list, select/upgrade buttons, and the developer debug card. Its two script titles are hardcoded Chinese, so the assertions hold regardless of locale. This is the only flow CI runs. |
| `RNCasMobileLoginView` | Partially | Loads `cas.whu.edu.cn` in a WebView. Without test credentials you can only assert that the WebView loads, not that login works. |
| `RNFetchCourseView` | No | Renders a spinner, then calls back into native. There is no UI to assert beyond "it did not crash" — and see the note below about why even that does not work. |
| `RNFetchScoreView` | No | Same as above. |
| `RNCommon` | No | Renders an empty `<View />`; it only logs and subscribes to native events. |

### Why there is no "every screen boots" smoke flow

`smoke.yaml` exists on both platforms but is **not** wired into CI, and cannot
be until the debug shell changes.

It taps into each registered screen, presses back, and asserts the shell's list
is still there. That assertion fails: after pushing any RN screen and going
back, the native list renders empty. This was reproduced with `RNCommon` alone,
which makes no network calls at all, so it is not a network or login problem —
the RN container does not come back cleanly after being popped.

If you run the flows by hand and want the smoke check anyway, run it on its own
after a clean install, and expect it to fail on the shell-survives assertion.
Fixing it means changing how the shell hosts RN screens, which is out of scope
for the e2e setup.

Deep behavioural coverage belongs in the Jest suite (`pnpm test`), which can
mock the native modules — e2e cannot. Use e2e for "the bundle boots and the
screen renders in a real native container", and Jest for everything else.

## Known instability across repeated runs

**The flows pass on a settled device, but degrade when you run them repeatedly.**
Measured on a local macOS simulator, running the same flow back to back with no
cooldown:

```
run1: 5/5 steps COMPLETED
run2: 2/5
run3: 3/5
run4: 0/5
-- ~20s cooldown --
single run: 5/5 COMPLETED
```

This does **not** affect CI: each job runs exactly once on a fresh runner,
which is the settled-device case. Both e2e jobs pass there (iOS ~16m,
Android ~9m), so they gate the merge. `continue-on-error` was set initially
because of the local numbers above; it was removed once CI proved stable. If
the jobs start failing intermittently on CI, investigate rather than
re-adding `continue-on-error` — a non-blocking job is one nobody has to act on.

Two failure shapes when running locally, both environment-level, not flow bugs:

- `launchApp` fails outright with
  `FBSOpenApplicationServiceErrorDomain, code=4` — the simulator cannot open the
  app at all. Note this is also the error you get when the app was never
  installed; check `simctl get_app_container booted <bundle-id>` before
  assuming it is simulator wear.

What is *not* the cause: it is not a network problem, and it is not the wait
timeout. `extendedWaitUntil` with a 60s timeout does not prevent it. Repeated
cold launches of an RN app is what wears the simulator down. (An earlier claim
in this file that timeouts fixed the flake was wrong — that measurement had a
buggy pass/fail check. The data above supersedes it.)

> Note the `code=4` error has two distinct causes with the same message — app not
> installed, or simulator degraded. They are easy to confuse. Check install first:
> it is the cheaper one to rule out.

## CI setup, and the two traps that cost the most time

Both jobs failed when first added, for two separate reasons worth recording,
because neither error message pointed at the actual cause:

1. **The app was never installed.** `xcodebuild build` produces a `.app` and
   does not install it, and `simulator-action` only boots the device. Maestro
   then failed at `launchApp` with `FBSOpenApplicationServiceErrorDomain
   code=4`, which reads like a launch bug. Fixed with an explicit
   `xcrun simctl install <udid> <app>` step, and `--device <udid>` on Maestro
   so it targets that device instead of resolving `booted`.

2. **The Android APK ABI did not match the emulator.** `gradle.properties` sets
   `reactNativeArchitectures=arm64-v8a`, so `assembleRelease` produced an
   arm64-only APK. Installing it on the x86_64 emulator crashed in
   `MainApplication.onCreate` with `SoLoaderDSONotFoundError: couldn't find DSO
   to load: libreactnative.so`, before any RN content rendered, so every
   assertion timed out. Fixed with `-PreactNativeArchitectures=x86_64`.

Also: the concurrency group must include `github.job`, or the two jobs share
one group and whichever starts second cancels the first — both reported
`cancelled` after ~9m, before Maestro ever ran.

Practically:

- Run a flow once, on a settled device, and treat that result as meaningful.
- If you need several runs, let the device cool down between them. Do not read a
  run that follows another immediately.
- If `launchApp` fails, check the app is actually still installed
  (`xcrun simctl get_app_container booted <bundle-id>`). Repeated runs can drop
  it from the device; reinstall, or shut the simulator down and boot it again
  before retrying.
- If `simctl list` shows a device as `Booted` but `get_app_container` resolves
  to a different device UDID, the simulator's state is confused. `killall -9 Simulator`,
  `xcrun simctl shutdown all`, then boot one device explicitly and pass
  `--device <udid>` to Maestro rather than relying on `booted`.

## Troubleshooting

**Every `assertVisible` times out and the screen is blank.** You are running a
Debug build with no Metro server. Debug builds contain no JS bundle on either
platform — see
[Build Release, not Debug](#build-release-not-debug). Confirm Metro really is
not masking this: `lsof -nP -iTCP:8081 -sTCP:LISTEN`. If something is listening
on 8081, a stale packager may be feeding a Debug app, which hides the problem
locally and guarantees a CI failure.

**`maestro test` hangs on launch.** The app is not installed, or the last
build predates your changes. Rebuild and reinstall the Release build, then
retry.

**The app runs fine by hand but the flow cannot find any text.** Stale app on
the device. `xcrun simctl uninstall booted <bundle-id>`, reinstall, retry.
Maestro attaches to whatever is installed and will not reinstall for you.

**Text assertions fail on iOS but pass on Android** (or vice versa). The two
shells use different navigation stacks — SwiftUI `NavigationLink` on iOS and
Compose Navigation on Android — so timing and scroll behaviour differ. Add an
`assertVisible` for the home screen before tapping through.

**iOS: RN `testID` is not visible to Maestro.** Maestro reads the native
accessibility tree, and on iOS React Native's `testID` does not surface there.
Either match on text, or set `accessibilityLabel` on the component.

**Android: elements need scrolling into view.** Maestro scrolls automatically
on iOS; on Android, add an explicit `scrollUntilVisible` for anything below the
fold.
