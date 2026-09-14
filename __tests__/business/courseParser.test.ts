import {parseResponse} from '@/business/education/course/parser';
import {getRandomColorHexString} from '@/business/education/course/color';

type KbItem = {
  kcmc?: string;
  jxbmc?: string;
  xqj?: string;
  cdmc?: string;
  jcs?: string;
  xm?: string;
  zcmc?: string;
  kcxz?: string;
  xf?: string;
  zcd?: string;
};

const parse = (
  kbList: KbItem[],
  xsxx: {XH_ID?: string; XH?: string} = {},
  year = 2024,
  semester = 1,
) => parseResponse({json: {xsxx, kbList}, year, semester});

const firstCourse = (
  kbList: KbItem[],
  xsxx?: {XH_ID?: string; XH?: string},
) => {
  const [map] = parse(kbList, xsxx);
  const [course] = [...map.keys()];
  return course;
};

const firstGrid = (kbList: KbItem[]) => {
  const [map] = parse(kbList);
  return [...map.values()][0];
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('returns a Map of courses and a studentId object', () => {
  const [map, student] = parse([{kcmc: '高等数学', jxbmc: 'MATH101'}], {
    XH: '20210001',
  });
  expect(map).toBeInstanceOf(Map);
  expect(map.size).toBe(1);
  expect(student).toEqual({studentId: '20210001'});
});

it('maps every course to a grid list', () => {
  const [map] = parse([
    {kcmc: 'A', jxbmc: 'A1'},
    {kcmc: 'B', jxbmc: 'B1'},
  ]);
  expect(map.size).toBe(2);
  expect([...map.values()].every(v => Array.isArray(v))).toBe(true);
});

it('falls back to empty strings and -1 for missing fields', () => {
  const course = firstCourse([{}]);
  expect(course).toEqual({
    classFrom: -1,
    classTo: -1,
    weekFrom: -1,
    weekTo: -1,
    name: '',
    courseId: '',
    weekday: -1,
    location: '',
    color: getRandomColorHexString(''),
    semester: 1,
    year: 2024,
    instructor: '',
    instructorType: '',
    courseType: '',
    credit: NaN,
  });
});

it('maps all provided string fields through', () => {
  const course = firstCourse([
    {
      kcmc: '大学英语',
      jxbmc: 'ENG202',
      cdmc: '教三-301',
      xm: '张三',
      zcmc: '主讲',
      kcxz: '公共基础必修',
    },
  ]);
  expect(course.name).toBe('大学英语');
  expect(course.courseId).toBe('ENG202');
  expect(course.location).toBe('教三-301');
  expect(course.instructor).toBe('张三');
  expect(course.instructorType).toBe('主讲');
  expect(course.courseType).toBe('公共基础必修');
});

it('remaps weekday 7 to 0 (Sunday)', () => {
  expect(firstCourse([{xqj: '7'}]).weekday).toBe(0);
});

it('keeps weekday 3 unchanged', () => {
  expect(firstCourse([{xqj: '3'}]).weekday).toBe(3);
});

it('parses a class period range into classFrom and classTo', () => {
  const course = firstCourse([{jcs: '1-2'}]);
  expect(course.classFrom).toBe(1);
  expect(course.classTo).toBe(2);
});

it('leaves both class bounds at -1 when the period has no dash', () => {
  const course = firstCourse([{jcs: '3'}]);
  expect(course.classFrom).toBe(-1);
  expect(course.classTo).toBe(-1);
});

it('parses credits with parseFloat', () => {
  expect(firstCourse([{xf: '3.5'}]).credit).toBe(3.5);
});

it('assigns a deterministic color per courseId', () => {
  const color = firstCourse([{jxbmc: 'CS101'}]).color;
  expect(color).toBe(getRandomColorHexString('CS101'));
  expect(firstCourse([{jxbmc: 'CS101'}]).color).toBe(color);
});

it('builds a continuous week grid for "1-16周"', () => {
  const course = firstCourse([{zcd: '1-16周', jcs: '1-2', xqj: '1'}]);
  expect(course.weekFrom).toBe(1);
  expect(course.weekTo).toBe(16);
  const grid = firstGrid([{zcd: '1-16周', jcs: '1-2', xqj: '1'}]);
  expect(grid).toHaveLength(16);
  expect(grid[0]).toEqual({
    week: 1,
    weekday: 1,
    classFrom: 1,
    classTo: 2,
    color: '',
  });
  expect(grid[15]).toEqual({
    week: 16,
    weekday: 1,
    classFrom: 1,
    classTo: 2,
    color: '',
  });
});

it('leaves week bounds at -1 for non-contiguous weeks', () => {
  const course = firstCourse([{zcd: '1-4,7-8'}]);
  expect(course.weekFrom).toBe(-1);
  expect(course.weekTo).toBe(-1);
  expect(firstGrid([{zcd: '1-4,7-8'}])).toHaveLength(6);
});

it('expands only odd weeks for a 单 week spec', () => {
  const grid = firstGrid([{zcd: '1-6(单)'}]);
  expect(grid.map(g => g.week)).toEqual([1, 3, 5]);
  expect(firstCourse([{zcd: '1-6(单)'}]).weekFrom).toBe(-1);
});

it('returns an empty map for an empty kbList', () => {
  const [map, student] = parse([], {XH: '20210001'});
  expect(map.size).toBe(0);
  expect(student).toEqual({studentId: '20210001'});
});

it('prefers XH over XH_ID for the studentId', () => {
  const [, student] = parse([], {XH: 'from-XH', XH_ID: 'from-XH_ID'});
  expect(student).toEqual({studentId: 'from-XH'});
});

it('falls back to XH_ID when XH is absent', () => {
  const [, student] = parse([], {XH_ID: 'from-XH_ID'});
  expect(student).toEqual({studentId: 'from-XH_ID'});
});
