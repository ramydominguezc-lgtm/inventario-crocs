import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { pickAndUploadImage } from '../lib/imageUpload';
import { Product, ProductVariant, RootStackParamList } from '../types';
import StockControl from '../components/StockControl';
import SizePicker, { TallaConStock } from '../components/SizePicker';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const [producto, setProducto] = useState<Product | null>(null);
  const [variantes, setVariantes] = useState<ProductVariant[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [guardandoTallas, setGuardandoTallas] = useState(false);
  const [tallasPendientes, setTallasPendientes] = useState<TallaConStock[]>([]);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioAntes, setPrecioAntes] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [imagenUrl, setImagenUrl] = useState('');

  useEffect(() => { cargarProducto(); }, [productId]);

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

    navigation.setOptions({ title: data.name });
  }

  function confirmarEliminar(id: string) {
    Alert.alert('Eliminar producto', '¿Estás seguro? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarProducto(id) },
    ]);
  }

  async function eliminarProducto(id: string) {
    await supabase.from('product_variants').delete().eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) Alert.alert('Error', 'No se pudo eliminar el producto.');
    else navigation.goBack();
  }

  async function cambiarImagen() {
    setSubiendoImagen(true);
    const url = await pickAndUploadImage(`products/${productId}`);
    setSubiendoImagen(false);
    if (url) setImagenUrl(url);
    else Alert.alert('Error', 'No se pudo subir la imagen.');
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
    if (error) Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    else Alert.alert('Guardado', 'Cambios guardados.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  }

  async function agregarTallas() {
    if (tallasPendientes.length === 0) return;
    setGuardandoTallas(true);

    const { data, error } = await supabase
      .from('product_variants')
      .insert(tallasPendientes.map((t) => ({
        product_id: productId,
        size_label: t.size_label,
        stock: t.stock,
      })))
      .select();

    setGuardandoTallas(false);

    if (error) {
      Alert.alert('Error', 'No se pudieron agregar las tallas.');
    } else {
      setVariantes((prev) => [...prev, ...(data ?? [])]);
      setTallasPendientes([]);
      Alert.alert('Listo', `${tallasPendientes.length} talla${tallasPendientes.length !== 1 ? 's' : ''} agregada${tallasPendientes.length !== 1 ? 's' : ''}.`);
    }
  }

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.cargandoTexto}>Cargando producto...</Text>
      </SafeAreaView>
    );
  }

  const variantesActivas = variantes
    .filter((v) => v.is_active)
    .sort((a, b) => a.size_label.localeCompare(b.size_label));

  const esCrocs = producto?.category === 'crocs';
  const tallasExistentes = variantes.map((v) => v.size_label);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Imagen */}
        <Pressable
          style={styles.imagenContainer}
          onPress={cambiarImagen}
          disabled={subiendoImagen}
          accessibilityLabel="Cambiar imagen del producto"
        >
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={styles.imagen} resizeMode="cover" />
          ) : (
            <View style={styles.imagenVacia}>
              <Text style={styles.imagenVaciaTexto}>Sin imagen</Text>
            </View>
          )}
          {subiendoImagen && (
            <View style={styles.imagenOverlay}>
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text style={styles.subiendoTexto}>Subiendo...</Text>
            </View>
          )}
          <View style={styles.imagenBoton}>
            <Text style={styles.imagenBotonTexto}>{subiendoImagen ? 'Subiendo...' : 'Cambiar imagen'}</Text>
          </View>
        </Pressable>

        {/* Campos principales */}
        <View style={styles.grupo}>
          <Campo label="Nombre *">
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre del producto"
              placeholderTextColor="#CCCCCC"
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
              <TextInput style={styles.input} value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#CCCCCC" />
            </Campo>
          </View>
          <View style={{ flex: 1 }}>
            <Campo label="Precio anterior">
              <TextInput style={styles.input} value={precioAntes} onChangeText={setPrecioAntes} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#CCCCCC" />
            </Campo>
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.seccionTitulo}>
          <Text style={styles.seccionLabel}>Visibilidad</Text>
        </View>
        <View style={styles.togglesGrupo}>
          <ToggleFila label="Activo / visible en tienda" value={isActive} onToggle={setIsActive} />
          <ToggleFila label="Marcar como nuevo" value={isNew} onToggle={setIsNew} />
          <ToggleFila label="Marcar como popular" value={isHot} onToggle={setIsHot} />
        </View>

        {/* Stock por talla existente — con StockControl */}
        {variantesActivas.length > 0 && (
          <>
            <View style={styles.seccionTitulo}>
              <Text style={styles.seccionLabel}>Stock por talla</Text>
              <Text style={styles.seccionHint}>Se guarda automáticamente</Text>
            </View>
            <View style={styles.variantesGrupo}>
              {variantesActivas.map((v) => (
                <View key={v.id} style={styles.varianteFila}>
                  <Text style={styles.varianteTalla}>{v.size_label}</Text>
                  <StockControl
                    varianteId={v.id}
                    stockInicial={v.stock}
                    onCambio={(nuevo) =>
                      setVariantes((prev) => prev.map((p) => p.id === v.id ? { ...p, stock: nuevo } : p))
                    }
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Agregar tallas faltantes (solo Crocs o si no tiene ninguna) */}
        {(esCrocs || variantesActivas.length === 0) && (
          <>
            <View style={styles.seccionTitulo}>
              <Text style={styles.seccionLabel}>
                {variantesActivas.length === 0 ? 'Agregar tallas' : 'Agregar tallas faltantes'}
              </Text>
            </View>
            <View style={styles.sizePickerWrapper}>
              <SizePicker
                tallasExistentes={tallasExistentes}
                onChange={setTallasPendientes}
              />
            </View>

            {tallasPendientes.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.botonAgregarTallas, pressed && { opacity: 0.7 }, guardandoTallas && { opacity: 0.4 }]}
                onPress={agregarTallas}
                disabled={guardandoTallas}
              >
                {guardandoTallas
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.botonTexto}>Agregar {tallasPendientes.length} talla{tallasPendientes.length !== 1 ? 's' : ''}</Text>
                }
              </Pressable>
            )}
          </>
        )}

        {/* Guardar info general */}
        <Pressable
          style={({ pressed }) => [styles.botonGuardar, (guardando || subiendoImagen) && styles.botonDesactivado, pressed && { opacity: 0.8 }]}
          onPress={guardar}
          disabled={guardando || subiendoImagen}
        >
          {guardando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.botonTexto}>Guardar cambios</Text>}
        </Pressable>

        {/* Eliminar producto */}
        <Pressable
          style={({ pressed }) => [styles.botonEliminar, pressed && { opacity: 0.7 }]}
          onPress={() => producto && confirmarEliminar(producto.id)}
        >
          <Text style={styles.botonEliminarTexto}>Eliminar producto</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.campoLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleFila({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={styles.toggleFila}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: '#E0E0E0', true: '#000000' }} thumbColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  centrado: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', gap: 12 },
  cargandoTexto: { fontSize: 14, color: '#AAAAAA' },
  scroll: { paddingBottom: 48 },

  imagenContainer: { position: 'relative' },
  imagen: { width: '100%', height: 280 },
  imagenVacia: { width: '100%', height: 280, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  imagenVaciaTexto: { color: '#CCCCCC', fontSize: 14 },
  imagenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', gap: 8 },
  subiendoTexto: { color: '#FFFFFF', fontSize: 13 },
  imagenBoton: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#000000', paddingHorizontal: 12, paddingVertical: 7 },
  imagenBotonTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  grupo: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  grupoFila: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  campoLabel: { fontSize: 11, fontWeight: '600', color: '#999999', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E8E8E8', paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#000000', minHeight: 44 },
  inputMultilinea: { height: 88, textAlignVertical: 'top' },

  seccionTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 4 },
  seccionLabel: { fontSize: 11, fontWeight: '600', color: '#999999', textTransform: 'uppercase', letterSpacing: 0.6 },
  seccionHint: { fontSize: 11, color: '#CCCCCC' },

  togglesGrupo: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  toggleFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', minHeight: 52 },
  toggleLabel: { fontSize: 15, color: '#000000', flex: 1, marginRight: 16 },

  variantesGrupo: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  varianteFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', minHeight: 60 },
  varianteTalla: { fontSize: 15, color: '#000000' },

  sizePickerWrapper: { paddingHorizontal: 20, paddingTop: 12 },

  botonAgregarTallas: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#000000', paddingVertical: 14, alignItems: 'center', minHeight: 52 },
  botonGuardar: { marginHorizontal: 20, marginTop: 24, backgroundColor: '#000000', paddingVertical: 16, alignItems: 'center', minHeight: 52 },
  botonDesactivado: { opacity: 0.4 },
  botonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  botonEliminar: { marginHorizontal: 20, marginTop: 12, paddingVertical: 16, alignItems: 'center', minHeight: 52, borderWidth: 1.5, borderColor: '#FF3B30' },
  botonEliminarTexto: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
});
