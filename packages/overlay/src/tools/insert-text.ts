import type { ToolEventHandler } from "../interaction.js";
import { setActiveTool, addPendingInsertion, pushUndoAction } from "../canvas-state.js";
import { showToast } from "../toolbar.js";
import { getSelectedElement, getSelection } from "../selection.js";
import { computeNthOfType } from "../utils/nth-of-type.js";

interface TextInsertion {
  text: string;
  tagName: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
  className?: string;
}

let isEditing = false;

export const insertTextHandler: ToolEventHandler = {
  onMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target || target.closest("#react-rewrite-root")) return;

    // Si no estamos editando, iniciar inline text edit
    if (!isEditing) {
      startInlineTextEdit(target, e);
      return;
    }
  },
};

function startInlineTextEdit(target: HTMLElement, e: MouseEvent) {
  const selectedEl = getSelectedElement();
  const componentInfo = getSelection();
  
  if (!selectedEl || !componentInfo) {
    showToast("Please select an element first");
    setActiveTool("select");
    return;
  }

  isEditing = true;

  // Crear input inline
  const input = document.createElement("div");
  input.contentEditable = "true";
  input.textContent = "Type here...";
  input.style.cssText = `
    min-width: 100px;
    min-height: 24px;
    padding: 8px 12px;
    background: white;
    border: 2px solid #7ee787;
    border-radius: 4px;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    outline: none;
    position: relative;
    z-index: 10000;
    cursor: text;
  `;

  // Insertar después del elemento seleccionado
  selectedEl.insertAdjacentElement("afterend", input);
  
  // Seleccionar todo el texto por defecto
  const range = document.createRange();
  range.selectNodeContents(input);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  input.focus();

  // Handlers para confirmar/cancelar
  const confirmText = () => {
    const text = input.textContent || "";
    if (text && text !== "Type here...") {
      insertTextElement(text, selectedEl);
    }
    cleanup();
  };

  const cleanup = () => {
    input.remove();
    isEditing = false;
    setActiveTool("select");
  };

  // Enter para confirmar, Escape para cancelar
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmText();
    } else if (e.key === "Escape") {
      cleanup();
    }
  });

  // Blur para confirmar
  input.addEventListener("blur", () => {
    setTimeout(confirmText, 100);
  });

  // Click fuera para confirmar
  const outsideClick = (e: MouseEvent) => {
    if (!input.contains(e.target as Node)) {
      document.removeEventListener("mousedown", outsideClick);
      confirmText();
    }
  };
  setTimeout(() => {
    document.addEventListener("mousedown", outsideClick);
  }, 0);
}

function insertTextElement(text: string, referenceEl: HTMLElement) {
  const componentInfo = getSelection();
  if (!componentInfo) return;

  const parentEl = referenceEl.parentElement;
  const tagName: TextInsertion["tagName"] = "span"; // Default, podría ser configurable

  const operation = {
    op: "insertText" as const,
    file: componentInfo.filePath,
    line: componentInfo.lineNumber,
    col: componentInfo.columnNumber - 1,
    componentName: componentInfo.componentName,
    tagName: referenceEl.tagName.toLowerCase(),
    className: referenceEl.className || undefined,
    parentTagName: parentEl?.tagName.toLowerCase(),
    parentClassName: parentEl?.className || undefined,
    nthOfType: computeNthOfType(referenceEl),
    id: referenceEl.id || undefined,
    text,
    elementTagName: tagName,
    elementClassName: "",
  };

  addPendingInsertion(operation);

  // Crear elemento visual temporal
  const tempEl = document.createElement(tagName);
  tempEl.textContent = text;
  tempEl.style.cssText = `
    border: 2px dashed #7ee787;
    border-radius: 4px;
    padding: 4px;
    display: inline-block;
  `;

  referenceEl.insertAdjacentElement("afterend", tempEl);

  pushUndoAction({
    type: "deleteCreate",
    deleteId: `insert-text-${Date.now()}`,
    element: tempEl,
  });

  showToast("Text inserted. Press Confirm to save.");
}

export function resetInsertTextTool() {
  isEditing = false;
}
