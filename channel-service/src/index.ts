import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

interface CommunicationPayload {
  id: string;
  customerId: string;
  channel: string; // "EMAIL" | "SMS" | "WHATSAPP"
  messageContent: string;
  callbackUrl: string;
}

// Simple logs list to show on UI if needed
const logs: string[] = [];

function logMsg(message: string) {
  const time = new Date().toLocaleTimeString();
  const entry = `[${time}] ${message}`;
  console.log(entry);
  logs.push(entry);
  if (logs.length > 200) logs.shift();
}

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function triggerWebhook(callbackUrl: string, payload: { communicationId: string; type: string; timestamp: string }) {
  try {
    logMsg(`Sending callback for Comm ID: ${payload.communicationId} -> Event: ${payload.type}`);
    await axios.post(callbackUrl, payload, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    logMsg(`Webhook failed for Comm ID ${payload.communicationId}: ${error.message}`);
  }
}

// Simulate communication lifecycle in background
async function simulateOutreach(comm: CommunicationPayload) {
  // 1. Initial short delay before dispatching
  await delay(1000 + Math.random() * 1000);

  // Determine delivery success
  const isFailed = Math.random() < 0.08; // 8% failure rate
  const timestamp = new Date().toISOString();

  if (isFailed) {
    await triggerWebhook(comm.callbackUrl, {
      communicationId: comm.id,
      type: "FAILED",
      timestamp
    });
    return;
  }

  // Send DELIVERED
  await triggerWebhook(comm.callbackUrl, {
    communicationId: comm.id,
    type: "DELIVERED",
    timestamp
  });

  // 2. Simulate OPENED event (more likely for WhatsApp/SMS than Email)
  const openRates: Record<string, number> = {
    WHATSAPP: 0.85,
    SMS: 0.75,
    EMAIL: 0.45
  };
  const openRate = openRates[comm.channel] || 0.5;
  const isOpened = Math.random() < openRate;

  if (!isOpened) return;

  await delay(1500 + Math.random() * 3000); // Wait 1.5s - 4.5s
  await triggerWebhook(comm.callbackUrl, {
    communicationId: comm.id,
    type: "OPENED",
    timestamp: new Date().toISOString()
  });

  // 3. Simulate READ event (for WhatsApp/SMS)
  const isRead = comm.channel !== "EMAIL" && Math.random() < 0.8;
  if (isRead) {
    await delay(1000 + Math.random() * 2000);
    await triggerWebhook(comm.callbackUrl, {
      communicationId: comm.id,
      type: "READ",
      timestamp: new Date().toISOString()
    });
  }

  // 4. Simulate CLICKED event (Conversion/Click on a link inside the template)
  const clickRates: Record<string, number> = {
    WHATSAPP: 0.35,
    SMS: 0.20,
    EMAIL: 0.15
  };
  const clickRate = clickRates[comm.channel] || 0.2;
  const isClicked = Math.random() < clickRate;

  if (isClicked) {
    await delay(2000 + Math.random() * 4000);
    await triggerWebhook(comm.callbackUrl, {
      communicationId: comm.id,
      type: "CLICKED",
      timestamp: new Date().toISOString()
    });
  }
}

// REST endpoints
app.post("/api/send", (req, res) => {
  const { communications } = req.body;

  if (!communications || !Array.isArray(communications)) {
    return res.status(400).json({ error: "Missing or invalid 'communications' array" });
  }

  logMsg(`Received batch of ${communications.length} messages to dispatch`);

  // Start background simulation for each communication without blocking
  communications.forEach((comm: CommunicationPayload) => {
    simulateOutreach(comm).catch((err) => {
      logMsg(`Error simulating outreach for ${comm.id}: ${err.message}`);
    });
  });

  // Respond immediately with 202 Accepted
  return res.status(202).json({
    status: "Accepted",
    message: `Outreach queue processing for ${communications.length} communications.`
  });
});

app.get("/api/logs", (req, res) => {
  res.json({ logs });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "Channel Service" });
});

app.listen(PORT, () => {
  console.log(`Channel Service is running on port ${PORT}`);
});
