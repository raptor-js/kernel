import type { ConnInfo } from "@raptor/types";

/**
 * The request handler a server adapter drives. `connection` is optional, as not
 * every runtime exposes one.
 */
export type RequestHandler = (
  request: Request,
  connection?: ConnInfo,
) => Promise<Response>;

export interface ServerAdapter {
  /**
   * Start the server with the given request handler.
   *
   * @param handler The request handler function
   * @param options Server configuration options
   */
  serve(
    handler: RequestHandler,
    options?: { port?: number; hostname?: string },
  ): void | Promise<void>;
}
