import { createClient } from '@supabase/supabase-js';

// La publishable key es pública y está diseñada para usarse en el cliente.
// Se priorizan variables de entorno para permitir cambiar el proyecto sin editar código.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://woiadoflrlkzywvasmqd.supabase.co';
const publishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabaseConfigured = Boolean(url && publishableKey);
export const supabase = supabaseConfigured ? createClient(url, publishableKey) : null;

// Nunca incluir una clave secret ni service_role en una aplicación móvil.
