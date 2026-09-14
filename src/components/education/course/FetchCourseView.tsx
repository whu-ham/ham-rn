/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/15 18:17
 */
import React, {useCallback, useRef, useState} from 'react';
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
import Log from '@/modules/NativeLog';
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

/** Marks an answer that belongs to no parsed result, i.e. an error path. */
const NO_RESULT = Symbol('no-result');

const FetchCourseView = (): React.ReactElement => {
  const [pending, setPending] = useState<PendingCourseImport | null>(null);
  // The host app blocks on a callback, so each fetch must answer exactly once.
  // The guard is keyed on the result it answers for, not a lifetime flag: the
  // re-auth flow runs a second fetch after ticket login, and that one has to
  // be allowed to answer. Module-scoped so re-renders cannot mint a fresh
  // sentinel and slip past the comparison.
  const answeredFor = useRef<PendingCourseImport | symbol | undefined>(
    undefined,
  );

  const answer = useCallback(
    (
      result: PendingCourseImport | typeof NO_RESULT,
      courses: CourseEntity[],
      grids: CourseGridEntity[][],
      error: string | null,
    ) => {
      if (answeredFor.current === result) {
        Log.e(
          'FetchCourseView',
          'dropped a duplicate answer: this fetch already replied',
        );
        return;
      }
      answeredFor.current = result;
      setPending(null);
      EducationModule.onGetCourseList(courses, grids, error);
    },
    [],
  );

  const deliver = useCallback(
    (result: PendingCourseImport) => {
      if (result.ignored.length === 0) {
        answer(result, result.courses, result.grids, null);
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
      answer(
        pending,
        [],
        [],
        i18n.t('education.ignored_course_all_failed_ack'),
      );
      return;
    }
    answer(pending, pending.courses, pending.grids, null);
  }, [answer, pending]);

  return (
    <>
      <FetchEducationView
        testID="fetch-course-view"
        tag="FetchCourseView"
        doLoginAndFetch={() => doLoginAndGetCourseList(deliver)}
        doFetch={() => doGetCourseList(deliver)}
        onError={message => answer(NO_RESULT, [], [], message)}
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
