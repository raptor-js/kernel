import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 400 bad request errors.
 */
export default class BadRequest extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 400;

  public errors: string[];

  constructor(errors: string[], message?: string) {
    super();

    this.name = "Bad Request";
    this.message = message ?? "There was an issue handling your request";
    this.errors = errors;
  }
}
