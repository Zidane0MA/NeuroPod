# 🧪 Script de Prueba - Endpoints de Usuarios Implementados

## ✅ Endpoints Implementados

### **1. GET /api/auth/users**
```bash
# Listar usuarios con estadísticas dinámicas
curl -X GET "http://localhost:3000/api/auth/users" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"

# Con búsqueda
curl -X GET "http://localhost:3000/api/auth/users?search=cliente" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

### **2. POST /api/auth/users/balance**
```bash
# Actualizar saldo de usuario
curl -X POST "http://localhost:3000/api/auth/users/balance" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_AQUI",
    "balance": 25.00
  }'
```

### **3. POST /api/auth/users/suspend** ⭐ NUEVO
```bash
# Suspender usuario (detener todos sus pods)
curl -X POST "http://localhost:3000/api/auth/users/suspend" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_AQUI"
  }'
```

### **4. DELETE /api/auth/users/:userId** ⭐ NUEVO
```bash
# Eliminar usuario completamente
curl -X DELETE "http://localhost:3000/api/auth/users/USER_ID_AQUI" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

## 🚀 Pasos para Probar

### **1. Obtener Token de Admin**
```bash
# Login como admin
curl -X POST "http://localhost:3000/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lolerodiez@gmail.com"
  }'

# Copiar el token de la respuesta
```

### **2. Crear Usuario de Prueba**
```bash
# Login como cliente para crear usuario
curl -X POST "http://localhost:3000/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente.prueba@test.com"
  }'
```

### **3. Listar Usuarios**
```bash
# Reemplazar <admin_token> con el token real
curl -X GET "http://localhost:3000/api/auth/users" \
  -H "Authorization: Bearer <admin_token>"
```

### **4. Probar Suspender Usuario**
```bash
# Usar el ID del usuario cliente creado
curl -X POST "http://localhost:3000/api/auth/users/suspend" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "ID_DEL_USUARIO_CLIENTE"
  }'
```

### **5. Probar Eliminar Usuario**
```bash
# CUIDADO: Esto elimina permanentemente el usuario
curl -X DELETE "http://localhost:3000/api/auth/users/ID_DEL_USUARIO_CLIENTE" \
  -H "Authorization: Bearer <admin_token>"
```

---

## 📋 Respuestas Esperadas

### **GET /api/auth/users**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "user_id_1",
      "email": "lolerodiez@gmail.com",
      "name": "Administrador",
      "registrationDate": "12/3/2024",
      "balance": "Infinity",
      "status": "offline",
      "role": "admin",
      "activePods": 0,
      "totalPods": 0
    },
    {
      "id": "user_id_2", 
      "email": "cliente.prueba@test.com",
      "name": "cliente.prueba",
      "registrationDate": "12/3/2024",
      "balance": 10,
      "status": "offline",
      "role": "client",
      "activePods": 0,
      "totalPods": 0
    }
  ]
}
```

### **POST /api/auth/users/suspend**
```json
{
  "success": true,
  "message": "Usuario cliente.prueba@test.com suspendido correctamente",
  "data": {
    "userId": "user_id_2",
    "userEmail": "cliente.prueba@test.com",
    "podsStopped": 0,
    "stoppedPods": []
  }
}
```

### **DELETE /api/auth/users/:userId**
```json
{
  "success": true,
  "message": "Usuario cliente.prueba@test.com eliminado correctamente", 
  "data": {
    "userId": "user_id_2",
    "userEmail": "cliente.prueba@test.com",
    "podsDeleted": 0,
    "sessionsDeleted": 1,
    "activePods": 0
  }
}
```

---

## 🧪 Verificación Frontend

### **1. Iniciar Backend**
```bash
cd C:\Users\loler\Downloads\NeuroPod\NeuroPod-Backend
npm run dev
```

### **2. Iniciar Frontend**
```bash
cd C:\Users\loler\Downloads\NeuroPod\NeuroPod-Frontend
npm run dev
```

### **3. Probar en Navegador**
1. Ir a `http://localhost:5173/login`
2. Login con `lolerodiez@gmail.com` (admin)
3. Ir a `/admin/users`
4. Verificar que:
   - ✅ Carga usuarios reales de la base de datos
   - ✅ Muestra estadísticas de pods correctas
   - ✅ Búsqueda funciona
   - ✅ Asignar saldo funciona
   - ✅ Suspender usuario funciona
   - ✅ Eliminar usuario funciona

---

## 🔍 Logs a Observar

### **En Backend Console**
```
Usuario encontrado: lolerodiez@gmail.com (admin)
Login simulado exitoso para: lolerodiez@gmail.com (admin)
Log creado: USERS_LISTED para usuario [user_id]
Suspendido usuario cliente.prueba@test.com, pods detenidos: 0
Log creado: USER_SUSPENDED para usuario [admin_id]
Usuario eliminado: cliente.prueba@test.com, pods: 0, sesiones: 1
Log creado: USER_DELETED para usuario [admin_id]
```

### **En Frontend Console**
```
Login exitoso con el backend real
Usuarios cargados desde API: 2 usuarios
Saldo asignado correctamente
Usuario suspendido correctamente  
Usuario eliminado correctamente
```

---

## ⚠️ Consideraciones de Seguridad

1. **Solo administradores** pueden acceder a estos endpoints
2. **No se puede suspender/eliminar** a otros administradores
3. **No se puede eliminar** a sí mismo
4. **Todos los cambios** se registran en logs para auditoría
5. **Validaciones completas** de entrada y permisos

---

## 🎯 Estado Final

Con estos endpoints implementados:

- ✅ **Sistema de usuarios 100% funcional**
- ✅ **Frontend conectado con backend real**
- ✅ **4/4 endpoints de usuarios implementados**
- ✅ **Gestión completa desde /admin/users**
- ✅ **Logs y seguridad implementados**

**¡El sistema de gestión de usuarios está completamente listo! 🚀**
