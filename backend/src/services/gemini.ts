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

// Local mock NLP fallback to keep the app working offline or without API key
function getFallbackResponse(prompt: string): CopilotResponse {
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes("60") || lowercasePrompt.includes("two months") || lowercasePrompt.includes("inactive")) {
    return {
      segment: {
        name: "60-Day Dormant Customers",
        description: "Customers who have not purchased in the last 60 days",
        filterConfig: {
          lastPurchaseDaysAgo: 60
        }
      },
      campaign: {
        suggestedChannel: "EMAIL",
        channelJustification: "Email is highly effective for re-engaging inactive users with discount codes without being intrusive.",
        messageTemplate: "Hi {name}, we miss you! It's been over 60 days since your last purchase. Use code COMEBACK20 for 20% off your next order!"
      },
      assistantResponse: "I've analyzed your customer records. I found that email is the best channel to reach these customers. I created a segment for customers who haven't made a purchase in 60 days, and drafted a personalized email with a COMEBACK20 promo code to re-engage them."
    };
  }

  if (lowercasePrompt.includes("vip") || lowercasePrompt.includes("spend") || lowercasePrompt.includes("high value") || lowercasePrompt.includes("loyal")) {
    return {
      segment: {
        name: "VIP Customers (Spend > $200)",
        description: "Customers with a lifetime spend of more than $200",
        filterConfig: {
          minTotalSpend: 200,
          minOrders: 2
        }
      },
      campaign: {
        suggestedChannel: "WHATSAPP",
        channelJustification: "WhatsApp provides a premium, direct-to-customer chat feel for high-value VIP customers.",
        messageTemplate: "Hello {name}! As one of our top VIP customers, we're giving you exclusive early access to our new catalog. Tap here to shop: https://xeno.ai/vip-early"
      },
      assistantResponse: "I've generated a segment targeting VIP customers who have spent more than $200 and placed at least 2 orders. I recommend reaching out via WhatsApp for a premium touch, and created an exclusive early-access invitation template."
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
        channelJustification: "SMS is perfect for a quick, direct follow-up message to encourage a second purchase.",
        messageTemplate: "Hi {name}! Thanks for your first order. Here's a special 15% off code for your second purchase: SECONDBUY"
      },
      assistantResponse: "I've created a segment of customers who have made exactly one purchase. Since they are familiar with our brand but haven't returned, I recommend SMS for a direct discount follow-up using the code SECONDBUY."
    };
  }

  // Default fallback
  return {
    segment: {
      name: "Engaged Audience Segment",
      description: "Active customer base",
      filterConfig: {
        lastPurchaseDaysAgo: 0
      }
    },
    campaign: {
      suggestedChannel: "EMAIL",
      channelJustification: "Email is a safe and versatile default channel for general audience campaigns.",
      messageTemplate: "Hi {name}, we have some amazing new products in stock! Check them out today at xeno.ai."
    },
    assistantResponse: "I've drafted a campaign for your active customers. I suggested Email as the channel and wrote a friendly check-out message template."
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
You are an expert CRM AI Marketing Assistant. Your job is to analyze a natural language goal from a marketer and convert it into a structured target audience segment and campaign outreach.

Output EXACTLY a JSON object matching this schema:
{
  "segment": {
    "name": "Short Segment Name",
    "description": "Clear description of the segment",
    "filterConfig": {
      "lastPurchaseDaysAgo": 30, // (Optional) Customers who haven't purchased in >= this many days
      "maxPurchaseDaysAgo": 10,  // (Optional) Customers who purchased within the last <= this many days
      "minTotalSpend": 150,     // (Optional) Minimum cumulative spend
      "maxTotalSpend": 500,     // (Optional) Maximum cumulative spend
      "minOrders": 3,           // (Optional) Minimum number of orders
      "maxOrders": 5            // (Optional) Maximum number of orders
    }
  },
  "campaign": {
    "suggestedChannel": "EMAIL", // Must be one of: "EMAIL", "SMS", "WHATSAPP"
    "channelJustification": "Brief reason why this channel fits best",
    "messageTemplate": "The campaign copy. Use '{name}' as a placeholder for the customer's full name. Make it highly engaging, personalized, and relevant."
  },
  "assistantResponse": "A friendly conversational explanation of what segment was built, why this channel was suggested, and how the copy was tailored."
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
