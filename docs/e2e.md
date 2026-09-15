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

CI runs every flow in `.maestro/{ios,android}/` on both platforms:

| Flow | What it covers |
|---|---|
| `scorecalc.yaml` | The only screen with real, stable content — the bundled script list. |
| `ignored-course.yaml` | The course-import path, including the ignored-course notice. |
| `course-import-outcomes.yaml` | Every other way the import can end: clean, all-failed, empty, login failure. |
| `smoke.yaml` | Each registered entry launches with the embedded bundle. |

See [Testing the course flow](#testing-the-course-flow) for how the second and
third ones work without credentials, and
[Known instability](#known-instability-across-repeated-runs) for what to expect
if you run flows repeatedly by hand.

```bash
# iOS (simulator must already be running, Release app already installed)
maestro test .maestro/ios/

# Android (emulator must already be running, release APK already installed)
maestro test .maestro/android/

# A single flow
maestro test .maestro/ios/ignored-course.yaml
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
| `RNScoreCalcView` | **Yes** | The only screen with real UI: script list, select/upgrade buttons, and the developer debug card. Its two script titles are hardcoded Chinese, so the assertions hold regardless of locale. |
| `RNFetchCourseViewE2E` | **Yes** | Drives the course-import path with a canned payload, including the ignored-course notice, and every other branch of the same state machine via its `...E2E<Scenario>` siblings. See [Testing the course flow](#testing-the-course-flow). |
| `RNCasMobileLoginView` | Partially | Loads `cas.whu.edu.cn` in a WebView. Without test credentials you can only assert that the WebView loads, not that login works. |
| `RNFetchCourseView` | No | Renders a spinner, then calls back into native. There is no UI to assert beyond "it did not crash". Its e2e-named sibling covers the behaviour. |
| `RNFetchScoreView` | No | Renders a spinner, then calls back into native. |
| `RNCommon` | No | Renders an empty `<View />`; it only logs and subscribes to native events. |

### Testing the course flow

The flows have no credentials for `cas.whu.edu.cn` and cannot fabricate a CAS
session, so they cannot drive the real fetch. They also cannot intercept XHR —
Maestro has no network stubbing — so the fixture has to live inside the bundle.

`RNFetchCourseViewE2E` (registered in `index.js`, reachable from both debug
shells) installs `src/e2e/courseFixture.ts`, which patches `global.fetch` to
answer just two URLs and delegates everything else to the original. Every other
step is production code: real `loginEducation`, real `getCourseList`, real
`parseResponse` and `toNativeCoursePairing`, real notice. The fixture's payload
uses the education system's own shapes, including a week string the parser
cannot read (`全周`) and a course with no schedule at all — the two cases the
notice exists for.

#### One entry per branch

The import has six ways to end and they are distinguished **only** by what the
server returns, so a flow cannot reach them by interacting with the UI — it has
to launch a different canned payload. That means one AppRegistry entry per
branch, each with its own row in the debug shell:

| Entry | Payload | The branch it puts the machine in |
|---|---|---|
| `RNFetchCourseViewE2E` | 2 parse, 20 do not | Notice appears; acknowledging commits a timetable. |
| `...E2EClean` | 2 parse, 0 do not | No notice; the import completes on its own. |
| `...E2EAllFailed` | 0 parse, 20 do not | Notice appears; acknowledging reports an error. |
| `...E2EEmpty` | no courses at all | No notice; an empty timetable is a success. |
| `...E2ELoginFailed` | CAS answers without the success marker | Fails before any course is parsed. |

`src/e2e/courseImportEntries.tsx` builds them, and `__tests__/App.test.tsx`
asserts that each is registered **and** listed in both `HomeView.swift` and
`HomeActivity.kt` — a scenario in one list but not the other is unreachable by
Maestro, and the failure is a blank container rather than an error.

#### Seeing what the host was told

`EducationModule.onGetCourseList` is the only signal the host gets, and in the
debug shell it ends in `Log.i` / `NSLog` — which Maestro cannot read. So the
e2e entries also mount `src/e2e/courseImportProbe.tsx`, which wraps that module
method, records what it was called with, and renders `success` or `failed`.
Without it a flow could see the notice appear but never learn what the import
decided, and the four non-notice branches would be indistinguishable.

The verdict words are deliberately not i18next copy — see the rules below.

#### The probe sits below the course screen, and that is load-bearing

At the top of the screen the probe rendered correctly and
`adb shell uiautomator dump` listed it, but Maestro still judged it not
visible: on this device the status bar occupies y 0–63 and the probe landed at
y 10–47, i.e. underneath it. Maestro treats an occluded node as absent;
`uiautomator dump` does not, which is why the two disagreed and why the symptom
looked like the import never reported anything.

If you move the probe, keep it clear of the status bar and of the notice's own
layout.

Two rules for assertions in these flows, both verified rather than assumed:

- **Never select by `testID`.** RN's `testID` does not reach iOS's accessibility
  tree, so Maestro cannot see it. Anything a flow must select needs an
  `accessibilityLabel`; the dialog and its button carry them for this reason.
- **Never assert i18next copy.** The language comes from
  `NativeCommonModule.getLocale()`, which reads the device locale and ignores
  `defaults write -g AppleLanguages`. The flows assert on course names, which
  come from the fixture, not from a translation.

`__tests__/e2e/courseFixture.test.ts` pins the fixture's shape, because a
fixture that stopped producing ignored courses would leave the flow asserting
nothing while still passing.

### Why smoke does not navigate back

`smoke.yaml` used to tap into each registered screen, press back, and assert the
shell's list was still there. That assertion failed, and the flow could not go
in CI: after pushing any RN screen and going back, the native list renders
empty. This was reproduced with `RNCommon` alone, which makes no network calls
at all, so it is not a network or login problem — the RN container does not come
back cleanly after being popped.

So the flow reaches each screen with a fresh `launchApp` instead of navigating
back. That keeps the actual check — the entry boots with the embedded bundle —
without depending on a shell behaviour that is broken. Fixing the shell is the
real fix, and is still outstanding.

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
which is the settled-device case. `continue-on-error` was set initially
because of the local numbers above; it was removed once CI proved stable. If
the jobs start failing intermittently on CI, investigate rather than
re-adding `continue-on-error` — a non-blocking job is one nobody has to act on.

### The XCUITest driver sometimes never starts

A distinct failure mode, seen once on CI: Maestro logs

```
[Failed] Perform XCUITest driver status check on <udid>,
exception: java.net.ConnectException: Failed to connect to /127.0.0.1:<port>
```

repeated for ~2 minutes and then the job fails. **No flow runs at all** — there
are no `[Passed]`/`[Failed]` lines for individual flows, and the Maestro
artifact is uploaded by the `if: failure()` step rather than by a real
assertion. The driver never came up, so this says nothing about the app.

It is infrastructure, not a regression: re-running the same job on the same
commit passed with 3/3 flows. Check whether any flow ran before reading it as a
product failure — a log with no per-flow results is a driver problem, not a
broken screen.

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
