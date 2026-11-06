// biome-ignore-all lint/suspicious/noExplicitAny: middleware may return a value of any type

import type { HttpError } from "@raptor-js/types";

import type Context from "../../context.ts";
import { createResponse } from "../raw-body.ts";
import ContentNegotiator from "../content-negotiator.ts";
import type { ResponseProcessor } from "../../interfaces/response-processor.ts";

/**
 * The plain text processor for HTTP responses.
 */
export default class ErrorProcessor implements ResponseProcessor {
  /**
   * Handle the response and process plain text if found.
   *
   * @param body Any HTTP response body.
   * @param context The current HTTP context.
   * @returns An HTTP response.
   */
  public process(body: any, context: Context): Response {
    return this.transformResponse(body, context);
  }

  /**
   * Check if it's an HTTP Error.
   *
   * @param error The error to check against.
   * @returns A boolean indicating whether it's an HTTP error.
   */
  private isHttpError(error: Error): error is HttpError {
    return "status" in error && typeof (error as any).status === "number";
  }

  /**
   * Transform the response based on request content type and accept headers.
   *
   * @param error The error in the request.
   * @param context The context of the request.
   *
   * @returns A valid response object in appropriate content type.
   */
  private transformResponse(error: Error, context: Context): Response {
    const contentType = ContentNegotiator.negotiate(context.request);

    const status = this.isHttpError(error) ? error.status : 500;
    const errors = this.isHttpError(error) ? error.errors : undefined;

    let body;

    switch (contentType) {
      case "application/json":
        body = JSON.stringify({
          name: error.name,
          message: error.message,
          status,
          errors,
        });
        break;

      case "text/html":
        body = this.generateBasicHtmlBody(error);
        break;

      case "text/plain":
      default:
        body = `${error.name} - ${error.message}`;
        break;
    }

    context.response.headers.set(
      "content-type",
      `${contentType}; charset=utf-8`,
    );

    return createResponse(body, {
      status: this.isHttpError(error) ? error.status : 500,
      headers: context.response.headers,
    });
  }

  /**
   * Escape HTML special characters to prevent XSS.
   *
   * @param text The text to escape.
   * @returns A safe HTML string.
   */
  private escapeHtml(text: string): string {
    if (!text) return "";

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Generate a basic HTML body for the error.
   *
   * @param error The error to render in HTML.
   * @returns An HTML formatted string.
   */
  private generateBasicHtmlBody(
    error: Error & { errors?: Record<string, string[]> },
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      ${this.generateHtmlHead(error.name)}
      <body>
        ${this.generateHtmlContent(error)}
      </body>
      </html>
    `;
  }

  /**
   * Generate the HTML head section.
   *
   * @param title The page title.
   * @returns The HTML head section.
   */
  private generateHtmlHead(title: string): string {
    return `
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.escapeHtml(title)}</title>
        ${this.generateHtmlStyles()}
      </head>
    `;
  }

  /**
   * Generate the CSS styles for the error page.
   *
   * @returns The style tag with CSS.
   */
  private generateHtmlStyles(): string {
    return `
      <style>
        body { 
          font-family: system-ui, sans-serif; 
          max-width: 800px; 
          margin: 2rem auto; 
          padding: 0 1rem; 
        }
        h1 { color: #d32f2f; }
        h2 { margin: 0 0 1rem; }
        .message {
          background: #fcfcfc;
          border: 1px solid #dedede;
          border-radius: 0.25rem;
          padding: 1rem;
          color: #111111;
        }
        .error-box {
          background: #fcfcfc;
          border: 1px solid #dedede;
          border-radius: 0.25rem;
          padding: 1rem;
          color: #111111;
        }
        .error-box ul {
          margin: 0;
        }
        .error-box ul li {
          margin-bottom: 0.25rem;  
        }
      </style>
    `;
  }

  /**
   * Generate the main content body.
   *
   * @param error The error object.
   * @returns The HTML body content.
   */
  private generateHtmlContent(
    error: Error & { errors?: Record<string, string[]> },
  ): string {
    const errorsList = this.generateErrorsList(error.errors);

    return `
      <h1>${this.escapeHtml(error.name)}</h1>
      <p class="message">${this.escapeHtml(error.message)}</p>
      ${errorsList}
    `;
  }

  /**
   * Generate the validation errors list if present.
   *
   * @param errors The errors object.
   * @returns HTML for the errors list or empty string.
   */
  private generateErrorsList(errors?: Record<string, string[]>): string {
    if (!errors || Object.keys(errors).length === 0) {
      return "";
    }

    const items = Object.entries(errors)
      .flatMap(([field, messages]) =>
        messages.map(
          (message) =>
            `<li>
            <strong>
              ${this.escapeHtml(field)}:
            </strong>
            ${this.escapeHtml(message)}
          </li>`,
        ),
      )
      .join("\n");

    return `
      <div class="error-box">
        <h2>Errors</h2>
        <ul>${items}</ul>
      </div>
    `;
  }
}
