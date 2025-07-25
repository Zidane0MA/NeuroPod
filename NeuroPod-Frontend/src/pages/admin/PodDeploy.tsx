import React, { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Server, HardDrive, HelpCircle, Infinity as InfinityIcon } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { podService } from "@/services/pod.service";
import { pricingService, PricingData } from "@/services/pricing.service";
import { PodCreateParams } from "@/types/pod";
import { Template } from "@/types/template";

interface GpuOption {
  id: string;
  name: string;
  available: boolean;
  price: number;
  vram: string;
  cores: number;
  image: string;
}

// GPUs se cargan dinámicamente desde el servicio de precios

const AdminPodDeploy = () => {
  const [selectedGpu, setSelectedGpu] = useState<GpuOption | null>(null);
  const [containerDiskSize, setContainerDiskSize] = useState(10);
  const [volumeDiskSize, setVolumeDiskSize] = useState(20);
  const [showConfigSection, setShowConfigSection] = useState(false);
  const [useJupyter, setUseJupyter] = useState(true);
  const [podName, setPodName] = useState("");
  const [ports, setPorts] = useState("8888");
  const [template, setTemplate] = useState("ubuntu");
  const [deploymentType, setDeploymentType] = useState<'template' | 'docker'>("template");
  const [dockerImage, setDockerImage] = useState("");
  const [userAssign, setUserAssign] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
  const [showDescription, setShowDescription] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [gpuOptions, setGpuOptions] = useState<GpuOption[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const markdownContent = selectedTemplate?.description || "Sin descripción";
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const form = useForm();

  // Cargar precios al montar el componente
  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      setLoadingPricing(true);
      const pricingData = await pricingService.getPricing();
      setPricing(pricingData);
      
      // Convertir a formato GpuOption
      const options = pricingService.convertToGpuOptions(pricingData);
      setGpuOptions(options);
    } catch (error) {
      console.error('Error loading pricing:', error);
      // Fallback a opciones por defecto
      setGpuOptions([
        {
          id: "rtx-4050",
          name: "NVIDIA RTX 4050",
          available: true,
          price: 2.50,
          vram: "6GB",
          cores: 2560,
          image: "gpu-4050.jpg"
        },
        {
          id: "rtx-4080",
          name: "NVIDIA RTX 4080",
          available: false,
          price: 4.99,
          vram: "16GB",
          cores: 9728,
          image: "gpu-4080.jpg"
        },
        {
          id: "rtx-4090",
          name: "NVIDIA RTX 4090",
          available: false,
          price: 8.99,
          vram: "24GB",
          cores: 16384,
          image: "gpu-4090.jpg"
        }
      ]);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleTemplateSelect = useCallback((template: Template) => {
    setSelectedTemplate(template);
    const allPorts = template.httpPorts.map(p => p.port.toString()).join(", ");
    setPorts(allPorts);
    setContainerDiskSize(template.containerDiskSize);
    setVolumeDiskSize(template.volumeDiskSize);
    setShowTemplateModal(false);
  }, []);

  const handleOpenTemplateModal = useCallback(async () => {
    setShowTemplateModal(true);
    setLoadingTemplates(true);
    try {
      const { templateService } = await import('@/services/template.service');
      const templates = await templateService.getTemplates();
      setAvailableTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const handleGpuSelect = (gpu: GpuOption) => {
    if (gpu.available) {
      setSelectedGpu(gpu);
      setShowConfigSection(true);
    }
  };

  const handleStartDeploy = async () => {
    if (!podName.trim()) {
      toast.error('El nombre del pod es obligatorio');
      return;
    }
    
    if (deploymentType === "docker" && !dockerImage.trim()) {
      toast.error('La imagen Docker es obligatoria');
      return;
    }
    
    if (deploymentType === "template" && !selectedTemplate) {
      toast.error('Debes seleccionar una plantilla');
      return;
    }
    
    if (!selectedGpu) {
      toast.error('Debes seleccionar una GPU');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const params: PodCreateParams = {
        name: podName,
        deploymentType: deploymentType,
        template: deploymentType === "template" && selectedTemplate ? selectedTemplate.id : undefined,
        dockerImage: deploymentType === "docker" ? dockerImage : 
                    (deploymentType === "template" && selectedTemplate ? selectedTemplate.dockerImage : undefined),
        gpu: selectedGpu.id,
        containerDiskSize,
        volumeDiskSize,
        ports,
        enableJupyter: useJupyter,
        assignToUser: userAssign.trim() || undefined
      };
      
      console.log('Enviando datos de creación de pod:', params);
      
      const response = await podService.createPod(params);
      
      toast.success(`Pod ${podName} desplegado correctamente${userAssign ? ` para ${userAssign}` : ''}`);
      
      navigate("/admin/pods");
    } catch (error: any) {
      console.error('Error al desplegar pod:', error);
      
      if (error.response?.data?.message) {
        toast.error(`Error: ${error.response.data.message}`);
      } else {
        toast.error('Error al desplegar el pod. Por favor, intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular precios usando la configuración actual
  const containerDiskPrice = pricing ? pricing.storage.containerDisk.price * containerDiskSize : 0.05 * containerDiskSize;
  const volumeDiskPrice = pricing ? pricing.storage.volumeDisk.price * volumeDiskSize : 0.1 * volumeDiskSize;
  const gpuPrice = selectedGpu?.price || 0;
  const totalPrice = gpuPrice + containerDiskPrice + volumeDiskPrice;

  return (
    <DashboardLayout title="Desplegar Pod">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Desplegar Pod</h1>
          <p className="text-muted-foreground">Configura y despliega un nuevo pod con GPU</p>
        </div>
        
        <div className="text-sm text-right">
          <div className="text-muted-foreground">Saldo</div>
          <div className="font-semibold">
            {user?.role === "admin" ? (
              <span className="flex items-center gap-1 text-primary justify-end">
                <InfinityIcon className="h-4 w-4" />
                <span>€</span>
              </span>
            ) : (
              typeof user?.balance === "number"
                ? `${user.balance.toFixed(2)} €`
                : "0 €"
            )}
          </div>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Selecciona una GPU</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPricing ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <span className="ml-2">Cargando opciones de GPU...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {gpuOptions.map((gpu) => (
              <Card 
                key={gpu.id} 
                className={`cursor-pointer border-2 transition-all ${selectedGpu?.id === gpu.id ? 'border-primary' : 'border-border'} 
                          ${!gpu.available && 'opacity-60'}`}
                onClick={() => handleGpuSelect(gpu)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    {gpu.name}
                    {!gpu.available && (
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">Próximamente</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precio</span>
                      <span className="font-medium">{gpu.price.toFixed(2)} €/hora</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VRAM</span>
                      <span>{gpu.vram}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CUDA Cores</span>
                      <span>{gpu.cores}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {showConfigSection && (
        <Form {...form}>
          <form className="space-y-8">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Configuración del Pod</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
                  <div className="space-y-4 lg:order-1">
                    <FormField
                      control={form.control}
                      name="podName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Pod</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Mi-Pod" 
                              value={podName} 
                              onChange={(e) => setPodName(e.target.value)} 
                            />
                          </FormControl>
                          <FormDescription>
                            Un nombre único para identificar tu pod
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="userAssign"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asignar a Usuario</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="usuario@example.com" 
                              value={userAssign} 
                              onChange={(e) => setUserAssign(e.target.value)} 
                            />
                          </FormControl>
                          <FormDescription>
                            Email del usuario al que se asignará este pod (opcional)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <Label>Tipo de Despliegue</Label>
                      <Select 
                        value={deploymentType} 
                        onValueChange={(value) => setDeploymentType(value as 'template' | 'docker')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo de despliegue" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="template">Template</SelectItem>
                          <SelectItem value="docker">Imagen Docker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {deploymentType === "template" ? (
                      <div className="space-y-2">
                        <Label>Template</Label>
                        <div className="flex items-center gap-2">
                          {selectedTemplate ? (
                            <>
                              <Button
                                variant="outline"
                                className="w-full justify-start overflow-hidden text-ellipsis"
                                type="button"
                                onClick={handleOpenTemplateModal}
                              >
                                {selectedTemplate.name} seleccionado
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                type="button"
                                onClick={() => setShowDescription(true)}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              type="button"
                              onClick={handleOpenTemplateModal}
                            >
                              Elegir template
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="dockerImage">Imagen Docker</Label>
                        <Input 
                          id="dockerImage" 
                          value={dockerImage} 
                          onChange={(e) => setDockerImage(e.target.value)} 
                          placeholder="ej: nvidia/cuda:11.4.2-base-ubuntu20.04"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Especifica una imagen Docker para usar en tu pod
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 pt-2 lg:col-span-2">
                      <Checkbox 
                        id="jupyter" 
                        checked={useJupyter} 
                        onCheckedChange={(checked) => {
                          setUseJupyter(!!checked);
                          if (checked && !ports.includes("8888")) {
                            setPorts(ports ? `${ports}, 8888` : "8888");
                          }
                        }} 
                      />
                      <label
                        htmlFor="jupyter"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Usar Jupyter Lab (puerto 8888)
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-6 lg:order-2">                  
                    <div className="space-y-4">
                      <Label className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Container Disk (Archivos Temporales)
                      </Label>
                      <div className="flex justify-between">
                        <span className="text-sm">{containerDiskSize} GB</span>
                        <span className="text-sm text-muted-foreground">{(containerDiskPrice).toFixed(2)} €/hora</span>
                      </div>
                      <Slider
                        value={[containerDiskSize]}
                        max={100}
                        min={5}
                        step={5}
                        onValueChange={(val) => setContainerDiskSize(val[0])}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Volume Disk (Datos Persistentes)
                      </Label>
                      <div className="flex justify-between">
                        <span className="text-sm">{volumeDiskSize} GB</span>
                        <span className="text-sm text-muted-foreground">{(volumeDiskPrice).toFixed(2)} €/hora</span>
                      </div>
                      <Slider
                        value={[volumeDiskSize]}
                        max={150}
                        min={10}
                        step={5}
                        onValueChange={(val) => setVolumeDiskSize(val[0])}
                      />
                    </div>

                    {/* Secciones de puertos movidas aquí visualmente */}
                    <div className="space-y-2 lg:col-span-2 pt-4 lg:pt-0">
                      <Label htmlFor="ports">Puertos HTTP expuestos (separados por comas)</Label>
                      <Input 
                        id="ports" 
                        value={ports} 
                        onChange={(e) => setPorts(e.target.value)} 
                        placeholder={deploymentType === "docker" ? "8888" : "puertos del template"}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {deploymentType === "template" 
                          ? "Los puertos se cargan automáticamente desde el template seleccionado" 
                          : "Especifica los puertos HTTP que necesitas exponer"}
                      </p>
                    </div>
                    <div className="space-y-2 lg:col-span-2 pt-2">
                      <Label htmlFor="tcpPorts">Puertos TCP expuestos (separados por comas) - Decorativo</Label>
                      <Input 
                        id="tcpPorts" 
                        value="" 
                        onChange={() => {}} 
                        placeholder="22, 3306"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Funcionalidad no implementada. Solo para visualización.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>{selectedGpu?.name}</span>
                    <span>{selectedGpu?.price?.toFixed(2)} €/hora</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Container Disk ({containerDiskSize} GB)</span>
                    <span>{containerDiskPrice.toFixed(2)} €/hora</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volume Disk ({volumeDiskSize} GB)</span>
                    <span>{volumeDiskPrice.toFixed(2)} €/hora</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{totalPrice.toFixed(2)} €/hora</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Pod Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>GPU</span>
                    <span>{selectedGpu?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VRAM</span>
                    <span>{selectedGpu?.vram}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Storage</span>
                    <span>{containerDiskSize + volumeDiskSize} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo</span>
                    <span className="capitalize">{deploymentType === "template" ? "Template" : "Docker"}</span>
                  </div>
                  {deploymentType === "template" && selectedTemplate && (
                    <div className="flex justify-between">
                      <span>Template</span>
                      <span>{selectedTemplate.name}</span>
                    </div>
                  )}
                  {deploymentType === "docker" && (
                    <div className="flex justify-between">
                      <span>Imagen</span>
                      <span className="text-sm break-all">{dockerImage}</span>
                    </div>
                  )}
                  {userAssign && (
                    <div className="flex justify-between">
                      <span>Usuario</span>
                      <span>{userAssign}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="button" 
                className="w-full md:w-auto" 
                size="lg" 
                onClick={handleStartDeploy}
                disabled={!podName.trim() || (deploymentType === "docker" && !dockerImage.trim()) || isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Desplegando...
                  </div>
                ) : (
                  <>
                    <Server className="mr-2 h-4 w-4" />
                    Start Deploy
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Template Description Modal */}
      <Dialog open={showDescription} onOpenChange={setShowDescription}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Descripción del Template</DialogTitle>
          </DialogHeader>
          <div className="prose max-w-none no-scrollbar overflow-auto" style={{ maxHeight: 500 }}>
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-3xl h-[80vh] max-h-[800px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleccionar Plantilla</DialogTitle>
          </DialogHeader>
          
          {loadingTemplates ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : availableTemplates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <p className="text-muted-foreground mb-2">No hay plantillas disponibles</p>
                <p className="text-sm">Contacta con el administrador para crear nuevas plantillas</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
              {availableTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer border-2 hover:border-primary hover:shadow-md transition-all
                    ${selectedTemplate?.id === template.id ? 'border-primary' : 'border-border'}`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle>{template.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Imagen:</span> {template.dockerImage}
                    </p>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="text-xs">
                      <span className="font-medium">HTTP:</span> {template.httpPorts.map(p => `${p.port} (${p.serviceName})`).join(", ")}
                      {template.tcpPorts.length > 0 && (
                        <><br /><span className="font-medium">TCP:</span> {template.tcpPorts.map(p => `${p.port} (${p.serviceName})`).join(", ")}</>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span>Container Disk: {template.containerDiskSize} GB</span>
                      <span>Volume Disk: {template.volumeDiskSize} GB</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminPodDeploy;
