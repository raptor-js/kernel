/**
 * The members the standard Request has, which a lightweight request hands to
 * the real one. Anything a library adds to Request.prototype is left to run on
 * the stand-in itself, since it may read what was set on that request.
 */
export const REQUEST_MEMBERS = [
  "method",
  "url",
  "headers",
  "destination",
  "referrer",
  "referrerPolicy",
  "mode",
  "credentials",
  "cache",
  "redirect",
  "integrity",
  "keepalive",
  "isReloadNavigation",
  "isHistoryNavigation",
  "signal",
  "duplex",
  "body",
  "bodyUsed",
  "clone",
  "arrayBuffer",
  "blob",
  "bytes",
  "formData",
  "json",
  "text",
];

/**
 * The members the standard Response has, which a lightweight response hands
 * to the real one.
 */
export const RESPONSE_MEMBERS = [
  "type",
  "url",
  "redirected",
  "status",
  "ok",
  "statusText",
  "headers",
  "body",
  "bodyUsed",
  "clone",
  "arrayBuffer",
  "blob",
  "bytes",
  "formData",
  "json",
  "text",
];

/**
 * Make a lightweight stand-in's prototype hand the standard members it does
 * not answer itself to the real object, built the first time it is needed.
 *
 * @param prototype The stand-in's prototype, already holding what it answers itself.
 * @param original The real class's prototype, such as Request.prototype.
 * @param members The standard members to hand on.
 * @param toReal Builds, or returns the already built, real object.
 *
 * @returns The prototype.
 */
export const forwardToReal = <T extends object>(
  prototype: object,
  original: T,
  members: string[],
  toReal: (standIn: object) => T,
): object => {
  for (const key of members) {
    const descriptor = Object.getOwnPropertyDescriptor(original, key);

    if (!descriptor || Object.hasOwn(prototype, key)) {
      continue;
    }

    if (typeof descriptor.value === "function") {
      Object.defineProperty(prototype, key, {
        value(this: object, ...args: unknown[]) {
          return Reflect.apply(descriptor.value, toReal(this), args) as unknown;
        },
      });

      continue;
    }

    if (descriptor.get) {
      Object.defineProperty(prototype, key, {
        get(this: object) {
          return descriptor.get?.call(toReal(this));
        },
      });
    }
  }

  return prototype;
};
