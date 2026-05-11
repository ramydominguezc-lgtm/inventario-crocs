import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { Product } from '../types';

interface Props {
  product: Product;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function ProductCard({ product, onPress, onLongPress }: Props) {
  const totalStock =
    product.product_variants?.reduce((sum, v) => (v.is_active ? sum + v.stock : sum), 0) ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`Ver ${product.name}`}
    >
      {product.primary_image_url ? (
        <Image
          source={{ uri: product.primary_image_url }}
          style={styles.imagen}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imagen, styles.imagenVacia]}>
          <Text style={styles.imagenVaciaTexto}>Sin foto</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={2}>{product.name}</Text>
        {product.price_mxn != null && (
          <Text style={styles.precio}>${product.price_mxn.toFixed(0)} MXN</Text>
        )}
        <View style={styles.fila}>
          <View style={[styles.stockBadge, totalStock === 0 && styles.stockBadgeVacio]}>
            <Text style={[styles.stockTexto, totalStock === 0 && styles.stockTextoVacio]}>
              {totalStock === 0 ? 'Sin stock' : `${totalStock} pzs`}
            </Text>
          </View>
          {!product.is_active && (
            <Text style={styles.inactivo}>Inactivo</Text>
          )}
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    // @ts-ignore — cursor solo aplica en web
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  containerPressed: {
    backgroundColor: '#F8F8F8',
  },
  imagen: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  imagenVacia: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenVaciaTexto: {
    fontSize: 10,
    color: '#CCCCCC',
  },
  info: {
    flex: 1,
    marginLeft: 14,
    gap: 4,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 20,
  },
  precio: {
    fontSize: 13,
    fontWeight: '400',
    color: '#555555',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#000000',
    borderRadius: 3,
  },
  stockBadgeVacio: {
    backgroundColor: '#F0F0F0',
  },
  stockTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stockTextoVacio: {
    color: '#AAAAAA',
  },
  inactivo: {
    fontSize: 11,
    color: '#CCCCCC',
  },
  chevron: {
    fontSize: 22,
    color: '#CCCCCC',
    marginLeft: 8,
  },
});
