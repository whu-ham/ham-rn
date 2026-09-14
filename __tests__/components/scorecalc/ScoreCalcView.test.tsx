/**
 * Tests for {@link ScoreCalcView}.
 *
 * The view owns three pieces of stateful behaviour worth pinning down: the
 * script list it pulls from the local bundle, the "currently selected script"
 * it parses out of the native module, and the subscription that lets the native
 * side push a new selection into the tree.
 */
import React from 'react';
import {act, render, renderHook, waitFor} from '@testing-library/react-native';
import {Appearance, Platform} from 'react-native';
import type * as SafeAreaContextType from 'react-native-safe-area-context';

import type {ScoreCalcItem} from '@/business/education/scorecalc/type';
import {fetchScoreCalcFromLocal} from '@/business/education/scorecalc/fetch';
import ScoreCalcView from '@/components/scorecalc/ScoreCalcView';
import ScoreCalcModule from '@/modules/NativeScoreCalcModule';
import NativeLog from '@/modules/NativeLog';
import type {ThemeColor} from '@/utils/color/color';
import {useColor} from '@/utils/color/color';

import {makeScoreCalcItem} from '../../helpers/factories';

/**
 * `useSafeAreaInsets` is spied through `requireMock`, not through the ESM
 * namespace: the namespace object Babel builds is a copy, so patching it never
 * reaches the property the component reads.
 */
const safeArea = jest.requireMock(
  'react-native-safe-area-context',
) as typeof SafeAreaContextType;

/** Read the callback the view registered with the native module. */
const currentCalcCallback = (index = 0): (() => void) => {
  const calls = (ScoreCalcModule.onSetScoreJsCalcItem as jest.Mock).mock.calls;
  expect(calls.length).toBeGreaterThan(index);
  return calls[index][0] as () => void;
};

/** Set the value the native `getCurrentCalc()` stub will hand back. */
const setCurrentCalc = (item: ScoreCalcItem | string | undefined): void => {
  (ScoreCalcModule.getCurrentCalc as jest.Mock).mockReturnValue(
    typeof item === 'string' || item === undefined
      ? item
      : JSON.stringify(item),
  );
};

/**
 * Node in RNTL's rendered JSON tree. The helper types it as `unknown` and
 * narrows, matching how the other suites in this repo walk the tree.
 */
type JsonNode = unknown;

/** Walk the rendered JSON tree for the first style carrying `key`. */
const findStyleValue = (node: JsonNode, key: string): unknown => {
  if (node === null || typeof node !== 'object') {
    return undefined;
  }
  const element = node as {
    props?: {style?: unknown};
    children?: JsonNode[];
  };
  const style = element.props?.style;
  const styles = (Array.isArray(style) ? style : [style]).filter(
    (entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === 'object',
  );
  for (const entry of styles) {
    if (key in entry) {
      return entry[key];
    }
  }
  for (const child of element.children ?? []) {
    const found = findStyleValue(child, key);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
};

/** Collect every text node rendered underneath `node`. */
const collectText = (node: JsonNode): string[] => {
  if (typeof node === 'string') {
    return [node];
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  const children = (node as {children?: JsonNode[]}).children ?? [];
  return children.flatMap(child => collectText(child));
};

const setOS = (os: 'ios' | 'android'): void => {
  Object.defineProperty(Platform, 'OS', {value: os, configurable: true});
};

/** Resolve the light palette the same way the component does. */
const paletteFor = async (scheme: 'light' | 'dark'): Promise<ThemeColor> => {
  const spy = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(scheme);
  const {result} = await renderHook(() => useColor());
  spy.mockRestore();
  return result.current;
};

describe('ScoreCalcView', () => {
  const localList = fetchScoreCalcFromLocal();
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setOS('android');
    setCurrentCalc('');
  });

  afterEach(() => {
    setOS(originalOS as 'ios' | 'android');
    jest.restoreAllMocks();
  });

  describe('structure', () => {
    it('renders the scroll view', async () => {
      const view = await render(<ScoreCalcView />);
      expect(view.getByTestId('scorecalc-scroll-view')).toBeOnTheScreen();
    });

    it('renders the current card', async () => {
      const view = await render(<ScoreCalcView />);
      expect(view.getByTestId('scorecalc-current-card')).toBeOnTheScreen();
    });

    it('renders the docs card', async () => {
      const view = await render(<ScoreCalcView />);
      expect(view.getByTestId('scorecalc-docs-card')).toBeOnTheScreen();
    });

    it('renders the other card', async () => {
      const view = await render(<ScoreCalcView />);
      expect(view.getByTestId('scorecalc-other-card')).toBeOnTheScreen();
    });

    it('nests all three cards inside the scroll view', async () => {
      const view = await render(<ScoreCalcView />);
      const scrollView = view.getByTestId('scorecalc-scroll-view');
      expect(scrollView).toContainElement(
        view.getByTestId('scorecalc-current-card'),
      );
      expect(scrollView).toContainElement(
        view.getByTestId('scorecalc-docs-card'),
      );
      expect(scrollView).toContainElement(
        view.getByTestId('scorecalc-other-card'),
      );
    });

    it('applies the horizontal container padding to the scroll view', async () => {
      const view = await render(<ScoreCalcView />);
      expect(view.getByTestId('scorecalc-scroll-view')).toHaveStyle({
        paddingHorizontal: 16,
      });
    });
  });

  describe('local script list', () => {
    it('renders one row per locally bundled script', async () => {
      const view = await render(<ScoreCalcView />);
      expect(localList.length).toBe(2);
      const rows = localList.map((item, index) =>
        view.getByTestId(`scorecalc-other-card-item-${index}-title`),
      );
      rows.forEach((row, index) => {
        expect(row).toHaveTextContent(localList[index].title);
      });
    });

    it('renders the known bundled script titles', async () => {
      const view = await render(<ScoreCalcView />);
      expect(view).toBeTruthy();
      expect(
        collectText(view.toJSON()).filter(text => text === localList[0].title),
      ).toHaveLength(1);
    });

    it('renders the second bundled script title', async () => {
      const view = await render(<ScoreCalcView />);
      expect(
        collectText(view.toJSON()).filter(text => text === localList[1].title),
      ).toHaveLength(1);
    });

    it('renders one fewer divider than there are scripts', async () => {
      const view = await render(<ScoreCalcView />);
      for (let index = 0; index < localList.length - 1; index += 1) {
        expect(
          view.getByTestId(`scorecalc-other-card-divider-${index}`),
        ).toBeOnTheScreen();
      }
      expect(
        view.queryByTestId(
          `scorecalc-other-card-divider-${localList.length - 1}`,
        ),
      ).toBeNull();
    });

    it('renders no other-card empty state because the local list is populated', async () => {
      const view = await render(<ScoreCalcView />);
      expect(view.queryByTestId('scorecalc-other-card-empty')).toBeNull();
    });
  });

  describe('getCurrentCalc', () => {
    it('leaves the current item undefined when the payload is an empty string', async () => {
      setCurrentCalc('');
      const view = await render(<ScoreCalcView />);
      expect(
        view.getByTestId('scorecalc-current-card-empty'),
      ).toBeOnTheScreen();
      expect(view.queryByTestId('scorecalc-current-card-content')).toBeNull();
    });

    it('leaves the current item undefined when the payload is not JSON', async () => {
      setCurrentCalc('not json');
      const view = await render(<ScoreCalcView />);
      expect(
        view.getByTestId('scorecalc-current-card-empty'),
      ).toBeOnTheScreen();
    });

    it('populates the current item from valid JSON', async () => {
      const item = makeScoreCalcItem({title: '本地脚本', version: 1});
      setCurrentCalc(item);
      const view = await render(<ScoreCalcView />);
      expect(
        view.getByTestId('scorecalc-current-card-content'),
      ).toBeOnTheScreen();
      expect(view.queryByTestId('scorecalc-current-card-empty')).toBeNull();
    });

    it('renders the title of the current item', async () => {
      const item = makeScoreCalcItem({title: '当前脚本标题', version: 1});
      setCurrentCalc(item);
      const view = await render(<ScoreCalcView />);
      expect(
        view.getByTestId('scorecalc-current-card-desc-title'),
      ).toHaveTextContent(item.title);
    });

    it('reads the current item exactly once on mount', async () => {
      setCurrentCalc('not json');
      await render(<ScoreCalcView />);
      expect(ScoreCalcModule.getCurrentCalc).toHaveBeenCalledTimes(1);
    });
  });

  describe('listItem matching', () => {
    it('matches the current item against the local list by title and url', async () => {
      const current = localList[0];
      setCurrentCalc(current);
      const view = await render(<ScoreCalcView />);
      expect(
        view.queryByTestId('scorecalc-current-card-update-button'),
      ).toBeNull();
      expect(
        view.getByTestId('scorecalc-current-card-latest'),
      ).toBeOnTheScreen();
    });

    it('does not match a local item by title alone', async () => {
      const sameTitle = {
        ...localList[0],
        url: 'https://example.com/other.js',
        version: localList[0].version + 5,
      };
      setCurrentCalc(sameTitle);
      const view = await render(<ScoreCalcView />);
      // A version bump only surfaces an upgrade once the url also matches.
      expect(
        view.queryByTestId('scorecalc-current-card-desc-update-log'),
      ).toBeNull();
      expect(
        view.getByTestId('scorecalc-current-card-latest'),
      ).toBeOnTheScreen();
    });

    it('does not match a local item by url alone', async () => {
      const sameUrl = {
        ...localList[0],
        title: '另一个标题',
        version: localList[0].version + 5,
      };
      setCurrentCalc(sameUrl);
      const view = await render(<ScoreCalcView />);
      expect(
        view.queryByTestId('scorecalc-current-card-desc-update-log'),
      ).toBeNull();
      expect(
        view.getByTestId('scorecalc-current-card-latest'),
      ).toBeOnTheScreen();
    });

    it('offers an upgrade only when title, url and version all line up', async () => {
      const upgradable = {
        ...localList[0],
        version: localList[0].version + 5,
      };
      setCurrentCalc(upgradable);
      const view = await render(<ScoreCalcView />);
      expect(
        view.getByTestId('scorecalc-current-card-desc-update-log'),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId('scorecalc-current-card-update-button'),
      ).toBeOnTheScreen();
      expect(view.queryByTestId('scorecalc-current-card-latest')).toBeNull();
    });

    it('does not mark a list row as current when only the title matches', async () => {
      const sameTitle = {...localList[0], url: 'https://example.com/other.js'};
      setCurrentCalc(sameTitle);
      const view = await render(<ScoreCalcView />);
      expect(
        view.queryByTestId('scorecalc-other-card-item-0-current'),
      ).toBeNull();
    });
  });

  describe('onSetScoreJsCalcItem subscription', () => {
    it('subscribes on mount', async () => {
      await render(<ScoreCalcView />);
      expect(ScoreCalcModule.onSetScoreJsCalcItem).toHaveBeenCalledTimes(1);
      expect(typeof currentCalcCallback()).toBe('function');
    });

    it('removes the subscription on unmount', async () => {
      const view = await render(<ScoreCalcView />);
      const subscription = (ScoreCalcModule.onSetScoreJsCalcItem as jest.Mock)
        .mock.results[0].value as {remove: jest.Mock};
      expect(subscription.remove).not.toHaveBeenCalled();
      view.unmount();
      await waitFor(() => expect(subscription.remove).toHaveBeenCalledTimes(1));
    });

    it('logs when the native side reports a new selection', async () => {
      await render(<ScoreCalcView />);
      await act(async () => {
        currentCalcCallback()();
      });
      expect(NativeLog.i).toHaveBeenCalledWith(
        'ScoreCalcView',
        'onSetScoreJsCalcItem',
      );
    });

    it('re-reads getCurrentCalc when the callback fires', async () => {
      setCurrentCalc('not json');
      await render(<ScoreCalcView />);
      expect(ScoreCalcModule.getCurrentCalc).toHaveBeenCalledTimes(1);
      await act(async () => {
        currentCalcCallback()();
      });
      expect(ScoreCalcModule.getCurrentCalc).toHaveBeenCalledTimes(2);
    });

    it('updates the UI to the newly selected script', async () => {
      setCurrentCalc('not json');
      const view = await render(<ScoreCalcView />);
      expect(
        view.getByTestId('scorecalc-current-card-empty'),
      ).toBeOnTheScreen();

      const selected = makeScoreCalcItem({title: '切换后的脚本', version: 1});
      setCurrentCalc(selected);
      await act(async () => {
        currentCalcCallback()();
      });

      await waitFor(() =>
        expect(view.queryByTestId('scorecalc-current-card-empty')).toBeNull(),
      );
      expect(
        view.getByTestId('scorecalc-current-card-content'),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId('scorecalc-current-card-desc-title'),
      ).toHaveTextContent(selected.title);
    });

    it('clears the current script when the callback reports an empty payload', async () => {
      const item = makeScoreCalcItem({version: 1});
      setCurrentCalc(item);
      const view = await render(<ScoreCalcView />);
      expect(
        view.getByTestId('scorecalc-current-card-content'),
      ).toBeOnTheScreen();

      setCurrentCalc('not json');
      await act(async () => {
        currentCalcCallback()();
      });

      await waitFor(() =>
        expect(view.queryByTestId('scorecalc-current-card-content')).toBeNull(),
      );
      expect(
        view.getByTestId('scorecalc-current-card-empty'),
      ).toBeOnTheScreen();
    });

    it('surfaces an upgrade once the new selection trails the local script', async () => {
      setCurrentCalc('not json');
      const view = await render(<ScoreCalcView />);
      expect(
        view.queryByTestId('scorecalc-current-card-update-button'),
      ).toBeNull();

      setCurrentCalc({...localList[0], version: localList[0].version + 9});
      await act(async () => {
        currentCalcCallback()();
      });

      await waitFor(() =>
        expect(
          view.getByTestId('scorecalc-current-card-update-button'),
        ).toBeOnTheScreen(),
      );
      expect(view.queryByTestId('scorecalc-current-card-latest')).toBeNull();
    });
  });

  describe('theme', () => {
    it('uses the light background when the system is in light mode', async () => {
      const light = await paletteFor('light');
      const spy = jest
        .spyOn(Appearance, 'getColorScheme')
        .mockReturnValue('light');
      const view = await render(<ScoreCalcView />);
      expect(view.getByTestId('scorecalc-scroll-view')).toHaveStyle({
        backgroundColor: light.ham_bg_b1,
      });
      spy.mockRestore();
    });

    it('uses the dark background when the system is in dark mode', async () => {
      const dark = await paletteFor('dark');
      const spy = jest
        .spyOn(Appearance, 'getColorScheme')
        .mockReturnValue('dark');
      const view = await render(<ScoreCalcView />);
      expect(view.getByTestId('scorecalc-scroll-view')).toHaveStyle({
        backgroundColor: dark.ham_bg_b1,
      });
      spy.mockRestore();
    });

    it('differs between light and dark backgrounds', async () => {
      const light = await paletteFor('light');
      const dark = await paletteFor('dark');
      const spy = jest
        .spyOn(Appearance, 'getColorScheme')
        .mockReturnValue('light');
      const lightView = await render(<ScoreCalcView />);
      spy.mockReturnValue('dark');
      const darkView = await render(<ScoreCalcView />);
      spy.mockRestore();

      const lightBg = findStyleValue(lightView.toJSON(), 'backgroundColor');
      const darkBg = findStyleValue(darkView.toJSON(), 'backgroundColor');
      expect(lightBg).toBe(light.ham_bg_b1);
      expect(darkBg).toBe(dark.ham_bg_b1);
      expect(lightBg).not.toBe(darkBg);
    });
  });

  describe('platform branch', () => {
    it('applies no top padding on non-iOS platforms', async () => {
      setOS('android');
      setCurrentCalc('not json');
      const view = await render(<ScoreCalcView />);
      expect(findStyleValue(view.toJSON(), 'paddingTop')).toBe(0);
    });

    it('applies the safe area inset as top padding on iOS', async () => {
      setOS('ios');
      const spy = jest
        .spyOn(safeArea, 'useSafeAreaInsets')
        .mockReturnValue({top: 47, bottom: 1, left: 2, right: 3});
      const view = await render(<ScoreCalcView />);
      expect(spy).toHaveBeenCalled();
      expect(findStyleValue(view.toJSON(), 'paddingTop')).toBe(47);
      spy.mockRestore();
    });

    it('propagates a zero iOS inset unchanged', async () => {
      setOS('ios');
      const spy = jest
        .spyOn(safeArea, 'useSafeAreaInsets')
        .mockReturnValue({top: 0, bottom: 0, left: 0, right: 0});
      const view = await render(<ScoreCalcView />);
      expect(findStyleValue(view.toJSON(), 'paddingTop')).toBe(0);
      spy.mockRestore();
    });

    it('still renders every card on iOS', async () => {
      setOS('ios');
      const view = await render(<ScoreCalcView />);
      expect(view.getByTestId('scorecalc-current-card')).toBeOnTheScreen();
      expect(view.getByTestId('scorecalc-docs-card')).toBeOnTheScreen();
      expect(view.getByTestId('scorecalc-other-card')).toBeOnTheScreen();
    });

    it('does not consult the safe area on non-iOS platforms', async () => {
      setOS('android');
      const spy = jest.spyOn(safeArea, 'useSafeAreaInsets');
      await render(<ScoreCalcView />);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
