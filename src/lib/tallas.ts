// Catálogo de tallas Crocs y su equivalencia a centímetros / talla mexicana.
// La numeración Crocs (ej. "M7/W9") es la de fábrica; en México la gente compra
// por talla en cm, así que siempre mostramos ambas para que se entienda de un vistazo.

export const TALLAS_NINOS = ['C4/5', 'C6/7', 'C8/9', 'C10/11', 'C12/13'];
export const TALLAS_ADULTOS = ['M4/W6', 'M5/W7', 'M6/W8', 'M7/W9', 'M8/W10', 'M9/W11', 'M10/W12', 'M11/W13'];

// Orden canónico de menor a mayor (niños primero, luego adultos).
export const TALLAS_ORDEN = [...TALLAS_NINOS, ...TALLAS_ADULTOS];

// Equivalencia de cada talla Crocs a centímetros (= talla mexicana en adultos).
export const CM: Record<string, string> = {
  'C4/5': '12-13', 'C6/7': '14-15', 'C8/9': '16-17', 'C10/11': '18-19', 'C12/13': '20-21',
  'M4/W6': '22', 'M5/W7': '23', 'M6/W8': '24', 'M7/W9': '25',
  'M8/W10': '26', 'M9/W11': '27', 'M10/W12': '28', 'M11/W13': '29',
};

// Equivalencia lista para mostrar (ej. "25 cm"), o null si la talla no está en el catálogo.
export function tallaMX(sizeLabel: string): string | null {
  const cm = CM[sizeLabel];
  return cm ? `${cm} cm` : null;
}

// Versión corta para chips compactos: solo el número de cm (ej. "25"),
// o la etiqueta original si no es una talla Crocs (variantes libres de "otros").
export function tallaCorta(sizeLabel: string): string {
  return CM[sizeLabel] ?? sizeLabel;
}

// Índice para ordenar de menor a mayor. Las tallas fuera del catálogo van al final.
export function ordenTalla(sizeLabel: string): number {
  const i = TALLAS_ORDEN.indexOf(sizeLabel);
  return i === -1 ? TALLAS_ORDEN.length : i;
}

// Ordena cualquier lista de variantes (objetos con size_label) de menor a mayor talla.
// Las que no son tallas Crocs quedan al final, ordenadas de forma natural (2 antes que 10).
export function ordenarPorTalla<T extends { size_label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const oa = ordenTalla(a.size_label);
    const ob = ordenTalla(b.size_label);
    if (oa !== ob) return oa - ob;
    return a.size_label.localeCompare(b.size_label, 'es', { numeric: true });
  });
}
