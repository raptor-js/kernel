// Copyright 2026, Raptor. All rights reserved. MIT license.

import Kernel from "./src/kernel.ts";
import helper from "./src/helper.ts";

// In-built errors.
import Gone from "./src/error/gone.ts";
import Context from "./src/context.ts";
import Conflict from "./src/error/conflict.ts";
import NotFound from "./src/error/not-found.ts";
import Forbidden from "./src/error/forbidden.ts";
import ImATeapot from "./src/error/im-a-teapot.ts";
import BadRequest from "./src/error/bad-request.ts";
import ServerError from "./src/error/server-error.ts";
import Unauthorized from "./src/error/unauthorized.ts";
import NotAcceptable from "./src/error/not-acceptable.ts";
import RequestTimeout from "./src/error/request-timeout.ts";
import TooManyRequests from "./src/error/too-many-requests.ts";
import MethodNotAllowed from "./src/error/method-not-allowed.ts";
import UnprocessableEntity from "./src/error/unprocessable-entity.ts";

// In-built response classes.
import { ResponseBodyType } from "./src/response/body-type.ts";
import DefaultResponseManager from "./src/response/manager.ts";
import ContentNegotiator from "./src/response/content-negotiator.ts";

// Server manager and adapters.
import DefaultServerManager from "./src/server/manager.ts";
import BunServerAdapter from "./src/server/adapters/bun.ts";
import DenoServerAdapter from "./src/server/adapters/deno.ts";
import NodeServerAdapter from "./src/server/adapters/node.ts";

// Response processors.
import ErrorResponseProcessor from "./src/response/processors/error.ts";
import StringResponseProcessor from "./src/response/processors/string.ts";
import ObjectResponseProcessor from "./src/response/processors/object.ts";
import ResponseObjectResponseProcessor from "./src/response/processors/response-object.ts";

// Export all available interfaces/types.
export type { Config } from "./src/config.ts";
export type { ResponseManager } from "./src/interfaces/response-manager.ts";
export type { ResponseProcessor } from "./src/interfaces/response-processor.ts";

export {
  BadRequest,
  BunServerAdapter,
  Conflict,
  ContentNegotiator,
  Context,
  DefaultResponseManager,
  DefaultServerManager,
  DenoServerAdapter,
  ErrorResponseProcessor,
  Forbidden,
  Gone,
  ImATeapot,
  Kernel,
  MethodNotAllowed,
  NodeServerAdapter,
  NotAcceptable,
  NotFound,
  ObjectResponseProcessor,
  RequestTimeout,
  ResponseBodyType,
  ResponseObjectResponseProcessor,
  ServerError,
  StringResponseProcessor,
  TooManyRequests,
  Unauthorized,
  UnprocessableEntity,
};

export default helper;
