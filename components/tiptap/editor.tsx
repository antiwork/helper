import type { Editor } from "@tiptap/core";
import HardBreak from "@tiptap/extension-hard-break";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { TextSelection } from "@tiptap/pm/state";
import { BubbleMenu, EditorContent, useEditor, type FocusPosition } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import partition from "lodash/partition";
import React, { ReactNode, useEffect, useImperativeHandle, useRef } from "react";
import UAParser from "ua-parser-js";
import { isEmptyContent } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/messageActions";
import { UnsavedFileInfo, useFileUpload } from "@/components/fileUploadContext";
import { toast } from "@/components/hooks/use-toast";
import FileAttachment from "@/components/tiptap/fileAttachment";
import { Image, imageFileTypes } from "@/components/tiptap/image";
import { useBreakpoint } from "@/components/useBreakpoint";
import { useRefToLatest } from "@/components/useRefToLatest";
import { cn } from "@/lib/utils";
import Toolbar from "./toolbar";

type TipTapEditorProps = {
  defaultContent: Record<string, string>;
  onUpdate: (text: string, isEmpty: boolean) => void;
  onModEnter?: () => void;
  onOptionEnter?: () => void;
  onSlashKey?: () => void;
  customToolbar?: () => React.ReactNode;
  enableImageUpload?: boolean;
  enableFileUpload?: boolean;
  autoFocus?: FocusPosition;
  placeholder?: string;
  editable?: boolean;
  ariaLabel?: string;
  className?: string;
  actionButtons?: React.ReactNode;
  isRecordingSupported: boolean;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string; upload: Promise<UnsavedFileInfo> }) => ReturnType;
    };
  }
}

// Configuration taken from https://github.com/ueberdosis/tiptap/issues/2571#issuecomment-1712057913
const NonInclusiveLink = Link.extend({ inclusive: false }).configure({
  autolink: true,
  openOnClick: false,
});

const HardBreakIgnoreModEnter = HardBreak.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      "Mod-Enter": () => true,
    };
  },
});

export type TipTapEditorRef = {
  focus: () => void;
  scrollTo: (y: number) => void;
  editor: Editor | null;
};

const TipTapEditor = React.forwardRef<TipTapEditorRef, TipTapEditorProps & { signature?: ReactNode }>(
  (
    {
      defaultContent,
      onUpdate,
      onModEnter,
      onOptionEnter,
      onSlashKey,
      autoFocus,
      customToolbar,
      enableImageUpload,
      enableFileUpload,
      placeholder,
      signature,
      editable,
      ariaLabel,
      className,
      actionButtons,
      isRecordingSupported,
      isRecording,
      startRecording,
      stopRecording,
    },
    ref,
  ) => {
    const { isAboveMd } = useBreakpoint("md");
    const [isMacOS, setIsMacOS] = React.useState(false);
    const [toolbarOpen, setToolbarOpen] = React.useState(() => {
      if (typeof window !== "undefined") {
        return (localStorage.getItem("editorToolbarOpen") ?? "true") === "true";
      }
      return true;
    });

    useEffect(() => {
      localStorage.setItem("editorToolbarOpen", String(toolbarOpen));
    }, [toolbarOpen]);

    const updateContent = useRefToLatest((editor: Editor) => {
      const serializedContent = editor.getHTML();
      onUpdate(serializedContent, editor.isEmpty && isEmptyContent(serializedContent));
    });

    const editor = useEditor({
      immediatelyRender: false,
      editable: editable !== undefined ? editable : true,
      extensions: [
        StarterKit.configure({ hardBreak: false }),
        HardBreakIgnoreModEnter,
        Underline,
        NonInclusiveLink,
        Image,
        ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
      ],
      editorProps: {
        handleKeyDown: (view, event) => {
          // Handle slash key to focus command bar
          if (event.key === "/") {
            const { $from } = view.state.selection;
            const isStartOfLine = $from.parentOffset === 0;
            if (isStartOfLine) {
              event.preventDefault();
              onSlashKey?.();
              return true;
            }
          }
          return false;
        },
        handleDOMEvents: {
          paste(view, event: Event) {
            if (!(event instanceof ClipboardEvent)) return false;
            const files = [...(event.clipboardData?.files ?? [])];
            if (!files.length) {
              setTimeout(() => {
                // Unselect the text when pasting links into that text
                const { from, to } = view.state.selection;
                if (from !== to) {
                  const node = view.state.doc.nodeAt(from);
                  if (node?.marks.some((m) => m.type.name === "link")) {
                    const transaction = view.state.tr.setSelection(TextSelection.create(view.state.doc, to));
                    view.dispatch(transaction);
                  }
                }
              }, 0);
              return false;
            }
            uploadFiles.current(files);
            event.preventDefault();
            return true;
          },
        },
      },
      content: defaultContent.content || "",
      onUpdate: ({ editor }) => updateContent.current(editor),
    });

    const handleModEnter = (event: React.KeyboardEvent) => {
      if ((isMacOS && event.metaKey && event.key === "Enter") || (!isMacOS && event.ctrlKey && event.key === "Enter")) {
        if (onModEnter) {
          onModEnter();
          return;
        }
      }

      if (event.altKey && event.key === "Enter") {
        if (onOptionEnter) {
          onOptionEnter();
        }
      }
    };

    useEffect(() => {
      setIsMacOS(new UAParser().getOS().name === "Mac OS");
    }, []);

    useEffect(() => {
      if (editor && autoFocus) {
        editor.commands.focus(autoFocus);
      }
    }, [editor, autoFocus]);

    useEffect(() => {
      if (editor && !editor.isEmpty) return;
      if (editor) editor.commands.setContent(defaultContent.content || "");
    }, [defaultContent, editor]);

    const editorRef = useRef(editor);
    useEffect(() => {
      editorRef.current = editor;
      return () => {
        if (editor) {
          editor.destroy();
        }
      };
    }, [editor]);

    const editorContentContainerRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.commands.focus(),
      scrollTo: (top: number) =>
        editorContentContainerRef.current?.scrollTo({
          top,
          behavior: "smooth",
        }),
      editor: editorRef.current,
    }));

    const focusEditor = () => {
      if (editor) {
        editor.view.focus();
      }
    };

    const { unsavedFiles, onUpload, onRetry } = useFileUpload();
    const retryNonImageUpload = (file: File) =>
      onRetry(file).upload.catch((message: string | null) =>
        toast({
          title: message ?? `Failed to upload ${file.name}`,
          variant: "destructive",
        }),
      );
    const insertFileAttachment = (file: File) =>
      onUpload(file, { inline: false }).upload.catch((message: string | null) =>
        toast({
          title: message ?? `Failed to upload ${file.name}`,
          variant: "destructive",
        }),
      );
    const insertInlineImage = (file: File) => {
      if (!editorRef.current) return;
      const { upload, blobUrl } = onUpload(file, { inline: true });
      editorRef.current.commands.setImage({
        src: blobUrl,
        upload,
      });
    };
    const uploadInlineImages = (images: File[]) => {
      for (const image of images) insertInlineImage(image);
    };
    const uploadFileAttachments = (nonImages: File[]) => {
      for (const file of nonImages) insertFileAttachment(file);
    };
    const uploadFiles = useRefToLatest((files: File[]) => {
      const [images, nonImages] = partition(files, (file) => imageFileTypes.includes(file.type));
      if (enableImageUpload) uploadInlineImages(images);
      if (enableFileUpload) uploadFileAttachments(nonImages);
    });
    const attachments = unsavedFiles.filter((f) => !f.inline);

    if (!editor) {
      return null;
    }

    return (
      <div className={cn("relative flex flex-col gap-4", className)}>
        <div
          className={cn(
            "grow flex flex-col min-h-0 rounded border border-border bg-background",
            toolbarOpen && isAboveMd && "pb-14",
          )}
          aria-label={ariaLabel}
        >
          <div
            className="flex-1 flex flex-col min-h-0 overflow-y-auto rounded-b p-3 text-sm text-foreground"
            onClick={focusEditor}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const files = [...(event.dataTransfer.files ?? [])];
              if (!files.length) return false;
              uploadFiles.current(files);
            }}
            ref={editorContentContainerRef}
          >
            <div className="grow">
              <EditorContent editor={editor} onKeyDown={handleModEnter} />
            </div>
            {signature}
            {attachments.length > 0 ? (
              <div className="flex w-full flex-wrap gap-2 pt-4">
                {attachments.map((fileInfo, idx) => (
                  <FileAttachment key={idx} fileInfo={fileInfo} onRetry={retryNonImageUpload} />
                ))}
              </div>
            ) : null}
          </div>

          {editor && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{
                duration: 100,
                placement: "bottom-start",
                appendTo: editorContentContainerRef.current || "parent",
              }}
              shouldShow={({ editor }) =>
                isAboveMd && editor.state.selection.content().size > 0 && !editor.isActive("image")
              }
              className="rounded border border-border bg-background p-2 text-xs text-muted-foreground"
            >
              Hint: Paste URL to create link
            </BubbleMenu>
          )}
        </div>
        <div className="flex justify-between md:justify-start">
          <Toolbar
            {...{
              open: toolbarOpen,
              setOpen: setToolbarOpen,
              editor,
              uploadFileAttachments,
              uploadInlineImages,
              customToolbar,
              enableImageUpload,
              enableFileUpload,
              isRecording,
              isRecordingSupported,
              startRecording,
              stopRecording,
            }}
          />
          {toolbarOpen && !isAboveMd ? null : actionButtons}
        </div>
      </div>
    );
  },
);

TipTapEditor.displayName = "TipTapEditor";

export default TipTapEditor;
