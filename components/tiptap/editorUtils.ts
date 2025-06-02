import { EditorView } from "@tiptap/pm/view";

export const getCaretPosition = (
  view: EditorView,
  editorContentContainerRef: React.RefObject<HTMLDivElement | null>,
) => {
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
    } else if (dom?.getBoundingClientRect) {
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
