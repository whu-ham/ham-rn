import React from 'react';
import {Appearance} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import PrimaryButton from '@/utils/ui/PrimaryButton';
import Color from 'color';

/**
 * Pins this to the host app's success/error button: a blue label on a
 * 10%-blue fill, 8pt corners, capped at 350pt. Both hosts draw it —
 * `SuccessView.swift` in ham-ios and `SuccessView.kt` in ham-android — so the
 * numbers are asserted rather than eyeballed, and a restyle of one cannot
 * quietly drift from the other two.
 *
 * Every colour is read through `colorOf`, and the scheme is pinned per test
 * with `Appearance.getColorScheme`, including light: the suite runs with the
 * scheme unset, which resolves to light, and a test that depends on that by
 * accident breaks the moment the default moves.
 */
const renderButton = async (overrides: {onPress?: jest.Mock} = {}) => {
  const onPress = overrides.onPress ?? jest.fn();
  const utils = await render(
    <PrimaryButton testID="primary" label="好的" onPress={onPress} />,
  );
  return {...utils, onPress};
};

/** Find a host node of the given component type in the rendered tree. */
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

const buttonNode = (tree: unknown) =>
  findHost(tree, 'View') as {props: {style: unknown}} | undefined;

/** Flatten a style prop (possibly an array) into one object. */
const flattenStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return (style ?? {}) as Record<string, unknown>;
};

/**
 * The resolved colour of a rendered node.
 *
 * Read through `flattenStyle`, not straight off `props.style`: a style prop is
 * usually an array, and `Color(array)` does not throw — it silently parses to
 * black. A contrast assertion built on that passes for every colour, which is
 * how this test previously "proved" legibility while measuring nothing.
 */
const colorOf = (testID: string): string =>
  String(flattenStyle(screen.getByTestId(testID).props.style).color);

describe('PrimaryButton', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const inLight = () =>
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');

  it('renders the label it was given', async () => {
    await renderButton();
    expect(screen.getByTestId('primary-text')).toHaveTextContent('好的');
  });

  it('presses only when pressed', async () => {
    const onPress = jest.fn();
    await renderButton({onPress});
    expect(onPress).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('primary'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the 8pt corner radius the host app uses', async () => {
    const {toJSON} = await renderButton();
    const style = flattenStyle(buttonNode(toJSON())?.props.style);
    expect(style.borderRadius).toBe(8);
  });

  it('caps its width at 350pt like the host app', async () => {
    const {toJSON} = await renderButton();
    const style = flattenStyle(buttonNode(toJSON())?.props.style);
    expect(style.maxWidth).toBe(350);
  });

  it('centres its label horizontally', async () => {
    const {toJSON} = await renderButton();
    const style = flattenStyle(buttonNode(toJSON())?.props.style);
    expect(style.alignItems).toBe('center');
  });

  it('centres itself within its parent', async () => {
    const {toJSON} = await renderButton();
    const style = flattenStyle(buttonNode(toJSON())?.props.style);
    expect(style.alignSelf).toBe('center');
  });

  it('pads by 16pt, matching the SwiftUI default', async () => {
    const {toJSON} = await renderButton();
    const style = flattenStyle(buttonNode(toJSON())?.props.style);
    expect(style.padding).toBe(16);
  });

  it('fills with the accent at 10% over the page background', async () => {
    inLight();
    const {toJSON} = await renderButton();
    const style = flattenStyle(buttonNode(toJSON())?.props.style);
    // Light mode: #007AFF at 0.1 over ham_bg_b1 (#F9F9F9) — the same composite
    // ham-ios gets from Color.blue.opacity(0.1).
    const expected = Color.rgb(
      Color('#007AFF')
        .rgb()
        .array()
        .map(
          (channel, index) =>
            0.1 * channel + 0.9 * Color('#F9F9F9').rgb().array()[index],
        ) as [number, number, number],
    ).hex();
    expect(style.backgroundColor).toBe(expected);
  });

  it('labels with the raw accent, the way both hosts do', async () => {
    inLight();
    await renderButton();
    // Neither host adjusts its label: ham-ios `SuccessView.swift` uses
    // `Color.blue`, ham-android `SuccessView.kt` uses `Color.ham_blue`. The
    // accent is already a per-scheme token, so the raw reference is the one
    // thing that resolves correctly under both.
    expect(colorOf('primary-text')).toBe('#007AFF');
  });

  it('keeps the label legible on the tinted fill in dark mode', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    const {toJSON} = await renderButton();
    const style = flattenStyle(buttonNode(toJSON())?.props.style);
    const contrast = Color(style.backgroundColor as string).contrast(
      Color(colorOf('primary-text')),
    );
    // Dark is the scheme worth pinning: the fill is near-black (#010D1A) and
    // the accent is #0A84FF, so the raw token lands at 5.36:1. The old
    // implementation darkened the accent for both schemes and took this to
    // 4.04:1 — under the floor it was claiming to hold.
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(colorOf('primary-text')).toBe('#0A84FF');
  });

  it('forwards an accessibilityLabel when given one', async () => {
    // RN's testID does not reach iOS's accessibility tree, so Maestro cannot
    // select by it; the e2e flows depend on this prop instead.
    await render(
      <PrimaryButton
        testID="e2e-button"
        accessibilityLabel="ignoredCourseAcknowledge"
        label="好的"
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('ignoredCourseAcknowledge')).toBeTruthy();
  });

  it('omits testIDs entirely when no testID prop is given', async () => {
    await render(<PrimaryButton label="好的" onPress={jest.fn()} />);
    expect(screen.queryByTestId('primary')).toBeNull();
    expect(screen.getByText('好的')).toBeTruthy();
  });
});
