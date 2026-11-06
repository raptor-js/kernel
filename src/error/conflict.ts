import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 409 conflict request errors.
 */
export default class Conflict extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 409;

  constructor(message?: string) {
    super();

    this.name = "Conflict";
    this.message = message ?? "Resource already exists";
  }
}
