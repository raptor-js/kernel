import type { Middleware } from "./types/middleware.ts";
import type { ServerManager } from "./interfaces/server-manager.ts";
import type { ResponseManager } from "./interfaces/response-manager.ts";
import type { ResponseProcessor } from "./interfaces/response-processor.ts";

/**
 * Config which can be used to change kernel functionality.
 */
export interface Config {
  /**
   * The port the kernel will use to serve the application.
   *
   * @default 80
   */
  port?: number;

  /**
   * The hostname the kernel will use to serve the appliation.
   *
   * @default "localhost"
   */
  hostname?: string;

  /**
   * Enable strict RFC 7231 content negotiation.
   *
   * When true, throws not acceptable if response cannot match accept header.
   * When false, returns content regardless of accept header.
   *
   * @default false
   */
  strictContentNegotiation?: boolean;

  /**
   * Middleware stack, providing a way to add middleware to the kernel.
   *
   * @default []
   */
  middleware?: Middleware[];

  /**
   * Server configuration, providing a way to override the kernel's server management.
   */
  server?: {
    /**
     * Custom server manager implementation for handling HTTP serving on the current runtime.
     *
     * Allows overriding the default server behavior.
     */
    manager?: ServerManager;
  };

  /**
   * Response configuration, providing a way to override the kernel's response management.
   */
  response?: {
    /**
     * Custom response manager implementation for processing response bodies into HTTP Response objects.
     *
     * Allows overriding the default response handling.
     */
    manager?: ResponseManager;

    /**
     * Custom processors for handling specific response body types (e.g., string, object, HTML).
     *
     * Key is the processor identifier, value is the processor implementation.
     */
    processors?: Record<string, ResponseProcessor>;
  };
}
