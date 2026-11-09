import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const port = Number(process.env.PORT || 3000);
const livekitUrl = process.env.LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({ origin: allowedOrigin === '*' ? true : allowedOrigin.split(',').map(v => v.trim()) }));
app.use(express.json({ limit: '32kb' }));
app.use('/api/live/token', rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'kd-live-stream-server' });
});

app.post('/api/live/token', async (req, res) => {
  try {
    // Los tokens de desarrollo nunca se habilitan en despliegues públicos.
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEV_TOKENS !== 'true') {
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(503).json({ error: 'Autenticación del servidor no configurada.' });
      }
    }
    if (!livekitUrl || !apiKey || !apiSecret) {
      return res.status(503).json({ error: 'Streaming no configurado en el servidor.' });
    }

    const authorization = req.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!accessToken) return res.status(401).json({ error: 'Iniciá sesión para continuar.' });
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: 'Autenticación no configurada.' });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
    if (userError || !userData?.user) return res.status(401).json({ error: 'Sesión inválida o vencida.' });
    const userId = userData.user.id;

    const { sessionId } = req.body || {};
    if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return res.status(400).json({ error: 'Sesión LIVE inválida.' });
    }

    const [{ data: profile, error: profileError }, { data: live, error: liveError }] = await Promise.all([
      userClient.from('profiles').select('role').eq('id', userId).maybeSingle(),
      userClient.from('live_sessions').select('id,seller_id,title,status').eq('id', sessionId).maybeSingle()
    ]);
    if (profileError || liveError) return res.status(503).json({ error: 'No se pudo verificar tu cuenta o el LIVE.' });
    if (!profile || !live) return res.status(404).json({ error: 'Cuenta o transmisión no encontrada.' });

    const isHost = live.seller_id === userId;
    if (isHost) {
      if (!['seller', 'admin'].includes(profile.role)) {
        return res.status(403).json({ error: 'Tu cuenta no tiene permiso para transmitir.' });
      }
      if (!['scheduled', 'live'].includes(live.status)) {
        return res.status(409).json({ error: 'Esta transmisión no está disponible para emitir.' });
      }
    } else if (live.status !== 'live') {
      return res.status(409).json({ error: 'Esta transmisión todavía no está en vivo.' });
    }

    const roomName = `kdlive_${live.id.replace(/-/g, '')}`;
    const identity = userId;
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: '10m',
      name: identity
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true
    });
    const jwt = await token.toJwt();
    return res.json({ token: jwt, serverUrl: livekitUrl, roomName, identity, role: isHost ? 'host' : 'viewer', expiresIn: 600 });
  } catch (error) {
    console.error('Token error:', error);
    return res.status(500).json({ error: 'No se pudo generar el token.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`KD.LIVE streaming server listening on port ${port}`);
});
