/**
 * A canned education-system response for the end-to-end flows.
 *
 * The e2e suite has no credentials for cas.whu.edu.cn and no way to fabricate
 * a CAS session, so it cannot drive the real fetch. Instead it drives the real
 * parsing and confirmation code with a payload shaped exactly like the one
 * `xskbcx_cxXsgrkb.html` returns, including week strings the parser cannot
 * read — which is the case the ignored-course notice exists for.
 *
 * This module is imported only by the e2e entry point, so it is dead weight in
 * a production bundle only if that entry is ever reached; Metros tree-shakes
 * the unreferenced export from the main entry.
 */

/** Week strings that parse: plain ranges. */
const PARSEABLE = '1-16周';

/** Week strings that do NOT parse, with their real-world causes. */
const UNPARSEABLE = '全周';
const MISSING = '';

interface KbItem {
  kcmc: string;
  jxbmc: string;
  xqj: string;
  cdmc: string;
  jcs: string;
  xm: string;
  zcmc: string;
  kcxz: string;
  xf: string;
  zcd: string;
}

/**
 * Two courses parse, two do not — one because the week string is a word the
 * parser does not understand, one because the system sent no schedule at all.
 * That exercises both reason strings the notice can render.
 */
const kbList: KbItem[] = [
  {
    kcmc: '高等数学',
    jxbmc: 'MATH001',
    xqj: '1',
    cdmc: '教三 301',
    jcs: '1-2',
    xm: '张老师',
    zcmc: '主讲',
    kcxz: '公共基础必修',
    xf: '4',
    zcd: PARSEABLE,
  },
  {
    kcmc: '线性代数',
    jxbmc: 'MATH002',
    xqj: '3',
    cdmc: '教三 302',
    jcs: '3-4',
    xm: '李老师',
    zcmc: '主讲',
    kcxz: '公共基础必修',
    xf: '3',
    zcd: PARSEABLE,
  },
  {
    kcmc: '大学物理',
    jxbmc: 'PHYS001',
    xqj: '5',
    cdmc: '教四 401',
    jcs: '5-6',
    xm: '王老师',
    zcmc: '主讲',
    kcxz: '公共基础必修',
    xf: '4',
    zcd: UNPARSEABLE,
  },
  {
    kcmc: '体育',
    jxbmc: 'PE001',
    xqj: '2',
    cdmc: '田径场',
    jcs: '7-8',
    xm: '赵老师',
    zcmc: '主讲',
    kcxz: '通识选修',
    xf: '1',
    zcd: MISSING,
  },
];

/** A CAS login success page, enough to satisfy `loginEducation`. */
const loginSuccessPage = '<html><body>教学管理信息服务平台</body></html>';

/** The payload `getCourseList` would have parsed off the wire. */
const courseListResponse = {
  xsxx: {XH: '2021302111001'},
  kbList,
};

/**
 * Matches on URL substring and returns a 200 Response, so it can stand in for
 * either the CAS login page or the timetable endpoint.
 */
const fakeFetch = (input: string): Promise<Response> | undefined => {
  if (input.indexOf('cas.whu.edu.cn/authserver/login') !== -1) {
    return Promise.resolve(
      new Response(loginSuccessPage, {
        status: 200,
        headers: {'Content-Type': 'text/html'},
      }),
    );
  }
  if (input.indexOf('xskbcx_cxXsgrkb') !== -1) {
    return Promise.resolve(
      new Response(JSON.stringify(courseListResponse), {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      }),
    );
  }
  return undefined;
};

/** Installs the fixture over `global.fetch`, once. */
const installE2EFetch = () => {
  const original = global.fetch;
  if ((global.fetch as {__e2e?: boolean}).__e2e) {
    return;
  }
  const patched = ((
    input: string | URL | globalThis.Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    return fakeFetch(url) ?? original(input as never, init);
  }) as typeof global.fetch;
  (patched as {__e2e?: boolean}).__e2e = true;
  global.fetch = patched;
};

export {installE2EFetch};
