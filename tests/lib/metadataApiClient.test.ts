import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmacDigest, getMetadata, MetadataAPIError, timestamp } from "@/lib/metadataApiClient";

const time = new Date("2023-01-01T01:00:00Z");
const timestampUnix = 1672534800;

beforeEach(() => {
  vi.useRealTimers();
  vi.setSystemTime(time);
});

describe("timestamp", () => {
  it("returns current unix time", () => {
    expect(timestamp()).toEqual(timestampUnix);
  });
});

describe("getMetadata", () => {
  const mockEndpoint = {
    url: "https://example.com/metadata",
    hmacSecret: "testSecret",
  };

  it("returns the metadata when the API call is successful", async () => {
    const mockResponse = {
      success: true,
      user_info: { prompt: "Some prompt", metadata: {} },
      customer: { name: "Some name", value: 1000, metadata: {}, actions: {} },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockResponse,
    });
    global.fetch = mockFetch;

    const mockQueryParams = {
      email: "user@example.com",
      timestamp: timestampUnix,
    };
    const result = await getMetadata(mockEndpoint, mockQueryParams);

    const hmacSignature = createHmacDigest(mockEndpoint.hmacSecret, { query: mockQueryParams }).toString("base64");
    const urlWithParams = `${mockEndpoint.url}?email=${encodeURIComponent(mockQueryParams.email)}&timestamp=${mockQueryParams.timestamp}`;
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      urlWithParams,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: `Bearer ${hmacSignature}`,
        }),
      }),
    );
  });

  it("throws MetadataAPIError when response is not JSON", async () => {
    const mockQueryParams = {
      email: "user@example.com",
      timestamp: timestampUnix,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => JSON.parse("Not json"),
    });
    await expect(getMetadata(mockEndpoint, mockQueryParams)).rejects.toThrow(
      new MetadataAPIError("Endpoint did not return JSON response"),
    );
  });

  it("throws MetadataAPIError when JSON response is invalid", async () => {
    const mockQueryParams = {
      email: "user@example.com",
      timestamp: timestampUnix,
    };

    // JSON response missing `metadata`
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ ok: true }),
    });
    await expect(getMetadata(mockEndpoint, mockQueryParams)).rejects.toThrow(
      new MetadataAPIError("Invalid format for JSON response: 'success' Invalid literal value, expected true"),
    );

    // Multiple errors
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ user_info: "Some data" }),
    });
    await expect(getMetadata(mockEndpoint, mockQueryParams)).rejects.toThrow(
      new MetadataAPIError(
        "Invalid format for JSON response: 'success' Invalid literal value, expected true; 'user_info' Expected object, received string",
      ),
    );

    // Metadata too long
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true, user_info: { prompt: faker.string.fromCharacters("abc", 5001), metadata: {} } }),
    });
    await expect(getMetadata(mockEndpoint, mockQueryParams)).rejects.toThrow(
      new MetadataAPIError(`Invalid format for JSON response: 'user_info' Exceeded maximum length of 5000 characters`),
    );
  });

  it("throws MetadataAPIError when HTTP error occurs", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal server error",
    });
    global.fetch = mockFetch;

    const mockQueryParams = {
      email: "user@example.com",
      timestamp: timestampUnix,
    };
    await expect(getMetadata(mockEndpoint, mockQueryParams)).rejects.toThrow(
      new MetadataAPIError("HTTP error occurred: 500"),
    );
  });
});

describe("createHmacDigest", () => {
  it("creates HMAC digest from JSON params", () => {
    const hmacSecret = "hlpr_somesecret";
    const digest = createHmacDigest(hmacSecret, {
      json: {
        email: "user@example.com",
        timestamp: timestampUnix,
      },
    });
    expect(digest.toString("base64")).toEqual("quDwFU8D2cPURNCf2bDUBHmkQ7KTgXoR5V9T816A4+0=");
  });

  it("creates HMAC digest from query params", () => {
    const hmacSecret = "hlpr_somesecret";
    const digest = createHmacDigest(hmacSecret, {
      query: {
        email: "user@example.com",
        timestamp: timestampUnix,
      },
    });
    expect(digest.toString("base64")).toEqual("u1lb/8BpBmbxdo6hfze/ULynKugOmoxmtrL5wSTuB74=");
  });
});
