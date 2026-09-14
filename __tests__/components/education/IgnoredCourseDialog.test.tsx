import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import IgnoredCourseDialog from '@/components/education/course/IgnoredCourseDialog';
import zh from '@/i18n/zh/translation.json';
import type {CourseEntity} from '@/business/education/course/type.ts';

/**
 * The dialog is what stands between a partial parse and an import, so the
 * things that matter are: it names every dropped course, and neither button
 * does anything the user did not ask for.
 */
const course = (name: string, courseId: string): CourseEntity => ({
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
});

const renderDialog = async (
  courses: CourseEntity[],
  overrides: {onConfirm?: jest.Mock; onCancel?: jest.Mock} = {},
) => {
  const onConfirm = overrides.onConfirm ?? jest.fn();
  const onCancel = overrides.onCancel ?? jest.fn();
  const utils = await render(
    <IgnoredCourseDialog
      testID="ignored"
      courses={courses}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return {...utils, onConfirm, onCancel};
};

describe('IgnoredCourseDialog', () => {
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
    expect(screen.getByTestId('ignored-item-id-0')).toHaveTextContent(
      'MATH001',
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
    expect(screen.queryByTestId('ignored-item-id-0')).toBeNull();
  });

  it('imports only when the user presses import', async () => {
    const onConfirm = jest.fn();
    await renderDialog([course('A', 'A1')], {onConfirm});
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('ignored-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels only when the user presses cancel', async () => {
    const onCancel = jest.fn();
    await renderDialog([course('A', 'A1')], {onCancel});

    await fireEvent.press(screen.getByTestId('ignored-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not confirm when the user cancels', async () => {
    const onConfirm = jest.fn();
    await renderDialog([course('A', 'A1')], {onConfirm});

    await fireEvent.press(screen.getByTestId('ignored-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('omits testIDs entirely when no testID prop is given', async () => {
    await render(
      <IgnoredCourseDialog
        courses={[course('A', 'A1')]}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('ignored')).toBeNull();
    expect(screen.getByText(zh.education.ignored_course_title)).toBeTruthy();
  });
});
