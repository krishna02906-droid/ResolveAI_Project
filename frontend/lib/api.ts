/**
 * ResolveAI Frontend API Client
 * Connects Next.js to the real FastAPI backend via REST and Server-Sent Events (SSE).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface ApiTicket {
  id: string;
  ticketNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    tier: string;
    trustScore: number;
    disputeRate: string;
    lifetimeValue: string;
    accountAge: string;
  };
  category: string;
  urgency: "Critical" | "High" | "Medium" | "Low";
  sentiment: "Angry" | "Frustrated" | "Neutral" | "Satisfied";
  status: "Needs Review" | "Pending Action" | "Investigating" | "Resolved" | "Escalated";
  createdAt: string;
  slaDeadline: string;
  summary: string;
  order?: {
    orderId: string;
    orderDate: string;
    amount: string;
    carrier: string;
    trackingNumber: string;
    trackingStatus: string;
    items: Array<{ name: string; sku: string; quantity: number; price: number }>;
  };
  aiRootCause?: string;
  aiRecommendation?: {
    action: string;
    amount?: string;
    rationale: string;
    confidence: number;
  };
  matchedPolicy?: {
    policy_id: string;
    title: string;
    section: string;
    confidence: number;
    clause: string;
    url?: string;
  };
}

export interface ApiTicketDetail {
  success: boolean;
  ticket_number: string;
  status: string;
  urgency: string;
  sentiment: string;
  category: string;
  summary: string;
  ai_root_cause?: string;
  ai_recommendation?: any;
  matched_policy?: any;
  investigation_steps: Array<{
    id: string;
    timestamp: string;
    action: string;
    tool: string;
    status: "success" | "warning" | "error" | "info";
    detail: string;
    latencyMs: number;
  }>;
  raw_audit_json: Record<string, any>;
}

/**
 * Fetch all active tickets from backend
 */
export async function getTickets(): Promise<ApiTicket[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tickets`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch tickets: ${res.statusText}`);
    }
    const data = await res.json();
    return data.tickets || [];
  } catch (error) {
    console.warn("Backend unavailable, falling back to local state:", error);
    return [];
  }
}

/**
 * Fetch full ticket details including database investigation tool calls
 */
export async function getTicketDetail(ticketId: string): Promise<ApiTicketDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch ticket ${ticketId}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.warn("Backend ticket detail fetch error:", error);
    return null;
  }
}

/**
 * Execute human support lead decision override
 */
export async function executeManualAction(payload: {
  ticket_id: string;
  action: string;
  amount?: number;
  reason?: string;
  agent_notes?: string;
}): Promise<{ success: boolean; message: string; ticket_status?: string; refund_reference?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/actions/manual-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Action failed: ${res.statusText}`);
    }
    return await res.json();
  } catch (error: any) {
    console.error("Action execution error:", error);
    return {
      success: false,
      message: error.message || "Failed to execute action on backend.",
    };
  }
}

/**
 * Stream multi-agent investigation live using Server-Sent Events (SSE)
 */
export async function streamInvestigation(
  payload: {
    message: string;
    customer_id?: string;
    order_id?: string;
    ticket_number?: string;
  },
  onEvent: (event: { type: string; data: any }) => void,
  onComplete?: () => void,
  onError?: (err: any) => void
): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const trimmed = block.trim();
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              onEvent(parsed);
            } catch (e) {
              console.error("SSE parse error:", e);
            }
          }
        }
      }

      if (onComplete) onComplete();
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("SSE stream error:", err);
        if (onError) onError(err);
      }
    }
  })();

  // Return cancel function
  return () => controller.abort();
}
