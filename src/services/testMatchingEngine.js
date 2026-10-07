const {
  isTruckCompatible,
  calculateEconomics,
  findBestMatches
} = require('./matchingEngine');

const truck = {
  truckType: 'COVERED',
  capacityTons: 10,
  operatingCostPerKm: 30
};

const loads = [
  {
    loadId: 'UDUPI-01',
    weightTons: 8.5,
    requiredTruckType: 'COVERED',
    freightAmount: 9000,
    distanceKm: 315,
    status: 'AVAILABLE'
  },
  {
    loadId: 'OVERWEIGHT-01',
    weightTons: 14,
    requiredTruckType: 'COVERED',
    freightAmount: 12000,
    distanceKm: 350,
    status: 'AVAILABLE'
  },
  {
    loadId: 'REEFER-01',
    weightTons: 5,
    requiredTruckType: 'REEFER',
    freightAmount: 7000,
    distanceKm: 300,
    status: 'AVAILABLE'
  }
];

console.log('UDUPI compatible:',
  isTruckCompatible(truck, loads[0]));

console.log('OVERWEIGHT compatible:',
  isTruckCompatible(truck, loads[1]));

console.log('REEFER compatible:',
  isTruckCompatible(truck, loads[2]));

console.log(
  'Udupi economics:',
  calculateEconomics(truck, loads[0])
);

console.log(
  'Best matches:',
  findBestMatches(truck, loads).map((data) => data.load.loadId)
);
