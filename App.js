import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, TextInput, StatusBar } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { styles } from './src/styles';
import { supabaseConfigured } from './src/supabase';
import { registerGlobals } from '@livekit/react-native';
import LiveSession from './src/LiveSession';

registerGlobals();

const lives = [
  { seller: 'Moda Urbana Uy', category: 'Ropa · Montevideo', viewers: '248', tag: 'NUEVA COLECCIÓN', color: '#693d6e' },
  { seller: 'Street Kicks', category: 'Calzado', viewers: '96', tag: 'SNEAKERS DROP', color: '#36445d' },
];
const products = [
  { name: 'Campera urbana', price: '$ 1.490', emoji: '🧥', color: '#59466d' },
  { name: 'Championes casual', price: '$ 2.500', emoji: '👟', color: '#435e75' },
  { name: 'Remera básica', price: '$ 890', emoji: '👕', color: '#85566d' },
];

export default function App() {
  const [tab, setTab] = useState('Inicio');
  const [query, setQuery] = useState('');
  const [selectedLive, setSelectedLive] = useState(null);
  const [notice, setNotice] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('front');
  const [liveSession, setLiveSession] = useState(null);
  const visibleProducts = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  async function startCameraLive() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    if (!micPermission?.granted) {
      const result = await requestMicPermission();
      if (!result.granted) return;
    }
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      setNotice('Falta configurar el servidor KD.LIVE. La vista de cámara no es una transmisión.');
      return;
    }
    try {
      const roomName = 'kdlive_' + Date.now();
      const identity = 'seller_' + Date.now();
      const response = await fetch(apiUrl + '/api/live/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, identity, role: 'host' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo iniciar el LIVE.');
      setLiveSession({ token: data.token, serverUrl: data.serverUrl, mode: 'host' });
    } catch (error) {
      setNotice(error.message || 'No se pudo conectar con el servidor.');
    }
  }

  function comingSoon(label) {
    setNotice(`${label}: esta función se conectará en la próxima etapa.`);
    setTimeout(() => setNotice(''), 3000);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#101018" />
      <View style={styles.header}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>KD</Text></View>
        <Text style={styles.brand}>KD.<Text style={styles.brandBold}>LIVE</Text></Text>
        <TouchableOpacity onPress={() => comingSoon('Perfil')} style={styles.avatar}><Text>👤</Text></TouchableOpacity>
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
        {tab === 'Inicio' && <>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>En vivo ahora</Text><Text style={styles.muted}>Descubrí vendedores</Text></View>
          {lives.map(live => (
            <TouchableOpacity key={live.seller} onPress={() => setSelectedLive(live)} style={[styles.liveCard, { backgroundColor: live.color }]}>
              <Text style={styles.livePill}>● EN VIVO</Text><Text style={styles.viewers}>👁 {live.viewers}</Text>
              <Text style={styles.liveArtwork}>{live.tag}</Text><Text style={styles.seller}>{live.seller}</Text><Text style={styles.muted}>{live.category}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Para descubrir</Text><Text style={styles.muted}>Productos</Text></View>
          {products.map(p => <Product key={p.name} product={p} onPress={() => comingSoon('Compra')} />)}
        </>}
        {tab === 'En vivo' && <>
          <Text style={styles.sectionTitle}>Transmisiones en vivo</Text>
          <Text style={styles.notice}>La transmisión real usa LiveKit. Requiere el servidor configurado y una compilación nativa; Expo Go no es compatible.</Text>
          {lives.map(live => <TouchableOpacity key={live.seller} onPress={() => setSelectedLive(live)} style={styles.secondaryButton}><Text style={styles.buttonText}>Ver demo · {live.seller}</Text></TouchableOpacity>)}
          <TouchableOpacity onPress={startCameraLive} style={styles.primaryButton}><Text style={styles.buttonText}>＋ Preparar mi LIVE</Text></TouchableOpacity>
        </>}
        {tab === 'Tienda' && <>
          <Text style={styles.sectionTitle}>Marketplace</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Buscar ropa, calzado..." placeholderTextColor="#9999aa" style={styles.search} />
          {visibleProducts.map(p => <Product key={p.name} product={p} onPress={() => comingSoon('Compra')} />)}
          {visibleProducts.length === 0 && <Text style={styles.muted}>No encontramos productos con esa búsqueda.</Text>}
        </>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        <Text style={styles.footer}>KD.LIVE · Desarrollo en curso</Text>
      </ScrollView>
      <View style={styles.bottom}>
        {['Inicio', 'En vivo', '＋', 'Tienda', 'Perfil'].map(item => (
          <TouchableOpacity key={item} onPress={() => item === '＋' ? comingSoon('Crear publicación') : item === 'Perfil' ? comingSoon('Perfil') : setTab(item)} style={styles.bottomItem}>
            <Text style={[styles.bottomIcon, item === '＋' && styles.plus]}>{item === 'Inicio' ? '⌂' : item === 'En vivo' ? '◉' : item === 'Tienda' ? '▦' : item === 'Perfil' ? '♙' : item}</Text>
            {item !== '＋' && <Text style={styles.bottomLabel}>{item}</Text>}
          </TouchableOpacity>
        ))}
      </View>
      {selectedLive && <View style={styles.modalShade}>
        <View style={styles.modal}>
          <View style={styles.modalHead}><Text style={styles.modalTitle}>LIVE · DEMOSTRACIÓN</Text><TouchableOpacity onPress={() => setSelectedLive(null)}><Text style={styles.close}>✕</Text></TouchableOpacity></View>
          <View style={[styles.videoPlaceholder, { backgroundColor: selectedLive.color }]}>
            <Text style={styles.videoTitle}>KD.LIVE{"\n"}<Text style={styles.videoStrong}>SHOP 360</Text></Text>
            <Text style={styles.videoCaption}>Acá aparecerá la transmisión real del vendedor.</Text>
          </View>
          <Text style={styles.seller}>{selectedLive.seller}</Text><Text style={styles.muted}>Preguntá por talles, colores y envíos.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => { setSelectedLive(null); comingSoon('Consulta de producto'); }}><Text style={styles.buttonText}>Consultar producto de ejemplo</Text></TouchableOpacity>
          <Text style={styles.smallNote}>Video, chat y pagos reales aún no están conectados.</Text>
        </View>
      </View>}
      {liveSession && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 30 }}><LiveSession {...liveSession} onClose={() => setLiveSession(null)} /></View>}\n      {showCamera && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 20, backgroundColor: '#000', padding: 14, paddingTop: 42 }}>
        <CameraView style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }} facing={cameraFacing} />
        <View style={{ position: 'absolute', top: 52, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', backgroundColor: '#d82e69', padding: 8, borderRadius: 8, fontWeight: '900' }}>● CÁMARA LISTA</Text>
          <TouchableOpacity onPress={() => setCameraFacing(value => value === 'front' ? 'back' : 'front')} style={{ backgroundColor: '#222', padding: 10, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Girar cámara</Text>
          </TouchableOpacity>
        </View>
        <View style={{ paddingVertical: 18 }}>
          <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 12 }}>Vista previa en este teléfono. Aún no se transmite a espectadores.</Text>
          <TouchableOpacity onPress={() => setShowCamera(false)} style={{ backgroundColor: '#d82e69', padding: 16, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>CERRAR CÁMARA</Text>
          </TouchableOpacity>
        </View>
      </View>}
      <Text style={styles.connection}>{supabaseConfigured ? 'Base de datos configurada' : 'Modo demostración · Base de datos pendiente'}</Text>
    </SafeAreaView>
  );
}

function Product({ product, onPress }) {
  return <TouchableOpacity style={styles.product} onPress={onPress}>
    <View style={[styles.productArt, { backgroundColor: product.color }]}><Text style={styles.productEmoji}>{product.emoji}</Text></View>
    <View style={styles.productInfo}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productPrice}>{product.price}</Text></View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>;
}
