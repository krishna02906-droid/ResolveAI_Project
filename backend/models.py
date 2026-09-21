import datetime
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from backend.database import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="agent", nullable=False)  # 'agent', 'lead', 'admin'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    assigned_tickets = relationship("Ticket", back_populates="assignee")
    escalations = relationship("Escalation", back_populates="assignee")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g., 'cust_101'
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    tier = Column(String(50), default="Standard", nullable=False)  # 'Standard', 'VIP Gold', 'Enterprise Diamond'
    trust_score = Column(Integer, default=80, nullable=False)  # 0 to 100
    dispute_rate = Column(Float, default=0.0, nullable=False)  # e.g., 0.0, 12.5%
    account_age = Column(String(50), default="1 yr", nullable=False)
    lifetime_value = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="customer")
    tickets = relationship("Ticket", back_populates="customer")
    escalations = relationship("Escalation", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_number = Column(String(100), unique=True, index=True, nullable=False)  # e.g., 'ORD-9912'
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    order_date = Column(DateTime, default=utc_now, nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), nullable=False)  # 'FAILED', 'SUCCESS', 'DELIVERED', 'PENDING', 'CANCELLED'
    carrier = Column(String(100), nullable=True)  # e.g., 'BlueDart', 'FedEx'
    tracking_number = Column(String(100), nullable=True)
    tracking_status = Column(String(100), nullable=True)
    failure_reason = Column(Text, nullable=True)
    items = Column(JSON, nullable=True)  # List of {name, sku, quantity, price}
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    payments = relationship("Payment", back_populates="order")
    tickets = relationship("Ticket", back_populates="order")
    escalations = relationship("Escalation", back_populates="order")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    payment_reference = Column(String(100), unique=True, index=True, nullable=False)  # e.g., 'PAY-5541'
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), nullable=False)  # 'SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'
    gateway = Column(String(50), default="Razorpay", nullable=False)  # 'Razorpay', 'Stripe', 'Paytm'
    payment_method = Column(String(50), default="UPI", nullable=False)  # 'UPI', 'Credit Card', 'Net Banking'
    gateway_transaction_id = Column(String(100), nullable=True)
    captured_at = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    customer = relationship("Customer", back_populates="payments")
    order = relationship("Order", back_populates="payments")


class RefundRequest(Base):
    __tablename__ = "refund_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    refund_reference = Column(String(100), unique=True, index=True, nullable=False)  # e.g., 'RF-28491'
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # 'PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'
    reason = Column(Text, nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    order = relationship("Order", backref="refund_requests")
    customer = relationship("Customer", backref="refund_requests")
    approver = relationship("User", backref="approved_refunds")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_number = Column(String(100), unique=True, index=True, nullable=False)  # e.g., 'RES-8924'
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(100), nullable=False)  # 'Failed Order with Captured Payment', 'Return & Refund', etc.
    urgency = Column(String(50), default="Medium", nullable=False)  # 'Critical', 'High', 'Medium', 'Low'
    sentiment = Column(String(50), default="Neutral", nullable=False)  # 'Angry', 'Frustrated', 'Neutral', 'Satisfied'
    status = Column(String(50), default="Needs Review", nullable=False)  # 'Needs Review', 'Pending Action', 'Investigating', 'Resolved', 'Escalated'
    summary = Column(Text, nullable=False)
    ai_root_cause = Column(Text, nullable=True)
    ai_recommendation = Column(JSON, nullable=True)  # {action, amount, rationale, confidence}
    matched_policy = Column(JSON, nullable=True)  # {policy_id, section, clause, confidence, url}
    sla_deadline = Column(String(50), default="30m remaining", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    customer = relationship("Customer", back_populates="tickets")
    order = relationship("Order", back_populates="tickets")
    assignee = relationship("User", back_populates="assigned_tickets")
    agent_runs = relationship("AgentRun", back_populates="ticket", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="ticket")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(String(100), unique=True, index=True, nullable=False)  # UUID
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    trace_id = Column(String(100), nullable=False)  # e.g., 'trc_99a812fc'
    model_name = Column(String(100), default="gemini-3.8-flash", nullable=False)
    execution_mode = Column(String(100), default="autonomous_investigator", nullable=False)
    start_time = Column(DateTime, default=utc_now, nullable=False)
    end_time = Column(DateTime, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    total_tokens = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="running", nullable=False)  # 'running', 'completed', 'failed'
    eval_rubrics = Column(JSON, nullable=True)
    telemetry = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    ticket = relationship("Ticket", back_populates="agent_runs")
    tool_calls = relationship("ToolCall", back_populates="agent_run", cascade="all, delete-orphan")


class ToolCall(Base):
    __tablename__ = "tool_calls"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    agent_run_id = Column(Integer, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    tool_name = Column(String(100), nullable=False)  # 'check_customer', 'check_order', 'check_payment', etc.
    action_label = Column(String(255), nullable=False)
    input_arguments = Column(JSON, nullable=True)
    output_result = Column(JSON, nullable=True)
    status = Column(String(50), default="success", nullable=False)  # 'success', 'warning', 'error', 'info'
    detail = Column(Text, nullable=False)
    latency_ms = Column(Integer, default=0, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    agent_run = relationship("AgentRun", back_populates="tool_calls")


class Escalation(Base):
    __tablename__ = "escalations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    escalation_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g., 'ESC-89201'
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=False)
    priority = Column(String(50), default="High", nullable=False)  # 'Critical', 'High', 'Medium', 'Low'
    status = Column(String(50), default="OPEN", nullable=False)  # 'OPEN', 'IN_REVIEW', 'RESOLVED'
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    ticket = relationship("Ticket", back_populates="escalations")
    customer = relationship("Customer", back_populates="escalations")
    order = relationship("Order", back_populates="escalations")
    assignee = relationship("User", back_populates="escalations")
