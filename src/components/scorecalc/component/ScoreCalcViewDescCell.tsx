import React from 'react';
import '@/i18n/i18n';
import type {StyleProp, ViewStyle} from 'react-native';
import {StyleSheet, Text, View} from 'react-native';
import {useColor} from '@/utils/color/color';
import type {ScoreCalcItem} from '@/business/education/scorecalc/type.ts';
import {useTranslation} from 'react-i18next';

interface CellParam {
  item: ScoreCalcItem;
  listItem: ScoreCalcItem | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const MAX_DESC_LINE = 16;

const ScoreCalcViewDescCell = ({
  item,
  listItem,
  style,
  testID,
}: CellParam): React.ReactElement => {
  const {t} = useTranslation();
  const color = useColor();
  const [descLine, setDescLine] = React.useState<number>(0);
  const [showFullDesc, setShowFullDesc] = React.useState(false);
  // React Native ships two `CoreEventTypes` definitions (legacy vs generated)
  // whose `TextLayoutEvent` shapes differ. Derive the parameter type from the
  // component so it always matches the props `Text` actually declares.
  const onDescLayout: NonNullable<
    React.ComponentProps<typeof Text>['onTextLayout']
  > = event => {
    setDescLine(event.nativeEvent.lines.length);
  };

  const canUpdate = listItem && item.version !== listItem?.version;
  return (
    <View style={style} testID={testID}>
      <Text
        testID={testID ? `${testID}-title` : undefined}
        style={[{color: color.ham_text_primary}, styles.title]}
        numberOfLines={2}>
        {item.title}
      </Text>
      <Text
        testID={testID ? `${testID}-meta` : undefined}
        numberOfLines={1}
        style={{
          color: color.ham_text_secondary,
        }}>
        {item.date} · {item.author}
      </Text>
      <View>
        {canUpdate && (
          <Text
            testID={testID ? `${testID}-update-log` : undefined}
            style={[
              {
                color: color.ham_text_primary,
              },
              styles.desc,
            ]}>
            {t('scorecalc.desc.update_log')}
            {'\n'}
            {listItem?.updateBrief}
          </Text>
        )}
        <Text
          testID={testID ? `${testID}-desc` : undefined}
          style={[
            {
              color: color.ham_text_primary,
            },
            styles.desc,
          ]}
          numberOfLines={showFullDesc ? undefined : MAX_DESC_LINE}
          onTextLayout={onDescLayout}>
          {canUpdate ? listItem?.desc : item.desc}
        </Text>
      </View>
      {descLine > MAX_DESC_LINE - 1 && (
        <Text
          testID={testID ? `${testID}-toggle` : undefined}
          style={[
            {
              color: color.ham_blue,
            },
            styles.more,
          ]}
          onPress={() => setShowFullDesc(!showFullDesc)}>
          {showFullDesc
            ? t('scorecalc.desc.collapse')
            : t('scorecalc.desc.more')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  desc: {
    fontSize: 14,
    marginTop: 8,
  },
  more: {
    marginTop: 4,
  },
  title: {
    fontSize: 16,
  },
});

export default ScoreCalcViewDescCell;
