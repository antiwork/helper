import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Pluggable } from "unified";

const rehypeAddWbrAfterSlash = () => {
  return (tree: any) => {
    const nodesToReplace: { node: any; newChildren: any[] }[] = [];

    const walk = (node: any): void => {
      if (node.type === "text" && node.value && typeof node.value === "string" && node.value.includes("/")) {
        const parts = node.value.split(/(\/{1,})/);
        if (parts.length > 1) {
          const newChildren: any[] = [];
          parts.forEach((part: string) => {
            if (/^\/{1,}$/.test(part)) {
              newChildren.push({ type: "text", value: part });
              newChildren.push({ type: "element", tagName: "wbr", properties: {}, children: [] });
            } else if (part) {
              newChildren.push({ type: "text", value: part });
            }
          });

          nodesToReplace.push({ node, newChildren });
        }
      }

      if (node.children) {
        for (const child of node.children) {
          child.parent = node;
          walk(child);
        }
      }
    };

    walk(tree);

    nodesToReplace.forEach(({ node, newChildren }) => {
      if (node.parent?.children) {
        const nodeIndex = node.parent.children.indexOf(node);
        node.parent.children.splice(nodeIndex, 1, ...newChildren);
      }
    });
  };
};

const remarkAutolink = () => {
  return (tree: any) => {
    const nodesToReplace: { node: any; newChildren: any[] }[] = [];

    const isInsideLink = (node: any): boolean => {
      let parent = node.parent;
      while (parent) {
        if (parent.type === "link") {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    };

    const walk = (node: any): void => {
      if (node.type === "text" && node.value && typeof node.value === "string" && !isInsideLink(node)) {
        const urlRegex = /(https?:\/\/[^\s<>"\[\]{}|\\^`]+?)(?=[.,;:!?)\]}]*(?:\s|$))/gi;
        const matches = Array.from(node.value.matchAll(urlRegex));

        if (matches.length > 0) {
          const newChildren: any[] = [];
          let lastIndex = 0;

          matches.forEach((match: unknown) => {
            const regexMatch = match as RegExpMatchArray;
            const url = regexMatch[1];
            if (!url || regexMatch.index === undefined) return;

            const matchStart = regexMatch.index;
            const matchEnd = matchStart + url.length;

            if (lastIndex < matchStart) {
              newChildren.push({
                type: "text",
                value: node.value.slice(lastIndex, matchStart),
              });
            }

            newChildren.push({
              type: "link",
              url,
              children: [{ type: "text", value: url }],
            });

            lastIndex = matchEnd;
          });

          if (lastIndex < node.value.length) {
            newChildren.push({
              type: "text",
              value: node.value.slice(lastIndex),
            });
          }

          if (newChildren.length > 0) {
            nodesToReplace.push({ node, newChildren });
          }
        }
      }

      if (node.children) {
        for (const child of node.children) {
          child.parent = node;
          walk(child);
        }
      }
    };

    walk(tree);

    nodesToReplace.forEach(({ node, newChildren }) => {
      if (node.parent?.children) {
        const nodeIndex = node.parent.children.indexOf(node);
        node.parent.children.splice(nodeIndex, 1, ...newChildren);
      }
    });
  };
};

interface MessageMarkdownProps {
  children: string | null;
  className?: string;
  components?: any;
  allowHtml?: boolean;
}

const createSanitizeSchema = () => {
  return {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), "wbr"],
    attributes: {
      ...defaultSchema.attributes,
      "*": [...(defaultSchema.attributes?.["*"] || []), "className"],
    },
  };
};

export default function MessageMarkdown({ children, className, components, allowHtml = true }: MessageMarkdownProps) {
  const sanitizeSchema = createSanitizeSchema();

  const rehypePlugins: Pluggable[] = [rehypeAddWbrAfterSlash];

  if (allowHtml) {
    rehypePlugins.unshift(rehypeRaw);
    rehypePlugins.push([rehypeSanitize, sanitizeSchema]);
  }

  return (
    <ReactMarkdown
      className={className}
      remarkPlugins={[remarkAutolink]}
      rehypePlugins={rehypePlugins}
      components={{
        a: ({ children, ...props }: any) => (
          <a target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        ),
        ...components,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
