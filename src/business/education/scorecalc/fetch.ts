/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/8/3 17:33
 */
import type {ScoreCalcItem} from './type.ts';
import csScript from './embed/generated/cs.generated';

const fetchScoreCalcFromLocal = (): Array<ScoreCalcItem> => {
  return [
    {
      title: '综测计算（F2）',
      date: '2026-04-29',
      author: 'orangeboyChen',
      version: 1,
      brief: '综测F2分数计算',
      updateBrief: '初始版本',
      desc: '按必修/选修分类，选修最多取加权前8门，计算综测F2分数',
      type: 'APP',
      url: 'https://raw.githubusercontent.com/whu-ham/ham-rn/main/src/business/education/scorecalc/embed/cs.ts',
      script: csScript,
    },
  ];
};

export {fetchScoreCalcFromLocal};
