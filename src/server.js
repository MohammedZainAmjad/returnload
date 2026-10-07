const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const dataDir = path.join(__dirname, '../data');

function readJSON(file) {
  return JSON.parse(
    fs.readFileSync(path.join(dataDir, file), 'utf8')
  );
}

function getMatches(truckNumber) {
  const trucks = readJSON('trucks.json');
  const loads = readJSON('loads.json');

  const truck = trucks.find(t => t.truckNumber === truckNumber);

  if (!truck) return null;

  const matches = loads
    .filter(load => load.status === 'AVAILABLE')
    .filter(load => load.weightTons <= truck.capacityTons)
    .filter(load => load.requiredTruckType === truck.truckType)
    .map(load => {
      const operatingCost =
        load.distanceKm * truck.operatingCostPerKm;

      const estimatedMargin =
        load.freightAmount - operatingCost;

      return {
        ...load,
        economics: {
          freightAmount: load.freightAmount,
          operatingCost,
          estimatedMargin
        }
      };
    })
    .sort(
      (a, b) =>
        b.economics.estimatedMargin -
        a.economics.estimatedMargin
    );

  return { truck, matches };
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ReturnLoad'
  });
});

app.get('/api/trucks', (req, res) => {
  res.json(readJSON('trucks.json'));
});

app.get('/api/loads', (req, res) => {
  res.json(readJSON('loads.json'));
});

app.get('/api/matches/:truckNumber', (req, res) => {
  const result = getMatches(req.params.truckNumber);

  if (!result) {
    return res.status(404).json({
      error: 'Truck not found'
    });
  }

  res.json(result);
});

/*
  AI CHAT
  The deterministic backend supplies the actual logistics data.
  Ollama only interprets that data and explains it to the driver.
*/
app.post('/api/chat', async (req, res) => {
  try {
    const { message, truckNumber } = req.body;

    if (!message || !truckNumber) {
      return res.status(400).json({
        error: 'message and truckNumber are required'
      });
    }

    const result = getMatches(truckNumber);

    if (!result) {
      return res.status(404).json({
        error: 'Truck not found'
      });
    }

    const context = {
      truck: result.truck,
      compatibleLoads: result.matches
    };

    const systemPrompt = `
You are ReturnLoad AI, a logistics assistant for truck drivers at APMC Amargol.

Your job is to answer questions using ONLY the logistics data supplied below.

IMPORTANT RULES:
1. Never invent a load, price, distance, capacity, profit, or route.
2. Never make up missing information.
3. Do not say you need to contact ReturnLoad if the supplied data answers the question.
4. For earnings, use the supplied estimatedMargin exactly.
5. The backend has already calculated operating cost and margin. Do NOT recalculate them.
6. Explain compatibility using truck type and capacity.
7. If a load is not in compatibleLoads, do not claim that it is compatible.
8. Keep answers short and practical for a truck driver.
9. Currency is Indian Rupees.
10. You are an assistant inside the ReturnLoad logistics application.

CURRENT LOGISTICS DATA:
${JSON.stringify(context, null, 2)}
`;

    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        options: {
          temperature: 0.1
        }
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error(
        `Ollama returned HTTP ${ollamaResponse.status}`
      );
    }

    const data = await ollamaResponse.json();

    res.json({
      answer: data.message?.content ||
        'I could not generate an answer.',
      source: 'ReturnLoad AI',
      model: OLLAMA_MODEL
    });

  } catch (error) {
    console.error('AI chat error:', error.message);

    res.status(503).json({
      error: 'AI assistant unavailable',
      details: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ReturnLoad server running on port ${PORT}`);
});
