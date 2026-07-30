import type { ServerManager } from "../interfaces/server-manager.ts";
import type {
  RequestHandler,
  ServerAdapter,
} from "../interfaces/server-adapter.ts";

import BunServer from "./adapters/bun.ts";
import NodeServer from "./adapters/node.ts";
import DenoServer from "./adapters/deno.ts";

export default class Manager implements ServerManager {
  private adapters: Map<string, ServerAdapter> = new Map();

  constructor() {
    this.register("bun", new BunServer());
    this.register("deno", new DenoServer());
    this.register("node", new NodeServer());
  }

  /**
   * Start the server with the given request handler.
   *
   * @param name The name of the adapter.
   * @param handler The request handler function
   * @param options Server configuration options
   */
  public serve(
    handler: RequestHandler,
    options?: { port?: number; hostname?: string },
  ): void {
    const adapter = this.getServerAdapter();

    this.adapters.get(adapter)!.serve(handler, options);
  }

  /**
   * Register a new adapter to the server manager.
   *
   * @param name The name of the adapter.
   * @param adapter An implementation of the server adapter interface.
   *
   * @returns void
   */
  public register(name: string, adapter: ServerAdapter): void {
    this.adapters.set(name, adapter);
  }

  /**
   * Detect the runtime and return correct adapter.
   *
   * @returns The name of the adapter to use.
   */
  protected getServerAdapter(): string {
    // deno-lint-ignore no-explicit-any
    const Bun = (globalThis as any).Bun;

    // deno-lint-ignore no-explicit-any
    const Deno = (globalThis as any).Deno;

    if (typeof Deno !== "undefined") {
      return "deno";
    }

    if (typeof Bun !== "undefined") {
      return "bun";
    }

    return "node";
  }
}
