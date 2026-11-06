import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 401 unauthorized request errors.
 */
export default class Unauthorized extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 401;

  constructor(message?: string) {
    super();

    this.name = "Unauthorized";
    this.message = message ?? "Authentication required";
  }
}
