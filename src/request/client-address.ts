import type { Context } from "@raptor/types";

import {
  canonicaliseAddress,
  type Cidr,
  inCidr,
  parseAddress,
  parseCidr,
} from "./ip.ts";

/**
 * How far to trust `X-Forwarded-For` when resolving a client address.
 *
 * - `false` -- ignore the header and use the socket peer. The default.
 * - a list of CIDR ranges -- trust hops falling inside them, stopping at the
 *   first that does not. The recommended setting, as each hop is identified.
 * - a number -- trust that many proxy hops, counting out from the socket. This
 *   checks no addresses, so it is only safe where the application cannot be
 *   reached except through exactly that many proxies. Where a request can arrive
 *   by a shorter path -- an exposed origin, a second ingress, an internal port --
 *   a caller supplying the header chooses the address that comes back.
 *
 * There is no "trust everything" setting, and a range matching every address is
 * rejected, since either would return a value the caller controls.
 */
export type Trust = false | number | string[];

/**
 * Decides whether the hop at `index` in the chain may be trusted.
 */
export type TrustResolver = (address: string, index: number) => boolean;

/**
 * Upper bound on the number of `X-Forwarded-For` entries kept, since the header
 * is caller-supplied.
 */
const MAX_FORWARDED_ENTRIES = 64;

/**
 * Upper bound on the entries examined while collecting those kept, so a header
 * padded with empty entries cannot drive unbounded scanning.
 */
const MAX_FORWARDED_SCAN = 256;

/**
 * Strip a port from a forwarded entry, in either `1.2.3.4:80` or
 * `[2001:db8::1]:80` form.
 *
 * @param value A single trimmed header entry.
 *
 * @returns The entry without its port.
 */
const stripPort = (value: string): string => {
  if (value.startsWith("[")) {
    const close = value.indexOf("]");

    return close === -1 ? value : value.slice(1, close);
  }

  const colon = value.indexOf(":");

  // A second colon means this is a bare IPv6 address, not an address and port.
  if (colon !== -1 && value.indexOf(":", colon + 1) === -1) {
    return value.slice(0, colon);
  }

  return value;
};

/**
 * Parse `X-Forwarded-For` into hops ordered nearest-first.
 *
 * The header runs oldest to newest, so it is reversed to match the direction
 * trust is evaluated in. Reading from the newest end also means a padded header
 * cannot push the real hops out of range.
 *
 * @param header The raw header value, if present.
 *
 * @returns The hop addresses, nearest first.
 */
const forwardedHops = (header: string | null): string[] => {
  if (!header) {
    return [];
  }

  const parts = header.split(",");
  const hops: string[] = [];

  let scanned = 0;

  for (
    let index = parts.length - 1;
    index >= 0 && hops.length < MAX_FORWARDED_ENTRIES &&
    scanned < MAX_FORWARDED_SCAN;
    index--
  ) {
    scanned++;

    const hop = stripPort(parts[index].trim());

    if (hop !== "") {
      hops.push(hop);
    }
  }

  return hops;
};

/**
 * Compile a trust policy, validating it up front.
 *
 * Call once at start-up and reuse: an invalid policy throws here, where it stops
 * the application, rather than on a request. Messages name the offending entry by
 * position rather than by value, so a policy cannot reach a client through an
 * error response.
 *
 * @param trust The trust policy to compile.
 *
 * @returns A resolver deciding whether a hop is trusted.
 *
 * @throws If the policy is not a valid hop count or list of CIDR ranges.
 */
export const compileTrust = (trust: Trust): TrustResolver => {
  if (trust === false) {
    return () => false;
  }

  if (typeof trust === "number") {
    if (!Number.isInteger(trust) || trust < 0) {
      throw new Error("Trusted proxy hop count must be a non-negative integer");
    }

    return (_address, index) => index < trust;
  }

  if (!Array.isArray(trust)) {
    throw new Error(
      "Trusted proxies must be false, a hop count, or a list of CIDR ranges",
    );
  }

  const ranges: Cidr[] = trust.map((range, index) => {
    const parsed = parseCidr(range);

    if (!parsed) {
      throw new Error(`Invalid trusted proxy CIDR range at index ${index}`);
    }

    if (parsed.prefix === 0) {
      throw new Error(
        `Trusted proxy CIDR range at index ${index} matches every address, which would return a caller-controlled value`,
      );
    }

    return parsed;
  });

  return (address) => {
    const parsed = parseAddress(address);

    return parsed ? ranges.some((range) => inCidr(parsed, range)) : false;
  };
};

/**
 * Resolve the address of the client that made this request.
 *
 * Starts from the socket peer -- the only address the runtime can vouch for --
 * and walks the `X-Forwarded-For` chain outwards while each hop is trusted,
 * returning the first untrusted address. Anchoring on the socket means a forged
 * header cannot reach past the trust boundary, and the walk never steps onto an
 * entry that is not an address, so a malformed header cannot change the outcome.
 *
 * Prefer a resolver from `compileTrust`, built once at start-up; a plain policy is
 * recompiled and revalidated on every call.
 *
 * @param context The current HTTP context.
 * @param trust The trust policy, or a resolver from `compileTrust`. Defaults to
 *   trusting no proxies.
 *
 * @returns The client address in canonical form, or undefined if there is no
 *   connection or its address cannot be parsed.
 */
export const clientAddress = (
  context: Context,
  trust: Trust | TrustResolver = false,
): string | undefined => {
  const socket = context.connection?.remote.address;

  if (!socket) {
    return undefined;
  }

  // Trusting nothing is the default, so the header is not read at all.
  if (
    trust === false || trust === 0 ||
    (Array.isArray(trust) && trust.length === 0)
  ) {
    return canonicaliseAddress(socket);
  }

  const trusted = typeof trust === "function" ? trust : compileTrust(trust);

  const chain = [
    socket,
    ...forwardedHops(context.request.headers.get("x-forwarded-for")),
  ];

  let index = 0;

  // Advancing requires the next hop to be a real address, so the entry finally
  // chosen is always one that parses.
  while (
    index < chain.length - 1 &&
    trusted(chain[index], index) &&
    parseAddress(chain[index + 1])
  ) {
    index++;
  }

  return canonicaliseAddress(chain[index]);
};
