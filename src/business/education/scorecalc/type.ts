/** Metadata for a score calculation script (from remote or local source). */
interface ScoreCalcItem {
  title: string;
  date: string;
  author: string;
  version: number;
  brief: string;
  updateBrief: string;
  desc: string;
  type: 'APP' | 'GITHUB';
  url: string;
  script: string;
}

/**
 * A single course score entry passed into the calc function.
 *
 * - `courseType`    – Category of the course (e.g. "公共基础必修")
 * - `name`         – Course name (e.g. "高等数学")
 * - `credit`       – Credit hours
 * - `courseCollege` – College that offers the course
 * - `instructor`   – Instructor name
 * - `score`        – Numeric score
 * - `courseId`     – Unique identifier for the course
 */
interface ScoreJsItem {
  courseType: string;
  name: string;
  credit: number;
  courseCollege: string;
  instructor: string;
  score: number;
  courseId: string;
}

/**
 * Extra user information passed to the calc function.
 * Corresponds to the native `ScoreJsCalcUserInfoEntity` struct.
 *
 * - `userCollege` – The user's college name (e.g. "计算机学院")
 */
interface UserInfo {
  userCollege: string;
}

/** Input to the calc function — an array of {@link ScoreJsItem}. */
type CalcInput = ScoreJsItem[];

/**
 * Output of the calc function.
 * - `[0]` – Calculated score (number)
 * - `[1]` – Array of selected courseIds that contributed to the score
 */
type CalcOutput = [number, string[]];

export type {ScoreCalcItem, ScoreJsItem, CalcInput, CalcOutput, UserInfo};
