import type {
  ConnInfo,
  ErrorHandler,
  HttpError,
  Middleware,
} from "@raptor-js/types";

import Context from "./context.ts";
import NodeServer from "./server/adapters/node.ts";
import DefaultServerManager from "./server/manager.ts";
import DefaultResponseManager from "./response/manager.ts";

import type { Config } from "./config.ts";
import type { ServerManager } from "./interfaces/server-manager.ts";
import type { ResponseManager } from "./interfaces/response-manager.ts";

/**
 * Check whether a middleware handed back something to wait on.
 *
 * @param value What the middleware returned.
 *
 * @returns Whether the value is a promise or promise-like.
 */
const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null)?.then === "function";

/**
 * The root initialiser for the framework.
 */
export default class Kernel {
  /**
   * Config which can be used to change kernel functionality.
   */
  private config: Config;

  /**
   * The server manager for the kernel.
   */
  private serverManager: ServerManager;

  /**
   * The response manager for the kernel.
   */
  private responseManager: ResponseManager;

  /**
   * The available middleware.
   */
  private middleware: Middleware[] = [];

  /**
   * An optional custom error handler function.
   */
  private errorHandler?: ErrorHandler | null;

  /**
   * Initialise the kernel.
   *
   * @constructor
   *
   * @param config The kernel configuration options.
   */
  constructor(config?: Config) {
    this.config = {
      ...this.initialiseDefaultConfig(),
      ...config,
    };

    // A server option given without a manager still gets the default one.
    this.serverManager =
      this.config.server?.manager ?? new DefaultServerManager();
    this.responseManager = this.config.response?.manager!;

    if (this.config.server?.node) {
      this.serverManager.register(
        "node",
        new NodeServer(this.config.server.node),
      );
    }

    this.registerConfigMiddleware(this.config);
    this.registerConfigResponseProcessors(this.config);
  }

  /**
   * Add new middleware to the container.
   *
   * @param middleware An HTTP middleware instance.
   *
   * @returns The kernel instance.
   */
  public add(middleware: Middleware): this {
    this.middleware.push(middleware);

    return this;
  }

  /**
   * Alias method for "add".
   *
   * @param middleware An HTTP middleware instance.
   *
   * @returns The kernel instance.
   */
  public use(middleware: Middleware): this {
    this.add(middleware);

    return this;
  }

  /**
   * Get the configured kernel config.
   *
   * @returns The configured kernel config.
   */
  public getConfig(): Config {
    return this.config;
  }

  /**
   * Initialises the default kernel config.
   *
   * @returns The default kernel config.
   */
  public initialiseDefaultConfig(): Config {
    return {
      port: 80,
      hostname: "localhost",
      strictContentNegotiation: false,
      middleware: [],
      errorHandler: null,
      server: {
        manager: new DefaultServerManager(),
      },
      response: {
        manager: new DefaultResponseManager(false),
      },
    };
  }

  /**
   * Serve the application.
   */
  public serve() {
    const port = this.config?.port;
    const hostname = this.config?.hostname;

    const handler = (request: Request, connection?: ConnInfo) =>
      this.respond(request, connection);

    if (!this.config?.port) {
      this.serverManager.serve(handler);

      return;
    }

    this.serverManager.serve(handler, { port, hostname });

    console.log(`🦕 Raptor started on port ${port}...`);
  }

  /**
   * Alias method for "serve".
   */
  public listen() {
    this.serve();
  }

  /**
   * Handle an HTTP request and respond.
   *
   * @param request The request object.
   * @param connection The connection the request arrived on, if known.
   *
   * @returns A promise resolving the HTTP response.
   */
  public async respond(
    request: Request,
    connection?: ConnInfo,
  ): Promise<Response> {
    const context = new Context(request, new Response(), connection);

    await this.executeMiddleware(context, 0);

    return context.response;
  }

  /**
   * Set or override the server manager for the kernel.
   *
   * @param manager A valid server manager object.
   *
   * @returns The kernel instance.
   */
  public setServerManager(manager: ServerManager): this {
    this.serverManager = manager;

    return this;
  }

  /**
   * Get the currently registered server manager.
   *
   * @returns The registered server manager.
   */
  public getServerManager(): ServerManager {
    return this.serverManager;
  }

  /**
   * Set or override the response manager for the kernel.
   *
   * @param manager A valid response manager object.
   *
   * @returns The kernel instance.
   */
  public setResponseManager(manager: ResponseManager): this {
    this.responseManager = manager;

    return this;
  }

  /**
   * Get the currently registered response manager.
   *
   * @returns The registered response manager.
   */
  public getResponseManager(): ResponseManager {
    return this.responseManager;
  }

  /**
   * Add custom error handling middleware.
   *
   * @param handler An error handler function to handle errors.
   *
   * @returns The kernel instance.
   */
  public catch(handler: ErrorHandler): this {
    this.errorHandler = handler;

    return this;
  }

  /**
   * Register middleware defined in config.
   *
   * @param config The kernel configuration options.
   *
   * @returns void
   */
  private registerConfigMiddleware(config: Config) {
    for (const middleware of config.middleware ?? []) {
      this.add(middleware);
    }
  }

  /**
   * Register response processors defined in config.
   *
   * @param config The kernel configuration options.
   *
   * @returns void
   */
  private registerConfigResponseProcessors(config: Config) {
    const responseProcessors = Object.entries(
      config.response?.processors || [],
    );

    for (const [key, processor] of responseProcessors) {
      this.responseManager.register(key, processor);
    }
  }

  /**
   * Execute a chosen middleware by index.
   *
   * Stays synchronous until a middleware hands back a promise, so a chain only
   * waits on the steps that are asynchronous.
   *
   * @param context The current HTTP context.
   * @param index The current middleware index.
   *
   * @returns A promise when a step is asynchronous, otherwise nothing.
   */
  private executeMiddleware(
    context: Context,
    index: number,
  ): Promise<void> | void {
    const middleware = this.middleware[index];

    if (!middleware) {
      return;
    }

    let called = false;

    // Always a promise, so middleware that chains .then() on next() keeps working.
    const next = (): Promise<void> => {
      if (called) {
        return Promise.resolve();
      }

      called = true;

      return Promise.resolve(this.executeMiddleware(context, index + 1));
    };

    let body: unknown;

    try {
      body = middleware(context, next);
    } catch (error) {
      return this.processError(error, context);
    }

    if (isThenable(body)) {
      return Promise.resolve(body).then(
        (resolved) => this.settleMiddleware(resolved, called, context),
        (error) => this.processError(error, context),
      );
    }

    return this.settleMiddleware(body, called, context);
  }

  /**
   * Turn what a middleware returned into the response, unless it passed the
   * request on.
   *
   * @param body What the middleware returned.
   * @param called Whether the middleware called next.
   * @param context The current HTTP context.
   *
   * @returns A promise when the body needs processing, otherwise nothing.
   */
  private settleMiddleware(
    body: unknown,
    called: boolean,
    context: Context,
  ): Promise<void> | void {
    if (called || !body) {
      return;
    }

    if (body instanceof Response) {
      context.response = body;

      return;
    }

    return this.processMiddlewareResponse(body, context).catch((error) =>
      this.processError(error, context),
    );
  }

  /**
   * Record an error a middleware raised and hand it to the error handler.
   *
   * @param error The error that was raised.
   * @param context The current HTTP context.
   *
   * @returns Promise<void>
   */
  private processError(error: unknown, context: Context): Promise<void> {
    context.error = error as Error | HttpError;

    return this.processUncaughtError(context);
  }

  /**
   * Process an unknown response body with HTTP context.
   *
   * @param body An unknown response body to process.
   * @param context The current HTTP context.
   *
   * @returns Promise<void>
   */
  private async processMiddlewareResponse(
    body: unknown,
    context: Context,
  ): Promise<void> {
    const processed = await this.responseManager.process(body, context);

    context.response = processed;
  }

  /**
   * Process an uncaught error with HTTP context.
   *
   * @param error The uncaught error object to process.
   * @param context The current HTTP context object.
   *
   * @returns Promise<void>
   */
  private async processUncaughtError(context: Context): Promise<void> {
    if (!this.errorHandler) {
      return this.internalErrorHandler(context);
    }

    try {
      const errorBody = await this.errorHandler(context);

      await this.processMiddlewareResponse(errorBody, context);
    } catch (_error) {
      // Fall back to internal handler if custom handler fails.
      return this.internalErrorHandler(context);
    }
  }

  /**
   * Handle the uncaught error internally.
   *
   * @param error The uncaught error object to handle.
   * @param context The current HTTP context object.
   *
   * @returns Promise<void>
   */
  private internalErrorHandler(context: Context): Promise<void> {
    return this.processMiddlewareResponse(context.error, context);
  }
}
