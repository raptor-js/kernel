import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 404 not found request errors.
 */
export default class NotFound extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 404;

  constructor(message?: string) {
    super();

    this.name = "Not Found";
    this.message = message ?? "The resource requested could not be found";
  }
}
