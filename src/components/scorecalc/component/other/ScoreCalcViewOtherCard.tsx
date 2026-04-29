/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/8/3 17:25
 */
import React from 'react';
import '@/i18n/i18n';
import {Text, View} from 'react-native';
import Color from 'color';
import Card from '@/utils/ui/Card';
import type {ThemeColor} from '@/utils/color/color.ts';
import ScoreCalcViewOtherItemCell from './ScoreCalcViewOtherItemCell';
import {StyleSheet} from 'react-native';
import type {ScoreCalcItem} from '@/business/education/scorecalc/type.ts';
import ScoreCalcModule from '@/modules/NativeScoreCalcModule';
import CommonModule from '@/modules/NativeCommonModule';
import {useTranslation} from 'react-i18next';

interface ScoreCalcViewOtherCardParams {
  color: ThemeColor;
  calcList: Array<ScoreCalcItem>;
  currentItem: ScoreCalcItem | undefined;
  onSetItem: () => void;
}

const ScoreCalcViewOtherCard = ({
  color,
  calcList,
  currentItem,
  onSetItem,
}: ScoreCalcViewOtherCardParams): React.ReactElement => {
  const {t} = useTranslation();
  return (
    <Card>
      <View>
        <Text
          style={[
            {
              color: color.ham_text_primary,
            },
            styles.title,
          ]}>
          {t('scorecalc.other.title')}
        </Text>
        {calcList.map((item, index) => (
          <View key={item.title + item.url + index}>
            <ScoreCalcViewOtherItemCell
              item={item}
              color={color}
              currentItem={currentItem}
              goToDetail={async () => {
                ScoreCalcModule.openDetail(item);
              }}
              onSelect={async () => {
                const res = ScoreCalcModule.selectCalc(item);
                if (!res) {
                  CommonModule.showToast(
                    'error',
                    t('common.script_invalid'),
                    t('common.contact_author'),
                  );
                  return;
                }

                CommonModule.showToast('success', t('common.selected'), '');
                onSetItem();
              }}
            />
            {calcList.length - 1 !== index && (
              <View
                style={[
                  {
                    backgroundColor: Color(color.ham_gray).alpha(0.2).hexa(),
                  },
                  styles.divider,
                ]}
              />
            )}
          </View>
        ))}
        {calcList.length === 0 && (
          <Text style={{color: color.ham_text_secondary}}>
            {t('scorecalc.other.empty')}
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginVertical: 16,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
});

export default ScoreCalcViewOtherCard;
