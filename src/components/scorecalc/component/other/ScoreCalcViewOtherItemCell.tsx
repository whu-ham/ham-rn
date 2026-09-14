/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/8/3 17:11
 */
import React from 'react';
import '@/i18n/i18n';
import {
  Appearance,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Color from 'color';
import type {ThemeColor} from '@/utils/color/color.ts';
import type {ScoreCalcItem} from '@/business/education/scorecalc/type.ts';
import {useTranslation} from 'react-i18next';

interface ScoreCalcViewOtherItemCellParams {
  color: ThemeColor;
  item: ScoreCalcItem;
  currentItem: ScoreCalcItem | undefined;
  goToDetail: () => void;
  onSelect: () => void;
  testID?: string;
}

const ScoreCalcViewOtherItemCell = ({
  color,
  item,
  currentItem,
  goToDetail,
  onSelect,
  testID,
}: ScoreCalcViewOtherItemCellParams): React.ReactElement => {
  const {t} = useTranslation();
  const isCurrentItem =
    currentItem?.title === item.title && currentItem?.url === item.url;
  return (
    <TouchableWithoutFeedback
      testID={testID ? `${testID}-row` : undefined}
      onPress={goToDetail}>
      <View style={styles.container}>
        <View
          style={[
            {
              backgroundColor: Color(color.ham_gray).alpha(0.2).hexa(),
            },
            styles.iconContainer,
          ]}>
          <Image
            source={require('@/resources/images/icon_js.png')}
            style={styles.icon}
          />
        </View>

        <View style={styles.textContainer}>
          <Text
            testID={testID ? `${testID}-title` : undefined}
            style={[
              {
                color: color.ham_text_primary,
              },
              styles.title,
            ]}
            numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.briefContainer}>
            {item.type === 'GITHUB' ? (
              <Image
                testID={testID ? `${testID}-github-icon` : undefined}
                source={
                  Appearance.getColorScheme() === 'dark'
                    ? require('@/resources/images/github_light.png')
                    : require('@/resources/images/github.png')
                }
                style={styles.githubIcon}
              />
            ) : (
              <></>
            )}

            <Text
              testID={testID ? `${testID}-brief` : undefined}
              style={[{color: color.ham_text_secondary}, styles.brief]}
              numberOfLines={1}>
              {item.brief}
            </Text>
          </View>
        </View>

        {isCurrentItem && currentItem?.version === item.version ? (
          <Text
            testID={testID ? `${testID}-current` : undefined}
            style={{
              color: color.ham_text_secondary,
            }}>
            {t('scorecalc.item.current')}
          </Text>
        ) : (
          <TouchableOpacity
            testID={testID ? `${testID}-select` : undefined}
            style={styles.selectButtonContainer}
            onPress={onSelect}>
            <View
              style={[
                {
                  backgroundColor: Color(color.ham_gray).alpha(0.2).hexa(),
                },
                styles.selectButton,
              ]}>
              <Text
                testID={testID ? `${testID}-select-text` : undefined}
                style={{
                  color: color.ham_blue,
                }}>
                {!isCurrentItem
                  ? t('scorecalc.item.select')
                  : t('scorecalc.item.upgrade')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  brief: {
    flexShrink: 1,
  },
  briefContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    marginTop: 2,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  githubIcon: {
    height: 16,
    marginRight: 6,
    width: 16,
  },
  icon: {
    height: 48,
    width: 48,
  },
  iconContainer: {
    borderRadius: 12,
  },
  selectButton: {
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  selectButtonContainer: {
    width: 46,
  },
  textContainer: {
    flexGrow: 1,
    flexShrink: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 16,
  },
});

export default ScoreCalcViewOtherItemCell;
