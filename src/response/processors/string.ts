// biome-ignore-all lint/suspicious/noExplicitAny: middleware may return a value of any type

import type Context from "../../context.ts";
import type { ResponseProcessor } from "../../interfaces/response-processor.ts";

export const HTML_REGEX = /<[a-z/][\s\S]*>/i;

/**
 * The HTML processor for HTTP responses.
 */
export default class StringProcessor implements ResponseProcessor {
  /**
   * Handle the response and process HTML if found.
   *
   * @param body Any HTTP response body.
   * @param context The current HTTP context.
   *
   * @returns An HTTP response.
   */
  public process(body: any, context: Context): Response {
    // Check if the response already has a content type set.
    const hasContentType = context.hasContentType();

    // If the middleware returns a string and contains HTML, process HTML.
    const isHtml = HTML_REGEX.test(body);

    if (isHtml && !hasContentType) {
      context.response.headers.set("content-type", "text/html");
    }

    if (!isHtml && !hasContentType) {
      context.response.headers.set("content-type", "text/plain");
    }

    return new Response(body, {
      status: context.response.status,
      headers: context.response.headers,
    });
  }
}
