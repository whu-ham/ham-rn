/**
 * Global Jest setup.
 *
 * Everything here is a default that individual tests can override with
 * `jest.mock(...)` or by calling the exported helpers.
 *
 * NOTE: @testing-library/react-native v14's `render`, `fireEvent` and
 * `renderHook` are ASYNC — they return Promises. Every call must be awaited:
 *
 *     await render(<MyComponent />);
 *     await fireEvent.press(screen.getByTestId('x'));
 *
 * Without the await, `render` resolves to an empty object, no query functions
 * are registered, and the global `screen` throws
 * "`render` function has not been called".
 */
import '@testing-library/react-native/matchers';

// `react-native-safe-area-context` renders `RNCSafeAreaProvider` with no
// children under Jest (it waits for native layout measurements that never
// arrive), which makes the whole subtree unassertable. Render children
// directly instead.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    SafeAreaProvider: ({children}: {children: unknown}) => children,
    SafeAreaConsumer: ({children}: {children: (inset: unknown) => unknown}) =>
      children({top: 0, bottom: 0, left: 0, right: 0}),
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  };
});

// TurboModules are backed by native code that does not exist in Jest, and the
// specs call `getEnforcing`, which throws on a missing module. Default every
// spec to a jest.fn()-backed stub; tests override per-case.
jest.mock('@/modules/NativeLog', () => ({
  __esModule: true,
  default: {i: jest.fn(), e: jest.fn()},
}));

jest.mock('@/modules/NativeCommonModule', () => {
  const onLocaleChanged = jest.fn(() => ({remove: jest.fn()}));
  return {
    __esModule: true,
    default: {
      openUrl: jest.fn(),
      showToast: jest.fn(),
      getLocale: jest.fn(() => 'zh'),
      onLocaleChanged,
    },
  };
});

jest.mock('@/modules/NativeCasModule', () => ({
  __esModule: true,
  default: {requestCasCookie: jest.fn(() => '')},
}));

jest.mock('@/modules/NativeCasMobileLoginModule', () => ({
  __esModule: true,
  default: {onRequestSuccess: jest.fn()},
}));

jest.mock('@/modules/NativeEducationModule', () => ({
  __esModule: true,
  default: {
    onGetCourseList: jest.fn(),
    onGetScoreList: jest.fn(),
    getCourseConfig: jest.fn(() => ({year: 0, semester: 0})),
  },
}));

jest.mock('@/modules/NativeScoreCalcModule', () => {
  const onSetScoreJsCalcItem = jest.fn(() => ({remove: jest.fn()}));
  return {
    __esModule: true,
    default: {
      getCurrentCalc: jest.fn(() => ''),
      selectCalc: jest.fn(() => true),
      openDetail: jest.fn(),
      testItem: jest.fn(() => true),
      onSetScoreJsCalcItem,
    },
  };
});

// `react-native-webview` pulls in three native modules at import time. Only
// the module registry is stubbed here, so the WebView component itself still
// renders and tests can assert on its props. Tests that do not want a real
// WebView in the tree should mock the whole `react-native-webview` package.
jest.mock('react-native-webview/lib/NativeRNCWebViewModule', () => ({
  __esModule: true,
  default: {
    onShouldStartLoadWithRequest: jest.fn(),
    isFileUploadSupported: jest.fn(() => Promise.resolve(true)),
  },
}));

jest.mock('react-native-webview/lib/RNCWebViewNativeComponent', () => {
  const react = require('react');
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: react.forwardRef((props: unknown, ref: unknown) =>
      react.createElement(View, {...(props as object), ref}),
    ),
  };
});

// `@preeternal/react-native-cookie-manager` resolves a native module at import
// time, which `index.js` reaches through the CAS login view.
jest.mock('@preeternal/react-native-cookie-manager', () => ({
  __esModule: true,
  default: {
    clearAll: jest.fn(() => Promise.resolve(true)),
    getAll: jest.fn(() => Promise.resolve({})),
    get: jest.fn(() => Promise.resolve({})),
    set: jest.fn(() => Promise.resolve(true)),
  },
}));

// `@hot-updater/react-native` also resolves a native module at import time.
// `wrap` is identity so the wrapped component renders unmodified; tests that
// care about update behaviour should override this mock locally.
jest.mock('@hot-updater/react-native', () => ({
  HotUpdater: {
    wrap: () => (component: unknown) => component,
    addListener: jest.fn(() => jest.fn()),
    getChannel: jest.fn(() => 'test'),
    getAppVersion: jest.fn(() => '0.0.1'),
    isUpdateDownloaded: jest.fn(() => false),
    getFingerprintHash: jest.fn(() => 'test-fingerprint'),
    runUpdateProcess: jest.fn(() => Promise.resolve(false)),
  },
}));
