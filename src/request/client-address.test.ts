import assert from "node:assert/strict";
import { test } from "node:test";

import Context from "../context.ts";
import { clientAddress, compileTrust } from "./client-address.ts";

/**
 * Build a context with a known socket peer and optional forwarded header.
 */
const contextFor = (address?: string, forwardedFor?: string): Context => {
  const headers = new Headers();

  if (forwardedFor !== undefined) {
    headers.set("x-forwarded-for", forwardedFor);
  }

  return new Context(
    new Request("http://localhost", { headers }),
    new Response(),
    address ? { remote: { address } } : undefined,
  );
};

test("returns the socket peer when no proxy is trusted", () => {
  const context = contextFor("203.0.113.5");

  assert.deepStrictEqual(clientAddress(context), "203.0.113.5");
});

test("ignores x-forwarded-for entirely by default", () => {
  const context = contextFor("203.0.113.5", "198.51.100.9");

  assert.deepStrictEqual(clientAddress(context), "203.0.113.5");
});

test("ignores x-forwarded-for when the hop count is zero", () => {
  const context = contextFor("203.0.113.5", "198.51.100.9");

  assert.deepStrictEqual(clientAddress(context, 0), "203.0.113.5");
});

test("returns undefined when the runtime exposes no connection", () => {
  const context = contextFor(undefined, "198.51.100.9");

  assert.deepStrictEqual(clientAddress(context), undefined);
});

test("returns undefined when the socket address cannot be parsed", () => {
  const context = contextFor("not-an-address");

  assert.deepStrictEqual(clientAddress(context), undefined);
});

test("canonicalises the address it returns", () => {
  const context = contextFor("::ffff:192.168.0.9");

  assert.deepStrictEqual(clientAddress(context), "192.168.0.9");
});

test("trusts one hop and returns the address beyond it", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9");

  assert.deepStrictEqual(clientAddress(context, 1), "198.51.100.9");
});

test("walks the chain right to left as hops are trusted", () => {
  const context = contextFor("10.0.0.1", "203.0.113.7, 198.51.100.9, 10.0.0.2");

  assert.deepStrictEqual(clientAddress(context, 1), "10.0.0.2");
  assert.deepStrictEqual(clientAddress(context, 2), "198.51.100.9");
  assert.deepStrictEqual(clientAddress(context, 3), "203.0.113.7");
});

test("stops at the leftmost entry when more hops are trusted than exist", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9");

  assert.deepStrictEqual(clientAddress(context, 10), "198.51.100.9");
});

test("a forged chain cannot escape the trust boundary", () => {
  const context = contextFor("10.0.0.1", "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4");

  assert.deepStrictEqual(clientAddress(context, 1), "4.4.4.4");
});

test("trusts hops inside the configured CIDR ranges", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9, 10.0.0.2");

  assert.deepStrictEqual(
    clientAddress(context, ["10.0.0.0/8"]),
    "198.51.100.9",
  );
});

test("stops at the first hop outside the configured ranges", () => {
  const context = contextFor("10.0.0.1", "203.0.113.7, 198.51.100.9, 10.0.0.2");

  assert.deepStrictEqual(
    clientAddress(context, ["10.0.0.0/8"]),
    "198.51.100.9",
  );
});

test("an empty CIDR list trusts nothing", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9");

  assert.deepStrictEqual(clientAddress(context, []), "10.0.0.1");
});

test("trusts an IPv6 proxy by range", () => {
  const context = contextFor("2001:db8::1", "198.51.100.9");

  assert.deepStrictEqual(
    clientAddress(context, ["2001:db8::/32"]),
    "198.51.100.9",
  );
});

test("strips a port from a forwarded entry", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9:54321");

  assert.deepStrictEqual(clientAddress(context, 1), "198.51.100.9");
});

test("strips brackets and port from a forwarded IPv6 entry", () => {
  const context = contextFor("10.0.0.1", "[2001:db8::1]:443");

  assert.deepStrictEqual(clientAddress(context, 1), "2001:db8::1");
});

test("handles a bracketed IPv6 entry with no port", () => {
  const context = contextFor("10.0.0.1", "[2001:db8::1]");

  assert.deepStrictEqual(clientAddress(context, 1), "2001:db8::1");
});

test("skips blank forwarded entries", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9, , ");

  assert.deepStrictEqual(clientAddress(context, 1), "198.51.100.9");
});

test("never advances onto a hop that is not an address", () => {
  const context = contextFor("10.0.0.1", "nonsense");

  assert.deepStrictEqual(clientAddress(context, 1), "10.0.0.1");
});

test("stops at the last real address when a junk hop follows it", () => {
  // Reachable on a correct CIDR policy: a caller inside the trusted range can
  // append anything.
  const context = contextFor("10.0.0.1", "junk, 10.0.0.7");

  assert.deepStrictEqual(clientAddress(context, ["10.0.0.0/8"]), "10.0.0.7");
});

test("a junk hop cannot make the result undefined", () => {
  const forged = [
    "nonsense",
    "/var/run/x",
    "",
    "999.999.999.999",
    "10.0.0.7, nonsense",
  ];

  for (const header of forged) {
    const context = contextFor("10.0.0.1", header);

    assert.deepStrictEqual(
      typeof clientAddress(context, ["10.0.0.0/8"]),
      "string",
      header,
    );
    assert.deepStrictEqual(typeof clientAddress(context, 3), "string", header);
  }
});

test("does not step over a junk hop to a real address beyond it", () => {
  // The chain is malformed from the junk outwards, so nothing past it counts.
  const context = contextFor("10.0.0.1", "203.0.113.7, junk, 10.0.0.7");

  assert.deepStrictEqual(clientAddress(context, 4), "10.0.0.7");
});

test("treats an absent header as an empty chain", () => {
  const context = contextFor("10.0.0.1");

  assert.deepStrictEqual(clientAddress(context, 5), "10.0.0.1");
});

test("caps the number of forwarded entries considered", () => {
  // Distinct hops and a trust count above the cap, so removing the cap changes
  // the answer. Hops are read nearest-first, so hop 64 is the last kept.
  const hops = Array.from({ length: 200 }, (_, index) => `10.1.${index}.1`);
  const context = contextFor("10.0.0.1", hops.join(", "));

  assert.deepStrictEqual(clientAddress(context, 300), "10.1.136.1");
});

test("bounds scanning of a header padded with empty entries", () => {
  const context = contextFor("10.0.0.1", ",".repeat(8000));

  assert.deepStrictEqual(clientAddress(context, 1), "10.0.0.1");
});

test("compiled trust is reusable across requests", () => {
  const trusted = compileTrust(["10.0.0.0/8"]);

  const first = contextFor("10.0.0.1", "198.51.100.9, 10.0.0.2");
  const second = contextFor("10.0.0.1", "203.0.113.7, 10.0.0.3");

  assert.deepStrictEqual(clientAddress(first, trusted), "198.51.100.9");
  assert.deepStrictEqual(clientAddress(second, trusted), "203.0.113.7");
});

test("compiling an invalid CIDR range throws", () => {
  assert.throws(
    () => compileTrust(["10.0.0.0/33"]),
    (error) =>
      error instanceof Error &&
      error.message.includes("Invalid trusted proxy CIDR range"),
  );
});

test("compiling an invalid hop count throws", () => {
  assert.throws(
    () => compileTrust(-1),
    (error) =>
      error instanceof Error && error.message.includes("non-negative integer"),
  );
  assert.throws(
    () => compileTrust(1.5),
    (error) =>
      error instanceof Error && error.message.includes("non-negative integer"),
  );
});

test("compiling a range that matches every address throws", () => {
  for (const range of ["0.0.0.0/0", "::/0", "1.2.3.4/0"]) {
    assert.throws(
      () => compileTrust([range]),
      (error) =>
        error instanceof Error &&
        error.message.includes("matches every address"),
    );
  }
});

test("compiling a non-policy value throws", () => {
  assert.throws(
    () => compileTrust("10.0.0.0/8" as any),
    (error) =>
      error instanceof Error &&
      error.message.includes(
        "must be false, a hop count, or a list of CIDR ranges",
      ),
  );
});

test("compile errors name the position, not the configured value", () => {
  // The message can reach a client through an error response.
  try {
    compileTrust(["10.0.0.0/8", "192.168.0.0/99"]);
  } catch (error) {
    const message = (error as Error).message;

    assert.deepStrictEqual(message.includes("index 1"), true);
    assert.deepStrictEqual(message.includes("192.168"), false);
  }
});

test("an unparseable hop is never trusted", () => {
  const trusted = compileTrust(["0.0.0.0/1"]);

  assert.deepStrictEqual(trusted("nonsense", 0), false);
  assert.deepStrictEqual(trusted("", 0), false);
});
