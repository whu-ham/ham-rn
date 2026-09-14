import React from 'react';
import {Appearance} from 'react-native';
import {render, screen} from '@testing-library/react-native';
import {ReAuthLoginView} from '@/components/cas/ReAuthLoginView';

/**
 * React 19 passes `ref` as a regular entry in `props`, so `testID` must be
 * applied *after* the spread — see the note in `CasMobileLoginView.test.tsx`.
 */
jest.mock('react-native-webview', () => {
  const react = require('react');
  const {View} = require('react-native');
  return {
    WebView: (props: object) =>
      react.createElement(View, {...props, testID: 'webview'}),
  };
});

const RE_AUTH_URL =
  'https://cas.whu.edu.cn/authserver/login?service=https%3A%2F%2Fx.example.com%2Fcas';

/** Narrow the untyped `props` bag of the mocked WebView host element. */
const webviewProps = () =>
  screen.getByTestId('webview').props as unknown as {
    source: {uri: string};
    onShouldStartLoadWithRequest: (request: {url: string}) => boolean;
    webviewDebuggingEnabled: boolean;
    style: {backgroundColor: string};
  };

const renderView = async (reAuthUrl = RE_AUTH_URL) => {
  const onGetTicketUrl = jest.fn();
  await render(
    <ReAuthLoginView reAuthUrl={reAuthUrl} onGetTicketUrl={onGetTicketUrl} />,
  );
  return onGetTicketUrl;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('initial render', () => {
  it('renders a single WebView', async () => {
    await renderView();
    expect(screen.getByTestId('webview')).toBeOnTheScreen();
  });

  it('loads the reAuthUrl prop', async () => {
    await renderView();
    expect(webviewProps().source.uri).toBe(RE_AUTH_URL);
  });

  it('loads an empty source uri when the prop is empty', async () => {
    await renderView('');
    expect(webviewProps().source.uri).toBe('');
  });

  it('disables webview debugging', async () => {
    await renderView();
    expect(webviewProps().webviewDebuggingEnabled).toBe(false);
  });
});

describe('onShouldStartLoadWithRequest', () => {
  it('reports and blocks URLs carrying a ticket query parameter', async () => {
    const onGetTicketUrl = await renderView();
    const url = 'https://x.example.com/cas?ticket=ST-123456';
    expect(webviewProps().onShouldStartLoadWithRequest({url})).toBe(false);
    expect(onGetTicketUrl).toHaveBeenCalledWith(url);
  });

  it('allows navigation and stays silent for URLs without a ticket', async () => {
    const onGetTicketUrl = await renderView();
    expect(
      webviewProps().onShouldStartLoadWithRequest({
        url: 'https://cas.whu.edu.cn/authserver/login',
      }),
    ).toBe(true);
    expect(onGetTicketUrl).not.toHaveBeenCalled();
  });

  it('matches ticket as a plain substring, including in the host', async () => {
    const onGetTicketUrl = await renderView();
    const url = 'https://ticket.example.com/';
    expect(webviewProps().onShouldStartLoadWithRequest({url})).toBe(false);
    expect(onGetTicketUrl).toHaveBeenCalledWith(url);
  });

  it('matches ticket anywhere in the path, not just as a parameter', async () => {
    const onGetTicketUrl = await renderView();
    const url = 'https://x.example.com/tickets/list';
    expect(webviewProps().onShouldStartLoadWithRequest({url})).toBe(false);
    expect(onGetTicketUrl).toHaveBeenCalledWith(url);
  });

  it('reports every ticket URL it sees, with no once-only guard', async () => {
    const onGetTicketUrl = await renderView();
    webviewProps().onShouldStartLoadWithRequest({
      url: 'https://x.example.com/cas?ticket=ST-1',
    });
    webviewProps().onShouldStartLoadWithRequest({
      url: 'https://x.example.com/cas?ticket=ST-2',
    });
    expect(onGetTicketUrl).toHaveBeenCalledTimes(2);
  });
});

describe('theming', () => {
  it('uses the light theme background by default', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    await renderView();
    expect(webviewProps().style.backgroundColor).toBe('#F9F9F9FF');
  });

  it('uses a different background in dark mode', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    await renderView();
    expect(webviewProps().style.backgroundColor).toBe('#000000');
  });
});
