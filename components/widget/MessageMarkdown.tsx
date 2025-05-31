import ReactMarkdown from "react-markdown";

const rehypeAddWbrAfterSlash = () => {
  return (tree: any) => {
    const nodesToReplace: { node: any; newChildren: any[] }[] = [];

    const walk = (node: any): void => {
      if (node.type === "text" && node.value && typeof node.value === "string" && node.value.includes("/")) {
        const parts = node.value.split(/(\/{1,})/);
        if (parts.length > 1) {
          const newChildren: any[] = [];
          parts.forEach((part: string, index: number) => {
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
        const parts = node.value.split(urlRegex);

        if (parts.length > 1) {
          const newChildren: any[] = [];
          parts.forEach((part: string) => {
            if (urlRegex.test(part)) {
              newChildren.push({
                type: "link",
                url: part,
                children: [{ type: "text", value: part }],
              });
            } else if (part) {
              newChildren.push({ type: "text", value: part });
            }
          });

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
  children: string;
  className?: string;
  components?: any;
}

export default function MessageMarkdown({ children, className, components }: MessageMarkdownProps) {
  return (
    <ReactMarkdown
      className={className}
      remarkPlugins={[remarkAutolink]}
      rehypePlugins={[rehypeAddWbrAfterSlash]}
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
