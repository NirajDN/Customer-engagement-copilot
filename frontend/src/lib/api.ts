let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005/api";

// Remove trailing slash
baseUrl = baseUrl.replace(/\/$/, "");

// Self-heal Render internal hostname: if the host contains 'xeno-backend-' and lacks a '.',
// append '.onrender.com' to convert it into the public API endpoint.
let hostOnly = baseUrl;
if (hostOnly.startsWith("http://")) hostOnly = hostOnly.substring(7);
if (hostOnly.startsWith("https://")) hostOnly = hostOnly.substring(8);
hostOnly = hostOnly.split("/")[0].split(":")[0];

if (hostOnly.startsWith("xeno-backend-") && !hostOnly.includes(".")) {
  const publicHost = `${hostOnly}.onrender.com`;
  if (baseUrl.includes("https://")) {
    baseUrl = baseUrl.replace(hostOnly, publicHost);
  } else if (baseUrl.includes("http://")) {
    baseUrl = baseUrl.replace(hostOnly, publicHost).replace("http://", "https://");
  } else {
    baseUrl = `https://${publicHost}`;
  }
}

if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
  baseUrl = `https://${baseUrl}`;
}
if (!baseUrl.endsWith("/api")) {
  baseUrl = `${baseUrl}/api`;
}
const API_BASE_URL = baseUrl;

export interface CustomerStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  totalSpend: number;
  orderCount: number;
  lastPurchaseDate: string | null;
  daysSinceLastPurchase: number | null;
}

export interface OrderDetail {
  id: string;
  customerId: string;
  customer: {
    name: string;
    email: string;
  };
  amount: number;
  status: string;
  purchaseDate: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  filterConfig: any;
  createdAt: string;
}

export interface CommunicationEvent {
  id: string;
  communicationId: string;
  type: "DELIVERED" | "FAILED" | "OPENED" | "READ" | "CLICKED";
  timestamp: string;
}

export interface Communication {
  id: string;
  campaignId: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  messageContent: string;
  status: "PENDING" | "SENT" | "FAILED";
  createdAt: string;
  communicationEvents: CommunicationEvent[];
}

export interface Campaign {
  id: string;
  name: string;
  segmentId: string;
  segment: Segment;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  messageTemplate: string;
  status: "DRAFT" | "LAUNCHED" | "COMPLETED";
  createdAt: string;
  _count?: {
    communications: number;
  };
  communications?: Communication[];
}

export interface CampaignMetrics {
  totalSent: number;
  delivered: number;
  failed: number;
  opened: number;
  read: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

export interface CopilotResponse {
  segment: {
    name: string;
    description: string;
    filterConfig: any;
  };
  campaign: {
    suggestedChannel: "EMAIL" | "SMS" | "WHATSAPP";
    channelJustification: string;
    messageTemplate: string;
  };
  assistantResponse: string;
}

export async function fetchCustomers(): Promise<CustomerStats[]> {
  const res = await fetch(`${API_BASE_URL}/customers`);
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}

export async function fetchOrders(): Promise<OrderDetail[]> {
  const res = await fetch(`${API_BASE_URL}/orders`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function fetchSegments(): Promise<Segment[]> {
  const res = await fetch(`${API_BASE_URL}/segments`);
  if (!res.ok) throw new Error("Failed to fetch segments");
  return res.json();
}

export async function fetchSegmentCustomers(segmentId: string) {
  const res = await fetch(`${API_BASE_URL}/segments/${segmentId}/customers`);
  if (!res.ok) throw new Error("Failed to fetch segment customers");
  return res.json();
}

export async function runSegmentDryRun(filterConfig: any): Promise<{ count: number; customers: CustomerStats[] }> {
  const res = await fetch(`${API_BASE_URL}/segments/dry-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filterConfig })
  });
  if (!res.ok) throw new Error("Segment dry-run failed");
  return res.json();
}

export async function createSegment(payload: { name: string; description?: string; filterConfig: any }): Promise<Segment> {
  const res = await fetch(`${API_BASE_URL}/segments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to create segment");
  return res.json();
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch(`${API_BASE_URL}/campaigns`);
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  return res.json();
}

export async function fetchCampaignDetails(campaignId: string): Promise<{ campaign: Campaign; metrics: CampaignMetrics }> {
  const res = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`);
  if (!res.ok) throw new Error("Failed to fetch campaign details");
  return res.json();
}

export async function createCampaign(payload: {
  name: string;
  segmentId: string;
  channel: string;
  messageTemplate: string;
}): Promise<Campaign> {
  const res = await fetch(`${API_BASE_URL}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to create campaign");
  return res.json();
}

export async function launchCampaign(campaignId: string): Promise<{ message: string; count: number }> {
  const res = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/launch`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to launch campaign");
  return res.json();
}

export async function fetchAnalytics(): Promise<{
  summary: {
    totalCampaigns: number;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    channel: string;
    status: string;
    createdAt: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  }>;
}> {
  const res = await fetch(`${API_BASE_URL}/analytics`);
  if (!res.ok) throw new Error("Failed to fetch aggregated analytics");
  return res.json();
}

export async function talkToCopilot(message: string, chatHistory: any[]): Promise<CopilotResponse> {
  const res = await fetch(`${API_BASE_URL}/copilot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, chatHistory })
  });
  if (!res.ok) throw new Error("AI Copilot request failed");
  return res.json();
}
