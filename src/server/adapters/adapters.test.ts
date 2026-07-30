/// <reference lib="deno.ns" />
// deno-lint-ignore-file

import { assertEquals, assertThrows } from "jsr:@std/assert";

import type { ConnInfo } from "@raptor/types";

import ServerError from "../../error/server-error.ts";

import BunServer from "./bun.ts";
import DenoServer from "./deno.ts";
import NodeServer from "./node.ts";

/**
 * Read the connection an adapter builds, by reaching past its private modifier.
 */
// deno-lint-ignore no-explicit-any
const connInfoOf = (adapter: any, ...args: unknown[]): ConnInfo | undefined =>
  adapter.toConnInfo(...args);

Deno.test("node adapter reads the socket peer", () => {
  const connection = connInfoOf(new NodeServer(), {
    socket: { remoteAddress: "203.0.113.5", remotePort: 51234 },
  });

  assertEquals(connection?.remote.address, "203.0.113.5");
  assertEquals(connection?.remote.port, 51234);
  assertEquals(connection?.remote.addressType, "IPv4");
});

Deno.test("node adapter normalises an IPv4-mapped peer to IPv4", () => {
  // A dual-stack listener reports an IPv4 client this way; left alone it would
  // key as a different caller.
  const connection = connInfoOf(new NodeServer(), {
    socket: { remoteAddress: "::ffff:127.0.0.1", remotePort: 1 },
  });

  assertEquals(connection?.remote.address, "127.0.0.1");
  assertEquals(connection?.remote.addressType, "IPv4");
});

Deno.test("node adapter reports an IPv6 peer as IPv6", () => {
  const connection = connInfoOf(new NodeServer(), {
    socket: { remoteAddress: "2001:DB8::1", remotePort: 2 },
  });

  assertEquals(connection?.remote.address, "2001:db8::1");
  assertEquals(connection?.remote.addressType, "IPv6");
});

Deno.test("node adapter yields nothing when the socket has no peer", () => {
  const connection = connInfoOf(new NodeServer(), { socket: {} });

  assertEquals(connection, undefined);
});

Deno.test("bun adapter reads the peer from the server handle", () => {
  const connection = connInfoOf(
    new BunServer(),
    {
      requestIP: () => ({
        address: "198.51.100.9",
        port: 443,
        family: "IPv4",
      }),
    },
    new Request("http://localhost"),
  );

  assertEquals(connection?.remote.address, "198.51.100.9");
  assertEquals(connection?.remote.port, 443);
});

Deno.test("bun adapter yields nothing when requestIP returns null", () => {
  // Bun returns null for a closed connection or a unix socket.
  const connection = connInfoOf(
    new BunServer(),
    { requestIP: () => null },
    new Request("http://localhost"),
  );

  assertEquals(connection, undefined);
});

Deno.test("bun adapter yields nothing when the handle cannot report an address", () => {
  const connection = connInfoOf(
    new BunServer(),
    {},
    new Request("http://localhost"),
  );

  assertEquals(connection, undefined);
});

Deno.test("bun adapter normalises an IPv4-mapped peer to IPv4", () => {
  const connection = connInfoOf(
    new BunServer(),
    {
      requestIP: () => ({
        address: "::ffff:10.0.0.4",
        port: 80,
        family: "IPv6",
      }),
    },
    new Request("http://localhost"),
  );

  assertEquals(connection?.remote.address, "10.0.0.4");
  assertEquals(connection?.remote.addressType, "IPv4");
});

Deno.test("deno adapter reads the remote address", () => {
  const connection = connInfoOf(new DenoServer(), {
    remoteAddr: { transport: "tcp", hostname: "203.0.113.9", port: 8080 },
  });

  assertEquals(connection?.remote.address, "203.0.113.9");
  assertEquals(connection?.remote.port, 8080);
  assertEquals(connection?.remote.addressType, "IPv4");
});

Deno.test("deno adapter yields nothing for a unix socket", () => {
  // A unix address has no hostname at all.
  const connection = connInfoOf(new DenoServer(), {
    remoteAddr: { transport: "unix", path: "/tmp/raptor.sock" },
  });

  assertEquals(connection, undefined);
});

Deno.test("deno adapter yields nothing when info is absent", () => {
  assertEquals(connInfoOf(new DenoServer(), undefined), undefined);
  assertEquals(connInfoOf(new DenoServer(), {}), undefined);
});

Deno.test("deno adapter reports an IPv6 peer as IPv6", () => {
  const connection = connInfoOf(new DenoServer(), {
    remoteAddr: { transport: "tcp", hostname: "2001:db8::5", port: 1 },
  });

  assertEquals(connection?.remote.address, "2001:db8::5");
  assertEquals(connection?.remote.addressType, "IPv6");
});

Deno.test("adapters yield nothing for a peer address that is not an IP", () => {
  assertEquals(
    connInfoOf(new NodeServer(), { socket: { remoteAddress: "/tmp/x.sock" } }),
    undefined,
  );

  assertEquals(
    connInfoOf(
      new BunServer(),
      { requestIP: () => ({ address: "nonsense", port: 1, family: "IPv4" }) },
      new Request("http://localhost"),
    ),
    undefined,
  );

  assertEquals(
    connInfoOf(new DenoServer(), {
      remoteAddr: { transport: "tcp", hostname: "nonsense", port: 1 },
    }),
    undefined,
  );
});

/**
 * Read the authority an adapter would use, by reaching past its private modifier.
 */
// deno-lint-ignore no-explicit-any
const hostOf = (headers: unknown, authority = "configured.example:8080") =>
  (new NodeServer() as any).hostFor({ headers }, authority);

Deno.test("bun adapter refuses to serve when bun is absent", () => {
  // The guard compared the global against the string "undefined", so it never
  // fired and the adapter failed later and less clearly.
  assertThrows(
    () => new BunServer().serve(() => Promise.resolve(new Response())),
    ServerError,
  );
});

Deno.test("node adapter uses a well-formed host header", () => {
  assertEquals(hostOf({ host: "example.com" }), "example.com");
  assertEquals(hostOf({ host: "example.com:3000" }), "example.com:3000");
  assertEquals(hostOf({ host: "127.0.0.1:80" }), "127.0.0.1:80");
  assertEquals(hostOf({ host: "[2001:db8::1]:443" }), "[2001:db8::1]:443");
  assertEquals(hostOf({ host: "  example.com  " }), "example.com");
});

Deno.test("node adapter falls back when there is no host header", () => {
  // Otherwise the URL reads as the literal host "undefined".
  assertEquals(hostOf({}), "configured.example:8080");
});

Deno.test("node adapter falls back for a malformed host header", () => {
  const malformed = [
    "exam ple.com",
    "example.com/../evil",
    "http://example.com",
    "example.com:notaport",
    "",
    "   ",
    "exa\u0000mple.com",
    "example.com?x=1",
    "a".repeat(300),
  ];

  for (const host of malformed) {
    assertEquals(hostOf({ host }), "configured.example:8080", host);
  }
});

Deno.test("node adapter refuses a repeated host header", () => {
  // Arrives as a list; an ambiguous authority is a smuggling signal.
  assertEquals(
    hostOf({ host: ["example.com", "evil.example"] }),
    "configured.example:8080",
  );
});

Deno.test("node adapter builds the fallback authority from server options", () => {
  // deno-lint-ignore no-explicit-any
  const authorityFor = (options: unknown) =>
    (new NodeServer() as any).authorityFor(options);

  assertEquals(authorityFor(undefined), "localhost");
  assertEquals(authorityFor({ port: 8000 }), "localhost:8000");
  assertEquals(authorityFor({ hostname: "example.com" }), "example.com");
  assertEquals(
    authorityFor({ hostname: "example.com", port: 443 }),
    "example.com:443",
  );
  assertEquals(authorityFor({ hostname: "::1", port: 80 }), "[::1]:80");
});
