import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { RootStackParamList, ProductCategory } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

const CATEGORIAS: { label: string; value: ProductCategory; descripcion: string }[] = [
  { label: 'Crocs', value: 'crocs', descripcion: 'Sandalias y zapatos' },
  { label: 'Charms', value: 'charms', descripcion: 'Jibbitz y accesorios' },
  { label: 'Otros', value: 'otros', descripcion: 'Otros productos' },
];

type Conteos = Partial<Record<ProductCategory, number>>;

export default function LandingScreen({ navigation }: Props) {
  const [conteos, setConteos] = useState<Conteos>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarConteos();
  }, []);

  async function cargarConteos() {
    const { data } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true);

    if (data) {
      const c: Conteos = {};
      for (const row of data) {
        const cat = row.category as ProductCategory;
        c[cat] = (c[cat] ?? 0) + 1;
      }
      setConteos(c);
    }
    setCargando(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.titulo}>Inventario</Text>
          <Text style={styles.subtitulo}>Crocs Monterrey</Text>
        </View>

        <View style={styles.lista}>
          {CATEGORIAS.map((cat, index) => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.fila, index < CATEGORIAS.length - 1 && styles.filaBorde]}
              onPress={() => navigation.navigate('ProductList', { category: cat.value })}
              activeOpacity={0.6}
            >
              <View style={styles.filaInfo}>
                <Text style={styles.filaLabel}>{cat.label}</Text>
                <Text style={styles.filaDesc}>{cat.descripcion}</Text>
              </View>
              <View style={styles.filaRight}>
                {cargando ? (
                  <ActivityIndicator size="small" color="#CCCCCC" />
                ) : (
                  <Text style={styles.conteo}>
                    {conteos[cat.value] ?? 0} productos
                  </Text>
                )}
                <Text style={styles.flecha}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cerrarSesion} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.cerrarSesionTexto}>Cerrar sesión</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 48, paddingBottom: 40 },
  titulo: { fontSize: 32, fontWeight: '600', color: '#000000', letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, fontWeight: '400', color: '#888888', marginTop: 4 },
  lista: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    minHeight: 72,
  },
  filaBorde: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filaInfo: { flex: 1 },
  filaLabel: { fontSize: 18, fontWeight: '600', color: '#000000' },
  filaDesc: { fontSize: 13, fontWeight: '400', color: '#AAAAAA', marginTop: 2 },
  filaRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  conteo: { fontSize: 13, fontWeight: '400', color: '#AAAAAA' },
  flecha: { fontSize: 24, color: '#CCCCCC' },
  cerrarSesion: { position: 'absolute', bottom: 32, right: 0 },
  cerrarSesionTexto: { fontSize: 13, color: '#CCCCCC', fontWeight: '400' },
});
