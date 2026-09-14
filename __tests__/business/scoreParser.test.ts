import {parseResponse} from '@/business/education/score/parser';

type Item = {
  jgmc?: string;
  zymc?: string;
  xm?: string;
  xh?: string;
  xnm?: string;
  kcmc?: string;
  jsxm?: string;
  jxbmc?: string;
  xf?: string;
  kcxzmc?: string;
  bfzcj?: string;
  kkbmmc?: string;
  xqm?: string;
};

const parse = (items: Item[]) => parseResponse({json: {items}});

const onlyScore = (item: Item) => {
  const [scores] = parse([{xnm: '2024', xf: '3', bfzcj: '85', ...item}]);
  return scores[0];
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('returns a score array and a user info object', () => {
  const [scores, userInfo] = parse([
    {
      xh: '20210001',
      jgmc: '计算机学院',
      zymc: '软件工程',
      xm: '李四',
      xnm: '2024',
      kcmc: '数据结构',
      xf: '4',
      bfzcj: '90',
    },
  ]);
  expect(scores).toHaveLength(1);
  expect(userInfo).toEqual({
    college: '计算机学院',
    major: '软件工程',
    name: '李四',
    studentId: '20210001',
  });
});

it('maps xqm 3 to semester 1', () => {
  expect(onlyScore({xqm: '3'}).semester).toBe(1);
});

it('maps xqm 12 to semester 2', () => {
  expect(onlyScore({xqm: '12'}).semester).toBe(2);
});

it('maps xqm 16 to semester 3', () => {
  expect(onlyScore({xqm: '16'}).semester).toBe(3);
});

it('falls back to semester 1 for an unmapped xqm', () => {
  expect(onlyScore({xqm: '5'}).semester).toBe(1);
});

it('keeps the last rows userInfo when several rows carry a studentId', () => {
  const [, userInfo] = parse([
    {
      xh: 'first',
      jgmc: '学院A',
      zymc: '专业A',
      xm: '甲',
      xnm: '2024',
      xf: '1',
      bfzcj: '60',
    },
    {
      xh: 'second',
      jgmc: '学院B',
      zymc: '专业B',
      xm: '乙',
      xnm: '2024',
      xf: '1',
      bfzcj: '60',
    },
  ]);
  expect(userInfo).toEqual({
    college: '学院B',
    major: '专业B',
    name: '乙',
    studentId: 'second',
  });
});

it('keeps the default user info when no row carries a studentId', () => {
  const [, userInfo] = parse([{xh: '', xnm: '2024', xf: '3', bfzcj: '85'}]);
  expect(userInfo).toEqual({
    college: '',
    major: '',
    name: '',
    studentId: '',
  });
});

it('skips rows whose year is not positive', () => {
  const [scores] = parse([
    {xnm: '0', xf: '3', bfzcj: '85'},
    {xnm: '-1', xf: '3', bfzcj: '85'},
  ]);
  expect(scores).toEqual([]);
});

it('skips rows whose credit is NaN', () => {
  const [scores] = parse([{xnm: '2024', xf: 'abc', bfzcj: '85'}]);
  expect(scores).toEqual([]);
});

it('skips rows whose score is NaN', () => {
  const [scores] = parse([{xnm: '2024', xf: '3', bfzcj: '缺考'}]);
  expect(scores).toEqual([]);
});

it('always marks kept rows as enabled', () => {
  expect(onlyScore({}).isEnabled).toBe(true);
});

it('parses year, credit and score numerically', () => {
  const score = onlyScore({xnm: '2024', xf: '2.5', bfzcj: '87'});
  expect(score.year).toBe(2024);
  expect(score.credit).toBe(2.5);
  expect(score.score).toBe(87);
});

it('maps all remaining fields onto the entity', () => {
  const score = onlyScore({
    kcmc: '线性代数',
    jsxm: '王五',
    jxbmc: 'MATH201',
    kcxzmc: '专业必修',
    kkbmmc: '数学学院',
  });
  expect(score.name).toBe('线性代数');
  expect(score.instructor).toBe('王五');
  expect(score.courseId).toBe('MATH201');
  expect(score.courseType).toBe('专业必修');
  expect(score.courseCollege).toBe('数学学院');
});

it('returns an empty array and default user info for empty items', () => {
  const [scores, userInfo] = parse([]);
  expect(scores).toEqual([]);
  expect(userInfo).toEqual({
    college: '',
    major: '',
    name: '',
    studentId: '',
  });
});
