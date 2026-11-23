import { getShadowRoot } from "./toolbar.js";
import { COLORS, SHADOWS, RADII, TRANSITIONS, FONT_FAMILY } from "./design-tokens.js";
import { setActiveTool, getActiveTool, onToolChange } from "./canvas-state.js";
import { registerToolHandler } from "./interaction.js";
import { insertImageHandler, resetImageTool } from "./tools/image.js";
import { insertTextHandler, resetInsertTextTool } from "./tools/insert-text.js";
import { insertContainerHandler, resetInsertContainerTool } from "./tools/insert-container.js";
import { insertIconHandler, resetInsertIconTool } from "./tools/insert-icon.js";

// Icons SVG
const ICONS = {
  image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  text: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M8 19h8"/></svg>`,
  container: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
  icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 8-4 4 4 4"/><path d="m16 12-4 4 4-4"/></svg>`,
};

type InsertTool = "select" | "image" | "insertText" | "insertContainer" | "insertIcon";

let activeInsertTool: InsertTool = "select";
let panelEl: HTMLDivElement | null = null;

const TOOLS: Array<{ id: InsertTool; icon: string; label: string }> = [
  { id: "image", icon: ICONS.image, label: "Insert Image" },
  { id: "insertText", icon: ICONS.text, label: "Insert Text" },
  { id: "insertContainer", icon: ICONS.container, label: "Insert Container" },
  { id: "insertIcon", icon: ICONS.icon, label: "Insert Icon" },
];

export function initInsertPanel(): void {
  const shadowRoot = getShadowRoot();
  if (!shadowRoot) return;

  // Create panel
  panelEl = document.createElement("div");
  panelEl.id = "react-rewrite-insert-panel";
  panelEl.style.cssText = `
    position: fixed;
    left: 70px;
    top: 50%;
    transform: translateY(-50%);
    background: ${COLORS.bgPrimary};
    border: 1px solid ${COLORS.border};
    border-radius: ${RADII.lg};
    box-shadow: ${SHADOWS.md};
    z-index: 2147483646;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 6px;
    font-family: ${FONT_FAMILY};
    user-select: none;
    opacity: 0;
    animation: insertPanelFadeIn ${TRANSITIONS.settle} forwards;
  `;

  // Add animation keyframes
  const style = document.createElement("style");
  style.textContent = `
    @keyframes insertPanelFadeIn {
      to { opacity: 1; }
    }
    .insert-tool-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: ${COLORS.textSecondary};
      cursor: pointer;
      border-radius: ${RADII.md};
      position: relative;
      padding: 0;
      transition: background ${TRANSITIONS.fast}, color ${TRANSITIONS.fast};
    }
    .insert-tool-btn:hover {
      background: ${COLORS.bgSecondary};
      color: ${COLORS.textPrimary};
    }
    .insert-tool-btn.active {
      background: ${COLORS.accentSoft};
      color: ${COLORS.accent};
    }
    .insert-tool-btn .tooltip {
      display: none;
      position: absolute;
      left: 44px;
      top: 50%;
      transform: translateY(-50%);
      background: ${COLORS.bgPrimary};
      border: 1px solid ${COLORS.border};
      box-shadow: ${SHADOWS.sm};
      color: ${COLORS.textPrimary};
      padding: 4px 8px;
      border-radius: ${RADII.sm};
      font-size: 11px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 2147483647;
    }
    .insert-tool-btn:hover .tooltip {
      display: block;
    }
    .insert-divider {
      width: 20px;
      height: 1px;
      background: ${COLORS.border};
      margin: 2px 0;
    }
  `;
  panelEl.appendChild(style);

  // Title
  const title = document.createElement("div");
  title.textContent = "Insert";
  title.style.cssText = `
    font-size: 10px;
    color: ${COLORS.textTertiary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: center;
    padding: 4px 0;
    border-bottom: 1px solid ${COLORS.border};
    margin-bottom: 2px;
  `;
  panelEl.appendChild(title);

  // Tool buttons
  TOOLS.forEach((tool, index) => {
    const btn = document.createElement("button");
    btn.className = "insert-tool-btn";
    btn.innerHTML = `
      ${tool.icon}
      <span class="tooltip">${tool.label}</span>
    `;
    btn.dataset.tool = tool.id;
    
    btn.addEventListener("click", () => {
      activateInsertTool(tool.id);
    });
    
    panelEl.appendChild(btn);
    
    // Add divider after first 2 buttons
    if (index === 1) {
      const divider = document.createElement("div");
      divider.className = "insert-divider";
      panelEl.appendChild(divider);
    }
  });

  shadowRoot.appendChild(panelEl);

  // Register tool handlers
  registerToolHandler("image", insertImageHandler);
  registerToolHandler("insertText", insertTextHandler);
  registerToolHandler("insertContainer", insertContainerHandler);
  registerToolHandler("insertIcon", insertIconHandler);

  // Listen for select tool activation from main panel
  onToolChange((tool) => {
    if (tool === "select" && activeInsertTool !== "select") {
      deactivateInsertTool();
    }
  });
}

export function activateInsertTool(tool: InsertTool): void {
  const prevTool = activeInsertTool;
  activeInsertTool = tool;

  // Reset previous tool
  if (prevTool !== "select") {
    switch (prevTool) {
      case "image": resetImageTool(); break;
      case "insertText": resetInsertTextTool(); break;
      case "insertContainer": resetInsertContainerTool(); break;
      case "insertIcon": resetInsertIconTool(); break;
    }
  }

  // Update UI
  if (panelEl) {
    panelEl.querySelectorAll(".insert-tool-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tool === tool);
    });
  }

  // Activate in canvas state
  if (tool !== "select") {
    setActiveTool(tool as any);
  }
}

export function deactivateInsertTool(): void {
  activeInsertTool = "select";
  
  if (panelEl) {
    panelEl.querySelectorAll(".insert-tool-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
  }
}

export function getActiveInsertTool(): InsertTool {
  return activeInsertTool;
}

export function destroyInsertPanel(): void {
  if (panelEl) {
    panelEl.remove();
    panelEl = null;
  }
}
