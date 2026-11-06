import { forwardToReal, REQUEST_MEMBERS } from "../../lightweight.ts";

/**
 * The parts of Node's incoming request a lightweight request reads.
 */
export interface LightweightSource {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

const source = Symbol("source");
const address = Symbol("address");
const makeBody = Symbol("body");
const headerCache = Symbol("headers");
const realRequest = Symbol("request");

/**
 * The fields a lightweight request carries until it has to become real.
 */
interface Lightweight {
  [source]: LightweightSource;
  [address]: string;
  [makeBody]?: () => ReadableStream<Uint8Array> | undefined;
  [headerCache]?: Headers;
  [realRequest]?: Request;
}

/**
 * Read a lightweight request's headers, building them the first time they are asked for.
 *
 * @param request The lightweight request.
 *
 * @returns The request headers.
 */
const getHeaders = (request: Lightweight): Headers => {
  request[headerCache] ??= new Headers(request[source].headers as HeadersInit);

  return request[headerCache];
};

/**
 * Build the real request a lightweight one stands in for, once.
 *
 * @param request The lightweight request.
 *
 * @returns The real request.
 */
const toRealRequest = (request: Lightweight): Request => {
  request[realRequest] ??= new Request(request[address], {
    method: request[source].method,
    headers: getHeaders(request),
    body: request[makeBody]?.(),
    duplex: "half",
  } as RequestInit);

  return request[realRequest];
};

const prototype = forwardToReal(
  Object.create(Request.prototype, {
    method: {
      get(this: Lightweight) {
        return this[source].method ?? "GET";
      },
    },
    url: {
      get(this: Lightweight) {
        return this[address];
      },
    },
    headers: {
      get(this: Lightweight) {
        return getHeaders(this);
      },
    },
  }),
  Request.prototype,
  REQUEST_MEMBERS,
  (standIn) => toRealRequest(standIn as Lightweight),
);

/**
 * Create a request that answers its method, URL and headers without building
 * a real one, which it does the first time anything else is asked of it.
 *
 * It is an instance of Request for every check made in JavaScript, but the
 * platform's own checks see through it: fetch() and new Request() refuse it.
 *
 * @param nodeRequest Node's incoming request.
 * @param url The full request URL.
 * @param body Makes the body stream, for a request that has one.
 *
 * @returns A lightweight request.
 */
export const createLightweightRequest = (
  nodeRequest: LightweightSource,
  url: string,
  body?: () => ReadableStream<Uint8Array> | undefined,
): Request => {
  const request = Object.create(prototype) as Lightweight;

  request[source] = nodeRequest;
  request[address] = url;
  request[makeBody] = body;

  return request as unknown as Request;
};
