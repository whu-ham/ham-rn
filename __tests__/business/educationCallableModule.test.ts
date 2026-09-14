import {educationCallableModule} from '@/business/education/module';
import {loginEducation} from '@/business/education';
import {getCourseList} from '@/business/education/course';
import {getScoreList, getUserInfo} from '@/business/education/score/api';
import EducationModule from '@/modules/NativeEducationModule';
import zh from '@/i18n/zh/translation.json';

/**
 * `educationCallableModule` is the BatchedBridge entry point the host app
 * calls. It never renders — it logs in, fetches, and reports through the
 * native module — so these are plain async assertions.
 */
// `module.ts` imports `loginEducation` from `@/business/education/api` (via the
// `education` barrel), and `generateValidate` from the same file. Mock the
// concrete module rather than the barrel so the binding is the one used.
jest.mock('@/business/education/api', () => ({
  loginEducation: jest.fn(() => Promise.resolve()),
  generateValidate: jest.fn(() => 'test-validate'),
}));

jest.mock('@/business/education/course', () => ({
  getCourseList: jest.fn(),
}));

jest.mock('@/business/education/score/api', () => ({
  getScoreList: jest.fn(),
  getUserInfo: jest.fn(),
}));

describe('educationCallableModule.updateCourseList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCourseList as jest.Mock).mockResolvedValue([
      new Map(),
      {studentId: ''},
    ]);
  });

  it('reports courses and grids on success', async () => {
    const course = {name: '高等数学', courseId: 'MATH001'};
    const grid = [
      {week: 1, weekday: 1, classFrom: 1, classTo: 2, color: '#fff'},
    ];
    (getCourseList as jest.Mock).mockResolvedValue([
      new Map([[course, grid]]),
      {studentId: '2021302111001'},
    ]);

    await educationCallableModule.updateCourseList(2026, 1);

    expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
      [course],
      [grid],
      null,
    );
  });

  it('requests the year and semester it was given', async () => {
    await educationCallableModule.updateCourseList(2025, 2);
    expect(getCourseList).toHaveBeenCalledWith(
      expect.objectContaining({year: 2025, semester: 2}),
    );
  });

  it('logs in before fetching', async () => {
    await educationCallableModule.updateCourseList(2026, 1);
    expect(loginEducation).toHaveBeenCalledTimes(1);
    expect(getCourseList).toHaveBeenCalledTimes(1);
  });

  it('reports a login failure and skips the fetch', async () => {
    (loginEducation as jest.Mock).mockRejectedValueOnce(new Error('会话过期'));
    await educationCallableModule.updateCourseList(2026, 1);

    expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
      [],
      [],
      zh.education.login_failed_full.replace('{{reason}}', '会话过期'),
    );
    expect(getCourseList).not.toHaveBeenCalled();
  });

  it('reports a fetch failure with the reason', async () => {
    (getCourseList as jest.Mock).mockRejectedValueOnce(new Error('解析失败'));
    await educationCallableModule.updateCourseList(2026, 1);

    expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
      [],
      [],
      zh.education.course_fetch_failed_with_reason.replace(
        '{{reason}}',
        '解析失败',
      ),
    );
  });

  it('reports empty lists when there are no courses', async () => {
    await educationCallableModule.updateCourseList(2026, 1);
    expect(EducationModule.onGetCourseList).toHaveBeenCalledWith([], [], null);
  });

  it('does not report twice on success', async () => {
    await educationCallableModule.updateCourseList(2026, 1);
    expect(EducationModule.onGetCourseList).toHaveBeenCalledTimes(1);
  });

  it('keeps the order of courses aligned with their grid lists', async () => {
    const a = {name: 'A', courseId: 'A1'};
    const b = {name: 'B', courseId: 'B1'};
    const gridA = [
      {week: 1, weekday: 1, classFrom: 1, classTo: 2, color: '#a'},
    ];
    const gridB = [
      {week: 2, weekday: 3, classFrom: 3, classTo: 4, color: '#b'},
    ];
    (getCourseList as jest.Mock).mockResolvedValue([
      new Map([
        [a, gridA],
        [b, gridB],
      ]),
      {studentId: ''},
    ]);

    await educationCallableModule.updateCourseList(2026, 1);

    expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
      [a, b],
      [gridA, gridB],
      null,
    );
  });

  it('handles a non-Error rejection during login without throwing', async () => {
    (loginEducation as jest.Mock).mockRejectedValueOnce('plain string');
    await expect(
      educationCallableModule.updateCourseList(2026, 1),
    ).resolves.toBeUndefined();
    expect(EducationModule.onGetCourseList).not.toHaveBeenCalled();
  });

  it('handles a non-Error rejection during fetch without throwing', async () => {
    (getCourseList as jest.Mock).mockRejectedValueOnce('plain string');
    await expect(
      educationCallableModule.updateCourseList(2026, 1),
    ).resolves.toBeUndefined();
    expect(EducationModule.onGetCourseList).not.toHaveBeenCalled();
  });
});

describe('educationCallableModule.updateScoreList', () => {
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
  const userInfo = {
    college: '计算机学院',
    major: '计算机科学与技术',
    name: '张三',
    studentId: '2021302111001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getScoreList as jest.Mock).mockResolvedValue([[scoreRow], {...userInfo}]);
  });

  it('reports serialized scores and user info on success', async () => {
    await educationCallableModule.updateScoreList();
    expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
      JSON.stringify([scoreRow]),
      JSON.stringify(userInfo),
      null,
    );
  });

  it('logs in before fetching', async () => {
    await educationCallableModule.updateScoreList();
    expect(loginEducation).toHaveBeenCalledTimes(1);
    expect(getScoreList).toHaveBeenCalledTimes(1);
  });

  it('reports a login failure and skips the fetch', async () => {
    (loginEducation as jest.Mock).mockRejectedValueOnce(new Error('会话过期'));
    await educationCallableModule.updateScoreList();

    expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
      '',
      '',
      zh.education.login_failed_full.replace('{{reason}}', '会话过期'),
    );
    expect(getScoreList).not.toHaveBeenCalled();
  });

  it('reports a fetch failure with the reason', async () => {
    (getScoreList as jest.Mock).mockRejectedValueOnce(
      new Error('成绩解析失败'),
    );
    await educationCallableModule.updateScoreList();

    expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
      [],
      [],
      zh.education.score_fetch_failed_with_reason.replace(
        '{{reason}}',
        '成绩解析失败',
      ),
    );
  });

  it('falls back to the profile lookup when the student id is empty', async () => {
    (getScoreList as jest.Mock).mockResolvedValue([
      [scoreRow],
      {...userInfo, studentId: ''},
    ]);
    (getUserInfo as jest.Mock).mockResolvedValue({
      studentID: '2021302111999',
      name: '张三',
      college: '计算机学院',
    });

    await educationCallableModule.updateScoreList();

    expect(getUserInfo).toHaveBeenCalledTimes(1);
    expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
      JSON.stringify([scoreRow]),
      JSON.stringify({...userInfo, studentId: '2021302111999'}),
      null,
    );
  });

  it('does not call the profile lookup when the student id is present', async () => {
    await educationCallableModule.updateScoreList();
    expect(getUserInfo).not.toHaveBeenCalled();
  });

  it('reports empty scores as an empty JSON array', async () => {
    (getScoreList as jest.Mock).mockResolvedValue([[], {...userInfo}]);
    await educationCallableModule.updateScoreList();
    expect(EducationModule.onGetScoreList).toHaveBeenCalledWith(
      '[]',
      JSON.stringify(userInfo),
      null,
    );
  });

  // Documents a real defect: when the profile lookup fails, the score path
  // swallows the error and reports it through `onGetCourseList` instead of
  // `onGetScoreList`, so the host app's score request never gets a response.
  it('reports a profile-lookup failure through the course callback (known defect)', async () => {
    (getScoreList as jest.Mock).mockResolvedValue([
      [scoreRow],
      {...userInfo, studentId: ''},
    ]);
    (getUserInfo as jest.Mock).mockRejectedValue(new Error('profile down'));

    await expect(
      educationCallableModule.updateScoreList(),
    ).resolves.toBeUndefined();

    expect(EducationModule.onGetCourseList).toHaveBeenCalledWith(
      [],
      [],
      zh.education.score_fetch_failed_with_reason.replace(
        '{{reason}}',
        'profile down',
      ),
    );
    expect(EducationModule.onGetScoreList).not.toHaveBeenCalled();
  });

  it('handles a non-Error rejection during login without throwing', async () => {
    (loginEducation as jest.Mock).mockRejectedValueOnce('plain string');
    await expect(
      educationCallableModule.updateScoreList(),
    ).resolves.toBeUndefined();
    expect(EducationModule.onGetScoreList).not.toHaveBeenCalled();
  });
});

describe('educationCallableModule surface', () => {
  it('exposes exactly the two entry points the bridge registers', () => {
    expect(Object.keys(educationCallableModule).sort()).toEqual([
      'updateCourseList',
      'updateScoreList',
    ]);
  });
});
