"""Source BRDs are kept with the request and visible to its reviewers."""

from backend.intake_service import UPLOAD_ROOT
from backend.models import ChangeRequest, IntakeDocument


def _request(db, stage="REQUEST_CREATED", status="DRAFT"):
    change_request = ChangeRequest(
        title="Source BRD test request",
        description="Synthetic test request",
        change_type="NEW_PRODUCT",
        product_type="Remittance",
        business_unit="Retail",
        customer_segment="Retail",
        requested_by="Business Owner",
        status=status,
        current_stage=stage,
    )
    db.add(change_request)
    db.commit()
    return change_request


def _upload(client, request_id, headers, name, body):
    response = client.post(
        f"/change-requests/{request_id}/intake/upload-brd",
        headers=headers,
        files={"file": (name, body, "text/plain")},
    )
    assert response.status_code == 200, response.text
    return response.json()["document"]


def test_replacing_and_removing_a_brd_keeps_every_version(app_client, db_session, tokens):
    owner = tokens["BUSINESS_OWNER"]
    request_id = _request(db_session).id

    first = _upload(app_client, request_id, owner, "first.txt", b"Product Name: One")
    second = _upload(app_client, request_id, owner, "second.txt", b"Product Name: Two")

    listing = app_client.get(
        f"/change-requests/{request_id}/intake/documents", headers=owner
    ).json()
    assert listing["current"]["id"] == second["id"]
    statuses = {item["id"]: item["status"] for item in listing["documents"]}
    assert statuses == {first["id"]: "SUPERSEDED", second["id"]: "CURRENT"}
    assert listing["current"]["uploaded_by"] == "Business Owner"

    removed = app_client.delete(f"/change-requests/{request_id}/intake/brd", headers=owner)
    assert removed.status_code == 200

    listing = app_client.get(
        f"/change-requests/{request_id}/intake/documents", headers=owner
    ).json()
    assert listing["current"] is None
    assert [item["status"] for item in listing["documents"]] == ["REMOVED", "SUPERSEDED"]
    # Removing only detaches: the files are still downloadable.
    for item in listing["documents"]:
        assert item["file_available"]
    status = app_client.get(
        f"/change-requests/{request_id}/intake/brd-status", headers=owner
    ).json()
    assert status["uploaded"] is False


def test_reviewers_can_download_the_source_brd(app_client, db_session, tokens):
    change_request = _request(db_session)
    document = _upload(
        app_client, change_request.id, tokens["BUSINESS_OWNER"], "brd.txt", b"Product Name: Wallet"
    )
    url = f"/change-requests/{change_request.id}/intake/documents/{document['id']}/file"

    # Not yet submitted: analysts cannot see the request at all.
    assert app_client.get(url, headers=tokens["RISK_ANALYST"]).status_code == 403

    change_request.status = "COMMITTEE_REVIEW"
    change_request.current_stage = "COMMITTEE_REVIEW"
    db_session.commit()

    for role in ("RISK_ANALYST", "RISK_COMMITTEE", "ADMIN", "BUSINESS_OWNER"):
        response = app_client.get(url, headers=tokens[role])
        assert response.status_code == 200, (role, response.text)
        assert response.content == b"Product Name: Wallet"
        assert "brd.txt" in response.headers["content-disposition"]

    other = _request(db_session)
    wrong_request = f"/change-requests/{other.id}/intake/documents/{document['id']}/file"
    assert app_client.get(wrong_request, headers=tokens["ADMIN"]).status_code == 404


def test_client_paths_are_not_used_for_storage(app_client, db_session, tokens):
    request_id = _request(db_session).id
    document = _upload(
        app_client, request_id, tokens["BUSINESS_OWNER"], "..\\..\\evil.txt", b"Product Name: X"
    )
    assert document["filename"] == "evil.txt"
    stored = db_session.get(IntakeDocument, document["id"]).stored_name
    assert (UPLOAD_ROOT / stored).resolve().is_relative_to(
        (UPLOAD_ROOT / str(request_id)).resolve()
    )


def test_brds_uploaded_before_tracking_are_registered(app_client, db_session, tokens):
    request_id = _request(db_session).id
    folder = UPLOAD_ROOT / str(request_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "legacy.txt").write_bytes(b"Product Name: Legacy")

    listing = app_client.get(
        f"/change-requests/{request_id}/intake/documents", headers=tokens["ADMIN"]
    ).json()
    assert listing["current"]["filename"] == "legacy.txt"
    assert listing["current"]["file_available"]


def test_extraction_and_apply_are_recorded_on_the_source_brd(
    app_client, db_session, tokens, monkeypatch
):
    import backend.intake_service as intake_service

    def no_ai(prompt):
        raise ValueError("AI disabled in tests")

    monkeypatch.setattr(intake_service, "call_gemini_json", no_ai)

    owner = tokens["BUSINESS_OWNER"]
    request_id = _request(db_session).id
    brd = b"2. Product Description\nProduct Name: Source Wallet\nTransaction Type: TRANSFER\n"
    document = _upload(app_client, request_id, owner, "wallet.txt", brd)

    extracted = app_client.post(
        f"/change-requests/{request_id}/intake/extract-brd", headers=owner
    )
    assert extracted.status_code == 200, extracted.text
    assert extracted.json()["document_id"] == document["id"]

    applied = app_client.post(
        f"/change-requests/{request_id}/intake/apply-extraction",
        headers=owner,
        json={"extracted": extracted.json()["merged_preview"]},
    )
    assert applied.status_code == 200, applied.text

    current = app_client.get(
        f"/change-requests/{request_id}/intake/documents", headers=owner
    ).json()["current"]
    assert current["extraction_method"] == "rules"
    assert current["extracted_at"]
    assert current["applied_by"] == "Business Owner"
    assert current["applied_at"]
