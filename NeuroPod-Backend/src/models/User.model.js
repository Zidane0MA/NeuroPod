const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['client', 'admin'],
    default: 'client'
  },
  balance: {
    type: Number,
    default: 10.0 // Saldo inicial para nuevos usuarios
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  usageHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    podId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pod'
    },
    hours: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Método virtual para verificar si el saldo es "infinito" (para admins)
UserSchema.virtual('hasInfiniteBalance').get(function() {
  return this.role === 'admin';
});

// Middleware para comprobar si el usuario es admin y ajustar el balance a Infinity
UserSchema.pre('save', function(next) {
  if (this.role === 'admin') {
    this.balance = Number.POSITIVE_INFINITY;
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
