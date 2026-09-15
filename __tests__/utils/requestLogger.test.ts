import {chunk, requestGet, requestPost} from '@/utils/request/request';
import Log from '@/modules/NativeLog';

const mockLog = Log as jest.Mocked<typeof Log>;

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(() =>
    Promise.resolve(new Response('ok')),
  ) as jest.Mock;
});

const loggedLines = () => mockLog.i.mock.calls.map(call => call.join(' '));

/**
 * Strips the "Request <method> <url> (n/total): " prefix and the trailing
 * newline that makes each chunk its own log line, leaving the chunk's content.
 */
const headerBodies = (lines: string[]): string[] =>
  lines.map(line => line.replace(/^.*?\(\d+\/\d+\): /, '').replace(/\n$/, ''));

describe('request logging', () => {
  it('logs the method, url and headers before issuing the request', async () => {
    await requestGet({
      url: 'https://example.test/path',
      headers: {Cookie: 'ticket=abc'},
    });

    expect(global.fetch).toHaveBeenCalled();
    const lines = loggedLines();
    expect(
      lines.some(line => line.includes('GET https://example.test/path')),
    ).toBe(true);
    // `Headers` lower-cases every name on the way in, so assert on the
    // normalised name rather than the one passed by the caller.
    expect(lines.some(line => line.includes('"cookie":"ticket=abc"'))).toBe(
      true,
    );
  });

  it('logs the status and elapsed time on completion', async () => {
    await requestPost({url: 'https://example.test/post', body: 'a=1'});

    expect(
      loggedLines().some(
        line => line.includes('POST') && /20\d in \d+ms/.test(line),
      ),
    ).toBe(true);
  });

  it('logs the failure and rethrows when the request rejects', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(requestGet({url: 'https://example.test/x'})).rejects.toThrow(
      'offline',
    );
    await flushPromises();

    expect(
      mockLog.e.mock.calls.some(
        call =>
          call[1].includes('offline') &&
          call[1].includes('https://example.test/x'),
      ),
    ).toBe(true);
  });

  it('splits oversized header logs into 4KB chunks instead of one line', async () => {
    const huge = 'x'.repeat(10 * 1024);
    await requestGet({
      url: 'https://example.test/big',
      headers: {'X-Big': huge},
    });

    // Lines look like: "GET <url> (n/total): <chunk>". Only the first chunk
    // carries the "headers=" literal, so match on the counter instead.
    const headerLines = loggedLines().filter(line =>
      /^Request GET https:\/\/example\.test\/big \(\d+\/\d+\): /.test(line),
    );
    expect(headerLines.length).toBeGreaterThan(1);
    // Every chunk stays inside the 4KB budget that keeps xlog from dropping
    // the entry, and each one is tagged with its position.
    headerLines.forEach((line, index) => {
      expect(line.length).toBeLessThan(4 * 1024 + 256);
      expect(line).toContain(`(${index + 1}/${headerLines.length})`);
    });
    // Reassembling the chunks must reproduce the original header. Each chunk
    // is terminated with a newline so it stands as its own line in the log;
    // that terminator is formatting, not content, so drop it before comparing.
    const reassembled = headerBodies(headerLines).join('');
    expect(reassembled).toContain('x'.repeat(10 * 1024));
  });

  // Headers are the only thing `logChunked` is ever handed, and an HTTP header
  // value cannot contain CR/LF — so this is a single long line with no newline
  // to break on. Worth pinning because it is the shape every real call has:
  // the chunker has to fall back to a hard cut and still lose nothing.
  it('splits a single line longer than the whole budget without losing any', async () => {
    const oneLongLine = 'y'.repeat(10 * 1024);
    await requestGet({
      url: 'https://example.test/one-line',
      headers: {'X-Long': oneLongLine},
    });

    const headerLines = loggedLines().filter(line =>
      /^Request GET https:\/\/example\.test\/one-line \(\d+\/\d+\): /.test(
        line,
      ),
    );
    expect(headerLines.length).toBeGreaterThan(1);
    headerLines.forEach(line => {
      expect(line.length).toBeLessThan(4 * 1024 + 256);
    });
    const reassembled = headerBodies(headerLines).join('');
    expect(reassembled).toContain(oneLongLine);
  });

  it('terminates each chunk with a newline so it stands as its own line', async () => {
    // A chunk is up to 4KB and would otherwise run into the next chunk's text
    // in the log. The newline is what keeps the pieces readable as separate
    // lines; it is added when the line is built, not stored in the chunk.
    await requestGet({
      url: 'https://example.test/terminated',
      headers: {'X-Big': 'x'.repeat(10 * 1024)},
    });

    const headerLines = loggedLines().filter(line =>
      /^Request GET https:\/\/example\.test\/terminated \(\d+\/\d+\): /.test(
        line,
      ),
    );
    expect(headerLines.length).toBeGreaterThan(1);
    headerLines.forEach(line => {
      expect(line.endsWith('\n')).toBe(true);
    });
  });

  it('does not tag short header logs with a chunk counter', async () => {
    await requestGet({url: 'https://example.test/small', headers: {A: 'b'}});

    const headerLines = loggedLines().filter(line => line.includes('"a":"b"'));
    expect(headerLines).toHaveLength(1);
    expect(headerLines[0]).not.toContain('(1/1)');
  });
});

/**
 * Direct coverage of the chunker.
 *
 * These cases are unreachable through `requestGet`: the only body handed to it
 * is serialised headers, and an HTTP header value cannot contain CR/LF, so it
 * is always one long line with no newline to break on. The line-boundary path
 * therefore only exists for a caller that logs multi-line text, and has to be
 * pinned here rather than through a request.
 */
describe('chunk', () => {
  const BUDGET = 4 * 1024;

  it('returns a single empty chunk for empty input', () => {
    expect(chunk('')).toEqual(['']);
  });

  it('leaves short text in one piece', () => {
    expect(chunk('hello')).toEqual(['hello']);
  });

  it('reassembles to the original, whatever the shape', () => {
    const shapes = [
      Array.from({length: 800}, (_, i) => `line-${i}-${'a'.repeat(20)}`).join(
        '\n',
      ),
      'y'.repeat(10 * 1024),
      'z'.repeat(9000) + '\n' + 'q'.repeat(9000),
      '\nabc',
      'abc\n',
      'x'.repeat(BUDGET),
    ];
    shapes.forEach(shape => {
      expect(chunk(shape).join('')).toBe(shape);
    });
  });

  it('never exceeds the 4KB budget', () => {
    const shapes = [
      Array.from({length: 800}, (_, i) => `line-${i}-${'a'.repeat(20)}`).join(
        '\n',
      ),
      'y'.repeat(10 * 1024),
      'z'.repeat(9000) + '\n' + 'q'.repeat(9000),
    ];
    shapes.forEach(shape => {
      chunk(shape).forEach(part => {
        expect(part.length).toBeLessThanOrEqual(BUDGET);
      });
    });
  });

  it('ends every chunk but the last on a newline when the text has lines', () => {
    // The point of the change: a fixed-offset slice cuts mid-token and leaves
    // no marker where the break was. Breaking at a newline keeps each entry a
    // whole number of lines.
    const text = Array.from(
      {length: 800},
      (_, i) => `line-${i}-${'a'.repeat(20)}`,
    ).join('\n');
    const parts = chunk(text);
    expect(parts.length).toBeGreaterThan(1);
    parts.slice(0, -1).forEach(part => {
      expect(part.endsWith('\n')).toBe(true);
    });
  });

  it('falls back to a hard cut for one line longer than the budget', () => {
    // No newline to break on, so a cut is the only option — the requirement is
    // that it still terminates and keeps the tail.
    const oneLine = 'y'.repeat(10 * 1024);
    const parts = chunk(oneLine);
    expect(parts.length).toBe(3);
    expect(parts.join('')).toBe(oneLine);
  });
});
