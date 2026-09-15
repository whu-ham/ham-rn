import {generateValidate, loginEducation} from '@/business/education/api';
import EducationModule from '@/modules/NativeEducationModule';
import type {CourseEntity, CourseGridEntity} from '@/business/education/course';
import {getCourseList} from '@/business/education/course';
// Imported from the parser module rather than the barrel: the barrel is mocked
// in tests that only stub getCourseList, which would leave this undefined.
import {toNativeCoursePairing} from '@/business/education/course/parser';
import {getScoreList} from '@/business/education/score';
import type {
  ScoreEntity,
  ScoreRequestUserInfo,
} from '@/business/education/score/type.ts';
import {getUserInfo} from '@/business/education/score/api';
import i18n from '@/i18n/i18n';
import Log from '@/modules/NativeLog';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/1/22 14:25
 */
const updateCourseList = async (year: number, semester: number) => {
  try {
    await loginEducation();
  } catch (e: unknown) {
    if (e instanceof Error) {
      EducationModule.onGetCourseList(
        [],
        [],
        i18n.t('education.login_failed_full', {reason: e.message}),
      );
    }
    return;
  }

  let courseListResult: Map<CourseEntity, CourseGridEntity[]>;
  try {
    [courseListResult] = await getCourseList({
      year: year,
      semester: semester,
      validate: generateValidate(),
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      EducationModule.onGetCourseList(
        [],
        [],
        i18n.t('education.course_fetch_failed_with_reason', {
          reason: e.message,
        }),
      );
    }
    return;
  }

  const [nativeCourseList, nativeCourseGridList, ignoredCourseList] =
    toNativeCoursePairing(courseListResult);
  // This entry point runs headless on the BatchedBridge, with no UI to ask the
  // user in, so it imports what parsed and only records the rest. The
  // RNFetchCourseView screen is the path that can prompt.
  if (ignoredCourseList.length > 0) {
    Log.e(
      'updateCourseList',
      `ignored ${ignoredCourseList.length} unparsable course(s): ${ignoredCourseList
        .map(course => course.name || course.courseId)
        .join(', ')}`,
    );
  }
  EducationModule.onGetCourseList(nativeCourseList, nativeCourseGridList, null);
};

const updateScoreList = async () => {
  try {
    await loginEducation();
  } catch (e: unknown) {
    if (e instanceof Error) {
      EducationModule.onGetScoreList(
        '',
        '',
        i18n.t('education.login_failed_full', {reason: e.message}),
      );
    }
    return;
  }

  let [scoreList, userInfo]: [ScoreEntity[], ScoreRequestUserInfo] = [
    [],
    {
      college: '',
      major: '',
      name: '',
      studentId: '',
    },
  ];
  try {
    [scoreList, userInfo] = await getScoreList({
      validate: generateValidate(),
    });
    if (userInfo.studentId === '') {
      let {studentID} = await getUserInfo();
      userInfo.studentId = studentID;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      EducationModule.onGetCourseList(
        [],
        [],
        i18n.t('education.score_fetch_failed_with_reason', {
          reason: e.message,
        }),
      );
    }
    return;
  }
  const scoreListResult = JSON.stringify(scoreList);
  const userInfoResult = JSON.stringify(userInfo);
  EducationModule.onGetScoreList(scoreListResult, userInfoResult, null);
};

const educationCallableModule = {
  updateCourseList,
  updateScoreList,
};

export {educationCallableModule};
