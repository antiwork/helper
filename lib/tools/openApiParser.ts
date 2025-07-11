import OpenAPIParser from "@readme/openapi-parser";
import type { OpenAPIV3 } from "openapi-types";
import type { Tool as ToolDb } from "@/db/schema/tools";

type Tool = Omit<ToolDb, "id" | "createdAt" | "updatedAt" | "toolApiId">;
type ToolParameters = Tool["parameters"];
type HttpMethod = "get" | "post" | "put" | "delete";

const validateJsonSpec = (spec: string): any => {
  try {
    return JSON.parse(spec);
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }
};

const validateOpenApiVersion = (parsedSpec: any): void => {
  if (
    typeof parsedSpec !== "object" ||
    !parsedSpec ||
    !("openapi" in parsedSpec) ||
    typeof parsedSpec.openapi !== "string" ||
    !parsedSpec.openapi.startsWith("3.")
  ) {
    throw new Error("Only OpenAPI 3.x specifications are supported");
  }
};

const getDefaultHost = (api: OpenAPIV3.Document): string => {
  const defaultHost = api.servers?.[0]?.url;
  if (!defaultHost) {
    throw new Error("No default host found in the OpenAPI spec. Add at least one entry in 'servers'");
  }
  return defaultHost;
};

const parseParameter = (
  param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject,
): NonNullable<ToolParameters>[number] => {
  if ("$ref" in param) {
    throw new Error("Reference parameters are not supported");
  }

  return {
    name: param.name,
    description: param.description,
    type: param.schema && "$ref" in param.schema ? "string" : param.schema?.type === "number" ? "number" : "string",
    in: param.in as "body" | "query" | "path",
    required: param.required ?? false,
  };
};

const generateSlug = (method: string, path: string): string => {
  return `${method.toLowerCase()}${path}`
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const parseRequestBody = (
  requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject | undefined,
): NonNullable<ToolParameters>[number][] => {
  if (!requestBody || "$ref" in requestBody) {
    return [];
  }

  const content = requestBody.content;
  if (!content?.["application/json"]) {
    return [];
  }

  const schema = content["application/json"].schema;
  if (!schema || "$ref" in schema) {
    return [];
  }

  if (schema.type !== "object" || !schema.properties) {
    return [];
  }

  return Object.entries(schema.properties).map(([name, prop]) => {
    if ("$ref" in prop) {
      return {
        name,
        type: "string", // Default to string for referenced types
        in: "body",
        required: requestBody.required ?? false,
      };
    }

    return {
      name,
      description: prop.description,
      type: prop.type === "number" || prop.type === "integer" ? "number" : "string",
      in: "body",
      required: Array.isArray(schema.required) && schema.required.includes(name),
    };
  });
};

const createTool = (
  method: HttpMethod,
  path: string,
  operation: OpenAPIV3.OperationObject,
  defaultHost: string,
  apiToken: string,
): Tool => ({
  name: operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`,
  description: operation.description || operation.summary || "No description provided",
  slug: operation.operationId || generateSlug(method, path),
  requestMethod: method.toUpperCase() as Tool["requestMethod"],
  url: `${defaultHost}${path}`,
  headers: {},
  parameters: [...(operation.parameters || []).map(parseParameter), ...parseRequestBody(operation.requestBody)],
  authenticationMethod: "bearer_token",
  authenticationToken: apiToken,
  enabled: true,
  availableInChat: false,
  availableInAnonymousChat: false,
  customerEmailParameter: null,
  unused_mailboxId: 0,
});

export async function parseToolsFromOpenAPISpec(spec: string, apiToken: string): Promise<Tool[]> {
  const parsedSpec = validateJsonSpec(spec);
  validateOpenApiVersion(parsedSpec);

  const api = (await OpenAPIParser.validate(parsedSpec)) as OpenAPIV3.Document;
  const defaultHost = getDefaultHost(api);
  const methods: HttpMethod[] = ["get", "post", "put", "delete"];

  return Object.entries(api.paths ?? {}).flatMap(([path, pathItem]) => {
    if (!pathItem) {
      throw new Error(`No path item found for path: ${path}`);
    }

    return methods
      .filter((method) => pathItem[method])
      .map((method) => createTool(method, path, pathItem[method]!, defaultHost, apiToken));
  });
}
