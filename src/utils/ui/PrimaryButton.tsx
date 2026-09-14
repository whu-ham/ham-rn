/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/9/15
 */
import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import Color from 'color';
import {useColor} from '@/utils/color/color';

/**
 * The app's primary action, matching the host app's success/error buttons:
 * blue label on a 10%-blue fill, 8pt corners, capped at 350pt wide.
 *
 * Mirrors `SuccessView.swift` in ham-ios, which draws this as
 * `Color.blue.opacity(0.1)` with `cornerRadius(8)` — a tinted fill rather than
 * a solid one. Composited over a white page that lands on #E6F2FF, which is
 * why `ham_lightBlue` (#E6F1FF) is the same idea in token form.
 *
 * One deliberate departure: the label is the accent darkened by 0.16 instead
 * of the raw accent. On this fill the raw blue measures 3.53:1, below the
 * 4.5:1 WCAG AA floor; darkening it just enough reaches 4.77:1 and is very
 * hard to tell apart by eye.
 */
const MAX_WIDTH = 350;
const CORNER_RADIUS = 8;
const FILL_OPACITY = 0.1;
const LABEL_DARKEN = 0.16;

const PrimaryButton = ({
  label,
  onPress,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  /**
   * RN's `testID` is invisible to Maestro on iOS — it does not reach the
   * accessibility tree — so anything a flow must select needs a label. Kept
   * optional because only the e2e flows have that requirement.
   */
  accessibilityLabel?: string;
}): React.ReactElement => {
  const color = useColor();
  // Alpha-composite the tint over the surface it sits on, the way the renderer
  // would. `Color(...).alpha(...)` alone would hand back an rgba() string that
  // stacks differently depending on what is painted underneath.
  const surface = Color(color.ham_bg_b1).rgb().array();
  const accent = Color(color.ham_blue).rgb().array();
  const fill = Color.rgb(
    accent.map(
      (channel, index) =>
        FILL_OPACITY * channel + (1 - FILL_OPACITY) * surface[index],
    ) as [number, number, number],
  ).hex();
  const labelColor = Color(color.ham_blue).darken(LABEL_DARKEN).hex();

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, {backgroundColor: fill}]}
      onPress={onPress}>
      <Text
        testID={testID ? `${testID}-text` : undefined}
        style={[styles.label, {color: labelColor}]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: CORNER_RADIUS,
    justifyContent: 'center',
    maxWidth: MAX_WIDTH,
    padding: 16,
    width: '100%',
  },
  label: {
    fontSize: 17,
    fontWeight: '400',
  },
});

export default PrimaryButton;
