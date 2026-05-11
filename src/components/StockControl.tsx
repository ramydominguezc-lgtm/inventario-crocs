import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface Props {
  varianteId: string;
  stockInicial: number;
  onCambio?: (nuevoStock: number) => void;
}

export default function StockControl({ varianteId, stockInicial, onCambio }: Props) {
  const [stock, setStock] = useState(stockInicial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setStock(stockInicial); }, [stockInicial]);

  function cambiar(delta: number) {
    const nuevo = Math.max(0, stock + delta);
    setStock(nuevo);
    onCambio?.(nuevo);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase
        .from('product_variants')
        .update({ stock: nuevo, stock_updated_at: new Date().toISOString() })
        .eq('id', varianteId);
    }, 600);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.boton, styles.botonMenos, stock === 0 && styles.botonDesactivado, pressed && styles.botonPressed]}
        onPress={() => cambiar(-1)}
        disabled={stock === 0}
        accessibilityLabel="Quitar uno"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
      >
        <Text style={[styles.botonTexto, stock === 0 && styles.botonTextoDesactivado]}>−</Text>
      </Pressable>

      <View style={[styles.numero, stock === 0 && styles.numeroCero]}>
        <Text style={[styles.numeroTexto, stock === 0 && styles.numeroTextoCero]}>{stock}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.boton, styles.botonMas, pressed && styles.botonMasPressed]}
        onPress={() => cambiar(1)}
        accessibilityLabel="Agregar uno"
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Text style={styles.botonMasTexto}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    // @ts-ignore
    cursor: Platform.OS === 'web' ? 'default' : undefined,
  },
  boton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  botonMenos: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  botonMas: {
    backgroundColor: '#000000',
  },
  botonDesactivado: {
    backgroundColor: '#F8F8F8',
    borderColor: '#F0F0F0',
  },
  botonPressed: {
    opacity: 0.6,
  },
  botonMasPressed: {
    opacity: 0.7,
  },
  botonTexto: {
    fontSize: 20,
    color: '#333333',
    lineHeight: 22,
  },
  botonTextoDesactivado: {
    color: '#CCCCCC',
  },
  botonMasTexto: {
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  numero: {
    width: 52,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  numeroCero: {
    backgroundColor: '#FAFAFA',
  },
  numeroTexto: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  numeroTextoCero: {
    color: '#CCCCCC',
  },
});
