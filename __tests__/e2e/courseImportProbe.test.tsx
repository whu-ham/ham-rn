import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import EducationModule from '@/modules/NativeEducationModule';
import {
  CourseImportProbe,
  installCourseImportProbe,
} from '@/e2e/courseImportProbe';

/**
 * The probe is the only reason an e2e flow can see what the import decided.
 * Without it, `onGetCourseList` ends in `Log.i` in the debug shell and every
 * branch of the state machine looks identical from outside — so a broken
 * probe means every new flow asserts against a blank screen.
 *
 * The verdict text is deliberately not i18next copy: the flows match on it, and
 * the app's language comes from the device locale.
 */
describe('courseImportProbe', () => {
  const original = EducationModule.onGetCourseList;

  beforeEach(async () => {
    installCourseImportProbe();
    await render(<CourseImportProbe />);
  });

  afterEach(() => {
    (EducationModule as {onGetCourseList: unknown}).onGetCourseList = original;
  });

  /** Reports an outcome the way FetchCourseView would. */
  const report = (courseCount: number, error: string | null) =>
    EducationModule.onGetCourseList(
      Array.from({length: courseCount}, (_, index) => ({
        name: `course-${index}`,
        courseId: `id-${index}`,
        instructor: '',
        instructorType: '',
        weekFrom: 1,
        weekTo: 16,
        classFrom: 1,
        classTo: 2,
        weekday: 1,
        courseType: '',
        credit: 0,
        location: '',
        color: '',
      })),
      [],
      error,
    );

  // Must stay first: the probe keeps module-level state, so only the first
  // render in this file sees the pre-report state.
  it('says pending before anything has been reported', async () => {
    expect(screen.getByTestId('course-import-pending')).toBeTruthy();
    expect(screen.queryByTestId('course-import-verdict')).toBeNull();
    // Pending has to be labelled distinctly from either outcome. It shares the
    // verdict's prefix, so if it were labelled `courseImportVerdict` a flow
    // waiting for `courseImportVerdict-success` would match it by substring and
    // pass on the first frame, before the import had decided anything.
    expect(screen.getByLabelText('courseImportPending')).toBeTruthy();
    expect(screen.queryByLabelText('courseImportVerdict-success')).toBeNull();
    expect(screen.queryByLabelText('courseImportVerdict-failed')).toBeNull();
  });

  it('says success when a timetable was committed', async () => {
    report(2, null);
    await waitFor(() =>
      expect(screen.getByTestId('course-import-verdict')).toHaveTextContent(
        'success',
      ),
    );
  });

  it('says failed when the import reported an error', async () => {
    report(0, '登录失败');
    await waitFor(() =>
      expect(screen.getByTestId('course-import-verdict')).toHaveTextContent(
        'failed',
      ),
    );
  });

  it('reads as failed even when courses came back with the error', async () => {
    // A total parse failure sends empty lists plus an error, but a partial one
    // could in principle send both — the error is what decides it, because it
    // is what tells the host not to apply the result.
    report(2, 'something went wrong');
    await waitFor(() =>
      expect(screen.getByTestId('course-import-verdict')).toHaveTextContent(
        'failed',
      ),
    );
  });

  it('carries the accessibility labels Maestro selects on', async () => {
    // RN's testID does not reach iOS's accessibility tree, so the flows can
    // only find these by label.
    report(1, null);
    await waitFor(() =>
      expect(screen.getByLabelText('courseImportVerdict-success')).toBeTruthy(),
    );
  });

  // The reason the label carries the outcome: on iOS an `accessibilityLabel`
  // *replaces* a <Text>'s content in the accessibility tree, so the word
  // 'success' never reaches it no matter how clearly it is rendered. Maestro
  // reads that tree and nothing else, so a flow asserting the bare word could
  // never pass — which is exactly how this failed on CI. Android is unaffected
  // (it selects by `id`), so only the iOS flow depends on this.
  it('encodes the outcome in the label, not only in the text', async () => {
    report(2, null);
    await waitFor(() =>
      expect(screen.getByLabelText('courseImportVerdict-success')).toBeTruthy(),
    );
    expect(screen.getByTestId('course-import-verdict')).toHaveTextContent(
      'success',
    );
  });

  it('encodes a failure in the label, not only in the text', async () => {
    report(0, '登录失败');
    await waitFor(() =>
      expect(screen.getByLabelText('courseImportVerdict-failed')).toBeTruthy(),
    );
    expect(screen.getByTestId('course-import-verdict')).toHaveTextContent(
      'failed',
    );
  });
});
