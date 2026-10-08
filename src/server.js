const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const OLLAMA_URL = 'http://127.0.0.1:11434';
const OLLAMA_MODEL = 'qwen2.5:0.5b';

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

  const truck = trucks.find(
    t => t.truckNumber === truckNumber
  );

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

    const text = message.toLowerCase();
    const allLoads = readJSON('loads.json');

    // Find a verified compatible load mentioned by destination.
    const selectedLoad = result.matches.find(load =>
      text.includes(load.destination.name.toLowerCase())
    );

    // Detect a requested destination even when no compatible load exists.
    const requestedDestination = allLoads.find(load =>
      text.includes(load.destination.name.toLowerCase())
    );

    // Reject unknown destinations deterministically.
    const destinationMatch =
      text.match(/\b(?:to|towards|for)\s+([a-z][a-z ]+)/i);

    if (
      destinationMatch &&
      !requestedDestination &&
      (
        text.includes('load') ||
        text.includes('loads') ||
        text.includes('compatible')
      )
    ) {
      const destination =
        destinationMatch[1].trim();

      return res.json({
        answer:
          'No verified return load to ' +
          destination.charAt(0).toUpperCase() +
          destination.slice(1) +
          ' is currently available in ReturnLoad.',
        model: 'deterministic-logistics-engine'
      });
    }

    if (
      requestedDestination &&
      !selectedLoad &&
      (
        text.includes('load') ||
        text.includes('towards') ||
        text.includes('to ') ||
        text.includes('compatible')
      )
    ) {
      return res.json({
        answer:
          'I could not find a compatible return load to ' +
          requestedDestination.destination.name +
          ' for your ' +
          result.truck.capacityTons +
          '-ton ' +
          result.truck.truckType.toLowerCase() +
          ' truck.',
        model: 'deterministic-logistics-engine'
      });
    }

    // Deterministic answers for factual logistics questions.
    if (
      selectedLoad &&
      (
        text.includes('find') ||
        text.includes('load') ||
        text.includes('compatible') ||
        text.includes('how much') ||
        text.includes('make') ||
        text.includes('earn') ||
        text.includes('profit') ||
        text.includes('margin') ||
        text.includes('cheaper')
      )
    ) {
      const margin = selectedLoad.economics.estimatedMargin;

      let financialText;

      if (margin < 0) {
        financialText =
          'Estimated loss is ₹' + Math.abs(margin).toLocaleString() + '.';
      } else {
        financialText =
          'Estimated profit is ₹' + margin.toLocaleString() + '.';
      }

      return res.json({
        answer:
          'I found a compatible ' +
          selectedLoad.weightTons +
          '-ton ' +
          selectedLoad.requiredTruckType.toLowerCase() +
          ' load from ' +
          selectedLoad.pickupLocation.name +
          ' to ' +
          selectedLoad.destination.name +
          '. Freight is ₹' +
          selectedLoad.freightAmount.toLocaleString() +
          '. Operating cost is ₹' +
          selectedLoad.economics.operatingCost.toLocaleString() +
          '. ' +
          financialText,
        model: 'deterministic-logistics-engine'
      });
    }

    // For explanation/conversational questions, let Qwen explain
    // only the verified backend data.
    const context = {
      truck: result.truck,
      compatibleLoads: result.matches
    };

    const systemPrompt = `
You are ReturnLoad AI, a logistics assistant inside a truck-load matching application.

The backend has already made all logistics decisions.

RULES:
- Use ONLY the supplied logistics data.
- Never invent or change a load ID, destination, route, weight, price or distance.
- Never select a different load.
- Never recalculate operating cost or margin.
- A negative estimatedMargin means an estimated LOSS.
- A positive estimatedMargin means an estimated PROFIT.
- Explain why a load is compatible using truck capacity and truck type.
- Keep the answer short and practical.
- Do not output JSON.
- Do not mention being an AI model.

VERIFIED LOGISTICS DATA:
${JSON.stringify(context, null, 2)}
`;

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
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

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();

    res.json({
      answer:
        data.message?.content ||
        'I could not generate an answer.',
      model: OLLAMA_MODEL
    });

  } catch (error) {
    console.error('AI chat error:', error.message);

    res.status(503).json({
      error: 'AI assistant unavailable'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ReturnLoad server running on port ${PORT}`);
});
