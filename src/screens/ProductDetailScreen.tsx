import React, { useEffect, useState } from 'react';
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
import { Product, ProductVariant, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const [producto, setProducto] = useState<Product | null>(null);
  const [variantes, setVariantes] = useState<ProductVariant[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // Campos editables
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioAntes, setPrecioAntes] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [imagenUrl, setImagenUrl] = useState('');

  useEffect(() => {
    cargarProducto();
  }, [productId]);

  async function cargarProducto() {
    setCargando(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', productId)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'No se pudo cargar el producto.');
      navigation.goBack();
      return;
    }

    setProducto(data);
    setNombre(data.name);
    setDescripcion(data.description ?? '');
    setPrecio(data.price_mxn?.toString() ?? '');
    setPrecioAntes(data.compare_at_price_mxn?.toString() ?? '');
    setIsNew(data.is_new);
    setIsHot(data.is_hot);
    setIsActive(data.is_active);
    setImagenUrl(data.primary_image_url);
    setVariantes(data.product_variants ?? []);
    setCargando(false);
  }

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

    if (resultado.canceled || !resultado.assets[0]) return;

    const uri = resultado.assets[0].uri;
    setSubiendoImagen(true);

    try {
      const nombreArchivo = `products/${productId}_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(nombreArchivo, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(nombreArchivo);

      setImagenUrl(urlData.publicUrl);
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la imagen.');
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function actualizarStockVariante(varianteId: string, nuevoStock: string) {
    const stock = parseInt(nuevoStock, 10);
    if (isNaN(stock)) return;

    const { error } = await supabase
      .from('product_variants')
      .update({ stock, stock_updated_at: new Date().toISOString() })
      .eq('id', varianteId);

    if (!error) {
      setVariantes((prev) =>
        prev.map((v) => (v.id === varianteId ? { ...v, stock } : v))
      );
    }
  }

  async function guardar() {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío.');
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from('products')
      .update({
        name: nombre.trim(),
        description: descripcion.trim() || null,
        price_mxn: precio ? parseFloat(precio) : null,
        compare_at_price_mxn: precioAntes ? parseFloat(precioAntes) : null,
        is_new: isNew,
        is_hot: isHot,
        is_active: isActive,
        primary_image_url: imagenUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    setGuardando(false);

    if (error) {
      Alert.alert('Error', 'No se pudo guardar el producto.');
    } else {
      Alert.alert('Guardado', 'Producto actualizado correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado}>
        <ActivityIndicator size="large" color="#000000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Imagen */}
        <TouchableOpacity style={styles.imagenContainer} onPress={seleccionarImagen} disabled={subiendoImagen}>
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={styles.imagen} resizeMode="cover" />
          ) : (
            <View style={styles.imagenVacia}>
              <Text style={styles.imagenVaciaTexto}>Toca para agregar imagen</Text>
            </View>
          )}
          {subiendoImagen && (
            <View style={styles.imagenOverlay}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
          <View style={styles.imagenBoton}>
            <Text style={styles.imagenBotonTexto}>Cambiar imagen</Text>
          </View>
        </TouchableOpacity>

        {/* Campos principales */}
        <View style={styles.seccion}>
          <Text style={styles.label}>Nombre</Text>
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
          <ToggleFila label="Activo / visible" value={isActive} onToggle={setIsActive} />
        </View>

        {/* Variantes / Stock */}
        {variantes.length > 0 && (
          <View style={styles.variantesSeccion}>
            <Text style={styles.seccionTitulo}>Stock por talla</Text>
            {variantes
              .filter((v) => v.is_active)
              .sort((a, b) => a.size_label.localeCompare(b.size_label))
              .map((variante) => (
                <View key={variante.id} style={styles.varianteFila}>
                  <Text style={styles.varianteTalla}>{variante.size_label}</Text>
                  <TextInput
                    style={styles.varianteInput}
                    value={variante.stock.toString()}
                    onChangeText={(val) => actualizarStockVariante(variante.id, val)}
                    keyboardType="number-pad"
                  />
                </View>
              ))}
          </View>
        )}

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.botonGuardar, guardando && styles.botonGuardarDesactivado]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonGuardarTexto}>Guardar cambios</Text>
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
  centrado: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
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
  imagenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  label: { fontSize: 12, fontWeight: '600', color: '#888888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  seccionTitulo: { fontSize: 12, fontWeight: '600', color: '#888888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  varianteFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  varianteTalla: { fontSize: 15, fontWeight: '400', color: '#000000' },
  varianteInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    width: 70,
    padding: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
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
