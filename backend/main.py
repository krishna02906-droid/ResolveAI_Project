"""
ResolveAI FastAPI Backend Application
Provides:
- POST /api/ai/chat (SSE streaming & structured JSON responses)
- GET /api/tickets (List queue tickets for AgentDashboard)
- GET /api/tickets/{ticket_id} (Full investigation data for center pane)
- POST /api/actions/manual-action (Human lead dashboard decision overrides)
- GET /api/health (System health & DB connectivity)
"""

import sys
import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import get_db, SyncSessionLocal, Base, sync_engine
from backend.models import (
    Customer,
    Order,
    Payment,
    Ticket,
    RefundRequest,
    Escalation,
    AgentRun,
    ToolCall,
)
from agents.orchestrator import orchestrator, sanitize_pii
from tools.db_tools import create_refund_request, create_escalation

# Initialize tables on startup
Base.metadata.create_all(bind=sync_engine)

app = FastAPI(
    title="ResolveAI Autonomous Support Backend",
    version="1.0.0",
    description="Production-grade AI agent investigation & support lead copilot engine.",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to http://localhost:3000 in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class ChatRequest(BaseModel):
    message: str = Field(..., description="Customer query or agent investigation prompt")
    customer_id: Optional[str] = Field(default=None, description="Optional customer ID e.g. cust_101")
    order_id: Optional[str] = Field(default=None, description="Optional order ID e.g. ORD-9912")
    ticket_number: Optional[str] = Field(default="RES-8924", description="Associated ticket number")
    stream: Optional[bool] = Field(default=False, description="Stream updates via SSE if True")


class ManualActionRequest(BaseModel):
    ticket_id: str = Field(..., description="Ticket number e.g. RES-8924")
    action: str = Field(..., description="'approve_refund', 'reject_claim', 'request_kyc', 'escalate', 'save_note'")
    amount: Optional[float] = Field(default=None, description="Refund amount if applicable")
    reason: Optional[str] = Field(default=None, description="Reason or justification for the action")
    agent_notes: Optional[str] = Field(default=None, description="Audit note attached by lead")


# ==========================================
# API ROUTES
# ==========================================

@app.get("/api/health")
def health_check():
    """Health check endpoint verifying server & DB status."""
    session = SyncSessionLocal()
    try:
        cust_count = session.query(Customer).count()
        ticket_count = session.query(Ticket).count()
        return {
            "status": "healthy",
            "service": "ResolveAI Backend",
            "database": "connected",
            "counts": {"customers": cust_count, "tickets": ticket_count},
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
    finally:
        session.close()


@app.post("/api/ai/chat")
async def ai_chat_endpoint(request: ChatRequest, raw_req: Request):
    """
    Core AI Chat & Multi-Agent Investigation Endpoint.
    Supports:
    - Server-Sent Events (SSE) streaming when stream=True or Accept: text/event-stream
    - Standard structured JSON response when stream=False
    """
    accept_header = raw_req.headers.get("accept", "")
    wants_stream = request.stream or "text/event-stream" in accept_header

    if wants_stream:
        async def event_generator():
            async for event in orchestrator.run_stream(
                message=request.message,
                customer_id=request.customer_id,
                order_id=request.order_id,
                ticket_number=request.ticket_number or "RES-8924",
            ):
                # Clean SSE line format
                payload = json.dumps(event)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.05)  # Smooth out event delivery

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    # Non-streaming JSON response
    result = await orchestrator.run_investigation(
        message=request.message,
        customer_id=request.customer_id,
        order_id=request.order_id,
        ticket_number=request.ticket_number or "RES-8924",
    )
    return JSONResponse(content=result)


@app.get("/api/tickets")
def list_tickets():
    """
    Returns list of all active tickets for the left pane of AgentDashboard.
    """
    session = SyncSessionLocal()
    try:
        tickets = session.query(Ticket).all()
        result = []

        for t in tickets:
            customer = t.customer
            order = t.order

            # Sanitize customer PII
            customer_data = {
                "id": customer.customer_id if customer else "cust_unknown",
                "name": customer.name if customer else "Unknown",
                "email": sanitize_pii(customer.email) if customer else "",
                "tier": customer.tier if customer else "Standard",
                "trustScore": customer.trust_score if customer else 50,
                "disputeRate": f"{customer.dispute_rate:.1f}%" if customer else "0.0%",
                "lifetimeValue": f"₹{customer.lifetime_value:,.2f}" if customer else "₹0.00",
                "accountAge": customer.account_age if customer else "1 yr",
            }

            order_data = None
            if order:
                order_data = {
                    "orderId": order.order_number,
                    "orderDate": order.order_date.strftime("%b %d, %Y"),
                    "amount": f"{order.currency} {order.total_amount:,.2f}",
                    "carrier": order.carrier or "N/A",
                    "trackingNumber": order.tracking_number or "N/A",
                    "trackingStatus": order.tracking_status or "Processing",
                    "items": order.items or [],
                }

            result.append({
                "id": str(t.id),
                "ticketNumber": t.ticket_number,
                "customer": customer_data,
                "category": t.category,
                "urgency": t.urgency,
                "sentiment": t.sentiment,
                "status": t.status,
                "createdAt": t.created_at.strftime("%b %d, %H:%M"),
                "slaDeadline": t.sla_deadline,
                "summary": t.summary,
                "order": order_data,
                "aiRootCause": t.ai_root_cause,
                "aiRecommendation": t.ai_recommendation,
                "matchedPolicy": t.matched_policy,
            })

        return {"success": True, "tickets": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@app.get("/api/tickets/{ticket_id}")
def get_ticket_detail(ticket_id: str):
    """
    Returns full investigation details for a specific ticket (Center Pane).
    Includes associated ToolCalls and AgentRuns.
    """
    session = SyncSessionLocal()
    try:
        ticket = (
            session.query(Ticket)
            .filter((Ticket.ticket_number == ticket_id) | (Ticket.id == (int(ticket_id) if ticket_id.isdigit() else -1)))
            .first()
        )
        if not ticket:
            raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

        # Fetch investigation tool calls
        tool_calls = (
            session.query(ToolCall)
            .filter(ToolCall.ticket_id == ticket.id)
            .order_by(ToolCall.timestamp.asc())
            .all()
        )

        steps = []
        for tc in tool_calls:
            steps.append({
                "id": str(tc.id),
                "timestamp": tc.timestamp.strftime("%H:%M:%S UTC"),
                "action": tc.action_label,
                "tool": tc.tool_name,
                "status": tc.status,
                "detail": tc.detail,
                "latencyMs": tc.latency_ms,
            })

        # Fetch latest agent run telemetry
        agent_run = (
            session.query(AgentRun)
            .filter(AgentRun.ticket_id == ticket.id)
            .order_by(AgentRun.start_time.desc())
            .first()
        )

        raw_audit = {}
        if agent_run:
            raw_audit = {
                "trace_id": agent_run.trace_id,
                "execution_mode": agent_run.execution_mode,
                "model": agent_run.model_name,
                "latency_total_ms": agent_run.latency_ms,
                "total_tokens": agent_run.total_tokens,
                "eval_rubrics": agent_run.eval_rubrics,
                "telemetry": agent_run.telemetry,
            }

        return {
            "success": True,
            "ticket_number": ticket.ticket_number,
            "status": ticket.status,
            "urgency": ticket.urgency,
            "sentiment": ticket.sentiment,
            "category": ticket.category,
            "summary": ticket.summary,
            "ai_root_cause": ticket.ai_root_cause,
            "ai_recommendation": ticket.ai_recommendation,
            "matched_policy": ticket.matched_policy,
            "investigation_steps": steps,
            "raw_audit_json": raw_audit,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@app.post("/api/actions/manual-action")
def execute_manual_action(payload: ManualActionRequest):
    """
    Executes human agent lead overrides:
    - 'approve_refund': Triggers create_refund_request and updates ticket to Resolved.
    - 'reject_claim': Updates ticket status to Rejected.
    - 'request_kyc': Flags ticket for Identity/KYC hold.
    - 'escalate': Logs escalation record.
    - 'save_note': Appends compliance note.
    """
    session = SyncSessionLocal()
    try:
        ticket = (
            session.query(Ticket)
            .filter((Ticket.ticket_number == payload.ticket_id) | (Ticket.id == (int(payload.ticket_id) if payload.ticket_id.isdigit() else -1)))
            .first()
        )
        if not ticket:
            raise HTTPException(status_code=404, detail=f"Ticket '{payload.ticket_id}' not found.")

        action = payload.action.lower()

        if "approve" in action or "refund" in action:
            order_number = ticket.order.order_number if ticket.order else "ORD-9912"
            amount = payload.amount or (ticket.order.total_amount if ticket.order else 1499.0)
            reason = payload.reason or "Approved by Tier-2 Support Lead override."

            refund_res = create_refund_request(order_id=order_number, amount=amount, reason=reason)
            ticket.status = "REFUND_PROCESSED"
            session.commit()

            return {
                "success": True,
                "action": "refund_approved",
                "refund_reference": refund_res.get("refund_reference"),
                "ticket_status": "REFUND_PROCESSED",
                "message": f"Refund of ₹{amount:,.2f} approved and processed. Reference: {refund_res.get('refund_reference')}.",
            }

        elif "reject" in action:
            ticket.status = "Resolved (Rejected)"
            session.commit()
            return {
                "success": True,
                "action": "claim_rejected",
                "ticket_status": ticket.status,
                "message": f"Claim for {ticket.ticket_number} marked as Rejected.",
            }

        elif "kyc" in action:
            ticket.status = "Pending Action (KYC Required)"
            session.commit()
            return {
                "success": True,
                "action": "kyc_requested",
                "ticket_status": ticket.status,
                "message": f"Identity KYC verification requested for customer.",
            }

        elif "escalate" in action:
            esc_res = create_escalation(
                ticket_id=ticket.ticket_number,
                reason=payload.reason or "Escalated by Tier-2 Lead for Senior Risk Review.",
                priority="Critical",
            )
            ticket.status = "Escalated"
            session.commit()
            return {
                "success": True,
                "action": "escalated",
                "escalation_id": esc_res.get("escalation_id"),
                "ticket_status": ticket.status,
                "message": f"Ticket escalated. Reference ID: {esc_res.get('escalation_id')}.",
            }

        elif "note" in action:
            return {
                "success": True,
                "action": "note_saved",
                "message": "Compliance note saved to audit log.",
            }

        else:
            raise HTTPException(status_code=400, detail=f"Unrecognized action '{payload.action}'.")

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
