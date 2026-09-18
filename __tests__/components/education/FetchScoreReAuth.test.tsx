import React from 'react';
import {act, render, screen, waitFor} from '@testing-library/react-native';
import FetchScoreView from '@/components/education/score/FetchScoreView';
import {getScoreList} from '@/business/education/score/api';
import {loginEducation} from '@/business/education';
import {CasReAuthLoginError} from '@/business/education/api';
import EducationModule from '@/modules/NativeEducationModule';

/**
 * The re-auth branch is the one path through `FetchEducationView` that does
 * its work outside the mount effect: the login rejects with a re-auth URL, a
 * WebView redeems it, and a redirect carrying `ticket` hands the URL back.
 * Every failure in there has to reach `onGetScoreList` too — the host is
 * waiting on the same callback it was waiting on before the re-auth started,
 * and nothing else will ever answer it.
 */
// The real WebView wraps `onShouldStartLoadWithRequest` in its own handler for
// native events, which is not what `ReAuthLoginView` passes down. Render a
// plain View so the prop a test reads is the one the CAS page would drive.
jest.mock('react-native-webview', () => {
  const react = require('react');
  const {View} = require('react-native');
  return {
    WebView: react.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      react.createElement(View, {...props, ref}),
    ),
  };
});

jest.mock('@/business/education/score/api', () => ({
  getScoreList: jest.fn(),
  getUserInfo: jest.fn(),
}));

jest.mock('@/business/education', () => ({
  loginEducation: jest.fn(() => Promise.resolve()),
}));

const REAUTH_URL = 'https://cas.whu.edu.cn/authserver/reAuth';
const TICKET_URL = 'https://jwgl.whu.edu.cn/sso/jznewsixlogin?ticket=ST-1';
const NO_TICKET_URL = 'https://cas.whu.edu.cn/authserver/login';

const mockFetch = jest.fn();

/**
 * Logs in, lands on the re-auth WebView, and returns a driver for the
 * navigation callback the CAS page reaches to hand a ticket URL back.
 */
const reachReAuth = async () => {
  (loginEducation as jest.Mock).mockRejectedValue(
    new CasReAuthLoginError(REAUTH_URL),
  );
  await render(<FetchScoreView />);
  await waitFor(() =>
    expect(screen.getByTestId('fetch-score-view-reauth')).toBeTruthy(),
  );
  const webview = screen.getByTestId('fetch-score-view-reauth');
  const {onShouldStartLoadWithRequest} = webview.props as unknown as {
    onShouldStartLoadWithRequest: (request: {url: string}) => boolean;
  };
  // The callback advances the stage, so it has to run inside act — and this
  // library's act is async, so it has to be awaited too.
  return {
    navigate: async (url: string) => {
      await act(async () => {
        onShouldStartLoadWithRequest({url});
      });
    },
  };
};

describe('FetchScoreView re-auth branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ok: true} as unknown as Response);
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('redeems a ticket URL and reports the score list', async () => {
    (getScoreList as jest.Mock).mockResolvedValue([
      [],
      {college: '', major: '', name: '', studentId: '2021302111001'},
    ]);
    const {navigate} = await reachReAuth();

    await navigate(TICKET_URL);

    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '[]',
        expect.any(String),
        null,
      ),
    );
    expect(mockFetch).toHaveBeenCalledWith(TICKET_URL);
  });

  // A rejection here used to report `err.message`, which is `undefined` for a
  // non-Error throw. The hosts read that as success, so the failure would have
  // been recorded as an empty score list.
  it('reports a non-Error rejection as the thrown value', async () => {
    (getScoreList as jest.Mock).mockRejectedValue('plain string');
    const {navigate} = await reachReAuth();

    await navigate(TICKET_URL);

    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '',
        '',
        'plain string',
      ),
    );
  });

  it('reports a failure to redeem the ticket URL', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ticket fetch down'));
    const {navigate} = await reachReAuth();

    await navigate(TICKET_URL);

    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '',
        '',
        'ticket fetch down',
      ),
    );
    expect(getScoreList).not.toHaveBeenCalled();
  });

  // Nothing else is listening: if the score fetch after a redeemed ticket
  // swallows its failure, the sheet sits on loading until the user gives up.
  it('reports a score-fetch failure after the ticket is redeemed', async () => {
    (getScoreList as jest.Mock).mockRejectedValue(new Error('成绩查询失败'));
    const {navigate} = await reachReAuth();

    await navigate(TICKET_URL);

    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '',
        '',
        '成绩查询失败',
      ),
    );
  });

  it('ignores re-auth navigations that carry no ticket', async () => {
    const {navigate} = await reachReAuth();

    await navigate(NO_TICKET_URL);

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(EducationModule.onGetScoreList).not.toHaveBeenCalled();
  });
});
