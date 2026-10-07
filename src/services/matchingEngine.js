function isTruckCompatible(truck, load) {
  if (!truck || !load) {
    return false;
  }

  // Load must fit within truck capacity.
  if (load.weightTons > truck.capacityTons) {
    return false;
  }

  // Truck must be compatible with the required cargo type.
  if (truck.truckType !== load.requiredTruckType) {
    return false;
  }

  return true;
}

function calculateEconomics(truck, load) {
  const operatingCost =
    load.distanceKm * truck.operatingCostPerKm;

  const estimatedMargin =
    load.freightAmount - operatingCost;

  return {
    freightAmount: load.freightAmount,
    operatingCost,
    estimatedMargin
  };
}

function scoreLoad(truck, load) {
  const economics = calculateEconomics(truck, load);

  // Higher margin = better match.
  // Small bonus for loads that use the truck efficiently.
  const utilization =
    load.weightTons / truck.capacityTons;

  return (
    economics.estimatedMargin +
    utilization * 1000
  );
}

function findBestMatches(truck, loads) {
  const compatibleLoads = loads
    .filter((load) => load.status === 'AVAILABLE')
    .filter((load) => isTruckCompatible(truck, load))
    .map((load) => {
      const economics = calculateEconomics(truck, load);

      return {
        load,
        economics,
        score: scoreLoad(truck, load)
      };
    })
    .sort((a, b) => b.score - a.score);

  return compatibleLoads;
}

module.exports = {
  isTruckCompatible,
  calculateEconomics,
  findBestMatches
};
