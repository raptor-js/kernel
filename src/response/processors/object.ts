// biome-ignore-all lint/suspicious/noExplicitAny: middleware may return a value of any type

import type Context from "../../context.ts";
import { createResponse } from "../raw-body.ts";
import ServerError from "../../error/server-error.ts";
import type { ResponseProcessor } from "../../interfaces/response-processor.ts";

/**
 * The object processor for HTTP responses.
 */
export default class ObjectProcessor implements ResponseProcessor {
  /**
   * Handle the response and process objects if found.
   *
   * @param body Any HTTP response body.
   * @param context The current HTTP context.
   *
   * @returns An HTTP response.
   */
  public process(body: any, context: Context): Response {
    // Check if the response already has a content type set.
    const hasContentType = context.hasContentType();

    if (!hasContentType) {
      context.response.headers.set("content-type", "application/json");
    }

    try {
      const jsonBody = JSON.stringify(body);

      return createResponse(jsonBody, {
        status: context.response.status,
        headers: context.response.headers,
      });
    } catch (_error) {
      throw new ServerError(
        "There was a problem stringifying the JSON object.",
      );
    }
  }
}
