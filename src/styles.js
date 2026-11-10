import { StyleSheet, Platform } from 'react-native';

const ink = '#090910';
const panel = '#151520';
const line = '#292938';
const muted = '#9B9BAF';
const pink = '#FF3048';
const violet = '#FF6675';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink },
  header: { height: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: line, gap: 11, backgroundColor: '#0D0D15' },
  brandMark: { width: 38, height: 38, backgroundColor: pink, borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowColor: pink, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  brandMarkText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: -1 },
  brand: { color: '#fff', fontSize: 16, letterSpacing: 1.1, flex: 1, fontWeight: '600' },
  brandBold: { fontWeight: '900' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#20202D', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#363647' },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 118 },
  eyebrow: { color: violet, fontSize: 10, fontWeight: '900', letterSpacing: 2.1, marginTop: 12 },
  hero: { fontSize: 39, lineHeight: 43, fontWeight: '900', letterSpacing: -1.7, color: '#fff', marginTop: 9, marginBottom: 19 },
  heroAccent: { color: '#FF5264' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: line, marginBottom: 20 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 5 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: pink },
  tabText: { color: '#858599', fontWeight: '700', fontSize: 13 },
  activeTabText: { color: '#fff' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 13, marginBottom: 13 },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 19, letterSpacing: -0.4 },
  muted: { color: muted, fontSize: 12 },
  liveCard: { height: 178, borderRadius: 19, padding: 15, marginBottom: 13, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff18', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 4 } }) },
  livePill: { position: 'absolute', top: 13, left: 13, color: '#fff', backgroundColor: '#E3263A', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  viewers: { position: 'absolute', top: 13, right: 13, color: '#fff', fontSize: 11, backgroundColor: '#09091099', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20, overflow: 'hidden' },
  liveArtwork: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 0.8 },
  seller: { color: '#fff', fontWeight: '800', fontSize: 14, marginTop: 7 },
  product: { flexDirection: 'row', alignItems: 'center', backgroundColor: panel, borderWidth: 1, borderColor: line, borderRadius: 16, padding: 10, marginBottom: 10, gap: 12 },
  productArt: { width: 68, height: 68, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff16' },
  productEmoji: { fontSize: 32 },
  productInfo: { flex: 1 },
  productName: { color: '#fff', fontWeight: '750' },
  productPrice: { color: '#FF5264', fontWeight: '900', marginTop: 5, fontSize: 14 },
  chevron: { fontSize: 25, color: '#77778B', paddingHorizontal: 5 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 76, paddingBottom: Platform.OS === 'ios' ? 12 : 4, backgroundColor: '#11111A', borderTopWidth: 1, borderTopColor: line, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  bottomItem: { alignItems: 'center', minWidth: 56, paddingTop: 4 },
  bottomIcon: { fontSize: 22, color: '#E8E8F0' },
  bottomLabel: { fontSize: 10, color: '#9999AA', marginTop: 3, fontWeight: '600' },
  plus: { backgroundColor: pink, overflow: 'hidden', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 1, fontSize: 25, color: '#fff', shadowColor: pink, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  search: { backgroundColor: panel, borderWidth: 1, borderColor: line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, color: '#fff', marginVertical: 14, fontSize: 14 },
  notice: { backgroundColor: '#211B32', borderWidth: 1, borderColor: '#493B67', borderRadius: 13, padding: 13, color: '#D9CCFF', fontSize: 13, marginVertical: 12, lineHeight: 19 },
  primaryButton: { backgroundColor: pink, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 13, shadowColor: pink, shadowOpacity: 0.2, shadowRadius: 9, elevation: 3 },
  secondaryButton: { backgroundColor: '#20202D', padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#3A3A4B' },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.2 },
  footer: { color: '#626274', textAlign: 'center', fontSize: 10, marginTop: 24 },
  modalShade: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#000D', justifyContent: 'center', padding: 18 },
  modal: { backgroundColor: panel, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#3A3A4A' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  modalTitle: { color: '#fff', fontWeight: '900', letterSpacing: 0.4 },
  close: { color: '#fff', fontSize: 20 },
  videoPlaceholder: { height: 270, borderRadius: 15, justifyContent: 'center', alignItems: 'center', padding: 18, borderWidth: 1, borderColor: '#ffffff20' },
  videoTitle: { fontSize: 28, color: '#fff', textAlign: 'center', letterSpacing: 2, fontWeight: '900' },
  videoStrong: { fontWeight: '900' },
  videoCaption: { color: '#F1EAF3', fontSize: 12, marginTop: 20, textAlign: 'center', lineHeight: 18 },
  smallNote: { color: '#88889A', fontSize: 10, marginTop: 11, textAlign: 'center' },
  connection: { position: 'absolute', top: 71, right: 10, color: '#77778A', fontSize: 8 }
});
