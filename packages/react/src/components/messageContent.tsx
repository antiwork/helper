"use client";

import React from "react";
import ReactMarkdown, { Options } from "react-markdown";

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
              newChildren.push({ type: "element", tagName: "wbr", properties: {}, children: [] });
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
    const nodesToReplace: { node: any; newChildren: any[] }[] = [];

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

interface MessageContentProps {
  message: { content: string };
  className?: string;
  options?: Options;
  allowHtml?: boolean;
}

class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("Helper markdown rendering failed, falling back to plain text:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export const MessageContent = ({
  message,
  className,
  options: { remarkPlugins, rehypePlugins, components, ...options } = {},
}: MessageContentProps) => {
  return (
    <MarkdownErrorBoundary fallback={<div className={className}>{message.content}</div>}>
      <ReactMarkdown
        {...options}
        className={className}
        remarkPlugins={[...(remarkPlugins || []), remarkAutolink]}
        rehypePlugins={[...(rehypePlugins || []), rehypeAddWbrAfterSlash]}
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
    </MarkdownErrorBoundary>
  );
};
