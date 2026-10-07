require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Truck = require('./models/Truck');
const Load = require('./models/Load');

async function seed() {
  await connectDB();

  await Truck.deleteMany({});
  await Load.deleteMany({});

  await Truck.create({
    truckNumber: 'KA-25-AA-1234',
    driverName: 'Demo Driver',
    phone: '9999999999',
    truckType: 'COVERED',
    capacityTons: 10,
    currentLocation: {
      name: 'APMC Amargol'
    },
    status: 'AVAILABLE',
    operatingCostPerKm: 30
  });

  await Load.insertMany([
    {
      loadId: 'UDUPI-01',
      shipperName: 'Udupi Trader',
      pickupLocation: {
        name: 'APMC Amargol'
      },
      destination: {
        name: 'Udupi'
      },
      weightTons: 8.5,
      cargoType: 'Agricultural Produce',
      requiredTruckType: 'COVERED',
      freightAmount: 9000,
      distanceKm: 315,
      status: 'AVAILABLE'
    },
    {
      loadId: 'OVERWEIGHT-01',
      shipperName: 'Demo Shipper',
      pickupLocation: {
        name: 'APMC Amargol'
      },
      destination: {
        name: 'Mangalore'
      },
      weightTons: 14,
      cargoType: 'Agricultural Produce',
      requiredTruckType: 'COVERED',
      freightAmount: 12000,
      distanceKm: 350,
      status: 'AVAILABLE'
    },
    {
      loadId: 'REEFER-01',
      shipperName: 'Cold Chain Trader',
      pickupLocation: {
        name: 'APMC Amargol'
      },
      destination: {
        name: 'Mangalore'
      },
      weightTons: 5,
      cargoType: 'Perishable Goods',
      requiredTruckType: 'REEFER',
      freightAmount: 7000,
      distanceKm: 300,
      status: 'AVAILABLE'
    }
  ]);

  console.log('Database seeded successfully.');

  const trucks = await Truck.countDocuments();
  const loads = await Load.countDocuments();

  console.log(`Trucks: ${trucks}`);
  console.log(`Loads: ${loads}`);

  await mongoose.connection.close();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.connection.close();
  process.exit(1);
});
