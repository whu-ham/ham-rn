/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/15 18:17
 */
import React from 'react';
import '@/i18n/i18n';
import {getCourseList} from '@/business/education/course';
// Imported from the parser module rather than the barrel: the barrel is mocked
// in tests that only stub getCourseList, which would leave this undefined.
import {toNativeCoursePairing} from '@/business/education/course/parser';
import EducationModule from '@/modules/NativeEducationModule';
import {loginEducation} from '@/business/education';
import {generateValidate} from '@/business/education/api';
import i18n from '@/i18n/i18n';
import FetchEducationView from '@/components/education/FetchEducationView';

const FetchCourseView = (): React.ReactElement => {
  return (
    <FetchEducationView
      testID="fetch-course-view"
      tag="FetchCourseView"
      doLoginAndFetch={doLoginAndGetCourseList}
      doFetch={doGetCourseList}
      onError={message => EducationModule.onGetCourseList([], [], message)}
    />
  );
};

const doLoginAndGetCourseList = async () => {
  await loginEducation();
  await doGetCourseList();
};

const doGetCourseList = async () => {
  const {year, semester} = EducationModule.getCourseConfig();
  if (!year || !semester) {
    throw Error(i18n.t('education.semester_not_set'));
  }

  const [courseListResult] = await getCourseList({
    year: year,
    semester: semester,
    validate: generateValidate(),
  });
  const [nativeCourseList, nativeCourseGridList] =
    toNativeCoursePairing(courseListResult);
  EducationModule.onGetCourseList(nativeCourseList, nativeCourseGridList, null);
};

export default FetchCourseView;
