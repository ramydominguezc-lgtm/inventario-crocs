import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';

const TALLAS_NINOS = ['C4/5', 'C6/7', 'C8/9', 'C10/11', 'C12/13'];
const TALLAS_ADULTOS = ['M4/W6', 'M5/W7', 'M6/W8', 'M7/W9', 'M8/W10', 'M9/W11', 'M10/W12', 'M11/W13'];

const CM: Record<string, string> = {
  'C4/5':   '12-13',
  'C6/7':   '14-15',
  'C8/9':   '16-17',
  'C10/11': '18-19',
  'C12/13': '20-21',
  'M4/W6':  '22',
  'M5/W7':  '23',
  'M6/W8':  '24',
  'M7/W9':  '25',
  'M8/W10': '26',
  'M9/W11': '27',
  'M10/W12':'28',
  'M11/W13':'29',
};

export interface TallaConStock {
  size_label: string;
  stock: number;
}

interface Props {
  // Tallas que ya existen (para filtrarlas en modo edición)
  tallasExistentes?: string[];
  onChange: (tallas: TallaConStock[]) => void;
}

export default function SizePicker({ tallasExistentes = [], onChange }: Props) {
  const ninos = TALLAS_NINOS.filter((t) => !tallasExistentes.includes(t));
  const adultos = TALLAS_ADULTOS.filter((t) => !tallasExistentes.includes(t));
  const todasDisponibles = [...ninos, ...adultos];

  const [seleccionadas, setSeleccionadas] = useState<Record<string, number>>({});

  if (todasDisponibles.length === 0) return null;

  function toggleTalla(talla: string) {
    setSeleccionadas((prev) => {
      const next = { ...prev };
      if (talla in next) {
        delete next[talla];
      } else {
        next[talla] = 0;
      }
      notificar(next);
      return next;
    });
  }

  function marcarTodas(grupo: string[]) {
    setSeleccionadas((prev) => {
      const next = { ...prev };
      const todasMarcadas = grupo.every((t) => t in next);
      if (todasMarcadas) {
        grupo.forEach((t) => delete next[t]);
      } else {
        grupo.forEach((t) => { if (!(t in next)) next[t] = 0; });
      }
      notificar(next);
      return next;
    });
  }

  function cambiarStock(talla: string, delta: number) {
    setSeleccionadas((prev) => {
      const next = { ...prev, [talla]: Math.max(0, (prev[talla] ?? 0) + delta) };
      notificar(next);
      return next;
    });
  }

  function notificar(sel: Record<string, number>) {
    const ordenadas = [...TALLAS_NINOS, ...TALLAS_ADULTOS]
      .filter((t) => t in sel)
      .map((t) => ({ size_label: t, stock: sel[t] }));
    onChange(ordenadas);
  }

  const seleccionadasList = [...TALLAS_NINOS, ...TALLAS_ADULTOS].filter((t) => t in seleccionadas);

  return (
    <View style={styles.container}>

      {/* Niños */}
      {ninos.length > 0 && (
        <View style={styles.grupo}>
          <View style={styles.grupoHeader}>
            <Text style={styles.grupoLabel}>Niños</Text>
            <Pressable onPress={() => marcarTodas(ninos)} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
              <Text style={styles.marcarTodo}>
                {ninos.every((t) => t in seleccionadas) ? 'Desmarcar' : 'Marcar todas'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {ninos.map((talla) => (
              <TallaChip
                key={talla}
                talla={talla}
                cm={CM[talla]}
                seleccionada={talla in seleccionadas}
                onPress={() => toggleTalla(talla)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Adultos */}
      {adultos.length > 0 && (
        <View style={styles.grupo}>
          <View style={styles.grupoHeader}>
            <Text style={styles.grupoLabel}>Adultos</Text>
            <Pressable onPress={() => marcarTodas(adultos)} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
              <Text style={styles.marcarTodo}>
                {adultos.every((t) => t in seleccionadas) ? 'Desmarcar' : 'Marcar todas'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {adultos.map((talla) => (
              <TallaChip
                key={talla}
                talla={talla}
                cm={CM[talla]}
                seleccionada={talla in seleccionadas}
                onPress={() => toggleTalla(talla)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Stock inicial para tallas seleccionadas */}
      {seleccionadasList.length > 0 && (
        <View style={styles.stockSeccion}>
          <Text style={styles.stockLabel}>Stock inicial — {seleccionadasList.length} talla{seleccionadasList.length !== 1 ? 's' : ''}</Text>
          {seleccionadasList.map((talla) => (
            <View key={talla} style={styles.stockFila}>
              <Text style={styles.stockTalla}>{talla}</Text>
              <View style={styles.stockControl}>
                <Pressable
                  style={({ pressed }) => [styles.btnMenos, seleccionadas[talla] === 0 && styles.btnMenosDisabled, pressed && { opacity: 0.6 }]}
                  onPress={() => cambiarStock(talla, -1)}
                  disabled={seleccionadas[talla] === 0}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                >
                  <Text style={[styles.btnTexto, seleccionadas[talla] === 0 && { color: '#CCCCCC' }]}>−</Text>
                </Pressable>
                <View style={styles.stockNumero}>
                  <Text style={[styles.stockNumeroTexto, seleccionadas[talla] === 0 && { color: '#CCCCCC' }]}>
                    {seleccionadas[talla]}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.btnMas, pressed && { opacity: 0.7 }]}
                  onPress={() => cambiarStock(talla, 1)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                >
                  <Text style={styles.btnMasTexto}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function TallaChip({ talla, cm, seleccionada, onPress }: { talla: string; cm?: string; seleccionada: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        seleccionada && styles.chipSeleccionado,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={`Talla ${talla}${cm ? `, ${cm} cm` : ''}`}
    >
      <Text style={[styles.chipTexto, seleccionada && styles.chipTextoSeleccionado]}>
        {talla}
      </Text>
      {cm && (
        <Text style={[styles.chipCm, seleccionada && styles.chipCmSeleccionado]}>
          {cm} cm
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },

  grupo: { marginBottom: 12 },
  grupoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  grupoLabel: { fontSize: 11, fontWeight: '600', color: '#999999', textTransform: 'uppercase', letterSpacing: 0.6 },
  marcarTodo: {
    fontSize: 12, fontWeight: '600', color: '#000000',
    // @ts-ignore
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  chipSeleccionado: { borderColor: '#000000', backgroundColor: '#000000' },
  chipTexto: { fontSize: 12, fontWeight: '600', color: '#CCCCCC' },
  chipTextoSeleccionado: { color: '#FFFFFF' },
  chipCm: { fontSize: 10, color: '#CCCCCC', marginTop: 2 },
  chipCmSeleccionado: { color: 'rgba(255,255,255,0.7)' },

  stockSeccion: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 14,
  },
  stockLabel: { fontSize: 11, fontWeight: '600', color: '#999999', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  stockFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    minHeight: 52,
  },
  stockTalla: { fontSize: 15, fontWeight: '400', color: '#000000' },
  stockControl: { flexDirection: 'row', alignItems: 'center' },
  btnMenos: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  btnMenosDisabled: { backgroundColor: '#F8F8F8', borderColor: '#F5F5F5' },
  btnTexto: { fontSize: 20, color: '#333333', lineHeight: 22 },
  stockNumero: { width: 52, height: 40, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E0E0E0' },
  stockNumeroTexto: { fontSize: 17, fontWeight: '600', color: '#000000' },
  btnMas: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  btnMasTexto: { fontSize: 20, color: '#FFFFFF', lineHeight: 22 },
});
