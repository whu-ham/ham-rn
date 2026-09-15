import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import IgnoredCourseNotice from '@/components/education/course/IgnoredCourseNotice';
import zh from '@/i18n/zh/translation.json';
import type {CourseEntity} from '@/business/education/course/type.ts';

/**
 * The notice is not a choice: it names each dropped course and says why, and
 * the single button acknowledges it. The user cannot repair a week string the
 * education system sent, so there is nothing to decide.
 *
 * It renders inline, filling the host's sheet, rather than as a modal — so
 * unlike a dialog it does not intercept the hardware back button.
 */
const course = (
  name: string,
  courseId: string,
  rawWeekText?: string,
): CourseEntity => ({
  name,
  courseId,
  instructor: '',
  instructorType: '',
  weekFrom: -1,
  weekTo: -1,
  classFrom: -1,
  classTo: -1,
  weekday: 1,
  courseType: '',
  credit: 0,
  location: '',
  color: '',
  ...(rawWeekText === undefined ? {} : {rawWeekText}),
});

const renderDialog = async (
  courses: CourseEntity[],
  overrides: {onAcknowledge?: jest.Mock; canImport?: boolean} = {},
) => {
  const onAcknowledge = overrides.onAcknowledge ?? jest.fn();
  const utils = await render(
    <IgnoredCourseNotice
      testID="ignored"
      courses={courses}
      canImport={overrides.canImport ?? true}
      onAcknowledge={onAcknowledge}
    />,
  );
  return {...utils, onAcknowledge};
};

describe('IgnoredCourseNotice', () => {
  it('renders the localized title', async () => {
    await renderDialog([course('高等数学', 'MATH001')]);
    expect(screen.getByTestId('ignored-title')).toHaveTextContent(
      zh.education.ignored_course_title,
    );
  });

  it('states how many courses could not be imported', async () => {
    await renderDialog([
      course('A', 'A1'),
      course('B', 'B1'),
      course('C', 'C1'),
    ]);
    expect(screen.getByTestId('ignored-summary')).toHaveTextContent(
      zh.education.ignored_course_summary.replace('{{count}}', '3'),
    );
  });

  it('renders one row per ignored course', async () => {
    await renderDialog([course('A', 'A1'), course('B', 'B1')]);
    expect(screen.getByTestId('ignored-item-0')).toBeTruthy();
    expect(screen.getByTestId('ignored-item-1')).toBeTruthy();
    expect(screen.queryByTestId('ignored-item-2')).toBeNull();
  });

  it('names each ignored course', async () => {
    await renderDialog([course('高等数学', 'MATH001')]);
    expect(screen.getByTestId('ignored-item-name-0')).toHaveTextContent(
      '高等数学',
    );
  });

  it('shows the reason a course was dropped', async () => {
    await renderDialog([course('高等数学', 'MATH001', '全周')]);
    expect(screen.getByTestId('ignored-item-reason-0')).toHaveTextContent(
      zh.education.ignored_course_reason.replace('{{weekText}}', '全周'),
    );
  });

  it('shows a reason for every dropped course', async () => {
    await renderDialog([
      course('A', 'A1', '全周'),
      course('B', 'B1', '第1-8周(单)'),
    ]);
    expect(screen.getByTestId('ignored-item-reason-0')).toHaveTextContent(
      zh.education.ignored_course_reason.replace('{{weekText}}', '全周'),
    );
    expect(screen.getByTestId('ignored-item-reason-1')).toHaveTextContent(
      zh.education.ignored_course_reason.replace('{{weekText}}', '第1-8周(单)'),
    );
  });

  it('says so when the system sent no week text at all', async () => {
    await renderDialog([course('A', 'A1')]);
    expect(screen.getByTestId('ignored-item-reason-0')).toHaveTextContent(
      zh.education.ignored_course_reason_missing,
    );
  });

  it('falls back to the course id when the name is empty', async () => {
    await renderDialog([course('', 'MATH001')]);
    expect(screen.getByTestId('ignored-item-name-0')).toHaveTextContent(
      'MATH001',
    );
  });

  it('falls back to a placeholder when a course has neither name nor id', async () => {
    await renderDialog([course('', '')]);
    expect(screen.getByTestId('ignored-item-name-0')).toHaveTextContent(
      zh.education.unnamed_course,
    );
  });

  it('offers exactly one button, and no import choice', async () => {
    await renderDialog([course('A', 'A1')]);
    expect(screen.getByTestId('ignored-confirm')).toBeTruthy();
    expect(screen.queryByTestId('ignored-cancel')).toBeNull();
  });

  it('labels the button with the continue copy', async () => {
    await renderDialog([course('A', 'A1')]);
    expect(screen.getByTestId('ignored-confirm-text')).toHaveTextContent(
      zh.education.ignored_course_ok,
    );
  });

  it('acknowledges when the button label itself is pressed', async () => {
    const onAcknowledge = jest.fn();
    await renderDialog([course('A', 'A1')], {onAcknowledge});

    await fireEvent.press(screen.getByTestId('ignored-confirm-text'));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('acknowledges only once the user presses the button', async () => {
    const onAcknowledge = jest.fn();
    await renderDialog([course('A', 'A1')], {onAcknowledge});
    expect(onAcknowledge).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('ignored-confirm'));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('explains that nothing will be imported when nothing parsed', async () => {
    await renderDialog([course('A', 'A1', '全周')], {canImport: false});
    expect(screen.getByTestId('ignored-summary')).toHaveTextContent(
      zh.education.ignored_course_summary_all_failed.replace('{{count}}', '1'),
    );
  });

  it('keeps the same button label when nothing parsed', async () => {
    await renderDialog([course('A', 'A1')], {canImport: false});
    expect(screen.getByTestId('ignored-confirm-text')).toHaveTextContent(
      zh.education.ignored_course_ok,
    );
  });

  it('still lists the courses when nothing parsed', async () => {
    await renderDialog([course('A', 'A1', '全周')], {canImport: false});
    expect(screen.getByTestId('ignored-item-name-0')).toHaveTextContent('A');
  });

  it('omits testIDs entirely when no testID prop is given', async () => {
    await render(
      <IgnoredCourseNotice
        courses={[course('A', 'A1')]}
        canImport
        onAcknowledge={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('ignored')).toBeNull();
    expect(screen.getByText(zh.education.ignored_course_title)).toBeTruthy();
  });
});
