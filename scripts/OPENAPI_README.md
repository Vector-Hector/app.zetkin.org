# OpenAPI/Swagger Generator for Zetkin App

This directory contains a TypeScript script that automatically generates OpenAPI 3.0 specification from the Zetkin codebase.

## Overview

The `generate-openapi.ts` script:
- Parses all TypeScript files in the codebase
- Extracts API calls made through `apiClient` (GET, POST, PATCH, PUT, DELETE)
- Identifies RPC function definitions
- Generates a complete OpenAPI 3.0 specification with paths, parameters, and responses
- Outputs to `openapi.json` in the project root

## Generated Documentation

The script analyzed the codebase and found:
- **426 REST endpoints** across 199 unique paths
- **33 RPC endpoints** (custom remote procedure calls)
- API calls span across:
  - Organizations (`/api/orgs/{orgId}/...`)
  - Events/Actions (`/api/orgs/{orgId}/actions/...`)
  - Surveys (`/api/orgs/{orgId}/surveys/...`)
  - Tasks (`/api/orgs/{orgId}/tasks/...`)
  - People & Views (`/api/orgs/{orgId}/people/...`)
  - Emails, Calls, Campaigns, and more

### HTTP Method Breakdown
- **GET**: 242 endpoints (data retrieval)
- **POST**: 72 endpoints (resource creation)
- **PATCH**: 47 endpoints (partial updates)
- **DELETE**: 45 endpoints (resource deletion)
- **PUT**: 20 endpoints (full replacement)

## Usage

### Generate OpenAPI Specification

```bash
npm run generate-openapi
```

This will:
1. Parse all TypeScript files (`.ts`, `.tsx`)
2. Extract API endpoint patterns and types
3. Generate `openapi.json` in the project root

### Custom Output Path

```bash
npm run generate-openapi -- --output my-custom-api-spec.json
```

### View in Swagger UI

**Option 1: Online Swagger Editor**
1. Generate the spec: `npm run generate-openapi`
2. Visit https://editor.swagger.io/
3. File → Import File → Select `openapi.json`

**Option 2: Local Swagger UI Viewer**
```bash
npm run openapi:watch
```
This opens a local Swagger UI viewer at http://localhost:8000

### Import into Postman

1. Generate the spec: `npm run generate-openapi`
2. Open Postman
3. Import → Upload `openapi.json`
4. All endpoints will be available as a collection

## What Gets Extracted

### 1. REST Endpoints

The script finds all calls like:

```typescript
// GET endpoint
const org = await apiClient.get<ZetkinOrganization>(
  `/api/orgs/${orgId}`
);

// POST endpoint
const newSurvey = await apiClient.post<ZetkinSurvey>(
  `/api/orgs/${orgId}/surveys`,
  { title: 'New Survey' }
);

// PATCH endpoint
await apiClient.patch<ZetkinEvent>(
  `/api/orgs/${orgId}/actions/${eventId}`,
  { title: 'Updated Event' }
);
```

And generates OpenAPI paths with:
- HTTP method
- Path parameters (e.g., `{orgId}`, `{eventId}`)
- Query parameters (extracted from URL)
- Request body schema (from TypeScript types)
- Response schema (from TypeScript types)
- Source file reference

### 2. RPC Endpoints

The script identifies RPC function definitions:

```typescript
export const getAllEventsDef = {
  handler: handle,
  name: 'getAllEvents',
  schema: paramsSchema,
};
```

And includes them in the OpenAPI spec under `/api/rpc` with all available function names.

### 3. Type Information

Response and request types are extracted from TypeScript generics:

```typescript
apiClient.get<ZetkinEvent[]>('/api/orgs/${orgId}/actions')
// → Response type: ZetkinEvent[]

apiClient.post<ZetkinSurvey, CreateSurveyData>('/api/orgs/${orgId}/surveys', data)
// → Response type: ZetkinSurvey
// → Request type: CreateSurveyData
```

## OpenAPI Spec Structure

The generated `openapi.json` includes:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Zetkin App API",
    "version": "1.0.0",
    "description": "Auto-generated API documentation"
  },
  "servers": [
    { "url": "http://localhost:3000", "description": "Development" },
    { "url": "https://organize.zetk.in", "description": "Production" }
  ],
  "paths": {
    "/api/orgs/{orgId}": {
      "get": {
        "summary": "Get Organizations",
        "tags": ["Organizations"],
        "parameters": [...],
        "responses": {...}
      }
    }
  },
  "components": {
    "schemas": {...}
  },
  "tags": [...]
}
```

## Features

### Automatic Path Parameter Detection

```typescript
`/api/orgs/${orgId}/surveys/${surveyId}`
```
Becomes:
```json
{
  "path": "/api/orgs/{orgId}/surveys/{surveyId}",
  "parameters": [
    { "name": "orgId", "in": "path", "required": true, "schema": { "type": "integer" } },
    { "name": "surveyId", "in": "path", "required": true, "schema": { "type": "integer" } }
  ]
}
```

### Query Parameter Extraction

```typescript
`/api/orgs/${orgId}/actions?filter=start_time%3E=${now}`
```
Extracts `filter` as a query parameter.

### Resource Grouping (Tags)

Endpoints are automatically tagged by resource:
- **Organizations** - `/api/orgs/{orgId}`
- **Actions** - `/api/orgs/{orgId}/actions/...`
- **Surveys** - `/api/orgs/{orgId}/surveys/...`
- **Tasks** - `/api/orgs/{orgId}/tasks/...`
- **People** - `/api/orgs/{orgId}/people/...`
- **RPC** - `/api/rpc`

### Source Code References

Each endpoint includes a reference to where it's called:

```json
{
  "description": "Source: src/features/events/hooks/useEvent.ts:42"
}
```

## Top 10 Most Used Endpoints

Based on the analysis, these are the most frequently called endpoints:

1. `/api/orgs/{orgId}/surveys/{surveyId}` - 13 calls
2. `/api/orgs/{orgId}` - 12 calls
3. `/api/orgs/{orgId}/people/views/{id}/columns` - 10 calls
4. `/api/orgs/{orgId}/people/views` - 9 calls
5. `/api/users/me` - 9 calls
6. `/api/orgs/{orgId}/actions` - 8 calls
7. `/api/orgs/{orgId}/emails/{emailId}` - 8 calls
8. `/api/users/me/memberships` - 7 calls
9. `/api/orgs/{orgId}/actions/{eventId}` - 7 calls
10. `/api/orgs/{orgId}/tasks/{taskId}` - 7 calls

## Script Architecture

### Parser Flow

```
1. Create TypeScript Program
   ↓
2. Get all source files (.ts, .tsx)
   ↓
3. Visit each AST node recursively
   ↓
4. Identify apiClient method calls
   ↓
5. Extract endpoint, types, parameters
   ↓
6. Identify RPC definitions
   ↓
7. Generate OpenAPI specification
   ↓
8. Save to openapi.json
```

### Key Components

- **OpenApiGenerator class**: Main parser and generator
- **visitNode()**: Recursive AST traversal
- **processCallExpression()**: Extracts REST API calls
- **processRpcDefinition()**: Identifies RPC functions
- **generateOpenApi()**: Builds OpenAPI 3.0 spec
- **printStats()**: Displays analysis statistics

## Advanced Usage

### Generate Multiple Specs

You can generate different specs for different environments:

```bash
# Development spec
npm run generate-openapi -- --output openapi-dev.json

# Production spec (if needed with different filtering)
npm run generate-openapi -- --output openapi-prod.json
```

### Use with Code Generators

Generate client SDKs from the OpenAPI spec:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate -i openapi.json -g typescript-axios -o generated/api-client

# Generate Python client
openapi-generator-cli generate -i openapi.json -g python -o generated/python-client
```

### Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/generate-docs.yml
- name: Generate API Documentation
  run: npm run generate-openapi

- name: Upload OpenAPI Spec
  uses: actions/upload-artifact@v2
  with:
    name: openapi-spec
    path: openapi.json
```

## Limitations

1. **Type Schema Generation**: The script references TypeScript type names but doesn't generate full JSON Schema definitions for types. Consider using [typescript-json-schema](https://github.com/YousefED/typescript-json-schema) for complete schemas.

2. **Dynamic Paths**: Paths constructed dynamically at runtime may not be captured accurately.

3. **Descriptions**: Endpoint descriptions are auto-generated from patterns. Add JSDoc comments for better documentation.

4. **Authentication**: The spec includes standard HTTP status codes but doesn't detail authentication mechanisms (handled by session cookies).

## Future Enhancements

Potential improvements:
- [ ] Extract JSDoc comments for endpoint descriptions
- [ ] Generate full JSON Schema from TypeScript interfaces
- [ ] Add authentication/security schemes to spec
- [ ] Include example request/response bodies
- [ ] Filter by feature/module
- [ ] Generate separate specs for public vs. internal APIs
- [ ] Add endpoint deprecation markers
- [ ] Extract validation rules from Zod schemas

## Troubleshooting

### "Cannot find module 'glob'"

Install the required dependencies:
```bash
npm install --save-dev @types/glob --legacy-peer-deps
```

### Script Runs But No Output

Check that:
1. You're in the project root directory
2. `src/` directory exists with TypeScript files
3. TypeScript is installed (`npm install typescript`)

### Incomplete Endpoint List

The script only captures:
- Direct `apiClient` calls
- String literal and template literal paths
- Files not in `node_modules` or build directories

Dynamic path construction or indirect calls may not be captured.

## Contributing

To modify the generator:

1. Edit `scripts/generate-openapi.ts`
2. Test with `npm run generate-openapi`
3. Check the output `openapi.json`
4. Update this README if adding features

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Swagger Editor](https://editor.swagger.io/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Postman API Platform](https://www.postman.com/)

## License

This script is part of the Zetkin App project and follows the same license.
