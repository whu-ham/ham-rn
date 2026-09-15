import {getCourseList} from '@/business/education/course/api';
import {getScoreList} from '@/business/education/score/api';
import {loginEducation} from '@/business/education';
import Log from '@/modules/NativeLog';
import Cas from '@/business/cas';

/**
 * The three education responses are the ones that actually go missing today.
 *
 * Course and score payloads are easily tens of KB, and the CAS login page is
 * HTML — all past the 16KB buffer xlog formats into, where an oversized entry
 * is dropped whole rather than truncated. They logged with a plain `Log.i`, so
 * a real response simply vanished from the device log. They now go through the
 * same chunking the request layer uses.
 *
 * These tests are the only coverage: the rest of the suite mocks
 * `getCourseList` / `getScoreList` outright, so the logging never runs there.
 */
jest.mock('@/business/cas', () => ({
  __esModule: true,
  default: {Api: {fastLogin: jest.fn()}},
}));

const mockLog = Log as jest.Mocked<typeof Log>;
const mockCas = Cas as jest.Mocked<typeof Cas>;

/**
 * The chunk bodies for one prefix, with the header removed.
 *
 * Lines are `<prefix> (n/total): <body>\n` once split, and `<prefix>: <body>\n`
 * when they fit in one entry. Strip whichever header is present and the
 * trailing newline; both are formatting, not content.
 *
 * The split regex is anchored to the prefix and to the `(n/total)` shape
 * because the bodies are JSON and full of colons — a loose `^[^:]*:` would eat
 * into the payload itself.
 */
const bodiesFor = (prefix: string): string[] =>
  mockLog.i.mock.calls
    .map(call => call[1])
    .filter(line => line.startsWith(prefix))
    .map(line => {
      // Escape the prefix: it carries '?' and '=' in the login case, so it
      // cannot go into a regex unescaped.
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const withoutHeader = line.replace(
        new RegExp(`^${escaped}(?: \\(\\d+\\/\\d+\\))?: `),
        '',
      );
      return withoutHeader.replace(/\n$/, '');
    });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCourseList response logging', () => {
  it('logs the response body under its own tag', async () => {
    const payload = JSON.stringify({xsxx: {}, kbList: []});
    global.fetch = jest.fn(() =>
      Promise.resolve(new Response(payload)),
    ) as jest.Mock;

    await getCourseList({year: 2026, semester: 1, validate: 'v'});

    const lines = mockLog.i.mock.calls.filter(
      call => call[0] === 'getCourseList',
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0][1]).toContain(payload);
  });

  it('splits a response larger than the budget instead of dropping it', async () => {
    // Comfortably past the 4KB chunk size and the 16KB xlog buffer.
    const big = JSON.stringify({
      xsxx: {},
      kbList: Array.from({length: 400}, (_: unknown, i: number) => ({
        kcmc: `课程-${i}`,
        jxbmc: `id-${i}`,
        zcd: '1-16周',
        cdmc: '教三 301',
        xm: '张老师',
      })),
    });
    expect(big.length).toBeGreaterThan(16 * 1024);
    global.fetch = jest.fn(() =>
      Promise.resolve(new Response(big)),
    ) as jest.Mock;

    await getCourseList({year: 2026, semester: 1, validate: 'v'});

    const lines = mockLog.i.mock.calls.filter(
      call => call[0] === 'getCourseList',
    );
    expect(lines.length).toBeGreaterThan(1);
    // No single entry may exceed the budget that keeps xlog from dropping it.
    lines.forEach(call => {
      expect(call[1].length).toBeLessThan(4 * 1024 + 256);
    });
    // And the pieces still reassemble into the original response.
    const reassembled = bodiesFor('response').join('');
    expect(reassembled).toContain(big);
  });
});

describe('getScoreList response logging', () => {
  it('splits a score history larger than the budget instead of dropping it', async () => {
    const big = JSON.stringify({
      items: Array.from({length: 400}, (_: unknown, i: number) => ({
        kcmc: `课程-${i}`,
        xm: '张老师',
        cj: '95',
        xf: '3',
      })),
    });
    expect(big.length).toBeGreaterThan(16 * 1024);
    global.fetch = jest.fn(() =>
      Promise.resolve(new Response(big)),
    ) as jest.Mock;

    await getScoreList({validate: 'v'});

    const lines = mockLog.i.mock.calls.filter(
      call => call[0] === 'getScoreList',
    );
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach(call => {
      expect(call[1].length).toBeLessThan(4 * 1024 + 256);
    });
    const reassembled = bodiesFor('response').join('');
    expect(reassembled).toContain(big);
  });
});

describe('loginEducation response logging', () => {
  it('splits the login page instead of dropping it, keeping the url', async () => {
    // A real CAS page is HTML well past the budget; the url must survive too,
    // since it is how a ReAuth redirect is diagnosed.
    const html = `<html><body>${'x'.repeat(40 * 1024)}</body></html>`;
    const url = 'https://cas.whu.edu.cn/authserver/login?service=x';
    // The header is "url=<url> response (n/total): ", so the prefix passed to
    // bodiesFor has to be the whole thing up to the counter.
    const prefix = `url=${url} response`;
    global.fetch = jest.fn(() =>
      Promise.resolve(new Response(html, {status: 200})),
    ) as jest.Mock;
    (mockCas.Api.fastLogin as jest.Mock).mockResolvedValue({
      url,
      text: () => Promise.resolve(html),
    });

    await expect(loginEducation()).rejects.toThrow();

    const lines = mockLog.i.mock.calls.filter(
      call => call[0] === 'loginEducation',
    );
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach(call => {
      expect(call[1].length).toBeLessThan(4 * 1024 + 256);
      // The url is short, so it is repeated on every chunk rather than split.
      expect(call[1]).toContain('https://cas.whu.edu.cn/authserver/login');
    });
    const reassembled = bodiesFor(prefix).join('');
    expect(reassembled).toContain(html);
  });
});
