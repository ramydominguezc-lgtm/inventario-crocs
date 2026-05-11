import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { StockMovement, RootStackParamList } from '../types';
import { useColors, Colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'StockHistory'>;

const TIPO_CONFIG = {
  venta:   { label: 'Venta',      emoji: '💰', color: '#34C759' },
  baja:    { label: 'Baja',       emoji: '🗑',  color: '#FF3B30' },
  restock: { label: 'Reposición', emoji: '📦', color: '#007AFF' },
  ajuste:  { label: 'Ajuste',     emoji: '✏️', color: '#888888' },
};

function agruparPorFecha(movimientos: StockMovement[]) {
  const grupos: { fecha: string; items: StockMovement[] }[] = [];
  for (const m of movimientos) {
    const fecha = new Date(m.created_at).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fecha === fecha) {
      ultimo.items.push(m);
    } else {
      grupos.push({ fecha, items: [m] });
    }
  }
  return grupos;
}

export default function StockHistoryScreen({ route }: Props) {
  const { productId } = route.params;
  const C = useColors();
  const [movimientos, setMovimientos] = useState<StockMovement[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await supabase
      .from('stock_movements')
      .select('*, product_variants(size_label)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(200);
    setMovimientos(data ?? []);
    setCargando(false);
  }, [productId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const s = getStyles(C);
  const grupos = agruparPorFecha(movimientos);

  if (cargando) {
    return (
      <SafeAreaView style={s.centrado}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  if (movimientos.length === 0) {
    return (
      <SafeAreaView style={s.centrado}>
        <Text style={s.vacioPrincipal}>Sin movimientos</Text>
        <Text style={s.vacioSub}>Los cambios de stock aparecerán aquí.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={grupos}
        keyExtractor={(g) => g.fecha}
        contentContainerStyle={s.lista}
        renderItem={({ item: grupo }) => (
          <View>
            <Text style={s.fechaHeader}>{grupo.fecha}</Text>
            {grupo.items.map((m) => {
              const cfg = TIPO_CONFIG[m.type] ?? TIPO_CONFIG.ajuste;
              const hora = new Date(m.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
              return (
                <View key={m.id} style={s.fila}>
                  <View style={[s.iconoCirculo, { backgroundColor: cfg.color + '22' }]}>
                    <Text style={s.iconoEmoji}>{cfg.emoji}</Text>
                  </View>
                  <View style={s.filaInfo}>
                    <View style={s.filaTop}>
                      <Text style={s.tipo}>{cfg.label}</Text>
                      {m.product_variants?.size_label && (
                        <View style={s.tallaBadge}>
                          <Text style={s.tallaTexto}>{m.product_variants.size_label}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.hora}>{hora}</Text>
                  </View>
                  <Text style={[s.delta, { color: m.delta > 0 ? C.success : cfg.color }]}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function getStyles(C: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    centrado: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 8 },
    vacioPrincipal: { fontSize: 17, fontWeight: '600', color: C.text },
    vacioSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', paddingHorizontal: 32 },
    lista: { paddingBottom: 40 },
    fechaHeader: {
      fontSize: 11, fontWeight: '600', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.6,
      paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8,
    },
    fila: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.border,
      backgroundColor: C.bg,
    },
    iconoCirculo: {
      width: 40, height: 40, borderRadius: 20,
      justifyContent: 'center', alignItems: 'center',
    },
    iconoEmoji: { fontSize: 18 },
    filaInfo: { flex: 1, marginLeft: 12 },
    filaTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tipo: { fontSize: 15, fontWeight: '600', color: C.text },
    tallaBadge: {
      paddingHorizontal: 7, paddingVertical: 2,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderInput,
      borderRadius: 3,
    },
    tallaTexto: { fontSize: 11, fontWeight: '600', color: C.textMuted },
    hora: { fontSize: 12, color: C.textFaint, marginTop: 2 },
    delta: { fontSize: 20, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  });
}
