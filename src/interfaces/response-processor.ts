// biome-ignore-all lint/suspicious/noExplicitAny: middleware may return a value of any type

import type Context from "../context.ts";

/**
 * An HTTP response body processor.
 */
export interface ResponseProcessor {
  /**
   * Handle the response body and process.
   *
   * @param body Any HTTP response body.
   * @param context The current HTTP context.
   * @returns An HTTP response or null.
   */
  process(body: any, context: Context): Promise<Response> | Response;
}
