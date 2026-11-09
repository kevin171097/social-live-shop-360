import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from './supabase';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    setMessage('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || password.length < 8) {
      setMessage('Ingresá un email válido y una contraseña de al menos 8 caracteres.');
      return;
    }
    if (!supabase) {
      setMessage('Falta configurar Supabase en la compilación de la aplicación.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { display_name: displayName.trim() || cleanEmail.split('@')[0] } }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Cuenta creada. Revisá tu correo para confirmar la dirección y después iniciá sesión.');
          setMode('login');
          return;
        }
        await ensureProfile(data.user, displayName.trim());
        onAuthenticated?.(data.session);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        await ensureProfile(data.user, data.user.user_metadata?.display_name || '');
        onAuthenticated?.(data.session);
      }
    } catch (error) {
      setMessage(error.message || 'No se pudo completar el acceso.');
    } finally {
      setBusy(false);
    }
  }

  async function ensureProfile(user, name) {
    const { data: profile, error: readError } = await supabase
      .from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (readError) throw readError;
    if (!profile) {
      const base = (user.email || 'usuario').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 18) || 'usuario';
      const username = `${base}_${user.id.slice(0, 6)}`;
      const { error } = await supabase.from('profiles').insert({
        id: user.id,
        username,
        display_name: name || user.user_metadata?.display_name || base,
        role: 'buyer'
      });
      if (error) throw error;
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.mark}><Text style={s.markText}>KD</Text></View>
          <Text style={s.brand}>KD.<Text style={s.bold}>LIVE</Text></Text>
          <Text style={s.title}>{mode === 'login' ? 'Qué bueno verte.' : 'Creá tu cuenta.'}</Text>
          <Text style={s.subtitle}>Entrá para descubrir creadores, comprar y transmitir.</Text>
          {mode === 'signup' && <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Cómo te llamás" placeholderTextColor="#77778A" style={s.input} autoCapitalize="words" />}
          <TextInput value={email} onChangeText={setEmail} placeholder="Correo electrónico" placeholderTextColor="#77778A" style={s.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Contraseña (mínimo 8 caracteres)" placeholderTextColor="#77778A" style={s.input} secureTextEntry autoCapitalize="none" />
          {!!message && <Text style={s.message}>{message}</Text>}
          <TouchableOpacity disabled={busy} onPress={submit} style={[s.submit, busy && s.disabled]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} style={s.switch}>
            <Text style={s.switchText}>{mode === 'login' ? '¿No tenés cuenta? Crear una' : 'Ya tengo cuenta · Iniciar sesión'}</Text>
          </TouchableOpacity>
          <Text style={s.foot}>Tu cuenta se protege con autenticación de Supabase.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#090910' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 40 },
  mark: { width: 54, height: 54, borderRadius: 17, backgroundColor: '#FF397F', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  markText: { color: '#fff', fontWeight: '900', fontSize: 19 },
  brand: { color: '#fff', fontSize: 18, letterSpacing: 1.4, fontWeight: '600' },
  bold: { fontWeight: '900' },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 38 },
  subtitle: { color: '#9B9BAF', fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 25 },
  input: { backgroundColor: '#151520', color: '#fff', borderColor: '#303041', borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 15, fontSize: 14, marginBottom: 12 },
  message: { color: '#FFD0DF', backgroundColor: '#3A1C2A', borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 18, marginVertical: 7 },
  submit: { backgroundColor: '#FF397F', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 9 },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
  switch: { alignItems: 'center', padding: 18 },
  switchText: { color: '#FF83B0', fontWeight: '800', fontSize: 13 },
  foot: { color: '#666678', textAlign: 'center', fontSize: 10, marginTop: 14 }
});
