import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 410 gone request errors.
 */
export default class Gone extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 410;

  constructor(message?: string) {
    super();

    this.name = "Gone";
    this.message = message ?? "Resource no longer exists";
  }
}
