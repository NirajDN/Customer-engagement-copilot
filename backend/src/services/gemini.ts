import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

export interface CopilotResponse {
  segment: {
    name: string;
    description: string;
    filterConfig: {
      lastPurchaseDaysAgo?: number;
      maxPurchaseDaysAgo?: number;
      minTotalSpend?: number;
      maxTotalSpend?: number;
      minOrders?: number;
      maxOrders?: number;
    };
  };
  campaign: {
    suggestedChannel: "EMAIL" | "SMS" | "WHATSAPP";
    channelJustification: string;
    messageTemplate: string;
  };
  assistantResponse: string;
}

// Local mock NLP fallback to keep the app working offline or without API key (Localized for India)
function getFallbackResponse(prompt: string): CopilotResponse {
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes("60") || lowercasePrompt.includes("two months") || lowercasePrompt.includes("inactive") || lowercasePrompt.includes("dormant")) {
    return {
      segment: {
        name: "60-Day Dormant Indian Customers",
        description: "Customers who have not placed an order in the last 60 days",
        filterConfig: {
          lastPurchaseDaysAgo: 60
        }
      },
      campaign: {
        suggestedChannel: "EMAIL",
        channelJustification: "Email is highly effective for sending re-engagement discount vouchers (like FESTIVE20) without being intrusive.",
        messageTemplate: "Namaste {name}, we miss you at Xeno! It's been over 60 days since your last purchase. Here is a special voucher just for you: Use FESTIVE20 to get flat 20% off on your next order."
      },
      assistantResponse: "I've analyzed your customer logs. I created a segment targeting Indian customers who haven't made a purchase in 60 days, recommended Email for coupon delivery, and drafted a warm re-engagement copy with the coupon code FESTIVE20."
    };
  }

  if (lowercasePrompt.includes("vip") || lowercasePrompt.includes("spend") || lowercasePrompt.includes("high value") || lowercasePrompt.includes("loyal")) {
    return {
      segment: {
        name: "VIP Customers (Spend > ₹15,000)",
        description: "Customers with a lifetime spend of more than ₹15,000",
        filterConfig: {
          minTotalSpend: 15000,
          minOrders: 2
        }
      },
      campaign: {
        suggestedChannel: "WHATSAPP",
        channelJustification: "WhatsApp has a 98% open rate in India and provides an elite, direct-to-customer chat feel for high-value VIP customers.",
        messageTemplate: "Hello {name}! As one of our most valued VIP members, we're giving you exclusive early access to our premium collection. Tap here to view the catalog and claim your VIP gift: https://xeno.in/vip-early-access"
      },
      assistantResponse: "I've generated a segment targeting VIP customers who have spent more than ₹15,000 and placed at least 2 orders. I recommend reaching out via WhatsApp for a premium touch, and created an exclusive early-access invitation template."
    };
  }

  if (lowercasePrompt.includes("one time") || lowercasePrompt.includes("first buy") || lowercasePrompt.includes("single order")) {
    return {
      segment: {
        name: "One-Time Purchasers",
        description: "Customers who have placed exactly one order",
        filterConfig: {
          maxOrders: 1,
          minOrders: 1
        }
      },
      campaign: {
        suggestedChannel: "SMS",
        channelJustification: "SMS is perfect in India for a quick, direct follow-up message to push first-time shoppers towards their second transaction.",
        messageTemplate: "Hi {name}! Thanks for your first order at Xeno. Get flat ₹250 off on your second order! Use code WELCOME250. T&C apply."
      },
      assistantResponse: "I've created a segment of customers who have made exactly one purchase. Since they are familiar with our brand but haven't returned, I recommend SMS for a direct discount follow-up using the code WELCOME250."
    };
  }

  // Default fallback
  return {
    segment: {
      name: "Engaged Indian Audience Segment",
      description: "Active Indian customer base",
      filterConfig: {
        lastPurchaseDaysAgo: 0
      }
    },
    campaign: {
      suggestedChannel: "EMAIL",
      channelJustification: "Email is a safe and versatile default channel for general audience announcements.",
      messageTemplate: "Namaste {name}, we have launched some exciting new collections! Explore our latest arrivals today at xeno.in."
    },
    assistantResponse: "I've drafted a campaign for your active Indian customers. I suggested Email as the channel and wrote a friendly check-out message template."
  };
}

export async function parseGoalWithGemini(prompt: string, chatHistory: any[] = []): Promise<CopilotResponse> {
  if (!genAI) {
    console.warn("GEMINI_API_KEY not set. Using local mock NLP parser.");
    return getFallbackResponse(prompt);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const systemInstruction = `
You are an expert CRM AI Marketing Assistant operating in the Indian market. Your job is to analyze a natural language goal from a marketer and convert it into a structured target audience segment and campaign outreach.

Output EXACTLY a JSON object matching this schema:
{
  "segment": {
    "name": "Short Segment Name (e.g., 'VIP Customers (Spend > ₹15k)')",
    "description": "Clear description of the segment",
    "filterConfig": {
      "lastPurchaseDaysAgo": 30, // (Optional) Customers who haven't purchased in >= this many days
      "maxPurchaseDaysAgo": 10,  // (Optional) Customers who purchased within the last <= this many days
      "minTotalSpend": 15000,     // (Optional) Minimum cumulative spend in INR (Rupees)
      "maxTotalSpend": 50000,     // (Optional) Maximum cumulative spend in INR (Rupees)
      "minOrders": 3,           // (Optional) Minimum number of orders
      "maxOrders": 5            // (Optional) Maximum number of orders
    }
  },
  "campaign": {
    "suggestedChannel": "EMAIL", // Must be one of: "EMAIL", "SMS", "WHATSAPP"
    "channelJustification": "Brief reason why this channel fits best (mention Indian context, like high WhatsApp usage in India if relevant)",
    "messageTemplate": "The campaign copy. Use '{name}' as a placeholder for the customer's full name. Make it highly engaging, personalized, and relevant to the Indian market (using greetings like 'Namaste' or local contexts, and currency in ₹ / Rupees if relevant)."
  },
  "assistantResponse": "A friendly conversational explanation of what segment was built, why this channel was suggested, and how the copy was tailored for Indian consumers."
}

Analyze the user's input: "${prompt}"
Provide values only for filters that are relevant to the user's intent. Do not include all filters unless needed.
`;

    const chat = model.startChat({
      history: chatHistory.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }))
    });

    const result = await chat.sendMessage(systemInstruction);
    const text = result.response.text();
    return JSON.parse(text) as CopilotResponse;
  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    return getFallbackResponse(prompt);
  }
}
