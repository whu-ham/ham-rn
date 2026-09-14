import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import FetchCourseView from '@/components/education/course/FetchCourseView';
import FetchScoreView from '@/components/education/score/FetchScoreView';
import {getCourseList} from '@/business/education/course';
import {getScoreList, getUserInfo} from '@/business/education/score/api';
import {loginEducation} from '@/business/education';
import EducationModule from '@/modules/NativeEducationModule';
import zh from '@/i18n/zh/translation.json';

/**
 * Both screens are thin wrappers: they hand a login+fetch pair to
 * `FetchEducationView` and report results back through the native module.
 * The shared view is covered separately, so these tests focus on the wiring —
 * which callback the native side receives, and with what payload.
 */
jest.mock('react-native-webview', () => {
  const react = require('react');
  const {View} = require('react-native');
  return {
    WebView: react.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      react.createElement(View, {...props, ref}),
    ),
  };
});

jest.mock('@/business/education/course', () => ({
  getCourseList: jest.fn(),
}));

jest.mock('@/business/education/score/api', () => ({
  getScoreList: jest.fn(),
  getUserInfo: jest.fn(),
}));

jest.mock('@/business/education', () => ({
  loginEducation: jest.fn(() => Promise.resolve()),
}));

const courseConfig = (year: number, semester: number) =>
  (EducationModule.getCourseConfig as jest.Mock).mockReturnValue({
    year,
    semester,
  });

describe('FetchCourseView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCourseList as jest.Mock).mockResolvedValue([
      new Map(),
      {studentId: ''},
    ]);
  });

  it('renders the shared education view', async () => {
    await render(<FetchCourseView />);
    expect(screen.getByTestId('fetch-course-view')).toBeTruthy();
  });

  it('shows the loading state while fetching', async () => {
    await render(<FetchCourseView />);
    expect(screen.getByTestId('fetch-course-view-loading')).toBeTruthy();
  });

  it('logs in before requesting the course list', async () => {
    courseConfig(2026, 1);
    await render(<FetchCourseView />);
    await waitFor(() => expect(loginEducation).toHaveBeenCalled());
    await waitFor(() => expect(getCourseList).toHaveBeenCalled());
  });

  it('reports the parsed course list back to the native module', async () => {
    courseConfig(2026, 1);
    const course = {name: '高等数学', courseId: 'MATH001'};
    const grid = [
      {week: 1, weekday: 1, classFrom: 1, classTo: 2, color: '#fff'},
    ];
    (getCourseList as jest.Mock).mockResolvedValue([
      new Map([[course, grid]]),
      {studentId: '2021302111001'},
    ]);

    await render(<FetchCourseView />);

    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [course],
        [grid],
        null,
      ),
    );
  });

  it('maps the requested year and semester onto the request', async () => {
    courseConfig(2025, 2);
    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(getCourseList).toHaveBeenCalledWith(
        expect.objectContaining({year: 2025, semester: 2}),
      ),
    );
  });

  it('fails with the localized message when the semester is not configured', async () => {
    courseConfig(0, 0);
    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [],
        [],
        zh.education.semester_not_set,
      ),
    );
  });

  it('does not request the course list when the semester is missing', async () => {
    courseConfig(0, 0);
    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalled(),
    );
    expect(getCourseList).not.toHaveBeenCalled();
  });

  it('reports a fetch failure with the reason attached', async () => {
    courseConfig(2026, 1);
    (getCourseList as jest.Mock).mockRejectedValue(new Error('超时'));
    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [],
        [],
        '超时',
      ),
    );
  });

  it('reports a login failure without touching the course API', async () => {
    courseConfig(2026, 1);
    (loginEducation as jest.Mock).mockRejectedValueOnce(new Error('登录失败'));
    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [],
        [],
        '登录失败',
      ),
    );
    expect(getCourseList).not.toHaveBeenCalled();
  });

  it('returns empty lists when the schedule has no courses', async () => {
    courseConfig(2026, 1);
    (getCourseList as jest.Mock).mockResolvedValue([
      new Map(),
      {studentId: ''},
    ]);
    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [],
        [],
        null,
      ),
    );
  });
});

describe('FetchScoreView', () => {
  const scoreRow = {
    year: 2026,
    name: '高等数学',
    instructor: '张老师',
    courseId: 'MATH001',
    credit: 4,
    courseType: '公共基础必修',
    score: 95,
    courseCollege: '数学与统计学院',
    semester: 1,
    isEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getScoreList as jest.Mock).mockResolvedValue([
      [scoreRow],
      {
        college: '计算机学院',
        major: '计算机科学与技术',
        name: '张三',
        studentId: '2021302111001',
      },
    ]);
  });

  it('renders the shared education view', async () => {
    await render(<FetchScoreView />);
    expect(screen.getByTestId('fetch-score-view')).toBeTruthy();
  });

  it('logs in before requesting the score list', async () => {
    await render(<FetchScoreView />);
    await waitFor(() => expect(loginEducation).toHaveBeenCalled());
    await waitFor(() => expect(getScoreList).toHaveBeenCalled());
  });

  it('reports the score list as a JSON string', async () => {
    await render(<FetchScoreView />);
    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        JSON.stringify([scoreRow]),
        expect.any(String),
        null,
      ),
    );
  });

  it('reports the user info as a JSON string', async () => {
    await render(<FetchScoreView />);
    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({
          college: '计算机学院',
          major: '计算机科学与技术',
          name: '张三',
          studentId: '2021302111001',
        }),
        null,
      ),
    );
  });

  it('falls back to the profile lookup when the score response has no student id', async () => {
    (getScoreList as jest.Mock).mockResolvedValue([
      [scoreRow],
      {
        college: '计算机学院',
        major: '计算机科学与技术',
        name: '张三',
        studentId: '',
      },
    ]);
    (getUserInfo as jest.Mock).mockResolvedValue({
      studentID: '2021302111999',
      name: '张三',
      college: '计算机学院',
    });

    await render(<FetchScoreView />);

    await waitFor(() => expect(getUserInfo).toHaveBeenCalled());
    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({
          college: '计算机学院',
          major: '计算机科学与技术',
          name: '张三',
          studentId: '2021302111999',
        }),
        null,
      ),
    );
  });

  it('does not call the profile lookup when the student id is already present', async () => {
    await render(<FetchScoreView />);
    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalled(),
    );
    expect(getUserInfo).not.toHaveBeenCalled();
  });

  it('reports a fetch failure with the reason attached', async () => {
    (getScoreList as jest.Mock).mockRejectedValue(new Error('成绩查询失败'));
    await render(<FetchScoreView />);
    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '',
        '',
        '成绩查询失败',
      ),
    );
  });

  it('reports a login failure without requesting scores', async () => {
    (loginEducation as jest.Mock).mockRejectedValueOnce(new Error('登录失败'));
    await render(<FetchScoreView />);
    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '',
        '',
        '登录失败',
      ),
    );
    expect(getScoreList).not.toHaveBeenCalled();
  });

  it('reports empty results as serialized empty structures', async () => {
    (getScoreList as jest.Mock).mockResolvedValue([
      [],
      {college: '', major: '', name: '', studentId: '2021302111001'},
    ]);
    await render(<FetchScoreView />);
    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '[]',
        JSON.stringify({
          college: '',
          major: '',
          name: '',
          studentId: '2021302111001',
        }),
        null,
      ),
    );
  });
});
