import type { Editor } from "@tiptap/core";
import HardBreak from "@tiptap/extension-hard-break";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { TextSelection } from "@tiptap/pm/state";
import { BubbleMenu, EditorContent, useEditor, type FocusPosition } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { partition } from "lodash-es";
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { toast } from "sonner";
import UAParser from "ua-parser-js";
import { isEmptyContent } from "@/app/(dashboard)/[category]/conversation/messageActions";
import { UnsavedFileInfo, useFileUpload } from "@/components/fileUploadContext";
import { getCaretPosition } from "@/components/tiptap/editorUtils";
import FileAttachment from "@/components/tiptap/fileAttachment";
import { Image, imageFileTypes } from "@/components/tiptap/image";
import { useBreakpoint } from "@/components/useBreakpoint";
import { useRefToLatest } from "@/components/useRefToLatest";
import { searchHelpArticles } from "@/lib/search/helpArticleSearch";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import HelpArticlePopover from "./helpArticlePopover";
import Toolbar from "./toolbar";

type TipTapEditorProps = {
  defaultContent: Record<string, string>;
  onUpdate: (text: string, isEmpty: boolean) => void;
  onFocusChange?: (isFocused: boolean) => void;
  onModEnter?: () => void;
  onOptionEnter?: () => void;
  onSlashKey?: () => void;
  customToolbar?: () => ReactNode;
  enableImageUpload?: boolean;
  enableFileUpload?: boolean;
  autoFocus?: FocusPosition;
  placeholder?: string;
  editable?: boolean;
  ariaLabel?: string;
  className?: string;
  actionButtons?: ReactNode;
  followButton?: ReactNode;
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

type TipTapEditorPropsWithRef = TipTapEditorProps & { signature?: ReactNode; ref: Ref<TipTapEditorRef> };

const initialMentionState = { isOpen: false, position: null, range: null, selectedIndex: 0 };

const TipTapEditor = ({
  defaultContent,
  onUpdate,
  onFocusChange,
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
  followButton,
  isRecordingSupported,
  isRecording,
  startRecording,
  stopRecording,
  ref,
}: TipTapEditorPropsWithRef) => {
  const { data: helpArticles = [] } = api.mailbox.websites.pages.useQuery();
  const { isAboveMd } = useBreakpoint("md");
  const [isMacOS, setIsMacOS] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("editorToolbarOpen") ?? "true") === "true";
    }
    return isAboveMd;
  });
  const [mentionState, setMentionState] = useState<{
    isOpen: boolean;
    position: { top: number; left: number } | null;
    range: { from: number; to: number } | null;
    selectedIndex: number;
  }>(initialMentionState);
  const mentionStateRef = useRefToLatest(mentionState);

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
        // Handle mention state keyboard navigation
        if (mentionStateRef.current.isOpen) {
          if (event.key === "Escape") {
            setMentionState(initialMentionState);
            return true;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setMentionState((s) => ({ ...s, selectedIndex: Math.min(s.selectedIndex + 1, helpArticles.length - 1) }));
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setMentionState((s) => ({ ...s, selectedIndex: Math.max(s.selectedIndex - 1, 0) }));
            return true;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const article = filteredArticles[mentionStateRef.current.selectedIndex];
            if (article) handleSelectArticle(article);
            return true;
          }
          if (event.key === "ArrowRight") {
            setMentionState(initialMentionState);
            return true;
          }
        }

        // Handle Mod+Enter and Option+Enter
        if (
          (isMacOS && event.metaKey && event.key === "Enter") ||
          (!isMacOS && event.ctrlKey && event.key === "Enter")
        ) {
          if (onModEnter) {
            event.preventDefault();
            onModEnter();
            return true;
          }
        }

        if (event.altKey && event.key === "Enter") {
          if (onOptionEnter) {
            event.preventDefault();
            onOptionEnter();
            return true;
          }
        }

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
      handleTextInput(view, from, _to, text) {
        if (text === "@") {
          setTimeout(() => {
            const pos = getCaretPosition(view, editorContentContainerRef);
            setMentionState({
              isOpen: true,
              position: pos,
              range: { from, to: from + 1 },
              selectedIndex: 0,
            });
          }, 0);
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
    onFocus: () => onFocusChange?.(true),
    onBlur: () => onFocusChange?.(false),
  });

  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
    if (editor && focusOnCreateRef.current) {
      editor.commands.focus();
      focusOnCreateRef.current = false;
    }
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  const editorContentContainerRef = useRef<HTMLDivElement | null>(null);
  const focusOnCreateRef = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editorRef.current) editorRef.current.commands.focus();
      else focusOnCreateRef.current = true;
    },
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
    onRetry(file).upload.catch((message: string | null) => toast.error(message ?? `Failed to upload ${file.name}`));
  const insertFileAttachment = (file: File) =>
    onUpload(file, { inline: false }).upload.catch((message: string | null) =>
      toast.error(message ?? `Failed to upload ${file.name}`),
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

  useEffect(() => {
    if (!editor) return;
    const plugin = {
      props: {
        handleKeyDown(view: any, event: KeyboardEvent) {
          if (mentionState.isOpen && event.key === "Backspace") {
            const state = view.state;
            if (mentionState.range) {
              const docText = state.doc.textBetween(mentionState.range.from, mentionState.range.from + 1, "", "");
              const cursorPos = state.selection.from;
              const query = state.doc.textBetween(mentionState.range.from + 1, cursorPos, "", "");
              if (query === "") {
                setMentionState(initialMentionState);
                return false;
              }
              if (docText !== "@") {
                setMentionState(initialMentionState);
                return false;
              }
              return false;
            }
          }
          return false;
        },
      },
    } as const;
    editor.view.setProps({ ...editor.view.props, ...plugin.props });
    return () => {
      // No-op cleanup for mock plugin
    };
  }, [editor, mentionState.isOpen, mentionState.range]);

  useEffect(() => {
    if (!editor || !mentionState.isOpen || !mentionState.range) return;
    const docText = editor.view.state.doc.textBetween(mentionState.range.from, mentionState.range.from + 1, "", "");
    if (docText !== "@") {
      setMentionState(initialMentionState);
    }
  }, [editor, mentionState.isOpen, mentionState.range, editor?.view.state]);

  const getMentionQuery = () => {
    if (!editor || !mentionState.isOpen || !mentionState.range) return "";
    const cursorPos = editor.view.state.selection.from;
    if (cursorPos < mentionState.range.from + 1) return "";
    return editor.view.state.doc.textBetween(mentionState.range.from + 1, cursorPos, "", "");
  };

  const mentionQuery = getMentionQuery();
  const filteredArticles = useMemo(() => {
    return searchHelpArticles(helpArticles, mentionQuery, 10);
  }, [helpArticles, mentionQuery]);

  const handleSelectArticle = (article: { title: string; url: string }) => {
    if (!editor || !mentionState.range) return;
    const cursorPos = editor.view.state.selection.from;
    editor
      .chain()
      .focus()
      .deleteRange({ from: mentionState.range.from, to: cursorPos })
      .insertContent(`<a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a> `)
      .run();
    setMentionState(initialMentionState);
  };

  useEffect(() => {
    setMentionState((state) => ({ ...state, selectedIndex: 0 }));
  }, [mentionState.isOpen, mentionQuery, filteredArticles.map((a) => a.url).join(",")]);

  const showActionButtons = !!actionButtons && (!toolbarOpen || isAboveMd);
  const showFollowButton = !!followButton && (!toolbarOpen || isAboveMd);

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
          className="flex-1 flex flex-col min-h-0 overflow-y-auto rounded-b p-3 text-sm text-foreground relative"
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
            <EditorContent editor={editor} />
          </div>
          <HelpArticlePopover
            isOpen={mentionState.isOpen}
            position={mentionState.position}
            query={mentionQuery}
            articles={filteredArticles}
            selectedIndex={mentionState.selectedIndex}
            setSelectedIndex={(index) =>
              setMentionState((state) => ({
                ...state,
                selectedIndex: typeof index === "function" ? index(state.selectedIndex) : index,
              }))
            }
            onSelect={handleSelectArticle}
            onClose={() => setMentionState(initialMentionState)}
          />
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
      <div className="flex w-full justify-between md:justify-start relative">
        <div className="w-full md:w-auto">
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
        </div>
        {showActionButtons ? <div className="flex-shrink-0 whitespace-nowrap">{actionButtons}</div> : null}
        {showFollowButton && <div className="flex-shrink-0 ml-4 md:absolute md:right-0 md:ml-0">{followButton}</div>}
      </div>
    </div>
  );
};

TipTapEditor.displayName = "TipTapEditor";

export default TipTapEditor;
