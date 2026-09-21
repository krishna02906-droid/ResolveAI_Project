"""
Standalone Demo Data Seeder for ResolveAI
Inserts:
- Customer: 'Rahul Sharma' (cust_101)
- Order: #ORD-9912 (status: 'FAILED', amount: 1499 INR)
- Payment: #PAY-5541 (status: 'SUCCESS', amount: 1499 INR, gateway: 'Razorpay UPI')
- Ticket: #RES-8924 linked with investigation telemetry and tool calls
"""

import sys
import os
import datetime
import uuid

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from backend.database import Base, sync_engine, SyncSessionLocal
from backend.models import (
    User,
    Customer,
    Order,
    Payment,
    Ticket,
    AgentRun,
    ToolCall,
    Escalation,
)


def seed_database():
    print("=" * 60)
    print("🚀 Initializing ResolveAI Database & Seeding Live Demo Data")
    print("=" * 60)

    # 1. Create all tables if they do not exist
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=sync_engine)
    print("✅ Tables created or verified successfully.")

    session = SyncSessionLocal()

    try:
        # 2. Seed Default Support Lead User
        lead_user = session.query(User).filter_by(email="lead@resolveai.corp").first()
        if not lead_user:
            lead_user = User(
                email="lead@resolveai.corp",
                hashed_password="pbkdf2:sha256:mock_hash_for_lead",
                full_name="Tier-2 Lead Agent",
                role="lead",
                is_active=True,
            )
            session.add(lead_user)
            session.flush()
            print("👤 Seeded Lead User: lead@resolveai.corp")
        else:
            print("ℹ️ Lead User already exists.")

        # 3. Seed Customer: Rahul Sharma (cust_101)
        customer = session.query(Customer).filter_by(customer_id="cust_101").first()
        if not customer:
            customer = Customer(
                customer_id="cust_101",
                name="Rahul Sharma",
                email="rahul.sharma@example.com",
                phone="+91 98765 43210",
                tier="VIP Gold",
                trust_score=92,
                dispute_rate=0.0,
                account_age="2.1 yrs",
                lifetime_value=42900.0,
            )
            session.add(customer)
            session.flush()
            print(f"👤 Seeded Customer: {customer.name} ({customer.customer_id}) - Tier: {customer.tier}")
        else:
            print(f"ℹ️ Customer {customer.customer_id} already exists.")

        # 4. Seed Order: #ORD-9912 (FAILED, ₹1499)
        order = session.query(Order).filter_by(order_number="ORD-9912").first()
        if not order:
            order = Order(
                order_number="ORD-9912",
                customer_id=customer.id,
                order_date=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=45),
                total_amount=1499.0,
                currency="INR",
                status="FAILED",
                carrier="BlueDart",
                tracking_number="BD-99124910",
                tracking_status="Order Creation Aborted",
                failure_reason="Payment captured at gateway, but order fulfillment worker timed out on inventory reservation.",
                items=[
                    {
                        "name": "Wireless Gaming Earbuds Pro",
                        "sku": "WGE-PRO-BLK",
                        "quantity": 1,
                        "price": 1499.0,
                    }
                ],
            )
            session.add(order)
            session.flush()
            print(f"📦 Seeded Order: {order.order_number} | Status: {order.status} | Total: ₹{order.total_amount}")
        else:
            print(f"ℹ️ Order {order.order_number} already exists.")

        # 5. Seed Payment: #PAY-5541 (SUCCESS, ₹1499, Razorpay UPI)
        payment = session.query(Payment).filter_by(payment_reference="PAY-5541").first()
        if not payment:
            payment = Payment(
                payment_reference="PAY-5541",
                order_id=order.id,
                customer_id=customer.id,
                amount=1499.0,
                currency="INR",
                status="SUCCESS",
                gateway="Razorpay",
                payment_method="UPI (rahul@okaxis)",
                gateway_transaction_id="pay_N94182901",
                captured_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=44),
            )
            session.add(payment)
            session.flush()
            print(f"💳 Seeded Payment: {payment.payment_reference} | Status: {payment.status} | Gateway: {payment.gateway} ({payment.payment_method})")
        else:
            print(f"ℹ️ Payment {payment.payment_reference} already exists.")

        # 6. Seed Ticket: #RES-8924
        ticket = session.query(Ticket).filter_by(ticket_number="RES-8924").first()
        if not ticket:
            ticket = Ticket(
                ticket_number="RES-8924",
                customer_id=customer.id,
                order_id=order.id,
                assigned_to=lead_user.id,
                category="Payment Debited but Order Failed",
                urgency="Critical",
                sentiment="Frustrated",
                status="Needs Review",
                summary="Customer was debited ₹1499 via UPI, but order #ORD-9912 is marked FAILED on the platform. Customer seeks immediate refund or order reinstatement.",
                ai_root_cause="Webhook race condition: Razorpay payment capture succeeded, but inventory lock service encountered a 504 gateway timeout, triggering automatic order rollback while leaving captured funds unrefunded.",
                ai_recommendation={
                    "action": "Approve Full Refund",
                    "amount": "₹1,499.00",
                    "rationale": "Payment captured without order creation. Policy Section 3.1.2 mandates instantaneous automated refund for technical checkout failures.",
                    "confidence": 99.4,
                },
                matched_policy={
                    "policy_id": "POL-PAY-3.1",
                    "title": "Failed Checkout with Captured Funds Policy",
                    "section": "Section 3.1.2: Automatic Refund for Inventory Timeout Failures",
                    "confidence": 99.4,
                    "clause": "In events where funds are captured at the payment gateway but order fulfillment returns FAILED or CANCELLED due to technical timeout, full reimbursement must be processed immediately without deduction.",
                    "url": "https://internal.resolveai.corp/policies/payment#3-1-2",
                },
                sla_deadline="18m remaining",
            )
            session.add(ticket)
            session.flush()
            print(f"🎫 Seeded Ticket: {ticket.ticket_number} | Category: {ticket.category} | Urgency: {ticket.urgency}")

            # 7. Seed Investigation Agent Run & Tool Calls
            trace_id = "trc_" + uuid.uuid4().hex[:14]
            agent_run = AgentRun(
                run_id=str(uuid.uuid4()),
                ticket_id=ticket.id,
                trace_id=trace_id,
                model_name="gemini-3.8-flash-investigator",
                execution_mode="semi_autonomous_tier2",
                latency_ms=842,
                total_tokens=3120,
                status="completed",
                eval_rubrics={
                    "customer_intent_score": 0.99,
                    "fraud_risk_score": 0.01,
                    "policy_adherence_index": 1.0,
                    "payment_reconciliation_certainty": 1.0,
                },
                telemetry={
                    "payment_status": "CAPTURED",
                    "order_status": "FAILED",
                    "delta_time_seconds": 60,
                    "gateway_trace": "pay_N94182901",
                },
            )
            session.add(agent_run)
            session.flush()

            # Seed Step-by-Step Tool Calls
            tool_calls_data = [
                {
                    "tool_name": "check_customer",
                    "action_label": "Customer Profile & Fraud Risk Lookup",
                    "input_arguments": {"customer_id": "cust_101"},
                    "output_result": {
                        "name": "Rahul Sharma",
                        "tier": "VIP Gold",
                        "trust_score": 92,
                        "dispute_rate": 0.0,
                    },
                    "status": "success",
                    "detail": "Verified customer Rahul Sharma (cust_101). VIP Gold tier with 0.0% historical dispute rate and 92/100 trust score.",
                    "latency_ms": 135,
                },
                {
                    "tool_name": "check_order",
                    "action_label": "Order Fulfillment & Inventory State",
                    "input_arguments": {"order_number": "ORD-9912"},
                    "output_result": {
                        "status": "FAILED",
                        "amount": 1499.0,
                        "failure_reason": "Inventory lock timeout",
                    },
                    "status": "warning",
                    "detail": "Order #ORD-9912 status is FAILED. Warehouse inventory reservation aborted due to 504 gateway timeout.",
                    "latency_ms": 280,
                },
                {
                    "tool_name": "check_payment",
                    "action_label": "Gateway Ledger Settlement Verification",
                    "input_arguments": {"payment_reference": "PAY-5541"},
                    "output_result": {
                        "status": "SUCCESS",
                        "amount": 1499.0,
                        "gateway": "Razorpay",
                    },
                    "status": "success",
                    "detail": "Payment #PAY-5541 confirmed SUCCESS. ₹1,499.00 captured by Razorpay UPI (txn: pay_N94182901). Discrepancy confirmed.",
                    "latency_ms": 210,
                },
                {
                    "tool_name": "search_policy",
                    "action_label": "Policy Engine Grounding & Compliance",
                    "input_arguments": {"query": "payment captured order failed inventory timeout"},
                    "output_result": {
                        "policy_id": "POL-PAY-3.1",
                        "confidence": 99.4,
                    },
                    "status": "success",
                    "detail": "Matched Policy 3.1.2: Automatic Refund for Inventory Timeout Failures with 99.4% confidence.",
                    "latency_ms": 195,
                },
            ]

            for idx, tc in enumerate(tool_calls_data):
                tool_call = ToolCall(
                    agent_run_id=agent_run.id,
                    ticket_id=ticket.id,
                    tool_name=tc["tool_name"],
                    action_label=tc["action_label"],
                    input_arguments=tc["input_arguments"],
                    output_result=tc["output_result"],
                    status=tc["status"],
                    detail=tc["detail"],
                    latency_ms=tc["latency_ms"],
                    timestamp=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=60 - idx * 10),
                )
                session.add(tool_call)

        # 8. Seed Customer: Priya Verma (cust_102) & Ticket: RES-8925
        cust2 = session.query(Customer).filter_by(customer_id="cust_102").first()
        if not cust2:
            cust2 = Customer(
                customer_id="cust_102",
                name="Priya Verma",
                email="priya.verma@example.com",
                phone="+91 91234 56789",
                tier="Standard",
                trust_score=42,
                dispute_rate=14.0,
                account_age="18 days",
                lifetime_value=24999.0,
            )
            session.add(cust2)
            session.flush()

            order2 = Order(
                order_number="ORD-8891",
                customer_id=cust2.id,
                order_date=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2),
                total_amount=24999.0,
                currency="INR",
                status="ON_HOLD",
                carrier="BlueDart",
                tracking_number="BD-88910412",
                tracking_status="Fulfillment Frozen - Security Hold",
                failure_reason="Suspicious shipping address redirect to unverified freight forwarder.",
                items=[{"name": "iPhone 16 Pro Max 256GB", "sku": "APL-IPH16-256", "quantity": 1, "price": 24999.0}],
            )
            session.add(order2)
            session.flush()

            ticket2 = Ticket(
                ticket_number="RES-8925",
                customer_id=cust2.id,
                order_id=order2.id,
                assigned_to=lead_user.id,
                category="Unauthorized Password Reset & ATO Alert",
                urgency="Critical",
                sentiment="Angry",
                status="Pending Action",
                summary="Unauthorized password reset attempt followed by sudden shipping address redirect to freight forwarder hub.",
                ai_root_cause="High probability account takeover (ATO) attempt. Login Geo-IP mismatch (Lagos, Nigeria vs Mumbai) through anonymous VPN proxy.",
                ai_recommendation={
                    "action": "Request KYC & Freeze Fulfillment",
                    "rationale": "High-risk signals on fresh account. Section 5.3 mandates biometric/government KYC verification.",
                    "confidence": 99.7,
                },
                matched_policy={
                    "policy_id": "POL-SEC-5.3",
                    "title": "Fraud Prevention & Mandatory KYC Protocol",
                    "section": "Section 5.3: Mandatory KYC for High-Risk Re-routing",
                    "confidence": 99.7,
                    "clause": "When high-risk signals accompany high-value orders on accounts under 90 days, customer service must request government-issued photo ID or biometric verification before releasing shipments.",
                    "url": "https://internal.resolveai.corp/policies#section-5.3",
                },
                sla_deadline="Immediate Attention",
            )
            session.add(ticket2)
            session.flush()
            print("👤 Seeded Priya Verma (RES-8925) - Security Hold")

        # 9. Seed Customer: Amit Patel (cust_103) & Ticket: RES-8920
        cust3 = session.query(Customer).filter_by(customer_id="cust_103").first()
        if not cust3:
            cust3 = Customer(
                customer_id="cust_103",
                name="Amit Patel",
                email="amit.patel@example.com",
                phone="+91 98111 22334",
                tier="VIP Gold",
                trust_score=96,
                dispute_rate=0.0,
                account_age="3.2 yrs",
                lifetime_value=84500.0,
            )
            session.add(cust3)
            session.flush()

            order3 = Order(
                order_number="ORD-8821",
                customer_id=cust3.id,
                order_date=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=3),
                total_amount=3200.0,
                currency="INR",
                status="IN_TRANSIT",
                carrier="BlueDart",
                tracking_number="BD-88219012",
                tracking_status="In Transit - Hub Delayed",
                failure_reason="Carrier monsoon weather disruption.",
                items=[{"name": "Mechanical Gaming Keyboard RGB", "sku": "KEY-MECH-RGB", "quantity": 1, "price": 3200.0}],
            )
            session.add(order3)
            session.flush()

            ticket3 = Ticket(
                ticket_number="RES-8920",
                customer_id=cust3.id,
                order_id=order3.id,
                assigned_to=lead_user.id,
                category="Carrier Transit Delay Concession",
                urgency="Low",
                sentiment="Neutral",
                status="Resolved",
                summary="Package transit delayed by 48h due to regional weather warning. Customer notified and concession granted.",
                ai_root_cause="Regional monsoon weather delayed carrier long-haul feeder truck at regional sorting hub.",
                ai_recommendation={
                    "action": "Concession Credit Issued",
                    "amount": "₹250.00",
                    "rationale": "VIP Gold customer affected by verifiable carrier delay. Section 1.4 concession applied.",
                    "confidence": 98.2,
                },
                matched_policy={
                    "policy_id": "POL-LOG-1.4",
                    "title": "Carrier Hand-Off & Transit Delay Precedence",
                    "section": "Section 1.4: Carrier Drop-Off Precedence Rule",
                    "confidence": 98.2,
                    "clause": "Carrier-induced transit delays shall not penalize the customer. VIP tier accounts qualify for automatic goodwill courtesy credits.",
                    "url": "https://internal.resolveai.corp/policies#section-1.4",
                },
                sla_deadline="Resolved",
            )
            session.add(ticket3)
            session.flush()
            print("👤 Seeded Amit Patel (RES-8920) - Resolved by AI")
        session.commit()
        print("=" * 60)
        print("🎉 Seeding Completed Successfully! All demo data is live in the database.")
        print("=" * 60)

    except Exception as e:
        session.rollback()
        print(f"❌ Error while seeding database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
