/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/15 18:17
 */
import React, {useCallback, useState} from 'react';
import '@/i18n/i18n';
import {getCourseList} from '@/business/education/course';
// Imported from the parser module rather than the barrel: the barrel is mocked
// in tests that only stub getCourseList, which would leave this undefined.
import {toNativeCoursePairing} from '@/business/education/course/parser';
import type {CourseEntity, CourseGridEntity} from '@/business/education/course';
import EducationModule from '@/modules/NativeEducationModule';
import {loginEducation} from '@/business/education';
import {generateValidate} from '@/business/education/api';
import i18n from '@/i18n/i18n';
import FetchEducationView from '@/components/education/FetchEducationView';
import IgnoredCourseDialog from '@/components/education/course/IgnoredCourseDialog';

/** A parsed timetable waiting on the user to accept the dropped courses. */
interface PendingCourseImport {
  courses: CourseEntity[];
  grids: CourseGridEntity[][];
  ignored: CourseEntity[];
}

/**
 * Hands a parsed timetable to the caller rather than straight to the native
 * side, so the caller can hold it back until the user has seen the ignored
 * courses.
 */
type DeliverCourseImport = (result: PendingCourseImport) => void;

const doLoginAndGetCourseList = async (deliver: DeliverCourseImport) => {
  await loginEducation();
  await doGetCourseList(deliver);
};

const doGetCourseList = async (deliver: DeliverCourseImport) => {
  const {year, semester} = EducationModule.getCourseConfig();
  if (!year || !semester) {
    throw Error(i18n.t('education.semester_not_set'));
  }

  const [courseListResult] = await getCourseList({
    year: year,
    semester: semester,
    validate: generateValidate(),
  });
  const [courses, grids, ignored] = toNativeCoursePairing(courseListResult);
  deliver({courses, grids, ignored});
};

const FetchCourseView = (): React.ReactElement => {
  const [pending, setPending] = useState<PendingCourseImport | null>(null);

  // A timetable nothing was dropped from imports straight away; only a partial
  // parse needs a decision from the user.
  const deliver = useCallback((result: PendingCourseImport) => {
    if (result.ignored.length === 0) {
      EducationModule.onGetCourseList(result.courses, result.grids, null);
      return;
    }
    setPending(result);
  }, []);

  return (
    <>
      <FetchEducationView
        testID="fetch-course-view"
        tag="FetchCourseView"
        doLoginAndFetch={() => doLoginAndGetCourseList(deliver)}
        doFetch={() => doGetCourseList(deliver)}
        onError={message => EducationModule.onGetCourseList([], [], message)}
      />
      {pending ? (
        <IgnoredCourseDialog
          testID="fetch-course-view-ignored"
          courses={pending.ignored}
          onConfirm={() => {
            EducationModule.onGetCourseList(
              pending.courses,
              pending.grids,
              null,
            );
            setPending(null);
          }}
          onCancel={() => {
            // The host app is blocked on a callback, so cancelling has to
            // answer too — just without importing anything.
            EducationModule.onGetCourseList(
              [],
              [],
              i18n.t('education.import_cancelled'),
            );
            setPending(null);
          }}
        />
      ) : null}
    </>
  );
};

export default FetchCourseView;
