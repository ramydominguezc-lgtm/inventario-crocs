import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { useColors } from '../theme';

interface Props {
  mensaje: string | null;
  tipo?: 'exito' | 'error' | 'info';
}

export default function Toast({ mensaje, tipo = 'exito' }: Props) {
  const C = useColors();
  const opacidad = useRef(new Animated.Value(0)).current;
  const traslacion = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!mensaje) return;
    opacidad.setValue(0);
    traslacion.setValue(20);
    Animated.parallel([
      Animated.timing(opacidad, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(traslacion, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [mensaje]);

  if (!mensaje) return null;

  const bgColor = tipo === 'exito' ? C.success : tipo === 'error' ? C.danger : C.accent;

  return (
    <Animated.View style={[
      styles.container,
      { backgroundColor: bgColor, opacity: opacidad, transform: [{ translateY: traslacion }] },
      // @ts-ignore
      Platform.OS === 'web' ? { position: 'fixed', bottom: 24, left: '50%', transform: [{ translateX: '-50%' }, { translateY: traslacion }] } : {},
    ]}>
      <Text style={styles.texto}>{mensaje}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 24, zIndex: 9999,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  texto: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

// Hook para manejar el toast con auto-dismiss
export function useToast() {
  const [mensaje, setMensaje] = React.useState<string | null>(null);
  const [tipo, setTipo] = React.useState<'exito' | 'error' | 'info'>('exito');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function mostrar(msg: string, t: 'exito' | 'error' | 'info' = 'exito', ms = 2200) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMensaje(msg);
    setTipo(t);
    timerRef.current = setTimeout(() => setMensaje(null), ms);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { mensaje, tipo, mostrar };
}
