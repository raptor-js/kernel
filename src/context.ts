import type {
  ConnInfo,
  Context as ContextInterface,
  HttpError,
} from "@raptor/types";

/**
 * The context definition.
 */
export default class Context implements ContextInterface {
  /**
   * The current HTTP request.
   */
  public request: Request;

  /**
   * The current HTTP response.
   */
  public response: Response;

  /**
   * An error caught by the system.
   */
  public error?: HttpError | Error;

  /**
   * The connection the request arrived on, where the adapter supplied one.
   */
  public readonly connection?: ConnInfo;

  /**
   * If the response has content type set.
   */
  private _hasContentType?: boolean;

  /**
   * Initialise an HTTP context.
   *
   * @constructor
   *
   * @param request The current HTTP request.
   * @param response The current HTTP response.
   * @param connection The connection the request arrived on, if known.
   */
  constructor(request: Request, response: Response, connection?: ConnInfo) {
    this.request = request;
    this.response = response;
    this.connection = connection;
  }

  /**
   * Check if the response has a content-type set.
   *
   * @returns A boolean indicating whether there's a response content-type set.
   */
  public hasContentType(): boolean {
    if (this._hasContentType === undefined) {
      this._hasContentType = this.response.headers.has("content-type");
    }

    return this._hasContentType;
  }
}
