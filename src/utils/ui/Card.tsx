/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/8/3 15:54
 */
import React from 'react';
import type {DimensionValue} from 'react-native';
import {View} from 'react-native';
import {useColor} from '../color/color';

const Card = ({
  children,
  padding = 16,
  testID,
}: {
  children: React.ReactElement;
  padding?: DimensionValue;
  testID?: string;
}): React.ReactElement => {
  const color = useColor();
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: color.ham_bg_b2,
        padding: padding,
        borderRadius: 16,
      }}>
      {children}
    </View>
  );
};

export default Card;
