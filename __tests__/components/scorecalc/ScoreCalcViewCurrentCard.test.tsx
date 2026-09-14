/**
 * Tests for {@link ScoreCalcViewCurrentCard}.
 *
 * The card has two independent branches to pin down: the empty/populated
 * split, and the "can I upgrade?" split which decides between an update button
 * and a "latest" marker. Assertions read translated copy out of the zh bundle
 * instead of hardcoding it.
 */
import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import type {ScoreCalcItem} from '@/business/education/scorecalc/type';
import ScoreCalcViewCurrentCard from '@/components/scorecalc/component/ScoreCalcViewCurrentCard';
import CommonModule from '@/modules/NativeCommonModule';
import ScoreCalcModule from '@/modules/NativeScoreCalcModule';
import translation from '@/i18n/zh/translation.json';
import type {ThemeColor} from '@/utils/color/color';

import {makeScoreCalcItem} from '../../helpers/factories';

const zh = translation.scorecalc.current;
const zhCommon = translation.common;
const TEST_ID = 'current';

const color: ThemeColor = {
  ham_red: '#FF3B30',
  ham_orange: '#FF9500',
  ham_yellow: '#FFCC00',
  ham_green: '#34C759',
  ham_mint: '#00C7BE',
  ham_teal: '#30B3C7',
  ham_cyan: '#32ADE6',
  ham_blue: '#007AFF',
  ham_indigo: '#5856D6',
  ham_purple: '#AF52DE',
  ham_pink: '#FF2D55',
  ham_brown: '#A2845E',
  ham_gray: '#8E8E93',
  ham_text_primary: 'black',
  ham_text_secondary: 'gray',
  ham_bg_b1: '#F9F9F9FF',
  ham_bg_b2: 'white',
  ham_divider: '#F4F4F4',
  ham_lightGray: '#EDEEEF',
  ham_lightBlue: '#E6F1FF',
};

/**
 * Node in RNTL's rendered JSON tree. The helpers type it as `unknown` and
 * narrow, matching how the other suites in this repo walk the tree.
 */
type JsonNode = unknown;

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

/** Collect every value styled under `key` anywhere in the tree. */
const findStyleValues = (node: JsonNode, key: string): unknown[] => {
  if (node === null || typeof node !== 'object') {
    return [];
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
  const own = styles
    .filter(entry => key in entry)
    .map(entry => entry[key] as unknown);
  const nested = (element.children ?? []).flatMap(child =>
    findStyleValues(child, key),
  );
  return [...own, ...nested];
};

/**
 * Render the card. `testID` defaults to {@link TEST_ID}; pass `undefined`
 * explicitly to exercise the branch where the prop is omitted.
 */
const renderCard = (props: {
  item?: ScoreCalcItem;
  listItem?: ScoreCalcItem;
  onSetItem?: () => void;
  testID?: string;
}) =>
  render(
    <ScoreCalcViewCurrentCard
      color={color}
      item={props.item}
      listItem={props.listItem}
      onSetItem={props.onSetItem ?? jest.fn()}
      testID={'testID' in props ? props.testID : TEST_ID}
    />,
  );

describe('ScoreCalcViewCurrentCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    it('renders the empty state when there is no current item', async () => {
      const view = await renderCard({item: undefined});
      expect(view.getByTestId(`${TEST_ID}-empty`)).toBeOnTheScreen();
    });

    it('shows the "not selected" copy in the empty state', async () => {
      const view = await renderCard({item: undefined});
      expect(view.getByTestId(`${TEST_ID}-empty`)).toHaveTextContent(zh.none);
    });

    it('does not render the content branch when empty', async () => {
      const view = await renderCard({item: undefined});
      expect(view.queryByTestId(`${TEST_ID}-content`)).toBeNull();
    });

    it('still renders the card title when empty', async () => {
      const view = await renderCard({item: undefined});
      expect(view.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(zh.title);
    });
  });

  describe('populated state', () => {
    const item = makeScoreCalcItem({
      title: '计算机学院综测计算（F2）',
      date: '2026-04-29',
      author: 'orangeboyChen',
      desc: 'F2＝必修课加权均分',
    });

    it('renders the content branch when populated', async () => {
      const view = await renderCard({item});
      expect(view.getByTestId(`${TEST_ID}-content`)).toBeOnTheScreen();
    });

    it('does not render the empty state when populated', async () => {
      const view = await renderCard({item});
      expect(view.queryByTestId(`${TEST_ID}-empty`)).toBeNull();
    });

    it('renders the item title', async () => {
      const view = await renderCard({item});
      expect(view.getByTestId(`${TEST_ID}-desc-title`)).toHaveTextContent(
        item.title,
      );
    });

    it('renders the date and author meta line', async () => {
      const view = await renderCard({item});
      expect(view.getByTestId(`${TEST_ID}-desc-meta`)).toHaveTextContent(
        `${item.date} · ${item.author}`,
      );
    });

    it('renders the item description', async () => {
      const view = await renderCard({item});
      expect(view.getByTestId(`${TEST_ID}-desc-desc`)).toHaveTextContent(
        item.desc,
      );
    });

    it('renders the description from the list item when an upgrade is available', async () => {
      const listItem = makeScoreCalcItem({
        version: item.version + 1,
        desc: '更新后的说明',
        updateBrief: '修复计算错误',
      });
      const view = await renderCard({item, listItem});
      expect(view.getByTestId(`${TEST_ID}-desc-desc`)).toHaveTextContent(
        listItem.desc,
      );
      const updateLog = view.getByTestId(`${TEST_ID}-desc-update-log`);
      expect(updateLog).toHaveTextContent(
        translation.scorecalc.desc.update_log,
        {exact: false},
      );
      expect(updateLog).toHaveTextContent(listItem.updateBrief, {
        exact: false,
      });
    });
  });

  describe('update / latest branch', () => {
    it('renders the latest marker when the versions match', async () => {
      const item = makeScoreCalcItem({version: 3});
      const listItem = makeScoreCalcItem({
        version: 3,
        title: item.title,
        url: item.url,
      });
      const view = await renderCard({item, listItem});
      expect(view.getByTestId(`${TEST_ID}-latest`)).toBeOnTheScreen();
      expect(view.getByTestId(`${TEST_ID}-latest`)).toHaveTextContent(
        zh.latest,
      );
    });

    it('renders no update button when the versions match', async () => {
      const item = makeScoreCalcItem({version: 3});
      const listItem = makeScoreCalcItem({
        version: 3,
        title: item.title,
        url: item.url,
      });
      const view = await renderCard({item, listItem});
      expect(view.queryByTestId(`${TEST_ID}-update-button`)).toBeNull();
    });

    it('renders the update button when the versions differ', async () => {
      const item = makeScoreCalcItem({version: 1});
      const listItem = makeScoreCalcItem({
        version: 2,
        title: item.title,
        url: item.url,
      });
      const view = await renderCard({item, listItem});
      expect(view.getByTestId(`${TEST_ID}-update-button`)).toBeOnTheScreen();
      expect(view.getByTestId(`${TEST_ID}-update-button`)).toHaveTextContent(
        zh.update,
      );
    });

    it('renders no latest marker when the versions differ', async () => {
      const item = makeScoreCalcItem({version: 1});
      const listItem = makeScoreCalcItem({
        version: 2,
        title: item.title,
        url: item.url,
      });
      const view = await renderCard({item, listItem});
      expect(view.queryByTestId(`${TEST_ID}-latest`)).toBeNull();
    });

    it('falls back to the latest marker when there is no list item', async () => {
      const item = makeScoreCalcItem({version: 1});
      const view = await renderCard({item, listItem: undefined});
      expect(view.getByTestId(`${TEST_ID}-latest`)).toBeOnTheScreen();
      expect(view.queryByTestId(`${TEST_ID}-update-button`)).toBeNull();
    });

    it('renders the latest marker for a populated item without a list entry', async () => {
      const item = makeScoreCalcItem({version: 7});
      const view = await renderCard({item});
      expect(view.getByTestId(`${TEST_ID}-latest`)).toBeOnTheScreen();
    });
  });

  describe('pressing the update button', () => {
    const build = () => {
      const item = makeScoreCalcItem({version: 1});
      const listItem = makeScoreCalcItem({
        version: 2,
        title: item.title,
        url: item.url,
      });
      return {item, listItem};
    };

    it('calls selectCalc with the list item', async () => {
      const {item, listItem} = build();
      (ScoreCalcModule.selectCalc as jest.Mock).mockReturnValue(true);
      const view = await renderCard({item, listItem});
      await fireEvent.press(view.getByTestId(`${TEST_ID}-update-button`));
      await waitFor(() =>
        expect(ScoreCalcModule.selectCalc).toHaveBeenCalledWith(listItem),
      );
    });

    it('shows a success toast and notifies the parent when the selection sticks', async () => {
      const {item, listItem} = build();
      const onSetItem = jest.fn();
      (ScoreCalcModule.selectCalc as jest.Mock).mockReturnValue(true);
      const view = await renderCard({item, listItem, onSetItem});
      await fireEvent.press(view.getByTestId(`${TEST_ID}-update-button`));
      await waitFor(() =>
        expect(CommonModule.showToast).toHaveBeenCalledWith(
          'success',
          zh.upgraded,
          '',
        ),
      );
      expect(onSetItem).toHaveBeenCalledTimes(1);
    });

    it('shows an error toast and skips the parent when the script is invalid', async () => {
      const {item, listItem} = build();
      const onSetItem = jest.fn();
      (ScoreCalcModule.selectCalc as jest.Mock).mockReturnValue(false);
      const view = await renderCard({item, listItem, onSetItem});
      await fireEvent.press(view.getByTestId(`${TEST_ID}-update-button`));
      await waitFor(() =>
        expect(CommonModule.showToast).toHaveBeenCalledWith(
          'error',
          zhCommon.script_invalid,
          zhCommon.contact_author,
        ),
      );
      expect(onSetItem).not.toHaveBeenCalled();
    });

    it('does not call selectCalc when there is no update button', async () => {
      const item = makeScoreCalcItem({version: 3});
      const listItem = makeScoreCalcItem({
        version: 3,
        title: item.title,
        url: item.url,
      });
      const view = await renderCard({item, listItem});
      expect(view.queryByTestId(`${TEST_ID}-update-button`)).toBeNull();
      expect(ScoreCalcModule.selectCalc).not.toHaveBeenCalled();
    });

    it('does not call selectCalc in the empty state', async () => {
      const listItem = makeScoreCalcItem();
      const view = await renderCard({item: undefined, listItem});
      expect(view.queryByTestId(`${TEST_ID}-update-button`)).toBeNull();
      expect(ScoreCalcModule.selectCalc).not.toHaveBeenCalled();
    });
  });

  describe('optional testID', () => {
    it('renders without throwing when no testID is given', async () => {
      const item = makeScoreCalcItem({version: 1});
      const view = await renderCard({item, testID: undefined});
      expect(view.getByText(zh.title)).toBeOnTheScreen();
    });

    it('exposes no testIDs when no testID is given', async () => {
      const item = makeScoreCalcItem({version: 1});
      const view = await renderCard({item, testID: undefined});
      expect(view.queryByTestId(`${TEST_ID}-title`)).toBeNull();
      expect(view.queryByTestId(`${TEST_ID}-content`)).toBeNull();
    });

    it('renders the item body without testIDs when none is given', async () => {
      const item = makeScoreCalcItem({
        version: 1,
        title: '无 testID 的脚本',
      });
      const view = await renderCard({item, testID: undefined});
      expect(collectText(view.toJSON())).toContain(item.title);
    });
  });

  describe('theming', () => {
    it('paints the card title with the primary text colour', async () => {
      const item = makeScoreCalcItem({version: 1});
      const view = await renderCard({item});
      expect(view.getByTestId(`${TEST_ID}-title`)).toHaveStyle({
        color: color.ham_text_primary,
      });
    });

    it('paints the empty copy with the secondary text colour', async () => {
      const view = await renderCard({item: undefined});
      expect(view.getByText(zh.none)).toHaveStyle({
        color: color.ham_text_secondary,
      });
    });

    it('paints the latest marker with the secondary text colour', async () => {
      const item = makeScoreCalcItem({version: 1});
      const view = await renderCard({item});
      expect(view.getByText(zh.latest)).toHaveStyle({
        color: color.ham_text_secondary,
      });
    });

    it('paints the update button label with the accent colour', async () => {
      const item = makeScoreCalcItem({version: 1});
      const listItem = makeScoreCalcItem({
        version: 2,
        title: item.title,
        url: item.url,
      });
      const view = await renderCard({item, listItem});
      expect(view.getByText(zh.update)).toHaveStyle({color: color.ham_blue});
    });

    it('derives translucent backgrounds from the gray accent', async () => {
      const item = makeScoreCalcItem({version: 1});
      const view = await renderCard({item});
      const backgrounds = findStyleValues(view.toJSON(), 'backgroundColor').map(
        String,
      );
      // The enclosing Card paints its own background, so look for the
      // alpha-suffixed gray the card derives for its icon surface.
      const gray = String(color.ham_gray);
      const translucent = backgrounds.filter(
        background =>
          background.startsWith(gray) && background.length > gray.length,
      );
      expect(translucent.length).toBeGreaterThan(0);
    });

    it('renders the title in the medium headline style', async () => {
      const item = makeScoreCalcItem({version: 1});
      const view = await renderCard({item});
      expect(view.getByTestId(`${TEST_ID}-title`)).toHaveStyle({
        fontSize: 16,
        fontWeight: '500',
      });
    });
  });
});
