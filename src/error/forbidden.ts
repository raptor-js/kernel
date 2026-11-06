import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 403 forbidden request errors.
 */
export default class Forbidden extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 403;

  constructor(message?: string) {
    super();

    this.name = "Forbidden";
    this.message = message ?? "Server refused request";
  }
}
