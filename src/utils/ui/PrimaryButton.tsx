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
 * The app's primary action, matching the host app's success/error button.
 *
 * Both hosts draw this the same way: the accent at a low alpha for the fill,
 * and the *raw* accent for the label.
 *
 *   - ham-ios `SuccessView.swift`: `Color.blue.opacity(0.1)` fill,
 *     `foregroundColor(Color.blue)`, `cornerRadius(8)`, `frame(maxWidth: 350)`.
 *   - ham-android `SuccessView.kt`: `Color.ham_blue.copy(alpha = 0.15f)` fill,
 *     `color = Color.ham_blue`, `RoundedCornerShape(12.dp)`, `height(48.dp)`.
 *
 * Neither host adjusts the label. They can get away with that because the
 * accent is itself a per-scheme token — `ham_blue` is #007AFF in
 * `values/colors.xml` and #0A84FF in `values-night/colors.xml`, and iOS gets
 * the same split from the `Color.blue` system color — so one unmodified
 * reference already resolves correctly under both schemes.
 *
 * The fill is composited over the surface rather than left as a translucent
 * rgba(), so the button reads the same whether it lands on `ham_bg_b1` or
 * `ham_bg_b2`: an alpha would stack with whatever is painted underneath.
 */
const MAX_WIDTH = 350;
const CORNER_RADIUS = 8;
const FILL_OPACITY = 0.1;

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
  const labelColor = color.ham_blue;

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
