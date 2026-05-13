export const ua =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

const commonHeader: {[key: string]: string} = {
  'User-Agent': ua,
};

const requestGet = ({
  url,
  headers,
}: {
  url: string | URL | globalThis.Request;
  headers?: {[key: string]: string};
}): Promise<Response> => {
  return fetch(url, {
    method: 'GET',
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
  body: BodyInit;
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
  return fetch(url, {
    method: 'POST',
    headers: requestHeader,
    body: body,
  });
};

export {requestGet, requestPost};
