import type { ToolEventHandler } from "../interaction.js";
import { setActiveTool, addPendingInsertion, pushUndoAction } from "../canvas-state.js";
import { showToast } from "../toolbar.js";
import { getSelectedElement, getSelection } from "../selection.js";
import { computeNthOfType } from "../utils/nth-of-type.js";

// Iconos populares de Lucide
const POPULAR_ICONS = [
  { name: "Home", icon: "🏠" },
  { name: "User", icon: "👤" },
  { name: "Settings", icon: "⚙" },
  { name: "Search", icon: "🔍" },
  { name: "Heart", icon: "❤" },
  { name: "Star", icon: "⭐" },
  { name: "Mail", icon: "✉" },
  { name: "Phone", icon: "📞" },
  { name: "MapPin", icon: "📍" },
  { name: "Calendar", icon: "📅" },
  { name: "Clock", icon: "🕐" },
  { name: "Check", icon: "✓" },
  { name: "X", icon: "✕" },
  { name: "Plus", icon: "+" },
  { name: "Minus", icon: "−" },
  { name: "ArrowRight", icon: "→" },
  { name: "ArrowLeft", icon: "←" },
  { name: "ArrowUp", icon: "↑" },
  { name: "ArrowDown", icon: "↓" },
  { name: "Menu", icon: "☰" },
  { name: "Upload", icon: "⬆" },
  { name: "Download", icon: "⬇" },
  { name: "Trash", icon: "🗑" },
  { name: "Edit", icon: "✎" },
];

type IconLibrary = "lucide" | "heroicons" | "phosphor" | "radix";

interface IconInsertion {
  iconLibrary: IconLibrary;
  iconName: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

let pendingIcon: IconInsertion | null = null;

export const insertIconHandler: ToolEventHandler = {
  onMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target || target.closest("#react-rewrite-root")) return;

    // Mostrar picker de iconos si no hay uno pendiente
    if (!pendingIcon) {
      showIconPicker();
      return;
    }

    // Insertar icono
    const selectedEl = getSelectedElement();
    const componentInfo = getSelection();
    
    if (!selectedEl || !componentInfo) {
      showToast("Please select an element first");
      setActiveTool("select");
      return;
    }

    insertIconElement(selectedEl, pendingIcon);
    
    pendingIcon = null;
    setActiveTool("select");
  },
};

function showIconPicker() {
  const panel = document.createElement("div");
  panel.id = "icon-picker";
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
    max-width: 400px;
    max-height: 500px;
    overflow-y: auto;
  `;

  // Título
  const title = document.createElement("div");
  title.textContent = "Select Icon";
  title.style.cssText = `
    color: #fff;
    font-size: 18px;
    text-align: center;
    margin-bottom: 15px;
    font-weight: 500;
  `;
  panel.appendChild(title);

  // Selector de librería
  const libSelector = document.createElement("div");
  libSelector.style.cssText = `
    display: flex;
    gap: 8px;
    margin-bottom: 15px;
    justify-content: center;
  `;
  
  const libs: { id: IconLibrary; label: string }[] = [
    { id: "lucide", label: "Lucide" },
    { id: "heroicons", label: "Heroicons" },
    { id: "phosphor", label: "Phosphor" },
    { id: "radix", label: "Radix" },
  ];
  
  let selectedLib: IconLibrary = "lucide";
  
  libs.forEach(lib => {
    const btn = document.createElement("button");
    btn.textContent = lib.label;
    btn.style.cssText = `
      padding: 6px 12px;
      background: ${lib.id === selectedLib ? "#7ee787" : "#2a2a2a"};
      color: ${lib.id === selectedLib ? "#000" : "#fff"};
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    `;
    btn.addEventListener("click", () => {
      selectedLib = lib.id;
      // Update all buttons
      Array.from(libSelector.children).forEach((child, i) => {
        const b = child as HTMLButtonElement;
        b.style.background = libs[i].id === selectedLib ? "#7ee787" : "#2a2a2a";
        b.style.color = libs[i].id === selectedLib ? "#000" : "#fff";
      });
    });
    libSelector.appendChild(btn);
  });
  panel.appendChild(libSelector);

  // Grid de iconos
  const grid = document.createElement("div");
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 15px;
  `;

  POPULAR_ICONS.forEach(({ name, icon }) => {
    const btn = document.createElement("button");
    btn.style.cssText = `
      aspect-ratio: 1;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 24px;
      transition: all 0.15s;
    `;
    btn.innerHTML = `
      <span>${icon}</span>
      <span style="font-size: 9px; color: #888;">${name}</span>
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
      pendingIcon = {
        iconLibrary: selectedLib,
        iconName: name,
        size: 24,
        strokeWidth: 2,
      };
      panel.remove();
      showToast(`Selected ${name} icon. Click on the page to place it.`);
    });
    
    grid.appendChild(btn);
  });

  panel.appendChild(grid);

  // Opciones de tamaño
  const optionsSection = document.createElement("div");
  optionsSection.style.cssText = `
    margin-bottom: 15px;
    padding: 10px;
    background: #222;
    border-radius: 8px;
  `;
  
  const sizeLabel = document.createElement("div");
  sizeLabel.textContent = "Size:";
  sizeLabel.style.cssText = `color: #888; font-size: 12px; margin-bottom: 6px;`;
  optionsSection.appendChild(sizeLabel);
  
  const sizeSlider = document.createElement("input");
  sizeSlider.type = "range";
  sizeSlider.min = "16";
  sizeSlider.max = "64";
  sizeSlider.value = "24";
  sizeSlider.style.cssText = `width: 100%;`;
  optionsSection.appendChild(sizeSlider);
  
  const sizeValue = document.createElement("div");
  sizeValue.textContent = "24px";
  sizeValue.style.cssText = `color: #fff; font-size: 12px; text-align: center; margin-top: 4px;`;
  sizeSlider.addEventListener("input", () => {
    sizeValue.textContent = `${sizeSlider.value}px`;
    if (pendingIcon) {
      pendingIcon.size = parseInt(sizeSlider.value);
    }
  });
  optionsSection.appendChild(sizeValue);
  
  panel.appendChild(optionsSection);

  // Botón cancelar
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    width: 100%;
    padding: 10px;
    background: transparent;
    border: 1px solid #666;
    border-radius: 6px;
    color: #999;
    cursor: pointer;
    font-size: 12px;
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
      if (!pendingIcon) {
        setActiveTool("select");
      }
    }
  };
  setTimeout(() => document.addEventListener("mousedown", outsideClick), 0);

  document.body.appendChild(panel);
}

function insertIconElement(
  selectedEl: HTMLElement,
  insertion: IconInsertion,
) {
  const componentInfo = getSelection();
  if (!componentInfo) return;

  const parentEl = selectedEl.parentElement;

  const operation = {
    op: "insertIcon" as const,
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
    iconLibrary: insertion.iconLibrary,
    iconName: insertion.iconName,
    size: insertion.size || 24,
    strokeWidth: insertion.strokeWidth || 2,
    color: insertion.color,
  };

  addPendingInsertion(operation);

  // Crear preview visual (usando emoji por ahora)
  const tempIcon = document.createElement("span");
  const iconData = POPULAR_ICONS.find(i => i.name === insertion.iconName);
  tempIcon.textContent = iconData?.icon || "📦";
  tempIcon.style.cssText = `
    font-size: ${insertion.size || 24}px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${(insertion.size || 24) * 1.5}px;
    height: ${(insertion.size || 24) * 1.5}px;
    border: 2px dashed #7ee787;
    border-radius: 8px;
    background: rgba(126, 231, 135, 0.1);
    cursor: move;
  `;
  tempIcon.title = `<${insertion.iconName} /> (${insertion.iconLibrary})`;

  selectedEl.insertAdjacentElement("afterend", tempIcon);

  pushUndoAction({
    type: "deleteCreate",
    deleteId: `insert-icon-${Date.now()}`,
    element: tempIcon,
  });

  showToast(`${insertion.iconName} icon ready. Press Confirm to save.`);
}

export function resetInsertIconTool() {
  pendingIcon = null;
  const existingPicker = document.getElementById("icon-picker");
  if (existingPicker) existingPicker.remove();
}
