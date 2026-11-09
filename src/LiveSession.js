import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  useTracks,
  VideoTrack,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { supabase } from './supabase';

export default function LiveSession({ token, serverUrl, mode, sessionId, onClose }) {
  useEffect(() => {
    AudioSession.startAudioSession().catch(error => console.warn('Audio session:', error));
    return () => {
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, []);

  return (
    <View style={styles.root}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={mode === 'host'}
        video={mode === 'host'}
        options={{ adaptiveStream: { pixelDensity: 'screen' } }}
        onDisconnected={onClose}
      >
        <RoomContent mode={mode} sessionId={sessionId} onClose={onClose} />
      </LiveKitRoom>
    </View>
  );
}

function RoomContent({ mode, sessionId, onClose }) {
  const tracks = useTracks([Track.Source.Camera]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [likes, setLikes] = useState(0);
  const [viewers, setViewers] = useState(1);
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);
  const [chatError, setChatError] = useState('');
  const [userName, setUserName] = useState('Usuario');
  const channelName = useMemo(() => `kdlive-room-${sessionId}`, [sessionId]);

  useEffect(() => {
    let active = true;
    let channel;
    async function connectChat() {
      if (!supabase || !sessionId) {
        setChatError('El chat necesita conexión con Supabase.');
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error('Iniciá sesión para participar del chat.');
      const userId = authData.user.id;
      const [profileResult, messagesResult, likesResult] = await Promise.all([
        supabase.from('profiles').select('display_name,username').eq('id', userId).maybeSingle(),
        supabase.from('live_messages').select('id,body,user_id,created_at,profiles(display_name,username)').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(40),
        supabase.from('live_likes').select('*', { count: 'exact', head: true }).eq('session_id', sessionId)
      ]);
      const initialError = profileResult.error || messagesResult.error || likesResult.error;
      if (initialError) throw initialError;
      if (!active) return;
      const profile = profileResult.data;
      const recentMessages = messagesResult.data;
      const count = likesResult.count;
      setUserName(profile?.display_name || profile?.username || 'Usuario');
      setMessages((recentMessages || []).reverse());
      setLikes(count || 0);

      channel = supabase.channel(channelName, { config: { presence: { key: userId } } });
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `session_id=eq.${sessionId}` }, async payload => {
          const row = payload.new;
          const { data: author } = await supabase.from('profiles').select('display_name,username').eq('id', row.user_id).maybeSingle();
          if (active) setMessages(previous => previous.some(item => item.id === row.id) ? previous : [...previous, { ...row, profiles: author }].slice(-60));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_likes', filter: `session_id=eq.${sessionId}` }, () => {
          if (active) setLikes(previous => previous + 1);
        })
        .on('presence', { event: 'sync' }, () => {
          if (active) setViewers(Math.max(1, Object.keys(channel.presenceState()).length));
        })
        .subscribe(async status => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: userId, online_at: new Date().toISOString() });
          }
        });
    }
    connectChat().catch(error => { if (active) setChatError(error.message || 'No se pudo conectar el chat.'); });
    return () => {
      active = false;
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [channelName, sessionId]);

  async function sendMessage() {
    const body = message.trim();
    if (!body || !supabase || sending) return;
    if (body.length > 300) {
      setChatError('El comentario admite hasta 300 caracteres.');
      return;
    }
    setSending(true);
    setChatError('');
    try {
      const { error } = await supabase.from('live_messages').insert({ session_id: sessionId, body });
      if (error) throw error;
      setMessage('');
    } catch (error) {
      setChatError(error.message || 'No se pudo enviar el comentario. Revisá tu conexión e intentá nuevamente.');
    } finally {
      setSending(false);
    }
  }

  async function sendLike() {
    if (!supabase || liking) return;
    setLiking(true);
    setChatError('');
    try {
      const { error } = await supabase.from('live_likes').insert({ session_id: sessionId });
      if (error) throw error;
    } catch (error) {
      setChatError(error.message || 'No se pudo enviar el me gusta. Intentá nuevamente.');
    } finally {
      setLiking(false);
    }
  }

  const renderTrack = ({ item }) => (
    <View style={styles.video}>
      {isTrackReference(item)
        ? <VideoTrack trackRef={item} style={styles.videoFill} />
        : <View style={styles.videoFill} />}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.top}>
        <Text style={styles.live}>● EN DIRECTO</Text>
        <Text style={styles.mode}>{mode === 'host' ? 'Tu transmisión' : 'Viendo LIVE'}</Text>
        <Text style={styles.viewers}>◉ {viewers}</Text>
      </View>
      {tracks.length ? (
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={(item, index) => String(item.participant?.identity || index)}
          contentContainerStyle={styles.trackList}
        />
      ) : (
        <View style={styles.wait}>
          <Text style={styles.waitText}>{mode === 'host' ? 'Conectando tu cámara…' : 'Esperando video del vendedor…'}</Text>
        </View>
      )}
      <View style={styles.chatPanel}>
        <View style={styles.chatHeading}>
          <Text style={styles.chatTitle}>Chat en vivo</Text>
          <Text style={styles.likeCount}>♥ {likes}</Text>
        </View>
        <FlatList
          style={styles.messages}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Text style={styles.messageLine}>
              <Text style={styles.author}>{item.profiles?.display_name || item.profiles?.username || 'Usuario'}: </Text>
              {item.body}
            </Text>
          )}
          ListEmptyComponent={<Text style={styles.emptyChat}>¡Saludá! Sé el primero en comentar.</Text>}
        />
        {!!chatError && <Text style={styles.chatError}>{chatError}</Text>}
        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Escribí un comentario..."
            placeholderTextColor="#8d8d9c"
            style={styles.input}
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.send} onPress={sendMessage} disabled={sending || !message.trim()}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Enviar</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.likeButton} onPress={sendLike} disabled={liking}>
            <Text style={styles.likeButtonText}>♥</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.close} onPress={onClose}>
        <Text style={styles.closeText}>{mode === 'host' ? 'FINALIZAR LIVE' : 'SALIR DEL LIVE'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08080d' },
  top: { paddingTop: 42, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  live: { color: '#fff', backgroundColor: '#d82e69', padding: 8, borderRadius: 8, fontWeight: '900', fontSize: 11 },
  mode: { color: '#fff', fontWeight: '700', flex: 1, fontSize: 13 },
  viewers: { color: '#fff', fontWeight: '800' },
  trackList: { flexGrow: 1, justifyContent: 'center' },
  video: { width: '100%', height: 360, backgroundColor: '#171720' },
  videoFill: { width: '100%', height: '100%' },
  wait: { height: 300, alignItems: 'center', justifyContent: 'center', padding: 24 },
  waitText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  chatPanel: { height: 245, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#292936' },
  chatHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 7 },
  chatTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  likeCount: { color: '#ff6c9e', fontWeight: '900' },
  messages: { flex: 1 },
  messageLine: { color: '#ededf3', fontSize: 12, lineHeight: 18, marginBottom: 4 },
  author: { color: '#ff83ae', fontWeight: '800' },
  emptyChat: { color: '#858596', fontSize: 12, paddingVertical: 12 },
  chatError: { color: '#ff9dbb', fontSize: 10, marginVertical: 3 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 },
  input: { flex: 1, backgroundColor: '#1b1b26', borderRadius: 12, color: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 12 },
  send: { backgroundColor: '#d82e69', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 11 },
  sendText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  likeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3c1e2b', alignItems: 'center', justifyContent: 'center' },
  likeButtonText: { color: '#ff5e95', fontSize: 22 },
  close: { marginHorizontal: 14, marginBottom: 14, backgroundColor: '#d82e69', borderRadius: 12, padding: 14, alignItems: 'center' },
  closeText: { color: '#fff', fontWeight: '900' },
});
