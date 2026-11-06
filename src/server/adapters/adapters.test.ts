import assert from "node:assert/strict";
import { test } from "node:test";

import type { ConnInfo } from "@raptor-js/types";

import ServerError from "../../error/server-error.ts";
import { createResponse } from "../../response/raw-body.ts";

import BunServer from "./bun.ts";
import DenoServer from "./deno.ts";
import NodeServer from "./node.ts";

/**
 * Read the connection an adapter builds, by reaching past its private modifier.
 */
const connInfoOf = (adapter: any, ...args: unknown[]): ConnInfo | undefined =>
  adapter.toConnInfo(...args);

test("node adapter reads the socket peer", () => {
  const connection = connInfoOf(new NodeServer(), {
    socket: { remoteAddress: "203.0.113.5", remotePort: 51234 },
  });

  assert.deepStrictEqual(connection?.remote.address, "203.0.113.5");
  assert.deepStrictEqual(connection?.remote.port, 51234);
  assert.deepStrictEqual(connection?.remote.addressType, "IPv4");
});

test("node adapter normalises an IPv4-mapped peer to IPv4", () => {
  // A dual-stack listener reports an IPv4 client this way; left alone it would
  // key as a different caller.
  const connection = connInfoOf(new NodeServer(), {
    socket: { remoteAddress: "::ffff:127.0.0.1", remotePort: 1 },
  });

  assert.deepStrictEqual(connection?.remote.address, "127.0.0.1");
  assert.deepStrictEqual(connection?.remote.addressType, "IPv4");
});

test("node adapter reports an IPv6 peer as IPv6", () => {
  const connection = connInfoOf(new NodeServer(), {
    socket: { remoteAddress: "2001:DB8::1", remotePort: 2 },
  });

  assert.deepStrictEqual(connection?.remote.address, "2001:db8::1");
  assert.deepStrictEqual(connection?.remote.addressType, "IPv6");
});

test("node adapter yields nothing when the socket has no peer", () => {
  const connection = connInfoOf(new NodeServer(), { socket: {} });

  assert.deepStrictEqual(connection, undefined);
});

test("bun adapter reads the peer from the server handle", () => {
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

  assert.deepStrictEqual(connection?.remote.address, "198.51.100.9");
  assert.deepStrictEqual(connection?.remote.port, 443);
});

test("bun adapter yields nothing when requestIP returns null", () => {
  // Bun returns null for a closed connection or a unix socket.
  const connection = connInfoOf(
    new BunServer(),
    { requestIP: () => null },
    new Request("http://localhost"),
  );

  assert.deepStrictEqual(connection, undefined);
});

test("bun adapter yields nothing when the handle cannot report an address", () => {
  const connection = connInfoOf(
    new BunServer(),
    {},
    new Request("http://localhost"),
  );

  assert.deepStrictEqual(connection, undefined);
});

test("bun adapter normalises an IPv4-mapped peer to IPv4", () => {
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

  assert.deepStrictEqual(connection?.remote.address, "10.0.0.4");
  assert.deepStrictEqual(connection?.remote.addressType, "IPv4");
});

test("deno adapter reads the remote address", () => {
  const connection = connInfoOf(new DenoServer(), {
    remoteAddr: { transport: "tcp", hostname: "203.0.113.9", port: 8080 },
  });

  assert.deepStrictEqual(connection?.remote.address, "203.0.113.9");
  assert.deepStrictEqual(connection?.remote.port, 8080);
  assert.deepStrictEqual(connection?.remote.addressType, "IPv4");
});

test("deno adapter yields nothing for a unix socket", () => {
  // A unix address has no hostname at all.
  const connection = connInfoOf(new DenoServer(), {
    remoteAddr: { transport: "unix", path: "/tmp/raptor.sock" },
  });

  assert.deepStrictEqual(connection, undefined);
});

test("deno adapter yields nothing when info is absent", () => {
  assert.deepStrictEqual(connInfoOf(new DenoServer(), undefined), undefined);
  assert.deepStrictEqual(connInfoOf(new DenoServer(), {}), undefined);
});

test("deno adapter reports an IPv6 peer as IPv6", () => {
  const connection = connInfoOf(new DenoServer(), {
    remoteAddr: { transport: "tcp", hostname: "2001:db8::5", port: 1 },
  });

  assert.deepStrictEqual(connection?.remote.address, "2001:db8::5");
  assert.deepStrictEqual(connection?.remote.addressType, "IPv6");
});

test("adapters yield nothing for a peer address that is not an IP", () => {
  assert.deepStrictEqual(
    connInfoOf(new NodeServer(), { socket: { remoteAddress: "/tmp/x.sock" } }),
    undefined,
  );

  assert.deepStrictEqual(
    connInfoOf(
      new BunServer(),
      { requestIP: () => ({ address: "nonsense", port: 1, family: "IPv4" }) },
      new Request("http://localhost"),
    ),
    undefined,
  );

  assert.deepStrictEqual(
    connInfoOf(new DenoServer(), {
      remoteAddr: { transport: "tcp", hostname: "nonsense", port: 1 },
    }),
    undefined,
  );
});

/**
 * Read the authority an adapter would use, by reaching past its private modifier.
 */
const hostOf = (headers: unknown, authority = "configured.example:8080") =>
  (new NodeServer() as any).hostFor({ headers }, authority);

test("bun adapter refuses to serve when bun is absent", () => {
  // The guard compared the global against the string "undefined", so it never
  // fired and the adapter failed later and less clearly.
  assert.throws(
    () => new BunServer().serve(() => Promise.resolve(new Response())),
    ServerError,
  );
});

test("node adapter uses a well-formed host header", () => {
  assert.deepStrictEqual(hostOf({ host: "example.com" }), "example.com");
  assert.deepStrictEqual(
    hostOf({ host: "example.com:3000" }),
    "example.com:3000",
  );
  assert.deepStrictEqual(hostOf({ host: "127.0.0.1:80" }), "127.0.0.1:80");
  assert.deepStrictEqual(
    hostOf({ host: "[2001:db8::1]:443" }),
    "[2001:db8::1]:443",
  );
  assert.deepStrictEqual(hostOf({ host: "  example.com  " }), "example.com");
});

test("node adapter falls back when there is no host header", () => {
  // Otherwise the URL reads as the literal host "undefined".
  assert.deepStrictEqual(hostOf({}), "configured.example:8080");
});

test("node adapter falls back for a malformed host header", () => {
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
    assert.deepStrictEqual(hostOf({ host }), "configured.example:8080", host);
  }
});

test("node adapter refuses a repeated host header", () => {
  // Arrives as a list; an ambiguous authority is a smuggling signal.
  assert.deepStrictEqual(
    hostOf({ host: ["example.com", "evil.example"] }),
    "configured.example:8080",
  );
});

test("node adapter builds the fallback authority from server options", () => {
  const authorityFor = (options: unknown) =>
    (new NodeServer() as any).authorityFor(options);

  assert.deepStrictEqual(authorityFor(undefined), "localhost");
  assert.deepStrictEqual(authorityFor({ port: 8000 }), "localhost:8000");
  assert.deepStrictEqual(
    authorityFor({ hostname: "example.com" }),
    "example.com",
  );
  assert.deepStrictEqual(
    authorityFor({ hostname: "example.com", port: 443 }),
    "example.com:443",
  );
  assert.deepStrictEqual(
    authorityFor({ hostname: "::1", port: 80 }),
    "[::1]:80",
  );
});

/**
 * Write a web response through the node adapter and record what reached the socket.
 */
const writeThroughNode = async (response: Response) => {
  const calls: string[] = [];

  const nodeResponse = {
    statusCode: 0,
    setHeader: () => {},
    write: (chunk: Uint8Array) =>
      calls.push(`write ${new TextDecoder().decode(chunk)}`),
    end: (chunk?: Uint8Array | string) => {
      if (chunk === undefined) return calls.push("end");

      const text =
        typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);

      return calls.push(`end ${text}`);
    },
  };

  await (new NodeServer() as any).fromWebResponse(response, nodeResponse);

  return { calls, status: nodeResponse.statusCode };
};

test("node adapter sends a whole body in a single end call", async () => {
  const { calls, status } = await writeThroughNode(
    new Response("OK", { status: 201 }),
  );

  assert.deepStrictEqual(calls, ["end OK"]);
  assert.deepStrictEqual(status, 201);
});

test("node adapter ends a response that has no body", async () => {
  const { calls } = await writeThroughNode(new Response(null, { status: 204 }));

  assert.deepStrictEqual(calls, ["end"]);
});

test("node adapter streams a body that arrives in several chunks", async () => {
  const encoder = new TextEncoder();

  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("a"));
      controller.enqueue(encoder.encode("b"));
      controller.enqueue(encoder.encode("c"));
      controller.close();
    },
  });

  const { calls } = await writeThroughNode(new Response(body));

  assert.deepStrictEqual(calls, ["write a", "write b", "write c", "end"]);
});

test("node adapter writes a built-in response's text without reading its stream", async () => {
  const response = createResponse("OK", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });

  const { calls } = await writeThroughNode(response);

  assert.deepStrictEqual(calls, ["end OK"]);
  assert.deepStrictEqual(response.bodyUsed, false);
});
