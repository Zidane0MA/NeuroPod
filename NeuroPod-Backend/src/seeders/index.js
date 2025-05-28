const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { seedTemplates } = require('./templates.seeder');

// Cargar variables de entorno
dotenv.config();

const runSeeders = async () => {
  try {
    console.log('🚀 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plataforma');
    console.log('✅ Conectado a MongoDB');

    console.log('🌱 Ejecutando seeders...');
    await seedTemplates();
    
    console.log('✅ Seeders ejecutados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    process.exit(1);
  }
};

// Ejecutar si el script es llamado directamente
if (require.main === module) {
  runSeeders();
}

module.exports = { runSeeders };
