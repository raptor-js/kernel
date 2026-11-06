/**
 * The text each built-in response was made from, keyed by the response itself.
 *
 * A server adapter can write this text straight to the socket instead of
 * reading the response's body stream back, which is most of the cost of a
 * small response. Responses made any other way are simply not in here.
 */
const rawBodies = new WeakMap<Response, string>();

/**
 * Create a response from text, remembering the text for the server adapter.
 *
 * @param body The response body.
 * @param init The response status and headers.
 *
 * @returns A standard response.
 */
export const createResponse = (body: string, init: ResponseInit): Response => {
  const response = new Response(body, init);

  rawBodies.set(response, body);

  return response;
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

  return rawBodies.get(response);
};
