import {installE2EFetch} from '@/e2e/courseFixture';
import {
  parseResponse,
  toNativeCoursePairing,
} from '@/business/education/course/parser';

/**
 * The e2e fixture is what lets the Maestro flows assert anything at all, so it
 * needs a test: a fixture that stopped producing ignored courses would leave
 * the ignored-course flow asserting nothing while still passing.
 *
 * These drive the same production code the flow does — real loginEducation is
 * not exercised here because it needs the CAS module, but the parse and the
 * native-boundary pairing are, which is where the ignored courses come from.
 */
describe('courseFixture', () => {
  beforeEach(() => {
    installE2EFetch();
  });

  // Mirrors the `json` shape parseResponse expects, so a fixture that drifted
  // from what the production parser needs fails the build rather than the flow.
  interface CourseListPayload {
    xsxx: {XH_ID?: string; XH?: string};
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
  }

  const fetchCourseList = async (): Promise<CourseListPayload> => {
    const response = await fetch(
      'https://jwgl.whu.edu.cn/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N2151',
      {method: 'POST', body: 'xnm=2026'},
    );
    return (await response.json()) as CourseListPayload;
  };

  it('answers the timetable endpoint', async () => {
    const json = await fetchCourseList();
    expect(json.kbList.length).toBeGreaterThan(0);
  });

  it('answers the CAS login endpoint with a success page', async () => {
    const response = await fetch(
      'https://cas.whu.edu.cn/authserver/login?service=x',
    );
    const text = await response.text();
    expect(text).toContain('教学管理信息服务平台');
  });

  it('leaves every other request to the original fetch', async () => {
    // A fixture that swallowed all traffic would silently break any screen
    // that still needs the network.
    //
    // The pristine-fetch cache has to be dropped first: it is keyed on
    // `globalThis` and survives `resetModules`, so without this the fixture
    // would delegate to whatever fetch happened to be installed when the first
    // test in this file ran, rather than to the passthrough below.
    delete (globalThis as {__e2ePristineFetch?: unknown}).__e2ePristineFetch;
    const original = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('passthrough'));
    installE2EFetch();
    const response = await fetch('https://example.com/other');
    expect(await response.text()).toBe('passthrough');
    original.mockRestore();
  });

  it('is idempotent, so a second install does not stack patches', async () => {
    installE2EFetch();
    installE2EFetch();
    const json = await fetchCourseList();
    expect(json.kbList.length).toBeGreaterThan(0);
  });

  it('produces both ignored courses the flow asserts on', async () => {
    const json = await fetchCourseList();
    const [map] = parseResponse({json, year: 2026, semester: 1});
    const [, , ignored] = toNativeCoursePairing(map);
    const names = ignored.map(course => course.name);
    expect(names).toContain('大学物理');
    expect(names).toContain('体育');
  });

  it('produces the two courses that did parse', async () => {
    const json = await fetchCourseList();
    const [map] = parseResponse({json, year: 2026, semester: 1});
    const [courses] = toNativeCoursePairing(map);
    const names = courses.map(course => course.name);
    expect(names).toContain('高等数学');
    expect(names).toContain('线性代数');
    expect(courses.map(c => c.name)).not.toContain('大学物理');
  });

  it('gives one ignored course an unreadable week string and the other none', async () => {
    // These are the two reason strings the notice can render, so the fixture
    // has to cover both or one branch goes untested by the flow.
    const json = await fetchCourseList();
    const [map] = parseResponse({json, year: 2026, semester: 1});
    const [, , ignored] = toNativeCoursePairing(map);
    const byName = new Map(ignored.map(c => [c.name, c.rawWeekText]));
    expect(byName.get('大学物理')).toBe('全周');
    expect(byName.get('体育')).toBe('');
  });
});

/**
 * Each scenario exists to put the import state machine into a different
 * branch, and the branches are distinguished only by what the canned server
 * returns. So the fixture's per-scenario shape is the thing that decides
 * whether a flow covers the branch it claims to: a `clean` payload that still
 * contained an unparseable week string would show the notice and the clean
 * flow would fail at its first assertion, while an `allFailed` payload with one
 * parseable course would silently commit a timetable the flow never checks.
 *
 * `installE2EFetch` installs once and then ignores later calls, so these
 * reinstall by resetting modules rather than by calling it again.
 */
describe('courseFixture scenarios', () => {
  interface CourseListPayload {
    xsxx: {XH_ID?: string; XH?: string};
    kbList: {kcmc?: string; zcd?: string}[];
  }

  const install = (
    scenario: 'partial' | 'clean' | 'allFailed' | 'empty' | 'loginFailed',
  ) => {
    jest.resetModules();

    const {installE2EFetch} = require('@/e2e/courseFixture');
    installE2EFetch(scenario);
  };

  const fetchCourseList = async (): Promise<CourseListPayload> => {
    const response = await fetch(
      'https://jwgl.whu.edu.cn/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N2151',
      {method: 'POST', body: 'xnm=2026'},
    );
    return (await response.json()) as CourseListPayload;
  };

  /** How many of the payload's courses the parser can place, and how many not. */
  const split = async () => {
    const json = await fetchCourseList();
    const [map] = parseResponse({json, year: 2026, semester: 1});
    const [courses, , ignored] = toNativeCoursePairing(map);
    return {parsed: courses.length, ignored: ignored.length};
  };

  it.each([
    ['clean', 2, 0],
    ['partial', 2, 20],
    ['allFailed', 0, 20],
    ['empty', 0, 0],
  ] as const)(
    'gives %s %i parseable and %i dropped courses',
    async (scenario, parsed, ignored) => {
      install(scenario);
      expect(await split()).toEqual({parsed, ignored});
    },
  );

  it('makes loginFailure answer CAS without the success marker', async () => {
    install('loginFailed');
    const response = await fetch(
      'https://cas.whu.edu.cn/authserver/login?service=x',
    );
    const text = await response.text();
    // `loginEducation` keys off this exact string, so a page that still
    // contained it would make the login-failure flow take the success branch.
    expect(text).not.toContain('教学管理信息服务平台');
  });

  it('makes every other scenario answer CAS with the success marker', async () => {
    install('clean');
    const response = await fetch(
      'https://cas.whu.edu.cn/authserver/login?service=x',
    );
    expect(await response.text()).toContain('教学管理信息服务平台');
  });
});
