import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicaliseAddress, inCidr, parseAddress, parseCidr } from "./ip.ts";

test("parses a dotted-quad IPv4 address", () => {
  const address = parseAddress("192.168.1.10");

  assert.deepStrictEqual(address?.family, "IPv4");
  assert.deepStrictEqual(Array.from(address!.bytes), [192, 168, 1, 10]);
});

test("parses the IPv4 range bounds", () => {
  assert.deepStrictEqual(
    Array.from(parseAddress("0.0.0.0")!.bytes),
    [0, 0, 0, 0],
  );
  assert.deepStrictEqual(
    Array.from(parseAddress("255.255.255.255")!.bytes),
    [255, 255, 255, 255],
  );
});

test("rejects IPv4 octets with leading zeros", () => {
  // Octal to some parsers, decimal to others.
  assert.deepStrictEqual(parseAddress("010.0.0.1"), undefined);
  assert.deepStrictEqual(parseAddress("127.0.0.01"), undefined);
});

test("rejects out-of-range and malformed IPv4 addresses", () => {
  const invalid = [
    "256.0.0.1",
    "1.2.3",
    "1.2.3.4.5",
    "1.2.3.",
    ".1.2.3",
    "1.2.3.-4",
    "1.2.3.4a",
    "1.2.3.+4",
    "",
    "   ",
    "not-an-address",
  ];

  for (const value of invalid) {
    assert.deepStrictEqual(
      parseAddress(value),
      undefined,
      `expected ${value} to fail`,
    );
  }
});

test("parses a fully-specified IPv6 address", () => {
  const address = parseAddress("2001:0db8:0000:0000:0000:0000:0000:0001");

  assert.deepStrictEqual(address?.family, "IPv6");
  assert.deepStrictEqual(address!.bytes.length, 16);
  assert.deepStrictEqual(address!.bytes[0], 0x20);
  assert.deepStrictEqual(address!.bytes[15], 1);
});

test("parses IPv6 zero-run compression in every position", () => {
  assert.deepStrictEqual(
    Array.from(parseAddress("::")!.bytes),
    new Array(16).fill(0),
  );

  const loopback = parseAddress("::1")!;

  assert.deepStrictEqual(loopback.bytes[15], 1);
  assert.deepStrictEqual(
    Array.from(loopback.bytes.slice(0, 15)),
    new Array(15).fill(0),
  );

  const trailing = parseAddress("2001:db8::")!;

  assert.deepStrictEqual(trailing.bytes[0], 0x20);
  assert.deepStrictEqual(
    Array.from(trailing.bytes.slice(4)),
    new Array(12).fill(0),
  );

  const middle = parseAddress("2001:db8::1")!;

  assert.deepStrictEqual(middle.bytes[0], 0x20);
  assert.deepStrictEqual(middle.bytes[15], 1);
});

test("rejects more than one IPv6 zero-run compression", () => {
  assert.deepStrictEqual(parseAddress("2001::db8::1"), undefined);
  assert.deepStrictEqual(parseAddress("1:::2"), undefined);
});

test("rejects IPv6 compression standing for no groups at all", () => {
  assert.deepStrictEqual(parseAddress("1:2:3:4:5:6:7::8"), undefined);
});

test("rejects malformed IPv6 addresses", () => {
  const invalid = [
    "2001:db8:::1",
    "2001:db8:1",
    "12345::1",
    "2001:db8::1:2:3:4:5:6:7",
    "1:2:3:4:5:6:7",
    "2001:zz8::1",
    ":",
    "2001:db8:",
  ];

  for (const value of invalid) {
    assert.deepStrictEqual(
      parseAddress(value),
      undefined,
      `expected ${value} to fail`,
    );
  }
});

test("strips an IPv6 zone identifier", () => {
  assert.deepStrictEqual(canonicaliseAddress("fe80::1%en0"), "fe80::1");
});

test("reduces an IPv4-mapped IPv6 address to IPv4", () => {
  const address = parseAddress("::ffff:127.0.0.1");

  assert.deepStrictEqual(address?.family, "IPv4");
  assert.deepStrictEqual(Array.from(address!.bytes), [127, 0, 0, 1]);
});

test("parses an embedded IPv4 address in full IPv6 form", () => {
  const address = parseAddress("0:0:0:0:0:ffff:192.168.0.1");

  assert.deepStrictEqual(address?.family, "IPv4");
  assert.deepStrictEqual(Array.from(address!.bytes), [192, 168, 0, 1]);
});

test("rejects an embedded IPv4 address away from the end", () => {
  assert.deepStrictEqual(parseAddress("::1.2.3.4:ffff"), undefined);
  assert.deepStrictEqual(parseAddress("1.2.3.4::"), undefined);
});

test("canonicalises IPv4 to dotted quad", () => {
  assert.deepStrictEqual(canonicaliseAddress("192.168.1.1"), "192.168.1.1");
  assert.deepStrictEqual(canonicaliseAddress("::ffff:10.0.0.7"), "10.0.0.7");
});

test("canonicalises the many spellings of one IPv6 host to one string", () => {
  const spellings = [
    "2001:0db8:0000:0000:0000:0000:0000:0001",
    "2001:DB8::1",
    "2001:db8:0:0:0:0:0:1",
    "2001:db8::0:1",
  ];

  for (const spelling of spellings) {
    assert.deepStrictEqual(
      canonicaliseAddress(spelling),
      "2001:db8::1",
      spelling,
    );
  }
});

test("canonicalises the longest zero run, leftmost on a tie", () => {
  assert.deepStrictEqual(
    canonicaliseAddress("2001:0:0:1:0:0:0:1"),
    "2001:0:0:1::1",
  );
  assert.deepStrictEqual(
    canonicaliseAddress("1:0:0:2:0:0:3:4"),
    "1::2:0:0:3:4",
  );
  assert.deepStrictEqual(canonicaliseAddress("::"), "::");
});

test("canonicalises a single zero group without compressing it", () => {
  assert.deepStrictEqual(
    canonicaliseAddress("1:2:3:4:5:6:0:8"),
    "1:2:3:4:5:6:0:8",
  );
});

test("canonicalising rejects a non-address", () => {
  assert.deepStrictEqual(canonicaliseAddress("nonsense"), undefined);
  assert.deepStrictEqual(canonicaliseAddress(""), undefined);
});

test("parses a CIDR range", () => {
  const range = parseCidr("10.0.0.0/8");

  assert.deepStrictEqual(range?.family, "IPv4");
  assert.deepStrictEqual(range?.prefix, 8);
});

test("treats a bare address as a single host range", () => {
  assert.deepStrictEqual(parseCidr("10.0.0.1")?.prefix, 32);
  assert.deepStrictEqual(parseCidr("::1")?.prefix, 128);
});

test("ignores host bits below the CIDR prefix", () => {
  assert.deepStrictEqual(inCidr("10.9.8.7", parseCidr("10.0.0.1/8")!), true);
});

test("rejects malformed CIDR prefixes", () => {
  const invalid = [
    "10.0.0.0/33",
    "::1/129",
    "10.0.0.0/08",
    "10.0.0.0/+8",
    "10.0.0.0/",
    "10.0.0.0/eight",
    "10.0.0.0/8/8",
    "nonsense/8",
  ];

  for (const value of invalid) {
    assert.deepStrictEqual(
      parseCidr(value),
      undefined,
      `expected ${value} to fail`,
    );
  }
});

test("matches an address inside and outside an IPv4 range", () => {
  const range = parseCidr("192.168.0.0/16")!;

  assert.deepStrictEqual(inCidr("192.168.255.254", range), true);
  assert.deepStrictEqual(inCidr("192.169.0.1", range), false);
});

test("matches on a prefix that is not a whole number of bytes", () => {
  const range = parseCidr("10.0.0.0/12")!;

  assert.deepStrictEqual(inCidr("10.15.255.255", range), true);
  assert.deepStrictEqual(inCidr("10.16.0.0", range), false);
});

test("a zero-length prefix matches every address of its family", () => {
  const range = parseCidr("0.0.0.0/0")!;

  assert.deepStrictEqual(inCidr("8.8.8.8", range), true);
  assert.deepStrictEqual(inCidr("::1", range), false);
});

test("matches an IPv6 range", () => {
  const range = parseCidr("2001:db8::/32")!;

  assert.deepStrictEqual(inCidr("2001:db8:dead:beef::1", range), true);
  assert.deepStrictEqual(inCidr("2001:db9::1", range), false);
});

test("does not match across address families", () => {
  assert.deepStrictEqual(inCidr("::1", parseCidr("127.0.0.0/8")!), false);
  assert.deepStrictEqual(inCidr("127.0.0.1", parseCidr("::1/128")!), false);
});

test("matches an IPv4-mapped address against an IPv4 range", () => {
  assert.deepStrictEqual(
    inCidr("::ffff:10.0.0.5", parseCidr("10.0.0.0/8")!),
    true,
  );
});

test("a malformed address matches nothing", () => {
  assert.deepStrictEqual(inCidr("nonsense", parseCidr("0.0.0.0/0")!), false);
  assert.deepStrictEqual(inCidr("", parseCidr("0.0.0.0/0")!), false);
});

test("rejects an IPv4-mapped CIDR range", () => {
  // The prefix would be measured against the wrong family's bit length, so the
  // dotted-quad form is required rather than guessing which was meant.
  assert.deepStrictEqual(parseCidr("::ffff:10.0.0.0/8"), undefined);
  assert.deepStrictEqual(parseCidr("::ffff:10.0.0.0/104"), undefined);
  assert.deepStrictEqual(parseCidr("::ffff:10.0.0.1"), undefined);
  assert.deepStrictEqual(parseCidr("10.0.0.0/8")?.prefix, 8);
});
