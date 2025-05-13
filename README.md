# Neuropod

Neuropod es una plataforma para ejecutar contenedores Docker a demanda (como ComfyUI o Ubuntu) a través de una interfaz web, usando autenticación con Google y subdominios únicos para cada sesión de usuario.

## 🌐 Dominio

**Sitio principal**: [https://neuropod.online](https://neuropod.online)  
**Frontend**: `https://app.neuropod.online`  
**Backend API**: `https://api.neuropod.online`  
**Contenedores dinámicos**: `https://<subdominio>.neuropod.online`

---

## 🚀 Características principales

- Autenticación con Google OAuth2
- Backend Node.js (no contenerizado)
- Frontend React (no contenerizado)
- MongoDB local para persistencia
- Ejecución dinámica de Pods en Kubernetes (Minikube)
- NGINX Ingress Controller para enrutar subdominios únicos
- Exposición segura con Cloudflare Tunnel
- Gestión de saldo por usuario y facturación por uso
- WebSockets en tiempo real para estado y saldo

---

## 📦 Tecnologías utilizadas

- Node.js + Express
- React
- MongoDB + Mongoose
- Kubernetes (Minikube)
- Docker
- NGINX Ingress Controller
- Cloudflare Tunnel
- @kubernetes/client-node
- WebSockets
- OAuth2 (Google)

---

## 🧱 Arquitectura

```
Usuario → Cloudflare Tunnel → NGINX Ingress → Pods dinámicos (ComfyUI, Ubuntu)
                         ↘
                   api.neuropod.online → Backend Node.js
                         ↘
                   app.neuropod.online → Frontend React
                         ↘
                         MongoDB
```

---

## 🛠️ Instalación local

1. Instala Node.js, MongoDB y Docker
2. Inicia Minikube con Ingress habilitado:
   ```bash
   minikube start --driver=docker
   minikube addons enable ingress
   ```
3. Inicia MongoDB manualmente (si no es un servicio)
4. Crea el túnel de Cloudflare:
   ```bash
   cloudflared tunnel create neuropod-tunnel
   cloudflared tunnel route dns neuropod-tunnel neuropod.online
   ```
5. Crea el archivo `~/.cloudflared/config.yml` con rutas a `localhost`
6. Ejecuta backend (`npm run dev`) y frontend (`npm run dev`)

---

## 📁 Estructura del proyecto

```
/backend
  ├── controllers/
  ├── models/
  ├── routes/
  └── utils/

/frontend
  ├── src/
  └── public/

LICENSE
README.md
```

---

## 🧑‍⚖️ Licencia

Este proyecto está licenciado bajo la **Apache License 2.0**.  
Ver archivo [`LICENSE`](./LICENSE) para más detalles.

---

## ✉️ Autor

Proyecto desarrollado por **Marvin Zidane** como parte de su entorno de prácticas técnicas.

---
