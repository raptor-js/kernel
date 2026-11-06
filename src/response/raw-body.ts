import { forwardToReal, RESPONSE_MEMBERS } from "../lightweight.ts";

/**
 * The key a built-in response keeps the text it was made from under.
 *
 * A server adapter can write this text straight to the socket instead of
 * reading the response's body stream back, which is most of the cost of a
 * small response. Responses made any other way do not have it. It sits on the
 * response itself rather than in a WeakMap, which costs every garbage
 * collection a little for each entry.
 */
const rawText = Symbol("raw text");

/**
 * A response that may carry the text it was made from.
 */
type WithRawText = Response & { [rawText]?: string };

/**
 * Whether built-in responses are lightweight stand-ins rather than real ones.
 */
let lightweight = false;

const fields = Symbol("fields");
const realResponse = Symbol("response");

/**
 * The fields a lightweight response carries until it has to become real.
 */
interface Lightweight {
  [fields]: {
    body: string | null;
    status: number;
    statusText: string;
    headers: Headers;
  };
  [realResponse]?: Response;
}

/**
 * Build the real response a lightweight one stands in for, once.
 *
 * @param response The lightweight response.
 *
 * @returns The real response.
 */
const toRealResponse = (response: Lightweight): Response => {
  const { body, status, statusText, headers } = response[fields];

  response[realResponse] ??= new Response(body, {
    status,
    statusText,
    headers,
  });

  return response[realResponse];
};

const prototype = forwardToReal(
  Object.create(Response.prototype, {
    status: {
      get(this: Lightweight) {
        return this[fields].status;
      },
    },
    statusText: {
      get(this: Lightweight) {
        return this[fields].statusText;
      },
    },
    ok: {
      get(this: Lightweight) {
        return this[fields].status >= 200 && this[fields].status < 300;
      },
    },
    headers: {
      get(this: Lightweight) {
        return this[fields].headers;
      },
    },
    // Answered without building the real response, so a check before sending stays free.
    bodyUsed: {
      get(this: Lightweight) {
        return this[realResponse]?.bodyUsed ?? false;
      },
    },
  }),
  Response.prototype,
  RESPONSE_MEMBERS,
  (standIn) => toRealResponse(standIn as Lightweight),
);

/**
 * Make built-in responses lightweight stand-ins for the rest of the process.
 *
 * Only a server adapter that writes their text itself should turn this on.
 *
 * @returns void
 */
export const useLightweightResponses = (): void => {
  lightweight = true;
};

/**
 * Create a response from text, remembering the text for the server adapter.
 *
 * @param body The response body.
 * @param init The response status and headers.
 *
 * @returns A standard response, or a lightweight one when they are turned on.
 */
export const createResponse = (body: string, init: ResponseInit): Response => {
  // A lightweight response holds its own text in its fields.
  if (lightweight) {
    return createLightweightResponse(body, init);
  }

  const response: WithRawText = new Response(body, init);

  response[rawText] = body;

  return response;
};

/**
 * Create the empty response a request starts with, before any middleware has
 * answered it.
 *
 * @returns An empty standard response, or a lightweight one when they are turned on.
 */
export const createPlaceholder = (): Response => {
  if (!lightweight) {
    return new Response();
  }

  return createLightweightResponse(null, {});
};

/**
 * Create a response that answers its status and headers without building a
 * real one, which it does the first time its body is asked for.
 *
 * @param body The response body.
 * @param init The response status and headers.
 *
 * @returns A lightweight response.
 */
const createLightweightResponse = (
  body: string | null,
  init: ResponseInit,
): Response => {
  const response = Object.create(prototype) as Lightweight;

  response[fields] = {
    body,
    status: init.status ?? 200,
    statusText: init.statusText ?? "",
    headers: new Headers(init.headers),
  };

  return response as unknown as Response;
};

/**
 * Get the text a response was made from, while its body is still unread.
 *
 * @param response The response about to be sent.
 *
 * @returns The text, or undefined when the body has to be read as a stream.
 */
export const getRawBody = (response: Response): string | undefined => {
  if (response.bodyUsed) {
    return undefined;
  }

  const standIn = response as unknown as Partial<Lightweight>;

  // An empty lightweight response ends the way an empty real one would, with no body.
  if (standIn[fields] && !standIn[realResponse]) {
    return standIn[fields].body ?? "";
  }

  return (response as WithRawText)[rawText];
};
