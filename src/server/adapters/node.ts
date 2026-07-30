import type { ConnInfo } from "@raptor/types";

import { connInfoFor } from "../../request/connection.ts";

import type {
  RequestHandler,
  ServerAdapter,
} from "../../interfaces/server-adapter.ts";

interface NodeIncomingMessage {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  socket: {
    encrypted?: boolean;
    remoteAddress?: string;
    remotePort?: number;
  };
}

interface NodeServerResponse {
  statusCode: number;
  setHeader(name: string, value: string | string[]): void;
  write(chunk: Uint8Array): void;
  end(): void;
}

/**
 * A host, optionally with a port: a domain name, an IPv4 literal, or an IPv6
 * literal in brackets.
 */
const HOST_PATTERN =
  /^(?:\[[0-9A-Fa-f:.]{2,45}\]|[A-Za-z0-9._-]{1,253})(?::\d{1,5})?$/;

/**
 * Longest `Host` header accepted, before the pattern is applied.
 */
const MAX_HOST_LENGTH = 260;

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
    handler: RequestHandler,
    options?: { port?: number; hostname?: string },
  ): Promise<void> {
    const { createServer } = await import("node:http");

    const authority = this.authorityFor(options);

    const server = createServer(async (nodeRequest, nodeResponse) => {
      try {
        const request = this.toWebRequest(
          nodeRequest as NodeIncomingMessage,
          authority,
        );

        const connection = this.toConnInfo(
          nodeRequest as NodeIncomingMessage,
        );

        const response = await handler(request, connection);
        await this.fromWebResponse(
          response,
          nodeResponse as NodeServerResponse,
        );
      } catch (error) {
        // Logged rather than swallowed: without this a malformed request or a
        // failing handler returns a 500 that appears nowhere.
        console.error("[raptor] failed to handle request", error);

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
   * Build the authority to fall back to when a request carries no usable `Host`
   * header.
   *
   * @param options The server configuration options.
   *
   * @returns The configured authority.
   */
  private authorityFor(
    options?: { port?: number; hostname?: string },
  ): string {
    const hostname = options?.hostname ?? "localhost";

    // An IPv6 literal has to be bracketed to sit in a URL.
    const host = hostname.includes(":") && !hostname.startsWith("[")
      ? `[${hostname}]`
      : hostname;

    return options?.port ? `${host}:${options.port}` : host;
  }

  /**
   * Read the connection from the node socket.
   *
   * A dual-stack listener reports an IPv4 peer as `::ffff:127.0.0.1`, so the
   * address is canonicalised to keep one client to one address.
   *
   * @param nodeRequest The request from node server.
   *
   * @returns The connection, or undefined if the socket reports no peer.
   */
  private toConnInfo(
    nodeRequest: NodeIncomingMessage,
  ): ConnInfo | undefined {
    const { remoteAddress, remotePort } = nodeRequest.socket;

    return connInfoFor(remoteAddress, remotePort);
  }

  /**
   * Read the request authority from the `Host` header.
   *
   * The header is caller-supplied, so a value that is not a host is replaced by
   * the configured authority rather than being placed in the URL -- an absent
   * header otherwise reads as the host `undefined`, and one containing a space
   * makes the URL unparseable. A repeated `Host` header arrives as a list and is
   * refused outright, since an ambiguous authority is a smuggling signal.
   *
   * @param nodeRequest The request from node server.
   * @param authority The configured authority to fall back to.
   *
   * @returns The authority to build the request URL with.
   */
  private hostFor(
    nodeRequest: NodeIncomingMessage,
    authority: string,
  ): string {
    const host = nodeRequest.headers.host;

    if (typeof host !== "string" || host.length > MAX_HOST_LENGTH) {
      return authority;
    }

    const trimmed = host.trim();

    return HOST_PATTERN.test(trimmed) ? trimmed : authority;
  }

  /**
   * Convert to web request.
   *
   * @param nodeRequest The request from node server.
   * @param authority The configured authority to fall back to.
   *
   * @returns A request object.
   */
  private toWebRequest(
    nodeRequest: NodeIncomingMessage,
    authority: string,
  ): Request {
    const protocol = nodeRequest.socket.encrypted ? "https:" : "http:";

    const host = this.hostFor(nodeRequest, authority);

    const url = `${protocol}//${host}${nodeRequest.url}`;

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
