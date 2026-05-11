import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://qknxebddhamuchhswkvt.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrbnhlYmRkaGFtdWNoaHN3a3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjk4NjMsImV4cCI6MjA4NTY0NTg2M30.Ci2SHoyuYUqMdkz85edFU_2ZB6NfI3CKY4SFxTc845w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
