import type { ConnInfo } from "@raptor/types";

import ServerError from "../../error/server-error.ts";
import { connInfoFor } from "../../request/connection.ts";

import type {
  RequestHandler,
  ServerAdapter,
} from "../../interfaces/server-adapter.ts";

/**
 * The address shape Deno reports for a connection.
 */
interface DenoNetAddress {
  transport: string;
  hostname?: string;
  port?: number;
}

/**
 * The request info Deno passes alongside the request.
 */
interface DenoServeHandlerInfo {
  remoteAddr?: DenoNetAddress;
}

/**
 * The Deno server implementation for Raptor.
 */
export default class DenoServer implements ServerAdapter {
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
    const Deno = (globalThis as any).Deno;

    if (typeof Deno === "undefined") {
      throw new ServerError();
    }

    // Deno passes the peer address as a second argument, so the handler is
    // wrapped to read it.
    const wrapped = (request: Request, info?: DenoServeHandlerInfo) =>
      handler(request, this.toConnInfo(info));

    if (!options?.port) {
      Deno.serve(wrapped);

      return;
    }

    Deno.serve({
      port: options.port,
      hostname: options.hostname,
    }, wrapped);
  }

  /**
   * Read the connection from Deno's request info.
   *
   * Only a network transport has an address; a unix socket reports none.
   *
   * @param info The request info Deno supplied.
   *
   * @returns The connection, or undefined if there is no network address.
   */
  private toConnInfo(info?: DenoServeHandlerInfo): ConnInfo | undefined {
    const remote = info?.remoteAddr;

    if (remote?.transport === "unix") {
      return undefined;
    }

    return connInfoFor(remote?.hostname, remote?.port);
  }
}
