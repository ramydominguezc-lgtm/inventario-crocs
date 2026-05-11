import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ProductCategory } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

const CATEGORIAS: { label: string; value: ProductCategory; descripcion: string }[] = [
  { label: 'Crocs', value: 'crocs', descripcion: 'Sandalias y zapatos' },
  { label: 'Charms', value: 'charms', descripcion: 'Jibbitz y accesorios' },
  { label: 'Otros', value: 'otros', descripcion: 'Otros productos' },
];

export default function LandingScreen({ navigation }: Props) {
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
              <View>
                <Text style={styles.filaLabel}>{cat.label}</Text>
                <Text style={styles.filaDesc}>{cat.descripcion}</Text>
              </View>
              <Text style={styles.flecha}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: '400',
    color: '#888888',
    marginTop: 4,
  },
  lista: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
  },
  filaBorde: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filaLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  filaDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#AAAAAA',
    marginTop: 2,
  },
  flecha: {
    fontSize: 24,
    color: '#CCCCCC',
    fontWeight: '400',
  },
});
