import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useColors, Colors } from '../theme';

interface Props {
  varianteId: string;
  productId: string;
  stockInicial: number;
  onCambio?: (nuevoStock: number) => void;
}

export default function StockControl({ varianteId, productId, stockInicial, onCambio }: Props) {
  const C = useColors();
  const [stock, setStock] = useState(stockInicial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setStock(stockInicial); }, [stockInicial]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function guardarMovimiento(delta: number, tipo: 'venta' | 'baja' | 'restock') {
    supabase.from('stock_movements').insert({
      variant_id: varianteId,
      product_id: productId,
      delta,
      type: tipo,
    });
  }

  function aplicarCambio(nuevo: number, tipo: 'venta' | 'baja' | 'restock') {
    const delta = nuevo - stock;
    setStock(nuevo);
    onCambio?.(nuevo);
    guardarMovimiento(delta, tipo);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase
        .from('product_variants')
        .update({ stock: nuevo, stock_updated_at: new Date().toISOString() })
        .eq('id', varianteId);
    }, 600);
  }

  function presionarMenos() {
    if (stock === 0) return;
    const nuevo = stock - 1;
    Alert.alert(
      'Reducir stock',
      '¿Por qué se reduce esta pieza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Venta', onPress: () => aplicarCambio(nuevo, 'venta') },
        { text: 'Dar de baja', style: 'destructive', onPress: () => aplicarCambio(nuevo, 'baja') },
      ]
    );
  }

  function presionarMas() {
    aplicarCambio(stock + 1, 'restock');
  }

  const s = getStyles(C);

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
      flexDirection: 'row',
      alignItems: 'center',
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
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.borderInput,
      backgroundColor: C.bg,
    },
    numeroCero: { backgroundColor: C.surface },
    numeroTexto: { fontSize: 17, fontWeight: '600', color: C.text },
    numeroTextoCero: { color: C.textPlaceholder },
  });
}
