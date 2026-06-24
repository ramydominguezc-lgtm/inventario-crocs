// Catálogo de tallas Crocs y su equivalencia a la talla mexicana (cm).
// La numeración Crocs (niños "C#"/"J#", adultos "M#/W#") es la de fábrica; en México
// la gente compra por talla en cm, así que siempre mostramos ambas para que se entienda.
// Las tallas de niño (C#/J#) y las de adulto (M/W) conviven en el mismo catálogo.

// --- Tallas de NIÑO ---
// Numeración Crocs individual (C2…C13, luego J1…J6) y su talla mexicana.
export const TALLAS_NINOS = [
  'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13',
  'J1', 'J2', 'J3', 'J4', 'J5', 'J6',
];

// --- Tallas de ADULTO ---
export const TALLAS_ADULTOS = [
  'M4/W6', 'M5/W7', 'M6/W8', 'M7/W9', 'M8/W10', 'M9/W11', 'M10/W12', 'M11/W13',
];

// Tallas de niño viejas (formato "C4/5") que ya pueden existir en la base de datos.
// Se mantienen solo para que esos productos sigan mostrándose y ordenándose bien.
const TALLAS_NINOS_LEGACY = ['C4/5', 'C6/7', 'C8/9', 'C10/11', 'C12/13'];

// Orden canónico de menor a mayor: niños (viejos primero), luego niños nuevos, luego adultos.
export const TALLAS_ORDEN = [...TALLAS_NINOS_LEGACY, ...TALLAS_NINOS, ...TALLAS_ADULTOS];

// Equivalencia Crocs → talla mexicana (cm). Niños individual, adultos por rango M/W,
// más las tallas de niño viejas por compatibilidad.
export const CM: Record<string, string> = {
  // Niños — Crocs C# → México
  'C2': '9', 'C3': '10', 'C4': '11', 'C5': '12', 'C6': '13', 'C7': '14',
  'C8': '15', 'C9': '16', 'C10': '17', 'C11': '18', 'C12': '19', 'C13': '20',
  // Niños — Crocs J# → México
  'J1': '21', 'J2': '22', 'J3': '23', 'J4': '24', 'J5': '25', 'J6': '26',
  // Adultos — Crocs M/W → México (cm)
  'M4/W6': '22', 'M5/W7': '23', 'M6/W8': '24', 'M7/W9': '25',
  'M8/W10': '26', 'M9/W11': '27', 'M10/W12': '28', 'M11/W13': '29',
  // Niños viejos (compatibilidad)
  'C4/5': '12-13', 'C6/7': '14-15', 'C8/9': '16-17', 'C10/11': '18-19', 'C12/13': '20-21',
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
