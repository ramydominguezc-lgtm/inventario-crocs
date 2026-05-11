import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Product } from '../types';

interface Props {
  product: Product;
  onPress: () => void;
}

export default function ProductCard({ product, onPress }: Props) {
  const totalStock =
    product.product_variants?.reduce((sum, v) => (v.is_active ? sum + v.stock : sum), 0) ?? 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{ uri: product.primary_image_url }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {product.price_mxn != null && (
          <Text style={styles.price}>${product.price_mxn.toFixed(0)} MXN</Text>
        )}
        <View style={styles.stockRow}>
          <View style={[styles.stockBadge, totalStock === 0 && styles.stockBadgeEmpty]}>
            <Text style={[styles.stockText, totalStock === 0 && styles.stockTextEmpty]}>
              {totalStock === 0 ? 'Sin stock' : `${totalStock} piezas`}
            </Text>
          </View>
          {!product.is_active && (
            <Text style={styles.inactiveLabel}>Inactivo</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  info: {
    flex: 1,
    marginLeft: 16,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 20,
  },
  price: {
    fontSize: 13,
    fontWeight: '400',
    color: '#555555',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#000000',
    borderRadius: 4,
  },
  stockBadgeEmpty: {
    backgroundColor: '#E0E0E0',
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stockTextEmpty: {
    color: '#888888',
  },
  inactiveLabel: {
    fontSize: 11,
    color: '#AAAAAA',
    fontWeight: '400',
  },
});
