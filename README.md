# KD.LIVE — base de desarrollo

Aplicación social original para Android/iOS basada en Expo + React Native. Esta rama conserva el prototipo anterior y prepara el backend de transmisiones reales con LiveKit.

## Estado actual (transparente)
- Interfaz móvil inicial con Inicio, En vivo y Tienda, búsqueda local y vista previa de cámara.
- Esquema inicial de datos Supabase para perfiles, productos, lives, pedidos y reportes.
- Backend Node/Express para emitir tokens LiveKit desde el servidor.
- **Todavía no es una app terminada ni un APK instalable.** La vista previa de cámara no transmite por Internet; el cliente móvil aún debe integrarse con LiveKit y probarse en dispositivos reales.
- Aún faltan autenticación, chat persistente, feed de videos, notificaciones, compras/pagos, moderación operativa, panel de administración, pruebas y publicación.

## App móvil
Requiere Node.js y un entorno Expo con build nativo para los módulos de streaming. Expo Go por sí solo no alcanza para integrar LiveKit React Native.

```bash
npm install
npx expo start
```

Para streaming nativo se deberá configurar un build de desarrollo/preview con EAS Build y añadir el SDK cliente LiveKit compatible con Expo SDK usado por este proyecto.

## Backend LiveKit (Render)
1. Crear un Web Service en Render apuntando a esta rama.
2. Root Directory: `server`.
3. Build Command: `npm install`.
4. Start Command: `npm start`.
5. Configurar en Render, como variables privadas: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` y opcionalmente `ALLOWED_ORIGIN`.
6. No guardar claves privadas en GitHub ni enviarlas por chat. Si una clave fue compartida, rotarla en LiveKit.

El endpoint `POST /api/live/token` emite un token temporal de acceso a una sala. Esta primera versión es solo un backend de desarrollo: antes de producción se debe exigir autenticación de usuario, validar permisos de anfitrión/espectador, limitar salas y aplicar rate limits.

## Base de datos
El esquema inicial se encuentra en `supabase/schema.sql`. Revisar las políticas RLS y completar pruebas antes de usar datos reales.

## Seguridad y moderación
No se puede garantizar que una transmisión nunca reciba reportes. KD.LIVE debe contar con reglas claras, controles antiabuso, revisión humana, evidencia, sanciones proporcionales y apelaciones.
