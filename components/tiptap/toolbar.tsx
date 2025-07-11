import type { Editor } from "@tiptap/react";
import { ALargeSmall, Mic, Minus, MinusIcon, RemoveFormatting } from "lucide-react";
import React, { useEffect, useState } from "react";
import ToolbarFile from "@/components/tiptap/icons/file.svg";
import { imageFileTypes } from "@/components/tiptap/image";
import LinkModal from "@/components/tiptap/linkModal";
import { Button } from "@/components/ui/button";
import { useBreakpoint } from "@/components/useBreakpoint";
import { cn } from "@/lib/utils";
import ToolbarBlockquote from "./icons/blockquote.svg";
import ToolbarBold from "./icons/bold.svg";
import ToolbarBulletList from "./icons/bullet-list.svg";
import ToolbarImage from "./icons/image.svg";
import ToolbarItalic from "./icons/italic.svg";
import ToolbarLink from "./icons/link.svg";
import ToolbarOrderedList from "./icons/ordered-list.svg";

type ToolbarProps = {
  editor: Editor | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  uploadInlineImages: (images: File[]) => void;
  uploadFileAttachments: (nonImages: File[]) => void;
  enableImageUpload?: boolean;
  enableFileUpload?: boolean;
  isRecording: boolean;
  isRecordingSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
};

const Toolbar = ({
  editor,
  open,
  setOpen,
  uploadInlineImages,
  uploadFileAttachments,
  enableImageUpload,
  enableFileUpload,
  isRecording,
  isRecordingSupported,
  startRecording,
  stopRecording,
}: ToolbarProps) => {
  const { isAboveMd } = useBreakpoint("md");
  const [isLinkModalOpen, setLinkModalOpen] = useState(false);
  const [linkData, setLinkData] = useState({ url: "", text: "" });
  const [activeLinkElement, setActiveLinkElement] = useState<HTMLElement | null>(null);
  useEffect(() => setLinkData({ url: "", text: "" }), [editor]);
  const toggleLinkModal = (open: boolean) => {
    if (!open) return setLinkModalOpen(false);
    if (!editor) return;

    if (isLinkModalOpen) {
      setLinkModalOpen(false);
      return;
    }

    setOpen(true);
    const { from, to, empty } = editor.state.selection;
    const label = empty ? "" : editor.state.doc.textBetween(from, to, "");

    if (editor.isActive("link")) {
      const linkMark = editor.getAttributes("link");
      setLinkData({ url: linkMark.href || "", text: label });
    } else {
      setLinkData({ url: "", text: label });
    }
    setLinkModalOpen(true);
  };

  useEffect(() => {
    if (!editor) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const linkElement = target.closest("a");
      if (linkElement) {
        if (editor.isActive("link")) {
          setOpen(true);
          const linkMark = editor.getAttributes("link");
          const text = linkElement.textContent || "";
          setLinkData({ url: linkMark.href || "", text });
          setLinkModalOpen(true);
          setActiveLinkElement(linkElement);
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("click", handleClick);
    return () => {
      editorElement.removeEventListener("click", handleClick);
    };
  }, [editor]);

  useEffect(() => {
    if (isLinkModalOpen) {
      activeLinkElement?.classList.add("bg-primary/10", "dark:bg-primary/10");
    } else {
      activeLinkElement?.classList.remove("bg-primary/10", "dark:bg-primary/10");
      setActiveLinkElement(null);
    }
  }, [isLinkModalOpen, activeLinkElement]);

  const setLink = () => {
    if (!editor) return;

    if (editor.isActive("link")) {
      if (!linkData.url) {
        editor.chain().focus().unsetLink().run();
      } else {
        editor.chain().focus().extendMarkRange("link").run();
        const { from, to } = editor.state.selection;
        const linkMark = editor.state.schema.marks.link?.create({ href: linkData.url });
        if (!linkMark) return;
        const textNode = editor.state.schema.text(linkData.text, [linkMark]);
        const tr = editor.state.tr;
        tr.delete(from, to).insert(from, textNode);
        editor.view.dispatch(tr);
      }
    } else if (linkData.text && linkData.url) {
      const { from, to } = editor.state.selection;
      const linkMark = editor.state.schema.marks.link?.create({ href: linkData.url });
      if (!linkMark) return;
      const textNode = editor.state.schema.text(linkData.text, [linkMark]);
      editor.view.dispatch(editor.state.tr.delete(from, to).insert(from, textNode));
    } else if (linkData.url) {
      editor.chain().focus().setLink({ href: linkData.url }).run();
    }
    editor.view.focus();
    setLinkModalOpen(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
            aria-label="Bold"
          >
            <ToolbarBold />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${baseToolbarStyles} ${editor.isActive("italic") ? "bg-muted hover:bg-muted" : ""}`}
            aria-label="Italic"
          >
            <ToolbarItalic />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`${baseToolbarStyles} ${editor.isActive("bulletList") ? "bg-muted hover:bg-muted" : ""}`}
            aria-label="Bullet list"
          >
            <ToolbarBulletList />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`${baseToolbarStyles} ${editor.isActive("orderedList") ? "bg-muted hover:bg-muted" : ""}`}
            aria-label="Numbered list"
          >
            <ToolbarOrderedList />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`${baseToolbarStyles} ${editor.isActive("blockquote") ? "bg-muted hover:bg-muted" : ""}`}
            aria-label="Blockquote"
          >
            <ToolbarBlockquote />
          </button>
          <button
            type="button"
            onClick={() => toggleLinkModal(true)}
            className={`${baseToolbarStyles} ${editor.isActive("link") ? "bg-muted hover:bg-muted" : ""}`}
            aria-label="Link"
          >
            <ToolbarLink />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            className={baseToolbarStyles}
            aria-label="Clear formatting"
          >
            <RemoveFormatting className="w-4 h-4" />
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
      {isRecordingSupported && !isAboveMd && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          type="button"
          onClick={toggleRecording}
          className={cn("h-8 w-8 p-0 border border-border hover:border-primary", {
            "bg-muted": isRecording,
          })}
          aria-label={isRecording ? "Stop" : "Dictate"}
        >
          <Mic
            className={cn("w-4 h-4", {
              "text-red-500": isRecording,
              "text-primary": !isRecording,
            })}
          />
        </Button>
      )}
      {!isAboveMd && (
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
            open ? "bg-muted border border-border hover:border-primary" : "border border-border hover:border-primary",
          )}
        >
          {open ? <MinusIcon className="h-4 w-4" /> : <ALargeSmall className="h-4 w-4" />}
          <span className="sr-only">{open ? "Close toolbar" : "Open toolbar"}</span>
        </Button>
      )}
      <div
        className={cn(
          isAboveMd
            ? "flex flex-wrap gap-1 absolute z-10 right-3 rounded-t border rounded-sm bg-background p-1 translate-y-[-100%] mb-4"
            : "flex flex-1 min-w-0 gap-1",
          open && isAboveMd && "left-3",
          !open && !isAboveMd && "hidden",
        )}
      >
        {toolbarContent}
        {isAboveMd && (
          <button type="button" onClick={() => setOpen(!open)} className={cn(baseToolbarStyles, "ml-auto")}>
            {open ? <Minus className="w-4 h-4" /> : <ALargeSmall className="w-4 h-4" />}
          </button>
        )}
        {isRecordingSupported && isAboveMd && (
          <button
            type="button"
            onClick={toggleRecording}
            className={cn(baseToolbarStyles, {
              "bg-muted": isRecording,
            })}
            aria-label={isRecording ? "Stop" : "Dictate"}
          >
            <Mic
              className={cn("w-4 h-4", {
                "text-red-500": isRecording,
                "text-primary": !isRecording,
              })}
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
