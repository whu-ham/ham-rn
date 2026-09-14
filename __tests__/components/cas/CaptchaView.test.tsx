import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {CaptchaView} from '@/components/education/CaptchaView';
import {html} from '@/components/education/resource/html';

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

/** Narrow the untyped `props` bag of the mocked WebView host element. */
const webviewProps = () =>
  screen.getByTestId('webview').props as unknown as {
    source: {html: string};
    onMessage: (event: {nativeEvent: {data: string}}) => void;
  };

const renderView = async () => {
  const onGetToken = jest.fn();
  await render(<CaptchaView onGetToken={onGetToken} />);
  return onGetToken;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('initial render', () => {
  it('renders a single WebView', async () => {
    await renderView();
    expect(screen.getByTestId('webview')).toBeOnTheScreen();
  });

  it('serves the bundled captcha page as inline HTML', async () => {
    await renderView();
    expect(webviewProps().source.html).toBe(html);
  });

  it('serves a non-empty HTML document', async () => {
    await renderView();
    const source = webviewProps().source.html;
    expect(typeof source).toBe('string');
    expect(source.length).toBeGreaterThan(0);
    expect(source).toContain('<!DOCTYPE html>');
  });

  it('serves an HTML document that posts the captcha token back', async () => {
    await renderView();
    const source = webviewProps().source.html;
    expect(source).toContain('ReactNativeWebView.postMessage');
    expect(source).toContain('token');
  });
});

describe('onMessage', () => {
  it('forwards the token from the page to onGetToken', async () => {
    const onGetToken = await renderView();
    await fireEvent(screen.getByTestId('webview'), 'message', {
      nativeEvent: {data: JSON.stringify({token: 'captcha-token-123'})},
    });
    expect(onGetToken).toHaveBeenCalledWith('captcha-token-123');
  });

  it('forwards an empty token as-is', async () => {
    const onGetToken = await renderView();
    await fireEvent(screen.getByTestId('webview'), 'message', {
      nativeEvent: {data: JSON.stringify({token: ''})},
    });
    expect(onGetToken).toHaveBeenCalledWith('');
  });

  it('reports each message it receives', async () => {
    const onGetToken = await renderView();
    await fireEvent(screen.getByTestId('webview'), 'message', {
      nativeEvent: {data: JSON.stringify({token: 'first'})},
    });
    await fireEvent(screen.getByTestId('webview'), 'message', {
      nativeEvent: {data: JSON.stringify({token: 'second'})},
    });
    expect(onGetToken).toHaveBeenCalledTimes(2);
    expect(onGetToken).toHaveBeenNthCalledWith(1, 'first');
    expect(onGetToken).toHaveBeenNthCalledWith(2, 'second');
  });

  it('stays silent until a message arrives', async () => {
    const onGetToken = await renderView();
    expect(onGetToken).not.toHaveBeenCalled();
  });
});

// Not covered: malformed JSON. `onMessage` calls `JSON.parse` with no
// try/catch, so a non-JSON payload throws out of the handler rather than being
// handled gracefully; asserting "no throw" here would encode behaviour the
// component does not have.
