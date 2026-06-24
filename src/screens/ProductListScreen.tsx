import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, StatusBar,
  ActivityIndicator, Pressable, TextInput, Platform, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Product, RootStackParamList } from '../types';
import ProductCard from '../components/ProductCard';
import { useColors, Colors, LOW_STOCK_THRESHOLD } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductList'>;

const CATEGORIA_LABEL: Record<string, string> = { crocs: 'Crocs', charms: 'Charms', otros: 'Otros' };

type Filtro = 'todos' | 'bajo' | 'sinstock' | 'inactivos';
const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos',     label: 'Todos' },
  { id: 'bajo',      label: 'Stock bajo' },
  { id: 'sinstock',  label: 'Sin stock' },
  { id: 'inactivos', label: 'Inactivos' },
];

function totalStock(p: Product) {
  // Cuenta stock de venta (piso) + almacén (bodega).
  return p.product_variants?.filter(v => v.is_active).reduce((s, v) => s + v.stock + (v.stock_almacen ?? 0), 0) ?? 0;
}

export default function ProductListScreen({ navigation, route }: Props) {
  const { category } = route.params;
  const C = useColors();
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [reordenando, setReordenando] = useState(false);

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('category', category)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (err) setError('No se pudieron cargar los productos.');
    else setProductos(data ?? []);
    setCargando(false);
  }, [category]);

  useFocusEffect(useCallback(() => { cargarProductos(); }, [cargarProductos]));

  useEffect(() => {
    navigation.setOptions({
      title: CATEGORIA_LABEL[category],
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable
            onPress={() => setReordenando(r => !r)}
            style={({ pressed }) => [{ paddingHorizontal: 8, paddingVertical: 4 }, pressed && { opacity: 0.5 }]}
          >
            <Text style={{ fontSize: 14, color: C.textMuted }}>
              {reordenando ? 'Listo' : 'Reordenar'}
            </Text>
          </Pressable>
          {!reordenando && (
            <Pressable
              onPress={() => navigation.navigate('AddProduct', { category })}
              style={({ pressed }) => [{ paddingLeft: 4 }, pressed && { opacity: 0.5 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>+ Agregar</Text>
            </Pressable>
          )}
        </View>
      ),
    });
  }, [navigation, category, reordenando, C]);

  function confirmarEliminar(producto: Product) {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${producto.name}"? No se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            await supabase.from('product_variants').delete().eq('product_id', producto.id);
            const { error } = await supabase.from('products').delete().eq('id', producto.id);
            if (error) Alert.alert('Error', 'No se pudo eliminar el producto.');
            else setProductos(prev => prev.filter(p => p.id !== producto.id));
          },
        },
      ]
    );
  }

  async function moverProducto(index: number, direccion: 'arriba' | 'abajo') {
    const nueva = [...productos];
    const targetIndex = direccion === 'arriba' ? index - 1 : index + 1;
    [nueva[index], nueva[targetIndex]] = [nueva[targetIndex], nueva[index]];
    setProductos(nueva);

    await Promise.all(
      nueva.map((p, i) =>
        supabase.from('products').update({ display_order: i + 1 }).eq('id', p.id)
      )
    );
  }

  const productosFiltrados = (() => {
    let lista = busqueda.trim()
      ? productos.filter(p => p.name.toLowerCase().includes(busqueda.toLowerCase()))
      : productos;

    if (filtro === 'bajo')
      lista = lista.filter(p => { const t = totalStock(p); return t > 0 && t <= LOW_STOCK_THRESHOLD; });
    else if (filtro === 'sinstock')
      lista = lista.filter(p => totalStock(p) === 0 && p.is_active);
    else if (filtro === 'inactivos')
      lista = lista.filter(p => !p.is_active);
    else
      lista = lista.filter(p => p.is_active || filtro !== 'todos');

    return lista;
  })();

  const s = useMemo(() => getStyles(C), [C]);

  if (cargando) {
    return (
      <SafeAreaView style={s.centrado}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.centrado}>
        <Text style={s.errorTexto}>{error}</Text>
        <Pressable style={({ pressed }) => [s.botonReintentar, pressed && { opacity: 0.6 }]} onPress={cargarProductos}>
          <Text style={s.botonReintentarTexto}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={C.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={C.bg} />

      {/* Buscador */}
      {!reordenando && (
        <View style={s.buscadorContainer}>
          <TextInput
            style={s.buscador}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar producto..."
            placeholderTextColor={C.textPlaceholder}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {busqueda.length > 0 && (
            <Pressable onPress={() => setBusqueda('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.limpiarBoton}>
              <Text style={s.limpiarTexto}>✕</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Filtros */}
      {!reordenando && (
        <View style={s.filtrosRow}>
          {FILTROS.map(f => (
            <Pressable
              key={f.id}
              onPress={() => setFiltro(f.id)}
              style={[s.filtroChip, filtro === f.id && s.filtroChipActivo]}
            >
              <Text style={[s.filtroTexto, filtro === f.id && s.filtroTextoActivo]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={productosFiltrados}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <ProductCard
            product={item}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            onLongPress={() => confirmarEliminar(item)}
            reordenando={reordenando}
            onSubir={() => moverProducto(
              productos.findIndex(p => p.id === item.id), 'arriba'
            )}
            onBajar={() => moverProducto(
              productos.findIndex(p => p.id === item.id), 'abajo'
            )}
            esPrimero={productos.findIndex(p => p.id === item.id) === 0}
            esUltimo={productos.findIndex(p => p.id === item.id) === productos.length - 1}
          />
        )}
        ListEmptyComponent={
          <View style={s.vacio}>
            {busqueda ? (
              <>
                <Text style={s.vacioTexto}>Sin resultados para "{busqueda}"</Text>
                <Pressable onPress={() => setBusqueda('')} style={s.botonVacio}>
                  <Text style={s.botonVacioTexto}>Limpiar búsqueda</Text>
                </Pressable>
              </>
            ) : filtro !== 'todos' ? (
              <>
                <Text style={s.vacioTexto}>Ningún producto en este filtro.</Text>
                <Pressable onPress={() => setFiltro('todos')} style={s.botonVacio}>
                  <Text style={s.botonVacioTexto}>Ver todos</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={s.vacioTexto}>No hay productos aquí todavía.</Text>
                <Pressable
                  style={({ pressed }) => [s.botonVacio, pressed && { opacity: 0.6 }]}
                  onPress={() => navigation.navigate('AddProduct', { category })}
                >
                  <Text style={s.botonVacioTexto}>Agregar el primero</Text>
                </Pressable>
              </>
            )}
          </View>
        }
        contentContainerStyle={productosFiltrados.length === 0 ? s.listaVacia : undefined}
      />
    </SafeAreaView>
  );
}

function getStyles(C: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    centrado: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
    errorTexto: { fontSize: 15, color: C.textMuted },
    botonReintentar: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 10 },
    botonReintentarTexto: { color: C.accentFg, fontWeight: '600', fontSize: 14 },

    buscadorContainer: {
      paddingHorizontal: 20, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: C.border,
      flexDirection: 'row', alignItems: 'center',
    },
    buscador: {
      flex: 1, height: 40, backgroundColor: C.surface,
      paddingHorizontal: 12, fontSize: 15, color: C.text, borderRadius: 6,
    },
    limpiarBoton: { marginLeft: 8 },
    limpiarTexto: { fontSize: 14, color: C.textFaint },

    filtrosRow: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
      gap: 8, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    filtroChip: {
      paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: C.chipBorder, borderRadius: 16,
    },
    filtroChipActivo: {
      backgroundColor: C.chipSelectedBg, borderColor: C.chipSelectedBorder,
    },
    filtroTexto: { fontSize: 13, fontWeight: '500', color: C.textMuted },
    filtroTextoActivo: { color: C.chipSelectedText },

    vacio: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
    vacioTexto: { fontSize: 15, color: C.textFaint, textAlign: 'center' },
    botonVacio: { marginTop: 24, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 12 },
    botonVacioTexto: { color: C.accentFg, fontWeight: '600', fontSize: 14 },
    listaVacia: { flex: 1 },
  });
}
