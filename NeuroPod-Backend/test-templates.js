const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Template = require('./src/models/Template.model');
const User = require('./src/models/User.model');

dotenv.config();

const testTemplates = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plataforma');
    console.log('✅ Conectado a MongoDB');

    // Buscar usuario admin
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No se encontró usuario admin');
      return;
    }
    console.log('👤 Usuario admin encontrado:', adminUser.email);

    // Crear plantilla de prueba
    const testTemplate = {
      name: 'Test Template ' + Date.now(),
      dockerImage: 'ubuntu:latest',
      httpPorts: [
        { port: 8080, serviceName: 'Web Server' },
        { port: 8888, serviceName: 'Jupyter Lab' }
      ],
      tcpPorts: [
        { port: 22, serviceName: 'SSH' }
      ],
      containerDiskSize: 15,
      volumeDiskSize: 30,
      volumePath: '/workspace',
      description: '# Test Template\nPlantilla de prueba para verificar funcionamiento.',
      createdBy: adminUser._id
    };

    console.log('📝 Creando plantilla de prueba...');
    const savedTemplate = await Template.create(testTemplate);
    console.log('✅ Plantilla creada:', savedTemplate.name, 'ID:', savedTemplate.id);

    // Listar todas las plantillas
    console.log('📋 Listando todas las plantillas...');
    const allTemplates = await Template.find().populate('createdBy', 'name email');
    console.log(`📊 Total de plantillas: ${allTemplates.length}`);
    
    allTemplates.forEach(template => {
      console.log(`  - ${template.name} (${template.dockerImage}) - Creado por: ${template.createdBy?.email || 'N/A'}`);
    });

    // Test de serialización JSON
    console.log('🔍 Probando serialización JSON...');
    const templateJson = JSON.stringify(savedTemplate);
    const parsedTemplate = JSON.parse(templateJson);
    console.log('✅ ID en JSON:', parsedTemplate.id);
    console.log('✅ _id en JSON:', parsedTemplate._id);

    console.log('✅ Test completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
};

testTemplates();
