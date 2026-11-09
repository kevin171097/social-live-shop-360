import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  useTracks,
  VideoTrack,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

export default function LiveSession({ token, serverUrl, mode, onClose }) {
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
        <RoomContent mode={mode} onClose={onClose} />
      </LiveKitRoom>
    </View>
  );
}

function RoomContent({ mode, onClose }) {
  const tracks = useTracks([Track.Source.Camera]);
  const renderTrack = ({ item }) => (
    <View style={styles.video}>
      {isTrackReference(item)
        ? <VideoTrack trackRef={item} style={styles.videoFill} />
        : <View style={styles.videoFill} />}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.live}>● EN DIRECTO</Text>
        <Text style={styles.mode}>{mode === 'host' ? 'Tu transmisión' : 'Viendo LIVE'}</Text>
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
      <TouchableOpacity style={styles.close} onPress={onClose}>
        <Text style={styles.closeText}>FINALIZAR / SALIR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08080d' },
  top: { paddingTop: 44, paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  live: { color: '#fff', backgroundColor: '#d82e69', padding: 8, borderRadius: 8, fontWeight: '900' },
  mode: { color: '#fff', fontWeight: '700' },
  trackList: { flexGrow: 1, justifyContent: 'center' },
  video: { width: '100%', height: 520, backgroundColor: '#171720' },
  videoFill: { width: '100%', height: '100%' },
  wait: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  waitText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  close: { margin: 18, backgroundColor: '#d82e69', borderRadius: 12, padding: 16, alignItems: 'center' },
  closeText: { color: '#fff', fontWeight: '900' },
});
