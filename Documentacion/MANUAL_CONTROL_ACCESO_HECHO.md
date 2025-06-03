# Control de Acceso de Usuarios en NeuroPod

Este documento explica de forma detallada cómo funciona el control de acceso en NeuroPod, incluyendo la configuración de variables de entorno, los métodos de autenticación y las recomendaciones para producción.

## Configuración

Para configurar el control de acceso, necesitas editar el archivo `.env` en la raíz del proyecto backend y configurar las siguientes variables:

```
# Control de acceso
NODE_ENV=production
TRUST_GOOGLE_AUTH=true
ALLOWED_EMAILS=email1@example.com,email2@example.com
ADMIN_EMAILS=lolerodiez@gmail.com,admin2@example.com
```

### Variables Explicadas

1. **NODE_ENV**: 
   - `development`: El control de acceso está desactivado, permitiendo cualquier correo para facilitar las pruebas.
   - `production`: El control de acceso se activa según la configuración de las demás variables.

2. **TRUST_GOOGLE_AUTH**:
   - `true`: Se confía únicamente en la verificación de Google OAuth. Esto significa que si Google permite que un usuario se autentique (porque está registrado como usuario de prueba en el proyecto de Google Cloud Console), se le permite acceder a la aplicación sin verificaciones adicionales.
   - `false` o no definido: Se verificará que el correo del usuario esté en la lista de `ALLOWED_EMAILS` además de pasar la verificación de Google.

3. **ALLOWED_EMAILS**:
   - Lista separada por comas de correos electrónicos que están autorizados a acceder a la aplicación.
   - Solo se utiliza si `TRUST_GOOGLE_AUTH` es `false` o no está definido.
   - Ejemplo: `user1@gmail.com,user2@outlook.com,user3@example.com`

4. **ADMIN_EMAILS**:
   - Lista separada por comas de correos electrónicos que tendrán rol de administrador.
   - Estos correos siempre tienen acceso aunque no estén en `ALLOWED_EMAILS`.
   - Ejemplo: `lolerodiez@gmail.com,admin@example.com`

## Métodos de Autenticación y Verificación

### Google OAuth (Recomendado para producción)

Cuando un usuario se autentica mediante Google OAuth:

1. **Verificación de Google**:
   - En modo de prueba/desarrollo en Google Cloud Console: Solo los usuarios registrados como "usuarios de prueba" pueden completar la autenticación.
   - En modo verificado/producción en Google Cloud Console: Cualquier usuario de Google puede autenticarse.

2. **Verificación del Backend**:
   - Si `TRUST_GOOGLE_AUTH=true`: Se confía plenamente en la verificación de Google.
   - Si `TRUST_GOOGLE_AUTH=false` o no está definido: Se verifica adicionalmente que el correo esté en `ALLOWED_EMAILS` o `ADMIN_EMAILS`.

### Mock Login (Solo para desarrollo)

El login simulado (`mockLogin`) no pasa por la verificación de Google:

1. **En modo desarrollo** (`NODE_ENV=development`):
   - No se realiza ninguna verificación de correos permitidos.
   - Cualquier dirección de correo puede acceder.

2. **En modo producción** (`NODE_ENV=production`):
   - Siempre se verifica que el correo esté en `ALLOWED_EMAILS` o `ADMIN_EMAILS`.
   - Esta verificación se realiza independientemente del valor de `TRUST_GOOGLE_AUTH`.

## Recomendaciones de Configuración

### Configuración Recomendada para Producción

```
NODE_ENV=production
TRUST_GOOGLE_AUTH=true
ADMIN_EMAILS=lolerodiez@gmail.com,otroadmin@example.com
```

Con esta configuración:
- Se confía en la verificación de Google OAuth.
- Los correos listados en `ADMIN_EMAILS` tendrán automáticamente rol de administrador.
- No es necesario mantener una lista redundante de `ALLOWED_EMAILS`.

### Para Mayor Seguridad (Doble Verificación)

```
NODE_ENV=production
TRUST_GOOGLE_AUTH=false
ALLOWED_EMAILS=usuario1@example.com,usuario2@example.com
ADMIN_EMAILS=lolerodiez@gmail.com,otroadmin@example.com
```

Con esta configuración:
- Se requiere que el usuario pase la verificación de Google OAuth.
- Adicionalmente, se verifica que su correo esté en `ALLOWED_EMAILS` o `ADMIN_EMAILS`.
- Proporciona un doble nivel de seguridad.

### Para Desarrollo y Pruebas

```
NODE_ENV=development
```

Con esta configuración:
- No se realizan verificaciones de correos permitidos.
- Cualquier dirección puede acceder a través de Google OAuth o mock login.

## Comportamiento con Usuarios Existentes

Para usuarios que ya existen en la base de datos:
- Si el correo está en `ADMIN_EMAILS`, se actualizará su rol a `admin` automáticamente.
- De lo contrario, mantendrán su rol actual (`client` por defecto).

## Solución de Problemas

### Síntoma: Usuarios no pueden acceder aunque estén registrados en Google

- Verifica que el proyecto en Google Cloud Console esté correctamente configurado.
- Si `TRUST_GOOGLE_AUTH=false`, verifica que el correo esté en `ALLOWED_EMAILS`.
- Verifica los logs del servidor para ver el mensaje exacto de error.

### Síntoma: El mockLogin funciona en producción con cualquier correo

- Verifica que `NODE_ENV` está correctamente establecido como `production`.
- Asegúrate de que `ALLOWED_EMAILS` y `ADMIN_EMAILS` estén configurados correctamente.
- Reinicia el servidor para que las variables de entorno se apliquen.
