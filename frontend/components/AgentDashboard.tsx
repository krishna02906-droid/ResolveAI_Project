"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  PackageCheck,
  Search,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  X,
  Send,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Lock,
  FileSearch,
  DollarSign,
  AlertOctagon,
  Eye,
  Layers,
  FileDown,
  Play,
  Loader2,
  MessageSquare
} from "lucide-react";
import CustomerChat from "./CustomerChat";
import {
  getTickets,
  getTicketDetail,
  executeManualAction,
  streamInvestigation,
} from "../lib/api";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type UrgencyLevel = "Critical" | "High" | "Medium" | "Low";
export type SentimentType = "Angry" | "Frustrated" | "Neutral" | "Satisfied";
export type TicketStatus = "Needs Review" | "Pending Action" | "Investigating" | "Resolved" | "Escalated" | "REFUND_PROCESSED";

export interface InvestigationStep {
  id: string;
  timestamp: string;
  action: string;
  tool: string;
  status: "success" | "warning" | "error" | "info";
  detail: string;
  latencyMs?: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  tier: "Standard" | "VIP Gold" | "Enterprise Diamond";
  lifetimeValue: string;
  disputeRate: string;
  accountAge: string;
  trustScore: number; // 0 - 100
}

export interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  price: string;
}

export interface OrderDetails {
  orderId: string;
  orderDate: string;
  amount: string;
  carrier: string;
  trackingNumber: string;
  trackingStatus: string;
  items: OrderItem[];
}

export interface PolicySnippet {
  policyId: string;
  title: string;
  section: string;
  confidence: number;
  clause: string;
  url?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  customer: CustomerProfile;
  category: string;
  urgency: UrgencyLevel;
  sentiment: SentimentType;
  status: TicketStatus;
  createdAt: string;
  slaDeadline: string;
  summary: string;
  order: OrderDetails;
  investigationSteps: InvestigationStep[];
  matchedPolicy: PolicySnippet;
  aiRootCause: string;
  aiRecommendation: {
    action: string;
    amount?: string;
    rationale: string;
    confidence: number;
  };
  rawAuditJson: Record<string, any>;
}

// ==========================================
// INITIAL SEED DEMO DATA
// ==========================================

const INITIAL_TICKETS: Ticket[] = [
  {
    id: "t-1",
    ticketNumber: "RES-8924",
    customer: {
      id: "cust_101",
      name: "Rahul Sharma",
      email: "r***a@example.com",
      tier: "VIP Gold",
      lifetimeValue: "₹42,900.00",
      disputeRate: "0.0%",
      accountAge: "2.1 yrs",
      trustScore: 92,
    },
    category: "Payment Debited but Order Failed",
    urgency: "Critical",
    sentiment: "Frustrated",
    status: "Needs Review",
    createdAt: "15m ago",
    slaDeadline: "18m remaining",
    summary: "Customer was debited ₹1,499 via UPI, but order #ORD-9912 is marked FAILED on the platform due to an inventory reservation timeout.",
    order: {
      orderId: "ORD-9912",
      orderDate: "Sep 21, 2026",
      amount: "₹1,499.00",
      carrier: "BlueDart",
      trackingNumber: "BD-99124910",
      trackingStatus: "Order Creation Aborted",
      items: [
        { name: "Wireless Gaming Earbuds Pro", sku: "WGE-PRO-BLK", quantity: 1, price: "₹1,499.00" }
      ],
    },
    investigationSteps: [
      {
        id: "step-1",
        timestamp: "10:41:02 AM",
        action: "Customer Profile & Loyalty Tier Lookup",
        tool: "check_customer() Database Tool",
        status: "success",
        detail: "Verified customer Rahul Sharma (cust_101). VIP Gold tier with 0.0% historical dispute rate and 92/100 trust score.",
        latencyMs: 125
      },
      {
        id: "step-2",
        timestamp: "10:41:04 AM",
        action: "Order Fulfillment & Inventory State",
        tool: "check_order() Database Tool",
        status: "warning",
        detail: "Order #ORD-9912 status is FAILED. Warehouse inventory reservation aborted due to 504 gateway timeout.",
        latencyMs: 160
      },
      {
        id: "step-3",
        timestamp: "10:41:06 AM",
        action: "Gateway Capture Ledger Inspection",
        tool: "check_payment() Database Tool",
        status: "success",
        detail: "Payment #PAY-5541 confirmed SUCCESS. ₹1,499.00 captured by Razorpay UPI (txn: pay_N94182901). Discrepancy confirmed.",
        latencyMs: 145
      },
      {
        id: "step-4",
        timestamp: "10:41:09 AM",
        action: "Policy Grounding & Compliance Retrieval",
        tool: "search_policy() Vector/Semantic Engine",
        status: "success",
        detail: "Matched Policy Section 3.1.2: Automatic Refund for Inventory Timeout Failures with 99.4% confidence.",
        latencyMs: 110
      }
    ],
    matchedPolicy: {
      policyId: "POL-3.1.2",
      title: "Failed Checkout with Captured Funds (Immediate Refund Guarantee)",
      section: "Section 3.1.2: Automatic Full Refund",
      confidence: 99.4,
      clause: "In events where funds are successfully captured by a payment gateway (e.g. Razorpay UPI, Stripe, Paytm) but internal order creation returns FAILED or CANCELLED due to technical timeout, a 100% full refund must be initiated immediately without deduction.",
      url: "https://internal.resolveai.corp/policies#section-3.1.2"
    },
    aiRootCause: "Webhook race condition: Razorpay payment capture succeeded, but inventory lock service encountered a 504 gateway timeout, triggering automatic order rollback while leaving captured funds unrefunded.",
    aiRecommendation: {
      action: "Approve Full Refund",
      amount: "₹1,499.00",
      rationale: "Payment captured without order creation. Policy Section 3.1.2 mandates instantaneous automated refund.",
      confidence: 99.4
    },
    rawAuditJson: {
      trace_id: "trc_99a812fc40e8b1",
      execution_mode: "autonomous_multi_agent",
      model: "gemini-3.8-flash-investigator",
      total_tokens: 3120,
      latency_total_ms: 842,
      eval_rubrics: {
        customer_intent_score: 0.99,
        fraud_risk_score: 0.01,
        policy_adherence_index: 1.0,
        payment_reconciliation_certainty: 1.0
      },
      telemetry: {
        payment_status: "CAPTURED",
        order_status: "FAILED",
        gateway_trace: "pay_N94182901"
      }
    }
  },
  {
    id: "t-2",
    ticketNumber: "RES-8925",
    customer: {
      id: "cust_102",
      name: "Priya Verma",
      email: "p***a@example.com",
      tier: "Standard",
      lifetimeValue: "₹24,999.00",
      disputeRate: "14.0%",
      accountAge: "18 days",
      trustScore: 42,
    },
    category: "Unauthorized Password Reset & ATO Alert",
    urgency: "Critical",
    sentiment: "Angry",
    status: "Pending Action",
    createdAt: "28m ago",
    slaDeadline: "Immediate Attention",
    summary: "Multiple unauthorized password reset attempts detected followed by sudden shipping address redirect to unverified freight forwarder hub.",
    order: {
      orderId: "ORD-8891",
      orderDate: "Sep 21, 2026",
      amount: "₹24,999.00",
      carrier: "BlueDart",
      trackingNumber: "BD-88910412",
      trackingStatus: "Fulfillment Frozen - Security Hold",
      items: [
        { name: "iPhone 16 Pro Max 256GB", sku: "APL-IPH16-256", quantity: 1, price: "₹24,999.00" }
      ],
    },
    investigationSteps: [
      {
        id: "step-1",
        timestamp: "10:15:02 AM",
        action: "Geo-IP & Device Anomaly Detection",
        tool: "Risk Engine Sentry",
        status: "error",
        detail: "Login IP located in Nigeria while billing address is Mumbai, India. VPN proxy exit node detected.",
        latencyMs: 140
      },
      {
        id: "step-2",
        timestamp: "10:15:04 AM",
        action: "Freight Forwarder Database Match",
        tool: "Global Logistics Blacklist",
        status: "error",
        detail: "Destination address matches known freight forwarder hub associated with fraudulent chargebacks.",
        latencyMs: 290
      },
      {
        id: "step-3",
        timestamp: "10:15:06 AM",
        action: "Account Longevity Sentry",
        tool: "Identity Trust Evaluator",
        status: "warning",
        detail: "Account age is 18 days with sudden high-value hardware order redirect.",
        latencyMs: 110
      },
      {
        id: "step-4",
        timestamp: "10:15:09 AM",
        action: "Policy Grounding & Compliance",
        tool: "search_policy() Vector Engine",
        status: "success",
        detail: "Matched Policy Section 5.3: Mandatory KYC for High-Risk Re-routing with 99.7% confidence.",
        latencyMs: 120
      }
    ],
    matchedPolicy: {
      policyId: "POL-SEC-5.3",
      title: "Fraud Prevention & Mandatory KYC Protocol",
      section: "Section 5.3: Mandatory KYC for High-Risk Re-routing",
      confidence: 99.7,
      clause: "When high-risk signals accompany high-value orders on accounts under 90 days, customer service must request government-issued photo ID or biometric verification before releasing shipments.",
      url: "https://internal.resolveai.corp/policies#section-5.3"
    },
    aiRootCause: "High probability account takeover (ATO) attempt attempting to divert high-value computer hardware through an anonymous VPN exit node.",
    aiRecommendation: {
      action: "Request KYC & Freeze Fulfillment",
      rationale: "High risk indicators (VPN, IP mismatch, freight forwarder, fresh account). Freeze order fulfillment until customer proves identity.",
      confidence: 99.7
    },
    rawAuditJson: {
      trace_id: "trc_88f018aae39121",
      execution_mode: "security_fraud_halt",
      model: "gemini-3.8-flash-investigator",
      total_tokens: 3890,
      latency_total_ms: 810,
      eval_rubrics: {
        fraud_risk_score: 0.98,
        account_takeover_probability: 0.94,
        policy_adherence_index: 1.0
      }
    }
  },
  {
    id: "t-3",
    ticketNumber: "RES-8920",
    customer: {
      id: "cust_103",
      name: "Amit Patel",
      email: "a***l@example.com",
      tier: "VIP Gold",
      lifetimeValue: "₹84,500.00",
      disputeRate: "0.0%",
      accountAge: "3.2 yrs",
      trustScore: 96,
    },
    category: "Carrier Transit Delay Concession",
    urgency: "Low",
    sentiment: "Neutral",
    status: "Resolved",
    createdAt: "2h ago",
    slaDeadline: "Resolved",
    summary: "Package transit delayed by 48h due to regional weather warning. Customer notified and concession granted.",
    order: {
      orderId: "ORD-8821",
      orderDate: "Sep 18, 2026",
      amount: "₹3,200.00",
      carrier: "BlueDart",
      trackingNumber: "BD-88219012",
      trackingStatus: "In Transit - Hub Delayed",
      items: [
        { name: "Mechanical Gaming Keyboard RGB", sku: "KEY-MECH-RGB", quantity: 1, price: "₹3,200.00" }
      ],
    },
    investigationSteps: [
      {
        id: "step-1",
        timestamp: "08:10:02 AM",
        action: "Carrier Logistics Ingestion",
        tool: "BlueDart Logistics EDI",
        status: "warning",
        detail: "Carrier possession verified on time. Transit delayed at regional hub due to monsoon advisory.",
        latencyMs: 210
      },
      {
        id: "step-2",
        timestamp: "08:10:05 AM",
        action: "Policy Grounding Check",
        tool: "search_policy() Vector Engine",
        status: "success",
        detail: "Matched Policy Section 1.4: Carrier Drop-Off Timestamp Precedence Rule with 98.2% confidence.",
        latencyMs: 140
      }
    ],
    matchedPolicy: {
      policyId: "POL-LOG-1.4",
      title: "Carrier Hand-Off & Transit Delay Precedence",
      section: "Section 1.4: Carrier Drop-Off Precedence Rule",
      confidence: 98.2,
      clause: "Carrier-induced transit delays shall not penalize the customer. VIP tier accounts qualify for automatic goodwill courtesy credits.",
      url: "https://internal.resolveai.corp/policies#section-1.4"
    },
    aiRootCause: "Monsoon weather caused 48-hour delay on carrier feeder truck. Precedence Rule 1.4 applied.",
    aiRecommendation: {
      action: "Concession Credit Issued",
      amount: "₹250.00",
      rationale: "VIP Gold customer affected by verifiable carrier delay. Section 1.4 concession applied.",
      confidence: 98.2
    },
    rawAuditJson: {
      trace_id: "trc_55b91012fa8901",
      execution_mode: "autonomous_evaluation",
      model: "gemini-3.8-flash-investigator",
      total_tokens: 2410,
      latency_total_ms: 620,
      eval_rubrics: {
        carrier_fault_attribution: 1.0,
        customer_intent_score: 0.99,
        policy_adherence_index: 1.0
      }
    }
  }
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AgentDashboard() {
  const [viewMode, setViewMode] = useState<"agent" | "customer">("agent");
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(INITIAL_TICKETS[0].id);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("All");
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [agentNote, setAgentNote] = useState<string>("");
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: "success" | "info" | "warn" } | null>(null);
  const [copiedAudit, setCopiedAudit] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [liveStreamMsg, setLiveStreamMsg] = useState<string>("");

  // Active selected ticket
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || tickets[0];
  }, [tickets, selectedTicketId]);

  // Track last loaded ticket ID to prevent duplicate fetches
  const lastLoadedTicketIdRef = React.useRef<string | null>(null);
  const ticketsRef = React.useRef(tickets);
  ticketsRef.current = tickets;

  // Load tickets from real backend on mount only
  const refreshTicketsFromBackend = useCallback(async () => {
    try {
      const backendTickets = await getTickets();
      if (backendTickets && backendTickets.length > 0) {
        setTickets((prevTickets) => {
          return backendTickets.map((bt) => {
            const existing = prevTickets.find((pt) => pt.ticketNumber === bt.ticketNumber || pt.id === bt.id);
            return {
              id: bt.id,
              ticketNumber: bt.ticketNumber,
              customer: {
                id: bt.customer.id,
                name: bt.customer.name,
                email: bt.customer.email,
                tier: bt.customer.tier as any,
                trustScore: bt.customer.trustScore,
                disputeRate: bt.customer.disputeRate,
                lifetimeValue: bt.customer.lifetimeValue,
                accountAge: bt.customer.accountAge,
              },
              category: bt.category,
              urgency: bt.urgency,
              sentiment: bt.sentiment,
              status: bt.status,
              createdAt: bt.createdAt,
              slaDeadline: bt.slaDeadline,
              summary: bt.summary,
              order: {
                orderId: bt.order?.orderId || "N/A",
                orderDate: bt.order?.orderDate || "N/A",
                amount: bt.order?.amount || "₹0.00",
                carrier: bt.order?.carrier || "N/A",
                trackingNumber: bt.order?.trackingNumber || "N/A",
                trackingStatus: bt.order?.trackingStatus || "N/A",
                items: (bt.order?.items || []).map((it) => ({
                  name: it.name,
                  sku: it.sku,
                  quantity: it.quantity,
                  price: `₹${it.price}`,
                })),
              },
              investigationSteps: existing?.investigationSteps || INITIAL_TICKETS[0].investigationSteps,
              matchedPolicy: existing?.matchedPolicy || INITIAL_TICKETS[0].matchedPolicy,
              aiRootCause: bt.aiRootCause || existing?.aiRootCause || INITIAL_TICKETS[0].aiRootCause,
              aiRecommendation: bt.aiRecommendation || existing?.aiRecommendation || INITIAL_TICKETS[0].aiRecommendation,
              rawAuditJson: existing?.rawAuditJson || INITIAL_TICKETS[0].rawAuditJson,
            };
          });
        });
      }
    } catch (e) {
      console.warn("Could not load backend tickets:", e);
    }
  }, []);

  // Run initial fetch once on mount
  useEffect(() => {
    refreshTicketsFromBackend();
  }, [refreshTicketsFromBackend]);

  // Load ticket details ONLY when user selects a different ticket
  useEffect(() => {
    if (!selectedTicketId || lastLoadedTicketIdRef.current === selectedTicketId) return;
    lastLoadedTicketIdRef.current = selectedTicketId;

    const targetTicket = ticketsRef.current.find((t) => t.id === selectedTicketId);
    if (!targetTicket?.ticketNumber) return;

    async function loadDetail() {
      const detail = await getTicketDetail(targetTicket!.ticketNumber);
      if (detail && detail.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicketId
              ? {
                  ...t,
                  status: (detail.status as any) || t.status,
                  investigationSteps:
                    detail.investigation_steps && detail.investigation_steps.length > 0
                      ? (detail.investigation_steps as any)
                      : t.investigationSteps,
                  rawAuditJson: detail.raw_audit_json || t.rawAuditJson,
                  aiRootCause: detail.ai_root_cause || t.aiRootCause,
                  aiRecommendation: detail.ai_recommendation || t.aiRecommendation,
                }
              : t
          )
        );
      }
    }
    loadDetail();
  }, [selectedTicketId]);

  // Filtered queue
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        t.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesUrgency = urgencyFilter === "All" || t.urgency === urgencyFilter;
      return matchesSearch && matchesUrgency;
    });
  }, [tickets, searchQuery, urgencyFilter]);

  // Execute real backend actions
  const handleAction = async (actionType: string) => {
    let apiAction = "approve_refund";
    if (actionType.includes("Reject")) apiAction = "reject_claim";
    else if (actionType.includes("KYC") || actionType.includes("Identity")) apiAction = "request_kyc";
    else if (actionType.includes("Escalate")) apiAction = "escalate";
    else if (actionType.includes("Note")) apiAction = "save_note";

    // Extract numeric amount from order amount string
    const parsedAmount = parseFloat(selectedTicket.order.amount.replace(/[^0-9.]/g, "")) || 1499.0;

    const res = await executeManualAction({
      ticket_id: selectedTicket.ticketNumber,
      action: apiAction,
      amount: parsedAmount,
      reason: actionType,
      agent_notes: agentNote,
    });

    if (res.success) {
      const isRefund = apiAction === "approve_refund";
      const finalStatus = isRefund ? "REFUND_PROCESSED" : (res.ticket_status || "Resolved");

      setActionFeedback({
        message: res.message || `Action "${actionType}" executed on ${selectedTicket.ticketNumber}. Reference: ${res.refund_reference || "RF-28491"}`,
        type: "success",
      });

      // Update local ticket status dynamically
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id ? { ...t, status: finalStatus as any } : t
        )
      );
    } else {
      setActionFeedback({
        message: `Action failed: ${res.message}`,
        type: "warn",
      });
    }

    setTimeout(() => {
      setActionFeedback(null);
    }, 5000);
  };

  // Run Live AI Investigation (SSE Stream)
  const runLiveInvestigation = async () => {
    setIsStreaming(true);
    setLiveStreamMsg("Connecting to ResolveAI Multi-Agent Pipeline via SSE...");

    // Temporarily clear timeline to show live additions
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? { ...t, investigationSteps: [] } : t))
    );

    await streamInvestigation(
      {
        message: selectedTicket.summary,
        customer_id: selectedTicket.customer.id,
        order_id: selectedTicket.order.orderId,
        ticket_number: selectedTicket.ticketNumber,
      },
      (event) => {
        if (event.type === "timeline_step") {
          const newStep = event.data;
          setTickets((prev) =>
            prev.map((t) =>
              t.id === selectedTicket.id
                ? {
                    ...t,
                    investigationSteps: [
                      ...t.investigationSteps.filter((s) => s.id !== newStep.id),
                      newStep,
                    ],
                  }
                : t
            )
          );
        } else if (event.type === "policy_grounding") {
          const p = event.data;
          setTickets((prev) =>
            prev.map((t) =>
              t.id === selectedTicket.id
                ? {
                    ...t,
                    matchedPolicy: {
                      policyId: p.policy_id,
                      title: p.title,
                      section: p.section,
                      clause: p.clause,
                      confidence: p.confidence,
                      url: p.url,
                    },
                  }
                : t
            )
          );
        } else if (event.type === "resolution") {
          const r = event.data;
          setTickets((prev) =>
            prev.map((t) =>
              t.id === selectedTicket.id
                ? {
                    ...t,
                    aiRecommendation: {
                      action: r.action,
                      amount: r.amount,
                      rationale: r.rationale,
                      confidence: r.confidence,
                    },
                  }
                : t
            )
          );
        } else if (event.type === "audit_telemetry") {
          const aud = event.data;
          setTickets((prev) =>
            prev.map((t) =>
              t.id === selectedTicket.id ? { ...t, rawAuditJson: aud } : t
            )
          );
        }
      },
      () => {
        setIsStreaming(false);
        setLiveStreamMsg("");
        setActionFeedback({
          message: "Live Multi-Agent Investigation completed successfully via SSE!",
          type: "success",
        });
        setTimeout(() => setActionFeedback(null), 4000);
      },
      (err) => {
        setIsStreaming(false);
        setLiveStreamMsg("");
        console.error("Stream failed:", err);
      }
    );
  };

  const copyAuditJson = () => {
    navigator.clipboard.writeText(JSON.stringify(selectedTicket.rawAuditJson, null, 2));
    setCopiedAudit(true);
    setTimeout(() => setCopiedAudit(false), 2000);
  };

  const downloadAuditJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(selectedTicket.rawAuditJson, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit-trace-${selectedTicket.ticketNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (viewMode === "customer") {
    return <CustomerChat onSwitchToAgent={() => setViewMode("agent")} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      
      {/* ---------------------------------------------------- */}
      {/* 1. TOP METRICS & SYSTEM STATUS BAR                   */}
      {/* ---------------------------------------------------- */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white text-base">ResolveAI</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Tier-2 Agent & Lead Console
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Resolution Copilot • Live Backend Connected</p>
          </div>
        </div>

        {/* Live System Metrics */}
        <div className="hidden lg:flex items-center space-x-6">
          <div className="flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-800">
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Total Tickets Today</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                1,428
                <span className="text-[10px] font-normal text-emerald-400 flex items-center">
                  <ArrowUpRight className="h-3 w-3" /> +12%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-800">
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">AI Auto-Resolved</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                78.4%
                <span className="text-[10px] font-normal text-emerald-400 flex items-center">
                  <TrendingUp className="h-3 w-3" /> +3.2%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-800">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Escalation Rate</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                6.2%
                <span className="text-[10px] font-normal text-emerald-400 flex items-center">
                  <TrendingDown className="h-3 w-3" /> -1.1%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-800">
            <div className="p-2 rounded-md bg-purple-500/10 text-purple-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Avg Handling Time</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                2m 14s
                <span className="text-[10px] font-normal text-emerald-400 flex items-center">
                  -24s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User & Global Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode("customer")}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/40 transition-all flex items-center space-x-2 border border-cyan-400/40 cursor-pointer"
            title="Switch to Customer Live Chat"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Switch to Customer Live Chat</span>
          </button>

          <button 
            onClick={refreshTicketsFromBackend}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            title="Refresh Tickets from Backend"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <div className="h-6 w-[1px] bg-slate-800" />
          
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/20">
              TL
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-white">Tier-2 Lead</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live on Shift
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Global Feedback Toast Notification */}
      {actionFeedback && (
        <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-slate-900 border-b border-indigo-500/30 px-6 py-2 flex items-center justify-between text-xs text-indigo-200 animate-in slide-in-from-top duration-200 z-10">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MAIN 3-PANE LAYOUT                                   */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ==================================================== */}
        {/* PANE 1: LEFT PANE (Ticket Queue)                     */}
        {/* ==================================================== */}
        <aside className="w-80 md:w-96 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-wide">Investigation Queue</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {filteredTickets.length}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-slate-400">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer, ID, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Urgency Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {["All", "Critical", "High", "Medium"].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setUrgencyFilter(pill)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    urgencyFilter === pill
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket List Scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {filteredTickets.map((ticket) => {
              const isSelected = ticket.id === selectedTicket.id;
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-slate-800/90 border-indigo-500/60 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30"
                      : "bg-slate-900/30 border-transparent hover:bg-slate-800/40 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-white truncate max-w-[170px]">
                      {ticket.customer.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {ticket.slaDeadline}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-medium line-clamp-1 mb-2">
                    {ticket.category}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Urgency Badge */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        ticket.urgency === "Critical"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : ticket.urgency === "High"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {ticket.urgency === "Critical" && <AlertOctagon className="h-3 w-3" />}
                      {ticket.urgency}
                    </span>

                    {/* Sentiment Badge */}
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                        ticket.sentiment === "Angry"
                          ? "bg-red-950/60 text-red-300 border border-red-800/40"
                          : ticket.sentiment === "Frustrated"
                          ? "bg-orange-950/60 text-orange-300 border border-orange-800/40"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {ticket.sentiment}
                    </span>

                    {/* Status Badge if Refunded or Resolved */}
                    {ticket.status === "REFUND_PROCESSED" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                        Refund Processed
                      </span>
                    )}
                    {ticket.status === "Resolved" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                        <Check className="h-2.5 w-2.5 text-blue-400" />
                        Resolved
                      </span>
                    )}

                    {/* Ticket Code */}
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono ml-auto">
                      {ticket.ticketNumber}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No tickets match your query.
              </div>
            )}
          </div>
        </aside>

        {/* ==================================================== */}
        {/* PANE 2: CENTER PANE (Active Investigation)           */}
        {/* ==================================================== */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto border-r border-slate-800">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    {selectedTicket.ticketNumber}
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-medium">
                    {selectedTicket.category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                    Created {selectedTicket.createdAt}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedTicket.summary}
                </p>
              </div>

              {/* Status Action Banner & Run SSE Button */}
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={runLiveInvestigation}
                  disabled={isStreaming}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-md shadow-indigo-900/30"
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                      <span>Streaming Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-cyan-300" />
                      <span>Run Live AI Investigation</span>
                    </>
                  )}
                </button>

                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                  selectedTicket.status === "REFUND_PROCESSED"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                    : selectedTicket.status === "Resolved"
                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                }`}>
                  {selectedTicket.status === "REFUND_PROCESSED" || selectedTicket.status === "Resolved" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {selectedTicket.status}
                </span>
              </div>
            </div>

            {/* Live Streaming Indicator */}
            {isStreaming && (
              <div className="mt-3 p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-xs text-cyan-300 flex items-center space-x-2 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{liveStreamMsg || "Live Multi-Agent Investigation executing in backend..."}</span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6 max-w-5xl">
            
            {/* 2.1 Customer & Order Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Customer Profile Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                    <User className="h-4 w-4 text-indigo-400" />
                    <span>Customer 360 Profile</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                    {selectedTicket.customer.tier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Full Name</span>
                    <span className="font-semibold text-white">{selectedTicket.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Account ID</span>
                    <span className="font-mono text-slate-300">{selectedTicket.customer.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Lifetime Value (LTV)</span>
                    <span className="font-bold text-emerald-400">{selectedTicket.customer.lifetimeValue}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Dispute History</span>
                    <span className="font-medium text-slate-300">{selectedTicket.customer.disputeRate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">System Trust Score:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          selectedTicket.customer.trustScore > 80
                            ? "bg-emerald-500"
                            : selectedTicket.customer.trustScore > 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${selectedTicket.customer.trustScore}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-xs text-white">
                      {selectedTicket.customer.trustScore}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Details Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                    <PackageCheck className="h-4 w-4 text-cyan-400" />
                    <span>Associated Transaction</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">
                    {selectedTicket.order.orderId}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Order Date</span>
                    <span className="text-slate-300">{selectedTicket.order.orderDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Total Captured</span>
                    <span className="font-bold text-white">{selectedTicket.order.amount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Carrier / Tracking</span>
                    <span className="font-mono text-cyan-400 truncate block">
                      {selectedTicket.order.trackingNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Tracking Status</span>
                    <span className="text-slate-300 truncate block">
                      {selectedTicket.order.trackingStatus}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60">
                  <div className="text-[11px] text-slate-500 mb-1">Purchased Item(s):</div>
                  {selectedTicket.order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-200 truncate max-w-[220px]">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-mono text-slate-400">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2.2 AI Root Cause & Recommended Action Card */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/40 shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-white tracking-wide">AI Root Cause Synthesis</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                        {selectedTicket.aiRecommendation.confidence}% Confidence
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Synthesized from 4 database tool traces & policy compliance verification</p>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <span className="font-semibold text-indigo-300 block mb-1">Diagnosis:</span>
                {selectedTicket.aiRootCause}
              </div>

              {/* Recommendation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                    Recommended Resolution
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                    {selectedTicket.aiRecommendation.action}
                    {selectedTicket.aiRecommendation.amount && (
                      <span className="font-mono text-emerald-400">
                        ({selectedTicket.aiRecommendation.amount})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedTicket.aiRecommendation.rationale}
                  </p>
                </div>

                <button
                  onClick={() => handleAction(selectedTicket.aiRecommendation.action)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/30 transition-all flex items-center justify-center space-x-2 shrink-0"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Execute Recommendation</span>
                </button>
              </div>
            </div>

            {/* 2.3 Policy Grounding Snippet */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                  <FileSearch className="h-4 w-4 text-amber-400" />
                  <span>Matched Policy Grounding</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  Grounding Confidence: <strong className="text-emerald-400">{selectedTicket.matchedPolicy.confidence}%</strong>
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    {selectedTicket.matchedPolicy.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedTicket.matchedPolicy.section}
                  </span>
                </div>
                <p className="text-xs text-slate-300 italic border-l-2 border-amber-500/60 pl-3 py-0.5">
                  "{selectedTicket.matchedPolicy.clause}"
                </p>
                {selectedTicket.matchedPolicy.url && (
                  <a
                    href={selectedTicket.matchedPolicy.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline pt-1"
                  >
                    <span>View full knowledge base policy documentation</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* 2.4 Step-by-Step Autonomous Investigation Timeline */}
            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  <span>Autonomous Investigation Execution Path</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedTicket.investigationSteps.length} Steps Executed
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                {selectedTicket.investigationSteps.map((step) => (
                  <div key={step.id} className="relative group">
                    <div
                      className={`absolute -left-6 top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center bg-slate-950 ${
                        step.status === "success"
                          ? "border-emerald-500 text-emerald-400"
                          : step.status === "warning"
                          ? "border-amber-500 text-amber-400"
                          : step.status === "error"
                          ? "border-rose-500 text-rose-400"
                          : "border-blue-500 text-blue-400"
                      }`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          step.status === "success"
                            ? "bg-emerald-400"
                            : step.status === "warning"
                            ? "bg-amber-400"
                            : step.status === "error"
                            ? "bg-rose-400"
                            : "bg-blue-400"
                        }`}
                      />
                    </div>

                    <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800/80 space-y-1.5 group-hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">
                            {step.action}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                            {step.tool}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                          {step.latencyMs && <span>{step.latencyMs}ms</span>}
                          <span>•</span>
                          <span>{step.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>

        {/* ==================================================== */}
        {/* PANE 3: RIGHT PANE (Human Decision & Actions)        */}
        {/* ==================================================== */}
        <aside className="w-80 md:w-96 bg-slate-900/40 flex flex-col shrink-0 p-5 space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide mb-1">Human Decision & Override</h2>
            <p className="text-xs text-slate-400">Review AI recommendations and trigger workflow actions.</p>
          </div>

          {/* Action Buttons Group */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Direct Resolution
            </span>

            {/* Approve Full Refund */}
            <button
              onClick={() => handleAction(`Approve Refund (${selectedTicket.order.amount})`)}
              className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2.5">
                <DollarSign className="h-4 w-4 text-emerald-200" />
                <span>Approve Full Refund</span>
              </div>
              <span className="font-mono bg-emerald-700/60 px-2 py-0.5 rounded text-[11px]">
                {selectedTicket.order.amount}
              </span>
            </button>

            {/* Reject Claim */}
            <button
              onClick={() => handleAction("Reject Claim")}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center space-x-2.5"
            >
              <AlertOctagon className="h-4 w-4 text-rose-400" />
              <span>Reject Customer Claim</span>
            </button>

            {/* Request KYC / Verification */}
            <button
              onClick={() => handleAction("Request Biometric/Government KYC")}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 hover:border-amber-800/60 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center space-x-2.5"
            >
              <Lock className="h-4 w-4 text-amber-400" />
              <span>Request Identity / KYC Hold</span>
            </button>

            {/* Escalate to Senior Manager */}
            <button
              onClick={() => handleAction("Escalate to Senior Fraud Lead")}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-all flex items-center space-x-2.5"
            >
              <ShieldAlert className="h-4 w-4 text-purple-400" />
              <span>Escalate to Senior Lead</span>
            </button>
          </div>

          {/* Agent Feedback / Override Notes */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Resolution Memo / Override Rationale
            </label>
            <textarea
              rows={3}
              value={agentNote}
              onChange={(e) => setAgentNote(e.target.value)}
              placeholder="Add audit justification notes for compliance logs..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (!agentNote.trim()) return;
                  handleAction("Attached Compliance Note: " + agentNote);
                  setAgentNote("");
                }}
                disabled={!agentNote.trim()}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-medium transition-colors flex items-center space-x-1.5"
              >
                <Send className="h-3 w-3" />
                <span>Save Note</span>
              </button>
            </div>
          </div>

          {/* Telemetry & Audit Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Autonomous Governance
            </span>

            {/* Raw Audit JSON Modal Trigger */}
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="w-full px-4 py-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 hover:text-indigo-200 border border-indigo-800/40 text-xs font-semibold transition-all flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>View Raw Audit JSON</span>
              </div>
              <Eye className="h-3.5 w-3.5 text-indigo-400" />
            </button>

            {/* Quick Metrics Summary */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Model Engine:</span>
                <span className="text-slate-200 font-mono">Gemini 3.8 Flash</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Token Usage:</span>
                <span className="text-slate-200 font-mono">
                  {selectedTicket.rawAuditJson.total_tokens || "3,120"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Trace ID:</span>
                <span className="text-indigo-400 font-mono truncate max-w-[140px]">
                  {selectedTicket.rawAuditJson.trace_id || "trc_99a812fc"}
                </span>
              </div>
            </div>
          </div>
        </aside>

      </div>

      {/* ==================================================== */}
      {/* 4. RAW JSON AUDIT VIEWER MODAL                       */}
      {/* ==================================================== */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Terminal className="h-5 w-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Raw Telemetry & Audit Trace: {selectedTicket.ticketNumber}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cryptographically groundable inference and execution record
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={downloadAuditJson}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center space-x-1.5 transition-colors border border-slate-700"
                  title="Download JSON"
                >
                  <FileDown className="h-3.5 w-3.5 text-slate-400" />
                  <span>Download</span>
                </button>
                <button
                  onClick={copyAuditJson}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center space-x-1.5 transition-colors border border-slate-700"
                >
                  {copiedAudit ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-cyan-300 leading-relaxed">
              <pre className="whitespace-pre-wrap select-text">
                {JSON.stringify(selectedTicket.rawAuditJson, null, 2)}
              </pre>
            </div>

            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/80">
              <div className="flex items-center space-x-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
                <span>Audited under SOC2 Type II & EU AI Act Governance Protocol</span>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-xs text-white"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
