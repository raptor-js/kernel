import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 406 not acceptable request errors.
 */
export default class NotAcceptable extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 406;

  constructor(message?: string) {
    super();

    this.name = "Not Acceptable";
    this.message = message ?? "Resource can't return requested format";
  }
}
