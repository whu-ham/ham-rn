import type {ViewStyle} from 'react-native';
import {useColor} from '@/utils/color/color';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/5/13 15:12
 */
export const useWebViewStyle = (): ViewStyle => {
  const color = useColor();
  return {
    backgroundColor: color.ham_bg_b1,
  };
};
