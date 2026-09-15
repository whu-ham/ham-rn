import {parseResponse} from './parser';
import {logChunked, requestPost} from '@/utils/request/request';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/15 18:10
 */

const getCourseList = async ({
  year,
  semester,
  funcId = 'N2151',
  validate = '',
}: {
  year: number;
  semester: number;
  funcId?: string;
  validate: string;
  ua?: string;
}) => {
  let requestSemester = semester;
  if (semester === 1) {
    requestSemester = 3;
  } else if (semester === 2) {
    requestSemester = 12;
  } else if (semester === 3) {
    requestSemester = 16;
  }
  const params = new URLSearchParams({
    gnmkdm: funcId,
  });
  const body = new URLSearchParams({
    validate: validate,
    xnm: `${year}`,
    xqm: `${requestSemester}`,
    xzlx: 'ck',
  });
  const response = await requestPost({
    url: `https://jwgl.whu.edu.cn/kbcx/xskbcx_cxXsgrkb.html?${params}`,
    body: body.toString(),
    contentType: 'application/x-www-form-urlencoded',
  });
  const rawStr = await response.text();
  const str = rawStr.replaceAll(' ', '');
  // A full-semester timetable runs past the 16KB buffer xlog formats into,
  // and an oversized entry is dropped whole — so this is where the response
  // used to go missing. Split it the way the request layer does.
  logChunked('i', 'response', str, 'getCourseList');
  const json = JSON.parse(str);
  return parseResponse({
    json,
    year,
    semester,
  });
};

export {getCourseList};
