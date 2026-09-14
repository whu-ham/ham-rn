import React from 'react';
import {render} from '@testing-library/react-native';

type ProgressListener = (payload: {progress: number}) => void;
type Unsubscribe = () => void;

const mockUnsubscribe = jest.fn();
const mockAddListener = jest.fn<Unsubscribe, unknown[]>(() => mockUnsubscribe);
const mockGetChannel = jest.fn(() => 'test-channel');
const mockGetAppVersion = jest.fn(() => '1.0.0');
const mockIsUpdateDownloaded = jest.fn(() => false);
const mockGetFingerprintHash = jest.fn(() => 'abc123');

jest.mock('@hot-updater/react-native', () => ({
  HotUpdater: {
    wrap: () => (Component: React.ComponentType) => Component,
    addListener: (...args: unknown[]) =>
      mockAddListener(...(args as Parameters<typeof mockAddListener>)),
    getChannel: () => mockGetChannel(),
    getAppVersion: () => mockGetAppVersion(),
    isUpdateDownloaded: () => mockIsUpdateDownloaded(),
    getFingerprintHash: () => mockGetFingerprintHash(),
  },
}));

const NativeLog: {i: jest.Mock; e: jest.Mock} =
  require('@/modules/NativeLog').default;
const NativeCommonModule: {getLocale: jest.Mock; onLocaleChanged: jest.Mock} =
  require('@/modules/NativeCommonModule').default;
const i18n: {
  changeLanguage: (lng: string) => Promise<unknown>;
} = require('@/i18n/i18n').default;
const Common: React.ComponentType =
  require('@/components/common/Common').default;

const localeSubscription = (): {remove: jest.Mock} =>
  NativeCommonModule.onLocaleChanged.mock.results[0].value as {
    remove: jest.Mock;
  };

const progressListener = (): ProgressListener =>
  mockAddListener.mock.calls[0][1] as ProgressListener;

const localeListener = (): (() => void) =>
  NativeCommonModule.onLocaleChanged.mock.calls[0][0] as () => void;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('renders without crashing', async () => {
  const view = await render(<Common />);
  expect(view.toJSON()).not.toBeNull();
});

it('logs the mounted marker', async () => {
  await render(<Common />);
  expect(NativeLog.i).toHaveBeenCalledWith('Common', 'mounted');
});

it('logs the HotUpdater channel', async () => {
  await render(<Common />);
  expect(mockGetChannel).toHaveBeenCalledTimes(1);
  expect(NativeLog.i).toHaveBeenCalledWith(
    'Common',
    'HotUpdater => Channel: test-channel',
  );
});

it('logs the app version', async () => {
  await render(<Common />);
  expect(NativeLog.i).toHaveBeenCalledWith(
    'Common',
    'HotUpdater => AppVersion: 1.0.0',
  );
});

it('logs whether an update has been downloaded', async () => {
  await render(<Common />);
  expect(NativeLog.i).toHaveBeenCalledWith(
    'Common',
    'HotUpdater => isUpdateDownloaded: false',
  );
});

it('logs the fingerprint hash', async () => {
  await render(<Common />);
  expect(NativeLog.i).toHaveBeenCalledWith(
    'Common',
    'HotUpdater => FingerprintHash: abc123',
  );
});

it('registers a single onProgress listener on mount', async () => {
  await render(<Common />);
  expect(mockAddListener).toHaveBeenCalledTimes(1);
  expect(mockAddListener.mock.calls[0][0]).toBe('onProgress');
});

it('logs the progress reported by the onProgress listener', async () => {
  await render(<Common />);
  progressListener()({progress: 42});
  expect(NativeLog.i).toHaveBeenCalledWith(
    'Common',
    'HotUpdater => onProgress: 42%',
  );
});

it('subscribes to native locale changes on mount', async () => {
  await render(<Common />);
  expect(NativeCommonModule.onLocaleChanged).toHaveBeenCalledTimes(1);
});

it('changes the i18n language when the locale changes', async () => {
  NativeCommonModule.getLocale.mockReturnValue('ja');
  const changeLanguage = jest.spyOn(i18n, 'changeLanguage');
  changeLanguage.mockResolvedValue({} as never);
  await render(<Common />);
  localeListener()();
  expect(NativeCommonModule.getLocale).toHaveBeenCalledTimes(1);
  expect(changeLanguage).toHaveBeenCalledWith('ja');
});

it('removes both subscriptions on unmount', async () => {
  const view = await render(<Common />);
  const localeRemove = localeSubscription().remove;

  await view.unmount();

  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  expect(localeRemove).toHaveBeenCalledTimes(1);
});
