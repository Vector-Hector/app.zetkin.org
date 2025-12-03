#!/usr/bin/env ts-node

/**
 * OpenAPI/Swagger Generator for Zetkin App
 *
 * This script parses the TypeScript codebase to extract all API calls
 * made through apiClient and generates an OpenAPI 3.0 specification.
 *
 * Usage:
 *   npm run generate-openapi
 *   npm run generate-openapi -- --output custom-output.json
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  responseType?: string;
  requestType?: string;
  fileLocation: string;
  lineNumber: number;
  pathParams: string[];
  queryParams: string[];
}

interface RpcEndpoint {
  name: string;
  paramsType?: string;
  resultType?: string;
  fileLocation: string;
}

class OpenApiGenerator {
  private endpoints: Map<string, ApiEndpoint[]> = new Map();
  private rpcEndpoints: RpcEndpoint[] = [];
  private program: ts.Program;

  constructor(private rootDir: string) {
    // Create TypeScript program for type checking
    const configPath = ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.json');
    const configFile = configPath ? ts.readConfigFile(configPath, ts.sys.readFile) : undefined;

    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      skipLibCheck: true,
      strict: false,
      noEmit: true,
    };

    // Get all TypeScript files
    const files = glob.sync('**/*.{ts,tsx}', {
      cwd: rootDir,
      ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
      absolute: true,
    });

    this.program = ts.createProgram(files, compilerOptions);
  }

  /**
   * Parse all files and extract API calls
   */
  public async parse(): Promise<void> {
    const sourceFiles = this.program.getSourceFiles()
      .filter(sf => !sf.fileName.includes('node_modules'));

    console.log(`Parsing ${sourceFiles.length} source files...`);

    for (const sourceFile of sourceFiles) {
      this.visitNode(sourceFile, sourceFile);
    }

    console.log(`Found ${this.getTotalEndpoints()} REST endpoints`);
    console.log(`Found ${this.rpcEndpoints.length} RPC endpoints`);
  }

  /**
   * Visit AST nodes recursively
   */
  private visitNode(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Look for apiClient method calls
    if (ts.isCallExpression(node)) {
      this.processCallExpression(node, sourceFile);
    }

    // Look for RPC definitions
    if (ts.isVariableDeclaration(node)) {
      this.processRpcDefinition(node, sourceFile);
    }

    ts.forEachChild(node, (child) => this.visitNode(child, sourceFile));
  }

  /**
   * Process apiClient.method() calls
   */
  private processCallExpression(node: ts.CallExpression, sourceFile: ts.SourceFile): void {
    const expression = node.expression;

    // Check if it's a property access (e.g., apiClient.get)
    if (!ts.isPropertyAccessExpression(expression)) {
      return;
    }

    // Check if the method is one of our API methods
    const methodName = expression.name.text;
    const httpMethods = ['get', 'post', 'patch', 'put', 'delete'];

    if (!httpMethods.includes(methodName)) {
      return;
    }

    // Get the path argument (first argument)
    const pathArg = node.arguments[0];
    if (!pathArg) {
      return;
    }

    const path = this.extractPathString(pathArg);
    if (!path) {
      return;
    }

    // Extract types from generics
    const typeArguments = node.typeArguments;
    const responseType = typeArguments?.[0] ? this.typeToString(typeArguments[0], sourceFile) : undefined;
    const requestType = typeArguments?.[1] ? this.typeToString(typeArguments[1], sourceFile) : undefined;

    // Get file location
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const relativeFile = sourceFile.fileName.replace(this.rootDir, '').replace(/^[\\\/]/, '');

    // Extract path parameters
    const pathParams = this.extractPathParams(path);
    const queryParams = this.extractQueryParams(path);

    const endpoint: ApiEndpoint = {
      method: methodName.toUpperCase() as ApiEndpoint['method'],
      path,
      responseType,
      requestType,
      fileLocation: relativeFile,
      lineNumber: line + 1,
      pathParams,
      queryParams,
    };

    // Normalize the path for grouping
    const normalizedPath = this.normalizePath(path);

    if (!this.endpoints.has(normalizedPath)) {
      this.endpoints.set(normalizedPath, []);
    }
    this.endpoints.get(normalizedPath)!.push(endpoint);
  }

  /**
   * Process RPC definition exports
   */
  private processRpcDefinition(node: ts.VariableDeclaration, sourceFile: ts.SourceFile): void {
    if (!ts.isIdentifier(node.name)) {
      return;
    }

    const name = node.name.getText(sourceFile);

    // Look for pattern like: export const someRpcDef = { handler, name, schema }
    if (!name.endsWith('Def')) {
      return;
    }

    const relativeFile = sourceFile.fileName.replace(this.rootDir, '').replace(/^[\\\/]/, '');

    // Check if it's in an RPC directory
    if (!relativeFile.includes('/rpc/') && !relativeFile.includes('\\rpc\\')) {
      return;
    }

    const rpcName = name.replace('Def', '');

    this.rpcEndpoints.push({
      name: rpcName,
      fileLocation: relativeFile,
    });
  }

  /**
   * Extract path string from various node types
   */
  private extractPathString(node: ts.Node): string | null {
    // String literal: '/api/orgs/1'
    if (ts.isStringLiteral(node)) {
      return node.text;
    }

    // Template literal: `/api/orgs/${orgId}`
    if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return this.templateToPath(node);
    }

    return null;
  }

  /**
   * Convert template literal to path with parameters
   */
  private templateToPath(node: ts.TemplateLiteral): string {
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }

    let result = node.head.text;

    for (const span of (node as ts.TemplateExpression).templateSpans) {
      // Replace expression with parameter placeholder
      const expression = span.expression;
      const paramName = this.getParameterName(expression);
      result += `{${paramName}}`;
      result += span.literal.text;
    }

    return result;
  }

  /**
   * Get parameter name from expression
   */
  private getParameterName(expression: ts.Expression): string {
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }

    if (ts.isPropertyAccessExpression(expression)) {
      return expression.name.text;
    }

    return 'param';
  }

  /**
   * Extract path parameters from path string
   */
  private extractPathParams(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    if (!matches) {
      return [];
    }
    return matches.map(m => m.slice(1, -1));
  }

  /**
   * Extract query parameters from path string
   */
  private extractQueryParams(path: string): string[] {
    const queryIndex = path.indexOf('?');
    if (queryIndex === -1) {
      return [];
    }

    const queryString = path.slice(queryIndex + 1);
    const params = queryString.split('&');

    return params
      .map(p => p.split('=')[0])
      .filter(p => !p.includes('%3E') && !p.includes('%3C')); // Filter out encoded operators
  }

  /**
   * Normalize path for grouping (remove query strings, etc.)
   */
  private normalizePath(path: string): string {
    // Remove query string
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      path = path.slice(0, queryIndex);
    }

    return path;
  }

  /**
   * Convert TypeScript type to string
   */
  private typeToString(type: ts.TypeNode, sourceFile?: ts.SourceFile): string {
    return type.getText(sourceFile);
  }

  /**
   * Get total number of endpoints
   */
  private getTotalEndpoints(): number {
    let total = 0;
    for (const endpoints of this.endpoints.values()) {
      total += endpoints.length;
    }
    return total;
  }

  /**
   * Generate OpenAPI 3.0 specification
   */
  public generateOpenApi(): object {
    const paths: Record<string, any> = {};

    // Process REST endpoints
    for (const [pathKey, endpoints] of this.endpoints.entries()) {
      const pathItem: any = {};

      for (const endpoint of endpoints) {
        const operation: any = {
          summary: this.generateSummary(endpoint),
          description: `Source: ${endpoint.fileLocation}:${endpoint.lineNumber}`,
          tags: this.extractTags(endpoint.path),
        };

        // Add parameters
        const parameters: any[] = [];

        // Path parameters
        for (const param of endpoint.pathParams) {
          parameters.push({
            name: param,
            in: 'path',
            required: true,
            schema: { type: this.guessParamType(param) },
          });
        }

        // Query parameters
        for (const param of endpoint.queryParams) {
          parameters.push({
            name: param,
            in: 'query',
            required: false,
            schema: { type: 'string' },
          });
        }

        if (parameters.length > 0) {
          operation.parameters = parameters;
        }

        // Add request body for POST/PATCH/PUT
        if (['POST', 'PATCH', 'PUT'].includes(endpoint.method) && endpoint.requestType) {
          operation.requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${endpoint.requestType}`,
                },
              },
            },
          };
        }

        // Add response
        operation.responses = {
          200: {
            description: 'Successful response',
            content: endpoint.responseType
              ? {
                  'application/json': {
                    schema: {
                      $ref: `#/components/schemas/${endpoint.responseType}`,
                    },
                  },
                }
              : {},
          },
          400: {
            description: 'Bad request',
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden',
          },
          404: {
            description: 'Not found',
          },
        };

        pathItem[endpoint.method.toLowerCase()] = operation;
      }

      paths[pathKey] = pathItem;
    }

    // Add RPC endpoint
    if (this.rpcEndpoints.length > 0) {
      paths['/api/rpc'] = {
        post: {
          summary: 'Remote Procedure Call endpoint',
          description: 'Execute registered RPC functions',
          tags: ['RPC'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    func: {
                      type: 'string',
                      enum: this.rpcEndpoints.map(rpc => rpc.name),
                    },
                    params: {
                      type: 'object',
                    },
                  },
                  required: ['func', 'params'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'RPC call successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      result: {
                        type: 'object',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
    }

    const openapi = {
      openapi: '3.0.0',
      info: {
        title: 'Zetkin App API',
        version: '1.0.0',
        description: 'Auto-generated API documentation from TypeScript codebase',
        contact: {
          name: 'Zetkin Foundation',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://organize.zetk.in',
          description: 'Production server',
        },
      ],
      paths,
      components: {
        schemas: {
          // Note: Type schemas would need to be extracted separately
          // For now, we just reference the TypeScript type names
        },
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'zsid',
            description: 'Session cookie (zsid). Log in at the app to get this cookie.',
          },
        },
      },
      security: [
        {
          cookieAuth: [],
        },
      ],
      tags: this.generateTags(),
    };

    return openapi;
  }

  /**
   * Generate a human-readable summary for an endpoint
   */
  private generateSummary(endpoint: ApiEndpoint): string {
    const resource = this.extractResourceName(endpoint.path);
    const action = this.getActionFromMethod(endpoint.method);

    return `${action} ${resource}`;
  }

  /**
   * Extract resource name from path
   */
  private extractResourceName(path: string): string {
    const parts = path.split('/').filter(p => p && !p.startsWith('{'));
    const resourcePart = parts[parts.length - 1];

    if (!resourcePart || resourcePart === 'api') {
      return 'resource';
    }

    // Capitalize and singularize
    return resourcePart.charAt(0).toUpperCase() + resourcePart.slice(1);
  }

  /**
   * Get action description from HTTP method
   */
  private getActionFromMethod(method: string): string {
    const actions: Record<string, string> = {
      GET: 'Get',
      POST: 'Create',
      PATCH: 'Update',
      PUT: 'Replace',
      DELETE: 'Delete',
    };
    return actions[method] || method;
  }

  /**
   * Extract tags from path for grouping
   */
  private extractTags(path: string): string[] {
    const parts = path.split('/').filter(p => p && !p.startsWith('{'));

    // Skip 'api' and 'orgs'
    const relevantParts = parts.filter(p => p !== 'api' && p !== 'orgs');

    if (relevantParts.length === 0) {
      return ['General'];
    }

    // Use the first meaningful part as tag
    return [this.capitalizeFirst(relevantParts[0])];
  }

  /**
   * Generate list of all tags
   */
  private generateTags(): Array<{ name: string; description: string }> {
    const tagSet = new Set<string>();

    for (const endpoints of this.endpoints.values()) {
      for (const endpoint of endpoints) {
        const tags = this.extractTags(endpoint.path);
        tags.forEach(tag => tagSet.add(tag));
      }
    }

    if (this.rpcEndpoints.length > 0) {
      tagSet.add('RPC');
    }

    return Array.from(tagSet)
      .sort()
      .map(tag => ({
        name: tag,
        description: `${tag} related endpoints`,
      }));
  }

  /**
   * Guess parameter type from name
   */
  private guessParamType(paramName: string): string {
    if (paramName.toLowerCase().includes('id')) {
      return 'integer';
    }
    return 'string';
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Save OpenAPI spec to file
   */
  public saveToFile(outputPath: string): void {
    const spec = this.generateOpenApi();
    const content = JSON.stringify(spec, null, 2);

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`\nOpenAPI specification saved to: ${outputPath}`);
  }

  /**
   * Print statistics
   */
  public printStats(): void {
    console.log('\n=== OpenAPI Generation Statistics ===');
    console.log(`Total REST endpoints: ${this.getTotalEndpoints()}`);
    console.log(`Unique paths: ${this.endpoints.size}`);
    console.log(`RPC endpoints: ${this.rpcEndpoints.length}`);

    // Group by method
    const methodCounts: Record<string, number> = {};
    for (const endpoints of this.endpoints.values()) {
      for (const endpoint of endpoints) {
        methodCounts[endpoint.method] = (methodCounts[endpoint.method] || 0) + 1;
      }
    }

    console.log('\nEndpoints by HTTP method:');
    for (const [method, count] of Object.entries(methodCounts).sort()) {
      console.log(`  ${method}: ${count}`);
    }

    console.log('\nTop 10 most used paths:');
    const sortedPaths = Array.from(this.endpoints.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    for (const [path, endpoints] of sortedPaths) {
      console.log(`  ${path}: ${endpoints.length} calls`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex !== -1 && args[outputIndex + 1]
    ? args[outputIndex + 1]
    : path.join(process.cwd(), 'openapi.json');

  console.log('🚀 Zetkin OpenAPI Generator\n');
  console.log(`Root directory: ${process.cwd()}`);
  console.log(`Output file: ${outputPath}\n`);

  const generator = new OpenApiGenerator(process.cwd());

  await generator.parse();
  generator.printStats();
  generator.saveToFile(outputPath);

  console.log('\n✅ Done! You can now:');
  console.log('  1. View the spec in Swagger UI: https://editor.swagger.io/');
  console.log('  2. Import into Postman');
  console.log('  3. Generate client SDKs using openapi-generator');
  console.log('\nTo view locally with Swagger UI:');
  console.log('  npx swagger-ui-watcher openapi.json');
}

main().catch(console.error);
