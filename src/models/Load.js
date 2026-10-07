const mongoose = require('mongoose');

const loadSchema = new mongoose.Schema(
  {
    loadId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    shipperName: {
      type: String,
      required: true,
      trim: true
    },

    pickupLocation: {
      name: {
        type: String,
        required: true
      },
      lat: Number,
      lng: Number
    },

    destination: {
      name: {
        type: String,
        required: true
      },
      lat: Number,
      lng: Number
    },

    weightTons: {
      type: Number,
      required: true,
      minimum: 0
    },

    cargoType: {
      type: String,
      required: true
    },

    requiredTruckType: {
      type: String,
      enum: ['COVERED', 'OPEN', 'REEFER', 'TANKER'],
      required: true
    },

    freightAmount: {
      type: Number,
      required: true,
      minimum: 0
    },

    distanceKm: {
      type: Number,
      required: true,
      minimum: 0
    },

    status: {
      type: String,
      enum: ['AVAILABLE', 'RESERVED', 'COMPLETED'],
      default: 'AVAILABLE'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Load', loadSchema);
