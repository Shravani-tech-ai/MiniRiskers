"""New change request form pre-filled from a BRD before the request exists."""

from pathlib import Path

from backend.brd_heuristic import extract_request_header

BRDS = Path(__file__).resolve().parent.parent / "brds"


def test_header_maps_brd_wording_to_form_options():
    text = (BRDS / "brd-04-critical-high-risk-jurisdiction.txt").read_text(
        encoding="utf-8"
    )
    result = extract_request_header(text)
    fields = result["fields"]

    assert fields["change_type"] == "PRODUCT_CHANGE"
    assert fields["business_unit"] == "Payments"
    assert fields["product_type"] == "CROSS_BORDER_PAYMENTS"
    # A colon inside the wrapped summary must not cut it short.
    assert "Iran (Tehran) and Myanmar (Yangon)" in fields["description"]
    assert result["source_values"]["business_unit"] == "Payments and Remittances"


def test_placeholder_values_are_ignored():
    text = (BRDS / "brd-15-minimal-sparse.txt").read_text(encoding="utf-8")
    assert extract_request_header(text)["fields"] == {}


def test_prefill_endpoint_is_for_request_creators(app_client, tokens):
    sample = (BRDS / "sample-brd-digital-remittance.txt").read_bytes()

    response = app_client.post(
        "/change-requests/brd-prefill",
        headers=tokens["BUSINESS_OWNER"],
        files={"file": ("brd.txt", sample, "text/plain")},
    )
    assert response.status_code == 200, response.text
    fields = response.json()["fields"]
    assert fields["title"] == "Launch of Digital International Remittance Service"
    assert fields["change_type"] == "NEW_PRODUCT"
    assert fields["customer_segment"] == "Retail Customers"

    denied = app_client.post(
        "/change-requests/brd-prefill",
        headers=tokens["RISK_ANALYST"],
        files={"file": ("brd.txt", sample, "text/plain")},
    )
    assert denied.status_code == 403
