import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export async function pickAndUploadImage(folder: string): Promise<string | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) return null;

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (resultado.canceled || !resultado.assets[0]) return null;

  const asset = resultado.assets[0];
  const nombreArchivo = `${folder}/${Date.now()}.jpg`;

  let uploadData: File | Blob;

  // En web, expo-image-picker expone el File object nativo del browser
  if (Platform.OS === 'web' && (asset as any).file) {
    uploadData = (asset as any).file;
  } else {
    const response = await fetch(asset.uri);
    uploadData = await response.blob();
  }

  const { error } = await supabase.storage
    .from('product-images')
    .upload(nombreArchivo, uploadData, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('Error subiendo imagen:', error.message);
    return null;
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(nombreArchivo);
  return data.publicUrl;
}
