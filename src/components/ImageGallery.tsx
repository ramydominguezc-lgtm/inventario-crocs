import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Image, ScrollView, Pressable,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { pickAndUploadImage } from '../lib/imageUpload';
import { ProductCategory, ProductImage } from '../types';
import { useColors, Colors } from '../theme';

const MAX_IMAGENES: Record<ProductCategory, number> = {
  crocs: 5,
  otros: 5,
  charms: 2,
};

interface Props {
  productId: string;
  category: ProductCategory;
  onPrimaryChange?: (url: string) => void;
}

export default function ImageGallery({ productId, category, onPrimaryChange }: Props) {
  const C = useColors();
  const s = useMemo(() => getStyles(C), [C]);
  const [imagenes, setImagenes] = useState<ProductImage[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const max = MAX_IMAGENES[category];

  useEffect(() => { cargar(); }, [productId]);

  async function cargar() {
    const { data } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });
    if (data) setImagenes(data);
  }

  async function agregar() {
    setSubiendo(true);
    const url = await pickAndUploadImage(`products/${productId}`);
    setSubiendo(false);
    if (!url) return;
    const nextOrder = imagenes.length > 0 ? Math.max(...imagenes.map(i => i.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from('product_images')
      .insert({ product_id: productId, image_url: url, sort_order: nextOrder })
      .select().single();
    if (!data) return;
    const nuevas = [...imagenes, data];
    setImagenes(nuevas);
    if (imagenes.length === 0) {
      onPrimaryChange?.(url);
      await supabase.from('products').update({ primary_image_url: url }).eq('id', productId);
    }
  }

  async function eliminar(imagen: ProductImage) {
    Alert.alert('Eliminar foto', '¿Eliminar esta imagen?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('product_images').delete().eq('id', imagen.id);
          const nuevas = imagenes.filter(i => i.id !== imagen.id);
          setImagenes(nuevas);
          const newPrimary = nuevas[0]?.image_url ?? '';
          onPrimaryChange?.(newPrimary);
          await supabase.from('products').update({ primary_image_url: newPrimary }).eq('id', productId);
        },
      },
    ]);
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {imagenes.map((img, idx) => (
          <View key={img.id} style={s.thumb}>
            <Image source={{ uri: img.image_url }} style={s.thumbImg} resizeMode="cover" />
            {idx === 0 && <View style={s.badge}><Text style={s.badgeText}>principal</Text></View>}
            <Pressable
              style={s.eliminarBtn}
              onPress={() => eliminar(img)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={s.eliminarTexto}>✕</Text>
            </Pressable>
          </View>
        ))}
        {imagenes.length < max && (
          <Pressable style={[s.thumb, s.thumbAgregar]} onPress={agregar} disabled={subiendo}>
            {subiendo
              ? <ActivityIndicator color={C.textMuted} />
              : <>
                  <Text style={s.masIcono}>＋</Text>
                  <Text style={s.masTexto}>{imagenes.length === 0 ? 'Agregar foto' : 'Más fotos'}</Text>
                </>
            }
          </Pressable>
        )}
      </ScrollView>
      <Text style={s.contador}>{imagenes.length}/{max} fotos</Text>
    </View>
  );
}

function getStyles(C: Colors) {
  return StyleSheet.create({
    row: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, gap: 10, flexDirection: 'row' },
    thumb: { width: 90, height: 90, position: 'relative' },
    thumbImg: { width: 90, height: 90 },
    badge: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3, alignItems: 'center',
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
    eliminarBtn: {
      position: 'absolute', top: 4, right: 4,
      backgroundColor: 'rgba(0,0,0,0.65)', width: 20, height: 20,
      borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    },
    eliminarTexto: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },
    thumbAgregar: { backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', gap: 4 },
    masIcono: { fontSize: 22, color: C.textPlaceholder },
    masTexto: { fontSize: 11, color: C.textPlaceholder, textAlign: 'center' },
    contador: { fontSize: 11, color: C.textFaint, paddingHorizontal: 20, paddingBottom: 8 },
  });
}
