# Comandos útiles para debugging
Write-Host "=== ESTADO DE CONFIGURACIÓN ===" -ForegroundColor Green
kubectl get nodes -o wide
kubectl get pv,pvc
kubectl top nodes  # (requiere metrics-server)

Write-Host "=== VERIFICAR ALMACENAMIENTO ===" -ForegroundColor Yellow
kubectl get storageclass
kubectl describe pv neuropod-pv-global

Write-Host "=== VERIFICAR INGRESS ===" -ForegroundColor Cyan
kubectl get ingressclass
kubectl get configmap -n ingress-nginx nginx-configuration -o yaml