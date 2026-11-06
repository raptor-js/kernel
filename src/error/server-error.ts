import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 500 server errors.
 */
export default class ServerError extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 500;

  constructor(message?: string) {
    super();

    this.name = "Server Error";
    this.message =
      message ?? "There was an unexpected error handling your request";
  }
}
