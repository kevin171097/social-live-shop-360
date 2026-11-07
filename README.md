# Social Live Shop 360 — app inicial

Proyecto base multiplataforma con Expo / React Native y Supabase preparado para Android, iOS y web.

## Incluye
- Interfaz móvil con Inicio, En vivo y Tienda.
- Tarjetas de vendedores y productos de demostración.
- Pantalla modal de LIVE demostrativo.
- Búsqueda local de productos.
- Archivo `.env.example` para conectar Supabase.
- Esquema SQL inicial: perfiles, productos, transmisiones, pedidos, reportes y apelaciones.

## Estado real
Esto es un **starter de desarrollo**, no una aplicación lista para publicar ni para recibir pagos. No tiene todavía:
- Autenticación ni recuperación de cuenta.
- Streaming real, chat, moderación de video ni notificaciones.
- Integración de pagos, reembolsos, envíos o retiros.
- Panel de administración y revisión humana de reportes.
- Verificación de vendedores ni prevención completa de fraude.

No se puede prometer que una transmisión nunca sea reportada. El diseño busca que los reportes no causen una suspensión automática sin evaluación, evidencia, controles contra abuso y una vía de apelación.

## Ejecutar
Requiere Node.js y Expo CLI/Expo Go:
1. `npm install`
2. `npx expo start`
3. Escanear el QR con Expo Go o abrir el emulador.

## Supabase
1. Crear un proyecto Supabase.
2. Ejecutar `supabase/schema.sql` en SQL Editor.
3. Copiar `.env.example` a `.env`.
4. Completar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Nunca poner `service_role` ni secretos de proveedores en el cliente móvil. Las operaciones privilegiadas deben ejecutarse en un backend seguro.

## Próximas etapas recomendadas
1. Autenticación, perfiles y roles de vendedor.
2. Alta de productos, stock y catálogo.
3. Streaming y chat en tiempo real con proveedor especializado.
4. Pedidos y pagos con webhooks verificados.
5. Moderación con reglas transparentes, revisión humana, apelaciones y auditoría.
6. Pruebas, privacidad, seguridad y publicación en Play Store / App Store.
