# KD.LIVE — desarrollo móvil y streaming

Aplicación social original para Android/iOS con Expo, React Native y LiveKit.

## Estado actual
- Interfaz móvil refinada con navegación Inicio, En vivo y Tienda, tarjetas y estilos adaptados a Android/iOS.
- Pantalla de registro e inicio de sesión con email/contraseña mediante Supabase Auth; crea el perfil inicial con rol comprador y conserva roles existentes.
- Contenido de muestra identificado claramente para no presentar espectadores, productos ni transmisiones ficticias como actividad real.
- Vista de sala LiveKit integrada en el código móvil.
- Chat de transmisión en tiempo real con mensajes guardados en Supabase y sincronizados entre espectadores.
- Botón de me gusta con contador basado en registros reales.
- Presencia en sala mediante Supabase Realtime para mostrar usuarios conectados (no equivale a espectadores de video confirmados por LiveKit).
- Flujo móvil conectado para crear una sesión LIVE como vendedor aprobado, solicitar token al backend y abrir una sala LiveKit; el cierre actualiza el estado de la sesión.
- Carga de productos activos y transmisiones activas desde Supabase; navegación de perfil y entrada de espectadores a salas reales.
- Backend Node/Express que genera tokens temporales.
- Configuración Expo para módulos nativos WebRTC y perfil EAS de Android.
- **Aún no es una aplicación terminada ni un APK probado.** No se ha compilado ni probado en un teléfono real y el backend aún no está desplegado con credenciales privadas.

## Activar chat y me gusta en Supabase
1. Abrir el proyecto Supabase conectado a KD.LIVE.
2. Entrar en **SQL Editor**.
3. Abrir el archivo `supabase/live-chat.sql` de esta rama y ejecutar todo su contenido una sola vez.
4. Confirmar que las tablas `live_messages` y `live_likes` aparecen creadas y que Realtime está habilitado.

Las políticas RLS limitan la lectura y escritura a usuarios autenticados y transmisiones con estado `live`.

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
- Validar chat, comentarios, likes y presencia en dos o más dispositivos reales; contrastar el contador de presencia con los participantes conectados a LiveKit.
- Feed vertical de videos, perfiles públicos completos, seguimiento y notificaciones.
- Herramientas de vendedor para publicar/editar productos, imágenes y stock.
- Catálogo con carga de imágenes, pedidos y pagos integrados.
- Moderación, reportes, revisión humana y apelaciones.
- Pruebas de seguridad, privacidad, rendimiento y publicación.


## Solicitudes de pedido

Después de ejecutar `supabase/schema.sql`, ejecutá también `supabase/order-request.sql` en Supabase SQL Editor. Esta migración crea la función `create_order_request`, que valida sesión, producto activo, stock y cantidad, y toma el precio y vendedor desde la base de datos. La app permite enviar solicitudes pendientes; **no procesa cobros, no reserva stock y no confirma pagos**. No anunciar ventas pagadas hasta integrar y probar una pasarela de pago con confirmación del proveedor.
