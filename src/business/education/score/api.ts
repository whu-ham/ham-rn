import {parseResponse} from './parser';
import {logChunked, requestGet, requestPost} from '@/utils/request/request';
// @ts-ignore
import {load as cheerioLoad} from 'cheerio/dist/browser';
import {getCourseList} from '@/business/education/course';
import EducationModule from '@/modules/NativeEducationModule';
import {generateValidate} from '@/business/education/api';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/16 00:43
 */

interface UserInfo {
  studentID: string;
  name: string;
  college: string;
}

const getStudentIdFromEducation = async () => {
  const {year, semester} = EducationModule.getCourseConfig();
  const [, {studentId}] = await getCourseList({
    year: year,
    semester: semester,
    validate: generateValidate(),
  });
  return studentId;
};

const getUserInfo = async (): Promise<UserInfo> => {
  let studentId: string | undefined;
  try {
    studentId = await getStudentIdFromEducation();
  } catch {}
  const response = await requestGet({
    url: 'https://jwgl.whu.edu.cn/xtgl/index_cxYhxxIndex.html?xt=jw&localeKey=zh_CN&_=1769360780967&gnmkdm=index',
    headers: {
      Host: 'jwgl.whu.edu.cn',
    },
  });
  const str = await response.text();

  const $ = cheerioLoad(str);

  // 1. 学号
  const src = $('img.media-object').attr('src') || '';
  const xhId =
    new URL(src, 'https://dummy.base').searchParams.get('xh_id') ?? '';

  // 2. 姓名
  const nameText = $('h4.media-heading').text();
  const name = nameText
    .replace(/\s*学生.*/, '')
    .replace(/\u00a0/g, ' ') // &nbsp;
    .trim();

  // 3. 学院 + 班级
  const pText = $('.media-body > p').first().text().trim();
  const college = pText.replace(/\s+\d{4}.*/, '').trim();
  return {
    studentID: studentId ?? xhId,
    name: name,
    college: college,
  };
};

const getScoreList = async ({
  year = -1,
  semester = -1,
  funcId = 'N305005',
  validate,
}: {
  year?: number;
  semester?: number;
  funcId?: string;
  validate: string;
}) => {
  const query = new URLSearchParams({
    doType: 'query',
    gnmkdm: funcId,
  });
  const body = new URLSearchParams({
    validate,
    xnm: year !== -1 ? `${year}` : '',
    xqm: semester !== -1 ? `${semester}` : '',
    'queryModel.showCount': '150',
  });
  const response = await requestPost({
    url: `https://jwgl.whu.edu.cn/cjcx/cjcx_cxXsgrcj.html?${query}`,
    body: body.toString(),
    headers: {
      Host: 'jwgl.whu.edu.cn',
    },
    contentType: 'application/x-www-form-urlencoded',
  });
  const rawStr = await response.text();
  const str = rawStr.replaceAll(' ', '');
  // A full score history runs past the 16KB buffer xlog formats into, and
  // an oversized entry is dropped whole. Split it like the request layer.
  logChunked('i', 'response', str, 'getScoreList');
  const json = JSON.parse(str);
  return parseResponse({json});
};

export {getScoreList, getUserInfo};
