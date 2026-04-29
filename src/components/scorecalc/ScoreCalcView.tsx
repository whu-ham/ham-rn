import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Animated, Platform} from 'react-native';
import ScrollView = Animated.ScrollView;
import {useColor} from '@/utils/color/color';
import ScoreCalcViewCurrentCard from './component/ScoreCalcViewCurrentCard';
import ScoreCalcViewOtherCard from './component/other/ScoreCalcViewOtherCard';
import ScoreCalcViewDocsCard from './component/ScoreCalcViewDocsCard';
import type {ScoreCalcItem} from '@/business/education/scorecalc/type.ts';
import ScoreCalcModule from '@/modules/NativeScoreCalcModule';
import {fetchScoreCalcFromLocal} from '@/business/education/scorecalc/fetch';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import NativeLog from '@/modules/NativeLog';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/27 21:18
 */
const ScoreCalcView = (): React.ReactElement => {
  if (Platform.OS === 'ios') {
    return (
      <SafeAreaProvider>
        <IOSInsetView>
          {({paddingTop}) => (
            <>
              <ScoreCalcViewContent paddingTop={paddingTop} />
            </>
          )}
        </IOSInsetView>
      </SafeAreaProvider>
    );
  } else {
    return <ScoreCalcViewContent paddingTop={0} />;
  }
};

const IOSInsetView = ({
  children,
}: {
  children: ({paddingTop}: {paddingTop: number}) => React.ReactNode;
}) => {
  const insets = useSafeAreaInsets();
  return children({paddingTop: insets.top});
};

const ScoreCalcViewContent = ({paddingTop}: {paddingTop: number}) => {
  const [currentItem, setCurrentItem] = useState<ScoreCalcItem>();
  const color = useColor();

  const [calcList, setCalcList] = useState<Array<ScoreCalcItem>>([]);

  useEffect(() => {
    updateScoreCalcFromLocal();
  }, []);
  useEffect(() => {
    updateCurrentItem();
  }, []);
  useEffect(() => {
    const unsub = ScoreCalcModule.onSetScoreJsCalcItem(() => {
      NativeLog.i('ScoreCalcView', 'onSetScoreJsCalcItem');
      updateCurrentItem();
    });
    return () => {
      unsub.remove();
    };
  }, []);

  const updateCurrentItem = (): void => {
    const str = ScoreCalcModule.getCurrentCalc();
    try {
      const item = JSON.parse(str) as ScoreCalcItem;
      setCurrentItem(item);
    } catch {
      setCurrentItem(undefined);
    }
  };

  const updateScoreCalcFromLocal = () => {
    const localItem = fetchScoreCalcFromLocal();
    setCalcList(localItem);
  };
  return (
    <ScrollView
      style={{
        backgroundColor: color.ham_bg_b1,
        ...styles.container,
      }}>
      <View style={{paddingTop}} />
      <View style={styles.topPadding} />
      <ScoreCalcViewCurrentCard
        color={color}
        item={currentItem}
        listItem={calcList.find(
          o => o.title === currentItem?.title && o.url === currentItem.url,
        )}
        onSetItem={() => updateCurrentItem()}
      />
      <View style={styles.itemPadding} />
      <ScoreCalcViewDocsCard color={color} />
      <View style={styles.itemPadding} />
      <ScoreCalcViewOtherCard
        color={color}
        currentItem={currentItem}
        onSetItem={() => updateCurrentItem()}
        calcList={calcList}
      />
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bottomPadding: {
    height: 96,
  },
  container: {
    paddingHorizontal: 16,
  },
  itemPadding: {
    height: 12,
  },
  topPadding: {
    height: 16,
  },
});

export default ScoreCalcView;
