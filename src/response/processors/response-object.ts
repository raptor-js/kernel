// biome-ignore-all lint/suspicious/noExplicitAny: middleware may return a value of any type

import type Context from "../../context.ts";
import type { ResponseProcessor } from "../../interfaces/response-processor.ts";

/**
 * The Response processor for HTTP responses.
 */
export default class ResponseObjectProcessor implements ResponseProcessor {
  /**
   * Handle the response and process if found.
   *
   * @param response Any HTTP response object.
   * @param context The current HTTP context.
   *
   * @returns An HTTP response.
   */
  public process(response: any, _context: Context): Response {
    return response;
  }
}
