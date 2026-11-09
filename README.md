# KD.LIVE — desarrollo móvil y streaming

Aplicación social original para Android/iOS con Expo, React Native y LiveKit.

## Estado actual
- Interfaz móvil refinada con navegación Inicio, En vivo y Tienda, tarjetas y estilos adaptados a Android/iOS.
- Contenido de muestra identificado claramente para no presentar espectadores, productos ni transmisiones ficticias como actividad real.
- Vista de sala LiveKit integrada en el código móvil.
- Acción de anfitrión que solicita un token al backend y abre una sala LiveKit.
- Backend Node/Express que genera tokens temporales.
- Configuración Expo para módulos nativos WebRTC y perfil EAS de Android.
- **Aún no es una aplicación terminada ni un APK probado.** No se ha compilado ni probado en un teléfono real y el backend aún no está desplegado con credenciales privadas.

## Requisito importante
LiveKit React Native necesita código nativo. **Expo Go no es compatible**. Se debe generar un development build o preview build con EAS y probar en Android físico. Referencia: https://docs.livekit.io/transport/sdk-platforms/expo/

## Configurar el backend en Render
El archivo `render.yaml` describe el servicio. Al crearlo, seleccionar la rama `kd-live` y configurar estas variables privadas en Render:
- `LIVEKIT_URL`: URL wss del proyecto LiveKit.
- `LIVEKIT_API_KEY`: API Key regenerada.
- `LIVEKIT_API_SECRET`: API Secret regenerada.

No escribir secretos en GitHub, en el código de la app ni en el chat. El endpoint exige un token de sesión Supabase, valida el usuario y comprueba el rol del vendedor y la propiedad/estado de la transmisión. Mantener desactivados los tokens de desarrollo.

Cuando Render entregue una URL HTTPS, configurar `EXPO_PUBLIC_API_URL` con esa URL sin barra final en el entorno de compilación móvil.

## Compilar Android
1. Instalar dependencias con `npm install`.
2. Instalar EAS CLI e iniciar sesión con una cuenta Expo.
3. Ejecutar `eas build --platform android --profile preview`.
4. Instalar el APK generado y probar cámara, micrófono y conexión desde dos dispositivos.

El primer build debe revisarse por compatibilidad de dependencias y configuración nativa. No se afirma que ya esté compilado.

## Pendiente antes de producción
- Autenticación de usuarios y roles con Supabase.
- Emisión de tokens protegida por identidad autenticada y permisos del vendedor (integración de backend añadida; falta conectarla al flujo móvil).
- Crear/cerrar sesiones LIVE en base de datos y enlazar el botón de emisión con sesiones autorizadas.
- Descubrimiento de transmisiones reales, chat en vivo, comentarios, likes y contador de espectadores.
- Feed de videos, perfiles, seguimiento y notificaciones.
- Catálogo con carga de imágenes, pedidos y pagos.
- Moderación, reportes, revisión humana y apelaciones.
- Pruebas de seguridad, privacidad, rendimiento y publicación.
