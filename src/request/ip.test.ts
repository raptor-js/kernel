/// <reference lib="deno.ns" />
// deno-lint-ignore-file

import { assertEquals } from "jsr:@std/assert";

import { canonicaliseAddress, inCidr, parseAddress, parseCidr } from "./ip.ts";

Deno.test("parses a dotted-quad IPv4 address", () => {
  const address = parseAddress("192.168.1.10");

  assertEquals(address?.family, "IPv4");
  assertEquals(Array.from(address!.bytes), [192, 168, 1, 10]);
});

Deno.test("parses the IPv4 range bounds", () => {
  assertEquals(Array.from(parseAddress("0.0.0.0")!.bytes), [0, 0, 0, 0]);
  assertEquals(
    Array.from(parseAddress("255.255.255.255")!.bytes),
    [255, 255, 255, 255],
  );
});

Deno.test("rejects IPv4 octets with leading zeros", () => {
  // Octal to some parsers, decimal to others.
  assertEquals(parseAddress("010.0.0.1"), undefined);
  assertEquals(parseAddress("127.0.0.01"), undefined);
});

Deno.test("rejects out-of-range and malformed IPv4 addresses", () => {
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
    assertEquals(parseAddress(value), undefined, `expected ${value} to fail`);
  }
});

Deno.test("parses a fully-specified IPv6 address", () => {
  const address = parseAddress("2001:0db8:0000:0000:0000:0000:0000:0001");

  assertEquals(address?.family, "IPv6");
  assertEquals(address!.bytes.length, 16);
  assertEquals(address!.bytes[0], 0x20);
  assertEquals(address!.bytes[15], 1);
});

Deno.test("parses IPv6 zero-run compression in every position", () => {
  assertEquals(Array.from(parseAddress("::")!.bytes), new Array(16).fill(0));

  const loopback = parseAddress("::1")!;

  assertEquals(loopback.bytes[15], 1);
  assertEquals(Array.from(loopback.bytes.slice(0, 15)), new Array(15).fill(0));

  const trailing = parseAddress("2001:db8::")!;

  assertEquals(trailing.bytes[0], 0x20);
  assertEquals(Array.from(trailing.bytes.slice(4)), new Array(12).fill(0));

  const middle = parseAddress("2001:db8::1")!;

  assertEquals(middle.bytes[0], 0x20);
  assertEquals(middle.bytes[15], 1);
});

Deno.test("rejects more than one IPv6 zero-run compression", () => {
  assertEquals(parseAddress("2001::db8::1"), undefined);
  assertEquals(parseAddress("1:::2"), undefined);
});

Deno.test("rejects IPv6 compression standing for no groups at all", () => {
  assertEquals(parseAddress("1:2:3:4:5:6:7::8"), undefined);
});

Deno.test("rejects malformed IPv6 addresses", () => {
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
    assertEquals(parseAddress(value), undefined, `expected ${value} to fail`);
  }
});

Deno.test("strips an IPv6 zone identifier", () => {
  assertEquals(canonicaliseAddress("fe80::1%en0"), "fe80::1");
});

Deno.test("reduces an IPv4-mapped IPv6 address to IPv4", () => {
  const address = parseAddress("::ffff:127.0.0.1");

  assertEquals(address?.family, "IPv4");
  assertEquals(Array.from(address!.bytes), [127, 0, 0, 1]);
});

Deno.test("parses an embedded IPv4 address in full IPv6 form", () => {
  const address = parseAddress("0:0:0:0:0:ffff:192.168.0.1");

  assertEquals(address?.family, "IPv4");
  assertEquals(Array.from(address!.bytes), [192, 168, 0, 1]);
});

Deno.test("rejects an embedded IPv4 address away from the end", () => {
  assertEquals(parseAddress("::1.2.3.4:ffff"), undefined);
  assertEquals(parseAddress("1.2.3.4::"), undefined);
});

Deno.test("canonicalises IPv4 to dotted quad", () => {
  assertEquals(canonicaliseAddress("192.168.1.1"), "192.168.1.1");
  assertEquals(canonicaliseAddress("::ffff:10.0.0.7"), "10.0.0.7");
});

Deno.test("canonicalises the many spellings of one IPv6 host to one string", () => {
  const spellings = [
    "2001:0db8:0000:0000:0000:0000:0000:0001",
    "2001:DB8::1",
    "2001:db8:0:0:0:0:0:1",
    "2001:db8::0:1",
  ];

  for (const spelling of spellings) {
    assertEquals(canonicaliseAddress(spelling), "2001:db8::1", spelling);
  }
});

Deno.test("canonicalises the longest zero run, leftmost on a tie", () => {
  assertEquals(canonicaliseAddress("2001:0:0:1:0:0:0:1"), "2001:0:0:1::1");
  assertEquals(canonicaliseAddress("1:0:0:2:0:0:3:4"), "1::2:0:0:3:4");
  assertEquals(canonicaliseAddress("::"), "::");
});

Deno.test("canonicalises a single zero group without compressing it", () => {
  assertEquals(canonicaliseAddress("1:2:3:4:5:6:0:8"), "1:2:3:4:5:6:0:8");
});

Deno.test("canonicalising rejects a non-address", () => {
  assertEquals(canonicaliseAddress("nonsense"), undefined);
  assertEquals(canonicaliseAddress(""), undefined);
});

Deno.test("parses a CIDR range", () => {
  const range = parseCidr("10.0.0.0/8");

  assertEquals(range?.family, "IPv4");
  assertEquals(range?.prefix, 8);
});

Deno.test("treats a bare address as a single host range", () => {
  assertEquals(parseCidr("10.0.0.1")?.prefix, 32);
  assertEquals(parseCidr("::1")?.prefix, 128);
});

Deno.test("ignores host bits below the CIDR prefix", () => {
  assertEquals(inCidr("10.9.8.7", parseCidr("10.0.0.1/8")!), true);
});

Deno.test("rejects malformed CIDR prefixes", () => {
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
    assertEquals(parseCidr(value), undefined, `expected ${value} to fail`);
  }
});

Deno.test("matches an address inside and outside an IPv4 range", () => {
  const range = parseCidr("192.168.0.0/16")!;

  assertEquals(inCidr("192.168.255.254", range), true);
  assertEquals(inCidr("192.169.0.1", range), false);
});

Deno.test("matches on a prefix that is not a whole number of bytes", () => {
  const range = parseCidr("10.0.0.0/12")!;

  assertEquals(inCidr("10.15.255.255", range), true);
  assertEquals(inCidr("10.16.0.0", range), false);
});

Deno.test("a zero-length prefix matches every address of its family", () => {
  const range = parseCidr("0.0.0.0/0")!;

  assertEquals(inCidr("8.8.8.8", range), true);
  assertEquals(inCidr("::1", range), false);
});

Deno.test("matches an IPv6 range", () => {
  const range = parseCidr("2001:db8::/32")!;

  assertEquals(inCidr("2001:db8:dead:beef::1", range), true);
  assertEquals(inCidr("2001:db9::1", range), false);
});

Deno.test("does not match across address families", () => {
  assertEquals(inCidr("::1", parseCidr("127.0.0.0/8")!), false);
  assertEquals(inCidr("127.0.0.1", parseCidr("::1/128")!), false);
});

Deno.test("matches an IPv4-mapped address against an IPv4 range", () => {
  assertEquals(inCidr("::ffff:10.0.0.5", parseCidr("10.0.0.0/8")!), true);
});

Deno.test("a malformed address matches nothing", () => {
  assertEquals(inCidr("nonsense", parseCidr("0.0.0.0/0")!), false);
  assertEquals(inCidr("", parseCidr("0.0.0.0/0")!), false);
});

Deno.test("rejects an IPv4-mapped CIDR range", () => {
  // The prefix would be measured against the wrong family's bit length, so the
  // dotted-quad form is required rather than guessing which was meant.
  assertEquals(parseCidr("::ffff:10.0.0.0/8"), undefined);
  assertEquals(parseCidr("::ffff:10.0.0.0/104"), undefined);
  assertEquals(parseCidr("::ffff:10.0.0.1"), undefined);
  assertEquals(parseCidr("10.0.0.0/8")?.prefix, 8);
});
