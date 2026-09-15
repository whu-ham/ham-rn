import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import IgnoredCourseNotice from '@/components/education/course/IgnoredCourseNotice';
import zh from '@/i18n/zh/translation.json';
import i18n from '@/i18n/i18n';
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

/**
 * The notice is rendered inside the host app, whose language comes from
 * NativeCommonModule.getLocale(). jest.setup.ts pins that to 'zh', so every
 * other assertion in this file only ever exercises Chinese. These switch the
 * language and check the three supported locales really do render.
 *
 * The expected strings are written out literally rather than looked up with
 * `i18n.getFixedT` or read from the translation JSON. A lookup makes the
 * assertion tautological: it compares the rendered text against the same
 * resource it was rendered from, so it passes even when the copy is wrong.
 * Mutating `ignored_course_title` to "ZZMUTANT" and pointing `en`'s copy at the
 * Chinese both left the previous version of these tests green.
 *
 * These are also the locale-coverage test, so the copy is asserted per language
 * rather than once: a missing key falls back to Chinese silently, and only a
 * literal expectation per locale catches that.
 */
describe('IgnoredCourseNotice i18n', () => {
  const locales = ['zh', 'en', 'ja'] as const;

  const copy = {
    zh: {
      title: '部分课程无法导入',
      ok: '继续导入',
      summary: '以下 2 门课程无法解析上课时间,导入后课表中将不会出现它们:',
      reason: '上课周次“全周”无法识别',
      missing: '教务系统未提供上课周次',
    },
    en: {
      title: 'Some courses could not be imported',
      ok: 'Continue',
      summary:
        'The week schedule of these 2 course(s) could not be read, so they will be missing from the imported timetable:',
      reason: 'Unrecognised week schedule "全周"',
      missing: 'The education system provided no week schedule',
    },
    ja: {
      title: '一部の授業を取り込めません',
      ok: '続ける',
      summary:
        '以下の 2 件の授業は時間割を解釈できませんでした。取り込んでも時間割には表示されません:',
      reason: '時間割「全周」を解釈できませんでした',
      missing: '教務システムが時間割を提供していません',
    },
  } as const;

  afterEach(async () => {
    await i18n.changeLanguage('zh');
    jest.restoreAllMocks();
  });

  const useLocale = async (lng: (typeof locales)[number]) => {
    await i18n.changeLanguage(lng);
    return copy[lng];
  };

  it.each(locales)('renders the title and button in %s', async lng => {
    const expected = await useLocale(lng);
    await renderDialog([course('A', 'A1', '全周')]);

    expect(screen.getByTestId('ignored-title')).toHaveTextContent(
      expected.title,
    );
    expect(screen.getByTestId('ignored-confirm-text')).toHaveTextContent(
      expected.ok,
    );
  });

  it.each(locales)('renders both reason strings in %s', async lng => {
    const expected = await useLocale(lng);
    await renderDialog([course('A', 'A1', '全周'), course('B', 'B1', '')]);

    expect(screen.getByTestId('ignored-item-reason-0')).toHaveTextContent(
      expected.reason,
    );
    expect(screen.getByTestId('ignored-item-reason-1')).toHaveTextContent(
      expected.missing,
    );
  });

  it.each(locales)('reports the dropped course count in %s', async lng => {
    const expected = await useLocale(lng);
    await renderDialog([course('A', 'A1', '全周'), course('B', 'B1', '全周')]);

    expect(screen.getByTestId('ignored-summary')).toHaveTextContent(
      expected.summary,
    );
  });
});
