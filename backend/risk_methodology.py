"""Explains how a change request's risk assessment was calculated.

The report is rebuilt from the stored assessment, the risk factors and
controls it was computed from, and the methodology version the assessment
was scored under, so the explanation always matches the engine. Each
category, factor and floor rule is tied to its supervisory framework basis
(config/risk_framework.json).
"""

import io
from collections import Counter
from datetime import datetime
from html import escape

from sqlalchemy.orm import Session

from backend.assessment_inputs import load_assessment_inputs
from backend.models import (
    AnalystOverride,
    ChangeRequest,
    Control,
    RegulatoryEvidence,
    RiskAssessment,
    RiskFactor,
)
from backend.methodology_store import get_config_for_version
from risk_engine.methodology import (
    CATEGORIES,
    framework_refs_for_category,
    framework_refs_for_factor,
    framework_refs_for_rule,
    get_base_residual_floor,
    get_rating,
    get_triggered_concentration_rules,
    load_framework,
    rating_band_ranges,
)

CATEGORY_LABELS = {
    "CUSTOMER": "Customer",
    "PRODUCT": "Product",
    "GEOGRAPHY": "Geography",
    "TRANSACTION": "Transaction",
    "CHANNEL": "Channel",
    "THIRD_PARTY": "Third party",
    "FRAUD": "Fraud",
}

CATEGORY_SCORE_FIELDS = {
    "CUSTOMER": "customer_risk_score",
    "PRODUCT": "product_risk_score",
    "GEOGRAPHY": "geography_risk_score",
    "TRANSACTION": "transaction_risk_score",
    "CHANNEL": "channel_risk_score",
    "THIRD_PARTY": "third_party_risk_score",
    "FRAUD": "fraud_risk_score",
}

INPUT_SECTION_LABELS = {
    "product": "Product",
    "customer": "Customer profile",
    "geography": "Geography",
    "transaction": "Transaction profile",
    "channel": "Channel",
    "vendor": "Vendor / third party",
}

def _round(value, digits: int = 2):
    return round(float(value or 0), digits)


def _iso(value):
    return value.isoformat() if value else None


_ACRONYMS = {"kyc": "KYC", "pep": "PEP", "aml": "AML"}


def _field_label(field: str) -> str:
    words = field.split("_")
    label = " ".join(_ACRONYMS.get(word, word) for word in words)
    return label[0].upper() + label[1:]


def build_risk_methodology(db: Session, change_request_id: int) -> dict:
    change_request = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.id == change_request_id)
        .first()
    )
    if not change_request:
        raise ValueError("Change request not found")

    assessment = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.change_request_id == change_request_id)
        .order_by(RiskAssessment.id.desc())
        .first()
    )
    if not assessment:
        raise ValueError("Risk assessment has not been calculated yet.")

    factors = (
        db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == change_request_id)
        .order_by(RiskFactor.id.asc())
        .all()
    )
    controls = (
        db.query(Control)
        .filter(Control.change_request_id == change_request_id)
        .order_by(Control.id.asc())
        .all()
    )
    evidence = (
        db.query(RegulatoryEvidence)
        .filter(RegulatoryEvidence.change_request_id == change_request_id)
        .all()
    )
    analyst_review = (
        db.query(AnalystOverride)
        .filter(AnalystOverride.change_request_id == change_request_id)
        .order_by(AnalystOverride.id.desc())
        .first()
    )

    config = get_config_for_version(db, assessment.risk_model_version)

    # ---- Category scores -------------------------------------------------
    evidence_by_factor = Counter(item.risk_factor_id for item in evidence)
    categories = []
    for category in CATEGORIES:
        model_weight = config["category_weights"][category]
        category_factors = [
            factor for factor in factors if factor.risk_category == category
        ]
        total_weight = sum(f.factor_weight or 0 for f in category_factors)
        category_score = _round(
            getattr(assessment, CATEGORY_SCORE_FIELDS[category])
        )
        categories.append({
            "category": category,
            "label": CATEGORY_LABELS[category],
            "model_weight": model_weight,
            "score": category_score,
            "rating": get_rating(category_score, config),
            "framework_basis": framework_refs_for_category(category),
            "weighted_contribution": _round(category_score * model_weight),
            "total_factor_weight": _round(total_weight),
            "factors": [
                {
                    "name": factor.risk_factor,
                    "value": factor.factor_value,
                    "score": _round(factor.factor_score),
                    "weight": _round(factor.factor_weight),
                    "weighted_score": _round(
                        (factor.factor_score or 0) * (factor.factor_weight or 0)
                    ),
                    "share_of_category_pct": (
                        _round(
                            (factor.factor_weight or 0) / total_weight * 100,
                            1,
                        )
                        if total_weight
                        else 0.0
                    ),
                    "source_type": factor.source_type,
                    "source_reference": factor.source_reference,
                    "evidence_count": evidence_by_factor.get(factor.id, 0),
                    "framework_basis": framework_refs_for_factor(
                        category, factor.risk_factor
                    ),
                }
                for factor in category_factors
            ],
        })

    inherent_score = _round(assessment.inherent_score)
    for item in categories:
        item["share_of_inherent_pct"] = (
            _round(item["weighted_contribution"] / inherent_score * 100, 1)
            if inherent_score
            else 0.0
        )

    # ---- Controls & residual --------------------------------------------
    control_effectiveness = _round(assessment.control_adjustment)
    raw_residual = _round(inherent_score * (1 - control_effectiveness / 100))
    base_floor = get_base_residual_floor(inherent_score, config)
    triggered_rules = [
        {**rule, "framework_basis": framework_refs_for_rule(rule.get("id"))}
        for rule in get_triggered_concentration_rules(
            {factor.risk_factor for factor in factors},
            config,
        )
    ]
    concentration_floor = max(
        [5] + [rule["floor"] for rule in triggered_rules]
    )
    applied_floor = max(base_floor, concentration_floor)
    residual_score = _round(assessment.residual_score)
    floor_applied = applied_floor > raw_residual

    if floor_applied:
        floor_source = (
            "risk concentration rule"
            if concentration_floor >= base_floor
            else "inherent-risk base floor"
        )
        residual_explanation = (
            f"Controls would reduce the score to {raw_residual}, but the "
            f"{floor_source} keeps residual risk at no less than "
            f"{applied_floor}."
        )
    elif not control_effectiveness:
        residual_explanation = (
            "No control effectiveness was recorded, so residual risk "
            f"equals inherent risk ({inherent_score}), which is above "
            f"every applicable floor (highest: {applied_floor})."
        )
    else:
        residual_explanation = (
            f"Controls reduce inherent risk of {inherent_score} to "
            f"{raw_residual}, which is above every applicable floor."
        )

    # ---- Inputs considered ----------------------------------------------
    inputs = load_assessment_inputs(db, change_request_id)
    inputs_considered = []
    for key, label in INPUT_SECTION_LABELS.items():
        section = inputs.get(key) or {}
        fields = [
            {
                "field": _field_label(field),
                "value": (
                    "Yes" if value is True
                    else "No" if value is False
                    else str(value)
                ),
            }
            for field, value in section.items()
            if value not in (None, "", [])
        ]
        inputs_considered.append({
            "section": label,
            "provided": bool(section),
            "fields": fields,
        })

    documents = Counter(
        item.document_name or "Unknown document" for item in evidence
    )

    notes = [
        "Risk factors are derived deterministically from the intake data "
        "the Business Owner submitted; each factor's score (0-100) and "
        "weight within its category come from methodology "
        f"v{config['version']}.",
        "The seven categories follow the risk dimensions required by RBI "
        "KYC Master Direction para 5A and FATF Recommendation 1 (customer, "
        "geography, product/service/transaction, delivery channel), with "
        "third-party and fraud risk grounded in the RBI outsourcing and "
        "fraud risk management directions.",
        "A category with no triggered risk factors scores 0 and adds "
        "nothing to inherent risk.",
        "Regulatory evidence is retrieved to support review of each risk "
        "factor; it does not change the calculated scores.",
        "The AI assessment and analyst review are advisory layers on top "
        "of this calculation; the analyst may override the system rating "
        "with a documented reason.",
    ]
    if not controls:
        notes.append(
            "No controls were recorded for this request, so control "
            "effectiveness is 0% and residual risk before floors equals "
            "inherent risk."
        )

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "change_request": {
            "id": change_request.id,
            "request_number": change_request.request_number,
            "title": change_request.title,
            "business_unit": change_request.business_unit,
            "product_type": change_request.product_type,
            "requested_by": change_request.requested_by,
            "current_stage": change_request.current_stage,
        },
        "assessment": {
            "id": assessment.id,
            "risk_model_version": assessment.risk_model_version,
            "calculated_at": _iso(assessment.created_at),
            "inherent_score": inherent_score,
            "inherent_rating": assessment.inherent_rating,
            "residual_score": residual_score,
            "residual_rating": assessment.residual_rating,
            "final_rating": assessment.final_rating,
        },
        "rating_bands": rating_band_ranges(config),
        "methodology": {
            "version": config["version"],
            "framework_version": load_framework()["framework_version"],
            "methodology_basis": load_framework()["methodology_basis"],
        },
        "factor_count": len(factors),
        "categories": categories,
        "inherent": {
            "score": inherent_score,
            "rating": assessment.inherent_rating,
            "formula": "Inherent = Σ (category score × model weight)",
        },
        "controls": {
            "count": len(controls),
            "average_effectiveness": control_effectiveness,
            "items": [
                {
                    "name": control.control_name,
                    "category": control.control_category,
                    "type": control.control_type,
                    "implemented": bool(control.implemented),
                    "effectiveness_score": control.effectiveness_score,
                }
                for control in controls
            ],
        },
        "residual": {
            "formula": (
                "Residual = max(Inherent × (1 − control effectiveness / 100), "
                "applicable floor)"
            ),
            "raw_score": raw_residual,
            "base_floor": base_floor,
            "concentration_floor": concentration_floor,
            "applied_floor": applied_floor,
            "floor_applied": floor_applied,
            "triggered_rules": triggered_rules,
            "score": residual_score,
            "rating": assessment.residual_rating,
            "explanation": residual_explanation,
        },
        "inputs_considered": inputs_considered,
        "evidence": {
            "count": len(evidence),
            "documents": [
                {"document": name, "count": count}
                for name, count in documents.most_common()
            ],
        },
        "analyst_review": (
            {
                "system_rating": analyst_review.system_rating,
                "analyst_rating": analyst_review.analyst_rating,
                "override_reason": analyst_review.override_reason,
                "consequences": analyst_review.consequences,
                "reviewed_by": analyst_review.reviewed_by,
                "reviewed_at": _iso(analyst_review.created_at),
            }
            if analyst_review
            else None
        ),
        "notes": notes,
    }


# ---------------------------------------------------------------------------
# PDF rendering (PyMuPDF Story: HTML + CSS laid out onto A4 pages)
# ---------------------------------------------------------------------------

_PDF_CSS = """
* { font-family: sans-serif; }
body { font-size: 9.5pt; color: #1e293b; }
h1 { font-size: 17pt; margin: 0 0 2pt 0; color: #0f172a; }
h2 { font-size: 12pt; margin: 14pt 0 5pt 0; color: #0f172a; }
h3 { font-size: 10pt; margin: 9pt 0 3pt 0; color: #334155; }
p { margin: 0 0 5pt 0; line-height: 1.35; }
.muted { color: #64748b; font-size: 8.5pt; }
.formula { font-family: monospace; background-color: #f1f5f9;
           padding: 4pt; font-size: 8.5pt; }
table { border-collapse: collapse; width: 100%; margin: 3pt 0 6pt 0; }
th { background-color: #f1f5f9; text-align: left; font-size: 8pt;
     color: #475569; padding: 3pt 4pt; border-bottom: 1px solid #cbd5e1; }
td { padding: 3pt 4pt; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; }
td.num, th.num { text-align: right; }
.total td { font-weight: bold; background-color: #f8fafc; }
"""


def _cell(value) -> str:
    return escape("" if value is None else str(value))


def _table(headers, rows, numeric=()) -> str:
    head = "".join(
        f'<th class="num">{_cell(h)}</th>' if i in numeric
        else f"<th>{_cell(h)}</th>"
        for i, h in enumerate(headers)
    )
    body = []
    for row in rows:
        css = ' class="total"' if row and row[0] == "__total__" else ""
        values = row[1:] if css else row
        cells = "".join(
            f'<td class="num">{_cell(v)}</td>' if i in numeric
            else f"<td>{_cell(v)}</td>"
            for i, v in enumerate(values)
        )
        body.append(f"<tr{css}>{cells}</tr>")
    return f"<table><tr>{head}</tr>{''.join(body)}</table>"


def _methodology_html(report: dict) -> str:
    cr = report["change_request"]
    assessment = report["assessment"]
    residual = report["residual"]
    parts = [
        "<h1>Risk calculation methodology</h1>",
        f"<p><b>{_cell(cr['request_number'])}</b> — {_cell(cr['title'])}</p>",
        (
            f'<p class="muted">Business unit: {_cell(cr["business_unit"])} · '
            f"Requested by: {_cell(cr['requested_by'])} · Risk model "
            f"v{_cell(assessment['risk_model_version'])} · Generated "
            f"{_cell(report['generated_at'][:19].replace('T', ' '))} UTC</p>"
        ),
        "<h2>1. Result summary</h2>",
        _table(
            ["Measure", "Score", "Rating"],
            [
                ["Inherent risk (before controls)",
                 assessment["inherent_score"], assessment["inherent_rating"]],
                ["Control effectiveness",
                 f"{report['controls']['average_effectiveness']}%", ""],
                ["Residual risk (after controls and floors)",
                 assessment["residual_score"], assessment["residual_rating"]],
            ]
            + (
                [["Final rating (analyst)", "", assessment["final_rating"]]]
                if assessment.get("final_rating")
                else []
            ),
            numeric=(1,),
        ),
        "<p>Rating bands: "
        + ", ".join(
            f"{band['rating']} {band['min']}–{band['max']}"
            for band in report["rating_bands"]
        )
        + ".</p>",
        "<h2>2. Inputs taken into consideration</h2>",
        "<p>The calculation uses the structured intake sections below. "
        "Each flag or threshold that matches a known risk driver creates "
        "a risk factor.</p>",
    ]

    for section in report["inputs_considered"]:
        parts.append(f"<h3>{_cell(section['section'])}</h3>")
        if section["fields"]:
            parts.append(_table(
                ["Field", "Value"],
                [[f["field"], f["value"]] for f in section["fields"]],
            ))
        else:
            parts.append('<p class="muted">No data provided.</p>')

    parts.append("<h2>3. Risk factors and category scores</h2>")
    parts.append(
        "<p>Each category score is the weight-averaged score of its risk "
        "factors:</p>"
        '<p class="formula">Category score = Σ (factor score × factor '
        "weight) ÷ Σ factor weight</p>"
    )
    for category in report["categories"]:
        parts.append(
            f"<h3>{_cell(category['label'])} — {category['score']} "
            f"({_cell(category['rating'])})</h3>"
        )
        if not category["factors"]:
            parts.append(
                '<p class="muted">No risk factors triggered; category '
                "scores 0.</p>"
            )
            continue
        rows = [
            [
                factor["name"], factor["value"], factor["score"],
                factor["weight"], factor["weighted_score"],
                factor["evidence_count"],
            ]
            for factor in category["factors"]
        ]
        rows.append([
            "__total__", "Category score", "", "",
            category["total_factor_weight"],
            _round(sum(f["weighted_score"] for f in category["factors"])),
            "",
        ])
        parts.append(_table(
            ["Factor", "Value", "Score", "Weight", "Score × weight",
             "Evidence"],
            rows,
            numeric=(2, 3, 4, 5),
        ))
        basis = category.get("framework_basis") or []
        if basis:
            parts.append(
                '<p class="muted">Framework basis: '
                + "; ".join(
                    f"{_cell(ref['source_title'])} — {_cell(ref['clause'])}"
                    for ref in basis
                )
                + "</p>"
            )

    parts.append("<h2>4. Inherent risk</h2>")
    parts.append(
        f'<p class="formula">{_cell(report["inherent"]["formula"])}</p>'
    )
    rows = [
        [
            c["label"], c["score"], c["model_weight"],
            c["weighted_contribution"], f"{c['share_of_inherent_pct']}%",
        ]
        for c in report["categories"]
    ]
    rows.append([
        "__total__", "Inherent risk", "", "1.00",
        report["inherent"]["score"], "100%",
    ])
    parts.append(_table(
        ["Category", "Score", "Model weight", "Contribution", "Share"],
        rows,
        numeric=(1, 2, 3, 4),
    ))

    parts.append("<h2>5. Controls</h2>")
    controls = report["controls"]
    if controls["items"]:
        parts.append(_table(
            ["Control", "Category", "Implemented", "Effectiveness"],
            [
                [c["name"], c["category"], "Yes" if c["implemented"] else "No",
                 c["effectiveness_score"]]
                for c in controls["items"]
            ],
            numeric=(3,),
        ))
    parts.append(
        f"<p>Average control effectiveness: "
        f"<b>{controls['average_effectiveness']}%</b> across "
        f"{controls['count']} control(s).</p>"
    )

    parts.append("<h2>6. Residual risk</h2>")
    parts.append(f'<p class="formula">{_cell(residual["formula"])}</p>')
    parts.append(_table(
        ["Step", "Value"],
        [
            ["Inherent × (1 − effectiveness / 100)", residual["raw_score"]],
            ["Base floor from inherent risk", residual["base_floor"]],
            ["Risk concentration floor", residual["concentration_floor"]],
            ["Applicable floor", residual["applied_floor"]],
            ["__total__", "Residual risk",
             f"{residual['score']} ({residual['rating']})"],
        ],
        numeric=(1,),
    ))
    parts.append(f"<p>{_cell(residual['explanation'])}</p>")
    if residual["triggered_rules"]:
        parts.append("<h3>Concentration rules triggered</h3>")
        parts.append(_table(
            ["Rule", "Factors present", "Floor"],
            [
                [rule["name"], ", ".join(rule["factors"]), rule["floor"]]
                for rule in residual["triggered_rules"]
            ],
            numeric=(2,),
        ))

    parts.append("<h2>7. Regulatory evidence</h2>")
    evidence = report["evidence"]
    parts.append(
        f"<p>{evidence['count']} evidence passages were retrieved to "
        "support review of the risk factors.</p>"
    )
    if evidence["documents"]:
        parts.append(_table(
            ["Source document", "Passages"],
            [[d["document"], d["count"]] for d in evidence["documents"]],
            numeric=(1,),
        ))

    review = report.get("analyst_review")
    if review:
        parts.append("<h2>8. Analyst review</h2>")
        outcome = (
            "accepted the system rating"
            if review["analyst_rating"] == review["system_rating"]
            else f"adjusted the rating from {review['system_rating']} "
            f"to {review['analyst_rating']}"
        )
        parts.append(
            f"<p>{_cell(review['reviewed_by'])} {_cell(outcome)}.</p>"
        )
        if review.get("override_reason"):
            parts.append(
                f"<p><b>Reason:</b> {_cell(review['override_reason'])}</p>"
            )
        if review.get("consequences"):
            parts.append(
                "<p><b>Suggestions / conditions:</b> "
                f"{_cell(review['consequences'])}</p>"
            )

    parts.append("<h2>Notes and assumptions</h2>")
    parts.append(
        "<ul>" + "".join(f"<li>{_cell(n)}</li>" for n in report["notes"])
        + "</ul>"
    )

    return f"<body>{''.join(parts)}</body>"


def methodology_to_pdf_bytes(report: dict) -> bytes:
    import pymupdf

    story = pymupdf.Story(html=_methodology_html(report), user_css=_PDF_CSS)
    buffer = io.BytesIO()
    writer = pymupdf.DocumentWriter(buffer)
    mediabox = pymupdf.paper_rect("a4")
    where = mediabox + (42, 48, -42, -54)

    more = True
    while more:
        device = writer.begin_page(mediabox)
        more, _ = story.place(where)
        story.draw(device)
        writer.end_page()
    writer.close()

    # Stamp a footer with page numbers onto the laid-out document.
    document = pymupdf.open("pdf", buffer.getvalue())
    label = (
        f"MiniRiskers · {report['change_request']['request_number']} · "
        "Risk calculation methodology"
    )
    for index, page in enumerate(document, start=1):
        y = page.rect.height - 28
        page.insert_text((42, y), label, fontsize=7.5, color=(0.4, 0.45, 0.5))
        page.insert_text(
            (page.rect.width - 90, y),
            f"Page {index} of {document.page_count}",
            fontsize=7.5,
            color=(0.4, 0.45, 0.5),
        )
    output = document.tobytes()
    document.close()
    return output
