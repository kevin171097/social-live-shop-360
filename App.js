import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, TextInput, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { styles } from './src/styles';
import { supabase, supabaseConfigured } from './src/supabase';
import AuthScreen from './src/AuthScreen';
import { registerGlobals } from '@livekit/react-native';
import LiveSession from './src/LiveSession';

registerGlobals();

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('Inicio');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [lives, setLives] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const [liveTitle, setLiveTitle] = useState('');

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || !session?.user?.id) return;
    setBusy(true);
    try {
      const [profileResult, productResult, liveResult] = await Promise.all([
        supabase.from('profiles').select('id,username,display_name,bio,avatar_url,role').eq('id', session.user.id).maybeSingle(),
        supabase.from('products').select('id,seller_id,title,description,price,currency,image_url,stock,status').eq('status', 'active').order('created_at', { ascending: false }).limit(40),
        supabase.from('live_sessions').select('id,seller_id,title,category,status,started_at,profiles(display_name,username)').eq('status', 'live').order('started_at', { ascending: false }).limit(30)
      ]);
      if (profileResult.error) throw profileResult.error;
      if (productResult.error) throw productResult.error;
      if (liveResult.error) throw liveResult.error;
      setProfile(profileResult.data);
      setProducts((productResult.data || []).map(p => ({
        id: p.id, name: p.title, price: new Intl.NumberFormat('es-UY', { style: 'currency', currency: p.currency || 'UYU', maximumFractionDigits: 0 }).format(Number(p.price)),
        emoji: '🛍️', color: '#59466d', description: p.description, image_url: p.image_url, stock: p.stock
      })));
      setLives(liveResult.data || []);
    } catch (error) {
      setNotice(error.message || 'No se pudieron cargar los datos.');
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 5000);
  }

  async function enterLive(item, mode) {
    if (!session || !API_URL) {
      showNotice('Falta iniciar sesión o configurar la dirección segura del servidor LIVE.');
      return false;
    }
    try {
      setBusy(true);
      const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/live/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ sessionId: item.id })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo conectar al LIVE.');
      if (!payload.token || !payload.serverUrl || payload.role !== mode) {
        throw new Error('El servidor devolvió datos de conexión incompletos o un permiso inesperado.');
      }
      setLiveSession({ token: payload.token, serverUrl: payload.serverUrl, mode: payload.role, sessionId: item.id });
      return true;
    } catch (error) {
      showNotice(error.message || 'Error al entrar al LIVE.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function startLive() {
    if (!supabase || !session || !profile) return showNotice('Iniciá sesión para transmitir.');
    if (!['seller', 'admin'].includes(profile.role)) return showNotice('Tu cuenta todavía no tiene permiso de vendedor. La aprobación debe realizarla un administrador.');
    if (!API_URL) return showNotice('Falta configurar el servidor de transmisiones.');
    const title = liveTitle.trim();
    if (title.length < 4) return showNotice('Escribí un título de al menos 4 caracteres.');
    try {
      setBusy(true);
      const { data: created, error } = await supabase.from('live_sessions').insert({
        seller_id: session.user.id, title, category: 'general', status: 'live', stream_provider: 'livekit', started_at: new Date().toISOString()
      }).select('id,seller_id,title,status').single();
      if (error) throw error;
      const connected = await enterLive(created, 'host');
      if (!connected) {
        const { error: cleanupError } = await supabase
          .from('live_sessions')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', created.id);
        if (cleanupError) {
          showNotice('No se pudo conectar y tampoco limpiar el estado de la transmisión. Revisá la sesión desde el panel de administración.');
        }
        await loadData();
        return;
      }
      setLiveTitle('');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo iniciar la transmisión.');
    } finally {
      setBusy(false);
    }
  }

  async function closeLive() {
    const current = liveSession;
    setLiveSession(null);
    if (current?.mode === 'host' && supabase) {
      const { error } = await supabase.from('live_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', current.sessionId);
      if (error) showNotice('La transmisión terminó, pero no se pudo actualizar su estado en la base de datos.');
    }
    loadData();
  }

  if (supabaseConfigured && !session) return <AuthScreen onAuthenticated={setSession} />;

  const visibleProducts = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  const demoMode = !supabaseConfigured;

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#101018" />
      <View style={styles.header}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>KD</Text></View>
        <Text style={styles.brand}>KD.<Text style={styles.brandBold}>LIVE</Text></Text>
        <TouchableOpacity onPress={signOut} style={styles.avatar}><Text>↪</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>COMPRÁ · VENDÉ · CONECTÁ</Text>
        <Text style={styles.hero}>Lo que buscás,{"\n"}<Text style={styles.heroAccent}>está en vivo.</Text></Text>
        <View style={styles.tabs}>
          {['Inicio', 'En vivo', 'Tienda'].map(item => (
            <TouchableOpacity key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}>
              <Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {busy && <ActivityIndicator color="#FF397F" style={{ margin: 12 }} />}
        {tab === 'Inicio' && <>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Creadores en vivo</Text><Text style={styles.muted}>{lives.length} activos</Text></View>
          {lives.length ? lives.map(item => <TouchableOpacity key={item.id} onPress={() => enterLive(item, 'viewer')} style={[styles.liveCard, { backgroundColor: '#693d6e' }]}>
            <Text style={styles.livePill}>● EN DIRECTO</Text><Text style={styles.liveArtwork}>KD.LIVE</Text>
            <Text style={styles.seller}>{item.title}</Text><Text style={styles.muted}>{item.profiles?.display_name || 'Vendedor'}</Text>
          </TouchableOpacity>) : <Text style={styles.notice}>{demoMode ? 'Configuración pendiente: conectaremos las salas reales.' : 'Todavía no hay transmisiones activas. ¡Podés ser de los primeros!'}</Text>}
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Productos</Text><Text style={styles.muted}>{products.length} publicados</Text></View>
          {products.slice(0, 8).map(p => <Product key={p.id} product={p} onPress={() => showNotice('Detalle de producto: próxima etapa de conexión de compras.')} />)}
          {!products.length && <Text style={styles.muted}>Todavía no hay productos publicados.</Text>}
        </>}
        {tab === 'En vivo' && <>
          <Text style={styles.sectionTitle}>Transmisiones activas</Text>
          {lives.map(item => <TouchableOpacity key={item.id} onPress={() => enterLive(item, 'viewer')} style={styles.secondaryButton}><Text style={styles.buttonText}>▶ {item.title} · Entrar</Text></TouchableOpacity>)}
          {!lives.length && <Text style={styles.notice}>No hay LIVE activos en este momento.</Text>}
          <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Transmitir</Text>
          <Text style={styles.muted}>Disponible para cuentas aprobadas como vendedor.</Text>
          <TextInput value={liveTitle} onChangeText={setLiveTitle} placeholder="¿De qué será tu LIVE?" placeholderTextColor="#9999aa" style={styles.search} maxLength={80} />
          <TouchableOpacity onPress={startLive} disabled={busy} style={styles.primaryButton}><Text style={styles.buttonText}>● Iniciar mi LIVE real</Text></TouchableOpacity>
        </>}
        {tab === 'Tienda' && <>
          <Text style={styles.sectionTitle}>Tienda</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Buscar productos..." placeholderTextColor="#9999aa" style={styles.search} />
          {visibleProducts.map(p => <Product key={p.id} product={p} onPress={() => showNotice('El detalle y la compra segura se conectarán en la siguiente etapa.')} />)}
          {!visibleProducts.length && <Text style={styles.muted}>No hay productos para mostrar.</Text>}
        </>}
        {tab === 'Perfil' && <>
          <Text style={styles.sectionTitle}>Mi perfil</Text>
          <Text style={styles.heroAccent}>{profile?.display_name || session?.user?.email || 'Invitado'}</Text>
          <Text style={styles.muted}>@{profile?.username || 'usuario'}</Text>
          <Text style={styles.notice}>Tipo de cuenta: {profile?.role || 'sin configurar'}</Text>
          <TouchableOpacity onPress={signOut} style={styles.secondaryButton}><Text style={styles.buttonText}>Cerrar sesión</Text></TouchableOpacity>
        </>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        <Text style={styles.footer}>KD.LIVE · Desarrollo en curso</Text>
      </ScrollView>
      <View style={styles.bottom}>
        {['Inicio', 'En vivo', '＋', 'Tienda', 'Perfil'].map(item => (
          <TouchableOpacity key={item} onPress={() => item === '＋' ? setTab('En vivo') : setTab(item)} style={styles.bottomItem}>
            <Text style={[styles.bottomIcon, item === '＋' && styles.plus]}>{item === 'Inicio' ? '⌂' : item === 'En vivo' ? '◉' : item === 'Tienda' ? '▦' : item === 'Perfil' ? '♙' : item}</Text>
            {item !== '＋' && <Text style={styles.bottomLabel}>{item}</Text>}
          </TouchableOpacity>
        ))}
      </View>
      {!!liveSession && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 30 }}>
        <LiveSession {...liveSession} onClose={closeLive} />
      </View>}
      <Text style={styles.connection}>{supabaseConfigured ? 'Cuenta y base de datos conectadas' : 'Modo de configuración · falta Supabase'}</Text>
    </SafeAreaView>
  );
}

function Product({ product, onPress }) {
  return <TouchableOpacity style={styles.product} onPress={onPress}>
    <View style={[styles.productArt, { backgroundColor: product.color || '#59466d' }]}><Text style={styles.productEmoji}>{product.emoji || '🛍️'}</Text></View>
    <View style={styles.productInfo}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productPrice}>{product.price}</Text></View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>;
}
