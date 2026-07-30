import type { RequestHandler, ServerAdapter } from "./server-adapter.ts";

/**
 * Manages the serving of applications.
 */
export interface ServerManager {
  /**
   * Start the server with the given request handler.
   *
   * @param handler The request handler function
   * @param options Server configuration options
   */
  serve(
    handler: RequestHandler,
    options?: { port?: number; hostname?: string },
  ): void;

  /**
   * Register a new adapter to the server manager.
   *
   * @param name The name of the adapter.
   * @param adapter An implementation of the server adapter interface.
   *
   * @returns void
   */
  register(name: string, adapter: ServerAdapter): void;
}
