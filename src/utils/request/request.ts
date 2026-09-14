import Log from '@/modules/NativeLog';

export const ua =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

const commonHeader: {[key: string]: string} = {
  'User-Agent': ua,
};

const TAG = 'Request';

const describeUrl = (url: string | URL | globalThis.Request): string => {
  if (typeof url === 'string') {
    return url;
  }
  if (url instanceof URL) {
    return url.href;
  }
  return url.url;
};

/**
 * Only the method, url and outcome are logged. Headers and bodies are skipped
 * on purpose, since they carry CAS tickets, cookies and passwords.
 */
const send = async (
  method: 'GET' | 'POST',
  url: string | URL | globalThis.Request,
  init: RequestInit,
): Promise<Response> => {
  const target = describeUrl(url);
  const startedAt = Date.now();
  Log.i(TAG, `${method} ${target}`);
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
