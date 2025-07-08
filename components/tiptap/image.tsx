import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRunOnce } from "@/components/useRunOnce";

export const imageFileTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/heic"];

const ImageNodeView = ({ node, editor, getPos, updateAttributes, deleteNode }: NodeViewProps) => {
  const [hasFocus, setHasFocus] = useState(false);
  const nodeRef = useRef<HTMLImageElement>(null);

  const { attrs } = node;

  const handleImageClick = useCallback(() => {
    if (editor.isEditable) {
      setHasFocus(true);
      editor.commands.setNodeSelection(getPos());
    }
  }, [editor, getPos]);

  useRunOnce(() => {
    if (attrs.upload) {
      attrs.upload
        .then(({ url }: { url: string }) => {
          try {
            updateAttributes({
              upload: null,
              src: url,
            });
          } catch {}
        })
        .catch((error: unknown) => {
          toast.error("Failed to upload image", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          // Tiptap types claim that this won't be undefined, but the types are wrong
          if (getPos() !== undefined) deleteNode();
        });
    }
  });

  useEffect(() => {
    const listener = (e: Event) => {
      if (nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
        setHasFocus(false);
      }
    };
    document.addEventListener("mouseup", listener);
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("mouseup", listener);
      document.removeEventListener("keydown", listener);
    };
  }, []);

  return (
    <NodeViewWrapper>
      <p>
        {}
        <img
          src={attrs.src}
          ref={nodeRef}
          alt={attrs.alt || "Image"}
          onClick={handleImageClick}
          className={`${attrs.upload ? "opacity-50" : ""} ${hasFocus ? "outline-primary outline outline-1" : ""}`}
          data-drag-handle
          data-has-focus={hasFocus || undefined}
          contentEditable={false}
          style={{ maxWidth: "100%" }}
        />
      </p>
    </NodeViewWrapper>
  );
};

export const Image = TiptapNode.create({
  name: "image",
  inline: true,
  group: "inline",
  draggable: true,
  addAttributes: () => ({
    src: { default: null },
    upload: { default: null },
  }),

  parseHTML: () => [{ tag: "img[src]" }],
  renderHTML: ({ HTMLAttributes }) => ["p", ["img", mergeAttributes(HTMLAttributes, { style: "max-width: 100%" })]],

  addNodeView: () => ReactNodeViewRenderer(ImageNodeView),

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    };
  },
});
