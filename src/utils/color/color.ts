/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/8/3 14:37
 */
import {Appearance} from 'react-native';
import {useEffect, useState} from 'react';

interface ThemeColor {
  ham_red: string;
  ham_orange: string;
  ham_yellow: string;
  ham_green: string;
  ham_mint: string;
  ham_teal: string;
  ham_cyan: string;
  ham_blue: string;
  ham_indigo: string;
  ham_purple: string;
  ham_pink: string;
  ham_brown: string;
  ham_gray: string;
  ham_text_primary: string;
  ham_text_secondary: string;
  ham_bg_b1: string;
  ham_bg_b2: string;
  ham_divider: string;
  ham_lightGray: string;
  ham_lightBlue: string;
}

const lightColor: ThemeColor = {
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

const darkColor: ThemeColor = {
  ham_red: '#FF453A',
  ham_orange: '#FF9F0A',
  ham_yellow: '#FFD60A',
  ham_green: '#30D158',
  ham_mint: '#63E6E2',
  ham_teal: '#40C8E0',
  ham_cyan: '#64D2FF',
  ham_blue: '#0A84FF',
  ham_indigo: '#5E5CE6',
  ham_purple: '#BF5AF2',
  ham_pink: '#FF375F',
  ham_brown: '#AC8E68',
  ham_gray: '#98989D',
  ham_text_primary: 'white',
  ham_text_secondary: 'gray',
  ham_bg_b1: '#000000',
  ham_bg_b2: '#0f1010FF',
  ham_divider: '#0C0C0C',
  ham_lightGray: '#0F0E0F',
  ham_lightBlue: '#010D18',
};

/**
 * Resolves the palette for the current scheme and follows the system setting.
 *
 * Read through `Appearance.getColorScheme()` rather than RN's `useColorScheme`
 * so the initial value and the subscription agree — and so a test can pin the
 * scheme the way every other test in the suite does.
 */
const useColor = (): ThemeColor => {
  const [color, setColor] = useState<ThemeColor>(
    Appearance.getColorScheme() === 'dark' ? darkColor : lightColor,
  );
  useEffect(() => {
    const changeListener: Parameters<
      typeof Appearance.addChangeListener
    >[0] = prep => {
      setColor(prep.colorScheme === 'dark' ? darkColor : lightColor);
    };
    // The subscription has to be torn down with the component. Without the
    // `remove()` every mount leaks one listener on the shared native emitter,
    // so each remount re-renders every themed view once more per change.
    const subscription = Appearance.addChangeListener(changeListener);
    return () => subscription.remove();
  }, []);
  return color;
};

export {useColor};
export type {ThemeColor};
