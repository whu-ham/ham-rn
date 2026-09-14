import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import PrimaryButton from '@/utils/ui/PrimaryButton';
import Color from 'color';

/**
 * Pins this to the host app's success/error button (`SuccessView.swift` in
 * ham-ios): a blue label on a 10%-blue fill, 8pt corners, capped at 350pt.
 * The numbers are asserted rather than eyeballed so a restyle of one button
 * cannot quietly drift from the other.
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

describe('PrimaryButton', () => {
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

  it('keeps the label legible on the tinted fill', async () => {
    const {toJSON} = await renderButton();
    const style = flattenStyle(buttonNode(toJSON())?.props.style);
    const contrast = Color(style.backgroundColor as string).contrast(
      Color(screen.getByTestId('primary-text').props.style.color),
    );
    // The host app's raw accent measures 3.53:1 here, under the AA floor.
    expect(contrast).toBeGreaterThanOrEqual(4.5);
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
