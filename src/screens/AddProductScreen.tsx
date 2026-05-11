import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { pickAndUploadImage } from '../lib/imageUpload';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddProduct'>;

function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

export default function AddProductScreen({ navigation, route }: Props) {
  const { category } = route.params;

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioAntes, setPrecioAntes] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const [nuevaTalla, setNuevaTalla] = useState('');
  const [nuevoStock, setNuevoStock] = useState('0');
  const [variantes, setVariantes] = useState<{ size_label: string; stock: number }[]>([]);

  async function seleccionarImagen() {
    // La imagen se sube inmediatamente al elegirla para dar feedback rápido
    setSubiendoImagen(true);
    const url = await pickAndUploadImage('products/temp');
    setSubiendoImagen(false);
    if (url) {
      setImagenUrl(url);
    } else if (url === null) {
      // null = cancelado o error, solo mostramos error si no fue cancelado
      Alert.alert('Error', 'No se pudo subir la imagen.');
    }
  }

  function agregarVariante() {
    if (!nuevaTalla.trim()) return;
    if (variantes.find((v) => v.size_label === nuevaTalla.trim())) {
      Alert.alert('Talla duplicada', 'Ya agregaste esa talla.');
      return;
    }
    setVariantes((prev) => [
      ...prev,
      { size_label: nuevaTalla.trim(), stock: parseInt(nuevoStock, 10) || 0 },
    ]);
    setNuevaTalla('');
    setNuevoStock('0');
  }

  async function guardar() {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío.');
      return;
    }

    setGuardando(true);

    const productoId = crypto.randomUUID();
    const slug = generarSlug(nombre);

    const { error: productoError } = await supabase.from('products').insert({
      id: productoId,
      name: nombre.trim(),
      slug,
      description: descripcion.trim() || null,
      price_mxn: precio ? parseFloat(precio) : null,
      compare_at_price_mxn: precioAntes ? parseFloat(precioAntes) : null,
      is_new: isNew,
      is_hot: isHot,
      is_active: true,
      category,
      primary_image_url: imagenUrl ?? '',
    });

    if (productoError) {
      setGuardando(false);
      Alert.alert('Error', `No se pudo crear el producto: ${productoError.message}`);
      return;
    }

    if (variantes.length > 0) {
      await supabase.from('product_variants').insert(
        variantes.map((v) => ({
          product_id: productoId,
          size_label: v.size_label,
          stock: v.stock,
        }))
      );
    }

    setGuardando(false);
    Alert.alert('¡Creado!', 'Producto agregado correctamente.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Imagen */}
        <TouchableOpacity
          style={styles.imagenContainer}
          onPress={seleccionarImagen}
          disabled={subiendoImagen}
          accessibilityLabel="Seleccionar imagen del producto"
        >
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={styles.imagen} resizeMode="cover" />
          ) : (
            <View style={styles.imagenVacia}>
              <Text style={styles.imagenVaciaIcono}>＋</Text>
              <Text style={styles.imagenVaciaTexto}>Agregar imagen</Text>
            </View>
          )}
          {subiendoImagen && (
            <View style={styles.imagenOverlay}>
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text style={styles.subiendoTexto}>Subiendo imagen...</Text>
            </View>
          )}
          {imagenUrl && !subiendoImagen && (
            <View style={styles.imagenBoton}>
              <Text style={styles.imagenBotonTexto}>Cambiar imagen</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Campos */}
        <View style={styles.grupo}>
          <Campo label="Nombre *">
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre del producto"
              placeholderTextColor="#CCCCCC"
              autoFocus
            />
          </Campo>

          <Campo label="Descripción">
            <TextInput
              style={[styles.input, styles.inputMultilinea]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Descripción opcional"
              placeholderTextColor="#CCCCCC"
              multiline
              numberOfLines={3}
            />
          </Campo>
        </View>

        <View style={styles.grupoFila}>
          <View style={{ flex: 1 }}>
            <Campo label="Precio MXN">
              <TextInput
                style={styles.input}
                value={precio}
                onChangeText={setPrecio}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#CCCCCC"
              />
            </Campo>
          </View>
          <View style={{ flex: 1 }}>
            <Campo label="Precio anterior">
              <TextInput
                style={styles.input}
                value={precioAntes}
                onChangeText={setPrecioAntes}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#CCCCCC"
              />
            </Campo>
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.seccionTitulo}>
          <Text style={styles.seccionLabel}>Etiquetas</Text>
        </View>
        <View style={styles.togglesGrupo}>
          <ToggleFila label="Marcar como nuevo" value={isNew} onToggle={setIsNew} />
          <ToggleFila label="Marcar como popular" value={isHot} onToggle={setIsHot} />
        </View>

        {/* Tallas */}
        <View style={styles.seccionTitulo}>
          <Text style={styles.seccionLabel}>Tallas y stock</Text>
          {variantes.length > 0 && (
            <Text style={styles.seccionHint}>{variantes.length} talla{variantes.length !== 1 ? 's' : ''}</Text>
          )}
        </View>

        {variantes.length > 0 && (
          <View style={styles.variantesGrupo}>
            {variantes.map((v, i) => (
              <View key={i} style={styles.varianteFila}>
                <Text style={styles.varianteTalla}>{v.size_label}</Text>
                <Text style={styles.varianteStock}>{v.stock} pzs</Text>
                <TouchableOpacity
                  onPress={() => setVariantes((prev) => prev.filter((_, idx) => idx !== i))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eliminar}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.agregarTallaContainer}>
          <TextInput
            style={[styles.input, styles.inputTalla]}
            value={nuevaTalla}
            onChangeText={setNuevaTalla}
            placeholder="Talla  (ej: M7/W9)"
            placeholderTextColor="#CCCCCC"
            returnKeyType="done"
            onSubmitEditing={agregarVariante}
          />
          <TextInput
            style={[styles.input, styles.inputStock]}
            value={nuevoStock}
            onChangeText={setNuevoStock}
            keyboardType="number-pad"
            placeholder="Stock"
            placeholderTextColor="#CCCCCC"
            selectTextOnFocus
          />
          <TouchableOpacity
            style={[styles.botonAgregarTalla, !nuevaTalla.trim() && styles.botonDesactivado]}
            onPress={agregarVariante}
            disabled={!nuevaTalla.trim()}
            accessibilityLabel="Agregar talla"
          >
            <Text style={styles.botonAgregarTallaTexto}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Guardar */}
        <TouchableOpacity
          style={[styles.botonGuardar, (guardando || subiendoImagen) && styles.botonDesactivado]}
          onPress={guardar}
          disabled={guardando || subiendoImagen}
          accessibilityLabel="Crear producto"
        >
          {guardando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonTexto}>Crear producto</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleFila({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={styles.toggleFila}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E0E0E0', true: '#000000' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingBottom: 48 },

  imagenContainer: { position: 'relative' },
  imagen: { width: '100%', height: 240 },
  imagenVacia: {
    width: '100%', height: 240, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  imagenVaciaIcono: { fontSize: 32, color: '#CCCCCC' },
  imagenVaciaTexto: { color: '#CCCCCC', fontSize: 14 },
  imagenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  subiendoTexto: { color: '#FFFFFF', fontSize: 13 },
  imagenBoton: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: '#000000', paddingHorizontal: 12, paddingVertical: 7,
  },
  imagenBotonTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  grupo: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  grupoFila: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  campo: {},
  campoLabel: {
    fontSize: 11, fontWeight: '600', color: '#999999',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderColor: '#E8E8E8',
    paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 15, color: '#000000', minHeight: 44,
  },
  inputMultilinea: { height: 88, textAlignVertical: 'top' },

  seccionTitulo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 4,
  },
  seccionLabel: { fontSize: 11, fontWeight: '600', color: '#999999', textTransform: 'uppercase', letterSpacing: 0.6 },
  seccionHint: { fontSize: 11, color: '#CCCCCC' },

  togglesGrupo: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  toggleFila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', minHeight: 52,
  },
  toggleLabel: { fontSize: 15, color: '#000000', flex: 1, marginRight: 16 },

  variantesGrupo: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  varianteFila: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', minHeight: 52,
  },
  varianteTalla: { fontSize: 15, color: '#000000', flex: 1 },
  varianteStock: { fontSize: 14, color: '#888888', marginRight: 20 },
  eliminar: { fontSize: 13, color: '#CCCCCC' },

  agregarTallaContainer: {
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 8, alignItems: 'center',
  },
  inputTalla: { flex: 1 },
  inputStock: { width: 72, textAlign: 'center' },
  botonAgregarTalla: {
    backgroundColor: '#000000', width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  botonAgregarTallaTexto: { color: '#FFFFFF', fontSize: 24, lineHeight: 28 },

  botonGuardar: {
    marginHorizontal: 20, marginTop: 32,
    backgroundColor: '#000000', paddingVertical: 16, alignItems: 'center', minHeight: 52,
  },
  botonDesactivado: { opacity: 0.4 },
  botonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
