import Log from '@/modules/NativeLog';

export const ua =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

const commonHeader: {[key: string]: string} = {
  'User-Agent': ua,
};

const TAG = 'Request';

/**
 * xlog formats every entry into a 16KB stack buffer and drops the entry
 * outright once it no longer fits (see the `len < 16 * 1024` assertion in
 * mars/xlog/src/formater.cc, confirmed against the linked mars framework), so
 * a long body has to be split by the caller rather than handed over whole.
 * 4KB keeps each chunk well clear of that guard and still leaves room for the
 * time/tag/file/function prefix xlog prepends to every line.
 */
const CHUNK_SIZE = 4 * 1024;

/**
 * Splits on a line boundary where one is available.
 *
 * Slicing at a fixed offset is simpler and stays inside the budget, but it
 * cuts through whatever happens to straddle the 4KB mark — mid-URL, mid-token,
 * mid-JSON-string. Reading the pieces back is guesswork, and nothing marks
 * where the break was. So prefer the last newline inside the window and only
 * fall back to a hard cut for a single line longer than the whole budget,
 * which cannot be broken any other way.
 */
const chunk = (text: string): string[] => {
  if (text.length === 0) {
    return [''];
  }
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    const window = text.slice(start, start + CHUNK_SIZE);
    if (start + window.length < text.length) {
      // More text follows, so try to end this chunk where a line ends.
      const lastBreak = window.lastIndexOf('\n');
      if (lastBreak !== -1) {
        parts.push(window.slice(0, lastBreak + 1));
        start += lastBreak + 1;
        continue;
      }
    }
    parts.push(window);
    start += window.length;
  }
  return parts;
};

/**
 * Writes a long body as several log entries, each ending in a newline.
 *
 * Two things are going on, and they are separate:
 *
 *   - `chunk` cuts the text into pieces that fit xlog's buffer, preferring an
 *     existing line boundary so a line is not split in half. It is lossless:
 *     `parts.join('')` reproduces the input exactly.
 *   - This appends the newline that makes each piece its own line in the log.
 *     A chunk that already ends at a line boundary keeps its single newline
 *     rather than gaining a blank one.
 *
 * The newline is added here rather than in `chunk` so the splitter stays a pure
 * operation on the text and the formatting lives where the log line is built.
 *
 * `tag` defaults to this module's own; callers logging under their own tag pass
 * it so the pieces reassemble under the same one.
 */
const logChunked = (
  level: 'i' | 'e',
  prefix: string,
  body: string,
  tag: string = TAG,
): void => {
  const parts = chunk(body);
  parts.forEach((part, index) => {
    const counter = parts.length > 1 ? ` (${index + 1}/${parts.length})` : '';
    const terminator = part.endsWith('\n') ? '' : '\n';
    Log[level](tag, `${prefix}${counter}: ${part}${terminator}`);
  });
};

const stringifyHeaders = (
  headers?: [string, string][] | Record<string, string> | Headers,
): string => {
  if (!headers) {
    return '{}';
  }
  // React Native types this as HeadersInit_ (a record, a Headers instance or
  // an array of tuples); normalising through Headers gives one code path.
  return JSON.stringify(Object.fromEntries(new Headers(headers)));
};

const describeUrl = (url: string | URL | globalThis.Request): string => {
  if (typeof url === 'string') {
    return url;
  }
  if (url instanceof URL) {
    return url.href;
  }
  return url.url;
};

const send = async (
  method: 'GET' | 'POST',
  url: string | URL | globalThis.Request,
  init: {
    headers?: [string, string][] | Record<string, string> | Headers;
    body?: BodyInit_;
  },
): Promise<Response> => {
  const target = describeUrl(url);
  const startedAt = Date.now();
  logChunked(
    'i',
    `${method} ${target}`,
    `headers=${stringifyHeaders(init.headers)}`,
  );
  try {
    const response = await fetch(url, {...init, method});
    Log.i(
      TAG,
      `${method} ${target} - ${response.status} in ${Date.now() - startedAt}ms`,
    );
    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    Log.e(
      TAG,
      `${method} ${target} - ${reason} in ${Date.now() - startedAt}ms`,
    );
    throw error;
  }
};

const requestGet = ({
  url,
  headers,
}: {
  url: string | URL | globalThis.Request;
  headers?: {[key: string]: string};
}): Promise<Response> => {
  return send('GET', url, {
    headers: {
      ...commonHeader,
      ...headers,
    },
  });
};

const requestPost = ({
  url,
  body,
  headers,
  contentType,
}: {
  url: string | URL | globalThis.Request;
  body: BodyInit_;
  headers?: {[key: string]: string};
  contentType?: 'application/json' | 'application/x-www-form-urlencoded';
}): Promise<Response> => {
  let requestHeader: {[key: string]: string} = {
    ...commonHeader,
    ...headers,
  };
  if (contentType) {
    requestHeader['Content-Type'] = contentType;
  }
  return send('POST', url, {
    headers: requestHeader,
    body: body,
  });
};

export {requestGet, requestPost, chunk, logChunked};
