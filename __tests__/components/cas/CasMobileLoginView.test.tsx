import React from 'react';
import {Appearance, Linking, Platform} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import CookieManager from '@preeternal/react-native-cookie-manager';
import type {Cookie} from '@preeternal/react-native-cookie-manager';
import CasMobileLoginView from '@/components/cas/CasMobileLoginView';
import CasMobileLoginModule from '@/modules/NativeCasMobileLoginModule';

/**
 * React 19 passes `ref` as a regular entry in `props` (which is frozen in
 * dev), so `testID` must be applied *after* the spread: a `testID` written
 * first would be silently overwritten by the component's own (undefined) one.
 */
jest.mock('react-native-webview', () => {
  const react = require('react');
  const {View} = require('react-native');
  return {
    WebView: (props: object) =>
      react.createElement(View, {...props, testID: 'webview'}),
  };
});

jest.mock('@preeternal/react-native-cookie-manager', () => ({
  __esModule: true,
  default: {
    clearAll: jest.fn(() => Promise.resolve(true)),
    getAll: jest.fn(() => Promise.resolve({})),
    get: jest.fn(() => Promise.resolve({})),
  },
}));

/**
 * The `Linking.openURL` typing resolves to `Promise<void>` in this RN version,
 * so the stub is supplied through `mockImplementation` rather than the
 * `mockResolvedValue(true)` shorthand.
 */
const spyOpenURL = () =>
  jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());

const CAS_MOBILE_LOGIN_URL =
  'https://cas.whu.edu.cn/authserver/mobile/auth?appId=985180443';
const PRIVACY_POLICY_URL =
  'https://homewh.chaoxing.com/agree/privacyPolicy?appId=1000028';

interface MockCookies {
  clearAll: jest.Mock;
  getAll: jest.Mock;
  get: jest.Mock;
}

const cookieManager = CookieManager as unknown as MockCookies;
const casMobileLoginModule = CasMobileLoginModule as unknown as {
  onRequestSuccess: jest.Mock;
};

/** Narrow the untyped `props` bag of the mocked WebView host element. */
const webviewProps = () =>
  screen.getByTestId('webview').props as unknown as {
    source: {uri: string};
    injectedJavaScript: string;
    onMessage: (event: {nativeEvent: {data: string}}) => void;
    onShouldStartLoadWithRequest: (request: {url: string}) => boolean;
    webviewDebuggingEnabled: boolean;
    style: {backgroundColor: string};
  };

const cookie = (
  name: string,
  value: string,
  domain = 'cas.whu.edu.cn',
): Cookie => ({name, value, domain});

const setPlatform = (os: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', {
    value: os,
    configurable: true,
    writable: true,
  });
};

const messageData = (username: string, password: string, type: string) =>
  JSON.stringify({type: 'postMessage', data: {username, password, type}});

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform('ios');
  cookieManager.clearAll.mockResolvedValue(true);
  cookieManager.getAll.mockResolvedValue({});
  cookieManager.get.mockResolvedValue({});
});

describe('initial render', () => {
  it('renders a single WebView', async () => {
    await render(<CasMobileLoginView />);
    expect(screen.getByTestId('webview')).toBeOnTheScreen();
  });

  it('points the WebView at the CAS mobile auth URL', async () => {
    await render(<CasMobileLoginView />);
    expect(webviewProps().source.uri).toBe(CAS_MOBILE_LOGIN_URL);
  });

  it('disables webview debugging', async () => {
    await render(<CasMobileLoginView />);
    expect(webviewProps().webviewDebuggingEnabled).toBe(false);
  });

  it('injects a non-empty script', async () => {
    await render(<CasMobileLoginView />);
    expect(typeof webviewProps().injectedJavaScript).toBe('string');
    expect(webviewProps().injectedJavaScript.length).toBeGreaterThan(0);
  });

  it('injects a script that posts messages back to native', async () => {
    await render(<CasMobileLoginView />);
    expect(webviewProps().injectedJavaScript).toContain('postMessage');
  });

  it('injects a script that targets the password login form', async () => {
    await render(<CasMobileLoginView />);
    const script = webviewProps().injectedJavaScript;
    expect(script).toContain('pwdFromId');
    expect(script).toContain('#username');
    expect(script).toContain('#password');
    expect(script).toContain('login_submit');
  });

  it('injects a script that strips the social login and footer blocks', async () => {
    await render(<CasMobileLoginView />);
    const script = webviewProps().injectedJavaScript;
    expect(script).toContain('social-aut-login');
    expect(script).toContain('combine_options_footer');
  });

  it('injects a script that guards the tip override against double wrapping', async () => {
    await render(<CasMobileLoginView />);
    expect(webviewProps().injectedJavaScript).toContain('__hamWrapped');
  });
});

describe('cookie clearing on mount', () => {
  it('clears all cookies once', async () => {
    await render(<CasMobileLoginView />);
    await Promise.resolve();
    expect(cookieManager.clearAll).toHaveBeenCalledTimes(1);
    expect(cookieManager.clearAll).toHaveBeenCalledWith(true);
  });

  it('does not clear cookies again on re-render', async () => {
    const view = await render(<CasMobileLoginView />);
    view.rerender(<CasMobileLoginView />);
    await Promise.resolve();
    expect(cookieManager.clearAll).toHaveBeenCalledTimes(1);
  });
});

describe('onMessage', () => {
  it('stores credentials sent by the page', async () => {
    await render(<CasMobileLoginView />);
    await fireEvent(screen.getByTestId('webview'), 'message', {
      nativeEvent: {
        data: messageData('2021302111001', 'secret', 'login'),
      },
    });
    webviewProps().onShouldStartLoadWithRequest({
      url: 'https://cas.whu.edu.cn/authserver/mobile/default.html?mobile_token=abc123',
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(casMobileLoginModule.onRequestSuccess).toHaveBeenCalledWith(
      '2021302111001',
      'secret',
      '',
    );
  });

  it('ignores messages that are not postMessage events', async () => {
    await render(<CasMobileLoginView />);
    await fireEvent(screen.getByTestId('webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          type: 'other',
          data: {username: 'u', password: 'p'},
        }),
      },
    });
    webviewProps().onShouldStartLoadWithRequest({
      url: 'https://cas.whu.edu.cn/authserver/mobile/default.html?mobile_token=abc123',
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(casMobileLoginModule.onRequestSuccess).toHaveBeenCalledWith(
      '',
      '',
      '',
    );
  });

  it('falls back to empty strings when no credentials were sent', async () => {
    await render(<CasMobileLoginView />);
    webviewProps().onShouldStartLoadWithRequest({
      url: 'https://cas.whu.edu.cn/authserver/mobile/default.html?mobile_token=abc123',
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(casMobileLoginModule.onRequestSuccess).toHaveBeenCalledWith(
      '',
      '',
      '',
    );
  });
});

describe('onShouldStartLoadWithRequest token extraction', () => {
  const success = (token: string) =>
    `https://cas.whu.edu.cn/authserver/mobile/default.html?mobile_token=${token}`;

  it('allows navigation for URLs outside the success path', async () => {
    await render(<CasMobileLoginView />);
    expect(
      webviewProps().onShouldStartLoadWithRequest({
        url: 'https://cas.whu.edu.cn/authserver/mobile/auth?appId=985180443',
      }),
    ).toBe(true);
    expect(casMobileLoginModule.onRequestSuccess).not.toHaveBeenCalled();
  });

  it('allows navigation when the success path has no token', async () => {
    await render(<CasMobileLoginView />);
    expect(
      webviewProps().onShouldStartLoadWithRequest({
        url: 'https://cas.whu.edu.cn/authserver/mobile/default.html',
      }),
    ).toBe(true);
    expect(casMobileLoginModule.onRequestSuccess).not.toHaveBeenCalled();
  });

  it('allows navigation when the token is empty', async () => {
    await render(<CasMobileLoginView />);
    expect(
      webviewProps().onShouldStartLoadWithRequest({url: success('')}),
    ).toBe(true);
    expect(casMobileLoginModule.onRequestSuccess).not.toHaveBeenCalled();
  });

  it('blocks navigation for the success path with a token', async () => {
    await render(<CasMobileLoginView />);
    expect(
      webviewProps().onShouldStartLoadWithRequest({url: success('abc123')}),
    ).toBe(false);
  });

  it('blocks navigation for a URL-encoded token', async () => {
    await render(<CasMobileLoginView />);
    const url =
      'https://cas.whu.edu.cn/authserver/mobile/default.html?mobile_token=' +
      encodeURIComponent('ab/c 123');
    expect(webviewProps().onShouldStartLoadWithRequest({url})).toBe(false);
  });
});

describe('cookie retrieval by platform', () => {
  const triggerSuccess = () => {
    webviewProps().onShouldStartLoadWithRequest({
      url: 'https://cas.whu.edu.cn/authserver/mobile/default.html?mobile_token=tok',
    });
  };

  it('reads all cookies on iOS and keeps only the CAS domain', async () => {
    setPlatform('ios');
    cookieManager.getAll.mockResolvedValue({
      keep: cookie('keep', 'v1'),
      drop: cookie('drop', 'v2', 'example.com'),
    });
    await render(<CasMobileLoginView />);
    triggerSuccess();
    await Promise.resolve();
    await Promise.resolve();
    expect(cookieManager.getAll).toHaveBeenCalledWith(true);
    expect(cookieManager.get).not.toHaveBeenCalled();
    expect(casMobileLoginModule.onRequestSuccess).toHaveBeenCalledWith(
      '',
      '',
      'keep=v1',
    );
  });

  it('joins several iOS cookies with a semicolon', async () => {
    setPlatform('ios');
    cookieManager.getAll.mockResolvedValue({
      a: cookie('a', '1'),
      b: cookie('b', '2'),
    });
    await render(<CasMobileLoginView />);
    triggerSuccess();
    await Promise.resolve();
    await Promise.resolve();
    expect(casMobileLoginModule.onRequestSuccess).toHaveBeenCalledWith(
      '',
      '',
      'a=1;b=2',
    );
  });

  it('reads cookies by URL on Android and uses them as-is', async () => {
    setPlatform('android');
    cookieManager.get.mockResolvedValue({
      a: cookie('a', '1'),
      b: cookie('b', '2', 'example.com'),
    });
    await render(<CasMobileLoginView />);
    triggerSuccess();
    await Promise.resolve();
    await Promise.resolve();
    expect(cookieManager.get).toHaveBeenCalledWith(
      'https://cas.whu.edu.cn/authserver',
    );
    expect(cookieManager.getAll).not.toHaveBeenCalled();
    expect(casMobileLoginModule.onRequestSuccess).toHaveBeenCalledWith(
      '',
      '',
      'a=1;b=2',
    );
  });

  it('does not query cookies at all on other platforms', async () => {
    setPlatform('web' as unknown as 'ios');
    await render(<CasMobileLoginView />);
    triggerSuccess();
    await Promise.resolve();
    await Promise.resolve();
    expect(cookieManager.getAll).not.toHaveBeenCalled();
    expect(cookieManager.get).not.toHaveBeenCalled();
    expect(casMobileLoginModule.onRequestSuccess).not.toHaveBeenCalled();
  });
});

describe('login guard', () => {
  it('reports success only for the first token URL', async () => {
    await render(<CasMobileLoginView />);
    const url =
      'https://cas.whu.edu.cn/authserver/mobile/default.html?mobile_token=tok';
    expect(webviewProps().onShouldStartLoadWithRequest({url})).toBe(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(webviewProps().onShouldStartLoadWithRequest({url})).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(casMobileLoginModule.onRequestSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('privacy policy', () => {
  it('opens the privacy policy externally and blocks navigation', async () => {
    const openURL = spyOpenURL();
    await render(<CasMobileLoginView />);
    expect(
      webviewProps().onShouldStartLoadWithRequest({
        url: PRIVACY_POLICY_URL,
      }),
    ).toBe(false);
    await Promise.resolve();
    expect(openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    expect(casMobileLoginModule.onRequestSuccess).not.toHaveBeenCalled();
    openURL.mockRestore();
  });

  it('does not open external URLs for other requests', async () => {
    const openURL = spyOpenURL();
    await render(<CasMobileLoginView />);
    expect(
      webviewProps().onShouldStartLoadWithRequest({
        url: 'https://homewh.chaoxing.com/agree/privacyPolicy?appId=9999999',
      }),
    ).toBe(true);
    await Promise.resolve();
    expect(openURL).not.toHaveBeenCalled();
    openURL.mockRestore();
  });
});

describe('theming', () => {
  it('uses the light theme background by default', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    await render(<CasMobileLoginView />);
    expect(webviewProps().style.backgroundColor).toBe('#F9F9F9FF');
  });

  it('uses a different background in dark mode', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    await render(<CasMobileLoginView />);
    expect(webviewProps().style.backgroundColor).toBe('#000000');
  });
});
