import crypto from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { PickleJS } from "@/db/lib/djangoCrypto";

describe("PickleJS", () => {
  let pickleJS: PickleJS;

  beforeEach(() => {
    pickleJS = new PickleJS();
  });

  describe("encodeData", () => {
    it("encodes a JavaScript object to match Python dict encoding", () => {
      const input = {
        key1: "value1",
        key2: "value2",
        key3: "value3",
      };
      const encoded = pickleJS.encodeData(input);
      const expectedBase64 = "gASVNQAAAAAAAAB9lCiMBGtleTGUjAZ2YWx1ZTGUjARrZXkylIwGdmFsdWUylIwEa2V5M5SMBnZhbHVlM5R1Lg=="; // dict(key1="value1", key2="value2", key3="value3");

      expect(encoded.toString("base64")).toBe(expectedBase64);
    });
  });

  describe("decodeData", () => {
    it("decodes a complex base64 string correctly", () => {
      const base64Input =
        "gASVFwIAAAAAAABYEAIAADxpbWcgYWx0PSIiIGJvcmRlcj0iMCIgaGVpZ2h0PSIxIiBzcmM9Imh0dHBzOi8vZW90cnguc3Vic3RhY2tjZG4uY29tL29wZW4/dG9rZW49ZXlKdElqb2lQREl3TWpRd09URXdNVGN6TmpRM0xqTXVPRGsxWlRFM01qYzRPV013TTJJNVprQnRaeTFrTVM1emRXSnpkR0ZqYXk1amIyMC1JaXdpZFNJNk1qRTROekl4TENKeUlqb2lZWGRoZUcxaGJqRXhRR2R0WVdsc0xtTnZiU0lzSW1RaU9pSnRaeTFrTVM1emRXSnpkR0ZqYXk1amIyMGlMQ0p3SWpveE5EZzNNelE0TURrc0luUWlPaUp1WlhkemJHVjBkR1Z5SWl3aVlTSTZJbTl1YkhsZmNHRnBaQ0lzSW5NaU9qUTFPRGN3T1N3aVl5STZJbkJ2YzNRaUxDSm1JanAwY25WbExDSndiM05wZEdsdmJpSTZJblJ2Y0NJc0ltbGhkQ0k2TVRjeU5UazRPVGcyTnl3aVpYaHdJam94TnpJNE5UZ3hPRFkzTENKcGMzTWlPaUp3ZFdJdE1DSXNJbk4xWWlJNkltVnZJbjAueW00S2hqNWR2TjQzLVZZVmFaS3pZdHZKM0Z0LWV0UDFUVVdOWVZQRm1PayIgc3R5bGU9ImhlaWdodDoxcHggIWltcG9ydGFudCIvPpQu";
      const decodedInput = Buffer.from(base64Input, "base64");
      const decoded = pickleJS.decodeData(decodedInput);

      const expectedOutput =
        '<img alt="" border="0" height="1" src="https://eotrx.substackcdn.com/open?token=eyJtIjoiPDIwMjQwOTEwMTczNjQ3LjMuODk1ZTE3Mjc4OWMwM2I5ZkBtZy1kMS5zdWJzdGFjay5jb20-IiwidSI6MjE4NzIxLCJyIjoiYXdheG1hbjExQGdtYWlsLmNvbSIsImQiOiJtZy1kMS5zdWJzdGFjay5jb20iLCJwIjoxNDg3MzQ4MDksInQiOiJuZXdzbGV0dGVyIiwiYSI6Im9ubHlfcGFpZCIsInMiOjQ1ODcwOSwiYyI6InBvc3QiLCJmIjp0cnVlLCJwb3NpdGlvbiI6InRvcCIsImlhdCI6MTcyNTk4OTg2NywiZXhwIjoxNzI4NTgxODY3LCJpc3MiOiJwdWItMCIsInN1YiI6ImVvIn0.ym4Khj5dvN43-VYVaZKzYtvJ3Ft-etP1TUWNYVPFmOk" style="height:1px !important"/>';

      expect(Buffer.compare(decoded, Buffer.from(expectedOutput, "utf-8"))).toBe(0);
    });

    it("decodes a python list to a JS array", () => {
      const base64Input = "gASVJwIAAAAAAAB9lCiMBnZhbHVlMZSMBnZhbHVlMpRlLg=="; //  ["value1", "value2"]
      const decodedInput = Buffer.from(base64Input, "base64");
      const decoded = pickleJS.decodeData(decodedInput);
      expect(decoded).toEqual(["value1", "value2"]);
    });

    it("decodes a python dict to a JS object", () => {
      const base64Input = "gASVNQAAAAAAAAB9lCiMBGtleTGUjAZ2YWx1ZTGUjARrZXkylIwGdmFsdWUylIwEa2V5M5SMBnZhbHVlM5R1Lg"; //  dict(key1="value1", key2="value2", key3="value3")
      const decodedInput = Buffer.from(base64Input, "base64");
      const decoded = pickleJS.decodeData(decodedInput);
      expect(decoded).toEqual({ key1: "value1", key2: "value2", key3: "value3" });
    });

    it("throw an error for unsupported pickle protocol", () => {
      const input = Buffer.from([0x80, 0x06]); // Protocol 6 (unsupported)
      expect(() => pickleJS.decodeData(input)).toThrow("Unsupported pickle protocol version 6");
    });

    it("should throw an error for missing STOP opcode", () => {
      const input = Buffer.from([0x80, 0x04, 0x95, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(() => pickleJS.decodeData(input)).toThrow("STOP opcode not found in pickle data");
    });

    it("should throw an error for unsupported opcode", () => {
      const input = Buffer.from([0x80, 0x04, 0x99]); // 0x99 is an unsupported opcode
      expect(() => pickleJS.decodeData(input)).toThrow("Unsupported pickle opcode 0x99");
    });
  });

  describe("roundtrip", () => {
    it("should correctly encode and decode a string", () => {
      const original = "Hello, World!";
      const encoded = pickleJS.encodeData(original);
      const decoded = pickleJS.decodeData(encoded);
      expect(decoded.toString()).toBe(original);
    });

    it("should correctly encode and decode a buffer", () => {
      const original = crypto.randomBytes(100);
      const encoded = pickleJS.encodeData(original);
      const decoded = pickleJS.decodeData(encoded);
      expect(Buffer.compare(decoded, original)).toBe(0);
    });
  });
});
