"""
Database Tools for ResolveAI
Real implementations querying and updating the ResolveAI database.
- check_customer(customer_id: str)
- check_order(order_id: str)
- check_payment(order_id: str)
- create_refund_request(order_id: str, amount: float, reason: str)
- create_escalation(ticket_id: str, reason: str, priority: str)
"""

import sys
import os
import random
from typing import Dict, Any, Optional

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import SyncSessionLocal, Base, sync_engine
from backend.models import (
    Customer,
    Order,
    Payment,
    Ticket,
    RefundRequest,
    Escalation,
)


def _get_session():
    """Returns a fresh sync database session, ensuring tables exist."""
    Base.metadata.create_all(bind=sync_engine)
    return SyncSessionLocal()


def check_customer(customer_id: str) -> Dict[str, Any]:
    """
    Lookup customer profile, loyalty tier, trust score, and historical dispute rate.
    Searches by customer_id (e.g., 'cust_101') or email.
    """
    session = _get_session()
    try:
        customer = (
            session.query(Customer)
            .filter((Customer.customer_id == customer_id) | (Customer.email == customer_id))
            .first()
        )

        if not customer:
            return {
                "success": False,
                "error": f"Customer '{customer_id}' not found in database.",
            }

        orders_count = len(customer.orders)
        return {
            "success": True,
            "customer_id": customer.customer_id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "tier": customer.tier,
            "trust_score": customer.trust_score,
            "dispute_rate": f"{customer.dispute_rate:.1f}%",
            "lifetime_value": f"₹{customer.lifetime_value:,.2f}",
            "account_age": customer.account_age,
            "total_orders": orders_count,
        }
    except Exception as e:
        return {"success": False, "error": f"Database query failed: {str(e)}"}
    finally:
        session.close()


def check_order(order_id: str) -> Dict[str, Any]:
    """
    Lookup order details, fulfillment status, line items, carrier tracking, and failure reasons.
    Searches by order_number (e.g., 'ORD-9912') or database ID.
    """
    session = _get_session()
    try:
        order = (
            session.query(Order)
            .filter((Order.order_number == order_id) | (Order.id == (int(order_id) if order_id.isdigit() else -1)))
            .first()
        )

        if not order:
            return {
                "success": False,
                "error": f"Order '{order_id}' not found in database.",
            }

        return {
            "success": True,
            "order_number": order.order_number,
            "customer_id": order.customer.customer_id if order.customer else None,
            "customer_name": order.customer.name if order.customer else None,
            "status": order.status,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "order_date": order.order_date.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "carrier": order.carrier,
            "tracking_number": order.tracking_number,
            "tracking_status": order.tracking_status,
            "failure_reason": order.failure_reason,
            "items": order.items or [],
        }
    except Exception as e:
        return {"success": False, "error": f"Database query failed: {str(e)}"}
    finally:
        session.close()


def check_payment(order_id: str) -> Dict[str, Any]:
    """
    Lookup payment transaction, gateway capture status, and payment method.
    Searches by associated order_number (e.g., 'ORD-9912') or payment_reference (e.g., 'PAY-5541').
    """
    session = _get_session()
    try:
        # Check by payment reference first
        payment = session.query(Payment).filter(Payment.payment_reference == order_id).first()

        # If not found, check by associated order_number
        if not payment:
            order = session.query(Order).filter(Order.order_number == order_id).first()
            if order:
                payment = session.query(Payment).filter(Payment.order_id == order.id).first()

        if not payment:
            return {
                "success": False,
                "error": f"No payment record found associated with '{order_id}'.",
            }

        return {
            "success": True,
            "payment_reference": payment.payment_reference,
            "order_number": payment.order.order_number if payment.order else None,
            "customer_id": payment.customer.customer_id if payment.customer else None,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
            "gateway": payment.gateway,
            "payment_method": payment.payment_method,
            "gateway_transaction_id": payment.gateway_transaction_id,
            "captured_at": payment.captured_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        }
    except Exception as e:
        return {"success": False, "error": f"Database query failed: {str(e)}"}
    finally:
        session.close()


def create_refund_request(order_id: str, amount: float, reason: str) -> Dict[str, Any]:
    """
    Create a new refund request in the database and generate a unique reference ID ('RF-xxxxx').
    Enforces idempotency (duplicate prevention) and strict database amount bounds.
    """
    session = _get_session()
    try:
        order = (
            session.query(Order)
            .filter((Order.order_number == order_id) | (Order.id == (int(order_id) if order_id.isdigit() else -1)))
            .first()
        )

        if not order:
            return {
                "success": False,
                "error": f"Order '{order_id}' not found. Cannot initiate refund.",
            }

        # Idempotency Check: Prevent duplicate refunds on the same order
        existing_refund = (
            session.query(RefundRequest)
            .filter(
                RefundRequest.order_id == order.id,
                RefundRequest.status.in_(["PENDING", "APPROVED", "PROCESSED"])
            )
            .first()
        )
        if existing_refund:
            return {
                "success": True,
                "refund_reference": existing_refund.refund_reference,
                "order_number": order.order_number,
                "customer_id": order.customer.customer_id if order.customer else None,
                "amount": existing_refund.amount,
                "currency": existing_refund.currency,
                "status": existing_refund.status,
                "is_duplicate": True,
                "reason": existing_refund.reason,
                "created_at": existing_refund.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "message": f"Existing refund {existing_refund.refund_reference} found for order {order.order_number}. Duplicate prevented.",
            }

        # Amount cross-verification: Do not allow amounts exceeding captured order total
        if amount > order.total_amount:
            return {
                "success": False,
                "error": f"Requested refund amount ({amount}) exceeds order total ({order.total_amount}). Operation rejected by security boundary.",
            }

        # Generate unique RF-xxxxx reference
        while True:
            random_digits = random.randint(10000, 99999)
            refund_ref = f"RF-{random_digits}"
            existing = session.query(RefundRequest).filter_by(refund_reference=refund_ref).first()
            if not existing:
                break

        refund = RefundRequest(
            refund_reference=refund_ref,
            order_id=order.id,
            customer_id=order.customer_id,
            amount=amount,
            currency=order.currency,
            status="PENDING",
            reason=reason,
        )
        session.add(refund)

        # Update order status to reflect refund in progress
        order.status = "REFUND_REQUESTED"

        session.commit()

        return {
            "success": True,
            "refund_reference": refund.refund_reference,
            "order_number": order.order_number,
            "customer_id": order.customer.customer_id if order.customer else None,
            "amount": refund.amount,
            "currency": refund.currency,
            "status": refund.status,
            "is_duplicate": False,
            "reason": refund.reason,
            "created_at": refund.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "message": f"Refund request {refund.refund_reference} for {order.currency} {refund.amount} successfully created in database.",
        }
    except Exception as e:
        session.rollback()
        return {"success": False, "error": f"Failed to create refund request: {str(e)}"}
    finally:
        session.close()


def create_escalation(ticket_id: str, reason: str, priority: str = "High") -> Dict[str, Any]:
    """
    Create an escalation record in the database with a unique ID ('ESC-xxxxx')
    and update the ticket status to 'Escalated'.
    """
    session = _get_session()
    try:
        ticket = (
            session.query(Ticket)
            .filter((Ticket.ticket_number == ticket_id) | (Ticket.id == (int(ticket_id) if ticket_id.isdigit() else -1)))
            .first()
        )

        if not ticket:
            return {
                "success": False,
                "error": f"Ticket '{ticket_id}' not found. Cannot escalate.",
            }

        # Generate unique ESC-xxxxx reference
        while True:
            random_digits = random.randint(10000, 99999)
            escalation_ref = f"ESC-{random_digits}"
            existing = session.query(Escalation).filter_by(escalation_id=escalation_ref).first()
            if not existing:
                break

        escalation = Escalation(
            escalation_id=escalation_ref,
            ticket_id=ticket.id,
            customer_id=ticket.customer_id,
            order_id=ticket.order_id,
            reason=reason,
            priority=priority,
            status="OPEN",
        )
        session.add(escalation)

        # Update ticket status
        ticket.status = "Escalated"
        ticket.urgency = priority if priority in ["Critical", "High", "Medium", "Low"] else "High"

        session.commit()

        return {
            "success": True,
            "escalation_id": escalation.escalation_id,
            "ticket_number": ticket.ticket_number,
            "customer_id": ticket.customer.customer_id if ticket.customer else None,
            "priority": escalation.priority,
            "status": escalation.status,
            "reason": escalation.reason,
            "created_at": escalation.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "message": f"Escalation {escalation.escalation_id} logged. Ticket {ticket.ticket_number} marked as Escalated.",
        }
    except Exception as e:
        session.rollback()
        return {"success": False, "error": f"Failed to create escalation: {str(e)}"}
    finally:
        session.close()
