"""
Verification Test Script for ResolveAI Tools
Tests:
1. check_customer("cust_101")
2. check_order("ORD-9912")
3. check_payment("ORD-9912")
4. create_refund_request("ORD-9912", 1499.0, "Payment captured for failed order")
5. create_escalation("RES-8924", "Customer requested expedited manual lead review", "Critical")
6. search_policy("customer debited payment captured but order failed timeout")
"""

import sys
import os
import json

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from tools.db_tools import (
    check_customer,
    check_order,
    check_payment,
    create_refund_request,
    create_escalation,
)
from tools.search_tools import search_policy


def run_verification():
    print("=" * 65)
    print("🧪 RUNNING RESOLVEAI TOOLS VERIFICATION SUITE")
    print("=" * 65)

    # 1. Test check_customer
    print("\n[1/6] Testing check_customer('cust_101')...")
    cust_res = check_customer("cust_101")
    print(json.dumps(cust_res, indent=2))
    assert cust_res["success"] is True, "check_customer failed"
    assert cust_res["name"] == "Rahul Sharma", "Unexpected customer name"
    print("✅ check_customer PASSED.")

    # 2. Test check_order
    print("\n[2/6] Testing check_order('ORD-9912')...")
    order_res = check_order("ORD-9912")
    print(json.dumps(order_res, indent=2))
    assert order_res["success"] is True, "check_order failed"
    assert order_res["status"] == "FAILED", "Unexpected order status"
    assert order_res["total_amount"] == 1499.0, "Unexpected order amount"
    print("✅ check_order PASSED.")

    # 3. Test check_payment
    print("\n[3/6] Testing check_payment('ORD-9912')...")
    pay_res = check_payment("ORD-9912")
    print(json.dumps(pay_res, indent=2))
    assert pay_res["success"] is True, "check_payment failed"
    assert pay_res["payment_reference"] == "PAY-5541", "Unexpected payment ref"
    assert pay_res["status"] == "SUCCESS", "Unexpected payment status"
    print("✅ check_payment PASSED.")

    # 4. Test create_refund_request
    print("\n[4/6] Testing create_refund_request('ORD-9912', 1499.0, 'Payment captured for failed order')...")
    refund_res = create_refund_request("ORD-9912", 1499.0, "Payment captured for failed order")
    print(json.dumps(refund_res, indent=2))
    assert refund_res["success"] is True, "create_refund_request failed"
    assert refund_res["refund_reference"].startswith("RF-"), "Invalid refund reference format"
    assert refund_res["amount"] == 1499.0, "Invalid refund amount"
    print(f"✅ create_refund_request PASSED. Created: {refund_res['refund_reference']}")

    # 5. Test create_escalation
    print("\n[5/6] Testing create_escalation('RES-8924', 'Customer requested expedited manual lead review', 'Critical')...")
    esc_res = create_escalation("RES-8924", "Customer requested expedited manual lead review", "Critical")
    print(json.dumps(esc_res, indent=2))
    assert esc_res["success"] is True, "create_escalation failed"
    assert esc_res["escalation_id"].startswith("ESC-"), "Invalid escalation ID format"
    assert esc_res["priority"] == "Critical", "Invalid priority"
    print(f"✅ create_escalation PASSED. Created: {esc_res['escalation_id']}")

    # 6. Test search_policy
    print("\n[6/6] Testing search_policy('customer debited payment captured but order failed timeout')...")
    policy_res = search_policy("customer debited payment captured but order failed timeout")
    print(json.dumps(policy_res, indent=2))
    assert policy_res["success"] is True, "search_policy failed"
    assert "3.1.2" in policy_res["section"], "Expected Section 3.1.2 match"
    print(f"✅ search_policy PASSED. Matched: {policy_res['section']} ({policy_res['confidence']}%)")

    print("\n" + "=" * 65)
    print("🎉 ALL 6 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    run_verification()
