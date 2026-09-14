import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import ScoreCalcViewDescCell from '@/components/scorecalc/component/ScoreCalcViewDescCell';
import type {ScoreCalcItem} from '@/business/education/scorecalc/type';
import zh from '@/i18n/zh/translation.json';
import {makeScoreCalcItem} from '../../helpers/factories';

const TEST_ID = 'desc';
const t = zh.scorecalc;

beforeEach(() => {
  jest.clearAllMocks();
});

const renderCell = async (
  item: ScoreCalcItem,
  listItem?: ScoreCalcItem,
): Promise<void> => {
  await render(
    <ScoreCalcViewDescCell testID={TEST_ID} item={item} listItem={listItem} />,
  );
};

/** Build a fake `TextLayoutEvent` payload with the given number of lines. */
const textLayoutEvent = (lineCount: number) => ({
  nativeEvent: {lines: new Array(lineCount).fill({})},
});

describe('ScoreCalcViewDescCell', () => {
  describe('header', () => {
    it('renders the item title', async () => {
      await renderCell(makeScoreCalcItem({title: '学分绩计算器'}));

      expect(screen.getByTestId('desc-title')).toHaveTextContent(
        '学分绩计算器',
      );
    });

    it('caps the title at two lines', async () => {
      await renderCell(makeScoreCalcItem());

      expect(screen.getByTestId('desc-title')).toHaveProp('numberOfLines', 2);
    });

    it('renders the date and author joined by a middle dot', async () => {
      await renderCell(
        makeScoreCalcItem({date: '2026-04-29', author: 'orangeboyChen'}),
      );

      expect(screen.getByTestId('desc-meta')).toHaveTextContent(
        '2026-04-29 · orangeboyChen',
      );
    });

    it('separates the meta fields with the middle dot character', async () => {
      await renderCell(
        makeScoreCalcItem({date: '2026-01-01', author: 'someone'}),
      );

      const meta = screen.getByTestId('desc-meta').props.children;
      expect(meta).toEqual(
        expect.arrayContaining(['2026-01-01', ' · ', 'someone']),
      );
    });
  });

  describe('description source', () => {
    it('renders the item description when there is no listItem', async () => {
      await renderCell(makeScoreCalcItem({desc: '本地说明'}));

      expect(screen.getByTestId('desc-desc')).toHaveTextContent('本地说明');
    });

    it('renders the item description when the versions match', async () => {
      const item = makeScoreCalcItem({desc: '本地说明', version: 2});
      const listItem = makeScoreCalcItem({
        title: item.title,
        url: item.url,
        version: 2,
        desc: '远端说明',
      });
      await renderCell(item, listItem);

      expect(screen.getByTestId('desc-desc')).toHaveTextContent('本地说明');
    });

    it('renders the listItem description when the versions differ', async () => {
      const item = makeScoreCalcItem({desc: '本地说明', version: 1});
      const listItem = makeScoreCalcItem({
        title: item.title,
        url: item.url,
        version: 2,
        desc: '远端说明',
      });
      await renderCell(item, listItem);

      expect(screen.getByTestId('desc-desc')).toHaveTextContent('远端说明');
    });
  });

  describe('update log', () => {
    it('renders the update log when the versions differ', async () => {
      const item = makeScoreCalcItem({version: 1});
      const listItem = makeScoreCalcItem({
        title: item.title,
        url: item.url,
        version: 2,
        updateBrief: '修复了排序问题',
      });
      await renderCell(item, listItem);

      // `toHaveTextContent` is exact by default; the update log nests the
      // changelog under the header, so match it as a substring.
      expect(screen.getByTestId('desc-update-log')).toHaveTextContent(
        t.desc.update_log,
        {exact: false},
      );
      expect(screen.getByTestId('desc-update-log')).toHaveTextContent(
        '修复了排序问题',
        {exact: false},
      );
    });

    it('hides the update log when the versions match', async () => {
      const item = makeScoreCalcItem({version: 2});
      const listItem = makeScoreCalcItem({
        title: item.title,
        url: item.url,
        version: 2,
        updateBrief: '修复了排序问题',
      });
      await renderCell(item, listItem);

      expect(screen.queryByTestId('desc-update-log')).toBeNull();
    });

    it('hides the update log when there is no listItem', async () => {
      await renderCell(makeScoreCalcItem());

      expect(screen.queryByTestId('desc-update-log')).toBeNull();
    });
  });

  describe('more / collapse toggle', () => {
    it('is hidden before any text layout event fires', async () => {
      await renderCell(makeScoreCalcItem());

      expect(screen.queryByTestId('desc-toggle')).toBeNull();
      expect(screen.getByTestId('desc-desc')).toHaveProp('numberOfLines', 16);
    });

    it('appears once the description wraps to more than 15 lines', async () => {
      await renderCell(makeScoreCalcItem());

      await fireEvent(
        screen.getByTestId('desc-desc'),
        'textLayout',
        textLayoutEvent(20),
      );

      expect(screen.getByTestId('desc-toggle')).toHaveTextContent(t.desc.more);
    });

    it('stays hidden at the 15 line boundary', async () => {
      await renderCell(makeScoreCalcItem());

      await fireEvent(
        screen.getByTestId('desc-desc'),
        'textLayout',
        textLayoutEvent(15),
      );

      expect(screen.queryByTestId('desc-toggle')).toBeNull();
    });

    it('appears at 16 lines, one past the boundary', async () => {
      await renderCell(makeScoreCalcItem());

      await fireEvent(
        screen.getByTestId('desc-desc'),
        'textLayout',
        textLayoutEvent(16),
      );

      expect(screen.getByTestId('desc-toggle')).toBeOnTheScreen();
    });

    it('expands the description when pressed', async () => {
      await renderCell(makeScoreCalcItem());

      await fireEvent(
        screen.getByTestId('desc-desc'),
        'textLayout',
        textLayoutEvent(20),
      );
      await fireEvent.press(screen.getByTestId('desc-toggle'));

      expect(screen.getByTestId('desc-toggle')).toHaveTextContent(
        t.desc.collapse,
      );
      // `toHaveProp(name, undefined)` asserts the prop key is *present*, so
      // read the prop directly to assert it was cleared.
      expect(
        screen.getByTestId('desc-desc').props.numberOfLines,
      ).toBeUndefined();
    });

    it('collapses the description again when pressed twice', async () => {
      await renderCell(makeScoreCalcItem());

      await fireEvent(
        screen.getByTestId('desc-desc'),
        'textLayout',
        textLayoutEvent(20),
      );
      await fireEvent.press(screen.getByTestId('desc-toggle'));
      await fireEvent.press(screen.getByTestId('desc-toggle'));

      expect(screen.getByTestId('desc-toggle')).toHaveTextContent(t.desc.more);
      expect(screen.getByTestId('desc-desc')).toHaveProp('numberOfLines', 16);
    });
  });
});
