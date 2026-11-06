// biome-ignore-all lint/suspicious/noExplicitAny: middleware may return a value of any type

import type Context from "../context.ts";
import type { ResponseProcessor } from "./response-processor.ts";

/**
 * Manages the processing of response bodies into HTTP Response objects.
 */
export interface ResponseManager {
  /**
   * Process a body into a valid Response object.
   *
   * @param body A body value to process.
   * @param context The current HTTP context.
   *
   * @returns A valid HTTP response object.
   */
  process(body: any, context: Context): Response | Promise<Response>;

  /**
   * Register a new processor to the response manager.
   *
   * @param type The type of request body the processor supports.
   * @param processor An implementation of the response processor interface.
   *
   * @returns void
   */
  register(type: string, processor: ResponseProcessor): void;
}
