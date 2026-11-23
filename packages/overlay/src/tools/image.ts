import type { ToolEventHandler } from "../interaction.js";
import { getActiveTool, setActiveTool, addPendingInsertion, pushUndoAction } from "../canvas-state.js";
import { showToast } from "../toolbar.js";
import { getSelectedElement, getSelection } from "../selection.js";
import { computeNthOfType } from "../utils/nth-of-type.js";

interface ImageInsertion {
  imageUrl: string;
  alt: string;
  width?: number;
  height?: number;
  objectFit?: string;
}

let pendingInsertion: ImageInsertion | null = null;
let fileInput: HTMLInputElement | null = null;

export const insertImageHandler: ToolEventHandler = {
  onMouseDown(e: MouseEvent) {
    // Si no hay imagen pendiente, mostrar el picker de archivo
    if (!pendingInsertion) {
      showImagePicker();
      return;
    }

    // Insertar la imagen en la posición clickeada
    const target = e.target as HTMLElement;
    if (!target || target.closest("#react-rewrite-root")) return;

    insertImageAt(target, pendingInsertion, e);
    
    // Resetear y volver a select
    pendingInsertion = null;
    setActiveTool("select");
    showToast("Image inserted. Click tool again to add another.");
  },
};

function showImagePicker() {
  if (!fileInput) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    
    fileInput.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        // Convertir a base64
        const base64 = await fileToBase64(file);
        
        // Guardar en assets/ (esto se hace via el CLI bridge)
        const fileName = `image-${Date.now()}-${file.name}`;
        const savedPath = await saveImageToAssets(fileName, base64);
        
        pendingInsertion = {
          imageUrl: savedPath,
          alt: file.name.replace(/\.[^/.]+$/, ""), // Quitar extensión
          width: undefined,
          height: undefined,
          objectFit: "cover",
        };
        
        showToast("Image loaded. Click anywhere on the page to place it.");
      } catch (err) {
        showToast("Failed to load image: " + (err as Error).message);
        setActiveTool("select");
      }
    });
    
    document.body.appendChild(fileInput);
  }
  
  fileInput.click();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveImageToAssets(fileName: string, base64Data: string): Promise<string> {
  // Enviar al CLI para guardar en assets/
  const { send } = await import("../bridge.js");
  
  return new Promise((resolve, reject) => {
    // Por ahora simulamos - en producción esto guardaría el archivo
    // y devolvería la ruta relativa (e.g., "/assets/image-123.jpg")
    
    // Simulación: resolvemos con un blob URL temporal
    // En la implementación real, esto guardaría en el filesystem via CLI
    const blob = base64ToBlob(base64Data);
    const url = URL.createObjectURL(blob);
    
    // Enviamos mensaje al CLI para guardar el archivo
    send({
      type: "saveAsset",
      fileName,
      data: base64Data,
    });
    
    // Resolvemos con la ruta que se usará en el código
    resolve(`/assets/${fileName}`);
  });
}

function base64ToBlob(base64: string): Blob {
  const parts = base64.split(";base64,");
  const contentType = parts[0].split(":")[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

function insertImageAt(
  target: HTMLElement,
  insertion: ImageInsertion,
  e: MouseEvent,
) {
  const selectedEl = getSelectedElement();
  const componentInfo = getSelection();
  
  if (!selectedEl || !componentInfo) {
    showToast("Please select an element first");
    return;
  }

  const parentEl = selectedEl.parentElement;
  if (!parentEl) {
    showToast("Cannot insert: no parent element");
    return;
  }

  const filePath = componentInfo.filePath;
  const lineNumber = componentInfo.lineNumber;
  const columnNumber = componentInfo.columnNumber - 1;

  // Crear la operación de inserción
  const operation = {
    op: "insertImage" as const,
    file: filePath,
    line: lineNumber,
    col: columnNumber,
    componentName: componentInfo.componentName,
    tagName: selectedEl.tagName.toLowerCase(),
    className: selectedEl.className || undefined,
    parentTagName: parentEl?.tagName.toLowerCase(),
    parentClassName: parentEl?.className || undefined,
    nthOfType: computeNthOfType(selectedEl),
    id: selectedEl.id || undefined,
    imageUrl: insertion.imageUrl,
    alt: insertion.alt,
    width: insertion.width,
    height: insertion.height,
    objectFit: insertion.objectFit,
  };

  // Agregar a pending insertions
  addPendingInsertion(operation);

  // Preview visual: insertar una imagen temporal
  const tempImg = document.createElement("img");
  tempImg.src = insertion.imageUrl.startsWith("blob:") 
    ? insertion.imageUrl 
    : insertion.imageUrl;
  tempImg.alt = insertion.alt;
  tempImg.style.cssText = `
    max-width: 200px;
    max-height: 200px;
    object-fit: ${insertion.objectFit};
    border: 2px dashed #7ee787;
    border-radius: 4px;
  `;
  
  // Insertar después del elemento seleccionado
  selectedEl.insertAdjacentElement("afterend", tempImg);

  // Push undo action
  pushUndoAction({
    type: "deleteCreate",
    deleteId: `insert-image-${Date.now()}`,
    element: tempImg,
  });

  showToast("Image ready to commit. Press Confirm to save.");
}

// Resetear el estado cuando se cambia de tool
export function resetImageTool() {
  pendingInsertion = null;
  if (fileInput) {
    fileInput.value = "";
  }
}
