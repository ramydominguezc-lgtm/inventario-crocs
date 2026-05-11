import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { Product } from '../types';
import { useColors, Colors, LOW_STOCK_THRESHOLD } from '../theme';

interface Props {
  product: Product;
  onPress: () => void;
  onLongPress?: () => void;
  reordenando?: boolean;
  onSubir?: () => void;
  onBajar?: () => void;
  esPrimero?: boolean;
  esUltimo?: boolean;
}

export default function ProductCard({ product, onPress, onLongPress, reordenando, onSubir, onBajar, esPrimero, esUltimo }: Props) {
  const C = useColors();
  const totalStock = product.product_variants?.reduce((sum, v) => (v.is_active ? sum + v.stock : sum), 0) ?? 0;
  const stockBajo = totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD;

  const s = getStyles(C);

  return (
    <Pressable
      style={({ pressed }) => [s.container, pressed && !reordenando && s.containerPressed]}
      onPress={reordenando ? undefined : onPress}
      onLongPress={reordenando ? undefined : onLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`Ver ${product.name}`}
    >
      {product.primary_image_url ? (
        <Image source={{ uri: product.primary_image_url }} style={s.imagen} resizeMode="cover" />
      ) : (
        <View style={[s.imagen, s.imagenVacia]}>
          <Text style={s.imagenVaciaTexto}>Sin foto</Text>
        </View>
      )}

      <View style={s.info}>
        <Text style={s.nombre} numberOfLines={2}>{product.name}</Text>
        {product.price_mxn != null && (
          <Text style={s.precio}>${product.price_mxn.toFixed(0)} MXN</Text>
        )}
        <View style={s.fila}>
          <View style={[s.stockBadge, totalStock === 0 && s.stockBadgeVacio, stockBajo && s.stockBadgeBajo]}>
            <Text style={[s.stockTexto, totalStock === 0 && s.stockTextoVacio, stockBajo && s.stockTextoBajo]}>
              {totalStock === 0 ? 'Sin stock' : `${totalStock} pzs`}
            </Text>
          </View>
          {stockBajo && <Text style={s.stockBajoLabel}>Stock bajo</Text>}
          {!product.is_active && <Text style={s.inactivo}>Inactivo</Text>}
        </View>
      </View>

      {reordenando ? (
        <View style={s.reordenBotones}>
          <Pressable
            onPress={onSubir}
            disabled={esPrimero}
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
            style={[s.reordenBtn, esPrimero && s.reordenBtnDesactivado]}
          >
            <Text style={[s.reordenTexto, esPrimero && s.reordenTextoDesactivado]}>↑</Text>
          </Pressable>
          <Pressable
            onPress={onBajar}
            disabled={esUltimo}
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
            style={[s.reordenBtn, esUltimo && s.reordenBtnDesactivado]}
          >
            <Text style={[s.reordenTexto, esUltimo && s.reordenTextoDesactivado]}>↓</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={s.chevron}>›</Text>
      )}
    </Pressable>
  );
}

function getStyles(C: Colors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.bg,
      alignItems: 'center',
      // @ts-ignore
      cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    },
    containerPressed: { backgroundColor: C.surface },
    imagen: { width: 64, height: 64, borderRadius: 8, backgroundColor: C.surface },
    imagenVacia: { justifyContent: 'center', alignItems: 'center' },
    imagenVaciaTexto: { fontSize: 10, color: C.textPlaceholder },
    info: { flex: 1, marginLeft: 14, gap: 4 },
    nombre: { fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 20 },
    precio: { fontSize: 13, color: C.textSub },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    stockBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: C.accent, borderRadius: 3 },
    stockBadgeVacio: { backgroundColor: C.border },
    stockBadgeBajo: { backgroundColor: C.stockBajoBg, borderWidth: 1, borderColor: C.stockBajoBorder },
    stockTexto: { fontSize: 11, fontWeight: '600', color: C.accentFg },
    stockTextoVacio: { color: C.textMuted },
    stockTextoBajo: { color: C.stockBajoText },
    stockBajoLabel: { fontSize: 11, color: C.warning, fontWeight: '600' },
    inactivo: { fontSize: 11, color: C.textPlaceholder },
    chevron: { fontSize: 22, color: C.textPlaceholder, marginLeft: 8 },
    reordenBotones: { flexDirection: 'column', gap: 2, marginLeft: 8 },
    reordenBtn: {
      width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderInput,
    },
    reordenBtnDesactivado: { opacity: 0.25 },
    reordenTexto: { fontSize: 16, color: C.text },
    reordenTextoDesactivado: { color: C.textPlaceholder },
  });
}
