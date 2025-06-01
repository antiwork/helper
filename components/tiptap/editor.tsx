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
import { createPortal } from "react-dom";
import { useOnOutsideClick } from "@/components/useOnOutsideClick";
import { ExternalLink, Search } from "lucide-react";
import HelpArticleMentionPopover, { HelpArticle } from "./HelpArticleMentionPopover";

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

const mockHelpArticles: HelpArticle[] = [
  { title: 'Why choose Gumroad?', url: 'https://gumroad.com/help/article/64-is-gumroad-for-me.html' },
  { title: 'Account settings', url: 'https://gumroad.com/help/article/67-the-settings-menu.html' },
  { title: 'Filling out payout settings', url: 'https://gumroad.com/help/article/260-your-payout-settings-page.html' },
  { title: 'Build a website on Gumroad', url: 'https://gumroad.com/help/article/124-your-gumroad-profile-page.html' },
  { title: 'Having multiple accounts', url: 'https://gumroad.com/help/article/252-multiple-accounts.html' },
  { title: 'Protecting creator privacy', url: 'https://gumroad.com/help/article/300-protecting-creator-privacy.html' },
  { title: 'How to get paid', url: 'https://gumroad.com/help/article/301-how-to-get-paid.html' },
  { title: 'Refunds and returns', url: 'https://gumroad.com/help/article/302-refunds-and-returns.html' },
  { title: 'Product delivery issues', url: 'https://gumroad.com/help/article/303-product-delivery-issues.html' },
  { title: 'Tax information', url: 'https://gumroad.com/help/article/304-tax-information.html' },
  { title: 'Subscription management', url: 'https://gumroad.com/help/article/305-subscription-management.html' },
  { title: 'Analytics and reporting', url: 'https://gumroad.com/help/article/306-analytics-and-reporting.html' },
  { title: 'Integrations', url: 'https://gumroad.com/help/article/307-integrations.html' },
  { title: 'API access', url: 'https://gumroad.com/help/article/308-api-access.html' },
  { title: 'Custom domains', url: 'https://gumroad.com/help/article/309-custom-domains.html' },
  { title: 'Affiliate program', url: 'https://gumroad.com/help/article/310-affiliate-program.html' },
  { title: 'Security best practices', url: 'https://gumroad.com/help/article/311-security-best-practices.html' },
  { title: 'Mobile app', url: 'https://gumroad.com/help/article/312-mobile-app.html' },
  { title: 'Notifications', url: 'https://gumroad.com/help/article/313-notifications.html' },
  { title: 'User roles', url: 'https://gumroad.com/help/article/314-user-roles.html' },
  { title: 'Advanced settings', url: 'https://gumroad.com/help/article/315-advanced-settings.html' },
  { title: 'Troubleshooting', url: 'https://gumroad.com/help/article/316-troubleshooting.html' },
  { title: 'Legal and compliance', url: 'https://gumroad.com/help/article/317-legal-and-compliance.html' },
  { title: 'Open source', url: 'https://gumroad.com/help/article/318-open-source.html' },
];

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
      return isAboveMd;
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
    const [mentionState, setMentionState] = React.useState<{
      isOpen: boolean;
      position: { top: number; left: number } | null;
      range: { from: number; to: number } | null;
    }>({ isOpen: false, position: null, range: null });

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

    const getCaretPosition = () => {
      if (!editor) return null;
      const view = editor.view;
      const { from } = view.state.selection;
      const dom = view.domAtPos(from).node as HTMLElement;
      if (!dom) return null;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      const range = selection.getRangeAt(0).cloneRange();
      if (range.getClientRects) {
        const rects = range.getClientRects();
        if (rects.length > 0) {
          const rect = rects[0];
          if (!rect) return null;
          return {
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
          };
        } else if (dom && dom.getBoundingClientRect) {
          // fallback: use the bounding rect of the parent node
          const rect = dom.getBoundingClientRect();
          return {
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
          };
        }
      }
      // fallback: top left of the editor
      const containerRect = editorContentContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        return {
          top: containerRect.top + window.scrollY + 24,
          left: containerRect.left + window.scrollX + 8,
        };
      }
      return { top: 40, left: 40 };
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (mentionState.isOpen) {
        if (event.key === 'Escape') {
          setMentionState({ isOpen: false, position: null, range: null });
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
          event.preventDefault();
          return;
        }
        if (event.key === 'ArrowRight') {
          setMentionState({ isOpen: false, position: null, range: null });
          return;
        }
      }
      handleModEnter(event);
    };

    React.useEffect(() => {
      if (!editor) return;
      const plugin = {
        props: {
          handleTextInput(
            view: any,
            from: number,
            to: number,
            text: string
          ) {
            if (text === '@') {
              setTimeout(() => {
                const pos = getCaretPosition();
                setMentionState({
                  isOpen: true,
                  position: pos,
                  range: { from, to: from + 1 },
                });
              }, 0);
            }
            return false;
          },
          handleKeyDown(view: any, event: KeyboardEvent) {
            if (mentionState.isOpen && event.key === 'Backspace') {
              const state = view.state;
              if (mentionState.range) {
                const docText = state.doc.textBetween(mentionState.range.from, mentionState.range.from + 1, '', '');
                const cursorPos = state.selection.from;
                const query = state.doc.textBetween(mentionState.range.from + 1, cursorPos, '', '');
                if (query === '') {
                  setMentionState({ isOpen: false, position: null, range: null });
                  return false;
                }
                if (docText !== '@') {
                  setMentionState({ isOpen: false, position: null, range: null });
                  return false;
                }
                return false;
              }
            }
            return false;
          },
        },
      };
      // @ts-ignore: Not a real ProseMirror plugin, just for demo/mockup
      editor.view.setProps({ ...editor.view.props, ...plugin.props });
      return () => {
        // No-op cleanup for mock plugin
      };
    }, [editor, mentionState.isOpen, mentionState.range]);

    React.useEffect(() => {
      if (!editor || !mentionState.isOpen || !mentionState.range) return;
      const docText = editor.view.state.doc.textBetween(mentionState.range.from, mentionState.range.from + 1, '', '');
      if (docText !== '@') {
        setMentionState({ isOpen: false, position: null, range: null });
      }
    }, [editor, mentionState.isOpen, mentionState.range, editor?.view.state]);

    const getMentionQuery = () => {
      if (!editor || !mentionState.isOpen || !mentionState.range) return '';
      const cursorPos = editor.view.state.selection.from;
      if (cursorPos < mentionState.range.from + 1) return '';
      return editor.view.state.doc.textBetween(mentionState.range.from + 1, cursorPos, '', '');
    };

    const handleSelectArticle = (article: { title: string; url: string }) => {
      if (!editor || !mentionState.range) return;
      const cursorPos = editor.view.state.selection.from;
      editor.chain().focus()
        .deleteRange({ from: mentionState.range.from, to: cursorPos })
        .insertContent(
          `<a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a> `
        )
        .run();
      setMentionState({ isOpen: false, position: null, range: null });
    };

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
            onKeyDown={handleKeyDown}
          >
            <div className="grow">
              <EditorContent editor={editor} />
            </div>
            <HelpArticleMentionPopover
              isOpen={mentionState.isOpen}
              position={mentionState.position}
              query={getMentionQuery()}
              articles={mockHelpArticles}
              onSelect={handleSelectArticle}
              onClose={() => setMentionState({ isOpen: false, position: null, range: null })}
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
        <div className="flex w-full justify-between md:justify-start">
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
          {toolbarOpen && !isAboveMd ? null : <div className="flex-shrink-0 whitespace-nowrap">{actionButtons}</div>}
        </div>
      </div>
    );
  },
);

TipTapEditor.displayName = "TipTapEditor";

export default TipTapEditor;
