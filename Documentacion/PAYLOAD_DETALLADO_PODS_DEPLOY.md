# 📤 NeuroPod - Payload de Creación de Pods COMPLETO

## 🚀 **Payload de Creación de Pods - Detalles Completos**
Este documento detalla el payload completo que el backend espera recibir al crear un nuevo pod, incluyendo todos los campos necesarios y sus respectivos casos de uso.

## 🔍 **Payload COMPLETO que recibe el backend:**

```javascript
// POST /api/pods - Payload COMPLETO
{
  // 🔧 CONFIGURACIÓN BÁSICA (siempre requerido)
  "name": "mi-pod-test",
  "gpu": "rtx-4050",
  "containerDiskSize": 20,
  "volumeDiskSize": 50,
  "ports": "8888, 3000, 7860",
  "enableJupyter": true,

  // 🎯 TIPO DE DESPLIEGUE (uno de los dos)
  "deploymentType": "template", // o "docker"
  
  // Si deploymentType === "template"
  "template": "template_uuid_1",
  
  // Si deploymentType === "docker" 
  "dockerImage": "ubuntu:22.04",

  // 👤 ASIGNACIÓN DE USUARIO (solo disponible para admin)
  "assignToUser": "cliente@email.com" // ⭐ ESTE ERA EL CAMPO FALTANTE
}
```

---

## 📋 **Casos de Uso del Payload:**

### **Caso 1: Cliente crea pod para sí mismo**
```javascript
{
  "name": "mi-pod-personal",
  "deploymentType": "template",
  "template": "template_uuid_1", 
  "gpu": "rtx-4050",
  "containerDiskSize": 10,
  "volumeDiskSize": 20,
  "ports": "8888",
  "enableJupyter": true
  // ❌ NO incluye "assignToUser" porque el cliente solo puede crear para sí mismo
}
```

### **Caso 2: Admin crea pod para sí mismo**
```javascript
{
  "name": "admin-testing-pod",
  "deploymentType": "docker",
  "dockerImage": "ubuntu:22.04",
  "gpu": "rtx-4080", 
  "containerDiskSize": 30,
  "volumeDiskSize": 100,
  "ports": "8888, 3000, 7860",
  "enableJupyter": false
  // ❌ NO incluye "assignToUser" porque va para el admin
}
```

### **Caso 3: Admin crea pod PARA un cliente** ⭐
```javascript
{
  "name": "pod-para-cliente",
  "deploymentType": "template",
  "template": "template_uuid_1",
  "gpu": "rtx-4050",
  "containerDiskSize": 15,
  "volumeDiskSize": 25,
  "ports": "8888, 7860",
  "enableJupyter": true,
  "assignToUser": "cliente@email.com" // ✅ ESTE ES EL CAMPO CLAVE
}
```

---

## 🖥️ **Diferencias en el Frontend:**

### **En AdminPodDeploy.tsx:**
```javascript
// El admin VE el campo "Asignar a Usuario"
const AdminPodDeploy = () => {
  const [assignToUser, setAssignToUser] = useState("");

  const handleSubmit = () => {
    const payload = {
      name,
      deploymentType,
      template: selectedTemplate,
      gpu: selectedGpu,
      // ... otros campos ...
      assignToUser: assignToUser || undefined // ✅ Se incluye si está lleno
    };
    
    // Enviar payload al backend
    fetch('/api/pods', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
  };

  return (
    <form>
      {/* Campos normales */}
      
      {/* 👤 CAMPO EXCLUSIVO PARA ADMIN */}
      <div>
        <label>Asignar a Usuario (opcional)</label>
        <input 
          type="email"
          placeholder="cliente@email.com"
          value={assignToUser}
          onChange={(e) => setAssignToUser(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Dejar vacío para crear el pod en tu cuenta de admin
        </p>
      </div>
    </form>
  );
};
```

### **En ClientPodDeploy.tsx:**
```javascript
// El cliente NO VE el campo "Asignar a Usuario"
const ClientPodDeploy = () => {
  const handleSubmit = () => {
    const payload = {
      name,
      deploymentType,
      template: selectedTemplate,
      gpu: selectedGpu,
      // ... otros campos ...
      // ❌ NO incluye assignToUser porque el cliente siempre crea para sí mismo
    };
    
    // Enviar payload al backend
    fetch('/api/pods', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
  };

  return (
    <form>
      {/* Campos normales - SIN campo de asignación */}
    </form>
  );
};
```

---

## 📊 **Resultado en Base de Datos:**

### **Caso: Admin crea para cliente**
```javascript
// Registro en MongoDB
{
  podId: "pod_uuid_1",
  podName: "pod-para-cliente",
  userId: "client_user_id", // ✅ ID del cliente (propietario)
  createdBy: "admin_user_id", // ✅ ID del admin (quien lo creó)
  userHash: "cli456", // ✅ Hash del cliente (para subdominios)
  // ... resto de campos
}
```

### **Caso: Cliente crea para sí mismo**
```javascript
// Registro en MongoDB  
{
  podId: "pod_uuid_2", 
  podName: "mi-pod-personal",
  userId: "client_user_id", // ✅ ID del cliente
  createdBy: "client_user_id", // ✅ Mismo ID (se creó a sí mismo)
  userHash: "cli456", // ✅ Hash del cliente
  // ... resto de campos
}
```

---

## 🔍 **Comportamiento en las Páginas de Pods:**

### **En /admin/pods:**
```jsx
// Admin puede ver:
// 1. Sus propios pods (userId === admin_id)
// 2. Pods de cualquier cliente al buscar por email

// Al buscar "cliente@email.com":
GET /api/pods?userEmail=cliente@email.com

// Respuesta incluye tanto:
// - Pods creados por el cliente para sí mismo
// - Pods creados por admin para el cliente
```

### **En /client/pods:**
```jsx
// Cliente solo ve:
// - Pods donde userId === su propio ID
// - No importa quién los creó (createdBy)

GET /api/pods // Automáticamente filtrado por el userId del token JWT
```

---

## 🎯 **Resumen:**

- ✅ **assignToUser**: Campo opcional, solo disponible para admins
- ✅ **Vacío**: Pod se crea para el usuario actual (admin o cliente)
- ✅ **Con email**: Pod se crea para el cliente especificado (solo admin)
- ✅ **Validaciones**: Backend verifica permisos y existencia del usuario
- ✅ **Base de datos**: Distingue entre propietario (userId) y creador (createdBy)