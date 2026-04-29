import {defineEmbed} from '@/business/education/scorecalc/defineEmbed';
import {getCourseTypeInfo} from '@/business/education/scorecalc/courseTypeInfo';

/**
 * F2 (综测) score calculation.
 *
 * Logic ported from the native Swift `calcF2` method:
 * 1. Split courses into primary (必修) and secondary (non-必修) using ScoreTypeInfo logic.
 *    Primary = (公+必) || (通+必) || (non-跨 + 专+必).
 * 2. If secondary courses exceed 8, keep only the top 8 by weighted score (credit × score).
 * 3. F2 = primaryWeightedTotal / primaryCreditTotal + secondaryWeightedTotal × 0.002
 *    (falls back to secondaryWeightedTotal × 0.002 when no primary credits exist).
 * 4. Return the calculated score and the list of selected courseIds.
 */
defineEmbed((scoreList, userInfo) => {
  const userCollege = userInfo.userCollege ?? '';

  const primaryList = scoreList.filter(
    s =>
      getCourseTypeInfo(s.courseType, s.courseCollege, userCollege)
        .primaryCourse,
  );
  let secondaryList = scoreList.filter(
    s =>
      !getCourseTypeInfo(s.courseType, s.courseCollege, userCollege)
        .primaryCourse,
  );

  // Keep at most 8 secondary courses, sorted by weighted score descending
  if (secondaryList.length > 8) {
    secondaryList.sort((a, b) => b.credit * b.score - a.credit * a.score);
    secondaryList = secondaryList.slice(0, 8);
  }

  // Collect selected course IDs
  const idList = [
    ...primaryList.map(s => s.courseId),
    ...secondaryList.map(s => s.courseId),
  ];

  // Calculate primary totals
  let primaryWeightedTotal = 0;
  let primaryCreditTotal = 0;
  for (const s of primaryList) {
    primaryWeightedTotal += s.credit * s.score;
    primaryCreditTotal += s.credit;
  }

  // Calculate secondary weighted total
  let secondaryWeightedTotal = 0;
  for (const s of secondaryList) {
    secondaryWeightedTotal += s.credit * s.score;
  }

  // Compute F2 score
  let f2Score = secondaryWeightedTotal * 0.002;
  if (primaryCreditTotal > 0) {
    f2Score =
      primaryWeightedTotal / primaryCreditTotal +
      secondaryWeightedTotal * 0.002;
  }

  return [f2Score, idList];
});
