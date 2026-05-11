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
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
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
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // Variantes de talla para agregar
  const [nuevaTalla, setNuevaTalla] = useState('');
  const [nuevoStock, setNuevoStock] = useState('0');
  const [variantes, setVariantes] = useState<{ size_label: string; stock: number }[]>([]);

  async function seleccionarImagen() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Se necesita acceso a la galería.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      setImagenUri(resultado.assets[0].uri);
    }
  }

  function agregarVariante() {
    if (!nuevaTalla.trim()) return;
    const ya = variantes.find((v) => v.size_label === nuevaTalla.trim());
    if (ya) {
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

  function eliminarVariante(index: number) {
    setVariantes((prev) => prev.filter((_, i) => i !== index));
  }

  async function subirImagen(productoId: string): Promise<string | null> {
    if (!imagenUri) return null;
    setSubiendoImagen(true);
    try {
      const nombreArchivo = `products/${productoId}_${Date.now()}.jpg`;
      const response = await fetch(imagenUri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('product-images')
        .upload(nombreArchivo, blob, { contentType: 'image/jpeg', upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from('product-images').getPublicUrl(nombreArchivo);
      return data.publicUrl;
    } catch {
      return null;
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function guardar() {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío.');
      return;
    }

    setGuardando(true);

    const slug = generarSlug(nombre);
    const productoId = crypto.randomUUID();

    // Subir imagen primero si hay una
    const urlImagen = imagenUri ? await subirImagen(productoId) : null;

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
      primary_image_url: urlImagen ?? '',
    });

    if (productoError) {
      setGuardando(false);
      Alert.alert('Error', `No se pudo crear el producto: ${productoError.message}`);
      return;
    }

    // Insertar variantes si hay
    if (variantes.length > 0) {
      const { error: variantesError } = await supabase.from('product_variants').insert(
        variantes.map((v) => ({
          product_id: productoId,
          size_label: v.size_label,
          stock: v.stock,
        }))
      );

      if (variantesError) {
        Alert.alert('Aviso', 'Producto creado, pero hubo un error al guardar las tallas.');
      }
    }

    setGuardando(false);
    Alert.alert('Creado', 'Producto agregado correctamente.', [
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
        >
          {imagenUri ? (
            <Image source={{ uri: imagenUri }} style={styles.imagen} resizeMode="cover" />
          ) : (
            <View style={styles.imagenVacia}>
              <Text style={styles.imagenVaciaTexto}>Toca para agregar imagen</Text>
            </View>
          )}
          <View style={styles.imagenBoton}>
            <Text style={styles.imagenBotonTexto}>
              {imagenUri ? 'Cambiar imagen' : 'Seleccionar imagen'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Campos */}
        <View style={styles.seccion}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre del producto"
            placeholderTextColor="#CCCCCC"
          />
        </View>

        <View style={styles.seccion}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.inputMultilinea]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Descripción opcional"
            placeholderTextColor="#CCCCCC"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.fila}>
          <View style={[styles.seccion, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Precio MXN</Text>
            <TextInput
              style={styles.input}
              value={precio}
              onChangeText={setPrecio}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#CCCCCC"
            />
          </View>
          <View style={[styles.seccion, { flex: 1 }]}>
            <Text style={styles.label}>Precio antes</Text>
            <TextInput
              style={styles.input}
              value={precioAntes}
              onChangeText={setPrecioAntes}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#CCCCCC"
            />
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.toggleSeccion}>
          <ToggleFila label="Producto nuevo" value={isNew} onToggle={setIsNew} />
          <ToggleFila label="Producto popular" value={isHot} onToggle={setIsHot} />
        </View>

        {/* Tallas / Variantes */}
        <View style={styles.variantesSeccion}>
          <Text style={styles.seccionTitulo}>Tallas y stock</Text>

          {variantes.map((v, i) => (
            <View key={i} style={styles.varianteFila}>
              <Text style={styles.varianteTalla}>{v.size_label}</Text>
              <Text style={styles.varianteStock}>{v.stock} pzs</Text>
              <TouchableOpacity onPress={() => eliminarVariante(i)}>
                <Text style={styles.eliminar}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.agregarFila}>
            <TextInput
              style={[styles.input, styles.inputTalla]}
              value={nuevaTalla}
              onChangeText={setNuevaTalla}
              placeholder="Talla (ej: M7/W9)"
              placeholderTextColor="#CCCCCC"
            />
            <TextInput
              style={[styles.input, styles.inputStock]}
              value={nuevoStock}
              onChangeText={setNuevoStock}
              keyboardType="number-pad"
              placeholder="Stock"
              placeholderTextColor="#CCCCCC"
            />
            <TouchableOpacity style={styles.botonAgregarTalla} onPress={agregarVariante}>
              <Text style={styles.botonAgregarTallaTexto}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.botonGuardar, (guardando || subiendoImagen) && styles.botonGuardarDesactivado]}
          onPress={guardar}
          disabled={guardando || subiendoImagen}
        >
          {guardando || subiendoImagen ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonGuardarTexto}>Crear producto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleFila({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
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
  scroll: { paddingBottom: 40 },
  imagenContainer: { position: 'relative' },
  imagen: { width: '100%', height: 260 },
  imagenVacia: {
    width: '100%',
    height: 260,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenVaciaTexto: { color: '#AAAAAA', fontSize: 14, fontWeight: '400' },
  imagenBoton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imagenBotonTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  seccion: { paddingHorizontal: 20, paddingTop: 20 },
  fila: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 12,
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
  },
  inputMultilinea: { height: 80, textAlignVertical: 'top' },
  toggleSeccion: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  toggleFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  toggleLabel: { fontSize: 15, fontWeight: '400', color: '#000000' },
  variantesSeccion: { marginTop: 28, paddingHorizontal: 20 },
  seccionTitulo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  varianteFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  varianteTalla: { fontSize: 15, fontWeight: '400', color: '#000000', flex: 1 },
  varianteStock: { fontSize: 15, color: '#555555', marginRight: 16 },
  eliminar: { fontSize: 13, color: '#AAAAAA', fontWeight: '400' },
  agregarFila: { flexDirection: 'row', marginTop: 12, gap: 8, alignItems: 'center' },
  inputTalla: { flex: 1 },
  inputStock: { width: 70, textAlign: 'center' },
  botonAgregarTalla: {
    backgroundColor: '#000000',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonAgregarTallaTexto: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  botonGuardar: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: '#000000',
    paddingVertical: 16,
    alignItems: 'center',
  },
  botonGuardarDesactivado: { opacity: 0.5 },
  botonGuardarTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
