import type { PropertyControl, OnPreview, OnCommit } from "./types.js";
import type { PropertyDescriptor } from "@react-rewrite/shared";

// Google Fonts populares
const GOOGLE_FONTS = [
  { name: "Inter", category: "sans-serif" },
  { name: "Roboto", category: "sans-serif" },
  { name: "Open Sans", category: "sans-serif" },
  { name: "Lato", category: "sans-serif" },
  { name: "Montserrat", category: "sans-serif" },
  { name: "Poppins", category: "sans-serif" },
  { name: "Nunito", category: "sans-serif" },
  { name: "Raleway", category: "sans-serif" },
  { name: "Playfair Display", category: "serif" },
  { name: "Merriweather", category: "serif" },
  { name: "Lora", category: "serif" },
  { name: "Cormorant Garamond", category: "serif" },
  { name: "Source Code Pro", category: "monospace" },
  { name: "Fira Code", category: "monospace" },
  { name: "JetBrains Mono", category: "monospace" },
  { name: "Space Grotesk", category: "sans-serif" },
  { name: "Work Sans", category: "sans-serif" },
  { name: "Quicksand", category: "sans-serif" },
  { name: "DM Sans", category: "sans-serif" },
  { name: "Bebas Neue", category: "display" },
];

// Fuentes del sistema comunes
const SYSTEM_FONTS = [
  { name: "System UI", value: "system-ui, -apple-system, sans-serif" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { name: "Courier New", value: '"Courier New", Courier, monospace' },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
  { name: "Palatino", value: "Palatino, serif" },
  { name: "Garamond", value: "Garamond, serif" },
  { name: "Bookman", value: "Bookman, serif" },
  { name: "Comic Sans MS", value: '"Comic Sans MS", cursive' },
];

interface FontDropdownControl extends PropertyControl {
  setValue(key: string, value: string): void;
}

export function createFontDropdown(
  descriptors: PropertyDescriptor[],
  values: Map<string, string>,
  onPreview: OnPreview,
  onCommit: OnCommit,
): FontDropdownControl {
  const descriptor = descriptors[0];
  const currentValue = values.get(descriptor.key) || descriptor.defaultValue || "sans-serif";

  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  `;

  // Dropdown container
  const dropdownContainer = document.createElement("div");
  dropdownContainer.style.cssText = `
    position: relative;
    width: 100%;
  `;

  // Trigger button (muestra la fuente actual)
  const trigger = document.createElement("button");
  trigger.style.cssText = `
    width: 100%;
    padding: 6px 10px;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: ${currentValue};
    transition: border-color 0.15s;
  `;
  trigger.innerHTML = `
    <span class="font-preview" style="font-family: ${currentValue}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${formatFontName(currentValue)}</span>
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style="flex-shrink: 0; margin-left: 6px;">
      <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  `;
  
  // Hover effect
  trigger.addEventListener("mouseenter", () => {
    trigger.style.borderColor = "#555";
  });
  trigger.addEventListener("mouseleave", () => {
    trigger.style.borderColor = "#3a3a3a";
  });
  
  dropdownContainer.appendChild(trigger);

  // Panel de fuentes (inicialmente oculto)
  const panel = document.createElement("div");
  panel.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: #1a1a1a;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    max-height: 280px;
    overflow-y: auto;
    z-index: 10000;
    display: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  `;
  dropdownContainer.appendChild(panel);

  // Sección: Fuentes del Sistema
  const systemSection = createSection("System Fonts");
  panel.appendChild(systemSection.header);
  
  SYSTEM_FONTS.forEach(font => {
    const item = createFontItem(font.name, font.value, false, onPreview, onCommit, trigger, panel, currentValue);
    systemSection.content.appendChild(item);
  });
  panel.appendChild(systemSection.content);

  // Divider
  const divider = document.createElement("div");
  divider.style.cssText = `height: 1px; background: #333; margin: 4px 0;`;
  panel.appendChild(divider);

  // Sección: Google Fonts
  const googleSection = createSection("Google Fonts");
  panel.appendChild(googleSection.header);
  
  GOOGLE_FONTS.forEach(font => {
    const value = `"${font.name}", ${font.category}`;
    const item = createFontItem(font.name, value, true, onPreview, onCommit, trigger, panel, currentValue, font.name);
    googleSection.content.appendChild(item);
  });
  panel.appendChild(googleSection.content);

  // Toggle del panel
  let isOpen = false;
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    isOpen = !isOpen;
    panel.style.display = isOpen ? "block" : "none";
    if (isOpen) {
      loadGoogleFontPreviews();
    }
  });

  // Cerrar al click fuera
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target as Node)) {
      isOpen = false;
      panel.style.display = "none";
    }
  });

  container.appendChild(dropdownContainer);

  const control: FontDropdownControl = {
    get element() {
      return container;
    },
    setValue(key: string, value: string) {
      if (key !== descriptor.key) return;
      const preview = trigger.querySelector(".font-preview") as HTMLElement;
      if (preview) {
        preview.textContent = formatFontName(value);
        preview.style.fontFamily = value;
        trigger.style.fontFamily = value;
      }
    },
    destroy() {
      container.remove();
    },
  };

  return control;
}

function createSection(title: string) {
  const header = document.createElement("div");
  header.textContent = title;
  header.style.cssText = `
    padding: 8px 10px;
    font-size: 10px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #222;
    border-bottom: 1px solid #333;
    position: sticky;
    top: 0;
    z-index: 1;
  `;

  const content = document.createElement("div");
  content.style.cssText = `
    display: flex;
    flex-direction: column;
  `;

  return { header, content };
}

function createFontItem(
  name: string,
  value: string,
  isGoogle: boolean,
  onPreview: OnPreview,
  onCommit: OnCommit,
  trigger: HTMLButtonElement,
  panel: HTMLDivElement,
  currentValue: string,
  googleFontName?: string,
): HTMLElement {
  const item = document.createElement("button");
  const isSelected = currentValue === value || currentValue.includes(name);
  
  item.style.cssText = `
    padding: 8px 10px;
    background: ${isSelected ? "#333" : "transparent"};
    border: none;
    border-bottom: 1px solid #2a2a2a;
    color: ${isSelected ? "#7ee787" : "#fff"};
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.15s;
    font-family: ${value};
  `;
  
  if (isGoogle && googleFontName) {
    item.style.fontFamily = `"${googleFontName}", sans-serif`;
  }

  // Preview del nombre en la fuente
  const preview = document.createElement("span");
  preview.textContent = name;
  preview.style.cssText = `flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
  
  // Checkmark si está seleccionada
  if (isSelected) {
    const check = document.createElement("span");
    check.innerHTML = `✓`;
    check.style.cssText = `
      color: #7ee787;
      font-weight: bold;
      flex-shrink: 0;
    `;
    item.appendChild(check);
  }
  
  // Badge para Google Fonts
  if (isGoogle) {
    const badge = document.createElement("span");
    badge.textContent = "G";
    badge.style.cssText = `
      font-size: 8px;
      padding: 2px 4px;
      background: #4285f4;
      color: white;
      border-radius: 3px;
      font-family: sans-serif;
      font-weight: 600;
      flex-shrink: 0;
    `;
    item.appendChild(badge);
  }
  
  item.appendChild(preview);

  // Hover effect
  item.addEventListener("mouseenter", () => {
    if (!isSelected) item.style.background = "#2a2a2a";
  });
  item.addEventListener("mouseleave", () => {
    if (!isSelected) item.style.background = "transparent";
  });

  // Click para seleccionar
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    
    // Si es Google Font, cargarla dinámicamente
    if (isGoogle && googleFontName) {
      loadGoogleFont(googleFontName);
    }
    
    // Actualizar el preview
    const preview = trigger.querySelector(".font-preview") as HTMLElement;
    if (preview) {
      preview.textContent = name;
      preview.style.fontFamily = value;
      trigger.style.fontFamily = value;
    }
    
    // Cerrar panel
    panel.style.display = "none";
    
    // Notificar cambio
    onPreview("fontFamily", value);
    onCommit();
  });

  return item;
}

function formatFontName(value: string): string {
  if (!value) return "Default";
  
  // Extraer el primer nombre de la lista
  const match = value.match(/^"([^"]+)"/);
  if (match) return match[1];
  
  const first = value.split(",")[0].trim();
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// Cache de fuentes cargadas
const loadedFonts = new Set<string>();

function loadGoogleFont(fontName: string) {
  if (loadedFonts.has(fontName)) return;
  
  const link = document.createElement("link");
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  link.rel = "stylesheet";
  document.head.appendChild(link);
  
  loadedFonts.add(fontName);
}

let previewsLoaded = false;
function loadGoogleFontPreviews() {
  if (previewsLoaded) return;
  previewsLoaded = true;
  
  // Cargar fuentes prioritarias primero
  const priority = GOOGLE_FONTS.slice(0, 6);
  priority.forEach(f => loadGoogleFont(f.name));
  
  // Cargar el resto con delay
  setTimeout(() => {
    GOOGLE_FONTS.slice(6).forEach((f, i) => {
      setTimeout(() => loadGoogleFont(f.name), i * 200);
    });
  }, 500);
}
