import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// En web centra el contenido y limita el ancho para que no se vea estirado en desktop
export default function WebContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return <View style={styles.wrapper}><View style={styles.inner}>{children}</View></View>;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center' },
  inner: { flex: 1, width: '100%', maxWidth: 520 },
});
