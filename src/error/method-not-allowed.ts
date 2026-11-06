import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 405 method not allowed request errors.
 */
export default class MethodNotAllowed extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 405;

  constructor(message?: string) {
    super();

    this.name = "Method Not Allowed";
    this.message = message ?? "Request method not permitted";
  }
}
