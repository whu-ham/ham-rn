import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import FetchEducationView, {
  EducationStage,
} from '@/components/education/FetchEducationView';
import {CasReAuthLoginError} from '@/business/education/api';
import Log from '@/modules/NativeLog';
import zh from '@/i18n/zh/translation.json';

/**
 * `FetchEducationView` drives the shared loading/re-auth flow used by both the
 * course and score screens. It swaps its whole subtree on stage change, so
 * these tests are mostly about which branch renders and which callback fires.
 *
 * NOTE: RNTL v14's `render` is async — every call below is awaited.
 */
jest.mock('react-native-webview', () => {
  const react = require('react');
  const {View} = require('react-native');
  return {
    WebView: react.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      react.createElement(View, {...props, ref}),
    ),
  };
});

const TEST_ID = 'fetch';

/** Depth-first search of the rendered host tree for a node of the given type. */
const findHost = (
  node: unknown,
  type: string,
): Record<string, unknown> | undefined => {
  if (node === null || typeof node !== 'object') {
    return undefined;
  }
  const element = node as {type?: unknown; children?: unknown[]};
  if (element.type === type) {
    return element as Record<string, unknown>;
  }
  for (const child of element.children ?? []) {
    const hit = findHost(child, type);
    if (hit) {
      return hit;
    }
  }
  return undefined;
};

type ViewProps = React.ComponentProps<typeof FetchEducationView>;

const renderView = async (overrides: Partial<ViewProps> = {}) => {
  const doLoginAndFetch = jest.fn<Promise<void>, []>(() => Promise.resolve());
  const doFetch = jest.fn<Promise<void>, []>(() => Promise.resolve());
  const onError = jest.fn();
  const props: ViewProps = {
    tag: 'TestView',
    doLoginAndFetch,
    doFetch,
    onError,
    ...overrides,
  };
  const utils = await render(<FetchEducationView {...props} />);
  return {...utils, doLoginAndFetch, doFetch, onError};
};

/** Drive the component into the re-auth stage by rejecting with a CAS error. */
const renderInReAuthStage = async (
  reAuthUrl = 'https://cas.example/reauth',
  overrides: Partial<ViewProps> = {},
) => {
  const result = await renderView({
    testID: TEST_ID,
    doLoginAndFetch: () => Promise.reject(new CasReAuthLoginError(reAuthUrl)),
    ...overrides,
  });
  await waitFor(() =>
    expect(screen.getByTestId(`${TEST_ID}-reauth`)).toBeTruthy(),
  );
  return result;
};

describe('FetchEducationView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading stage', () => {
    it('renders the loading container by default', async () => {
      await renderView({testID: TEST_ID});
      expect(screen.getByTestId(`${TEST_ID}-loading`)).toBeTruthy();
    });

    it('renders the localized loading text', async () => {
      await renderView({testID: TEST_ID});
      expect(screen.getByTestId(`${TEST_ID}-loading-text`)).toHaveTextContent(
        zh.education.loading,
      );
    });

    it('renders an ActivityIndicator sized large', async () => {
      const {toJSON} = await renderView({testID: TEST_ID});
      expect(findHost(toJSON(), 'ActivityIndicator')).toMatchObject({
        props: {size: 'large'},
      });
    });

    it('does not render the re-auth webview while loading', async () => {
      await renderView({testID: TEST_ID});
      expect(screen.queryByTestId(`${TEST_ID}-reauth`)).toBeNull();
    });

    it('calls doLoginAndFetch once on mount', async () => {
      const {doLoginAndFetch} = await renderView({testID: TEST_ID});
      await waitFor(() => expect(doLoginAndFetch).toHaveBeenCalledTimes(1));
    });

    it('does not call doFetch while in the initial stage', async () => {
      const {doFetch} = await renderView({testID: TEST_ID});
      await waitFor(() =>
        expect(screen.getByTestId(`${TEST_ID}-loading`)).toBeTruthy(),
      );
      expect(doFetch).not.toHaveBeenCalled();
    });

    it('omits testIDs entirely when no testID prop is given', async () => {
      await renderView();
      expect(screen.queryByTestId(`${TEST_ID}-loading`)).toBeNull();
      expect(screen.getByText(zh.education.loading)).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('calls onError with the rejection message for a generic error', async () => {
      const {onError} = await renderView({
        doLoginAndFetch: () => Promise.reject(new Error('网络请求失败')),
      });
      await waitFor(() => expect(onError).toHaveBeenCalledWith('网络请求失败'));
    });

    it('does not surface a generic error through the re-auth branch', async () => {
      await renderView({
        testID: TEST_ID,
        doLoginAndFetch: () => Promise.reject(new Error('boom')),
      });
      await waitFor(() =>
        expect(screen.queryByTestId(`${TEST_ID}-reauth`)).toBeNull(),
      );
    });

    it('logs the failure with the tag it was given', async () => {
      await renderView({
        tag: 'MyTag',
        doLoginAndFetch: () => Promise.reject(new Error('boom')),
      });
      await waitFor(() =>
        expect(Log.e).toHaveBeenCalledWith('MyTag', expect.any(String)),
      );
    });

    it('switches to the re-auth webview on CasReAuthLoginError', async () => {
      await renderInReAuthStage();
      expect(screen.getByTestId(`${TEST_ID}-reauth`)).toBeTruthy();
    });

    it('passes the re-auth url from the error into the webview', async () => {
      await renderInReAuthStage('https://cas.example/reauth');
      expect(screen.getByTestId(`${TEST_ID}-reauth`).props.source).toEqual({
        uri: 'https://cas.example/reauth',
      });
    });

    it('does not call onError when the failure is a re-auth error', async () => {
      const {onError} = await renderInReAuthStage();
      expect(onError).not.toHaveBeenCalled();
    });

    it('stops rendering the loading indicator once in the re-auth stage', async () => {
      await renderInReAuthStage();
      expect(screen.queryByTestId(`${TEST_ID}-loading`)).toBeNull();
    });
  });

  describe('re-auth completion', () => {
    const ticketUrl = 'https://cas.example/?ticket=ST-1';

    const startTicketFlow = async (overrides: Partial<ViewProps> = {}) => {
      const result = await renderInReAuthStage(
        'https://cas.example/reauth',
        overrides,
      );
      screen
        .getByTestId(`${TEST_ID}-reauth`)
        .props.onShouldStartLoadWithRequest({url: ticketUrl});
      return result;
    };

    it('fetches the ticket url and then calls doFetch', async () => {
      global.fetch = jest.fn(() => Promise.resolve(new Response())) as never;
      const {doFetch} = await startTicketFlow();

      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(ticketUrl));
      await waitFor(() => expect(doFetch).toHaveBeenCalledTimes(1));
    });

    it('reports an error when the ticket fetch fails', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('ticket fetch failed')),
      ) as never;
      const {onError, doFetch} = await startTicketFlow();

      await waitFor(() =>
        expect(onError).toHaveBeenCalledWith('ticket fetch failed'),
      );
      expect(doFetch).not.toHaveBeenCalled();
    });

    it('reports an error when doFetch rejects after a successful ticket fetch', async () => {
      global.fetch = jest.fn(() => Promise.resolve(new Response())) as never;
      const {onError} = await startTicketFlow({
        doFetch: jest.fn<Promise<void>, []>(() =>
          Promise.reject(new Error('fetch failed')),
        ),
      });

      await waitFor(() => expect(onError).toHaveBeenCalledWith('fetch failed'));
    });

    it('leaves the re-auth stage after receiving a ticket url', async () => {
      global.fetch = jest.fn(() => Promise.resolve(new Response())) as never;
      await startTicketFlow();

      await waitFor(() =>
        expect(screen.queryByTestId(`${TEST_ID}-reauth`)).toBeNull(),
      );
    });
  });

  it('exports the stage enum used to drive the flow', () => {
    expect(EducationStage.TRY_GET_INFO_DIRECTLY).toBe(0);
    expect(EducationStage.REAUTH_LOGIN).toBe(1);
    expect(EducationStage.LOAD_EDUCATION).toBe(2);
  });

  it('still renders the loading text when no testID is supplied', async () => {
    const {onError} = await renderView({
      doLoginAndFetch: () => Promise.reject(new Error('boom')),
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith('boom'));
    expect(screen.getByText(zh.education.loading)).toBeTruthy();
  });
});
