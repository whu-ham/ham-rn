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
 * The courses the parser will drop, and why.
 *
 * `大学物理` carries a week string the parser does not understand and `体育`
 * carries none at all, so the notice has to render both reason strings. The
 * remaining rows exist to make the list long enough to scroll: a notice is only
 * correct if the button stays on screen whether the list is two rows or twenty.
 */
const ignoredCourses: KbItem[] = [
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
  ...Array.from({length: 18}, (_, index): KbItem => {
    const n = String(index).padStart(2, '0');
    return {
      kcmc: `选修${n}`,
      jxbmc: `ELEC${n}`,
      xqj: `${(index % 7) + 1}`,
      cdmc: '教三 301',
      jcs: '1-2',
      xm: '张老师',
      zcmc: '主讲',
      kcxz: '通识选修',
      xf: '2',
      zcd: UNPARSEABLE,
    };
  }),
];

/**
 * Two parses succeed, so the notice reports a partial import rather than a total
 * failure — the case where the button still has a timetable to commit.
 */
const parsedCourses: KbItem[] = [
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
];

const kbList: KbItem[] = [...parsedCourses, ...ignoredCourses];

/** A CAS login success page, enough to satisfy `loginEducation`. */
const loginSuccessPage = '<html><body>教学管理信息服务平台</body></html>';

/**
 * A CAS page that is *not* a success page, so `loginEducation` throws
 * `CasLoginError` — the "session could not be established" branch.
 */
const loginFailurePage = '<html><body>请输入用户名密码</body></html>';

/**
 * The timetable payloads, one per branch of the import state machine.
 *
 * `installE2EFetch` picks one by name, because the branches are distinguished
 * only by what the server returns: an e2e flow cannot reach them any other way
 * (there is no way to inject a parse failure from outside).
 */
export type CourseScenario = 'partial' | 'clean' | 'allFailed' | 'empty';

const scenarioKbList: Record<CourseScenario, KbItem[]> = {
  // Two parse, twenty do not: the notice appears and there is still a
  // timetable to commit.
  partial: kbList,
  // Everything parses, so the import completes with no notice at all.
  clean: parsedCourses,
  // Nothing parses, so the notice appears and the button reports an error
  // rather than committing an empty timetable.
  allFailed: ignoredCourses,
  // No courses at all, so the import completes with no notice.
  empty: [],
};

/** The payload `getCourseList` would have parsed off the wire. */
const courseListResponse = (scenario: CourseScenario) => ({
  xsxx: {XH: '2021302111001'},
  kbList: scenarioKbList[scenario],
});

/** True for the scenarios whose CAS login must fail. */
const failsLogin = (scenario: string): boolean =>
  scenario.indexOf('loginFailed') !== -1;

/**
 * Matches on URL substring and returns a 200 Response, so it can stand in for
 * either the CAS login page or the timetable endpoint.
 *
 * The scenario decides what each endpoint answers. A `loginFailed*` scenario
 * returns a CAS page without the success marker, which makes the real
 * `loginEducation` throw — the login failure has to come from inside the
 * response, because nothing outside the bundle can induce one in a Release
 * build.
 */
const fakeFetch = (
  input: string,
  scenario: string,
): Promise<Response> | undefined => {
  if (input.indexOf('cas.whu.edu.cn/authserver/login') !== -1) {
    return Promise.resolve(
      new Response(failsLogin(scenario) ? loginFailurePage : loginSuccessPage, {
        status: 200,
        headers: {'Content-Type': 'text/html'},
      }),
    );
  }
  if (input.indexOf('xskbcx_cxXsgrkb') !== -1) {
    return Promise.resolve(
      new Response(
        JSON.stringify(courseListResponse(scenario as CourseScenario)),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      ),
    );
  }
  return undefined;
};

/**
 * The pristine `fetch`, captured before any patch. Held on `globalThis` rather
 * than in a module-level closure because the module is re-evaluated whenever
 * `jest.resetModules()` runs, and a closure would then capture an already
 * patched fetch and chain another patch on top of it.
 */
const pristineFetch = (): typeof global.fetch => {
  const holder = globalThis as {
    __e2ePristineFetch?: typeof global.fetch;
  };
  holder.__e2ePristineFetch ??= global.fetch;
  return holder.__e2ePristineFetch;
};

/**
 * Installs the fixture over `global.fetch` for one scenario.
 *
 * The scenario is fixed at install time, because each e2e entry installs
 * exactly one and never changes it — a `RNFetchCourseViewE2EClean` entry always
 * drives the clean-import branch.
 *
 * Re-installing the *same* scenario is a no-op, which is what keeps a second
 * install from chaining another patch over the first. Re-installing a
 * *different* scenario replaces it: two entries cannot share one process
 * (each is its own AppRegistry root), so a second, different scenario means
 * the caller asked for a branch it is not going to get. Silently keeping the
 * first would have every flow testing one branch while reporting success for
 * several, which is the exact failure this fixture exists to prevent.
 */
const installE2EFetch = (
  scenario: CourseScenario | 'loginFailed' = 'partial',
) => {
  const current = global.fetch as {
    __e2eScenario?: string;
  };
  if (current.__e2eScenario === scenario) {
    return;
  }
  const original = pristineFetch();
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
    return fakeFetch(url, scenario) ?? original(input as never, init);
  }) as typeof global.fetch;
  (patched as {__e2eScenario?: string}).__e2eScenario = scenario;
  global.fetch = patched;
};

export {installE2EFetch};
