import {Image, Text, TouchableOpacity, View} from 'react-native';
import Card from '@/utils/ui/Card';
import React from 'react';
import '@/i18n/i18n';
import type {ThemeColor} from '@/utils/color/color.ts';
import {StyleSheet} from 'react-native';
import CommonModule from '@/modules/NativeCommonModule.ts';
import {useTranslation} from 'react-i18next';

interface ScoreCalcViewDocsCardParams {
  color: ThemeColor;
}

const ScoreCalcViewDocsCard = ({color}: ScoreCalcViewDocsCardParams) => {
  const {t} = useTranslation();
  return (
    <TouchableOpacity
      onPress={() => {
        CommonModule.openUrl(
          'https://docs.ham.nowcent.cn/developers/ham-rn/score-calc.html',
        );
      }}>
      <Card>
        <View style={styles.container}>
          <View style={styles.textContainer}>
            <Text
              style={[
                {
                  color: color.ham_text_primary,
                },
                styles.title,
              ]}>
              {t('scorecalc.docs.title')}
            </Text>
          </View>
          <View style={styles.grow} />
          <Image
            style={[
              styles.arrowRightIcon,
              {
                tintColor: color.ham_blue,
              },
            ]}
            source={require('@/resources/images/arrow_right.png')}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  arrowRightIcon: {
    height: 16,
    width: 16,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  grow: {
    flexGrow: 1,
  },
  textContainer: {
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
  },
});

export default ScoreCalcViewDocsCard;
