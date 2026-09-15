/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/9/15
 */
import React from 'react';
import '@/i18n/i18n';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';
import {Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useColor} from '@/utils/color/color';

/**
 * Placeholder for the postgraduate timetable import.
 *
 * The entry point lives in the native course settings sheet; this screen only
 * reports that the flow is not implemented yet. It deliberately performs no
 * network work and calls no native module, so opening it can never fail.
 */
const FetchPostGraduateCourseView = ({
  testID = 'fetch-post-graduate-course-view',
}: {
  testID?: string;
}): React.ReactElement => {
  const {t} = useTranslation();
  const color = useColor();

  return (
    <View style={containerStyle} testID={testID}>
      <Text
        style={[messageStyle, {color: color.ham_text_secondary}]}
        testID={`${testID}-message`}>
        {t('education.postgraduate_not_supported')}
      </Text>
    </View>
  );
};

const containerStyle: StyleProp<ViewStyle> = {
  alignItems: 'center',
  height: '100%',
  justifyContent: 'center',
  width: '100%',
};

const messageStyle: StyleProp<TextStyle> = {
  fontSize: 14,
};

export default FetchPostGraduateCourseView;
