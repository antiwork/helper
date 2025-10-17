import { remarkInstall } from "fumadocs-docgen";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { rehypeCode } from 'fumadocs-core/mdx-plugins';

export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkInstall],
    rehypePlugins: [rehypeCode],
  },
});
