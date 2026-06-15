import axios from "axios";

let channelUrl = process.env.CHANNEL_SERVICE_URL || "http://localhost:4000";
if (!channelUrl.startsWith("http://") && !channelUrl.startsWith("https://")) {
  channelUrl = `https://${channelUrl}`;
}
const CHANNEL_SERVICE_URL = channelUrl;

let crmBackendUrl = process.env.RENDER_EXTERNAL_URL || process.env.CRM_BACKEND_URL || "http://localhost:5005";
if (!crmBackendUrl.startsWith("http://") && !crmBackendUrl.startsWith("https://")) {
  crmBackendUrl = `https://${crmBackendUrl}`;
}
const CRM_BACKEND_URL = crmBackendUrl;

export interface ChannelCommunicationPayload {
  id: string;
  customerId: string;
  channel: string;
  messageContent: string;
}

export async function sendCampaignToChannelService(
  campaignId: string,
  communications: ChannelCommunicationPayload[]
): Promise<boolean> {
  try {
    const callbackUrl = `${CRM_BACKEND_URL}/api/webhooks/channel`;
    const payload = {
      campaignId,
      communications: communications.map((comm) => ({
        id: comm.id,
        customerId: comm.customerId,
        channel: comm.channel,
        messageContent: comm.messageContent,
        callbackUrl
      }))
    };

    console.log(`Forwarding ${communications.length} communications to Channel Service at ${CHANNEL_SERVICE_URL}/api/send`);
    const response = await axios.post(`${CHANNEL_SERVICE_URL}/api/send`, payload);
    return response.status === 202;
  } catch (error: any) {
    console.error("Error posting to Channel Service:", error.message);
    return false;
  }
}
