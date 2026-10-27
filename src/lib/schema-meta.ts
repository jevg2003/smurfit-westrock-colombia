import { z } from "zod";

/** What a form field needs to know about itself, read from the zod schema of its form. */
export interface FieldMeta {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  /** Length limit of each string of an array. */
  itemMaxLength?: number;
  min?: number;
  max?: number;
  integer?: boolean;
}

interface JsonNode {
  type?: string | string[];
  properties?: Record<string, JsonNode>;
  required?: string[];
  items?: JsonNode;
  anyOf?: JsonNode[];
  oneOf?: JsonNode[];
  const?: unknown;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
}

const cache = new WeakMap<object, JsonNode | null>();

/** The JSON Schema (input side) of a zod schema, computed once. Types JSON cannot express become `{}`. */
function jsonOf(schema: z.ZodType): JsonNode | null {
  if (cache.has(schema)) return cache.get(schema) ?? null;
  let node: JsonNode | null = null;
  try {
    node = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JsonNode;
  } catch {
    node = null;
  }
  cache.set(schema, node);
  return node;
}

const branches = (node: JsonNode): JsonNode[] => node.anyOf ?? node.oneOf ?? [];
const typesOf = (node: JsonNode): string[] => (Array.isArray(node.type) ? node.type : node.type ? [node.type] : []);

/** Whether the empty value ("" or []) passes the node. */
function acceptsEmpty(node: JsonNode): boolean {
  const options = branches(node);
  if (options.length > 0) return options.some(acceptsEmpty);
  if (node.const !== undefined) return node.const === "";
  if (node.enum) return node.enum.includes("");
  const types = typesOf(node);
  if (types.includes("string")) return (node.minLength ?? 0) === 0;
  if (types.includes("array")) return (node.minItems ?? 0) === 0;
  return false;
}

const pick = (nodes: JsonNode[], key: keyof JsonNode): number | undefined => {
  const values = nodes.map((node) => node[key]).filter((value): value is number => typeof value === "number");
  return values.length === 0 ? undefined : Math.max(...values);
};

function metaOfNode(node: JsonNode, listed: boolean): FieldMeta {
  const options = branches(node);
  const nodes = options.length > 0 ? options : [node];
  const meta: FieldMeta = { required: listed && !acceptsEmpty(node) };
  const set = <K extends keyof FieldMeta>(key: K, value: FieldMeta[K] | undefined) => {
    if (value !== undefined) meta[key] = value;
  };
  set("minLength", pick(nodes, "minLength"));
  set("maxLength", pick(nodes, "maxLength"));
  set("minItems", pick(nodes, "minItems"));
  set("maxItems", pick(nodes, "maxItems"));
  set("min", pick(nodes, "minimum") ?? pick(nodes, "exclusiveMinimum"));
  set("max", pick(nodes, "maximum") ?? pick(nodes, "exclusiveMaximum"));
  set("itemMaxLength", pick(nodes.flatMap((entry) => (entry.items ? [entry.items] : [])), "maxLength"));
  if (nodes.some((entry) => typesOf(entry).includes("integer"))) meta.integer = true;
  return meta;
}

/** "a.b[0].c" and "a.b.0.c" become ["a", "b", "c"]: array positions do not change a field's rules. */
const segmentsOf = (path: string): string[] => path.split(/[.[\]]+/).filter((segment) => segment !== "" && !/^\d+$/.test(segment));

/**
 * Rules of one field, read from the form schema with zod's public JSON Schema export, so required marks,
 * limits and counters never repeat what the schema already says. Unknown paths yield an optional field with no limits.
 */
export function fieldMeta(schema: z.ZodType | undefined, path: string): FieldMeta {
  if (!schema) return { required: false };
  let node = jsonOf(schema);
  let listed = true;
  for (const segment of segmentsOf(path)) {
    if (!node) return { required: false };
    const options = branches(node);
    const owner = node.properties ? node : options.find((option) => option.properties);
    if (owner?.properties?.[segment]) {
      listed = owner.required?.includes(segment) ?? false;
      node = owner.properties[segment];
    } else if (node.items) {
      // The segment was an array position that carried a name before it; step into the items and retry.
      node = node.items;
      const inner = node.properties?.[segment];
      if (!inner) return { required: false };
      listed = node.required?.includes(segment) ?? false;
      node = inner;
    } else {
      return { required: false };
    }
  }
  return node ? metaOfNode(node, listed) : { required: false };
}
