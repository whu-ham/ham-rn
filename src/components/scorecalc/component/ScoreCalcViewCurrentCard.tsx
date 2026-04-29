/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/8/3 15:45
 */
import {Image, Text, TouchableOpacity, View} from 'react-native';
import React from 'react';
import '@/i18n/i18n';
import type {ThemeColor} from '@/utils/color/color.ts';
import ScoreCalcViewDescCell from './ScoreCalcViewDescCell';
import {StyleSheet} from 'react-native';
import Card from '@/utils/ui/Card';
import type {ScoreCalcItem} from '@/business/education/scorecalc/type.ts';
import Color from 'color';
import ScoreCalcModule from '@/modules/NativeScoreCalcModule';
import CommonModule from '@/modules/NativeCommonModule';
import {useTranslation} from 'react-i18next';

interface ScoreCalcViewCurrentCardParams {
  color: ThemeColor;
  item: ScoreCalcItem | undefined;
  listItem: ScoreCalcItem | undefined;
  onSetItem: () => void;
}

const JSIcon = ({color}: {color: ThemeColor}) => {
  return (
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
  );
};

const ScoreCalcViewCurrentCard = ({
  color,
  item,
  listItem,
  onSetItem,
}: ScoreCalcViewCurrentCardParams): React.ReactElement => {
  const {t} = useTranslation();
  const doUpdate = async () => {
    if (!listItem) {
      return;
    }
    const res = ScoreCalcModule.selectCalc(listItem);
    if (!res) {
      CommonModule.showToast(
        'error',
        t('common.script_invalid'),
        t('common.contact_author'),
      );
      return;
    }
    CommonModule.showToast('success', t('scorecalc.current.upgraded'), '');
    onSetItem();
  };

  const canUpdate = listItem && listItem.version !== item?.version;
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
          {t('scorecalc.current.title')}
        </Text>
        {item ? (
          <View>
            <View style={styles.container}>
              <JSIcon color={color} />
              <ScoreCalcViewDescCell
                style={styles.descCell}
                item={item}
                listItem={listItem}
              />
              {canUpdate ? (
                <TouchableOpacity
                  style={styles.selectButtonContainer}
                  onPress={() => doUpdate()}>
                  <View
                    style={[
                      {
                        backgroundColor: Color(color.ham_gray)
                          .alpha(0.2)
                          .hexa(),
                      },
                      styles.selectButton,
                    ]}>
                    <Text
                      style={{
                        color: color.ham_blue,
                      }}>
                      {t('scorecalc.current.update')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.operationIcon}>
                  <Text
                    style={[
                      {
                        color: color.ham_text_secondary,
                      },
                      styles.newestText,
                    ]}>
                    {t('scorecalc.current.latest')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View>
            <Text style={{color: color.ham_text_secondary}}>
              {t('scorecalc.current.none')}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 8,
  },
  descCell: {
    flexGrow: 1,
    flexShrink: 1,
    marginLeft: 8,
  },
  icon: {
    height: 48,
    width: 48,
  },
  iconContainer: {
    borderRadius: 12,
    height: 48,
    width: 48,
  },
  newestText: {
    textAlign: 'center',
  },
  operationIcon: {
    marginTop: 12,
    width: 40,
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
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ScoreCalcViewCurrentCard;
