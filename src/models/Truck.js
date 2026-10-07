const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema(
  {
    truckNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    driverName: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      trim: true
    },

    truckType: {
      type: String,
      enum: ['COVERED', 'OPEN', 'REEFER', 'TANKER'],
      required: true
    },

    capacityTons: {
      type: Number,
      required: true,
      minimum: 0
    },

    currentLocation: {
      name: {
        type: String,
        required: true
      },
      lat: Number,
      lng: Number
    },

    status: {
      type: String,
      enum: ['AVAILABLE', 'ON_TRIP', 'BOOKED'],
      default: 'AVAILABLE'
    },

    operatingCostPerKm: {
      type: Number,
      required: true,
      minimum: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Truck', truckSchema);
