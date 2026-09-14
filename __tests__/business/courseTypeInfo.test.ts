import {getCourseTypeInfo} from '@/business/education/scorecalc/courseTypeInfo';

const CS = '计算机学院';
const MATH = '数学学院';

beforeEach(() => {
  jest.clearAllMocks();
});

it('extracts the 公 flag', () => {
  expect(getCourseTypeInfo('公共基础必修', CS, CS).gong).toBe(true);
  expect(getCourseTypeInfo('专业必修', CS, CS).gong).toBe(false);
});

it('extracts the 专 flag', () => {
  expect(getCourseTypeInfo('专业必修', CS, CS).zhuan).toBe(true);
  expect(getCourseTypeInfo('公共基础必修', CS, CS).zhuan).toBe(false);
});

it('extracts the 通 flag', () => {
  expect(getCourseTypeInfo('通识必修', CS, CS).tong).toBe(true);
  expect(getCourseTypeInfo('专业选修', CS, CS).tong).toBe(false);
});

it('extracts the 必 flag', () => {
  expect(getCourseTypeInfo('专业必修', CS, CS).bi).toBe(true);
  expect(getCourseTypeInfo('专业选修', CS, CS).bi).toBe(false);
});

it('extracts the 选 flag', () => {
  expect(getCourseTypeInfo('专业选修', CS, CS).xuan).toBe(true);
  expect(getCourseTypeInfo('专业必修', CS, CS).xuan).toBe(false);
});

it('extracts a combination of flags at once', () => {
  expect(getCourseTypeInfo('公共基础必修', CS, CS)).toEqual({
    gong: true,
    zhuan: false,
    tong: false,
    bi: true,
    xuan: false,
    kua: false,
    primaryCourse: true,
    otherCollegeMajorCourse: false,
  });
});

it('sets kua when the course college differs from the user college', () => {
  expect(getCourseTypeInfo('专业选修', MATH, CS).kua).toBe(true);
});

it('clears kua when the colleges match', () => {
  expect(getCourseTypeInfo('专业选修', CS, CS).kua).toBe(false);
});

it('forces kua to false when the user college is empty', () => {
  expect(getCourseTypeInfo('专业选修', MATH, '').kua).toBe(false);
});

it('forces kua to false when the course college is empty', () => {
  expect(getCourseTypeInfo('专业选修', '', CS).kua).toBe(false);
});

it('treats 公共基础必修 as a primary course', () => {
  expect(getCourseTypeInfo('公共基础必修', MATH, CS).primaryCourse).toBe(true);
});

it('treats 通识必修 as a primary course', () => {
  expect(getCourseTypeInfo('通识必修', MATH, CS).primaryCourse).toBe(true);
});

it('treats 专业必修 in the own college as a primary course', () => {
  expect(getCourseTypeInfo('专业必修', CS, CS).primaryCourse).toBe(true);
});

it('does not treat cross-college 专业必修 as a primary course', () => {
  expect(getCourseTypeInfo('专业必修', MATH, CS).primaryCourse).toBe(false);
});

it('treats cross-college 专业必修 as an other-college major course', () => {
  expect(getCourseTypeInfo('专业必修', MATH, CS).otherCollegeMajorCourse).toBe(
    true,
  );
});

it('treats cross-college 专业选修 as an other-college major course', () => {
  expect(getCourseTypeInfo('专业选修', MATH, CS).otherCollegeMajorCourse).toBe(
    true,
  );
});

it('does not treat same-college 专业选修 as an other-college major course', () => {
  expect(getCourseTypeInfo('专业选修', CS, CS).otherCollegeMajorCourse).toBe(
    false,
  );
});

it('does not treat cross-college 公共选修 as an other-college major course', () => {
  const info = getCourseTypeInfo('公共选修', MATH, CS);
  expect(info.kua).toBe(true);
  expect(info.zhuan).toBe(false);
  expect(info.otherCollegeMajorCourse).toBe(false);
});
