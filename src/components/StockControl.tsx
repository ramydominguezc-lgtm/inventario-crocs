import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useColors, Colors } from '../theme';

interface Props {
  varianteId: string;
  productId: string;
  stockInicial: number;
  onCambio?: (nuevoStock: number) => void;
  // Columna de la tabla product_variants que controla este componente.
  columna?: 'stock' | 'stock_almacen';
  // 'venta': al restar pregunta si fue venta o baja (stock de piso).
  // 'almacen': resta directo, sin preguntar (bodega).
  modo?: 'venta' | 'almacen';
}

export default function StockControl({ varianteId, productId, stockInicial, onCambio, columna = 'stock', modo = 'venta' }: Props) {
  const C = useColors();
  const s = useMemo(() => getStyles(C), [C]);
  const [stock, setStock] = useState(stockInicial);
  const [esperandoTipo, setEsperandoTipo] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setStock(stockInicial); }, [stockInicial]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function guardarMovimiento(delta: number, tipo: 'venta' | 'baja' | 'restock' | 'ajuste') {
    supabase.from('stock_movements').insert({ variant_id: varianteId, product_id: productId, delta, type: tipo });
  }

  function aplicarCambio(nuevo: number, tipo: 'venta' | 'baja' | 'restock' | 'ajuste') {
    const delta = nuevo - stock;
    setStock(nuevo);
    setEsperandoTipo(false);
    onCambio?.(nuevo);
    guardarMovimiento(delta, tipo);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase.from('product_variants')
        .update({ [columna]: nuevo, stock_updated_at: new Date().toISOString() })
        .eq('id', varianteId);
    }, 600);
  }

  function presionarMenos() {
    if (stock === 0) { setEsperandoTipo(false); return; }
    // En almacén la resta es directa (ajuste de bodega); en venta preguntamos el motivo.
    if (modo === 'almacen') { aplicarCambio(stock - 1, 'ajuste'); return; }
    if (esperandoTipo) { setEsperandoTipo(false); return; }
    setEsperandoTipo(true);
  }

  function presionarMas() {
    setEsperandoTipo(false);
    aplicarCambio(stock + 1, 'restock');
  }

  if (esperandoTipo) {
    return (
      <View style={s.confirmContainer}>
        <Pressable
          style={({ pressed }) => [s.confirmBtn, s.confirmVenta, pressed && { opacity: 0.7 }]}
          onPress={() => aplicarCambio(stock - 1, 'venta')}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={s.confirmEmoji}>💰</Text>
          <Text style={s.confirmLabel}>Venta</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.confirmBtn, s.confirmBaja, pressed && { opacity: 0.7 }]}
          onPress={() => aplicarCambio(stock - 1, 'baja')}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={s.confirmEmoji}>🗑</Text>
          <Text style={s.confirmLabel}>Baja</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.confirmBtn, s.confirmCancel, pressed && { opacity: 0.7 }]}
          onPress={() => setEsperandoTipo(false)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <Text style={s.confirmCancelTexto}>✕</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Pressable
        style={({ pressed }) => [s.boton, s.botonMenos, stock === 0 && s.botonDesactivado, pressed && s.botonPressed]}
        onPress={presionarMenos}
        disabled={stock === 0}
        accessibilityLabel="Quitar uno"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
      >
        <Text style={[s.botonTexto, stock === 0 && s.botonTextoDesactivado]}>−</Text>
      </Pressable>
      <View style={[s.numero, stock === 0 && s.numeroCero]}>
        <Text style={[s.numeroTexto, stock === 0 && s.numeroTextoCero]}>{stock}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [s.boton, s.botonMas, pressed && s.botonMasPressed]}
        onPress={presionarMas}
        accessibilityLabel="Agregar uno"
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Text style={s.botonMasTexto}>+</Text>
      </Pressable>
    </View>
  );
}

function getStyles(C: Colors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row', alignItems: 'center',
      // @ts-ignore
      cursor: Platform.OS === 'web' ? 'default' : undefined,
    },
    boton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', minWidth: 44, minHeight: 44 },
    botonMenos: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderInput },
    botonMas: { backgroundColor: C.accent },
    botonDesactivado: { backgroundColor: C.border, borderColor: C.border },
    botonPressed: { opacity: 0.6 },
    botonMasPressed: { opacity: 0.7 },
    botonTexto: { fontSize: 20, color: C.text, lineHeight: 22 },
    botonTextoDesactivado: { color: C.textPlaceholder },
    botonMasTexto: { fontSize: 20, color: C.accentFg, lineHeight: 22 },
    numero: {
      width: 52, height: 40, justifyContent: 'center', alignItems: 'center',
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.borderInput, backgroundColor: C.bg,
    },
    numeroCero: { backgroundColor: C.surface },
    numeroTexto: { fontSize: 17, fontWeight: '600', color: C.text },
    numeroTextoCero: { color: C.textPlaceholder },

    confirmContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    confirmBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, minHeight: 36,
    },
    confirmVenta: { backgroundColor: '#E8F8EE', borderWidth: 1, borderColor: '#34C759' },
    confirmBaja: { backgroundColor: '#FFF0EF', borderWidth: 1, borderColor: C.danger },
    confirmCancel: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderInput, paddingHorizontal: 8 },
    confirmEmoji: { fontSize: 13 },
    confirmLabel: { fontSize: 12, fontWeight: '600', color: C.text },
    confirmCancelTexto: { fontSize: 13, color: C.textMuted },
  });
}
