import {defineEmbed} from '@/business/education/scorecalc/defineEmbed';
import {getCourseTypeInfo} from '@/business/education/scorecalc/courseTypeInfo';
import type {ScoreJsItem} from '@/business/education/scorecalc/type';

/**
 * Sociology College (社会学院) F2 score calculation.
 *
 * Formula: F2 = 100% × b1 + 2% × b2
 *   - b1 = weighted average of all 必修 courses + up to 2 专业选修 courses.
 *   - b2 = weighted average of up to 4 elective courses.
 *
 * Implementation:
 *   1. Fix b1 base = all 必修 courses (专业必修, 公共必修, 通识必修), always included.
 *   2. Build a unified elective pool from all 选修 courses (专业选修, 公共选修, 跨专业选修).
 *      Each elective is tagged with whether it is eligible for b1 (only 专业选修 qualifies).
 *   3. Use recursive backtracking over the elective pool. For each course, try 3 options:
 *      - Skip: do not include in either b1 or b2.
 *      - Assign to b1: only if the course is 专业选修 and b1 has room (max 2 extra).
 *      - Assign to b2: if b2 has room (max 4 courses).
 *   4. Prune when both b1 and b2 slots are full. Evaluate F2 at leaf nodes and track the max.
 *   5. Return the best F2 score and the list of all selected courseIds.
 */
defineEmbed((scoreList, userInfo) => {
  const userCollege = userInfo.userCollege ?? '';

  // Fixed b1 base: all 必修 courses (always in b1)
  const b1Base: ScoreJsItem[] = [];

  // Elective pool: each course tagged with whether it can go into b1
  const electivePool: Array<{course: ScoreJsItem; canGoB1: boolean}> = [];

  for (const s of scoreList) {
    const info = getCourseTypeInfo(s.courseType, s.courseCollege, userCollege);

    if (info.primaryCourse) {
      // 专业必修, 公共必修, 通识必修 — always in b1
      b1Base.push(s);
    } else if (info.zhuan && info.xuan && !info.kua) {
      // 专业选修 (own college) — can go to b1, b2, or skip
      electivePool.push({course: s, canGoB1: true});
    } else if (info.xuan) {
      // 公共选修, 跨专业选修 — can go to b2 or skip
      electivePool.push({course: s, canGoB1: false});
    }
  }

  /** Compute weighted average for a list of courses. Returns 0 if empty. */
  const weightedAvg = (list: ScoreJsItem[]): number => {
    if (list.length === 0) {
      return 0;
    }
    let wTotal = 0;
    let cTotal = 0;
    for (const s of list) {
      wTotal += s.credit * s.score;
      cTotal += s.credit;
    }
    return cTotal > 0 ? wTotal / cTotal : 0;
  };

  let bestF2 = -Infinity;
  let bestB1Extra: ScoreJsItem[] = [];
  let bestB2List: ScoreJsItem[] = [];

  // Recursive backtracking: for each elective, decide b1 / b2 / skip
  const b1Extra: ScoreJsItem[] = []; // electives assigned to b1
  const b2List: ScoreJsItem[] = []; // electives assigned to b2

  const search = (idx: number) => {
    // Pruning: remaining slots
    const b1Remaining = 2 - b1Extra.length;
    const b2Remaining = 4 - b2List.length;

    // If no more electives or no more slots available, evaluate
    if (
      idx === electivePool.length ||
      (b1Remaining === 0 && b2Remaining === 0)
    ) {
      const b1List = [...b1Base, ...b1Extra];
      const b1Avg = weightedAvg(b1List);
      const b2Avg = weightedAvg(b2List);
      const f2 = b1Avg + 0.02 * b2Avg;

      if (f2 > bestF2) {
        bestF2 = f2;
        bestB1Extra = [...b1Extra];
        bestB2List = [...b2List];
      }
      // If we ran out of slots, don't recurse further
      if (b1Remaining === 0 && b2Remaining === 0) {
        return;
      }
      // If we reached end of pool, stop
      if (idx === electivePool.length) {
        return;
      }
    }

    const {course, canGoB1} = electivePool[idx];

    // Option 1: skip this course
    search(idx + 1);

    // Option 2: assign to b1 (only if 专业选修 and b1 has room)
    if (canGoB1 && b1Extra.length < 2) {
      b1Extra.push(course);
      search(idx + 1);
      b1Extra.pop();
    }

    // Option 3: assign to b2 (if b2 has room)
    if (b2List.length < 4) {
      b2List.push(course);
      search(idx + 1);
      b2List.pop();
    }
  };

  search(0);

  // Collect selected course IDs
  const idList = [
    ...b1Base.map(s => s.courseId),
    ...bestB1Extra.map(s => s.courseId),
    ...bestB2List.map(s => s.courseId),
  ];

  const f2Score = bestF2 === -Infinity ? 0 : bestF2;

  return [f2Score, idList];
});
