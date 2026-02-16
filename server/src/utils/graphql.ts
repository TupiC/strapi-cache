export function parseGraphqlPayload(
  body: string,
  isGet: boolean
): {
  query: string;
  variables: Record<string, unknown> | string | null;
  operationName: string | null;
} {
  if (isGet) {
    try {
      const parsed = JSON.parse(body) as {
        query?: string;
        variables?: string | Record<string, unknown>;
        operationName?: string;
      };
      const variables = parsed.variables;
      const variablesParsed =
        typeof variables === 'string'
          ? variables
            ? JSON.parse(variables)
            : null
          : (variables ?? null);
      return {
        query: parsed.query ?? '',
        variables: variablesParsed,
        operationName: parsed.operationName ?? null,
      };
    } catch {
      return { query: body, variables: null, operationName: null };
    }
  }
  try {
    const parsed = JSON.parse(body) as {
      query?: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    };
    return {
      query: parsed.query ?? '',
      variables: parsed.variables ?? null,
      operationName: parsed.operationName ?? null,
    };
  } catch {
    return { query: body, variables: null, operationName: null };
  }
}

export function getRootFieldsFromQuery(query: string): string[] {
  const fields: string[] = [];
  let depth = 0;
  let i = 0;
  while (i < query.length) {
    if (query[i] === '{') {
      depth++;
      i++;
      if (depth === 1) {
        const rest = query.slice(i);
        const match = rest.match(/^\s*(\w+)\s*([\(\{])/);
        if (match) {
          fields.push(match[1]);
          i += match[0].length;
        }
      }
    } else if (query[i] === '}') {
      depth--;
      i++;
    } else if (depth === 1) {
      const rest = query.slice(i);
        const match = rest.match(/^[\s,]*(\w+)\s*([\(\{])/);
      if (match) {
        fields.push(match[1]);
        i += match[0].length;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  return fields;
}
