import React from 'react';
import {
  render,
  screen,
  renderHook,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import {Appearance, View} from 'react-native';
import {useColor} from '@/utils/color/color';
import type {ThemeColor} from '@/utils/color/color';
import Card from '@/utils/ui/Card';
import ScoreCalcViewDevCard from '@/components/scorecalc/component/ScoreCalcViewDevCard';
import ScoreCalcViewDocsCard from '@/components/scorecalc/component/ScoreCalcViewDocsCard';
import ScoreCalcModule from '@/modules/NativeScoreCalcModule';
import CommonModule from '@/modules/NativeCommonModule';
import zh from '@/i18n/zh/translation.json';

/**
 * NOTE: RNTL v14's `render` is async — every call below is awaited.
 */

/**
 * The palette is not exported as a value, and the lint config forbids colour
 * literals, so resolve the real theme through the hook once per test.
 */
let cachedPalette: ThemeColor | undefined;
const lightPalette = (): ThemeColor => {
  if (!cachedPalette) {
    throw new Error('palette not resolved — call loadPalette() in beforeAll');
  }
  return cachedPalette;
};

beforeAll(async () => {
  jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
  cachedPalette = (await renderHook(() => useColor())).result.current;
});

/** Press the element carrying the given testID. */
const press = async (testID: string) => {
  await fireEvent.press(screen.getByTestId(testID));
};

/** Type into the element carrying the given testID. */
const fireEventChangeText = async (testID: string, value: string) => {
  await fireEvent.changeText(screen.getByTestId(testID), value);
};

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
describe('useColor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the light palette when the system is in light mode', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const {result} = await renderHook(() => useColor());
    expect(result.current.ham_bg_b1).toBe('#F9F9F9FF');
    expect(result.current.ham_text_primary).toBe('black');
  });

  it('returns the dark palette when the system is in dark mode', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    const {result} = await renderHook(() => useColor());
    expect(result.current.ham_bg_b1).toBe('#000000');
    expect(result.current.ham_text_primary).toBe('white');
  });

  it('treats a null color scheme as light', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(null);
    const {result} = await renderHook(() => useColor());
    expect(result.current.ham_bg_b1).toBe('#F9F9F9FF');
  });

  it('exposes the same keys in both palettes', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const light = (await renderHook(() => useColor())).result.current;
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    const dark = (await renderHook(() => useColor())).result.current;
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
  });

  it('registers an appearance change listener', async () => {
    const addChangeListener = jest.spyOn(Appearance, 'addChangeListener');
    await renderHook(() => useColor());
    expect(addChangeListener).toHaveBeenCalled();
  });
});

describe('Card', () => {
  it('renders its children', async () => {
    await render(
      <Card testID="card">
        <View testID="child" />
      </Card>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('applies the default 16pt padding', async () => {
    await render(
      <Card testID="card">
        <View />
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveStyle({padding: 16});
  });

  it('honours a custom padding', async () => {
    await render(
      <Card testID="card" padding={24}>
        <View />
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveStyle({padding: 24});
  });

  it('rounds its corners', async () => {
    await render(
      <Card testID="card">
        <View />
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveStyle({borderRadius: 16});
  });

  it('uses the surface colour from the current theme', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    await render(
      <Card testID="card">
        <View />
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveStyle({backgroundColor: 'white'});
  });

  it('uses the dark surface colour in dark mode', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    await render(
      <Card testID="card">
        <View />
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: '#0f1010FF',
    });
  });

  it('omits the testID when none is given', async () => {
    await render(
      <Card>
        <View testID="child" />
      </Card>,
    );
    expect(screen.queryByTestId('card')).toBeNull();
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});

describe('ScoreCalcViewDocsCard', () => {
  const DOCS_URL =
    'https://docs.ham.nowcent.cn/developers/ham-rn/score-calc.html';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the docs title', async () => {
    await render(
      <ScoreCalcViewDocsCard testID="docs" color={lightPalette()} />,
    );
    expect(screen.getByTestId('docs-title')).toHaveTextContent(
      zh.scorecalc.docs.title,
    );
  });

  it('opens the documentation url when pressed', async () => {
    await render(
      <ScoreCalcViewDocsCard testID="docs" color={lightPalette()} />,
    );
    await press('docs');
    expect(CommonModule.openUrl).toHaveBeenCalledWith(DOCS_URL);
  });

  it('is pressable as a whole card', async () => {
    await render(
      <ScoreCalcViewDocsCard testID="docs" color={lightPalette()} />,
    );
    expect(screen.getByTestId('docs')).toBeTruthy();
  });

  it('renders the inner card container', async () => {
    await render(
      <ScoreCalcViewDocsCard testID="docs" color={lightPalette()} />,
    );
    expect(screen.getByTestId('docs-card')).toBeTruthy();
  });

  it('renders a right arrow affordance', async () => {
    const {toJSON} = await render(
      <ScoreCalcViewDocsCard testID="docs" color={lightPalette()} />,
    );
    expect(findHost(toJSON(), 'Image')).toBeDefined();
  });

  it('does not open the url until pressed', async () => {
    await render(
      <ScoreCalcViewDocsCard testID="docs" color={lightPalette()} />,
    );
    expect(CommonModule.openUrl).not.toHaveBeenCalled();
  });

  it('omits testIDs when none is given', async () => {
    await render(<ScoreCalcViewDocsCard color={lightPalette()} />);
    expect(screen.queryByTestId('docs')).toBeNull();
    expect(screen.getByText(zh.scorecalc.docs.title)).toBeTruthy();
  });
});

describe('ScoreCalcViewDevCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ScoreCalcModule.testItem as jest.Mock).mockReturnValue(true);
  });

  it('renders the developer section title', async () => {
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    expect(screen.getByTestId('dev-title')).toHaveTextContent(
      zh.scorecalc.dev.title,
    );
  });

  it('renders the code input with a placeholder', async () => {
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    expect(screen.getByTestId('dev-input').props.placeholder).toBe(
      zh.scorecalc.dev.placeholder,
    );
  });

  it('shows a success toast when verification passes', async () => {
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    await fireEventChangeText('dev-input', 'my script');
    await press('dev-verify');

    await waitFor(() =>
      expect(CommonModule.showToast).toHaveBeenCalledWith(
        'success',
        zh.scorecalc.dev.verify_success,
        '',
      ),
    );
  });

  it('shows an error toast when verification fails', async () => {
    (ScoreCalcModule.testItem as jest.Mock).mockReturnValue(false);
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    await press('dev-verify');

    await waitFor(() =>
      expect(CommonModule.showToast).toHaveBeenCalledWith(
        'error',
        zh.scorecalc.dev.verify_failed,
        zh.scorecalc.dev.verify_failed_detail,
      ),
    );
  });

  it('submits whatever was typed into the input', async () => {
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    await fireEventChangeText('dev-input', 'return [0, []];');
    await press('dev-verify');

    await waitFor(() =>
      expect(ScoreCalcModule.testItem).toHaveBeenCalledWith(
        expect.objectContaining({script: 'return [0, []];'}),
      ),
    );
  });

  it('submits an empty script when nothing was typed', async () => {
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    await press('dev-verify');

    await waitFor(() =>
      expect(ScoreCalcModule.testItem).toHaveBeenCalledWith(
        expect.objectContaining({script: ''}),
      ),
    );
  });

  it('sends a placeholder item with empty metadata', async () => {
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    await press('dev-verify');

    await waitFor(() =>
      expect(ScoreCalcModule.testItem).toHaveBeenCalledWith({
        url: '',
        author: '',
        brief: '',
        date: '',
        desc: '',
        script: '',
        title: '',
        type: 'APP',
        updateBrief: '',
        version: 0,
      }),
    );
  });

  it('keeps the last typed value when pressed twice', async () => {
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    await fireEventChangeText('dev-input', 'first');
    await press('dev-verify');
    await fireEventChangeText('dev-input', 'second');
    await press('dev-verify');

    await waitFor(() =>
      expect(ScoreCalcModule.testItem).toHaveBeenLastCalledWith(
        expect.objectContaining({script: 'second'}),
      ),
    );
  });

  it('does not verify until the done button is pressed', async () => {
    await render(<ScoreCalcViewDevCard testID="dev" color={lightPalette()} />);
    await fireEventChangeText('dev-input', 'x');
    expect(ScoreCalcModule.testItem).not.toHaveBeenCalled();
  });

  it('omits testIDs when none is given', async () => {
    await render(<ScoreCalcViewDevCard color={lightPalette()} />);
    expect(screen.queryByTestId('dev')).toBeNull();
    expect(screen.getByText(zh.scorecalc.dev.title)).toBeTruthy();
  });
});
