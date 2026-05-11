import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, SafeAreaView,
  Image, Alert, ActivityIndicator, Switch, Pressable, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { pickAndUploadImage } from '../lib/imageUpload';
import { RootStackParamList } from '../types';
import SizePicker, { TallaConStock } from '../components/SizePicker';
import { useColors, Colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddProduct'>;

function generarSlug(nombre: string): string {
  return nombre.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}

export default function AddProductScreen({ navigation, route }: Props) {
  const { category } = route.params;
  const C = useColors();
  const s = useMemo(() => getStyles(C), [C]);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // Crocs
  const [tallasCrocs, setTallasCrocs] = useState<TallaConStock[]>([]);

  // Charms
  const [piezasCount, setPiezasCount] = useState('');
  const [stockCharms, setStockCharms] = useState('0');

  // Otros
  const [variantes, setVariantes] = useState<{ size_label: string; stock: number }[]>([]);
  const [nuevaVariante, setNuevaVariante] = useState('');
  const [nuevoStock, setNuevoStock] = useState('0');

  const esCrocs = category === 'crocs';
  const esCharms = category === 'charms';

  async function seleccionarImagen() {
    setSubiendoImagen(true);
    const url = await pickAndUploadImage('products/temp');
    setSubiendoImagen(false);
    if (url) setImagenUrl(url);
    else Alert.alert('Error', 'No se pudo subir la imagen.');
  }

  function agregarVariante() {
    if (!nuevaVariante.trim()) return;
    if (variantes.find(v => v.size_label === nuevaVariante.trim())) {
      Alert.alert('Duplicado', 'Ya existe esa variante.');
      return;
    }
    setVariantes(prev => [...prev, { size_label: nuevaVariante.trim(), stock: parseInt(nuevoStock, 10) || 0 }]);
    setNuevaVariante('');
    setNuevoStock('0');
  }

  async function guardar() {
    if (!nombre.trim()) { Alert.alert('Campo requerido', 'El nombre no puede estar vacío.'); return; }
    setGuardando(true);

    const productoId = crypto.randomUUID();
    const { error: productoError } = await supabase.from('products').insert({
      id: productoId,
      name: nombre.trim(),
      slug: generarSlug(nombre),
      description: descripcion.trim() || null,
      price_mxn: precio ? parseFloat(precio) : null,
      is_new: isNew, is_hot: isHot, is_active: true,
      category,
      primary_image_url: imagenUrl ?? '',
      pieces_count: esCharms && piezasCount ? parseInt(piezasCount, 10) : null,
    });

    if (productoError) {
      setGuardando(false);
      Alert.alert('Error', productoError.message);
      return;
    }

    let variantesAGuardar: { size_label: string; stock: number }[] = [];
    if (esCrocs) variantesAGuardar = tallasCrocs;
    else if (esCharms) variantesAGuardar = [{ size_label: 'unidad', stock: parseInt(stockCharms, 10) || 0 }];
    else variantesAGuardar = variantes;

    if (variantesAGuardar.length > 0) {
      await supabase.from('product_variants').insert(
        variantesAGuardar.map(v => ({ product_id: productoId, size_label: v.size_label, stock: v.stock }))
      );
    }

    setGuardando(false);
    Alert.alert('¡Creado!', 'Producto agregado correctamente.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Imagen */}
        <Pressable style={s.imagenContainer} onPress={seleccionarImagen} disabled={subiendoImagen}>
          {imagenUrl
            ? <Image source={{ uri: imagenUrl }} style={s.imagen} resizeMode="cover" />
            : <View style={s.imagenVacia}>
                <Text style={s.imagenVaciaIcono}>＋</Text>
                <Text style={s.imagenVaciaTexto}>Agregar imagen</Text>
              </View>
          }
          {subiendoImagen && (
            <View style={s.imagenOverlay}>
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text style={s.subiendoTexto}>Subiendo imagen...</Text>
            </View>
          )}
          {imagenUrl && !subiendoImagen && (
            <View style={s.imagenBoton}><Text style={s.imagenBotonTexto}>Cambiar imagen</Text></View>
          )}
        </Pressable>

        {/* Campos básicos */}
        <View style={s.grupo}>
          <Campo label="Nombre *" C={C}>
            <TextInput style={s.input} value={nombre} onChangeText={setNombre}
              placeholder="Nombre del producto" placeholderTextColor={C.textPlaceholder} autoFocus />
          </Campo>
          <Campo label="Descripción" C={C}>
            <TextInput style={[s.input, s.inputMultilinea]} value={descripcion} onChangeText={setDescripcion}
              placeholder="Descripción opcional" placeholderTextColor={C.textPlaceholder} multiline numberOfLines={3} />
          </Campo>
        </View>

        {/* Precio + piezas por colección (charms) */}
        <View style={s.grupoFila}>
          <View style={{ flex: 1 }}>
            <Campo label="Precio MXN" C={C}>
              <TextInput style={s.input} value={precio} onChangeText={setPrecio}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textPlaceholder} />
            </Campo>
          </View>
          {esCharms && (
            <View style={{ flex: 1 }}>
              <Campo label="Piezas por colección" C={C}>
                <TextInput style={s.input} value={piezasCount} onChangeText={setPiezasCount}
                  keyboardType="number-pad" placeholder="0" placeholderTextColor={C.textPlaceholder} />
              </Campo>
            </View>
          )}
        </View>

        {/* Toggles */}
        <View style={s.seccionTitulo}><Text style={s.seccionLabel}>Etiquetas</Text></View>
        <View style={s.togglesGrupo}>
          <ToggleFila label="Marcar como nuevo" value={isNew} onToggle={setIsNew} C={C} />
          <ToggleFila label="Marcar como popular" value={isHot} onToggle={setIsHot} C={C} />
        </View>

        {/* === CROCS: size picker === */}
        {esCrocs && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionLabel}>Tallas y stock</Text>
              {tallasCrocs.length > 0 && <Text style={s.seccionHint}>{tallasCrocs.length} talla{tallasCrocs.length !== 1 ? 's' : ''}</Text>}
            </View>
            <View style={s.sizePickerWrapper}>
              <SizePicker onChange={setTallasCrocs} />
            </View>
          </>
        )}

        {/* === CHARMS: stock de la colección === */}
        {esCharms && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionLabel}>Unidades en stock</Text>
            </View>
            <View style={s.stockCharmRow}>
              <Text style={s.stockCharmLabel}>¿Cuántas colecciones tienes?</Text>
              <View style={s.grupoFila}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={stockCharms}
                  onChangeText={setStockCharms}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={C.textPlaceholder}
                  selectTextOnFocus
                />
              </View>
            </View>
          </>
        )}

        {/* === OTROS: variantes libres === */}
        {!esCrocs && !esCharms && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionLabel}>Variantes / stock</Text>
              {variantes.length > 0 && <Text style={s.seccionHint}>{variantes.length} variante{variantes.length !== 1 ? 's' : ''}</Text>}
            </View>

            {variantes.length > 0 && (
              <View style={s.variantesGrupo}>
                {variantes.map((v, i) => (
                  <View key={i} style={s.varianteFila}>
                    <Text style={s.varianteTalla}>{v.size_label}</Text>
                    <Text style={s.varianteStock}>{v.stock} pzs</Text>
                    <Pressable
                      onPress={() => setVariantes(prev => prev.filter((_, idx) => idx !== i))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      // @ts-ignore
                      style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}
                    >
                      <Text style={s.eliminar}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={s.agregarTallaContainer}>
              <TextInput
                style={[s.input, s.inputTalla]} value={nuevaVariante} onChangeText={setNuevaVariante}
                placeholder="Color, talla, tipo, modelo..." placeholderTextColor={C.textPlaceholder}
                returnKeyType="done" onSubmitEditing={agregarVariante}
              />
              <TextInput
                style={[s.input, s.inputStock]} value={nuevoStock} onChangeText={setNuevoStock}
                keyboardType="number-pad" placeholder="0" placeholderTextColor={C.textPlaceholder} selectTextOnFocus
              />
              <Pressable
                style={({ pressed }) => [s.botonAgregarTalla, !nuevaVariante.trim() && s.botonDesactivado, pressed && { opacity: 0.7 }]}
                onPress={agregarVariante} disabled={!nuevaVariante.trim()}
              >
                <Text style={s.botonAgregarTallaTexto}>+</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Guardar */}
        <Pressable
          style={({ pressed }) => [s.botonGuardar, (guardando || subiendoImagen) && s.botonDesactivado, pressed && { opacity: 0.8 }]}
          onPress={guardar} disabled={guardando || subiendoImagen}
        >
          {guardando ? <ActivityIndicator color={C.accentFg} /> : <Text style={s.botonTexto}>Crear producto</Text>}
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

function Campo({ label, children, C }: { label: string; children: React.ReactNode; C: Colors }) {
  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleFila({ label, value, onToggle, C }: { label: string; value: boolean; onToggle: (v: boolean) => void; C: Colors }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, minHeight: 52 }}>
      <Text style={{ fontSize: 15, color: C.text, flex: 1, marginRight: 16 }}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: C.borderInput, true: C.accent }} thumbColor={C.accentFg} />
    </View>
  );
}

function getStyles(C: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 48 },

    imagenContainer: { position: 'relative' },
    imagen: { width: '100%', height: 240 },
    imagenVacia: { width: '100%', height: 240, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', gap: 8 },
    imagenVaciaIcono: { fontSize: 32, color: C.textPlaceholder },
    imagenVaciaTexto: { color: C.textPlaceholder, fontSize: 14 },
    imagenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', gap: 8 },
    subiendoTexto: { color: '#FFFFFF', fontSize: 13 },
    imagenBoton: { position: 'absolute', bottom: 12, right: 12, backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 7 },
    imagenBotonTexto: { color: C.accentFg, fontSize: 12, fontWeight: '600' },

    grupo: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
    grupoFila: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
    input: { borderWidth: 1, borderColor: C.borderInput, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: C.text, minHeight: 44, backgroundColor: C.bg },
    inputMultilinea: { height: 88, textAlignVertical: 'top' },

    seccionTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 4 },
    seccionLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    seccionHint: { fontSize: 11, color: C.textPlaceholder },

    togglesGrupo: { borderTopWidth: 1, borderTopColor: C.border },

    sizePickerWrapper: { paddingHorizontal: 20, paddingTop: 12 },

    stockCharmRow: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
    stockCharmLabel: { fontSize: 15, color: C.text },

    variantesGrupo: { borderTopWidth: 1, borderTopColor: C.border },
    varianteFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, minHeight: 52 },
    varianteTalla: { fontSize: 15, color: C.text, flex: 1 },
    varianteStock: { fontSize: 14, color: C.textMuted, marginRight: 16 },
    eliminar: { fontSize: 16, color: C.textPlaceholder },

    agregarTallaContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 8, alignItems: 'center' },
    inputTalla: { flex: 1 },
    inputStock: { width: 64, textAlign: 'center' },
    botonAgregarTalla: { backgroundColor: C.accent, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    botonAgregarTallaTexto: { color: C.accentFg, fontSize: 24, lineHeight: 28 },

    botonGuardar: { marginHorizontal: 20, marginTop: 32, backgroundColor: C.accent, paddingVertical: 16, alignItems: 'center', minHeight: 52 },
    botonDesactivado: { opacity: 0.4 },
    botonTexto: { color: C.accentFg, fontSize: 16, fontWeight: '600' },
  });
}
