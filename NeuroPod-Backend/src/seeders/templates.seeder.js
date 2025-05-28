const mongoose = require('mongoose');
const Template = require('../models/Template.model');
const User = require('../models/User.model');

const defaultTemplates = [
  {
    name: 'Ubuntu Base',
    dockerImage: 'ubuntu:22.04',
    httpPorts: [
      { port: 8888, serviceName: 'Jupyter Lab' },
      { port: 8080, serviceName: 'Web Server' }
    ],
    tcpPorts: [
      { port: 22, serviceName: 'SSH' }
    ],
    containerDiskSize: 10,
    volumeDiskSize: 20,
    volumePath: '/workspace',
    description: `# Ubuntu Base Template

Esta plantilla proporciona un entorno Ubuntu 22.04 básico con las siguientes características:

## Servicios incluidos
- **Jupyter Lab** en puerto 8888
- **Servidor web básico** en puerto 8080
- **SSH** en puerto 22

## Características
- Sistema operativo: Ubuntu 22.04 LTS
- Espacio en disco del contenedor: 10 GB
- Volumen persistente: 20 GB montado en /workspace
- Ideal para desarrollo general y experimentación

## Casos de uso
- Desarrollo web
- Experimentación con Python
- Prototipado rápido
- Entorno de desarrollo general`
  },
  {
    name: 'ComfyUI',
    dockerImage: 'comfyui/comfyui:latest',
    httpPorts: [
      { port: 8188, serviceName: 'ComfyUI Web Interface' },
      { port: 8888, serviceName: 'Jupyter Lab' }
    ],
    tcpPorts: [
      { port: 22, serviceName: 'SSH' }
    ],
    containerDiskSize: 20,
    volumeDiskSize: 50,
    volumePath: '/workspace',
    description: `# ComfyUI Template

Plantilla preconfigurada para **ComfyUI**, una interfaz gráfica potente para Stable Diffusion.

## Servicios incluidos
- **ComfyUI Web Interface** en puerto 8188
- **Jupyter Lab** en puerto 8888 para experimentación
- **SSH** en puerto 22

## Características
- ComfyUI preinstalado y configurado
- Modelos base incluidos
- Espacio en disco del contenedor: 20 GB
- Volumen persistente: 50 GB para modelos y outputs
- GPU optimizada para inferencia de IA

## Casos de uso
- Generación de imágenes con IA
- Experimentación con Stable Diffusion
- Workflows de ComfyUI personalizados
- Procesamiento de imágenes con IA

## Requisitos
- Se recomienda GPU con al menos 8GB VRAM
- Conexión rápida a internet para descarga de modelos`
  },
  {
    name: 'Python Data Science',
    dockerImage: 'jupyter/datascience-notebook:latest',
    httpPorts: [
      { port: 8888, serviceName: 'Jupyter Lab' },
      { port: 8787, serviceName: 'RStudio' },
      { port: 8080, serviceName: 'MLflow UI' }
    ],
    tcpPorts: [
      { port: 22, serviceName: 'SSH' }
    ],
    containerDiskSize: 15,
    volumeDiskSize: 30,
    volumePath: '/workspace',
    description: `# Python Data Science Template

Entorno completo para ciencia de datos con Python, R y herramientas de machine learning.

## Servicios incluidos
- **Jupyter Lab** en puerto 8888 con kernels de Python y R
- **RStudio** en puerto 8787
- **MLflow UI** en puerto 8080 para tracking de experimentos
- **SSH** en puerto 22

## Librerías incluidas
- NumPy, Pandas, Matplotlib, Seaborn
- Scikit-learn, TensorFlow, PyTorch
- XGBoost, LightGBM
- Dask para computación distribuida
- R con tidyverse y caret

## Casos de uso
- Análisis exploratorio de datos
- Machine Learning y Deep Learning
- Visualización de datos
- Experimentación con modelos
- Investigación y prototipado`
  }
];

const seedTemplates = async () => {
  try {
    console.log('🌱 Iniciando seeder de templates...');
    
    // Buscar usuario admin para asignar como creador
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('⚠️  No se encontró usuario admin. Creando templates sin creador específico...');
      return;
    }

    // Verificar si ya existen templates
    const existingTemplates = await Template.countDocuments();
    if (existingTemplates > 0) {
      console.log(`📋 Ya existen ${existingTemplates} templates. Saltando seeder...`);
      return;
    }

    // Crear templates con el admin como creador
    const templatesWithCreator = defaultTemplates.map(template => ({
      ...template,
      createdBy: adminUser._id
    }));

    const createdTemplates = await Template.insertMany(templatesWithCreator);
    
    console.log(`✅ ${createdTemplates.length} templates creados exitosamente:`);
    createdTemplates.forEach(template => {
      console.log(`   - ${template.name} (${template.dockerImage})`);
    });

  } catch (error) {
    console.error('❌ Error al crear templates:', error);
    throw error;
  }
};

module.exports = {
  seedTemplates,
  defaultTemplates
};
