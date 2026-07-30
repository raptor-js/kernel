/// <reference lib="deno.ns" />
// deno-lint-ignore-file

import { assertEquals, assertThrows } from "jsr:@std/assert";

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

Deno.test("returns the socket peer when no proxy is trusted", () => {
  const context = contextFor("203.0.113.5");

  assertEquals(clientAddress(context), "203.0.113.5");
});

Deno.test("ignores x-forwarded-for entirely by default", () => {
  const context = contextFor("203.0.113.5", "198.51.100.9");

  assertEquals(clientAddress(context), "203.0.113.5");
});

Deno.test("ignores x-forwarded-for when the hop count is zero", () => {
  const context = contextFor("203.0.113.5", "198.51.100.9");

  assertEquals(clientAddress(context, 0), "203.0.113.5");
});

Deno.test("returns undefined when the runtime exposes no connection", () => {
  const context = contextFor(undefined, "198.51.100.9");

  assertEquals(clientAddress(context), undefined);
});

Deno.test("returns undefined when the socket address cannot be parsed", () => {
  const context = contextFor("not-an-address");

  assertEquals(clientAddress(context), undefined);
});

Deno.test("canonicalises the address it returns", () => {
  const context = contextFor("::ffff:192.168.0.9");

  assertEquals(clientAddress(context), "192.168.0.9");
});

Deno.test("trusts one hop and returns the address beyond it", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9");

  assertEquals(clientAddress(context, 1), "198.51.100.9");
});

Deno.test("walks the chain right to left as hops are trusted", () => {
  const context = contextFor(
    "10.0.0.1",
    "203.0.113.7, 198.51.100.9, 10.0.0.2",
  );

  assertEquals(clientAddress(context, 1), "10.0.0.2");
  assertEquals(clientAddress(context, 2), "198.51.100.9");
  assertEquals(clientAddress(context, 3), "203.0.113.7");
});

Deno.test("stops at the leftmost entry when more hops are trusted than exist", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9");

  assertEquals(clientAddress(context, 10), "198.51.100.9");
});

Deno.test("a forged chain cannot escape the trust boundary", () => {
  const context = contextFor(
    "10.0.0.1",
    "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4",
  );

  assertEquals(clientAddress(context, 1), "4.4.4.4");
});

Deno.test("trusts hops inside the configured CIDR ranges", () => {
  const context = contextFor(
    "10.0.0.1",
    "198.51.100.9, 10.0.0.2",
  );

  assertEquals(clientAddress(context, ["10.0.0.0/8"]), "198.51.100.9");
});

Deno.test("stops at the first hop outside the configured ranges", () => {
  const context = contextFor(
    "10.0.0.1",
    "203.0.113.7, 198.51.100.9, 10.0.0.2",
  );

  assertEquals(clientAddress(context, ["10.0.0.0/8"]), "198.51.100.9");
});

Deno.test("an empty CIDR list trusts nothing", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9");

  assertEquals(clientAddress(context, []), "10.0.0.1");
});

Deno.test("trusts an IPv6 proxy by range", () => {
  const context = contextFor("2001:db8::1", "198.51.100.9");

  assertEquals(clientAddress(context, ["2001:db8::/32"]), "198.51.100.9");
});

Deno.test("strips a port from a forwarded entry", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9:54321");

  assertEquals(clientAddress(context, 1), "198.51.100.9");
});

Deno.test("strips brackets and port from a forwarded IPv6 entry", () => {
  const context = contextFor("10.0.0.1", "[2001:db8::1]:443");

  assertEquals(clientAddress(context, 1), "2001:db8::1");
});

Deno.test("handles a bracketed IPv6 entry with no port", () => {
  const context = contextFor("10.0.0.1", "[2001:db8::1]");

  assertEquals(clientAddress(context, 1), "2001:db8::1");
});

Deno.test("skips blank forwarded entries", () => {
  const context = contextFor("10.0.0.1", "198.51.100.9, , ");

  assertEquals(clientAddress(context, 1), "198.51.100.9");
});

Deno.test("never advances onto a hop that is not an address", () => {
  const context = contextFor("10.0.0.1", "nonsense");

  assertEquals(clientAddress(context, 1), "10.0.0.1");
});

Deno.test("stops at the last real address when a junk hop follows it", () => {
  // Reachable on a correct CIDR policy: a caller inside the trusted range can
  // append anything.
  const context = contextFor("10.0.0.1", "junk, 10.0.0.7");

  assertEquals(clientAddress(context, ["10.0.0.0/8"]), "10.0.0.7");
});

Deno.test("a junk hop cannot make the result undefined", () => {
  const forged = [
    "nonsense",
    "/var/run/x",
    "",
    "999.999.999.999",
    "10.0.0.7, nonsense",
  ];

  for (const header of forged) {
    const context = contextFor("10.0.0.1", header);

    assertEquals(
      typeof clientAddress(context, ["10.0.0.0/8"]),
      "string",
      header,
    );
    assertEquals(typeof clientAddress(context, 3), "string", header);
  }
});

Deno.test("does not step over a junk hop to a real address beyond it", () => {
  // The chain is malformed from the junk outwards, so nothing past it counts.
  const context = contextFor("10.0.0.1", "203.0.113.7, junk, 10.0.0.7");

  assertEquals(clientAddress(context, 4), "10.0.0.7");
});

Deno.test("treats an absent header as an empty chain", () => {
  const context = contextFor("10.0.0.1");

  assertEquals(clientAddress(context, 5), "10.0.0.1");
});

Deno.test("caps the number of forwarded entries considered", () => {
  // Distinct hops and a trust count above the cap, so removing the cap changes
  // the answer. Hops are read nearest-first, so hop 64 is the last kept.
  const hops = Array.from({ length: 200 }, (_, index) => `10.1.${index}.1`);
  const context = contextFor("10.0.0.1", hops.join(", "));

  assertEquals(clientAddress(context, 300), "10.1.136.1");
});

Deno.test("bounds scanning of a header padded with empty entries", () => {
  const context = contextFor("10.0.0.1", ",".repeat(8000));

  assertEquals(clientAddress(context, 1), "10.0.0.1");
});

Deno.test("compiled trust is reusable across requests", () => {
  const trusted = compileTrust(["10.0.0.0/8"]);

  const first = contextFor("10.0.0.1", "198.51.100.9, 10.0.0.2");
  const second = contextFor("10.0.0.1", "203.0.113.7, 10.0.0.3");

  assertEquals(clientAddress(first, trusted), "198.51.100.9");
  assertEquals(clientAddress(second, trusted), "203.0.113.7");
});

Deno.test("compiling an invalid CIDR range throws", () => {
  assertThrows(
    () => compileTrust(["10.0.0.0/33"]),
    Error,
    "Invalid trusted proxy CIDR range",
  );
});

Deno.test("compiling an invalid hop count throws", () => {
  assertThrows(() => compileTrust(-1), Error, "non-negative integer");
  assertThrows(() => compileTrust(1.5), Error, "non-negative integer");
});

Deno.test("compiling a range that matches every address throws", () => {
  for (const range of ["0.0.0.0/0", "::/0", "1.2.3.4/0"]) {
    assertThrows(
      () => compileTrust([range]),
      Error,
      "matches every address",
    );
  }
});

Deno.test("compiling a non-policy value throws", () => {
  assertThrows(
    // deno-lint-ignore no-explicit-any
    () => compileTrust("10.0.0.0/8" as any),
    Error,
    "must be false, a hop count, or a list of CIDR ranges",
  );
});

Deno.test("compile errors name the position, not the configured value", () => {
  // The message can reach a client through an error response.
  try {
    compileTrust(["10.0.0.0/8", "192.168.0.0/99"]);
  } catch (error) {
    const message = (error as Error).message;

    assertEquals(message.includes("index 1"), true);
    assertEquals(message.includes("192.168"), false);
  }
});

Deno.test("an unparseable hop is never trusted", () => {
  const trusted = compileTrust(["0.0.0.0/1"]);

  assertEquals(trusted("nonsense", 0), false);
  assertEquals(trusted("", 0), false);
});
