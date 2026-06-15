import { Router, Request, Response } from "express";
import prisma from "./config/db";
import { computeAllCustomerStats, filterCustomersByConfig } from "./services/customerHelper";
import { parseGoalWithGemini } from "./services/gemini";
import { sendCampaignToChannelService } from "./services/channel";

const router = Router();

// ==========================================
// 1. Customer Routes
// ==========================================
router.get("/customers", async (req: Request, res: Response) => {
  try {
    const stats = await computeAllCustomerStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch customers", details: error.message });
  }
});

// ==========================================
// 2. Order Routes
// ==========================================
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        purchaseDate: "desc"
      }
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch orders", details: error.message });
  }
});

// ==========================================
// 3. Segment Routes
// ==========================================
router.get("/segments", async (req: Request, res: Response) => {
  try {
    const segments = await prisma.audienceSegment.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(segments);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch segments", details: error.message });
  }
});

// Dry-run segment filtering to see matching customer list and count
router.post("/segments/dry-run", async (req: Request, res: Response) => {
  try {
    const { filterConfig } = req.body;
    if (!filterConfig) {
      return res.status(400).json({ error: "Missing filterConfig in request body" });
    }

    const allStats = await computeAllCustomerStats();
    const filtered = filterCustomersByConfig(allStats, filterConfig);

    res.json({
      count: filtered.length,
      customers: filtered
    });
  } catch (error: any) {
    res.status(500).json({ error: "Dry-run segment failed", details: error.message });
  }
});

// Create segment
router.post("/segments", async (req: Request, res: Response) => {
  try {
    const { name, description, filterConfig } = req.body;
    if (!name || !filterConfig) {
      return res.status(400).json({ error: "Missing name or filterConfig" });
    }

    const segment = await prisma.audienceSegment.create({
      data: {
        name,
        description,
        filterConfig
      }
    });

    res.status(201).json(segment);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create segment", details: error.message });
  }
});

// Get customers in a segment
router.get("/segments/:id/customers", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const segment = await prisma.audienceSegment.findUnique({
      where: { id }
    });

    if (!segment) {
      return res.status(404).json({ error: "Segment not found" });
    }

    const allStats = await computeAllCustomerStats();
    const filtered = filterCustomersByConfig(allStats, segment.filterConfig as any);

    res.json({
      segment,
      count: filtered.length,
      customers: filtered
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to retrieve segment customers", details: error.message });
  }
});

// ==========================================
// 4. Campaign Routes
// ==========================================
router.get("/campaigns", async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        segment: true,
        _count: {
          select: { communications: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch campaigns", details: error.message });
  }
});

router.post("/campaigns", async (req: Request, res: Response) => {
  try {
    const { name, segmentId, channel, messageTemplate } = req.body;
    if (!name || !segmentId || !channel || !messageTemplate) {
      return res.status(400).json({ error: "Missing required campaign fields" });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        segmentId,
        channel,
        messageTemplate,
        status: "DRAFT"
      },
      include: {
        segment: true
      }
    });

    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create campaign", details: error.message });
  }
});

router.get("/campaigns/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        segment: true,
        communications: {
          include: {
            customer: true,
            communicationEvents: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Calculate real-time funnel metrics for this campaign
    const totalSent = campaign.communications.length;
    let deliveredCount = 0;
    let failedCount = 0;
    let openedCount = 0;
    let readCount = 0;
    let clickedCount = 0;

    campaign.communications.forEach((comm) => {
      const types = comm.communicationEvents.map(e => e.type);
      if (types.includes("DELIVERED")) deliveredCount++;
      if (types.includes("FAILED")) failedCount++;
      if (types.includes("OPENED")) openedCount++;
      if (types.includes("READ")) readCount++;
      if (types.includes("CLICKED")) clickedCount++;
    });

    const metrics = {
      totalSent,
      delivered: deliveredCount,
      failed: failedCount,
      opened: openedCount,
      read: readCount,
      clicked: clickedCount,
      deliveryRate: totalSent > 0 ? (deliveredCount / totalSent) * 100 : 0,
      openRate: deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0,
      clickRate: deliveredCount > 0 ? (clickedCount / deliveredCount) * 100 : 0,
      conversionRate: totalSent > 0 ? (clickedCount / totalSent) * 100 : 0
    };

    res.json({ campaign, metrics });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch campaign details", details: error.message });
  }
});

// Launch campaign
router.post("/campaigns/:id/launch", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { segment: true }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status === "LAUNCHED") {
      return res.status(400).json({ error: "Campaign has already been launched" });
    }

    // 1. Retrieve all customers matching the segment config
    const allStats = await computeAllCustomerStats();
    const matchingCustomers = filterCustomersByConfig(allStats, campaign.segment.filterConfig as any);

    if (matchingCustomers.length === 0) {
      return res.status(400).json({ error: "No matching customers found for this segment. Cannot launch." });
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: { status: "LAUNCHED" }
    });

    // 2. Create Communication records
    const commData = matchingCustomers.map((customer) => {
      // Hydrate template variables: replace {name} with customer name
      const messageContent = campaign.messageTemplate.replace(/\{name\}/g, customer.name);

      return {
        campaignId: id,
        customerId: customer.id,
        channel: campaign.channel,
        messageContent,
        status: "PENDING"
      };
    });

    // Batch create communications
    await prisma.$transaction(
      commData.map((data) => prisma.communication.create({ data }))
    );

    // Fetch created communications to get their unique UUIDs
    const createdComms = await prisma.communication.findMany({
      where: { campaignId: id },
      select: {
        id: true,
        customerId: true,
        channel: true,
        messageContent: true
      }
    });

    // 3. Dispatch to Channel Service
    const dispatchPayload = createdComms.map((comm) => ({
      id: comm.id,
      customerId: comm.customerId,
      channel: comm.channel,
      messageContent: comm.messageContent
    }));

    const success = await sendCampaignToChannelService(id, dispatchPayload);

    res.json({
      message: success ? "Campaign launched and sent to Channel Service" : "Campaign launched, but dispatch failed",
      dispatchSuccess: success,
      count: createdComms.length
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to launch campaign", details: error.message });
  }
});

// ==========================================
// 5. Channel Webhook Callback Route
// ==========================================
router.post("/webhooks/channel", async (req: Request, res: Response) => {
  try {
    const { communicationId, type, timestamp } = req.body;
    if (!communicationId || !type) {
      return res.status(400).json({ error: "Missing communicationId or event type" });
    }

    // Verify communication exists
    const comm = await prisma.communication.findUnique({
      where: { id: communicationId }
    });

    if (!comm) {
      return res.status(404).json({ error: "Communication record not found" });
    }

    // Add communication event
    await prisma.communicationEvent.create({
      data: {
        communicationId,
        type,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      }
    });

    // Update communication overall status
    let updatedStatus = comm.status;
    if (type === "FAILED") {
      updatedStatus = "FAILED";
    } else if (type === "DELIVERED") {
      updatedStatus = "SENT";
    }

    await prisma.communication.update({
      where: { id: communicationId },
      data: { status: updatedStatus }
    });

    res.json({ success: true, message: "Webhook processed" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook failed", details: error.message });
  }
});

// ==========================================
// 6. Aggregated Analytics Route
// ==========================================
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        communications: {
          include: {
            communicationEvents: true
          }
        }
      }
    });

    let totalCampaigns = campaigns.length;
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;

    const campaignStats = campaigns.map((campaign) => {
      const campSent = campaign.communications.length;
      let campDelivered = 0;
      let campOpened = 0;
      let campClicked = 0;

      campaign.communications.forEach((comm) => {
        const eventTypes = comm.communicationEvents.map(e => e.type);
        if (eventTypes.includes("DELIVERED")) campDelivered++;
        if (eventTypes.includes("OPENED")) campOpened++;
        if (eventTypes.includes("CLICKED")) campClicked++;
      });

      totalSent += campSent;
      totalDelivered += campDelivered;
      totalOpened += campOpened;
      totalClicked += campClicked;

      return {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        createdAt: campaign.createdAt,
        sent: campSent,
        delivered: campDelivered,
        opened: campOpened,
        clicked: campClicked,
        deliveryRate: campSent > 0 ? (campDelivered / campSent) * 100 : 0,
        openRate: campDelivered > 0 ? (campOpened / campDelivered) * 100 : 0,
        clickRate: campDelivered > 0 ? (campClicked / campDelivered) * 100 : 0
      };
    });

    res.json({
      summary: {
        totalCampaigns,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
        conversionRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0
      },
      campaigns: campaignStats
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to calculate analytics", details: error.message });
  }
});

// ==========================================
// 7. AI Copilot Chat Route
// ==========================================
router.post("/copilot/chat", async (req: Request, res: Response) => {
  try {
    const { message, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message parameter" });
    }

    const aiResponse = await parseGoalWithGemini(message, chatHistory || []);
    res.json(aiResponse);
  } catch (error: any) {
    res.status(500).json({ error: "AI copilot model execution failed", details: error.message });
  }
});

export default router;
