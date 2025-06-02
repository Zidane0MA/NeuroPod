# Este script de PowerShell sirve para comprobar los manifestos de Kubernetes arrancados de forma manual (Caso_template_sin_8888-verdadero.yaml)
# y verificar que todo está correctamente configurado en un entorno de Minikube con GPU.
# Requiere que tengas iniciado los servicios de Minikube y cloudflared tunnel.

Write-Host "=== Verificando que todo funciona correctamente ===" -ForegroundColor Green

# Verificar que Minikube esté funcionando
Write-Host "Minikube Status" -ForegroundColor Cyan
minikube status

# Comprobar puerto
Write-Host "Comprobando puerto 443" -ForegroundColor Cyan
netstat -an | findstr :443

# Verificar que tienes acceso a GPU
Write-Host "Verificando acceso a GPU" -ForegroundColor Cyan
kubectl get nodes -o jsonpath='{.items[*].status.allocatable.nvidia\.com/gpu}'

# Aplicar los manifiestos de NeuroPod
Write-Host "Aplicando manifiestos de NeuroPod" -ForegroundColor Cyan
kubectl apply -f neuropod-k8s.yaml

# Ver puertos asignados
Write-Host "Verificando puertos asignados" -ForegroundColor Cyan
kubectl get service -n ingress-nginx ingress-nginx-controller

# Ver estado de todos los pods
Write-Host "Verificando estado de los pods" -ForegroundColor Cyan
kubectl get pods -n default -o wide 

Write-Host "=== Verificación de implementación ===" -ForegroundColor Yellow
kubectl get configmaps | findstr neuropod
kubectl get storageclass standard
kubectl get pv neuropod-pv-global
kubectl get secret neuropod-tls

Write-Host "=== Verificación de NGINX Ingress Controller ===" -ForegroundColor Yellow
kubectl get pods -n ingress-nginx
kubectl get configmap nginx-configuration -n ingress-nginx

Write-Host "=== Probar el pod de prueba ComfyUI ===" -ForegroundColor Cyan
kubectl apply -f test_gpu_pod.yaml
kubectl get pods comfyui-gpu-test
kubectl describe pod comfyui-gpu-test

Write-Host "Verificando logs del pod para debugging" -ForegroundColor Cyan
kubectl logs comfyui-gpu-test

Write-Host "Verificando servicio e ingress" -ForegroundColor Cyan
kubectl get svc comfyui-gpu-test-service
kubectl get ingress comfyui-gpu-test-ingress

Write-Host "=== Verificación de uso de Ingress ===" -ForegroundColor Green

# 1. Verificar que el secret existe
Write-Host "Verificando que el secret neuropod-tls existe" -ForegroundColor Yellow
kubectl get secret neuropod-tls -o yaml

# 2. Verificar que NGINX está usando el certificado
Write-Host "Verificando que NGINX usa el certificado" -ForegroundColor Yellow
kubectl describe ingress comfyui-gpu-test-ingress

# 3. Ver logs de NGINX para errores de certificado
Write-Host "Verificando logs de NGINX por errores de certificado" -ForegroundColor Yellow
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | Select-String "ssl|tls|cert"

# 4. Verificar que el certificado tiene el dominio correcto
Write-Host "Verificando certificado de dominio" -ForegroundColor Yellow
$certBase64 = kubectl get secret neuropod-tls -o jsonpath="{.data.tls\.crt}"
$certBytes = [Convert]::FromBase64String($certBase64)
[System.Text.Encoding]::UTF8.GetString($certBytes) | Out-File -Encoding ascii tls.crt
openssl x509 -in tls.crt -text -noout | findstr "DNS:"

# 5. Probar el certificado manualmente con OpenSSL
Write-Host "Probando certificado manualmente con OpenSSL" -ForegroundColor Yellow
openssl s_client -connect localhost:443 -servername user-123-pod-456.neuropod.online -verify_return_error
