"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Pluggable } from "unified";

const rehypeAddWbrAfterSlash = () => {
  return (tree: any) => {
    const nodesToReplace: { node: any; newChildren: any[] }[] = [];

    const visit = (node: any) => {
      if (node.type === "text" && typeof node.value === "string") {
        const parts = node.value.split("/");
        if (parts.length > 1) {
          const newChildren: any[] = [];
          for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
              newChildren.push({ type: "text", value: "/" });
              newChildren.push({ type: "element", tagName: "wbr", children: [] });
            }
            if (parts[i]) {
              newChildren.push({ type: "text", value: parts[i] });
            }
          }
          nodesToReplace.push({ node, newChildren });
        }
      }

      if (node.children) {
        node.children.forEach(visit);
      }
    };

    visit(tree);

    nodesToReplace.forEach(({ node, newChildren }) => {
      const parent = findParent(tree, node);
      if (parent && parent.children) {
        const index = parent.children.indexOf(node);
        if (index !== -1) {
          parent.children.splice(index, 1, ...newChildren);
        }
      }
    });

    return tree;
  };
};

const findParent = (tree: any, target: any): any => {
  if (tree.children) {
    for (const child of tree.children) {
      if (child === target) {
        return tree;
      }
      const found = findParent(child, target);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const remarkAutolink = () => {
  return (tree: any) => {
    const urlRegex = /https?:\/\/[^\s<>]+/g;

    const visit = (node: any) => {
      if (node.type === "text" && typeof node.value === "string") {
        const matches = [...node.value.matchAll(urlRegex)];
        if (matches.length > 0) {
          const newChildren: any[] = [];
          let lastIndex = 0;

          matches.forEach((match) => {
            const url = match[0];
            const startIndex = match.index!;

            if (startIndex > lastIndex) {
              newChildren.push({
                type: "text",
                value: node.value.slice(lastIndex, startIndex),
              });
            }

            newChildren.push({
              type: "link",
              url: url,
              children: [{ type: "text", value: url }],
            });

            lastIndex = startIndex + url.length;
          });

          if (lastIndex < node.value.length) {
            newChildren.push({
              type: "text",
              value: node.value.slice(lastIndex),
            });
          }

          const parent = findParent(tree, node);
          if (parent && parent.children) {
            const index = parent.children.indexOf(node);
            if (index !== -1) {
              parent.children.splice(index, 1, ...newChildren);
            }
          }
        }
      }

      if (node.children) {
        node.children.forEach(visit);
      }
    };

    visit(tree);
    return tree;
  };
};

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

interface MessageContentProps {
  message: { content: string };
  className?: string;
  components?: any;
  allowHtml?: boolean;
}

export const MessageContent = ({
  message,
  className = "prose prose-sm max-w-none",
  components,
  allowHtml = true,
}: MessageContentProps) => {
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
      {message.content}
    </ReactMarkdown>
  );
};
