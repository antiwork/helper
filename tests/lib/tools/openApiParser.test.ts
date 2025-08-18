import { describe, expect, it } from "vitest";
import { parseToolsFromOpenAPISpec } from "@/lib/tools/openApiParser";

describe("parseToolsFromOpenAPISpec", () => {
  it("parses a valid OpenAPI spec", async () => {
    const spec = `{
      "openapi": "3.0.0",
      "info": {
        "title": "Test API",
        "version": "1.0.0"
      },
      "servers": [
        {
          "url": "https://api.example.com"
        }
      ],
      "paths": {
        "/products": {
          "get": {
            "operationId": "listProducts",
            "summary": "List products",
            "description": "Get a list of all products",
            "responses": {
              "200": {
                "description": "A list of products"
              }
            }
          },
          "post": {
            "operationId": "createProduct",
            "summary": "Create product",
            "responses": {
              "200": {
                "description": "Product created successfully"
              }
            }
          }
        },
        "/products/{id}": {
          "put": {
            "operationId": "updateProduct",
            "parameters": [
              {
                "name": "id",
                "in": "path",
                "required": true,
                "schema": {
                  "type": "number"
                }
              }
            ],
            "summary": "Update a product",
            "responses": {
              "200": {
                "description": "Product updated successfully"
              }
            }
          },
          "delete": {
            "operationId": "deleteProduct",
            "parameters": [
              {
                "name": "id",
                "in": "path",
                "required": true,
                "schema": {
                  "type": "number"
                }
              }
            ],
            "summary": "Delete product",
            "responses": {
              "200": {
                "description": "Product deleted successfully"
              }
            }
          }
        }
      }
    }`;

    const tools = await parseToolsFromOpenAPISpec(spec, "123");

    expect(tools).toEqual([
      {
        name: "List products",
        description: "Get a list of all products",
        slug: "listProducts",
        requestMethod: "GET",
        url: "https://api.example.com/products",
        headers: {},
        parameters: [],
        authenticationMethod: "bearer_token",
        authenticationToken: "123",
        enabled: true,
        availableInChat: false,
        availableInAnonymousChat: false,
        customerEmailParameter: null,
        unused_mailboxId: 0,
      },
      {
        name: "Create product",
        description: "Create product",
        slug: "createProduct",
        requestMethod: "POST",
        url: "https://api.example.com/products",
        headers: {},
        parameters: [],
        authenticationMethod: "bearer_token",
        authenticationToken: "123",
        enabled: true,
        availableInChat: false,
        availableInAnonymousChat: false,
        customerEmailParameter: null,
        unused_mailboxId: 0,
      },
      {
        name: "Update a product",
        description: "Update a product",
        slug: "updateProduct",
        requestMethod: "PUT",
        url: "https://api.example.com/products/{id}",
        headers: {},
        parameters: [
          {
            name: "id",
            type: "number",
            in: "path",
            required: true,
            description: undefined,
          },
        ],
        authenticationMethod: "bearer_token",
        authenticationToken: "123",
        enabled: true,
        availableInChat: false,
        availableInAnonymousChat: false,
        customerEmailParameter: null,
        unused_mailboxId: 0,
      },
      {
        name: "Delete product",
        description: "Delete product",
        slug: "deleteProduct",
        requestMethod: "DELETE",
        url: "https://api.example.com/products/{id}",
        headers: {},
        parameters: [
          {
            name: "id",
            type: "number",
            in: "path",
            required: true,
            description: undefined,
          },
        ],
        authenticationMethod: "bearer_token",
        authenticationToken: "123",
        enabled: true,
        availableInChat: false,
        availableInAnonymousChat: false,
        customerEmailParameter: null,
        unused_mailboxId: 0,
      },
    ]);
  });

  it("uses description when summary is not available", async () => {
    const spec = `{
      "openapi": "3.0.0",
      "info": {
        "title": "Test API",
        "version": "1.0.0"
      },
      "servers": [
        {
          "url": "https://api.example.com"
        }
      ],
      "paths": {
        "/products": {
          "get": {
            "operationId": "listProducts",
            "description": "Get a list of all products",
            "responses": {
              "200": {
                "description": "A list of products"
              }
            }
          }
        }
      }
    }`;

    const tools = await parseToolsFromOpenAPISpec(spec, "123");

    expect(tools).toEqual([
      {
        name: "listProducts",
        description: "Get a list of all products",
        slug: "listProducts",
        requestMethod: "GET",
        url: "https://api.example.com/products",
        headers: {},
        parameters: [],
        authenticationMethod: "bearer_token",
        authenticationToken: "123",
        enabled: true,
        availableInChat: false,
        availableInAnonymousChat: false,
        customerEmailParameter: null,
        unused_mailboxId: 0,
      },
    ]);
  });

  it("skips unsupported methods", async () => {
    const spec = `{
      "openapi": "3.0.0",
      "info": {
        "title": "Test API",
        "version": "1.0.0"
      },
      "servers": [
        {
          "url": "https://api.example.com"
        }
      ],
      "paths": {
        "/products": {
          "get": {
            "operationId": "listProducts",
            "summary": "List products",
            "description": "Get a list of all products",
            "responses": {
              "200": {
                "description": "A list of products"
              }
            }
          },
          "patch": {
            "summary": "Patch product",
            "responses": {
              "200": {
                "description": "Product patched successfully"
              }
            }
          },
          "options": {
            "summary": "Options for products",
            "responses": {
              "200": {
                "description": "Options for products"
              }
            }
          }
        }
      }
    }`;

    const tools = await parseToolsFromOpenAPISpec(spec, "123");

    expect(tools).toEqual([
      {
        name: "List products",
        description: "Get a list of all products",
        slug: "listProducts",
        requestMethod: "GET",
        url: "https://api.example.com/products",
        headers: {},
        parameters: [],
        authenticationMethod: "bearer_token",
        authenticationToken: "123",
        enabled: true,
        availableInChat: false,
        availableInAnonymousChat: false,
        customerEmailParameter: null,
        unused_mailboxId: 0,
      },
    ]);
  });

  it("throws error for invalid OpenAPI spec", async () => {
    const spec = `{
      "invalid": "spec"
    }`;

    await expect(parseToolsFromOpenAPISpec(spec, "123")).rejects.toThrow(
      "Only OpenAPI 3.x specifications are supported",
    );
  });

  it("throws error for malformed JSON", async () => {
    const spec = `{
      invalid json
    }`;

    await expect(parseToolsFromOpenAPISpec(spec, "123")).rejects.toThrow(
      "Expected property name or '}' in JSON at position",
    );
  });

  it("throws error for unsupported OpenAPI version", async () => {
    const spec = `{
      "swagger": "2.0",
      "info": {
        "title": "Test API",
        "version": "1.0.0"
      },
      "paths": {}
    }`;

    await expect(parseToolsFromOpenAPISpec(spec, "123")).rejects.toThrow(
      "Only OpenAPI 3.x specifications are supported",
    );
  });

  it("throws error for missing default host", async () => {
    const spec = `{
      "openapi": "3.0.0",
      "info": {
        "title": "Test API",
        "version": "1.0.0"
      },
      "paths": {}
    }`;

    await expect(parseToolsFromOpenAPISpec(spec, "123")).rejects.toThrow("No default host found in the OpenAPI spec");
  });

  it("parses request body parameters", async () => {
    const spec = `{
      "openapi": "3.0.0",
      "info": {
        "title": "Test API",
        "version": "1.0.0"
      },
      "servers": [
        {
          "url": "https://api.example.com"
        }
      ],
      "paths": {
        "/products": {
          "post": {
            "operationId": "createProduct",
            "summary": "Create product",
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": ["name", "price"],
                    "properties": {
                      "name": {
                        "type": "string"
                      },
                      "price": {
                        "type": "number"
                      },
                      "description": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            },
            "responses": {
              "200": {
                "description": "Product created successfully"
              }
            }
          }
        }
      }
    }`;

    const tools = await parseToolsFromOpenAPISpec(spec, "123");

    expect(tools).toEqual([
      {
        name: "Create product",
        description: "Create product",
        slug: "createProduct",
        requestMethod: "POST",
        url: "https://api.example.com/products",
        headers: {},
        parameters: [
          {
            name: "name",
            type: "string",
            in: "body",
            required: true,
            description: undefined,
          },
          {
            name: "price",
            type: "number",
            in: "body",
            required: true,
            description: undefined,
          },
          {
            name: "description",
            type: "string",
            in: "body",
            required: false,
            description: undefined,
          },
        ],
        authenticationMethod: "bearer_token",
        authenticationToken: "123",
        enabled: true,
        availableInChat: false,
        availableInAnonymousChat: false,
        customerEmailParameter: null,
        unused_mailboxId: 0,
      },
    ]);
  });

  it("handles missing request body content", async () => {
    const spec = `{
      "openapi": "3.0.0",
      "info": {
        "title": "Test API",
        "version": "1.0.0"
      },
      "servers": [
        {
          "url": "https://api.example.com"
        }
      ],
      "paths": {
        "/products": {
          "post": {
            "operationId": "createProduct",
            "summary": "Create product",
            "requestBody": {
              "content": {
                "application/xml": {
                  "schema": {
                    "type": "object"
                  }
                }
              }
            },
            "responses": {
              "200": {
                "description": "Success"
              }
            }
          }
        }
      }
    }`;

    const tools = await parseToolsFromOpenAPISpec(spec, "123");

    expect(tools?.[0]?.parameters).toEqual([]);
  });
});
