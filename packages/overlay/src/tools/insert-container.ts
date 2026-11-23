import type { ToolEventHandler } from "../interaction.js";
import { setActiveTool, addPendingInsertion, pushUndoAction } from "../canvas-state.js";
import { showToast } from "../toolbar.js";
import { getSelectedElement, getSelection } from "../selection.js";
import { computeNthOfType } from "../utils/nth-of-type.js";

type ContainerType = "div" | "section" | "article" | "aside" | "main" | "header" | "footer" | "nav";

interface ContainerInsertion {
  containerType: ContainerType;
  containerClassName?: string;
  wrapSelected?: boolean;
}

let pendingContainer: ContainerInsertion | null = null;

export const insertContainerHandler: ToolEventHandler = {
  onMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target || target.closest("#react-rewrite-root")) return;

    // Mostrar selector de tipo de container
    if (!pendingContainer) {
      showContainerTypePicker();
      return;
    }

    // Insertar container
    const selectedEl = getSelectedElement();
    const componentInfo = getSelection();
    
    if (!selectedEl || !componentInfo) {
      showToast("Please select an element first");
      setActiveTool("select");
      return;
    }

    insertContainerElement(selectedEl, pendingContainer);
    
    pendingContainer = null;
    setActiveTool("select");
  },
};

function showContainerTypePicker() {
  // Crear panel flotante para seleccionar tipo
  const panel = document.createElement("div");
  panel.id = "container-type-picker";
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a1a;
    border: 1px solid #3a3a3a;
    border-radius: 12px;
    padding: 20px;
    z-index: 100000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    min-width: 280px;
  `;

  const title = document.createElement("div");
  title.textContent = "Select Container Type";
  title.style.cssText = `
    grid-column: 1 / -1;
    color: #fff;
    font-size: 16px;
    text-align: center;
    margin-bottom: 10px;
    font-weight: 500;
  `;
  panel.appendChild(title);

  const types: { type: ContainerType; label: string; icon: string }[] = [
    { type: "div", label: "Div", icon: "□" },
    { type: "section", label: "Section", icon: "▤" },
    { type: "article", label: "Article", icon: "📝" },
    { type: "aside", label: "Aside", icon: "↳" },
    { type: "header", label: "Header", icon: "⬆" },
    { type: "footer", label: "Footer", icon: "⬇" },
    { type: "nav", label: "Nav", icon: "☰" },
    { type: "main", label: "Main", icon: "★" },
  ];

  types.forEach(({ type, label, icon }) => {
    const btn = document.createElement("button");
    btn.style.cssText = `
      padding: 12px;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      transition: all 0.15s;
    `;
    btn.innerHTML = `
      <span style="font-size: 20px;">${icon}</span>
      <span>${label}</span>
    `;
    
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#333";
      btn.style.borderColor = "#7ee787";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#2a2a2a";
      btn.style.borderColor = "#3a3a3a";
    });
    
    btn.addEventListener("click", () => {
      pendingContainer = {
        containerType: type,
        containerClassName: "p-4 rounded-lg border border-gray-200",
        wrapSelected: false,
      };
      panel.remove();
      showToast(`Selected <${type}>. Click on the page to place it.`);
    });
    
    panel.appendChild(btn);
  });

  // Botón cancelar
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    grid-column: 1 / -1;
    padding: 10px;
    background: transparent;
    border: 1px solid #666;
    border-radius: 6px;
    color: #999;
    cursor: pointer;
    font-size: 12px;
    margin-top: 10px;
  `;
  cancelBtn.addEventListener("click", () => {
    panel.remove();
    setActiveTool("select");
  });
  panel.appendChild(cancelBtn);

  // Cerrar al click fuera
  const outsideClick = (e: MouseEvent) => {
    if (!panel.contains(e.target as Node)) {
      panel.remove();
      document.removeEventListener("mousedown", outsideClick);
      if (!pendingContainer) {
        setActiveTool("select");
      }
    }
  };
  setTimeout(() => document.addEventListener("mousedown", outsideClick), 0);

  document.body.appendChild(panel);
}

function insertContainerElement(
  selectedEl: HTMLElement,
  insertion: ContainerInsertion,
) {
  const componentInfo = getSelection();
  if (!componentInfo) return;

  const parentEl = selectedEl.parentElement;
  const containerType = insertion.containerType;
  const containerClassName = insertion.containerClassName || "";

  const operation = {
    op: "insertContainer" as const,
    file: componentInfo.filePath,
    line: componentInfo.lineNumber,
    col: componentInfo.columnNumber - 1,
    componentName: componentInfo.componentName,
    tagName: selectedEl.tagName.toLowerCase(),
    className: selectedEl.className || undefined,
    parentTagName: parentEl?.tagName.toLowerCase(),
    parentClassName: parentEl?.className || undefined,
    nthOfType: computeNthOfType(selectedEl),
    id: selectedEl.id || undefined,
    containerType,
    containerClassName,
    wrapSelected: insertion.wrapSelected || false,
  };

  addPendingInsertion(operation);

  // Crear preview visual
  const tempContainer = document.createElement(containerType);
  tempContainer.className = className;
  tempEl.style.cssText = `
    min-height: 100px;
    background: rgba(126, 231, 135, 0.1);
    border: 2px dashed #7ee787;
    position: relative;
  `;
  tempContainer.innerHTML = `
    <div style="
      position: absolute;
      top: 4px;
      left: 4px;
      background: #7ee787;
      color: #000;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    ">${containerType}</div>
  `;

  if (insertion.wrapSelected) {
    // Envolver el elemento seleccionado
    selectedEl.parentNode?.insertBefore(tempContainer, selectedEl);
    tempContainer.appendChild(selectedEl);
  } else {
    // Insertar como hermano
    selectedEl.insertAdjacentElement("afterend", tempContainer);
  }

  pushUndoAction({
    type: "deleteCreate",
    deleteId: `insert-container-${Date.now()}`,
    element: tempContainer,
  });

  showToast(`<${containerType}> ready. Press Confirm to save.`);
}

export function resetInsertContainerTool() {
  pendingContainer = null;
  const existingPicker = document.getElementById("container-type-picker");
  if (existingPicker) existingPicker.remove();
}
