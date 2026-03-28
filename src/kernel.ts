import Context from "./context.ts";
import DefaultServerManager from "./server/manager.ts";
import DefaultResponseManager from "./response/manager.ts";

import type { Config } from "./config.ts";
import type { Middleware } from "./types/middleware.ts";
import type { HttpError } from "./interfaces/http-error.ts";
import type { ErrorHandler } from "./types/error-handler.ts";
import type { ServerManager } from "./interfaces/server-manager.ts";
import type { ResponseManager } from "./interfaces/response-manager.ts";

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

    this.serverManager = this.config.server?.manager!;
    this.responseManager = this.config.response?.manager!;

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
        manager: new DefaultResponseManager(
          false,
        ),
      },
    };
  }

  /**
   * Serve the application.
   */
  public serve() {
    const port = this.config?.port;
    const hostname = this.config?.hostname;

    const handler = (request: Request) => this.respond(request);

    if (!this.config?.port) {
      this.serverManager.serve(handler);

      return;
    }

    this.serverManager.serve(handler, { port, hostname });

    console.log(
      `🦕 Raptor started on port ${port}...`,
    );
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
   *
   * @returns A promise resolving the HTTP response.
   */
  public async respond(request: Request): Promise<Response> {
    const context = new Context(request, new Response());

    await this.next(context);

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
   * Handle the processing of middleware.
   *
   * @param context The current HTTP context.
   *
   * @returns void
   */
  private async next(context: Context): Promise<void> {
    await this.executeMiddleware(context, 0);
  }

  /**
   * Execute a chosen middleware by index.
   *
   * @param context The current HTTP context.
   * @param index The current middleware index.
   *
   * @returns Promise<void>
   */
  private async executeMiddleware(
    context: Context,
    index: number,
  ): Promise<Response | void> {
    if (index >= this.middleware.length) {
      return;
    }

    const middleware = this.middleware[index];

    if (!middleware) {
      return;
    }

    let called = false;

    const next = async () => {
      if (called) {
        return;
      }

      called = true;

      index++;

      await this.executeMiddleware(context, index);
    };

    try {
      const body = await middleware(context, next);

      if (called || !body) {
        return;
      }

      if (body instanceof Response) {
        context.response = body;

        return;
      }

      await this.processMiddlewareResponse(body, context);
    } catch (error) {
      context.error = error as Error | HttpError;

      await this.processUncaughtError(context);
    }
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
  private async processUncaughtError(
    context: Context,
  ): Promise<void> {
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
