/**
 * IP address parsing, canonicalisation, and CIDR matching.
 *
 * Addresses are held as bytes -- 4 for IPv4, 16 for IPv6 -- so both families
 * share one prefix-comparison path. Invalid input is always rejected, never
 * coerced to a default address.
 */

/**
 * A parsed IP address.
 */
export interface Address {
  /**
   * The address as bytes: 4 for IPv4, 16 for IPv6.
   */
  bytes: Uint8Array;

  /**
   * The address family.
   */
  family: "IPv4" | "IPv6";
}

/**
 * A parsed CIDR range.
 */
export interface Cidr extends Address {
  /**
   * The prefix length, in bits.
   */
  prefix: number;
}

/**
 * Parse a dotted-quad IPv4 address into its four bytes.
 *
 * Leading zeros are rejected, since they read as octal to some parsers and
 * decimal to others.
 *
 * @param value The candidate address.
 *
 * @returns The four bytes, or undefined if invalid.
 */
const parseIpv4 = (value: string): Uint8Array | undefined => {
  const parts = value.split(".");

  if (parts.length !== 4) {
    return undefined;
  }

  const bytes = new Uint8Array(4);

  for (let index = 0; index < 4; index++) {
    const part = parts[index];

    if (!/^\d{1,3}$/.test(part)) {
      return undefined;
    }

    if (part.length > 1 && part.startsWith("0")) {
      return undefined;
    }

    const octet = Number(part);

    if (octet > 255) {
      return undefined;
    }

    bytes[index] = octet;
  }

  return bytes;
};

/**
 * Convert a run of IPv6 groups into bytes.
 *
 * @param groups The colon-separated groups to convert.
 * @param allowEmbeddedIpv4 Whether the final group may be a dotted-quad address.
 *
 * @returns The bytes for these groups, or undefined if any group is invalid.
 */
const groupsToBytes = (
  groups: string[],
  allowEmbeddedIpv4: boolean,
): Uint8Array | undefined => {
  const bytes: number[] = [];

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];

    if (group.includes(".")) {
      // An embedded IPv4 address is only valid as the last two groups.
      if (!allowEmbeddedIpv4 || index !== groups.length - 1) {
        return undefined;
      }

      const embedded = parseIpv4(group);

      if (!embedded) {
        return undefined;
      }

      bytes.push(...embedded);

      continue;
    }

    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) {
      return undefined;
    }

    const hextet = parseInt(group, 16);

    bytes.push(hextet >> 8, hextet & 0xff);
  }

  return new Uint8Array(bytes);
};

/**
 * Parse an IPv6 address into its sixteen bytes.
 *
 * A zone identifier (`fe80::1%en0`) is stripped, as it names a local interface
 * rather than part of the address.
 *
 * @param value The candidate address.
 *
 * @returns The sixteen bytes, or undefined if invalid.
 */
const parseIpv6 = (value: string): Uint8Array | undefined => {
  const zoned = value.indexOf("%");
  const address = zoned === -1 ? value : value.slice(0, zoned);

  const halves = address.split("::");

  // "::" compresses a run of zero groups, so it may appear at most once.
  if (halves.length > 2) {
    return undefined;
  }

  if (halves.length === 1) {
    const bytes = groupsToBytes(address.split(":"), true);

    return bytes?.length === 16 ? bytes : undefined;
  }

  const head = halves[0] === "" ? [] : halves[0].split(":");
  const tail = halves[1] === "" ? [] : halves[1].split(":");

  const headBytes = groupsToBytes(head, false);
  const tailBytes = groupsToBytes(tail, true);

  if (!headBytes || !tailBytes) {
    return undefined;
  }

  const zeros = 16 - headBytes.length - tailBytes.length;

  // "::" must stand for at least one group of zeros.
  if (zeros < 2) {
    return undefined;
  }

  const bytes = new Uint8Array(16);

  bytes.set(headBytes, 0);
  bytes.set(tailBytes, headBytes.length + zeros);

  return bytes;
};

/**
 * Whether these bytes are an IPv4-mapped IPv6 address (`::ffff:a.b.c.d`).
 *
 * @param bytes The sixteen bytes of an IPv6 address.
 *
 * @returns Whether the address maps an IPv4 address.
 */
const isIpv4Mapped = (bytes: Uint8Array): boolean => {
  for (let index = 0; index < 10; index++) {
    if (bytes[index] !== 0) {
      return false;
    }
  }

  return bytes[10] === 0xff && bytes[11] === 0xff;
};

/**
 * Parse an IP address of either family.
 *
 * An IPv4-mapped IPv6 address is reduced to its IPv4 form.
 *
 * @param value The candidate address.
 *
 * @returns The parsed address, or undefined if invalid.
 */
export const parseAddress = (value: string): Address | undefined => {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  if (trimmed.includes(":")) {
    const bytes = parseIpv6(trimmed);

    if (!bytes) {
      return undefined;
    }

    if (isIpv4Mapped(bytes)) {
      return { bytes: bytes.slice(12), family: "IPv4" };
    }

    return { bytes, family: "IPv6" };
  }

  const bytes = parseIpv4(trimmed);

  return bytes ? { bytes, family: "IPv4" } : undefined;
};

/**
 * Render IPv6 bytes in the canonical form of RFC 5952: lowercase, no leading
 * zeros, and the longest run of zero groups replaced by "::".
 *
 * @param bytes The sixteen bytes of an IPv6 address.
 *
 * @returns The canonical text form.
 */
const formatIpv6 = (bytes: Uint8Array): string => {
  const groups: number[] = [];

  for (let index = 0; index < 16; index += 2) {
    groups.push((bytes[index] << 8) | bytes[index + 1]);
  }

  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;

  for (let index = 0; index <= groups.length; index++) {
    if (index < groups.length && groups[index] === 0) {
      if (runStart === -1) {
        runStart = index;
      }

      continue;
    }

    if (runStart !== -1) {
      const length = index - runStart;

      // Strictly greater, so the leftmost of two equal runs wins.
      if (length > bestLength) {
        bestStart = runStart;
        bestLength = length;
      }

      runStart = -1;
    }
  }

  // A lone zero group is written as "0", not compressed.
  if (bestLength < 2) {
    return groups.map((group) => group.toString(16)).join(":");
  }

  const head = groups.slice(0, bestStart).map((group) => group.toString(16));
  const tail = groups.slice(bestStart + bestLength).map((group) =>
    group.toString(16)
  );

  return `${head.join(":")}::${tail.join(":")}`;
};

/**
 * Render a parsed address in canonical text form.
 *
 * @param address The parsed address.
 *
 * @returns The canonical text form.
 */
export const formatAddress = (address: Address): string =>
  address.family === "IPv4"
    ? address.bytes.join(".")
    : formatIpv6(address.bytes);

/**
 * Canonicalise an IP address into one stable text form.
 *
 * Collapses the many spellings of a single host, so an address is safe to use as
 * a key. Accepts a bare address only -- a trailing port or surrounding brackets
 * are not recognised and yield undefined.
 *
 * @param value The address to canonicalise.
 *
 * @returns The canonical form, or undefined if the value is not an IP address.
 */
export const canonicaliseAddress = (value: string): string | undefined => {
  const address = parseAddress(value);

  return address ? formatAddress(address) : undefined;
};

/**
 * Parse a CIDR range, or a bare address treated as a single host.
 *
 * Host bits below the prefix are ignored, so `10.0.0.1/8` and `10.0.0.0/8`
 * describe the same range.
 *
 * @param value The candidate range or address.
 *
 * @returns The parsed range, or undefined if invalid.
 */
export const parseCidr = (value: string): Cidr | undefined => {
  const trimmed = value.trim();
  const slash = trimmed.indexOf("/");
  const text = slash === -1 ? trimmed : trimmed.slice(0, slash);

  const address = parseAddress(text);

  if (!address) {
    return undefined;
  }

  // An IPv4-mapped range would measure its prefix against the wrong family's bit
  // length, so the dotted-quad form is required instead of guessing which was
  // meant.
  if (address.family === "IPv4" && text.includes(":")) {
    return undefined;
  }

  if (slash === -1) {
    return { ...address, prefix: address.bytes.length * 8 };
  }

  const rawPrefix = trimmed.slice(slash + 1);

  // Rejects "/08" and "/+8" as well as non-numeric prefixes.
  if (!/^(0|[1-9]\d*)$/.test(rawPrefix)) {
    return undefined;
  }

  const prefix = Number(rawPrefix);

  if (prefix > address.bytes.length * 8) {
    return undefined;
  }

  return { ...address, prefix };
};

/**
 * Whether two byte sequences share their leading bits.
 *
 * @param left The first byte sequence.
 * @param right The second byte sequence.
 * @param prefix The number of leading bits to compare.
 *
 * @returns Whether the leading bits match.
 */
const matchesPrefix = (
  left: Uint8Array,
  right: Uint8Array,
  prefix: number,
): boolean => {
  const wholeBytes = prefix >> 3;

  for (let index = 0; index < wholeBytes; index++) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  const remainingBits = prefix & 7;

  if (remainingBits === 0) {
    return true;
  }

  const mask = (0xff << (8 - remainingBits)) & 0xff;

  return (left[wholeBytes] & mask) === (right[wholeBytes] & mask);
};

/**
 * Whether an address falls inside a CIDR range.
 *
 * Families must match, so an IPv6 address never matches an IPv4 range. An
 * unparseable address matches nothing.
 *
 * @param address The address to test, as text or already parsed.
 * @param range The range to test against.
 *
 * @returns Whether the address falls inside the range.
 */
export const inCidr = (address: string | Address, range: Cidr): boolean => {
  const parsed = typeof address === "string" ? parseAddress(address) : address;

  if (!parsed || parsed.family !== range.family) {
    return false;
  }

  return matchesPrefix(parsed.bytes, range.bytes, range.prefix);
};
