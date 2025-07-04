import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Template, PortMapping } from "@/types/template";
import { templateService } from "@/services/template.service";
import { Plus, Minus, Server, HardDrive, Folder, Network, Trash2, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Template, "id">>({
    name: "",
    dockerImage: "",
    httpPorts: [{ port: 8888, serviceName: "Jupyter Lab" }],
    tcpPorts: [{ port: 22, serviceName: "SSH" }],
    containerDiskSize: 10,
    volumeDiskSize: 20,
    volumePath: "/workspace",
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      console.log('Fetching templates from backend...');
      const data = await templateService.getTemplates();
      console.log('Templates received:', data);
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error("Error al cargar plantillas: " + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditMode(true);
      setCurrentTemplateId(template.id);
      setForm({
        name: template.name,
        dockerImage: template.dockerImage,
        httpPorts: template.httpPorts,
        tcpPorts: template.tcpPorts,
        containerDiskSize: template.containerDiskSize,
        volumeDiskSize: template.volumeDiskSize,
        volumePath: template.volumePath,
        description: template.description
      });
    } else {
      setEditMode(false);
      setCurrentTemplateId(null);
      setForm({
        name: "",
        dockerImage: "",
        httpPorts: [{ port: 8888, serviceName: "Jupyter Lab" }],
        tcpPorts: [{ port: 22, serviceName: "SSH" }],
        containerDiskSize: 10,
        volumeDiskSize: 20,
        volumePath: "/workspace",
        description: ""
      });
    }
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSliderChange = (field: "containerDiskSize" | "volumeDiskSize", value: number) => {
    setForm({ ...form, [field]: value });
  };

  const handlePortChange = (type: "httpPorts" | "tcpPorts", index: number, field: "port" | "serviceName", value: string | number) => {
    const ports = [...form[type]];
    ports[index] = { ...ports[index], [field]: value };
    setForm({ ...form, [type]: ports });
  };

  const addPort = (type: "httpPorts" | "tcpPorts") => {
    const ports = [...form[type]];
    ports.push({ port: 0, serviceName: "" });
    setForm({ ...form, [type]: ports });
  };

  const removePort = (type: "httpPorts" | "tcpPorts", index: number) => {
    const ports = [...form[type]];
    ports.splice(index, 1);
    setForm({ ...form, [type]: ports });
  };

  const isFormValid = () => {
    if (!form.name.trim() || !form.dockerImage.trim()) return false;
    const hasValidHttpPort = form.httpPorts.some(port => 
      port.port > 0 && port.serviceName.trim() !== ""
    );
    if (!hasValidHttpPort) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      console.log('Submitting template:', form);
      
      if (editMode && currentTemplateId) {
        const updatedTemplate = await templateService.updateTemplate(currentTemplateId, form);
        console.log('Template updated:', updatedTemplate);
        setTemplates((prev) => prev.map(t => t.id === currentTemplateId ? updatedTemplate : t));
        toast.success("Plantilla actualizada correctamente");
      } else {
        const newTemplate = await templateService.createTemplate(form);
        console.log('Template created:', newTemplate);
        setTemplates((prev) => [...prev, newTemplate]);
        toast.success("Plantilla creada correctamente");
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error submitting template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(editMode ? `Error al actualizar plantilla: ${errorMessage}` : `Error al crear plantilla: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta plantilla?")) return;
    try {
      console.log('Deleting template:', id);
      await templateService.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Plantilla eliminada");
    } catch (err) {
      console.error('Error deleting template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al eliminar plantilla: ${errorMessage}`);
    }
  };

  return (
    <DashboardLayout title="Administrar Plantillas">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Plantillas</h1>
          <p className="text-muted-foreground">Gestiona y crea plantillas de despliegue para los pods</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
          <span>Crear Plantilla</span>
        </Button>
      </div>
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando plantillas...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">No hay plantillas disponibles</p>
          <p className="text-sm text-muted-foreground">Crea tu primera plantilla haciendo clic en "Crear Plantilla"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="group shadow-sm border border-border bg-card hover:shadow-lg transition-shadow relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row justify-between items-center pb-2 bg-muted/50 border-b">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-semibold text-primary group-hover:underline">{tpl.name}</CardTitle>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{tpl.dockerImage}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleOpenModal(tpl)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(tpl.id)} title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-3 pb-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Network className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-700">HTTP:</span>
                    <span className="ml-1">{tpl.httpPorts.map(p => `${p.port} (${p.serviceName})`).join(", ")}</span>
                  </div>
                  {tpl.tcpPorts.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Network className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-gray-700">TCP:</span>
                      <span className="ml-1">{tpl.tcpPorts.map(p => `${p.port} (${p.serviceName})`).join(", ")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-gray-700">Container Disk:</span> {tpl.containerDiskSize} GB
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-4 w-4 text-violet-500" />
                    <span className="font-medium text-gray-700">Volume Disk:</span> {tpl.volumeDiskSize} GB
                  </div>
                  <div className="flex items-center gap-1">
                    <Folder className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Path:</span> {tpl.volumePath}
                  </div>
                </div>
                {tpl.description && (
                  <div className="mt-2 text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                    {tpl.description}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-8 overflow-visible">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Plantilla' : 'Crear Plantilla'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 h-full">
            <ScrollArea className="w-full pr-6 max-h-[70vh] overflow-y-auto overflow-x-visible no-scrollbar">
              <div className="space-y-8 pb-4">
              {/* Nombre y Docker Image */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Template *</Label>
                  <Input 
                    id="name"
                    name="name" 
                    placeholder="Ubuntu Base" 
                    value={form.name} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dockerImage">Imagen Docker *</Label>
                  <Input 
                    id="dockerImage"
                    name="dockerImage" 
                    placeholder="ubuntu:22.04" 
                    value={form.dockerImage} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              {/* Puertos HTTP */}
              <div className="space-y-3">
                <Label>Puertos HTTP a exponer *</Label>
                {form.httpPorts.map((port, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex gap-2 flex-1">
                      <Input
                        type="number"
                        placeholder="Puerto"
                        value={port.port || ""}
                        onChange={(e) => handlePortChange("httpPorts", index, "port", parseInt(e.target.value) || 0)}
                        className="w-32"
                      />
                      <Input
                        placeholder="Nombre del servicio"
                        value={port.serviceName}
                        onChange={(e) => handlePortChange("httpPorts", index, "serviceName", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    {index === form.httpPorts.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => addPort("httpPorts")}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    {form.httpPorts.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removePort("httpPorts", index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {/* Puertos TCP */}
              <div className="space-y-3">
                <Label>Puertos TCP a exponer (Decorativo)</Label>
                {form.tcpPorts.map((port, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex gap-2 flex-1">
                      <Input
                        type="number"
                        placeholder="Puerto"
                        value={port.port || ""}
                        onChange={(e) => handlePortChange("tcpPorts", index, "port", parseInt(e.target.value) || 0)}
                        className="w-32"
                      />
                      <Input
                        placeholder="Nombre del servicio"
                        value={port.serviceName}
                        onChange={(e) => handlePortChange("tcpPorts", index, "serviceName", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    {index === form.tcpPorts.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => addPort("tcpPorts")}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    {form.tcpPorts.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removePort("tcpPorts", index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {/* Tamaños de disco */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Label>Container Disk Size: {form.containerDiskSize} GB</Label>
                  <Slider 
                    min={5} 
                    max={100} 
                    step={5} 
                    value={[form.containerDiskSize]} 
                    onValueChange={val => handleSliderChange("containerDiskSize", val[0])} 
                  />
                </div>
                <div className="space-y-6">
                  <Label>Volume Disk Size: {form.volumeDiskSize} GB</Label>
                  <Slider 
                    min={10} 
                    max={150} 
                    step={5} 
                    value={[form.volumeDiskSize]} 
                    onValueChange={val => handleSliderChange("volumeDiskSize", val[0])} 
                  />
                </div>
              </div>
              {/* Volume Path */}
              <div className="space-y-2">
                <Label htmlFor="volumePath">Volume Path</Label>
                <Input 
                  id="volumePath"
                  name="volumePath" 
                  placeholder="/workspace" 
                  value={form.volumePath} 
                  onChange={handleChange} 
                />
              </div>
              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción (Markdown)</Label>
                <Textarea 
                  id="description"
                  name="description" 
                  placeholder="## Mi plantilla\nDescripción detallada de la plantilla..." 
                  value={form.description} 
                  onChange={handleChange} 
                  rows={6}
                />
              </div>
            </div>
            </ScrollArea>
          </div>
          <DialogFooter className="mt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !isFormValid()}
            >
              {submitting ? "Guardando..." : (editMode ? "Actualizar" : "Crear")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminTemplates;
