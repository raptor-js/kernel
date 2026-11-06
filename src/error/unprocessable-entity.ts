import type { HttpError } from "@raptor-js/types";

/**
 * An error used primarily in 422 unprocessable entity request errors.
 */
export default class UnprocessableEntity extends Error implements HttpError {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number = 422;

  /**
   * Validation errors keyed by field name.
   */
  public errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>, message?: string) {
    super();

    this.name = "Unprocessable Entity";
    this.message = message ?? "Semantic errors in request";
    this.errors = errors;
  }
}
