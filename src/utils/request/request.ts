import Log from '@/modules/NativeLog';

export const ua =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

const commonHeader: {[key: string]: string} = {
  'User-Agent': ua,
};

const TAG = 'Request';

/**
 * xlog formats every entry into a 16KB stack buffer and drops the entry
 * outright once less than 5KB is left in it (see log_formater in
 * mars/xlog/src/formater.cc), so a long line has to be split by the caller
 * rather than handed over whole. 4KB keeps each chunk well clear of that 5KB
 * guard and still leaves room for the time/tag/file/function prefix that xlog
 * prepends to every line.
 */
const CHUNK_SIZE = 4 * 1024;

const chunk = (text: string): string[] => {
  if (text.length === 0) {
    return [''];
  }
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    parts.push(text.slice(i, i + CHUNK_SIZE));
  }
  return parts;
};

/** Writes a line in xlog-sized chunks, suffixing each one with (n/total). */
const logChunked = (level: 'i' | 'e', prefix: string, body: string): void => {
  const parts = chunk(body);
  parts.forEach((part, index) => {
    const counter = parts.length > 1 ? ` (${index + 1}/${parts.length})` : '';
    Log[level](TAG, `${prefix}${counter}: ${part}`);
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

export {requestGet, requestPost};
