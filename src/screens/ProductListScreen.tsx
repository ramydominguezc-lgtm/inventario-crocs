import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
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

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [cargarProductos])
  );

  useEffect(() => {
    navigation.setOptions({
      title: CATEGORIA_LABEL[category],
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('AddProduct', { category })}
          style={styles.botonAgregar}
        >
          <Text style={styles.botonAgregarTexto}>+ Agregar</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, category]);

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
        <TouchableOpacity style={styles.reintentar} onPress={cargarProductos}>
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FlatList
        data={productos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>No hay productos en esta categoría.</Text>
            <TouchableOpacity
              style={styles.botonVacio}
              onPress={() => navigation.navigate('AddProduct', { category })}
            >
              <Text style={styles.botonVacioTexto}>Agregar primero</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={productos.length === 0 ? styles.listaVacia : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centrado: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTexto: {
    fontSize: 15,
    color: '#888888',
    fontWeight: '400',
  },
  reintentar: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#000000',
  },
  reintentarTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  botonAgregar: {
    marginRight: 4,
  },
  botonAgregarTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  vacio: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  vacioTexto: {
    fontSize: 15,
    color: '#AAAAAA',
    fontWeight: '400',
    textAlign: 'center',
  },
  botonVacio: {
    marginTop: 24,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  botonVacioTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listaVacia: {
    flex: 1,
  },
});
