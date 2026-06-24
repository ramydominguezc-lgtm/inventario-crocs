import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView,
  StatusBar, ActivityIndicator, Share, Platform, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { RootStackParamList, ProductCategory } from '../types';
import { useColors, Colors } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

const CATEGORIAS: { label: string; value: ProductCategory; descripcion: string }[] = [
  { label: 'Crocs',   value: 'crocs',   descripcion: 'Sandalias y zapatos' },
  { label: 'Charms',  value: 'charms',  descripcion: 'Jibbitz y accesorios' },
  { label: 'Otros',   value: 'otros',   descripcion: 'Otros productos' },
];

interface ResumenCategoria {
  productos: number;
  piezas: number;
}

type Resumen = Partial<Record<ProductCategory, ResumenCategoria>>;

export default function LandingScreen({ navigation }: Props) {
  const C = useColors();
  const s = useMemo(() => getStyles(C), [C]);
  const { resolved, toggle } = useTheme();
  const [resumen, setResumen] = useState<Resumen>({});
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  const cargarResumen = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('category, is_active, product_variants(stock, is_active)');

    if (data) {
      const r: Resumen = {};
      for (const p of data as any[]) {
        const cat = p.category as ProductCategory;
        if (!r[cat]) r[cat] = { productos: 0, piezas: 0 };
        if (p.is_active) r[cat]!.productos += 1;
        const piezas = (p.product_variants ?? [])
          .filter((v: any) => v.is_active)
          .reduce((s: number, v: any) => s + (v.stock ?? 0) + (v.stock_almacen ?? 0), 0);
        r[cat]!.piezas += piezas;
      }
      setResumen(r);
    }
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => { cargarResumen(); }, [cargarResumen]));

  async function exportarCSV() {
    setExportando(true);
    const { data } = await supabase
      .from('products')
      .select('name, category, price_mxn, is_active, product_variants(size_label, stock, stock_almacen, is_active)')
      .order('category')
      .order('name');

    if (!data) {
      setExportando(false);
      Alert.alert('Error', 'No se pudo exportar.');
      return;
    }

    const filas: string[] = ['Categoría,Nombre,Precio MXN,Activo,Talla,Stock venta,Stock almacén,Stock total'];
    for (const p of data as any[]) {
      const variantes = (p.product_variants ?? []).filter((v: any) => v.is_active);
      if (variantes.length === 0) {
        filas.push(`${p.category},"${p.name}",${p.price_mxn ?? ''},${p.is_active ? 'Sí' : 'No'},,,,`);
      } else {
        for (const v of variantes) {
          const venta = v.stock ?? 0;
          const almacen = v.stock_almacen ?? 0;
          filas.push(`${p.category},"${p.name}",${p.price_mxn ?? ''},${p.is_active ? 'Sí' : 'No'},${v.size_label},${venta},${almacen},${venta + almacen}`);
        }
      }
    }
    const csv = filas.join('\n');
    setExportando(false);

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ message: csv, title: 'Inventario Crocs MTY' });
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={C.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={C.bg} />
      <View style={s.container}>

        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.titulo}>Inventario</Text>
              <Text style={s.subtitulo}>Crocs Monterrey</Text>
            </View>
            <Pressable
              onPress={toggle}
              style={({ pressed }) => [s.temaBoton, pressed && { opacity: 0.6 }]}
              accessibilityLabel={`Cambiar a modo ${resolved === 'dark' ? 'claro' : 'oscuro'}`}
            >
              <Text style={s.temaIcono}>{resolved === 'dark' ? '☀️' : '🌙'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.lista}>
          {CATEGORIAS.map((cat, index) => {
            const datos = resumen[cat.value];
            return (
              <Pressable
                key={cat.value}
                style={({ pressed }) => [s.fila, index < CATEGORIAS.length - 1 && s.filaBorde, pressed && s.filaPressed]}
                onPress={() => navigation.navigate('ProductList', { category: cat.value })}
              >
                <View style={s.filaInfo}>
                  <Text style={s.filaLabel}>{cat.label}</Text>
                  <Text style={s.filaDesc}>{cat.descripcion}</Text>
                </View>
                <View style={s.filaRight}>
                  {cargando ? (
                    <ActivityIndicator size="small" color={C.textPlaceholder} />
                  ) : (
                    <View style={s.filaNumeros}>
                      <Text style={s.conteoProductos}>{datos?.productos ?? 0} productos</Text>
                      <Text style={s.conteoPiezas}>{datos?.piezas ?? 0} piezas</Text>
                    </View>
                  )}
                  <Text style={s.flecha}>›</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={s.footerBotones}>
          <Pressable
            style={({ pressed }) => [s.botonExportar, pressed && { opacity: 0.6 }, exportando && { opacity: 0.4 }]}
            onPress={exportarCSV}
            disabled={exportando}
          >
            {exportando
              ? <ActivityIndicator size="small" color={C.textMuted} />
              : <Text style={s.botonExportarTexto}>Exportar CSV</Text>
            }
          </Pressable>

          <Pressable style={s.cerrarSesion} onPress={() => supabase.auth.signOut()}>
            <Text style={s.cerrarSesionTexto}>Cerrar sesión</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

function getStyles(C: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    container: { flex: 1, paddingHorizontal: 20 },
    header: { paddingTop: 48, paddingBottom: 40 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titulo: { fontSize: 32, fontWeight: '600', color: C.text, letterSpacing: -0.5 },
    subtitulo: { fontSize: 16, color: C.textMuted, marginTop: 4 },
    temaBoton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    temaIcono: { fontSize: 22 },
    lista: { borderTopWidth: 1, borderTopColor: C.border },
    fila: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 20, minHeight: 72,
    },
    filaPressed: { opacity: 0.6 },
    filaBorde: { borderBottomWidth: 1, borderBottomColor: C.border },
    filaInfo: { flex: 1 },
    filaLabel: { fontSize: 18, fontWeight: '600', color: C.text },
    filaDesc: { fontSize: 13, color: C.textFaint, marginTop: 2 },
    filaRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    filaNumeros: { alignItems: 'flex-end', gap: 2 },
    conteoProductos: { fontSize: 13, color: C.textFaint },
    conteoPiezas: { fontSize: 14, fontWeight: '600', color: C.textMuted },
    flecha: { fontSize: 24, color: C.textPlaceholder },
    footerBotones: {
      position: 'absolute', bottom: 32, left: 20, right: 0,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    botonExportar: {
      borderWidth: 1, borderColor: C.borderInput,
      paddingHorizontal: 16, paddingVertical: 9, minHeight: 40, justifyContent: 'center',
    },
    botonExportarTexto: { fontSize: 13, fontWeight: '600', color: C.textMuted },
    cerrarSesion: {},
    cerrarSesionTexto: { fontSize: 13, color: C.textPlaceholder },
  });
}
