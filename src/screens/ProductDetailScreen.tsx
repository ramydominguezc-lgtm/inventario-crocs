import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Product, ProductVariant, RootStackParamList } from '../types';
import StockControl from '../components/StockControl';
import SizePicker, { TallaConStock } from '../components/SizePicker';
import ImageGallery from '../components/ImageGallery';
import Toast, { useToast } from '../components/Toast';
import { useColors, Colors } from '../theme';
import { ordenarPorTalla, tallaMX } from '../lib/tallas';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const C = useColors();
  const s = useMemo(() => getStyles(C), [C]);
  const toast = useToast();

  const [producto, setProducto] = useState<Product | null>(null);
  const [variantes, setVariantes] = useState<ProductVariant[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardandoTallas, setGuardandoTallas] = useState(false);
  const [tallasPendientes, setTallasPendientes] = useState<TallaConStock[]>([]);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [piezasCount, setPiezasCount] = useState('');

  useEffect(() => { cargarProducto(); }, [productId]);

  async function cargarProducto() {
    setCargando(true);
    const { data, error } = await supabase
      .from('products').select('*, product_variants(*)')
      .eq('id', productId).single();

    if (error || !data) {
      Alert.alert('Error', 'No se pudo cargar el producto.');
      navigation.goBack();
      return;
    }

    setProducto(data);
    setNombre(data.name);
    setDescripcion(data.description ?? '');
    setPrecio(data.price_mxn?.toString() ?? '');
    setIsNew(data.is_new);
    setIsHot(data.is_hot);
    setIsActive(data.is_active);
    setVariantes(data.product_variants ?? []);
    setPiezasCount(data.pieces_count?.toString() ?? '');
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

  async function guardar() {
    if (!nombre.trim()) { Alert.alert('Campo requerido', 'El nombre no puede estar vacío.'); return; }
    setGuardando(true);
    const { error } = await supabase.from('products').update({
      name: nombre.trim(),
      description: descripcion.trim() || null,
      price_mxn: precio ? parseFloat(precio) : null,
      is_new: isNew, is_hot: isHot, is_active: isActive,
      pieces_count: piezasCount ? parseInt(piezasCount, 10) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', productId);

    setGuardando(false);
    if (error) {
      toast.mostrar('Error al guardar', 'error');
    } else {
      toast.mostrar('✓ Guardado', 'exito');
      setTimeout(() => navigation.goBack(), 1200);
    }
  }

  async function agregarTallas() {
    if (tallasPendientes.length === 0) return;
    setGuardandoTallas(true);
    const { data, error } = await supabase
      .from('product_variants')
      .insert(tallasPendientes.map(t => ({ product_id: productId, size_label: t.size_label, stock: t.stock })))
      .select();
    setGuardandoTallas(false);
    if (error) {
      toast.mostrar('Error al agregar tallas', 'error');
    } else {
      setVariantes(prev => [...prev, ...(data ?? [])]);
      setTallasPendientes([]);
      toast.mostrar(`✓ ${tallasPendientes.length} talla${tallasPendientes.length !== 1 ? 's' : ''} agregada${tallasPendientes.length !== 1 ? 's' : ''}`, 'exito');
    }
  }

  // Mueve 1 pieza de almacén (bodega) al stock de venta (piso).
  async function moverAVenta(v: ProductVariant) {
    const enAlmacen = v.stock_almacen ?? 0;
    if (enAlmacen <= 0) return;
    const nuevoAlmacen = enAlmacen - 1;
    const nuevoVenta = v.stock + 1;
    setVariantes(prev => prev.map(p => p.id === v.id ? { ...p, stock: nuevoVenta, stock_almacen: nuevoAlmacen } : p));
    await supabase.from('product_variants')
      .update({ stock: nuevoVenta, stock_almacen: nuevoAlmacen, stock_updated_at: new Date().toISOString() })
      .eq('id', v.id);
  }

  if (cargando) {
    return (
      <SafeAreaView style={s.centrado}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  const categoria = producto?.category;
  const esCharms = categoria === 'charms';
  const esCrocs = categoria === 'crocs';
  const variantesActivas = ordenarPorTalla(variantes.filter(v => v.is_active));
  const tallasExistentes = variantes.map(v => v.size_label);

  // Para charms: stock se guarda en variant con size_label='unidad'
  const varianteUnidad = variantesActivas.find(v => v.size_label === 'unidad');

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Galería de imágenes */}
        {categoria && (
          <View style={s.galeriaWrapper}>
            <ImageGallery productId={productId} category={categoria} />
          </View>
        )}

        {/* Campos básicos */}
        <View style={s.grupo}>
          <Campo label="Nombre *" C={C}>
            <TextInput style={s.input} value={nombre} onChangeText={setNombre}
              placeholder="Nombre del producto" placeholderTextColor={C.textPlaceholder} />
          </Campo>
          <Campo label="Descripción" C={C}>
            <TextInput style={[s.input, s.inputMultilinea]} value={descripcion} onChangeText={setDescripcion}
              placeholder="Descripción opcional" placeholderTextColor={C.textPlaceholder} multiline numberOfLines={3} />
          </Campo>
        </View>

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
        <View style={s.seccionTitulo}><Text style={s.seccionLabel}>Visibilidad</Text></View>
        <View style={s.togglesGrupo}>
          <ToggleFila label="Activo / visible en tienda" value={isActive} onToggle={setIsActive} C={C} />
          <ToggleFila label="Marcar como nuevo" value={isNew} onToggle={setIsNew} C={C} />
          <ToggleFila label="Marcar como popular" value={isHot} onToggle={setIsHot} C={C} />
        </View>

        {/* === CROCS: stock por talla === */}
        {esCrocs && variantesActivas.length > 0 && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionLabel}>Stock por talla</Text>
              <Pressable
                onPress={() => navigation.navigate('StockHistory', { productId, productName: nombre })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                // @ts-ignore
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}
              >
                <Text style={s.seccionLink}>Ver historial →</Text>
              </Pressable>
            </View>
            <View style={s.variantesGrupo}>
              {variantesActivas.map(v => (
                <VarianteStockRow
                  key={v.id} v={v} productId={productId}
                  onVenta={nuevo => setVariantes(prev => prev.map(p => p.id === v.id ? { ...p, stock: nuevo } : p))}
                  onAlmacen={nuevo => setVariantes(prev => prev.map(p => p.id === v.id ? { ...p, stock_almacen: nuevo } : p))}
                  onMover={() => moverAVenta(v)}
                  s={s} C={C}
                />
              ))}
            </View>
          </>
        )}

        {/* === CROCS: agregar tallas faltantes === */}
        {esCrocs && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionLabel}>{variantesActivas.length === 0 ? 'Agregar tallas' : 'Agregar tallas faltantes'}</Text>
            </View>
            <View style={s.sizePickerWrapper}>
              <SizePicker tallasExistentes={tallasExistentes} onChange={setTallasPendientes} />
            </View>
            {tallasPendientes.length > 0 && (
              <Pressable
                style={({ pressed }) => [s.botonAgregarTallas, pressed && { opacity: 0.7 }, guardandoTallas && { opacity: 0.4 }]}
                onPress={agregarTallas} disabled={guardandoTallas}
              >
                {guardandoTallas ? <ActivityIndicator color={C.accentFg} />
                  : <Text style={s.botonTexto}>Agregar {tallasPendientes.length} talla{tallasPendientes.length !== 1 ? 's' : ''}</Text>}
              </Pressable>
            )}
          </>
        )}

        {/* === CHARMS: piezas únicas y stock de la colección === */}
        {esCharms && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionLabel}>Stock de la colección</Text>
              <Pressable
                onPress={() => navigation.navigate('StockHistory', { productId, productName: nombre })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                // @ts-ignore
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}
              >
                <Text style={s.seccionLink}>Ver historial →</Text>
              </Pressable>
            </View>
            {varianteUnidad ? (
              <View style={s.stockSimpleRow}>
                <Text style={s.stockSimpleLabel}>Unidades disponibles</Text>
                <StockControl
                  varianteId={varianteUnidad.id}
                  productId={productId}
                  stockInicial={varianteUnidad.stock}
                  onCambio={nuevo => setVariantes(prev => prev.map(p => p.id === varianteUnidad.id ? { ...p, stock: nuevo } : p))}
                />
              </View>
            ) : (
              <View style={s.stockSimpleRow}>
                <Text style={s.stockSimpleLabel}>Sin stock registrado</Text>
                <Pressable style={s.botonAgregarStock} onPress={async () => {
                  const { data } = await supabase.from('product_variants')
                    .insert({ product_id: productId, size_label: 'unidad', stock: 0 }).select().single();
                  if (data) setVariantes(prev => [...prev, data]);
                }}>
                  <Text style={s.botonAgregarStockTexto}>+ Agregar stock</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {/* === OTROS: variantes libres === */}
        {categoria === 'otros' && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionLabel}>Variantes / stock</Text>
              {variantesActivas.length > 0 && (
                <Pressable
                  onPress={() => navigation.navigate('StockHistory', { productId, productName: nombre })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  // @ts-ignore
                  style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}
                >
                  <Text style={s.seccionLink}>Ver historial →</Text>
                </Pressable>
              )}
            </View>
            {variantesActivas.length > 0 && (
              <View style={s.variantesGrupo}>
                {variantesActivas.map(v => (
                  <VarianteStockRow
                    key={v.id} v={v} productId={productId}
                    onVenta={nuevo => setVariantes(prev => prev.map(p => p.id === v.id ? { ...p, stock: nuevo } : p))}
                    onAlmacen={nuevo => setVariantes(prev => prev.map(p => p.id === v.id ? { ...p, stock_almacen: nuevo } : p))}
                    onMover={() => moverAVenta(v)}
                    s={s} C={C}
                  />
                ))}
              </View>
            )}
            <AgregarVarianteOtros productId={productId} onAgregada={v => setVariantes(prev => [...prev, v])} C={C} s={s} />
          </>
        )}

        {/* Guardar */}
        <Pressable
          style={({ pressed }) => [s.botonGuardar, guardando && s.botonDesactivado, pressed && { opacity: 0.8 }]}
          onPress={guardar} disabled={guardando}
        >
          {guardando ? <ActivityIndicator color={C.accentFg} /> : <Text style={s.botonTexto}>Guardar cambios</Text>}
        </Pressable>

        {/* Eliminar */}
        <Pressable
          style={({ pressed }) => [s.botonEliminar, pressed && { opacity: 0.7 }]}
          onPress={() => producto && confirmarEliminar(producto.id)}
        >
          <Text style={s.botonEliminarTexto}>Eliminar producto</Text>
        </Pressable>

      </ScrollView>

      <Toast mensaje={toast.mensaje} tipo={toast.tipo} />
    </SafeAreaView>
  );
}

function AgregarVarianteOtros({ productId, onAgregada, C, s }: { productId: string; onAgregada: (v: any) => void; C: Colors; s: any }) {
  const [label, setLabel] = useState('');
  const [stock, setStock] = useState('0');
  const [guardando, setGuardando] = useState(false);

  async function agregar() {
    if (!label.trim()) return;
    setGuardando(true);
    const { data } = await supabase.from('product_variants')
      .insert({ product_id: productId, size_label: label.trim(), stock: parseInt(stock, 10) || 0 })
      .select().single();
    setGuardando(false);
    if (data) { onAgregada(data); setLabel(''); setStock('0'); }
  }

  return (
    <View style={s.agregarTallaContainer}>
      <TextInput style={[s.input, s.inputTalla]} value={label} onChangeText={setLabel}
        placeholder="Color, talla, tipo..." placeholderTextColor={C.textPlaceholder}
        returnKeyType="done" onSubmitEditing={agregar} />
      <TextInput style={[s.input, s.inputStock]} value={stock} onChangeText={setStock}
        keyboardType="number-pad" placeholder="0" placeholderTextColor={C.textPlaceholder} selectTextOnFocus />
      <Pressable
        style={({ pressed }) => [s.botonAgregarTalla, !label.trim() && s.botonDesactivado, pressed && { opacity: 0.7 }]}
        onPress={agregar} disabled={!label.trim() || guardando}
      >
        {guardando ? <ActivityIndicator color={C.accentFg} size="small" /> : <Text style={s.botonAgregarTallaTexto}>+</Text>}
      </Pressable>
    </View>
  );
}

// Fila de stock por talla: muestra Venta (piso), Almacén (bodega), el total y un botón
// para pasar piezas de almacén a venta.
function VarianteStockRow({ v, productId, onVenta, onAlmacen, onMover, s, C }: {
  v: ProductVariant; productId: string;
  onVenta: (n: number) => void; onAlmacen: (n: number) => void; onMover: () => void;
  s: any; C: Colors;
}) {
  const enAlmacen = v.stock_almacen ?? 0;
  const total = v.stock + enAlmacen;
  return (
    <View style={s.varianteCard}>
      <View style={s.varianteHeader}>
        <TallaLabel sizeLabel={v.size_label} s={s} C={C} />
        <View style={s.totalBadge}>
          <Text style={s.totalBadgeNum}>{total}</Text>
          <Text style={s.totalBadgeLbl}>total</Text>
        </View>
      </View>

      <View style={s.stockLinea}>
        <Text style={s.stockLineaLbl}>💰 Venta</Text>
        <StockControl varianteId={v.id} productId={productId} stockInicial={v.stock}
          columna="stock" modo="venta" onCambio={onVenta} />
      </View>

      <View style={s.stockLinea}>
        <View style={s.almacenLblWrap}>
          <Text style={s.stockLineaLbl}>📦 Almacén</Text>
          <Pressable
            onPress={onMover}
            disabled={enAlmacen === 0}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={({ pressed }) => [s.moverBtn, enAlmacen === 0 && s.moverBtnOff, pressed && { opacity: 0.7 }]}
          >
            <Text style={[s.moverBtnTxt, enAlmacen === 0 && s.moverBtnTxtOff]}>→ a venta</Text>
          </Pressable>
        </View>
        <StockControl varianteId={v.id} productId={productId} stockInicial={enAlmacen}
          columna="stock_almacen" modo="almacen" onCambio={onAlmacen} />
      </View>
    </View>
  );
}

// Muestra la talla mexicana (cm) como dato principal y la numeración Crocs como referencia.
// Para variantes que no son tallas Crocs (categoría "otros"), muestra la etiqueta tal cual.
function TallaLabel({ sizeLabel, s, C }: { sizeLabel: string; s: any; C: Colors }) {
  const mx = tallaMX(sizeLabel);
  if (!mx) return <Text style={s.varianteTalla}>{sizeLabel}</Text>;
  return (
    <View>
      <Text style={s.varianteTallaMX}>{mx}</Text>
      <Text style={s.varianteTallaCrocs}>Crocs {sizeLabel}</Text>
    </View>
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
    centrado: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
    scroll: { paddingBottom: 64 },

    galeriaWrapper: { borderBottomWidth: 1, borderBottomColor: C.border },

    grupo: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
    grupoFila: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
    input: { borderWidth: 1, borderColor: C.borderInput, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: C.text, minHeight: 44, backgroundColor: C.bg },
    inputMultilinea: { height: 88, textAlignVertical: 'top' },

    seccionTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 4 },
    seccionLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    seccionLink: { fontSize: 12, color: C.textMuted, fontWeight: '500' },

    togglesGrupo: { borderTopWidth: 1, borderTopColor: C.border },

    variantesGrupo: { borderTopWidth: 1, borderTopColor: C.border },
    varianteFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, minHeight: 60 },
    varianteTalla: { fontSize: 15, color: C.text },
    varianteTallaMX: { fontSize: 16, fontWeight: '600', color: C.text },
    varianteTallaCrocs: { fontSize: 12, color: C.textMuted, marginTop: 1 },

    // Tarjeta de stock por talla (venta + almacén + total)
    varianteCard: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
    varianteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 4, backgroundColor: C.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    totalBadgeNum: { fontSize: 16, fontWeight: '700', color: C.text },
    totalBadgeLbl: { fontSize: 11, color: C.textMuted },
    stockLinea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
    stockLineaLbl: { fontSize: 14, color: C.text },
    almacenLblWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    moverBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: C.accent, backgroundColor: C.surface },
    moverBtnOff: { borderColor: C.border, backgroundColor: 'transparent' },
    moverBtnTxt: { fontSize: 12, fontWeight: '600', color: C.accent },
    moverBtnTxtOff: { color: C.textPlaceholder },

    stockSimpleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border },
    stockSimpleLabel: { fontSize: 15, color: C.text },
    botonAgregarStock: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.borderInput },
    botonAgregarStockTexto: { fontSize: 13, fontWeight: '600', color: C.textMuted },

    sizePickerWrapper: { paddingHorizontal: 20, paddingTop: 12 },

    agregarTallaContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 8, alignItems: 'center' },
    inputTalla: { flex: 1 },
    inputStock: { width: 64, textAlign: 'center' },
    botonAgregarTalla: { backgroundColor: C.accent, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    botonAgregarTallaTexto: { color: C.accentFg, fontSize: 24, lineHeight: 28 },

    botonAgregarTallas: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.accent, paddingVertical: 14, alignItems: 'center', minHeight: 52 },
    botonGuardar: { marginHorizontal: 20, marginTop: 24, backgroundColor: C.accent, paddingVertical: 16, alignItems: 'center', minHeight: 52 },
    botonDesactivado: { opacity: 0.4 },
    botonTexto: { color: C.accentFg, fontSize: 16, fontWeight: '600' },
    botonEliminar: { marginHorizontal: 20, marginTop: 12, paddingVertical: 16, alignItems: 'center', minHeight: 52, borderWidth: 1.5, borderColor: C.danger },
    botonEliminarTexto: { color: C.danger, fontSize: 16, fontWeight: '600' },
  });
}
