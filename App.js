import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, Image, TouchableOpacity, ScrollView, TextInput, StatusBar, ActivityIndicator, Alert } from 'react-native';
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
  const [orders, setOrders] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const [liveTitle, setLiveTitle] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('1');
  const [productImage, setProductImage] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [sendingOrder, setSendingOrder] = useState(false);

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
      const [profileResult, productResult, liveResult, orderResult] = await Promise.all([
        supabase.from('profiles').select('id,username,display_name,bio,avatar_url,role').eq('id', session.user.id).maybeSingle(),
        supabase.from('products').select('id,seller_id,title,description,price,currency,image_url,stock,status').or(`status.eq.active,seller_id.eq.${session.user.id}`).order('created_at', { ascending: false }).limit(60),
        supabase.from('live_sessions').select('id,seller_id,title,category,status,started_at,profiles(display_name,username)').eq('status', 'live').order('started_at', { ascending: false }).limit(30),
        supabase.from('orders').select('id,buyer_id,seller_id,quantity,unit_price,currency,status,created_at,products(title)').or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`).order('created_at', { ascending: false }).limit(30)
      ]);
      if (profileResult.error) throw profileResult.error;
      if (productResult.error) throw productResult.error;
      if (liveResult.error) throw liveResult.error;
      if (orderResult.error) throw orderResult.error;
      setProfile(profileResult.data);
      setProducts((productResult.data || []).map(p => ({
        id: p.id, name: p.title, price: new Intl.NumberFormat('es-UY', { style: 'currency', currency: p.currency || 'UYU', maximumFractionDigits: 0 }).format(Number(p.price)),
        emoji: '🛍️', color: '#59466d', description: p.description, image_url: p.image_url, stock: p.stock, status: p.status, sellerId: p.seller_id
      })));
      setLives(liveResult.data || []);
      setOrders(orderResult.data || []);
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

  async function publishProduct() {
    if (!supabase || !session || !profile) return showNotice('Iniciá sesión para publicar.');
    if (!['seller', 'admin'].includes(profile.role)) return showNotice('Tu cuenta necesita permiso de vendedor para publicar productos.');
    const title = productTitle.trim();
    const price = Number(productPrice.replace(',', '.'));
    const stock = Number(productStock);
    if (title.length < 3) return showNotice('El nombre del producto debe tener al menos 3 caracteres.');
    if (!Number.isFinite(price) || price <= 0) return showNotice('Ingresá un precio válido mayor que cero.');
    if (!Number.isInteger(stock) || stock < 0) return showNotice('El stock debe ser un número entero igual o mayor que cero.');
    setSavingProduct(true);
    try {
      const { error } = await supabase.from('products').insert({
        seller_id: session.user.id,
        title,
        description: productDescription.trim(),
        price,
        currency: 'UYU',
        image_url: productImage.trim() || null,
        stock,
        status: stock > 0 ? 'active' : 'sold_out'
      });
      if (error) throw error;
      setProductTitle('');
      setProductDescription('');
      setProductPrice('');
      setProductStock('1');
      setProductImage('');
      showNotice('¡Producto publicado! Ya puede aparecer en la tienda.');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo publicar el producto.');
    } finally {
      setSavingProduct(false);
    }
  }

  async function requestOrder() {
    if (!supabase || !session?.user?.id || !selectedProduct) {
      return showNotice('Iniciá sesión para solicitar un pedido.');
    }
    const quantity = Number(orderQuantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return showNotice('Ingresá una cantidad válida entre 1 y 99.');
    }
    if (quantity > Number(selectedProduct.stock)) {
      return showNotice('La cantidad supera el stock disponible.');
    }
    setSendingOrder(true);
    try {
      const { data, error } = await supabase.rpc('create_order_request', {
        p_product_id: selectedProduct.id,
        p_quantity: quantity
      });
      if (error) throw error;
      setSelectedProduct(null);
      setOrderQuantity('1');
      showNotice(`Solicitud enviada correctamente. Número de pedido: ${data}`);
    } catch (error) {
      showNotice(error.message || 'No se pudo enviar la solicitud de pedido.');
    } finally {
      setSendingOrder(false);
    }
  }

  async function toggleProductStatus(product) {
    if (!supabase || !session || product.sellerId !== session.user.id) {
      return showNotice('Solo podés modificar tus propios productos.');
    }
    const nextStatus = product.status === 'active' ? 'paused' : (product.stock > 0 ? 'active' : 'sold_out');
    try {
      const { error } = await supabase.from('products').update({ status: nextStatus }).eq('id', product.id).eq('seller_id', session.user.id);
      if (error) throw error;
      showNotice(nextStatus === 'active' ? 'Producto nuevamente visible en la tienda.' : 'Producto pausado; ya no aparece para compradores.');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo actualizar el producto.');
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
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Productos</Text><Text style={styles.muted}>{products.filter(p => p.status === 'active').length} publicados</Text></View>
          {products.filter(p => p.status === 'active').slice(0, 8).map(p => <Product key={p.id} product={p} onPress={() => setSelectedProduct(p)} />)}
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
          {['seller', 'admin'].includes(profile?.role) && <>
            <Text style={[styles.sectionTitle, { marginTop: 18, fontSize: 16 }]}>Publicar producto</Text>
            <TextInput value={productTitle} onChangeText={setProductTitle} placeholder="Nombre del producto" placeholderTextColor="#9999aa" style={styles.search} maxLength={90} />
            <TextInput value={productDescription} onChangeText={setProductDescription} placeholder="Descripción (opcional)" placeholderTextColor="#9999aa" style={styles.search} maxLength={500} />
            <TextInput value={productPrice} onChangeText={setProductPrice} placeholder="Precio en pesos uruguayos" placeholderTextColor="#9999aa" style={styles.search} keyboardType="decimal-pad" />
            <TextInput value={productStock} onChangeText={setProductStock} placeholder="Cantidad disponible" placeholderTextColor="#9999aa" style={styles.search} keyboardType="number-pad" />
            <TextInput value={productImage} onChangeText={setProductImage} placeholder="URL de imagen (opcional)" placeholderTextColor="#9999aa" style={styles.search} autoCapitalize="none" keyboardType="url" />
            <TouchableOpacity onPress={publishProduct} disabled={savingProduct} style={styles.primaryButton}>
              {savingProduct ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>＋ Publicar en la tienda</Text>}
            </TouchableOpacity>
          </>}
          <TextInput value={query} onChangeText={setQuery} placeholder="Buscar productos..." placeholderTextColor="#9999aa" style={styles.search} />
          {visibleProducts.map(p => <View key={p.id}>
            <Product product={p} onPress={() => setSelectedProduct(p)} />
            {p.sellerId === session?.user?.id && (
              <TouchableOpacity onPress={() => toggleProductStatus(p)} style={styles.secondaryButton}>
                <Text style={styles.buttonText}>{p.status === 'active' ? 'Pausar publicación' : p.stock > 0 ? 'Volver a publicar' : 'Sin stock'}</Text>
              </TouchableOpacity>
            )}
          </View>)}
          {!visibleProducts.length && <Text style={styles.muted}>No hay productos para mostrar.</Text>}
        </>}
        {tab === 'Perfil' && <>
          <Text style={styles.sectionTitle}>Mi perfil</Text>
          <Text style={styles.heroAccent}>{profile?.display_name || session?.user?.email || 'Invitado'}</Text>
          <Text style={styles.muted}>@{profile?.username || 'usuario'}</Text>
          <Text style={styles.notice}>Tipo de cuenta: {profile?.role || 'sin configurar'}</Text>
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Mis pedidos</Text>
          {orders.length ? orders.map(order => <View key={order.id} style={styles.product}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{order.products?.title || 'Producto'}</Text>
              <Text style={styles.muted}>Cantidad: {order.quantity} · {order.buyer_id === session?.user?.id ? 'Comprador' : 'Vendedor'}</Text>
              <Text style={styles.productPrice}>{new Intl.NumberFormat('es-UY', { style: 'currency', currency: order.currency || 'UYU', maximumFractionDigits: 0 }).format(Number(order.unit_price) * Number(order.quantity))}</Text>
              <Text style={styles.muted}>Estado: {order.status === 'pending' ? 'Pendiente' : order.status}</Text>
            </View>
          </View>) : <Text style={styles.muted}>Todavía no tenés pedidos.</Text>}
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
      {!!selectedProduct && <View style={styles.modalShade}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>DETALLE DEL PRODUCTO</Text>
            <TouchableOpacity onPress={() => setSelectedProduct(null)}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>
          {selectedProduct.image_url ? (
            <Image source={{ uri: selectedProduct.image_url }} style={{ width: '100%', height: 210, borderRadius: 14, marginBottom: 14, backgroundColor: '#292938' }} resizeMode="contain" />
          ) : (
            <View style={[styles.videoPlaceholder, { height: 150, marginBottom: 14, backgroundColor: '#292039' }]}><Text style={{ fontSize: 48 }}>{selectedProduct.emoji || '🛍️'}</Text></View>
          )}
          <Text style={styles.sectionTitle}>{selectedProduct.name}</Text>
          <Text style={styles.productPrice}>{selectedProduct.price}</Text>
          {!!selectedProduct.description && <Text style={[styles.muted, { marginTop: 10, lineHeight: 20 }]}>{selectedProduct.description}</Text>}
          <Text style={[styles.muted, { marginTop: 12 }]}>{Number(selectedProduct.stock) > 0 ? `Disponibles: ${selectedProduct.stock}` : 'Sin stock disponible'}</Text>
          {Number(selectedProduct.stock) > 0 && selectedProduct.sellerId !== session?.user?.id && <>
            <TextInput value={orderQuantity} onChangeText={setOrderQuantity} placeholder="Cantidad" placeholderTextColor="#9999aa" keyboardType="number-pad" style={styles.search} />
            <TouchableOpacity onPress={requestOrder} disabled={sendingOrder} style={styles.primaryButton}>
              {sendingOrder ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Solicitar pedido</Text>}
            </TouchableOpacity>
            <Text style={styles.notice}>Esto envía una solicitud al vendedor. Todavía no cobra ni confirma el pago; no transfieras dinero desde esta pantalla.</Text>
          </>}
          {selectedProduct.sellerId === session?.user?.id && <Text style={styles.notice}>Este producto pertenece a tu cuenta.</Text>}
          <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.secondaryButton}><Text style={styles.buttonText}>Volver a la tienda</Text></TouchableOpacity>
        </View>
      </View>}
      {!!liveSession && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 30 }}>
        <LiveSession {...liveSession} onClose={closeLive} />
      </View>}
      <Text style={styles.connection}>{supabaseConfigured ? 'Cuenta y base de datos conectadas' : 'Modo de configuración · falta Supabase'}</Text>
    </SafeAreaView>
  );
}

function Product({ product, onPress }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!product.image_url && !imageFailed;
  return <TouchableOpacity style={styles.product} onPress={onPress}>
    <View style={[styles.productArt, { backgroundColor: product.color || '#59466d', overflow: 'hidden' }]}>
      {showImage ? (
        <Image source={{ uri: product.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setImageFailed(true)} />
      ) : <Text style={styles.productEmoji}>{product.emoji || '🛍️'}</Text>}
    </View>
    <View style={styles.productInfo}>
      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.productPrice}>{product.price}</Text>
      {Number.isFinite(Number(product.stock)) && <Text style={styles.muted}>{Number(product.stock) > 0 ? 'Disponible' : 'Sin stock'}</Text>}
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>;
}
