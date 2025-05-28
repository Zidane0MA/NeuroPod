const Template = require('../models/Template.model');
const User = require('../models/User.model');

// Obtener todas las plantillas
const getTemplates = async (req, res) => {
  try {
    const templates = await Template.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(templates);
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    res.status(500).json({ 
      message: 'Error al obtener plantillas',
      error: error.message 
    });
  }
};

// Obtener una plantilla por ID
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await Template.findById(id)
      .populate('createdBy', 'name email');
    
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error al obtener plantilla:', error);
    res.status(500).json({ 
      message: 'Error al obtener plantilla',
      error: error.message 
    });
  }
};

// Crear una nueva plantilla
const createTemplate = async (req, res) => {
  try {
    const {
      name,
      dockerImage,
      httpPorts,
      tcpPorts,
      containerDiskSize,
      volumeDiskSize,
      volumePath,
      description
    } = req.body;

    // Validaciones básicas
    if (!name || !dockerImage || !httpPorts || httpPorts.length === 0) {
      return res.status(400).json({ 
        message: 'Nombre, imagen Docker y al menos un puerto HTTP son requeridos' 
      });
    }

    // Validar que al menos un puerto HTTP tenga valores válidos
    const validHttpPorts = httpPorts.filter(port => 
      port.port > 0 && port.serviceName && port.serviceName.trim() !== ''
    );

    if (validHttpPorts.length === 0) {
      return res.status(400).json({ 
        message: 'Al menos un puerto HTTP debe tener puerto y nombre de servicio válidos' 
      });
    }

    // Verificar que no existe una plantilla con el mismo nombre
    const existingTemplate = await Template.findOne({ name });
    if (existingTemplate) {
      return res.status(400).json({ 
        message: 'Ya existe una plantilla con ese nombre' 
      });
    }

    // Crear la nueva plantilla
    const newTemplate = new Template({
      name,
      dockerImage,
      httpPorts: validHttpPorts,
      tcpPorts: tcpPorts || [],
      containerDiskSize: containerDiskSize || 10,
      volumeDiskSize: volumeDiskSize || 20,
      volumePath: volumePath || '/workspace',
      description: description || '',
      createdBy: req.user.id
    });

    const savedTemplate = await newTemplate.save();
    await savedTemplate.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Plantilla creada correctamente',
      template: savedTemplate
    });

  } catch (error) {
    console.error('Error al crear plantilla:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Datos de plantilla inválidos',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Error al crear plantilla',
      error: error.message 
    });
  }
};

// Actualizar una plantilla existente
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      dockerImage,
      httpPorts,
      tcpPorts,
      containerDiskSize,
      volumeDiskSize,
      volumePath,
      description
    } = req.body;

    // Buscar la plantilla
    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Verificar permisos (solo el creador o admin puede editar)
    if (template.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'No tienes permisos para editar esta plantilla' 
      });
    }

    // Validar datos si se proporcionan
    if (httpPorts !== undefined && httpPorts.length === 0) {
      return res.status(400).json({ 
        message: 'Al menos un puerto HTTP es requerido' 
      });
    }

    // Si se cambia el nombre, verificar que no exista otro con el mismo nombre
    if (name && name !== template.name) {
      const existingTemplate = await Template.findOne({ 
        name, 
        _id: { $ne: id } 
      });
      if (existingTemplate) {
        return res.status(400).json({ 
          message: 'Ya existe otra plantilla con ese nombre' 
        });
      }
    }

    // Actualizar campos
    if (name !== undefined) template.name = name;
    if (dockerImage !== undefined) template.dockerImage = dockerImage;
    if (httpPorts !== undefined) {
      const validHttpPorts = httpPorts.filter(port => 
        port.port > 0 && port.serviceName && port.serviceName.trim() !== ''
      );
      if (validHttpPorts.length === 0) {
        return res.status(400).json({ 
          message: 'Al menos un puerto HTTP debe ser válido' 
        });
      }
      template.httpPorts = validHttpPorts;
    }
    if (tcpPorts !== undefined) template.tcpPorts = tcpPorts;
    if (containerDiskSize !== undefined) template.containerDiskSize = containerDiskSize;
    if (volumeDiskSize !== undefined) template.volumeDiskSize = volumeDiskSize;
    if (volumePath !== undefined) template.volumePath = volumePath;
    if (description !== undefined) template.description = description;

    const updatedTemplate = await template.save();
    await updatedTemplate.populate('createdBy', 'name email');

    res.status(200).json({
      message: 'Plantilla actualizada correctamente',
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Error al actualizar plantilla:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Datos de plantilla inválidos',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Error al actualizar plantilla',
      error: error.message 
    });
  }
};

// Eliminar una plantilla
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Verificar permisos (solo el creador o admin puede eliminar)
    if (template.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'No tienes permisos para eliminar esta plantilla' 
      });
    }

    // TODO: Verificar si la plantilla está siendo usada por algún pod activo
    // const podsUsingTemplate = await Pod.find({ templateId: id, status: 'running' });
    // if (podsUsingTemplate.length > 0) {
    //   return res.status(400).json({ 
    //     message: 'No se puede eliminar la plantilla porque está siendo usada por pods activos' 
    //   });
    // }

    await Template.findByIdAndDelete(id);

    res.status(200).json({ 
      message: 'Plantilla eliminada correctamente' 
    });

  } catch (error) {
    console.error('Error al eliminar plantilla:', error);
    res.status(500).json({ 
      message: 'Error al eliminar plantilla',
      error: error.message 
    });
  }
};

// Obtener resumen de plantillas (para dashboard)
const getTemplatesSummary = async (req, res) => {
  try {
    const totalTemplates = await Template.countDocuments();
    const recentTemplates = await Template.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name')
      .select('name dockerImage createdAt');

    const templatesByUser = await Template.aggregate([
      {
        $group: {
          _id: '$createdBy',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userName: '$user.name',
          templateCount: '$count'
        }
      },
      {
        $sort: { templateCount: -1 }
      }
    ]);

    res.status(200).json({
      total: totalTemplates,
      recent: recentTemplates,
      byUser: templatesByUser
    });

  } catch (error) {
    console.error('Error al obtener resumen de plantillas:', error);
    res.status(500).json({ 
      message: 'Error al obtener resumen de plantillas',
      error: error.message 
    });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplatesSummary
};
