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
