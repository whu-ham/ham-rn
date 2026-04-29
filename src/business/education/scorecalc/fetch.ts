/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/8/3 17:33
 */
import type {ScoreCalcItem} from './type.ts';
import csScript from './embed/generated/cs.generated';
import sociologyScript from './embed/generated/sociology.generated';

const fetchScoreCalcFromLocal = (): Array<ScoreCalcItem> => {
  return [
    {
      title: '计算机学院综测计算（F2）',
      date: '2026-04-29',
      author: 'orangeboyChen',
      version: 1,
      brief: '计算机学院F2分数计算',
      updateBrief: '初始版本',
      desc: 'F2＝必修课加权均分+0.2%×选修课加权总分。选修最多取加权前8门',
      type: 'APP',
      url: 'https://raw.githubusercontent.com/whu-ham/ham-rn/main/src/business/education/scorecalc/embed/cs.ts',
      script: csScript,
    },
    {
      title: '社会学院综测计算（F2）',
      date: '2026-04-29',
      author: 'orangeboyChen',
      version: 1,
      brief: '社会学院F2分数计算',
      updateBrief: '初始版本',
      desc: 'F2＝100%b1+2%b2。b1为必修课加权均分（可纳入至多2门专业选修），b2为选修课加权均分（至多4门）',
      type: 'APP',
      url: 'https://raw.githubusercontent.com/whu-ham/ham-rn/main/src/business/education/scorecalc/embed/sociology.ts',
      script: sociologyScript,
    },
  ];
};

export {fetchScoreCalcFromLocal};
