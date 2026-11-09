# KD.LIVE — desarrollo móvil y streaming

Aplicación social original para Android/iOS con Expo, React Native y LiveKit.

## Estado actual
- Interfaz móvil refinada con navegación Inicio, En vivo y Tienda, tarjetas y estilos adaptados a Android/iOS.
- Pantalla de registro e inicio de sesión con email/contraseña mediante Supabase Auth; crea el perfil inicial con rol comprador y conserva roles existentes.
- Contenido de muestra identificado claramente para no presentar espectadores, productos ni transmisiones ficticias como actividad real.
- Vista de sala LiveKit integrada en el código móvil.
- Flujo móvil conectado para crear una sesión LIVE como vendedor aprobado, solicitar token al backend y abrir una sala LiveKit; el cierre actualiza el estado de la sesión.
- Carga de productos activos y transmisiones activas desde Supabase; navegación de perfil y entrada de espectadores a salas reales.
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
- Completar pruebas de autenticación Supabase, recuperación de contraseña y verificación de correo.
- Probar en dispositivos reales el flujo de emisión y visualización LiveKit; el código móvil ya solicita tokens autenticados.
- Añadir interfaz completa de chat, comentarios, likes y contador real de espectadores dentro del LIVE.
- Feed vertical de videos, perfiles públicos completos, seguimiento y notificaciones.
- Herramientas de vendedor para publicar/editar productos, imágenes y stock.
- Catálogo con carga de imágenes, pedidos y pagos integrados.
- Moderación, reportes, revisión humana y apelaciones.
- Pruebas de seguridad, privacidad, rendimiento y publicación.
