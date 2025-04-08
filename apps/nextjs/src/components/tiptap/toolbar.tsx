import type { Editor } from "@tiptap/react";
import { ALargeSmall, Minus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Popover } from "@/components/popover";
import ToolbarFile from "@/components/tiptap/icons/file.svg";
import { imageFileTypes } from "@/components/tiptap/image";
import LinkModal from "@/components/tiptap/linkModal";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/components/useBreakpoint";
import ToolbarBlockquote from "./icons/blockquote.svg";
import ToolbarBold from "./icons/bold.svg";
import ToolbarBulletList from "./icons/bullet-list.svg";
import ToolbarImage from "./icons/image.svg";
import ToolbarItalic from "./icons/italic.svg";
import ToolbarLink from "./icons/link.svg";
import ToolbarOrderedList from "./icons/ordered-list.svg";
import { Button } from "@/components/ui/button";
import { PlusIcon, MinusIcon } from "lucide-react";

type ToolbarProps = {
  editor: Editor | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  uploadInlineImages: (images: File[]) => void;
  uploadFileAttachments: (nonImages: File[]) => void;
  enableImageUpload?: boolean;
  enableFileUpload?: boolean;
  customToolbar?: () => React.ReactNode;
  variant?: "desktop" | "mobile";
};

const Toolbar = ({
  editor,
  open,
  setOpen,
  uploadInlineImages,
  uploadFileAttachments,
  enableImageUpload,
  enableFileUpload,
  customToolbar,
  variant = "desktop",
}: ToolbarProps) => {
  const [isLinkModalOpen, setLinkModalOpen] = useState(false);
  const [linkData, setLinkData] = useState({ url: "", text: "" });
  useEffect(() => setLinkData({ url: "", text: "" }), [editor]);
  const toggleLinkModal = (open: boolean) => {
    if (!open) return setLinkModalOpen(false);
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
    } else {
      const { from, to, empty } = editor.state.selection;
      const label = empty ? "" : editor.state.doc.textBetween(from, to, "");
      setLinkData({ url: "", text: label });
      setLinkModalOpen(true);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const setLink = () => {
    if (editor && linkData.text && isValidUrl(linkData.url)) {
      const { state, dispatch } = editor.view;
      const { tr, selection } = state;
      const { from, to } = selection;
      const linkMark = state.schema.marks.link?.create({ href: linkData.url });
      if (!linkMark) return;

      const textNode = state.schema.text(linkData.text, [linkMark]);

      tr.delete(from, to);
      tr.insert(from, textNode);
      dispatch(tr);
      editor.view.focus();
    }
    setLinkModalOpen(false);
  };

  const imageFieldId = React.useId();
  const fileFieldId = React.useId();
  const baseToolbarStyles = "w-8 h-8 flex items-center justify-center rounded hover:bg-secondary cursor-pointer";

  if (!editor) {
    return null;
  }

  const toolbarContent = (
    <>
      {open && (
        <>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${baseToolbarStyles} ${editor.isActive("bold") ? "bg-muted hover:bg-muted" : ""}`}
          >
            <ToolbarBold />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${baseToolbarStyles} ${editor.isActive("italic") ? "bg-muted hover:bg-muted" : ""}`}
          >
            <ToolbarItalic />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`${baseToolbarStyles} ${editor.isActive("bulletList") ? "bg-muted hover:bg-muted" : ""}`}
          >
            <ToolbarBulletList />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`${baseToolbarStyles} ${editor.isActive("orderedList") ? "bg-muted hover:bg-muted" : ""}`}
          >
            <ToolbarOrderedList />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`${baseToolbarStyles} ${editor.isActive("blockquote") ? "bg-muted hover:bg-muted" : ""}`}
          >
            <ToolbarBlockquote />
          </button>
          <button
            type="button"
            onClick={() => setLinkModalOpen(true)}
            className={`${baseToolbarStyles} ${editor.isActive("link") ? "bg-muted hover:bg-muted" : ""}`}
          >
            <ToolbarLink />
          </button>
          {isLinkModalOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2">
              <LinkModal
                isLinkModalOpen={isLinkModalOpen}
                linkData={linkData}
                setLinkData={setLinkData}
                setLinkModalOpen={setLinkModalOpen}
                setLink={setLink}
              />
            </div>
          )}
          {enableImageUpload && (
            <label htmlFor={imageFieldId} className={`${baseToolbarStyles} cursor-pointer`}>
              <input
                aria-label="Insert image"
                multiple
                type="file"
                id={imageFieldId}
                className="hidden"
                accept={imageFileTypes.join(",")}
                onChange={(e) => {
                  const files = [...(e.target.files || [])];
                  if (!files.length) return;
                  uploadInlineImages(files);
                  e.target.value = "";
                }}
              />
              <ToolbarImage />
            </label>
          )}
          {enableFileUpload && (
            <label htmlFor={fileFieldId} className={`${baseToolbarStyles} cursor-pointer`}>
              <input
                aria-label="Insert attachments"
                multiple
                type="file"
                id={fileFieldId}
                className="hidden"
                onChange={(e) => {
                  const files = [...(e.target.files || [])];
                  if (!files.length) return;
                  uploadFileAttachments(files);
                  e.target.value = "";
                }}
              />
              <ToolbarFile />
            </label>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="flex items-center gap-2">
      {variant === "mobile" && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={(e) => {
            e.preventDefault();
            editor?.commands.focus();
            setOpen(!open);
          }}
          className={cn(
            "h-8 w-8 p-0",
            open ? "bg-muted border border-border hover:border-primary" : "border border-border hover:border-primary"
          )}
        >
          {open ? <MinusIcon className="h-4 w-4" /> : <ALargeSmall className="h-4 w-4" />}
          <span className="sr-only">{open ? "Close toolbar" : "Open toolbar"}</span>
        </Button>
      )}
      <div
        className={cn(
          "flex flex-wrap gap-1",
          variant === "desktop" && "absolute z-10 bottom-3 right-3 rounded-t border rounded-sm bg-background p-1",
          variant === "mobile" && "relative gap-2",
          open && variant === "desktop" && "left-3",
          !open && variant === "mobile" && "hidden"
        )}
      >
        {toolbarContent}
        {variant === "desktop" && (
          <button 
            type="button" 
            onClick={() => setOpen(!open)} 
            className={cn(baseToolbarStyles, "ml-auto")}
          >
            {open ? <Minus className="w-4 h-4" /> : <ALargeSmall className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
