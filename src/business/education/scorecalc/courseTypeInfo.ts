/**
 * Course type classification logic ported from the native Swift `ScoreTypeInfo` struct.
 *
 * Parses individual characters from `courseType` (e.g. "公共基础必修") and determines
 * whether a course is a primary course (必修 in the student's own college) or a
 * cross-college major course.
 */

interface CourseTypeInfo {
  /** Contains "公" */
  gong: boolean;
  /** Contains "专" */
  zhuan: boolean;
  /** Contains "通" */
  tong: boolean;
  /** Contains "必" */
  bi: boolean;
  /** Contains "选" */
  xuan: boolean;
  /** Course college differs from user college */
  kua: boolean;

  /** Whether this is a primary (必修) course for the student's own college */
  primaryCourse: boolean;
  /** Whether this is a cross-college major course */
  otherCollegeMajorCourse: boolean;
}

/**
 * Build a {@link CourseTypeInfo} from a course type string and college comparison.
 *
 * @param courseType    - The course type label (e.g. "专业必修", "公共选修")
 * @param courseCollege - The college that offers the course
 * @param userCollege   - The student's own college
 */
export function getCourseTypeInfo(
  courseType: string,
  courseCollege: string,
  userCollege: string,
): CourseTypeInfo {
  const gong = courseType.includes('公');
  const zhuan = courseType.includes('专');
  const tong = courseType.includes('通');
  const bi = courseType.includes('必');
  const xuan = courseType.includes('选');
  let kua = userCollege !== courseCollege;
  if (userCollege === '' || courseCollege === '') {
    kua = false;
  }
  const primaryCourse = (gong && bi) || (tong && bi) || (!kua && zhuan && bi);

  const otherCollegeMajorCourse =
    (kua && zhuan && bi) || (kua && zhuan && xuan);

  return {
    gong,
    zhuan,
    tong,
    bi,
    xuan,
    kua,
    primaryCourse,
    otherCollegeMajorCourse,
  };
}
