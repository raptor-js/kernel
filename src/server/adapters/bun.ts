import type { ConnInfo } from "@raptor/types";

import ServerError from "../../error/server-error.ts";
import { connInfoFor } from "../../request/connection.ts";

import type {
  RequestHandler,
  ServerAdapter,
} from "../../interfaces/server-adapter.ts";

/**
 * The address shape `Bun.Server.requestIP` returns.
 */
interface BunSocketAddress {
  address: string;
  port: number;
  family: string;
}

/**
 * The subset of Bun's server handle this adapter uses.
 */
interface BunServerHandle {
  requestIP(request: Request): BunSocketAddress | null;
}

/**
 * The Bun server implementation for Raptor.
 */
export default class BunServer implements ServerAdapter {
  /**
   * Start the server with the given request handler.
   *
   * @param handler The request handler function
   * @param options Server configuration options
   */
  public serve(
    handler: RequestHandler,
    options?: { port?: number; hostname?: string },
  ): void {
    // deno-lint-ignore no-explicit-any
    const Bun = (globalThis as any).Bun;

    if (typeof Bun === "undefined") {
      throw new ServerError();
    }

    Bun.serve({
      port: options?.port,
      hostname: options?.hostname ?? "localhost",
      // Bun exposes the peer address only through the server handle it passes
      // as the second argument, so the handler is wrapped to read it.
      fetch: (request: Request, server: BunServerHandle) =>
        handler(request, this.toConnInfo(server, request)),
    });
  }

  /**
   * Read the connection for a request from Bun's server handle.
   *
   * @param server The Bun server handle for the current request.
   * @param request The request to look up.
   *
   * @returns The connection, or undefined if Bun reports no peer.
   */
  private toConnInfo(
    server: BunServerHandle,
    request: Request,
  ): ConnInfo | undefined {
    if (typeof server?.requestIP !== "function") {
      return undefined;
    }

    // Null for a closed connection, or a unix socket, which has no address.
    const remote = server.requestIP(request);

    return connInfoFor(remote?.address, remote?.port);
  }
}
