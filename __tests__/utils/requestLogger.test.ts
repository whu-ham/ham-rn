import {requestGet, requestPost} from '@/utils/request/request';
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
    // Reassembling the chunks must reproduce the original header verbatim.
    const reassembled = headerLines
      .map(line => line.replace(/^.*?\(\d+\/\d+\): /, ''))
      .join('');
    expect(reassembled).toContain('x'.repeat(10 * 1024));
  });

  it('does not tag short header logs with a chunk counter', async () => {
    await requestGet({url: 'https://example.test/small', headers: {A: 'b'}});

    const headerLines = loggedLines().filter(line => line.includes('"a":"b"'));
    expect(headerLines).toHaveLength(1);
    expect(headerLines[0]).not.toContain('(1/1)');
  });
});
