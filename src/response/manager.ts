// biome-ignore-all lint/suspicious/noExplicitAny: middleware may return a value of any type

import type Context from "../context.ts";
import { ResponseBodyType } from "./body-type.ts";
import ServerError from "../error/server-error.ts";
import ErrorProcessor from "./processors/error.ts";
import StringProcessor from "./processors/string.ts";
import ObjectProcessor from "./processors/object.ts";
import NotAcceptable from "../error/not-acceptable.ts";
import ContentNegotiator from "./content-negotiator.ts";
import ResponseObjectProcessor from "./processors/response-object.ts";
import type { ResponseManager } from "../interfaces/response-manager.ts";
import type { ResponseProcessor } from "../interfaces/response-processor.ts";

/**
 * The response manager takes the response body and processes it
 * into a valid HTTP response.
 */
export default class DefaultResponseManager implements ResponseManager {
  /**
   * All available response processors.
   */
  private processors: Map<string, ResponseProcessor> = new Map();

  /**
   * Whether strict content negotiation is enabled.
   */
  private strictContentNegotiation: boolean;

  /**
   * Initialise the HTTP processor.
   *
   * @param strictContentNegotiation Whether to enable strict content negotiation.
   */
  constructor(strictContentNegotiation: boolean = true) {
    this.strictContentNegotiation = strictContentNegotiation;

    this.register("response", new ResponseObjectProcessor());
    this.register("error", new ErrorProcessor());
    this.register("string", new StringProcessor());
    this.register("object", new ObjectProcessor());
  }

  /**
   * Add a new processor to the response manager.
   *
   * @param type The type of request body the processor supports.
   * @param processor An implementation of the processor interface.
   *
   * @returns void
   */
  public register(type: string, processor: ResponseProcessor): void {
    this.processors.set(type, processor);
  }

  /**
   * Process a body into a valid Response object.
   *
   * @param body A body value to process.
   * @param context The current HTTP context.
   *
   * @returns A valid HTTP response object.
   */
  public async process(body: any, context: Context): Promise<Response> {
    return await this.processNow(body, context);
  }

  /**
   * Process a body into a valid Response object, staying synchronous when its
   * processor is. The kernel calls this when process() has not been replaced.
   *
   * @param body A body value to process.
   * @param context The current HTTP context.
   *
   * @returns A valid HTTP response object, or a promise of one.
   */
  public processNow(body: any, context: Context): Response | Promise<Response> {
    const typeKey = this.getTypeKey(body);

    const processor = this.processors.get(typeKey);

    if (!processor) {
      throw new ServerError(
        `No processor was found for this type key: ${typeKey}.`,
      );
    }

    const response = processor.process(body, context);

    if (response instanceof Promise) {
      return response.then((resolved) =>
        this.checkAcceptable(resolved, context),
      );
    }

    return this.checkAcceptable(response, context);
  }

  /**
   * Refuse a response the request does not accept, when negotiation is strict.
   *
   * @param response The processed response.
   * @param context The current HTTP context.
   *
   * @returns The response, when it is acceptable.
   */
  private checkAcceptable(response: Response, context: Context): Response {
    if (!this.strictContentNegotiation) {
      return response;
    }

    const contentType = response.headers.get("content-type");

    if (
      contentType !== null &&
      !ContentNegotiator.isAcceptable(context.request, contentType)
    ) {
      throw new NotAcceptable(
        `Cannot produce ${contentType} as requested in Accept header`,
      );
    }

    return response;
  }

  /**
   * Determine the type key for a given body.
   *
   * @param body The response body to check against.
   *
   * @returns A string key representing the body type.
   */
  protected getTypeKey(body: any): string {
    if (typeof body === "string") {
      return ResponseBodyType.STRING;
    }

    if (body instanceof Response) {
      return ResponseBodyType.RESPONSE;
    }

    if (body instanceof Error) {
      return ResponseBodyType.ERROR;
    }

    if (typeof body === "object" && body !== null) {
      return ResponseBodyType.OBJECT;
    }

    return "unknown";
  }
}
