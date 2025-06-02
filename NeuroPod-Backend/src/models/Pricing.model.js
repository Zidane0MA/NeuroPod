const mongoose = require('mongoose');

const PricingSchema = new mongoose.Schema({
  gpu: {
    'rtx-4050': { type: Number, default: 0.50 },
    'rtx-4080': { type: Number, default: 1.50 },
    'rtx-4090': { type: Number, default: 2.50 }
  },
  containerDisk: { type: Number, default: 0.05 },
  volumeDisk: { type: Number, default: 0.10 }
});

module.exports = mongoose.model('Pricing', PricingSchema);