import React from 'react';
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {Appearance} from 'react-native';
import ScoreCalcViewOtherItemCell from '@/components/scorecalc/component/other/ScoreCalcViewOtherItemCell';
import type {ScoreCalcItem} from '@/business/education/scorecalc/type';
import type {ThemeColor} from '@/utils/color/color';
import {useColor} from '@/utils/color/color';
import zh from '@/i18n/zh/translation.json';
import {makeScoreCalcItem} from '../../helpers/factories';

const TEST_ID = 'cell';
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

afterEach(() => {
  jest.restoreAllMocks();
});

const renderCell = async (
  item: ScoreCalcItem,
  overrides: {
    currentItem?: ScoreCalcItem;
    goToDetail?: () => void;
    onSelect?: () => void;
  } = {},
) => {
  const goToDetail = overrides.goToDetail ?? jest.fn();
  const onSelect = overrides.onSelect ?? jest.fn();
  await render(
    <ScoreCalcViewOtherItemCell
      testID={TEST_ID}
      item={item}
      color={color}
      currentItem={overrides.currentItem}
      goToDetail={goToDetail}
      onSelect={onSelect}
    />,
  );
  return {goToDetail, onSelect};
};

describe('ScoreCalcViewOtherItemCell', () => {
  describe('content', () => {
    it('renders the item title', async () => {
      const item = makeScoreCalcItem({title: '学分绩计算器'});
      await renderCell(item);

      expect(screen.getByTestId('cell-title')).toHaveTextContent(
        '学分绩计算器',
      );
    });

    it('renders the item brief', async () => {
      const item = makeScoreCalcItem({brief: '按学分加权计算'});
      await renderCell(item);

      expect(screen.getByTestId('cell-brief')).toHaveTextContent(
        '按学分加权计算',
      );
    });

    it('renders the github badge for a GITHUB typed item', async () => {
      await renderCell(makeScoreCalcItem({type: 'GITHUB'}));

      expect(screen.getByTestId('cell-github-icon')).toBeOnTheScreen();
    });

    it('does not render the github badge for an APP typed item', async () => {
      await renderCell(makeScoreCalcItem({type: 'APP'}));

      expect(screen.queryByTestId('cell-github-icon')).toBeNull();
    });

    it('uses a different github badge in dark mode than in light mode', async () => {
      jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
      await renderCell(makeScoreCalcItem({type: 'GITHUB'}));
      const lightSource = screen.getByTestId('cell-github-icon').props.source;

      // Remount under `dark` so the component re-reads the color scheme.
      jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
      await render(
        <ScoreCalcViewOtherItemCell
          testID="dark"
          item={makeScoreCalcItem({type: 'GITHUB'})}
          color={color}
          currentItem={undefined}
          goToDetail={jest.fn()}
          onSelect={jest.fn()}
        />,
      );
      const darkSource = screen.getByTestId('dark-github-icon').props.source;

      expect(lightSource).toBeDefined();
      expect(darkSource).toBeDefined();
      expect(darkSource).not.toEqual(lightSource);
    });
  });

  describe('current item logic', () => {
    it('renders the current marker when title, url and version all match', async () => {
      const item = makeScoreCalcItem({title: '脚本 A', version: 4});
      await renderCell(item, {currentItem: item});

      expect(screen.getByTestId('cell-current')).toHaveTextContent(
        t.item.current,
      );
      expect(screen.queryByTestId('cell-select')).toBeNull();
    });

    it('offers an upgrade when title and url match but the version differs', async () => {
      const item = makeScoreCalcItem({title: '脚本 A', version: 2});
      await renderCell(item, {
        currentItem: makeScoreCalcItem({
          title: item.title,
          url: item.url,
          version: 3,
        }),
      });

      expect(screen.queryByTestId('cell-current')).toBeNull();
      expect(screen.getByTestId('cell-select-text')).toHaveTextContent(
        t.item.upgrade,
      );
    });

    it('offers a selection when the title differs', async () => {
      const item = makeScoreCalcItem({title: '脚本 A'});
      await renderCell(item, {
        currentItem: makeScoreCalcItem({title: '脚本 B'}),
      });

      expect(screen.queryByTestId('cell-current')).toBeNull();
      expect(screen.getByTestId('cell-select-text')).toHaveTextContent(
        t.item.select,
      );
    });

    it('offers a selection when the title matches but the url differs', async () => {
      const item = makeScoreCalcItem({title: '脚本 A'});
      await renderCell(item, {
        currentItem: makeScoreCalcItem({
          title: item.title,
          url: 'https://example.com/other',
          version: item.version,
        }),
      });

      expect(screen.queryByTestId('cell-current')).toBeNull();
      expect(screen.getByTestId('cell-select-text')).toHaveTextContent(
        t.item.select,
      );
    });

    it('offers a selection when there is no current item', async () => {
      await renderCell(makeScoreCalcItem(), {currentItem: undefined});

      expect(screen.queryByTestId('cell-current')).toBeNull();
      expect(screen.getByTestId('cell-select-text')).toHaveTextContent(
        t.item.select,
      );
    });
  });

  describe('press handling', () => {
    it('calls onSelect when the select button is pressed', async () => {
      const item = makeScoreCalcItem();
      const {onSelect} = await renderCell(item);

      fireEvent.press(screen.getByTestId('cell-select'));

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledTimes(1);
      });
    });

    it('calls goToDetail when the row is pressed', async () => {
      const item = makeScoreCalcItem();
      const {goToDetail, onSelect} = await renderCell(item);

      fireEvent.press(screen.getByTestId('cell-row'));

      await waitFor(() => {
        expect(goToDetail).toHaveBeenCalledTimes(1);
      });
      expect(onSelect).not.toHaveBeenCalled();
    });

    // The select `TouchableOpacity` is nested inside the outer
    // `TouchableWithoutFeedback`. RNTL dispatches to the innermost handler
    // only, so the outer `goToDetail` is NOT triggered — verified empirically.
    it('does not bubble the select press up to the row handler', async () => {
      const item = makeScoreCalcItem();
      const {goToDetail, onSelect} = await renderCell(item);

      fireEvent.press(screen.getByTestId('cell-select'));

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledTimes(1);
      });
      expect(goToDetail).not.toHaveBeenCalled();
    });
  });
});
