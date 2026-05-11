import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Product, RootStackParamList } from '../types';
import ProductCard from '../components/ProductCard';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductList'>;

const CATEGORIA_LABEL: Record<string, string> = {
  crocs: 'Crocs',
  charms: 'Charms',
  otros: 'Otros',
};

export default function ProductListScreen({ navigation, route }: Props) {
  const { category } = route.params;
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('category', category)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (err) {
      setError('No se pudieron cargar los productos.');
    } else {
      setProductos(data ?? []);
    }
    setCargando(false);
  }, [category]);

  useFocusEffect(useCallback(() => { cargarProductos(); }, [cargarProductos]));

  useEffect(() => {
    navigation.setOptions({
      title: CATEGORIA_LABEL[category],
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('AddProduct', { category })}
          style={({ pressed }) => [styles.botonAgregar, pressed && { opacity: 0.5 }]}
          accessibilityLabel="Agregar producto"
        >
          <Text style={styles.botonAgregarTexto}>+ Agregar</Text>
        </Pressable>
      ),
    });
  }, [navigation, category]);

  const productosFiltrados = busqueda.trim()
    ? productos.filter((p) =>
        p.name.toLowerCase().includes(busqueda.toLowerCase())
      )
    : productos;

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado}>
        <ActivityIndicator size="large" color="#000000" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.errorTexto}>{error}</Text>
        <Pressable style={({ pressed }) => [styles.botonReintentar, pressed && { opacity: 0.6 }]} onPress={cargarProductos}>
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Buscador */}
      {productos.length > 0 && (
        <View style={styles.buscadorContainer}>
          <TextInput
            style={styles.buscador}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar producto..."
            placeholderTextColor="#CCCCCC"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {busqueda.length > 0 && (
            <Pressable
              onPress={() => setBusqueda('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.limpiarBoton}
            >
              <Text style={styles.limpiarTexto}>✕</Text>
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        data={productosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            {busqueda ? (
              <>
                <Text style={styles.vacioTexto}>Sin resultados para "{busqueda}"</Text>
                <Pressable onPress={() => setBusqueda('')} style={styles.botonVacio}>
                  <Text style={styles.botonVacioTexto}>Limpiar búsqueda</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.vacioTexto}>No hay productos aquí todavía.</Text>
                <Pressable
                  style={({ pressed }) => [styles.botonVacio, pressed && { opacity: 0.6 }]}
                  onPress={() => navigation.navigate('AddProduct', { category })}
                >
                  <Text style={styles.botonVacioTexto}>Agregar el primero</Text>
                </Pressable>
              </>
            )}
          </View>
        }
        contentContainerStyle={productosFiltrados.length === 0 ? styles.listaVacia : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  centrado: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorTexto: { fontSize: 15, color: '#888888' },
  botonReintentar: {
    backgroundColor: '#000000', paddingHorizontal: 20, paddingVertical: 10,
  },
  botonReintentarTexto: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  botonAgregar: {
    // @ts-ignore
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    paddingLeft: 8,
  },
  botonAgregarTexto: { fontSize: 15, fontWeight: '600', color: '#000000' },

  // Buscador
  buscadorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  buscador: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#000000',
    borderRadius: 6,
  },
  limpiarBoton: { marginLeft: 8 },
  limpiarTexto: { fontSize: 14, color: '#AAAAAA' },

  // Vacío
  vacio: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  vacioTexto: { fontSize: 15, color: '#AAAAAA', textAlign: 'center' },
  botonVacio: {
    marginTop: 24, backgroundColor: '#000000',
    paddingHorizontal: 24, paddingVertical: 12,
  },
  botonVacioTexto: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  listaVacia: { flex: 1 },
});
