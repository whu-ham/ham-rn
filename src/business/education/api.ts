import Cas from '../cas';
import Log from '@/modules/NativeLog';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/15 18:10
 */

export class CasLoginError extends Error {}

export class CasReAuthLoginError extends Error {
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }
}

const loginEducation = async () => {
  const res = await Cas.Api.fastLogin({
    service: 'https%3A%2F%2Fjwgl.whu.edu.cn%2Fsso%2Fjznewsixlogin',
  });
  const text = await res.text();
  Log.i('loginEducation', `response=${text}`);

  if (res.url.indexOf('ReAuth') !== -1) {
    throw new CasReAuthLoginError(res.url);
  } else if (text.indexOf('教学管理信息服务平台') === -1) {
    Log.e('EducationApi', `login education error! res.url=${res.url}`);
    const errReason = await parseJsError(res);
    const realReason = errReason.length
      ? errReason
      : '试试前往“我的->登录信息门户”重新登录信息门户呢~';
    throw new CasLoginError(`教务系统登录失败！${realReason}`);
  }
};

const parseJsError = async (response: Response): Promise<string> => {
  const html = await response.text();
  const regex = /var dlktsxx=".*";/;
  const match = regex.exec(html);
  return match ? match[0].replace('var dlktsxx="', '').replace('";', '') : '';
};

const generateValidate = () => {
  return (
    'sl' +
    Math.floor(Math.random() * 1e10).toString(36) +
    Date.now().toString(36)
  );
};

export {loginEducation, generateValidate};
