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
  // No dedupe guard here: the dialog unmounts in the same React batch as the
  // press, so a second press cannot reach this. A guard was tried and removed —
  // deleting it changed nothing in the suite, which is how dead code reads.
  const answer = useCallback(
    (
      courses: CourseEntity[],
      grids: CourseGridEntity[][],
      error: string | null,
    ) => {
      setPending(null);
      EducationModule.onGetCourseList(courses, grids, error);
    },
    [],
  );

  const deliver = useCallback(
    (result: PendingCourseImport) => {
      if (result.ignored.length === 0) {
        answer(result.courses, result.grids, null);
        return;
      }
      setPending(result);
    },
    [answer],
  );

  /**
   * Runs the import the dialog was warning about. The host blocks on a
   * callback and tears this screen down when it arrives, so the import has to
   * happen on acknowledgement — calling it any earlier would mean the user
   * never sees the notice.
   */
  const acknowledge = useCallback(() => {
    if (!pending) {
      return;
    }
    // Nothing parsed means there is nothing to import. Reporting empty lists
    // plus an error keeps the host from reading it as "imported zero courses
    // successfully", which a replace-semantics host would apply by wiping the
    // existing timetable.
    if (pending.courses.length === 0) {
      answer([], [], i18n.t('education.ignored_course_all_failed_ack'));
      return;
    }
    answer(pending.courses, pending.grids, null);
  }, [answer, pending]);

  return (
    <>
      <FetchEducationView
        testID="fetch-course-view"
        tag="FetchCourseView"
        doLoginAndFetch={() => doLoginAndGetCourseList(deliver)}
        doFetch={() => doGetCourseList(deliver)}
        onError={message => answer([], [], message)}
      />
      {pending ? (
        <IgnoredCourseDialog
          testID="fetch-course-view-ignored"
          courses={pending.ignored}
          canImport={pending.courses.length > 0}
          onAcknowledge={acknowledge}
        />
      ) : null}
    </>
  );
};

export default FetchCourseView;
