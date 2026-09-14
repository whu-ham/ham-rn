import React from 'react';
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import ScoreCalcViewOtherCard from '@/components/scorecalc/component/other/ScoreCalcViewOtherCard';
import type {ScoreCalcItem} from '@/business/education/scorecalc/type';
import type {ThemeColor} from '@/utils/color/color';
import {useColor} from '@/utils/color/color';
import CommonModule from '@/modules/NativeCommonModule';
import ScoreCalcModule from '@/modules/NativeScoreCalcModule';
import zh from '@/i18n/zh/translation.json';
import {makeScoreCalcItem} from '../../helpers/factories';

const TEST_ID = 'other';
const t = zh.scorecalc;

/**
 * `ThemeColor` is only exported as a type, so borrow the object the
 * production `useColor()` hook resolves to instead of hardcoding literals
 * (the `react-native/no-color-literals` lint rule forbids the latter).
 */
let color: ThemeColor;

beforeAll(async () => {
  const {result} = await renderHook(() => useColor());
  color = result.current;
});

beforeEach(() => {
  jest.clearAllMocks();
});

const renderCard = async (
  calcList: Array<ScoreCalcItem>,
  overrides: {
    currentItem?: ScoreCalcItem;
    onSetItem?: () => void;
  } = {},
) => {
  const onSetItem = overrides.onSetItem ?? jest.fn();
  await render(
    <ScoreCalcViewOtherCard
      testID={TEST_ID}
      color={color}
      calcList={calcList}
      currentItem={overrides.currentItem}
      onSetItem={onSetItem}
    />,
  );
  return {onSetItem};
};

/**
 * `ScoreCalcViewOtherItemCell` only consumes its `testID` as a prefix for its
 * own nodes (`<testID>-row`, `-title`, …); the bare `other-item-<index>`
 * testID is never attached to an element. Count rows instead.
 */
const rows = () => screen.queryAllByTestId(/^other-item-\d+-row$/);

describe('ScoreCalcViewOtherCard', () => {
  it('renders the card title', async () => {
    await renderCard([]);

    expect(screen.getByTestId('other-title')).toHaveTextContent(t.other.title);
  });

  describe('with an empty calcList', () => {
    beforeEach(async () => {
      await renderCard([]);
    });

    it('renders the empty placeholder', () => {
      expect(screen.getByTestId('other-empty')).toHaveTextContent(
        t.other.empty,
      );
    });

    it('renders no item cells', () => {
      expect(rows()).toHaveLength(0);
    });

    it('renders no dividers', () => {
      expect(screen.queryAllByTestId(/^other-divider-\d+$/)).toHaveLength(0);
    });
  });

  describe('list size', () => {
    it('renders a single item and no divider when calcList has one entry', async () => {
      await renderCard([makeScoreCalcItem()]);

      expect(rows()).toHaveLength(1);
      expect(screen.queryAllByTestId(/^other-divider-\d+$/)).toHaveLength(0);
      expect(screen.queryByTestId('other-empty')).toBeNull();
    });

    it('renders two items and a single divider when calcList has two entries', async () => {
      await renderCard([makeScoreCalcItem(), makeScoreCalcItem()]);

      expect(rows()).toHaveLength(2);
      expect(screen.getByTestId('other-divider-0')).toBeOnTheScreen();
      expect(screen.queryAllByTestId(/^other-divider-\d+$/)).toHaveLength(1);
    });

    it('skips the divider after the last item when calcList has three entries', async () => {
      await renderCard([
        makeScoreCalcItem(),
        makeScoreCalcItem(),
        makeScoreCalcItem(),
      ]);

      expect(rows()).toHaveLength(3);
      expect(screen.getByTestId('other-divider-0')).toBeOnTheScreen();
      expect(screen.getByTestId('other-divider-1')).toBeOnTheScreen();
      expect(screen.queryByTestId('other-divider-2')).toBeNull();
      expect(screen.queryAllByTestId(/^other-divider-\d+$/)).toHaveLength(2);
    });
  });

  describe('item content', () => {
    it('renders the title and brief of every item', async () => {
      const first = makeScoreCalcItem({title: '第一个脚本', brief: '简介一'});
      const second = makeScoreCalcItem({title: '第二个脚本', brief: '简介二'});
      await renderCard([first, second]);

      expect(screen.getByTestId('other-item-0-title')).toHaveTextContent(
        '第一个脚本',
      );
      expect(screen.getByTestId('other-item-0-brief')).toHaveTextContent(
        '简介一',
      );
      expect(screen.getByTestId('other-item-1-title')).toHaveTextContent(
        '第二个脚本',
      );
      expect(screen.getByTestId('other-item-1-brief')).toHaveTextContent(
        '简介二',
      );
    });

    it('renders the github badge only for GITHUB typed items', async () => {
      await renderCard([
        makeScoreCalcItem({type: 'GITHUB'}),
        makeScoreCalcItem({type: 'APP'}),
      ]);

      expect(screen.getByTestId('other-item-0-github-icon')).toBeOnTheScreen();
      expect(screen.queryByTestId('other-item-1-github-icon')).toBeNull();
    });
  });

  describe('selecting an item', () => {
    it('shows a success toast and refreshes when the script is valid', async () => {
      const item = makeScoreCalcItem();
      (ScoreCalcModule.selectCalc as jest.Mock).mockReturnValue(true);
      const {onSetItem} = await renderCard([item]);

      fireEvent.press(screen.getByTestId('other-item-0-select'));

      expect(ScoreCalcModule.selectCalc).toHaveBeenCalledWith(item);
      await waitFor(() => {
        expect(CommonModule.showToast).toHaveBeenCalledWith(
          'success',
          zh.common.selected,
          '',
        );
      });
      await waitFor(() => {
        expect(onSetItem).toHaveBeenCalledTimes(1);
      });
    });

    it('shows an error toast and skips the refresh when the script is invalid', async () => {
      const item = makeScoreCalcItem();
      (ScoreCalcModule.selectCalc as jest.Mock).mockReturnValue(false);
      const {onSetItem} = await renderCard([item]);

      fireEvent.press(screen.getByTestId('other-item-0-select'));

      await waitFor(() => {
        expect(CommonModule.showToast).toHaveBeenCalledWith(
          'error',
          zh.common.script_invalid,
          zh.common.contact_author,
        );
      });
      expect(onSetItem).not.toHaveBeenCalled();
    });
  });

  describe('opening the detail page', () => {
    it('calls openDetail with the pressed item', async () => {
      const first = makeScoreCalcItem();
      const second = makeScoreCalcItem();
      await renderCard([first, second]);

      fireEvent.press(screen.getByTestId('other-item-1-row'));

      await waitFor(() => {
        expect(ScoreCalcModule.openDetail).toHaveBeenCalledWith(second);
      });
      expect(ScoreCalcModule.selectCalc).not.toHaveBeenCalled();
    });
  });

  describe('currentItem forwarding', () => {
    it('marks the matching row as current and leaves the others selectable', async () => {
      const current = makeScoreCalcItem({title: '当前脚本', version: 3});
      const other = makeScoreCalcItem();
      await renderCard([current, other], {currentItem: current});

      expect(screen.getByTestId('other-item-0-current')).toHaveTextContent(
        t.item.current,
      );
      expect(screen.queryByTestId('other-item-0-select')).toBeNull();
      expect(screen.queryByTestId('other-item-1-current')).toBeNull();
      expect(screen.getByTestId('other-item-1-select-text')).toHaveTextContent(
        t.item.select,
      );
    });

    it('offers an upgrade when currentItem shares title and url but not version', async () => {
      const item = makeScoreCalcItem({title: '当前脚本', version: 2});
      const currentItem = makeScoreCalcItem({
        title: item.title,
        url: item.url,
        version: 3,
      });
      await renderCard([item], {currentItem});

      expect(screen.queryByTestId('other-item-0-current')).toBeNull();
      expect(screen.getByTestId('other-item-0-select-text')).toHaveTextContent(
        t.item.upgrade,
      );
    });

    it('renders no current marker when currentItem is undefined', async () => {
      await renderCard([makeScoreCalcItem()]);

      expect(screen.queryAllByTestId(/^other-item-\d+-current$/)).toHaveLength(
        0,
      );
      expect(screen.queryAllByTestId(/^other-item-\d+-select$/)).toHaveLength(
        1,
      );
    });
  });
});
