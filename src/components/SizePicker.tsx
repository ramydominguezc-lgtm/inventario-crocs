import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useColors, Colors } from '../theme';

const TALLAS_NINOS = ['C4/5', 'C6/7', 'C8/9', 'C10/11', 'C12/13'];
const TALLAS_ADULTOS = ['M4/W6', 'M5/W7', 'M6/W8', 'M7/W9', 'M8/W10', 'M9/W11', 'M10/W12', 'M11/W13'];

const CM: Record<string, string> = {
  'C4/5': '12-13', 'C6/7': '14-15', 'C8/9': '16-17', 'C10/11': '18-19', 'C12/13': '20-21',
  'M4/W6': '22', 'M5/W7': '23', 'M6/W8': '24', 'M7/W9': '25',
  'M8/W10': '26', 'M9/W11': '27', 'M10/W12': '28', 'M11/W13': '29',
};

export interface TallaConStock { size_label: string; stock: number; }

interface Props {
  tallasExistentes?: string[];
  onChange: (tallas: TallaConStock[]) => void;
}

export default function SizePicker({ tallasExistentes = [], onChange }: Props) {
  const C = useColors();
  const ninos = TALLAS_NINOS.filter(t => !tallasExistentes.includes(t));
  const adultos = TALLAS_ADULTOS.filter(t => !tallasExistentes.includes(t));
  const [seleccionadas, setSeleccionadas] = useState<Record<string, number>>({});

  if (ninos.length === 0 && adultos.length === 0) return null;

  function toggleTalla(talla: string) {
    setSeleccionadas(prev => {
      const next = { ...prev };
      if (talla in next) delete next[talla];
      else next[talla] = 0;
      notificar(next);
      return next;
    });
  }

  function marcarTodas(grupo: string[]) {
    setSeleccionadas(prev => {
      const next = { ...prev };
      const todasMarcadas = grupo.every(t => t in next);
      if (todasMarcadas) grupo.forEach(t => delete next[t]);
      else grupo.forEach(t => { if (!(t in next)) next[t] = 0; });
      notificar(next);
      return next;
    });
  }

  function cambiarStock(talla: string, delta: number) {
    setSeleccionadas(prev => {
      const next = { ...prev, [talla]: Math.max(0, (prev[talla] ?? 0) + delta) };
      notificar(next);
      return next;
    });
  }

  function notificar(sel: Record<string, number>) {
    onChange([...TALLAS_NINOS, ...TALLAS_ADULTOS].filter(t => t in sel).map(t => ({ size_label: t, stock: sel[t] })));
  }

  const seleccionadasList = [...TALLAS_NINOS, ...TALLAS_ADULTOS].filter(t => t in seleccionadas);
  const s = getStyles(C);

  return (
    <View style={s.container}>

      {ninos.length > 0 && (
        <View style={s.grupo}>
          <View style={s.grupoHeader}>
            <Text style={s.grupoLabel}>Niños</Text>
            <Pressable onPress={() => marcarTodas(ninos)} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
              <Text style={s.marcarTodo}>{ninos.every(t => t in seleccionadas) ? 'Desmarcar' : 'Marcar todas'}</Text>
            </Pressable>
          </View>
          <View style={s.grid}>
            {ninos.map(talla => (
              <TallaChip key={talla} talla={talla} cm={CM[talla]} seleccionada={talla in seleccionadas} onPress={() => toggleTalla(talla)} C={C} />
            ))}
          </View>
        </View>
      )}

      {adultos.length > 0 && (
        <View style={s.grupo}>
          <View style={s.grupoHeader}>
            <Text style={s.grupoLabel}>Adultos</Text>
            <Pressable onPress={() => marcarTodas(adultos)} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
              <Text style={s.marcarTodo}>{adultos.every(t => t in seleccionadas) ? 'Desmarcar' : 'Marcar todas'}</Text>
            </Pressable>
          </View>
          <View style={s.grid}>
            {adultos.map(talla => (
              <TallaChip key={talla} talla={talla} cm={CM[talla]} seleccionada={talla in seleccionadas} onPress={() => toggleTalla(talla)} C={C} />
            ))}
          </View>
        </View>
      )}

      {seleccionadasList.length > 0 && (
        <View style={s.stockSeccion}>
          <Text style={s.stockLabel}>Stock inicial — {seleccionadasList.length} talla{seleccionadasList.length !== 1 ? 's' : ''}</Text>
          {seleccionadasList.map(talla => (
            <View key={talla} style={s.stockFila}>
              <Text style={s.stockTalla}>{talla}</Text>
              <View style={s.stockControl}>
                <Pressable
                  style={({ pressed }) => [s.btnMenos, seleccionadas[talla] === 0 && s.btnMenosDisabled, pressed && { opacity: 0.6 }]}
                  onPress={() => cambiarStock(talla, -1)}
                  disabled={seleccionadas[talla] === 0}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                >
                  <Text style={[s.btnTexto, seleccionadas[talla] === 0 && { color: C.textPlaceholder }]}>−</Text>
                </Pressable>
                <View style={s.stockNumero}>
                  <Text style={[s.stockNumeroTexto, seleccionadas[talla] === 0 && { color: C.textPlaceholder }]}>
                    {seleccionadas[talla]}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [s.btnMas, pressed && { opacity: 0.7 }]}
                  onPress={() => cambiarStock(talla, 1)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                >
                  <Text style={s.btnMasTexto}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function TallaChip({ talla, cm, seleccionada, onPress, C }: { talla: string; cm?: string; seleccionada: boolean; onPress: () => void; C: Colors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: seleccionada ? C.chipSelectedBorder : C.chipBorder, minHeight: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: seleccionada ? C.chipSelectedBg : C.bg, opacity: pressed ? 0.7 : 1 },
        // @ts-ignore
        Platform.OS === 'web' ? { cursor: 'pointer' } : {},
      ]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={`Talla ${talla}${cm ? `, ${cm} cm` : ''}`}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: seleccionada ? C.chipSelectedText : C.textPlaceholder }}>{talla}</Text>
      {cm && <Text style={{ fontSize: 10, color: seleccionada ? C.chipSelectedText + 'BB' : C.textPlaceholder, marginTop: 2, opacity: seleccionada ? 0.75 : 1 }}>{cm} cm</Text>}
    </Pressable>
  );
}

function getStyles(C: Colors) {
  return StyleSheet.create({
    container: { gap: 0 },
    grupo: { marginBottom: 12 },
    grupoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    grupoLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    marcarTodo: {
      fontSize: 12, fontWeight: '600', color: C.text,
      // @ts-ignore
      cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stockSeccion: { marginTop: 16, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
    stockLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
    stockFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, minHeight: 52 },
    stockTalla: { fontSize: 15, color: C.text },
    stockControl: { flexDirection: 'row', alignItems: 'center' },
    btnMenos: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderInput },
    btnMenosDisabled: { backgroundColor: C.bg, borderColor: C.border },
    btnTexto: { fontSize: 20, color: C.text, lineHeight: 22 },
    stockNumero: { width: 52, height: 40, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.borderInput, backgroundColor: C.bg },
    stockNumeroTexto: { fontSize: 17, fontWeight: '600', color: C.text },
    btnMas: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: C.accent },
    btnMasTexto: { fontSize: 20, color: C.accentFg, lineHeight: 22 },
  });
}
