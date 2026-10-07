const express = require('express');
const fs = require('fs');
const path = require('path');

const { findBestMatches } = require('../services/matchingEngine');

const router = express.Router();

const dataDir = path.join(__dirname, '../../data');

function readJSON(file) {
  const filePath = path.join(dataDir, file);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

router.get('/trucks', (req, res) => {
  res.json(readJSON('trucks.json'));
});

router.get('/loads', (req, res) => {
  res.json(readJSON('loads.json'));
});

router.get('/matches/:truckNumber', (req, res) => {
  const trucks = readJSON('trucks.json');
  const loads = readJSON('loads.json');

  const truck = trucks.find(
    (t) => t.truckNumber === req.params.truckNumber
  );

  if (!truck) {
    return res.status(404).json({
      error: 'Truck not found'
    });
  }

  const matches = findBestMatches(truck, loads);

  res.json({
    truck,
    matches
  });
});

module.exports = router;
