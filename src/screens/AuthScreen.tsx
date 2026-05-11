import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion() {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setCargando(false);

    if (error) {
      Alert.alert('Error', 'Correo o contraseña incorrectos.');
    }
    // Si no hay error, el listener en App.tsx detecta el cambio de sesión automáticamente
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.titulo}>Inventario</Text>
          <Text style={styles.subtitulo}>Crocs Monterrey</Text>
        </View>

        <View style={styles.formulario}>
          <View style={styles.campo}>
            <Text style={styles.label}>Correo</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#CCCCCC"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#CCCCCC"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.boton, cargando && styles.botonDesactivado]}
            onPress={iniciarSesion}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botonTexto}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  header: { marginBottom: 48 },
  titulo: { fontSize: 32, fontWeight: '600', color: '#000000', letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, fontWeight: '400', color: '#888888', marginTop: 4 },
  formulario: { gap: 16 },
  campo: {},
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
    padding: 14,
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
  },
  boton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  botonDesactivado: { opacity: 0.5 },
  botonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
