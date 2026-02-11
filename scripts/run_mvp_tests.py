#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta


DEFAULT_BASE_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbzVvH7KXNQ__H5oLpBthyYTu88m7tvtRacdx7k_LFZ2mDW-i93Q-1hC32aQmNtVuFjW/exec"
)


class Tester:
    def __init__(self, base_url: str, verbose: bool = False):
        self.base_url = base_url.rstrip("/")
        self.fail_count = 0
        self.verbose = verbose
        self.last_response = None

    def _request(self, method: str, action: str, query=None, body=None):
        params = {"action": action}
        if query:
            params.update(query)
        url = f"{self.base_url}?{urllib.parse.urlencode(params)}"

        data = None
        headers = {}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url=url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
                status = getattr(resp, "status", 200)
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            status = e.code
        except Exception as e:
            payload = {"ok": False, "error": {"code": "CLIENT_ERROR", "message": str(e)}, "data": None}
            self.last_response = {
                "method": method,
                "url": url,
                "status": None,
                "raw": str(e),
                "payload": payload,
            }
            return payload

        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"ok": False, "error": {"code": "INVALID_JSON", "message": raw}, "data": None}

        self.last_response = {
            "method": method,
            "url": url,
            "status": status,
            "raw": raw,
            "payload": payload,
        }
        return payload

    def get(self, action: str, query=None):
        return self._request("GET", action, query=query)

    def post(self, action: str, body=None):
        return self._request("POST", action, body=body)

    def assert_true(self, condition: bool, label: str):
        if condition:
            print(f"[PASS] {label}")
        else:
            self.fail_count += 1
            print(f"[FAIL] {label}")
            if self.verbose and self.last_response:
                raw = (self.last_response.get("raw") or "").replace("\n", " ").replace("\r", " ")
                if len(raw) > 240:
                    raw = raw[:240] + "..."
                status = self.last_response.get("status")
                url = self.last_response.get("url")
                payload = self.last_response.get("payload") or {}
                err = payload.get("error") or {}
                print(f"       status={status} url={url}")
                if err:
                    print(f"       error.code={err.get('code')} error.message={str(err.get('message'))[:180]}")
                print(f"       raw={raw}")


def main():
    parser = argparse.ArgumentParser(description="LibItemsFlow MVP API tests")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Apps Script /exec URL")
    parser.add_argument("--verbose", action="store_true", help="Show failure diagnostics")
    parser.add_argument("--only-health", action="store_true", help="Run health check only")
    args = parser.parse_args()

    t = Tester(args.base_url, verbose=args.verbose)
    run_id = f"{date.today().strftime('%Y%m%d')}_{id(t) % 100000}"
    today = date.today()
    loan_date = today.isoformat()
    due_future = (today + timedelta(days=7)).isoformat()
    return_date = today.isoformat()
    loan_date_past = (today - timedelta(days=3)).isoformat()
    due_past = (today - timedelta(days=1)).isoformat()

    print("=== LibItemsFlow MVP API Test Start (Python) ===")

    # 1) Health
    r = t.get("health")
    t.assert_true(r.get("ok") is True and r.get("data", {}).get("status") == "ok", "Health endpoint")
    if args.only_health:
        print("=== Test Finished ===")
        return 0 if t.fail_count == 0 else 1

    # 2) Create item A
    item_a_req = {
        "Name": f"MVP Item A {run_id}",
        "Category": "Laptop",
        "AssetTag": f"MVP-A-{run_id}",
        "Status": "AVAILABLE",
        "Location": "HQ",
        "Note": "auto test item A",
    }
    r = t.post("items", item_a_req)
    t.assert_true(r.get("ok") is True, "Create item A")
    item_a_id = (r.get("data") or {}).get("ItemID")
    t.assert_true(bool(item_a_id), "Item A ID generated")

    # 3) Loan item A
    loan_a_req = {
        "ItemID": item_a_id,
        "BorrowerName": "Auto Tester",
        "BorrowerUnit": "QA",
        "BorrowerContact": "0900000000",
        "LoanDate": loan_date,
        "DueDate": due_future,
        "Note": "auto test loan A",
    }
    r = t.post("loans", loan_a_req)
    t.assert_true(r.get("ok") is True and (r.get("data") or {}).get("Status") == "ACTIVE", "Create loan A")
    loan_a_id = (r.get("data") or {}).get("LoanID")
    t.assert_true(bool(loan_a_id), "Loan A ID generated")

    # 4) Duplicate loan should fail
    dup_req = {
        "ItemID": item_a_id,
        "BorrowerName": "Auto Tester 2",
        "BorrowerContact": "0911111111",
        "LoanDate": loan_date,
        "DueDate": due_future,
    }
    r = t.post("loans", dup_req)
    t.assert_true(
        r.get("ok") is False and (r.get("error") or {}).get("code") == "ITEM_UNAVAILABLE",
        "Duplicate loan blocked",
    )

    # 5) Active loans list should contain loan A
    r = t.get("loans", {"status": "ACTIVE"})
    loans = r.get("data") or []
    t.assert_true(r.get("ok") is True, "Get ACTIVE loans")
    t.assert_true(any(x.get("LoanID") == loan_a_id for x in loans), "Loan A appears in ACTIVE list")

    # 6) Return loan A
    return_req = {
        "LoanID": loan_a_id,
        "ReturnDate": return_date,
        "Note": "auto return",
    }
    r = t.post("returns", return_req)
    t.assert_true(r.get("ok") is True and (r.get("data") or {}).get("Status") == "RETURNED", "Return loan A")

    # 7) Double return should fail
    r = t.post("returns", return_req)
    t.assert_true(
        r.get("ok") is False and (r.get("error") or {}).get("code") == "LOAN_NOT_RETURNABLE",
        "Double return blocked",
    )

    # 8) Returned loan appears in RETURNED list
    r = t.get("loans", {"status": "RETURNED"})
    returned = r.get("data") or []
    t.assert_true(r.get("ok") is True, "Get RETURNED loans")
    t.assert_true(any(x.get("LoanID") == loan_a_id for x in returned), "Loan A appears in RETURNED list")

    # 9) Create item B for overdue test
    item_b_req = {
        "Name": f"MVP Item B {run_id}",
        "Category": "Projector",
        "AssetTag": f"MVP-B-{run_id}",
        "Status": "AVAILABLE",
        "Location": "Room 2",
        "Note": "auto test item B",
    }
    r = t.post("items", item_b_req)
    t.assert_true(r.get("ok") is True, "Create item B")
    item_b_id = (r.get("data") or {}).get("ItemID")
    t.assert_true(bool(item_b_id), "Item B ID generated")

    # 10) Create past-due loan B
    loan_b_req = {
        "ItemID": item_b_id,
        "BorrowerName": "Overdue User",
        "BorrowerUnit": "QA",
        "BorrowerContact": "0922222222",
        "LoanDate": loan_date_past,
        "DueDate": due_past,
        "Note": "overdue test",
    }
    r = t.post("loans", loan_b_req)
    t.assert_true(
        r.get("ok") is True and (r.get("data") or {}).get("Status") == "ACTIVE",
        "Create loan B (initial ACTIVE)",
    )
    loan_b_id = (r.get("data") or {}).get("LoanID")
    t.assert_true(bool(loan_b_id), "Loan B ID generated")

    # 11) Trigger overdue transition and verify
    r = t.get("loans", {"status": "OVERDUE"})
    overdue = r.get("data") or []
    t.assert_true(r.get("ok") is True, "Get OVERDUE loans")
    t.assert_true(any(x.get("LoanID") == loan_b_id for x in overdue), "Loan B appears in OVERDUE list")

    print("=== Test Finished ===")
    if t.fail_count > 0:
        print(f"FAILED: {t.fail_count} test(s)")
        return 1
    print("SUCCESS: all tests passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
