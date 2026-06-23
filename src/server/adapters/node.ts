import type { ServerAdapter } from "../../interfaces/server-adapter.ts";

interface NodeIncomingMessage {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  socket: {
    encrypted?: boolean;
  };
}

interface NodeServerResponse {
  statusCode: number;
  setHeader(name: string, value: string | string[]): void;
  write(chunk: Uint8Array): void;
  end(): void;
}

/**
 * The Node server implementation for Raptor.
 */
export default class NodeServer implements ServerAdapter {
  /**
   * Start the server with the given request handler.
   *
   * @param handler The request handler function
   * @param options Server configuration options
   */
  public async serve(
    handler: (request: Request) => Promise<Response>,
    options?: { port?: number; hostname?: string },
  ): Promise<void> {
    const { createServer } = await import("node:http");

    const server = createServer(async (nodeRequest, nodeResponse) => {
      try {
        const request = this.toWebRequest(nodeRequest as NodeIncomingMessage);
        const response = await handler(request);
        await this.fromWebResponse(response, nodeResponse as NodeServerResponse);
      } catch {
        (nodeResponse as NodeServerResponse).statusCode = 500;
        (nodeResponse as NodeServerResponse).end();
      }
    });

    server.listen(
      options?.port,
      options?.hostname ?? "localhost",
    );
  }

  /**
   * Convert to web request.
   *
   * @param nodeRequest The request from node server.
   * @returns A request object.
   */
  private toWebRequest(nodeRequest: NodeIncomingMessage): Request {
    const protocol = nodeRequest.socket.encrypted ? "https:" : "http:";

    const url = `${protocol}//${nodeRequest.headers.host}${nodeRequest.url}`;

    return new Request(url, {
      method: nodeRequest.method,
      headers: nodeRequest.headers as HeadersInit,
      body: nodeRequest.method !== "GET" && nodeRequest.method !== "HEAD"
        ? (nodeRequest as unknown as ReadableStream<Uint8Array>)
        : undefined,
      duplex: "half",
    } as RequestInit);
  }

  /**
   * Convert from web response.
   *
   * @param response The web response object.
   * @param nodeResponse The node response object.
   */
  private async fromWebResponse(
    response: Response,
    nodeResponse: NodeServerResponse,
  ): Promise<void> {
    nodeResponse.statusCode = response.status;

    response.headers.forEach((value, key) => {
      nodeResponse.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        nodeResponse.write(value);
      }
    }

    nodeResponse.end();
  }
}
