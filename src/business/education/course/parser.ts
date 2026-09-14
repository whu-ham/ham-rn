import type {CourseEntity, CourseGridEntity} from './type.ts';
import {getRandomColorHexString} from './color';
import Log from '@/modules/NativeLog';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/15 18:10
 */

enum CourseWeekType {
  NORMAL,
  ODD,
  EVEN,
}

const parseResponse = ({
  json,
  year,
  semester,
}: {
  json: {
    xsxx: {
      XH_ID?: string;
      XH?: string;
    };
    kbList: {
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
    }[];
  };
  year: number;
  semester: number;
}): [Map<CourseEntity, CourseGridEntity[]>, {studentId?: string}] => {
  const kbList = json.kbList;
  const result = new Map<CourseEntity, CourseGridEntity[]>();
  for (let data of kbList) {
    const course: CourseEntity = {
      classFrom: -1,
      classTo: -1,
      weekFrom: -1,
      weekTo: -1,
      name: data.kcmc ?? '',
      courseId: data.jxbmc ?? '',
      weekday: parseInt(data.xqj ?? '', 10) || -1,
      location: data.cdmc ?? '',
      color: getRandomColorHexString(data.jxbmc ?? ''),
      semester: semester,
      year: year,
      instructor: data.xm ?? '',
      instructorType: data.zcmc ?? '',
      courseType: data.kcxz ?? '',
      credit: parseFloat(data.xf ?? ''),
    };

    if (course.weekday === 7) {
      course.weekday = 0;
    }

    const classPeriod = data.jcs ?? '';
    if (classPeriod.includes('-')) {
      const [classFromStr, classToStr] = classPeriod.split('-');
      course.classFrom = parseInt(classFromStr, 10) || -1;
      course.classTo = parseInt(classToStr, 10) || -1;
    }

    // A course with no parsable weeks stays in the map with an empty grid
    // list; parseResponse keeps reporting what the system sent. Dropping it
    // is toNativeCoursePairing's job, at the native boundary.
    const courseGridList = getEmptyCourseGridWithWeek(data.zcd ?? '');

    const weekFrom = Math.min(...courseGridList.map(grid => grid.week));
    const weekTo = Math.max(...courseGridList.map(grid => grid.week));
    const weekPeriodContinuous =
      weekTo - weekFrom + 1 === courseGridList.length;

    if (weekPeriodContinuous) {
      course.weekFrom = weekFrom;
      course.weekTo = weekTo;
    }

    courseGridList.forEach(grid => {
      grid.classFrom = course.classFrom;
      grid.classTo = course.classTo;
      grid.weekday = course.weekday;
    });

    result.set(course, courseGridList);
  }
  // Keep this optional: callers fall back to another student ID source with
  // `??`, and an empty string is not nullish, so coercing a missing value to
  // '' here would silently defeat that fallback.
  return [result, {studentId: json.xsxx.XH ?? json.xsxx.XH_ID}];
};

/**
 * Separators the education system uses between zcd segments. The ASCII comma
 * is the documented one; Chinese payloads also emit the full-width and
 * ideographic forms. Splitting on all three matters because an unsplit
 * segment does not fail loudly — `parseInt` stops at the first non-digit, so
 * "3-3周，5-5周" quietly collapses to week 3 and loses week 5.
 */
const WEEK_SEGMENT_SEPARATOR = /[,，、]/;

const getEmptyCourseGridWithWeek = (
  weekTime: string,
): Array<CourseGridEntity> => {
  return weekTime
    .split(WEEK_SEGMENT_SEPARATOR)
    .map(week => handleSingleWeekTime(week))
    .filter((data): boolean => data !== undefined)
    .map(data => data!!)
    .flatMap(({courseWeekType, weekFrom, weekTo}) => {
      const result: CourseGridEntity[] = [];
      for (let week = weekFrom; week <= weekTo; week++) {
        if (
          (courseWeekType === CourseWeekType.ODD && week % 2 === 0) ||
          (courseWeekType === CourseWeekType.EVEN && week % 2 === 1)
        ) {
          continue;
        }
        result.push({classFrom: 0, classTo: 0, color: '', weekday: 0, week});
      }
      return result;
    })
    .filter(
      (value, index, self) =>
        index === self.findIndex(t => t.week === value.week),
    );
};

const handleSingleWeekTime = (
  singleWeekTime: string,
):
  | undefined
  | {
      courseWeekType: CourseWeekType;
      weekFrom: number;
      weekTo: number;
    } => {
  if (!singleWeekTime || singleWeekTime.length <= 0) {
    return undefined;
  }

  let courseWeekType = CourseWeekType.NORMAL;
  if (singleWeekTime.indexOf('单') !== -1) {
    courseWeekType = CourseWeekType.ODD;
  } else if (singleWeekTime.indexOf('双') !== -1) {
    courseWeekType = CourseWeekType.EVEN;
  }

  const clearTimeStr = singleWeekTime.replace(/[()（）单双周]/g, '');
  const weekNumStrArr = clearTimeStr.split('-');
  const weekFrom = parseInt(weekNumStrArr[0], 10);
  if (isNaN(weekFrom)) {
    return undefined;
  }
  let weekTo =
    weekNumStrArr.length > 1 ? parseInt(weekNumStrArr[1], 10) : weekFrom;
  if (isNaN(weekTo)) {
    weekTo = weekFrom;
  }

  // The system sometimes sends reversed ranges like "8-1周". Swap them so the
  // loop expands in ascending order — otherwise it never runs and the course
  // parses to zero grids.
  const [startWeek, endWeek] =
    weekFrom <= weekTo ? [weekFrom, weekTo] : [weekTo, weekFrom];

  // Keep a lone week whose parity contradicts an odd/even marker (e.g.
  // "2周(单)") — dropping it would leave the course with zero grids.
  let courseWeekTypeResolved = courseWeekType;
  if (startWeek === endWeek) {
    const isOddWeek = startWeek % 2 === 1;
    if (
      (courseWeekType === CourseWeekType.ODD && !isOddWeek) ||
      (courseWeekType === CourseWeekType.EVEN && isOddWeek)
    ) {
      courseWeekTypeResolved = CourseWeekType.NORMAL;
    }
  }

  return {
    courseWeekType: courseWeekTypeResolved,
    weekFrom: startWeek,
    weekTo: endWeek,
  };
};

/**
 * Flattens the parse result into the two parallel arrays the native side
 * expects.
 *
 * Courses with an empty grid list must be filtered out: when
 * `CourseGridDao.insert` receives an empty array, SQLite.swift's
 * `insertMany([])` degrades to `INSERT INTO course_grid DEFAULT VALUES`,
 * which violates the NOT NULL constraint on course_table_id and aborts the
 * whole save, leaving the timetable empty.
 */
const toNativeCoursePairing = (courseListResult: {
  entries(): IterableIterator<[CourseEntity, CourseGridEntity[]]>;
}): [CourseEntity[], CourseGridEntity[][]] => {
  const nativeCourseList: CourseEntity[] = [];
  const nativeCourseGridList: CourseGridEntity[][] = [];
  for (let entry of courseListResult.entries()) {
    const [course, courseGridList] = entry;
    if (courseGridList.length === 0) {
      Log.e(
        'toNativeCoursePairing',
        `dropped empty-grid course: name=${course.name}`,
      );
      continue;
    }
    nativeCourseList.push(course);
    nativeCourseGridList.push(courseGridList);
  }
  return [nativeCourseList, nativeCourseGridList];
};

export {parseResponse, toNativeCoursePairing};
