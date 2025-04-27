import { generateFiles } from 'fumadocs-openapi';
 
void generateFiles({
  input: ['./public/openapi.json'], // the OpenAPI schemas
  output: './content/docs/api-reference',
});
