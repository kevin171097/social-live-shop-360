import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const port = Number(process.env.PORT || 3000);
const livekitUrl = process.env.LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({ origin: allowedOrigin === '*' ? true : allowedOrigin.split(',').map(v => v.trim()) }));
app.use(express.json({ limit: '32kb' }));
app.use('/api/live/token', rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'kd-live-stream-server' });
});

app.post('/api/live/token', async (req, res) => {
  try {
    if (process.env.ALLOW_DEV_TOKENS !== 'true') {
      return res.status(403).json({ error: 'Emisión de tokens desactivada. Habilitar solo para pruebas privadas.' });
    }
    if (!livekitUrl || !apiKey || !apiSecret) {
      return res.status(503).json({ error: 'Streaming no configurado en el servidor.' });
    }
    const { roomName, identity, role = 'viewer' } = req.body || {};
    if (typeof roomName !== 'string' || !/^[a-zA-Z0-9_-]{3,80}$/.test(roomName)) {
      return res.status(400).json({ error: 'roomName inválido.' });
    }
    if (typeof identity !== 'string' || !/^[a-zA-Z0-9_-]{2,64}$/.test(identity)) {
      return res.status(400).json({ error: 'identity inválida.' });
    }
    if (!['host', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'role inválido.' });
    }
    // Endpoint de desarrollo: añadir autenticación y autorización real antes de producción.
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: '10m',
      name: identity
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: role === 'host',
      canSubscribe: true,
      canPublishData: true
    });
    const jwt = await token.toJwt();
    return res.json({ token: jwt, serverUrl: livekitUrl, roomName, identity, role, expiresIn: 600 });
  } catch (error) {
    console.error('Token error:', error);
    return res.status(500).json({ error: 'No se pudo generar el token.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`KD.LIVE streaming server listening on ${port}`);
});
