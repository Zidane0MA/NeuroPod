# Comandos para verficar que todo funciona correctamente

> **Nota:** Algunos de estos comandos estan bajo el contexto del manifiesto ``test_gpu_pod.yaml``

```powershell
# Verificar que Minikube esté funcionando
minikube status

# Comprobar puerto
netstat -an | findstr :443

# Verificar que tienes acceso a GPU
kubectl get nodes -o jsonpath='{.items[*].status.allocatable.nvidia\.com/gpu}'

# Aplicar los manifiestos de NeuroPod
kubectl apply -f neuropod-k8s.yaml

# Ver puertos asignados
kubectl get service -n ingress-nginx ingress-nginx-controller

# Ver estado de todos los pods
kubectl get pods -n default -o wide 

# Verificar que todo se aplicó correctamente
kubectl get configmaps | findstr neuropod
kubectl get storageclass standard
kubectl get pv neuropod-pv-global
kubectl get secret neuropod-tls

# Verificar NGINX Ingress Controller
kubectl get pods -n ingress-nginx
kubectl get configmap nginx-configuration -n ingress-nginx

# Probar el pod de prueba ComfyUI
kubectl apply -f test_gpu_pod.yaml

# Verificar que el pod se crea correctamente
kubectl get pods comfyui-gpu-test
kubectl describe pod comfyui-gpu-test

# Ver logs del pod para debugging
kubectl logs comfyui-gpu-test

# Verificar el servicio e ingress
kubectl get svc comfyui-gpu-test-service
kubectl get ingress comfyui-gpu-test-ingress
```

# Comandos para verificar si se usa ingress correctamente

```powershell
# 1. Verificar que el secret existe
kubectl get secret neuropod-tls -o yaml

# 2. Verificar que NGINX está usando el certificado
kubectl describe ingress comfyui-gpu-test-ingress

# 3. Ver logs de NGINX para errores de certificado
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | Select-String "ssl|tls|cert"

# 4. Verificar que el certificado tiene el dominio correcto
$certBase64 = kubectl get secret neuropod-tls -o jsonpath="{.data.tls\.crt}"
$certBytes = [Convert]::FromBase64String($certBase64)
[System.Text.Encoding]::UTF8.GetString($certBytes) | Out-File -Encoding ascii tls.crt
openssl x509 -in tls.crt -text -noout | findstr "DNS:"

# 5. Probar el certificado manualmente con OpenSSL
openssl s_client -connect localhost:443 -servername user-123-pod-456.neuropod.online -verify_return_error
```