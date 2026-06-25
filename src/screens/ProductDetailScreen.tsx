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
  // Qué stock se está viendo/editando: venta (piso) o almacén (bodega).
  const [vistaStock, setVistaStock] = useState<'venta' | 'almacen'>('venta');

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState('');
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
    setCosto(data.costo_promedio?.toString() ?? '');
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
      costo_promedio: costo ? parseFloat(costo) : null,
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

  // Registra un pedido (surtido): suma piezas por talla al almacén y recalcula el
  // costo promedio ponderado del producto según el stock que ya había.
  async function registrarPedido(cantidades: Record<string, number>, costoPedidoStr: string) {
    const costoPedido = parseFloat(costoPedidoStr);
    const entradas = Object.entries(cantidades).filter(([, q]) => q > 0);
    const piezasPedido = entradas.reduce((sum, [, q]) => sum + q, 0);
    if (piezasPedido <= 0) { toast.mostrar('Pon al menos una pieza', 'error'); return; }
    if (!costoPedidoStr || isNaN(costoPedido) || costoPedido < 0) { toast.mostrar('Costo inválido', 'error'); return; }

    const stockTotalActual = variantes.filter(v => v.is_active)
      .reduce((sum, v) => sum + v.stock + (v.stock_almacen ?? 0), 0);
    const costoActual = costo ? parseFloat(costo) : 0;
    const nuevoCosto = (stockTotalActual + piezasPedido) > 0
      ? (stockTotalActual * costoActual + piezasPedido * costoPedido) / (stockTotalActual + piezasPedido)
      : costoPedido;

    // Stock nuevo entra al almacén + se registra el movimiento por talla.
    for (const [variantId, qty] of entradas) {
      const v = variantes.find(x => x.id === variantId);
      if (!v) continue;
      const nuevoAlmacen = (v.stock_almacen ?? 0) + qty;
      await supabase.from('product_variants')
        .update({ stock_almacen: nuevoAlmacen, stock_updated_at: new Date().toISOString() })
        .eq('id', variantId);
      await supabase.from('stock_movements')
        .insert({ variant_id: variantId, product_id: productId, delta: qty, type: 'restock' });
    }
    await supabase.from('products')
      .update({ costo_promedio: nuevoCosto, updated_at: new Date().toISOString() })
      .eq('id', productId);

    setVariantes(prev => prev.map(v => cantidades[v.id] ? { ...v, stock_almacen: (v.stock_almacen ?? 0) + cantidades[v.id] } : v));
    setCosto(nuevoCosto.toFixed(2));
    toast.mostrar('✓ Pedido registrado', 'exito');
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
  const esOtros = categoria === 'otros';
  // Stock total del producto (venta + almacén) para valuación y ganancia.
  const totalProducto = variantesActivas.reduce((sum, v) => sum + v.stock + (v.stock_almacen ?? 0), 0);

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
            <VistaToggle vista={vistaStock} onChange={setVistaStock} s={s} C={C} />
            <View style={s.variantesGrupo}>
              {variantesActivas.map(v => (
                <VarianteStockRow
                  key={v.id} v={v} productId={productId} vista={vistaStock}
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
              <>
                <VistaToggle vista={vistaStock} onChange={setVistaStock} s={s} C={C} />
                <View style={s.variantesGrupo}>
                  {variantesActivas.map(v => (
                    <VarianteStockRow
                      key={v.id} v={v} productId={productId} vista={vistaStock}
                      onVenta={nuevo => setVariantes(prev => prev.map(p => p.id === v.id ? { ...p, stock: nuevo } : p))}
                      onAlmacen={nuevo => setVariantes(prev => prev.map(p => p.id === v.id ? { ...p, stock_almacen: nuevo } : p))}
                      onMover={() => moverAVenta(v)}
                      s={s} C={C}
                    />
                  ))}
                </View>
              </>
            )}
            <AgregarVarianteOtros productId={productId} onAgregada={v => setVariantes(prev => [...prev, v])} C={C} s={s} />
          </>
        )}

        {/* === Costos y ganancia (Crocs y Otros) === */}
        {(esCrocs || esOtros) && variantesActivas.length > 0 && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionLabel}>Costos y ganancia</Text>
            </View>
            <View style={s.grupo}>
              <Campo label="Costo promedio por pieza (MXN)" C={C}>
                <TextInput style={s.input} value={costo} onChangeText={setCosto}
                  keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textPlaceholder} />
              </Campo>
            </View>
            <CostosResumen precio={precio} costo={costo} total={totalProducto} s={s} C={C} />
            <RegistrarPedido variantes={variantesActivas} onConfirm={registrarPedido} s={s} C={C} />
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

// Toggle para alternar la vista de stock entre Venta (piso) y Almacén (bodega).
function VistaToggle({ vista, onChange, s, C }: {
  vista: 'venta' | 'almacen'; onChange: (v: 'venta' | 'almacen') => void; s: any; C: Colors;
}) {
  return (
    <View style={s.vistaToggle}>
      <Pressable
        onPress={() => onChange('venta')}
        style={({ pressed }) => [s.vistaBtn, vista === 'venta' && s.vistaBtnActivo, pressed && { opacity: 0.8 }]}
      >
        <Text style={[s.vistaBtnTxt, vista === 'venta' && s.vistaBtnTxtActivo]}>💰 Venta</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('almacen')}
        style={({ pressed }) => [s.vistaBtn, vista === 'almacen' && s.vistaBtnActivo, pressed && { opacity: 0.8 }]}
      >
        <Text style={[s.vistaBtnTxt, vista === 'almacen' && s.vistaBtnTxtActivo]}>📦 Almacén</Text>
      </Pressable>
    </View>
  );
}

// Fila compacta de stock por talla. Muestra UN solo control (venta o almacén según la
// vista activa) más el total. En vista almacén aparece el botón para pasar a venta.
function VarianteStockRow({ v, productId, vista, onVenta, onAlmacen, onMover, s, C }: {
  v: ProductVariant; productId: string; vista: 'venta' | 'almacen';
  onVenta: (n: number) => void; onAlmacen: (n: number) => void; onMover: () => void;
  s: any; C: Colors;
}) {
  const enAlmacen = v.stock_almacen ?? 0;
  const total = v.stock + enAlmacen;
  const esVenta = vista === 'venta';
  return (
    <View style={s.varianteFila}>
      <View style={s.varianteIzq}>
        <TallaLabel sizeLabel={v.size_label} s={s} C={C} />
        <Text style={s.totalInline}>{total} total</Text>
      </View>
      <View style={s.varianteDer}>
        {!esVenta && (
          <Pressable
            onPress={onMover}
            disabled={enAlmacen === 0}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={({ pressed }) => [s.moverBtn, enAlmacen === 0 && s.moverBtnOff, pressed && { opacity: 0.7 }]}
          >
            <Text style={[s.moverBtnTxt, enAlmacen === 0 && s.moverBtnTxtOff]}>→ a venta</Text>
          </Pressable>
        )}
        <StockControl
          key={vista}
          varianteId={v.id} productId={productId}
          stockInicial={esVenta ? v.stock : enAlmacen}
          columna={esVenta ? 'stock' : 'stock_almacen'}
          modo={esVenta ? 'venta' : 'almacen'}
          onCambio={esVenta ? onVenta : onAlmacen}
        />
      </View>
    </View>
  );
}

// Resumen de costo, valor del stock y ganancia potencial.
function CostosResumen({ precio, costo, total, s, C }: {
  precio: string; costo: string; total: number; s: any; C: Colors;
}) {
  const p = parseFloat(precio) || 0;
  const c = parseFloat(costo) || 0;
  const gananciaUnit = p - c;
  const valorCosto = c * total;
  const gananciaPot = gananciaUnit * total;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
  return (
    <View style={s.resumenGrupo}>
      <ResumenFila label="Ganancia por pieza" valor={fmt(gananciaUnit)} negativo={gananciaUnit < 0} s={s} C={C} />
      <ResumenFila label={`Valor del stock a costo (${total} pzs)`} valor={fmt(valorCosto)} s={s} C={C} />
      <ResumenFila label="Ganancia potencial total" valor={fmt(gananciaPot)} negativo={gananciaPot < 0} destacado s={s} C={C} />
    </View>
  );
}

function ResumenFila({ label, valor, negativo, destacado, s, C }: {
  label: string; valor: string; negativo?: boolean; destacado?: boolean; s: any; C: Colors;
}) {
  return (
    <View style={s.resumenFila}>
      <Text style={s.resumenLabel}>{label}</Text>
      <Text style={[s.resumenValor, destacado && s.resumenValorDestacado, negativo && { color: C.danger }]}>{valor}</Text>
    </View>
  );
}

// Formulario para registrar un pedido (surtido): piezas por talla + costo del pedido.
function RegistrarPedido({ variantes, onConfirm, s, C }: {
  variantes: ProductVariant[];
  onConfirm: (cantidades: Record<string, number>, costo: string) => Promise<void>;
  s: any; C: Colors;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [costoPedido, setCostoPedido] = useState('');
  const [guardando, setGuardando] = useState(false);

  const totalPiezas = Object.values(cantidades).reduce((sum, q) => sum + q, 0);

  function cambiar(id: string, delta: number) {
    setCantidades(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }
  function cerrar() { setAbierto(false); setCantidades({}); setCostoPedido(''); }
  async function confirmar() {
    setGuardando(true);
    await onConfirm(cantidades, costoPedido);
    setGuardando(false);
    cerrar();
  }

  if (!abierto) {
    return (
      <Pressable style={({ pressed }) => [s.pedidoBoton, pressed && { opacity: 0.8 }]} onPress={() => setAbierto(true)}>
        <Text style={s.pedidoBotonTexto}>📦 Registrar pedido (surtido)</Text>
      </Pressable>
    );
  }

  return (
    <View style={s.pedidoForm}>
      <Text style={s.pedidoTitulo}>Piezas que entran por talla</Text>
      {variantes.map(v => (
        <View key={v.id} style={s.pedidoFila}>
          <TallaLabel sizeLabel={v.size_label} s={s} C={C} />
          <View style={s.pedidoControl}>
            <Pressable style={({ pressed }) => [s.pedidoBtn, pressed && { opacity: 0.6 }]} onPress={() => cambiar(v.id, -1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
              <Text style={s.pedidoBtnTxt}>−</Text>
            </Pressable>
            <Text style={s.pedidoNum}>{cantidades[v.id] ?? 0}</Text>
            <Pressable style={({ pressed }) => [s.pedidoBtn, s.pedidoBtnMas, pressed && { opacity: 0.7 }]} onPress={() => cambiar(v.id, 1)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
              <Text style={s.pedidoBtnMasTxt}>+</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <View style={{ marginTop: 14 }}>
        <Text style={s.pedidoCostoLabel}>Costo por pieza de este pedido (MXN)</Text>
        <TextInput style={s.input} value={costoPedido} onChangeText={setCostoPedido}
          keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textPlaceholder} />
      </View>
      <View style={s.pedidoAcciones}>
        <Pressable style={({ pressed }) => [s.pedidoCancelar, pressed && { opacity: 0.7 }]} onPress={cerrar}>
          <Text style={s.pedidoCancelarTxt}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.pedidoConfirmar, (totalPiezas === 0 || !costoPedido || guardando) && s.botonDesactivado, pressed && { opacity: 0.8 }]}
          disabled={totalPiezas === 0 || !costoPedido || guardando}
          onPress={confirmar}
        >
          {guardando ? <ActivityIndicator color={C.accentFg} /> : <Text style={s.pedidoConfirmarTxt}>Registrar {totalPiezas} pza{totalPiezas !== 1 ? 's' : ''}</Text>}
        </Pressable>
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

    // Toggle Venta / Almacén
    vistaToggle: { flexDirection: 'row', marginHorizontal: 20, marginTop: 10, marginBottom: 4, backgroundColor: C.surface, borderRadius: 10, padding: 3 },
    vistaBtn: {
      flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8,
      // @ts-ignore
      cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    },
    vistaBtnActivo: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderInput },
    vistaBtnTxt: { fontSize: 13, fontWeight: '600', color: C.textMuted },
    vistaBtnTxtActivo: { color: C.text },

    // Fila compacta de talla
    varianteIzq: { flexDirection: 'column', gap: 1 },
    totalInline: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    varianteDer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    moverBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: C.accent, backgroundColor: C.surface },
    moverBtnOff: { borderColor: C.border, backgroundColor: 'transparent' },
    moverBtnTxt: { fontSize: 12, fontWeight: '600', color: C.accent },
    moverBtnTxtOff: { color: C.textPlaceholder },

    // Resumen de costos y ganancia
    resumenGrupo: { marginHorizontal: 20, marginTop: 12, borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden' },
    resumenFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    resumenLabel: { fontSize: 13, color: C.textSub, flex: 1, marginRight: 12 },
    resumenValor: { fontSize: 15, fontWeight: '600', color: C.text },
    resumenValorDestacado: { fontSize: 17, fontWeight: '700', color: C.accent },

    // Registrar pedido (surtido)
    pedidoBoton: { marginHorizontal: 20, marginTop: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.accent, borderRadius: 10, minHeight: 52, justifyContent: 'center' },
    pedidoBotonTexto: { fontSize: 15, fontWeight: '600', color: C.accent },
    pedidoForm: { marginHorizontal: 20, marginTop: 14, padding: 14, borderWidth: 1, borderColor: C.borderInput, borderRadius: 10, backgroundColor: C.surface },
    pedidoTitulo: { fontSize: 12, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
    pedidoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, minHeight: 52 },
    pedidoControl: { flexDirection: 'row', alignItems: 'center' },
    pedidoBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderInput },
    pedidoBtnTxt: { fontSize: 20, color: C.text, lineHeight: 22 },
    pedidoBtnMas: { backgroundColor: C.accent, borderColor: C.accent },
    pedidoBtnMasTxt: { fontSize: 20, color: C.accentFg, lineHeight: 22 },
    pedidoNum: { width: 48, textAlign: 'center', fontSize: 16, fontWeight: '600', color: C.text },
    pedidoCostoLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
    pedidoAcciones: { flexDirection: 'row', gap: 10, marginTop: 16 },
    pedidoCancelar: { flex: 1, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.borderInput, borderRadius: 8, minHeight: 48, justifyContent: 'center' },
    pedidoCancelarTxt: { fontSize: 15, fontWeight: '600', color: C.textMuted },
    pedidoConfirmar: { flex: 2, paddingVertical: 14, alignItems: 'center', backgroundColor: C.accent, borderRadius: 8, minHeight: 48, justifyContent: 'center' },
    pedidoConfirmarTxt: { fontSize: 15, fontWeight: '600', color: C.accentFg },

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
