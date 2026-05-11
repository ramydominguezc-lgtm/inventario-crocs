import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ThemeProvider } from './src/context/ThemeContext';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { RootStackParamList } from './src/types';
import { useColors } from './src/theme';
import { useTheme } from './src/context/ThemeContext';
import AuthScreen from './src/screens/AuthScreen';
import LandingScreen from './src/screens/LandingScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import AddProductScreen from './src/screens/AddProductScreen';
import StockHistoryScreen from './src/screens/StockHistoryScreen';
import WebContainer from './src/components/WebContainer';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const C = useColors();
  const { resolved: scheme } = useTheme();

  const navTheme: Theme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: C.bg,
      card: C.bg,
      text: C.text,
      border: C.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerTitleStyle: { fontWeight: '600', fontSize: 17, color: C.text },
          headerShadowVisible: false,
          headerBackTitle: 'Atrás',
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: '' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Editar producto' }} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Nuevo producto' }} />
        <Stack.Screen name="StockHistory" component={StockHistoryScreen}
          options={({ route }) => ({ title: route.params.productName })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const C = useColors();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!session) {
    return <ThemeProvider><WebContainer><AuthScreen /></WebContainer></ThemeProvider>;
  }

  return <ThemeProvider><WebContainer><AppNavigator /></WebContainer></ThemeProvider>;
}
