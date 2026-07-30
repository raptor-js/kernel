import type { ConnInfo } from "@raptor/types";

import { formatAddress, parseAddress } from "./ip.ts";

/**
 * Build connection details from a runtime-reported peer address.
 *
 * Shared by the server adapters so each only has to know how its own runtime
 * exposes the peer. An address the parser does not recognise yields undefined
 * rather than being passed through, since nothing downstream can trust or key on
 * a value that is not an address.
 *
 * @param address The peer address the runtime reported.
 * @param port The peer port, if the runtime reported one.
 *
 * @returns The connection, or undefined if there is no usable address.
 */
export const connInfoFor = (
  address?: string,
  port?: number,
): ConnInfo | undefined => {
  if (!address) {
    return undefined;
  }

  const parsed = parseAddress(address);

  if (!parsed) {
    return undefined;
  }

  return {
    remote: {
      address: formatAddress(parsed),
      port,
      addressType: parsed.family,
    },
  };
};
