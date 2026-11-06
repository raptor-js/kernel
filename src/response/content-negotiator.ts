/**
 * HTTP content type negotiation service.
 */
export default class ContentNegotiator {
  /**
   * Detect the most appropriate content type for a request based on headers.
   *
   * @param request The HTTP request to analyse.
   *
   * @returns The most appropriate content type.
   */
  public static negotiate(request: Request): string {
    const acceptHeader = request.headers.get("accept");
    const contentTypeHeader = request.headers.get("content-type");

    if (acceptHeader && acceptHeader !== "*/*") {
      const acceptedTypes = this.parseAcceptHeader(acceptHeader);

      for (const type of acceptedTypes) {
        const baseType = this.getBaseMediaType(type);

        if (baseType.includes("*")) {
          continue;
        }

        if (this.isJsonType(baseType)) {
          return "application/json";
        }

        if (baseType === "text/html") {
          return "text/html";
        }

        if (baseType === "text/plain") {
          return "text/plain";
        }
      }

      if (acceptedTypes.some((t) => this.getBaseMediaType(t).includes("*"))) {
        return "text/plain";
      }
    }

    if (contentTypeHeader) {
      const baseType = this.getBaseMediaType(contentTypeHeader);

      if (this.isJsonType(baseType)) {
        return "application/json";
      }

      if (baseType === "text/html") {
        return "text/html";
      }
    }

    return "text/plain";
  }

  /**
   * Check if a content-type is acceptable based on the accept header.
   *
   * @param request The HTTP request with accept header.
   * @param contentType The content-type to check.
   *
   * @returns A boolean indicating if the content-type is acceptable.
   */
  public static isAcceptable(request: Request, contentType: string): boolean {
    const acceptHeader = request.headers.get("accept");

    if (!acceptHeader || acceptHeader === "*/*") {
      return true;
    }

    const baseType = contentType.split(";")[0]?.trim().toLowerCase();

    const [type] = baseType.split("/");

    const acceptedTypes = acceptHeader
      .split(",")
      .map((t) => t.split(";")[0]?.trim().toLowerCase());

    for (const accepted of acceptedTypes) {
      if (accepted === baseType) {
        return true;
      }

      if (accepted === "*/*") {
        return true;
      }

      if (accepted === `${type}/*`) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse Accept header and return types sorted by quality value and specificity.
   *
   * @param header The Accept header to parse.
   *
   * @returns An array of media types sorted by quality (desc) and specificity.
   */
  public static parseAcceptHeader(header: string): string[] {
    return header
      .split(",")
      .map((part) => {
        const [type, ...params] = part.trim().split(";");

        if (!type) return null;

        const qMatch = params.find((p) => p.trim().startsWith("q="));

        const qValue = qMatch?.split("=")[1];

        const q = qValue ? parseFloat(qValue) : 1.0;

        return {
          type: type.trim(),
          q,
        };
      })
      .filter((item): item is { type: string; q: number } => item !== null)
      .filter((item) => item.q > 0)
      .sort((a, b) => {
        if (b.q !== a.q) {
          return b.q - a.q;
        }

        const aSpecificity = this.getTypeSpecificity(a.type);
        const bSpecificity = this.getTypeSpecificity(b.type);

        return bSpecificity - aSpecificity;
      })
      .map((item) => item.type);
  }

  /**
   * Calculate specificity score for a media type.
   *
   * @param type The media type to score.
   *
   * @returns A specificity score.
   */
  private static getTypeSpecificity(type: string): number {
    if (type === "*/*") {
      return 0;
    }

    if (type.endsWith("/*")) {
      return 1;
    }

    return 2;
  }

  /**
   * Extract base media type without parameters.
   *
   * @param contentType The content type to retrieve the base type from.
   *
   * @returns The base media type without any parameters.
   */
  private static getBaseMediaType(contentType: string): string {
    return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  }

  /**
   * Check if a content type is JSON or JSON-based.
   *
   * @param contentType The content type to check for JSON.
   *
   * @returns A boolean indicating whether the content type is JSON.
   */
  private static isJsonType(contentType: string): boolean {
    return (
      contentType === "application/json" ||
      contentType === "application/hal+json" ||
      contentType === "application/problem+json" ||
      contentType.endsWith("+json")
    );
  }
}
