# ResolveAI Corporate Customer Resolution & Refund Policy

**Policy Document ID**: `POL-REF-2026-V2`  
**Effective Date**: January 1, 2026  
**Governing Unit**: Customer Operations & AI Automated Governance Council  

---

## Section 1: Returns, Carrier Hand-offs & Grace Periods

### Section 1.1: Standard 30-Day Return Eligibility
Customers are entitled to initiate a return within 30 calendar days from the date of confirmed delivery. Returned items must remain in original, undamaged condition with all accessories, cables, and packaging intact.

### Section 1.4: Carrier Drop-Off Timestamp Precedence Rule
If a customer hands over the returned item to an authorized carrier (e.g., FedEx, BlueDart, UPS) within the stipulated 30-day window, any subsequent carrier-induced transit delays, sorting hub stalls, or weather interruptions shall not penalize the customer or forfeit refund eligibility. The official carrier receipt timestamp shall take legal and operational precedence over the warehouse physical intake timestamp.

---

## Section 2: Billing Inquiries, Authorization Holds & Charge Reconciliation

### Section 2.1: Pre-authorization Holds vs Settled Charges
Pre-authorization holds are temporary funds reservations placed by the issuing bank during checkout or subscription renewal. Temporary authorization holds automatically drop off within 3 to 5 business days without debiting the customer's account. Automated reconciliation engines must verify ledger settlement status before initiating duplicate charge refunds.

### Section 2.4: Subscription Renewal Disputes
If a recurring subscription was charged within 48 hours of cancellation, a prorated or full refund is automatically approved if zero product usage (API calls, seat logins) occurred in the subsequent billing cycle.

---

## Section 3: Technical Checkout Failures & Gateway Capture Discrepancies

### Section 3.1.2: Failed Checkout with Captured Funds (Immediate Refund Guarantee)
In events where funds are successfully captured by a payment gateway (e.g., Razorpay UPI, Stripe, Paytm) but internal order creation returns **FAILED**, **CANCELLED**, or **ABORTED** due to inventory lock timeouts, database concurrency deadlocks, or webhook dropouts:
1. **Mandatory Full Reimbursement**: A 100% full refund of the captured amount (including taxes and convenience fees) must be initiated immediately.
2. **Autonomous Tier-1/Tier-2 Resolution**: If payment status is verified as `SUCCESS` and order status is verified as `FAILED`, automated refund creation is pre-approved up to ₹10,000 / $150 with 0 human intervention required.
3. **Turnaround SLA**: UPI transactions are refunded via instant reversal within 2 hours; card transactions settle within 2 to 4 business days.

---

## Section 4: Physical Damage, Defective Goods & Express Replacement

### Section 4.1: In-Transit Hardware Damage Verification
Customers reporting damaged packaging or hardware must provide visual photo/video evidence. Multimodal Computer Vision (CV) inspectors evaluate puncture marks, LCD fractures, and serial numbers.

### Section 4.2.2: VIP Gold & Enterprise Express Fast-Track
For customers in VIP Gold or Enterprise Diamond tiers with trust scores exceeding 85 and dispute rates below 2%, an immediate express replacement unit shall be dispatched upon initial damage validation without requiring prior salvage receipt at the distribution hub.

---

## Section 5: Fraud Prevention, Account Takeover (ATO) & KYC Protocol

### Section 5.1: Address Re-routing on Fresh Accounts
Any post-order shipping address redirect to a freight forwarder, logistics aggregator, or high-risk transit hub on accounts under 90 days old mandates an immediate fulfillment freeze.

### Section 5.3: Mandatory KYC and Biometric Identity Verification
When high-risk signals (e.g., VPN proxy exit nodes, Geo-IP mismatch exceeding 1,000 miles, unverified mobile numbers) accompany high-value orders, customer service must request government-issued photo ID or biometric verification before releasing shipments or executing manual overrides.
