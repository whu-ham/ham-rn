import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import FetchCourseView from '@/components/education/course/FetchCourseView';
import FetchScoreView from '@/components/education/score/FetchScoreView';
import {getCourseList} from '@/business/education/course';
import {getScoreList, getUserInfo} from '@/business/education/score/api';
import {loginEducation} from '@/business/education';
import {CasReAuthLoginError} from '@/business/education/api';
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

/**
 * A timetable parsed with holes reaches the host only after the user has seen
 * what was dropped. The dialog is a notice, not a choice — the import still
 * runs, it just waits for the acknowledgement.
 */
describe('FetchCourseView ignored-course notice', () => {
  const course = (name: string) => ({name, courseId: `id-${name}`});
  const grid = (week: number) => [
    {week, weekday: 1, classFrom: 1, classTo: 2, color: '#fff'},
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    courseConfig(2026, 1);
  });

  const renderWith = async (
    map: Map<Record<string, unknown>, Array<Record<string, unknown>>>,
  ) => {
    (getCourseList as jest.Mock).mockResolvedValue([map, {studentId: ''}]);
    return await render(<FetchCourseView />);
  };

  it('imports straight away when nothing was ignored', async () => {
    await renderWith(new Map([[course('A'), grid(1)]]));
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [course('A')],
        [grid(1)],
        null,
      ),
    );
    expect(screen.queryByTestId('fetch-course-view-ignored')).toBeNull();
  });

  it('holds the import back and shows the notice when courses were ignored', async () => {
    await renderWith(
      new Map([
        [course('A'), grid(1)],
        [course('B'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    expect(EducationModule.onGetCourseList).not.toHaveBeenCalled();
  });

  it('lists every ignored course by name', async () => {
    await renderWith(
      new Map([
        [course('A'), grid(1)],
        [course('B'), []],
        [course('C'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    expect(
      screen.getByTestId('fetch-course-view-ignored-item-name-0'),
    ).toHaveTextContent('B');
    expect(
      screen.getByTestId('fetch-course-view-ignored-item-name-1'),
    ).toHaveTextContent('C');
    expect(screen.queryByTestId('fetch-course-view-ignored-item-2')).toBeNull();
  });

  it('says why each course was ignored', async () => {
    (getCourseList as jest.Mock).mockResolvedValue([
      new Map<Record<string, unknown>, Array<Record<string, unknown>>>(),
      {studentId: ''},
    ]);
    // Go through the real parser so the ignored course carries the week text
    // the education system actually sent.
    const {parseResponse} = jest.requireActual(
      '@/business/education/course/parser',
    );
    const [parsed] = parseResponse({
      json: {
        xsxx: {},
        kbList: [
          {kcmc: '高等数学', jxbmc: 'MATH001', zcd: '全周'},
          {kcmc: '英语', jxbmc: 'ENG001', zcd: '1-8周'},
        ],
      },
      year: 2026,
      semester: 1,
    });
    (getCourseList as jest.Mock).mockResolvedValue([parsed, {studentId: ''}]);

    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    expect(
      screen.getByTestId('fetch-course-view-ignored-item-name-0'),
    ).toHaveTextContent('高等数学');
    expect(
      screen.getByTestId('fetch-course-view-ignored-item-reason-0'),
    ).toHaveTextContent(
      zh.education.ignored_course_reason.replace('{{weekText}}', '全周'),
    );
  });

  it('imports the parsed courses once the user acknowledges', async () => {
    await renderWith(
      new Map([
        [course('A'), grid(1)],
        [course('B'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );

    await fireEvent.press(
      screen.getByTestId('fetch-course-view-ignored-confirm'),
    );

    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [course('A')],
        [grid(1)],
        null,
      ),
    );
  });

  it('dismisses the notice after acknowledging', async () => {
    await renderWith(
      new Map([
        [course('A'), grid(1)],
        [course('B'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    await fireEvent.press(
      screen.getByTestId('fetch-course-view-ignored-confirm'),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('fetch-course-view-ignored')).toBeNull(),
    );
  });

  it('imports only once when acknowledged', async () => {
    await renderWith(
      new Map([
        [course('A'), grid(1)],
        [course('B'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    await fireEvent.press(
      screen.getByTestId('fetch-course-view-ignored-confirm'),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('fetch-course-view-ignored')).toBeNull(),
    );
    expect(EducationModule.onGetCourseList).toHaveBeenCalledTimes(1);
  });

  it('does not import when every course failed to parse', async () => {
    await renderWith(
      new Map([
        [course('A'), []],
        [course('B'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );

    await fireEvent.press(
      screen.getByTestId('fetch-course-view-ignored-confirm'),
    );

    // An empty success payload would let a replace-semantics host wipe the
    // timetable, so this must read as an error, not as "imported nothing".
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [],
        [],
        zh.education.ignored_course_all_failed_ack,
      ),
    );
  });

  it('explains that nothing will be imported when every course failed', async () => {
    await renderWith(
      new Map([
        [course('A'), []],
        [course('B'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    expect(
      screen.getByTestId('fetch-course-view-ignored-summary'),
    ).toHaveTextContent(
      zh.education.ignored_course_summary_all_failed.replace('{{count}}', '2'),
    );
  });

  it('completes the import after the re-auth flow runs a second fetch', async () => {
    // The first attempt fails with a CAS error from the fetch itself, the
    // WebView completes, and doFetch runs again. This is the path a stale
    // session takes, and it has to end in a successful callback.
    let attempts = 0;
    (getCourseList as jest.Mock).mockImplementation(() => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(
          new CasReAuthLoginError('https://cas.example/reauth'),
        );
      }
      return Promise.resolve([
        new Map([[course('A'), grid(1)]]),
        {studentId: ''},
      ]);
    });

    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-reauth')).toBeTruthy(),
    );

    global.fetch = jest.fn(() => Promise.resolve(new Response())) as never;
    screen
      .getByTestId('fetch-course-view-reauth')
      .props.onShouldStartLoadWithRequest({
        url: 'https://cas.example/?ticket=ST-1',
      });

    await waitFor(() => expect(getCourseList).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalled(),
    );
  });

  it('shows the notice when the re-auth fetch also has ignored courses', async () => {
    let attempts = 0;
    (getCourseList as jest.Mock).mockImplementation(() => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(
          new CasReAuthLoginError('https://cas.example/reauth'),
        );
      }
      return Promise.resolve([
        new Map([
          [course('A'), grid(1)],
          [course('B'), []],
        ]),
        {studentId: ''},
      ]);
    });

    await render(<FetchCourseView />);
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-reauth')).toBeTruthy(),
    );
    global.fetch = jest.fn(() => Promise.resolve(new Response())) as never;
    screen
      .getByTestId('fetch-course-view-reauth')
      .props.onShouldStartLoadWithRequest({
        url: 'https://cas.example/?ticket=ST-1',
      });

    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    await fireEvent.press(
      screen.getByTestId('fetch-course-view-ignored-confirm'),
    );
    await waitFor(() =>
      expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
        [course('A')],
        [grid(1)],
        null,
      ),
    );
  });

  it('does not re-run the fetch behind the notice', async () => {
    await renderWith(
      new Map([
        [course('A'), grid(1)],
        [course('B'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    expect(getCourseList).toHaveBeenCalledTimes(1);
  });

  // Regression: FetchEducationView fetches from a mount effect, so rendering
  // the notice *instead of* that view unmounts it and the effect re-runs on
  // remount — fetching again, which surfaces the notice again, forever. The
  // notice has to go in as a child so the fetching view stays mounted.
  it('does not refetch in a loop when the notice replaces the loading screen', async () => {
    await renderWith(
      new Map([
        [course('A'), grid(1)],
        [course('B'), []],
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fetch-course-view-ignored')).toBeTruthy(),
    );
    await fireEvent.press(
      screen.getByTestId('fetch-course-view-ignored-confirm'),
    );
    // Give any re-render a chance to kick off another fetch.
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(getCourseList).toHaveBeenCalledTimes(1);
    expect(EducationModule.onGetCourseList).toHaveBeenCalledTimes(1);
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

  // The hosts read an absent errorMessage as success, so a rejection the view
  // cannot describe still has to produce a message. Reporting `undefined` here
  // handed them an empty score list and had them write it to the database.
  it('reports a non-Error rejection with the thrown value as the reason', async () => {
    (getScoreList as jest.Mock).mockRejectedValue('plain string');
    await render(<FetchScoreView />);
    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '',
        '',
        'plain string',
      ),
    );
  });

  // Regression: the handler stringified the error for its log line, which
  // throws outright on a circular reference. The throw landed inside the only
  // handler for the rejection, so nothing was reported at all and the screen
  // sat on loading for as long as the sheet stayed up.
  it('reports a circular error instead of dying in its own log line', async () => {
    const circular = new Error('boom') as Error & {self?: unknown};
    circular.self = circular;
    (getScoreList as jest.Mock).mockRejectedValue(circular);

    await render(<FetchScoreView />);

    await waitFor(() =>
      expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
        '',
        '',
        'boom',
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
