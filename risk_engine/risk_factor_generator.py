from sqlalchemy.orm import Session

from backend.methodology_store import get_active_methodology
from backend.models import (
    Product,
    CustomerProfile,
    Geography,
    TransactionProfile,
    Channel,
    Vendor,
    RiskFactor,
    RegulatoryEvidence,
)
from risk_engine.methodology import catalog_entry


def add_factor(
    db: Session,
    change_request_id: int,
    category: str,
    factor: str,
    value: str,
    source_type: str,
    source_reference: str,
    config: dict,
    triggered: set,
):
    # Score and weight come from the active methodology's factor catalog.
    entry = catalog_entry(config, category, factor) or {"score": 0, "weight": 0}
    score = float(entry["score"])
    weight = float(entry["weight"])
    triggered.add((category, factor))

    existing = (
        db.query(RiskFactor)
        .filter(
            RiskFactor.change_request_id == change_request_id,
            RiskFactor.risk_category == category,
            RiskFactor.risk_factor == factor
        )
        .first()
    )

    if existing:
        # Re-score under the current methodology and refresh the value.
        existing.factor_value = value
        existing.factor_score = score
        existing.factor_weight = weight
        existing.inherent_risk_contribution = score * weight
        existing.source_type = source_type
        existing.source_reference = source_reference
        return existing

    record = RiskFactor(
        change_request_id=change_request_id,
        risk_category=category,
        risk_factor=factor,
        factor_value=value,
        factor_score=score,
        factor_weight=weight,
        inherent_risk_contribution=score * weight,
        source_type=source_type,
        source_reference=source_reference
    )

    db.add(record)

    return record


def generate_risk_factors(
    db: Session,
    change_request_id: int
):

    _, config = get_active_methodology(db)
    thresholds = config["thresholds"]
    triggered = set()

    # ========================================================
    # PRODUCT
    # ========================================================

    product = (
        db.query(Product)
        .filter(Product.change_request_id == change_request_id)
        .first()
    )

    if product:

        if product.new_product_flag:
            add_factor(
                db,
                change_request_id,
                "PRODUCT",
                "New Product",
                "true",
                "STRUCTURED_DATA",
                f"Product #{product.id}",
                config,
                triggered
            )

        if product.cross_border:
            add_factor(
                db,
                change_request_id,
                "PRODUCT",
                "Cross Border Product",
                "true",
                "STRUCTURED_DATA",
                f"Product #{product.id}",
                config,
                triggered
            )

        if product.digital_channel:
            add_factor(
                db,
                change_request_id,
                "PRODUCT",
                "Digital Product Channel",
                "true",
                "STRUCTURED_DATA",
                f"Product #{product.id}",
                config,
                triggered
            )

    # ========================================================
    # CUSTOMER
    # ========================================================

    customer = (
        db.query(CustomerProfile)
        .filter(
            CustomerProfile.change_request_id == change_request_id
        )
        .first()
    )

    if customer:

        if customer.pep_exposure:
            add_factor(
                db,
                change_request_id,
                "CUSTOMER",
                "PEP Exposure",
                "true",
                "STRUCTURED_DATA",
                f"CustomerProfile #{customer.id}",
                config,
                triggered
            )

        if customer.high_risk_customer_exposure:
            add_factor(
                db,
                change_request_id,
                "CUSTOMER",
                "High Risk Customer Exposure",
                "true",
                "STRUCTURED_DATA",
                f"CustomerProfile #{customer.id}",
                config,
                triggered
            )

        if customer.onboarding_method:
            if "digital" in customer.onboarding_method.lower():
                add_factor(
                    db,
                    change_request_id,
                    "CUSTOMER",
                    "Digital Onboarding",
                    customer.onboarding_method,
                    "STRUCTURED_DATA",
                    f"CustomerProfile #{customer.id}",
                config,
                triggered
                )

        if customer.expected_customer_count:
            if customer.expected_customer_count >= thresholds["large_customer_population"]:
                add_factor(
                    db,
                    change_request_id,
                    "CUSTOMER",
                    "Large Customer Population",
                    str(customer.expected_customer_count),
                    "STRUCTURED_DATA",
                    f"CustomerProfile #{customer.id}",
                config,
                triggered
                )

    # ========================================================
    # GEOGRAPHY
    # ========================================================

    geographies = (
        db.query(Geography)
        .filter(
            Geography.change_request_id == change_request_id
        )
        .all()
    )

    for geography in geographies:

        if geography.domestic_or_cross_border == "CROSS_BORDER":
            add_factor(
                db,
                change_request_id,
                "GEOGRAPHY",
                "Cross Border Geography",
                geography.country,
                "STRUCTURED_DATA",
                f"Geography #{geography.id}",
                config,
                triggered
            )

        if geography.high_risk_jurisdiction_flag:
            add_factor(
                db,
                change_request_id,
                "GEOGRAPHY",
                "High Risk Jurisdiction",
                geography.country,
                "STRUCTURED_DATA",
                f"Geography #{geography.id}",
                config,
                triggered
            )

        if geography.sanctions_exposure:
            add_factor(
                db,
                change_request_id,
                "GEOGRAPHY",
                "Sanctions Exposure",
                geography.country,
                "STRUCTURED_DATA",
                f"Geography #{geography.id}",
                config,
                triggered
            )

    # ========================================================
    # TRANSACTION
    # ========================================================

    transaction = (
        db.query(TransactionProfile)
        .filter(
            TransactionProfile.change_request_id == change_request_id
        )
        .first()
    )

    if transaction:

        velocity = float(transaction.transaction_velocity or 0)

        if transaction.cross_border:
            add_factor(
                db,
                change_request_id,
                "TRANSACTION",
                "Cross Border Transactions",
                "true",
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}",
                config,
                triggered
            )

        if velocity >= thresholds["high_transaction_velocity"]:
            add_factor(
                db,
                change_request_id,
                "TRANSACTION",
                "High Transaction Velocity",
                str(velocity),
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}",
                config,
                triggered
            )

        if transaction.round_amount_risk:
            add_factor(
                db,
                change_request_id,
                "TRANSACTION",
                "Round Amount Pattern",
                "true",
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}",
                config,
                triggered
            )

        if transaction.rapid_movement_possible:
            add_factor(
                db,
                change_request_id,
                "TRANSACTION",
                "Rapid Movement",
                "true",
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}",
                config,
                triggered
            )

    # ========================================================
    # CHANNEL
    # ========================================================

    channel = (
        db.query(Channel)
        .filter(
            Channel.change_request_id == change_request_id
        )
        .first()
    )

    if channel:

        if channel.mobile_banking:
            add_factor(
                db,
                change_request_id,
                "CHANNEL",
                "Mobile Banking",
                "true",
                "STRUCTURED_DATA",
                f"Channel #{channel.id}",
                config,
                triggered
            )

        if channel.remote_onboarding:
            add_factor(
                db,
                change_request_id,
                "CHANNEL",
                "Remote Onboarding",
                "true",
                "STRUCTURED_DATA",
                f"Channel #{channel.id}",
                config,
                triggered
            )

        if channel.third_party_channel:
            add_factor(
                db,
                change_request_id,
                "CHANNEL",
                "Third Party Channel",
                "true",
                "STRUCTURED_DATA",
                f"Channel #{channel.id}",
                config,
                triggered
            )

    # ========================================================
    # THIRD PARTY
    # ========================================================

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.change_request_id == change_request_id
        )
        .first()
    )

    if vendor:

        if vendor.handles_transactions:
            add_factor(
                db,
                change_request_id,
                "THIRD_PARTY",
                "Third Party Transaction Processing",
                "true",
                "STRUCTURED_DATA",
                f"Vendor #{vendor.id}",
                config,
                triggered
            )

        if vendor.handles_customer_data:
            add_factor(
                db,
                change_request_id,
                "THIRD_PARTY",
                "Customer Data Handling",
                "true",
                "STRUCTURED_DATA",
                f"Vendor #{vendor.id}",
                config,
                triggered
            )

        if vendor.handles_payment_data:
            add_factor(
                db,
                change_request_id,
                "THIRD_PARTY",
                "Payment Data Handling",
                "true",
                "STRUCTURED_DATA",
                f"Vendor #{vendor.id}",
                config,
                triggered
            )

        if vendor.cross_border_processing:
            add_factor(
                db,
                change_request_id,
                "THIRD_PARTY",
                "Cross Border Processing",
                "true",
                "STRUCTURED_DATA",
                f"Vendor #{vendor.id}",
                config,
                triggered
            )

    # ========================================================
    # FRAUD
    # ========================================================

    if transaction:

        velocity = float(transaction.transaction_velocity or 0)

        if velocity >= thresholds["high_transaction_velocity"]:
            add_factor(
                db,
                change_request_id,
                "FRAUD",
                "High Transaction Velocity",
                str(velocity),
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}",
                config,
                triggered
            )

        if transaction.rapid_movement_possible:
            add_factor(
                db,
                change_request_id,
                "FRAUD",
                "Rapid Movement Pattern",
                "true",
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}",
                config,
                triggered
            )

    # Remove factors the current inputs no longer trigger (e.g. the Business
    # Owner removed cross-border activity after a deferral), together with
    # the evidence retrieved for them.
    stale = [
        factor
        for factor in db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == change_request_id)
        .all()
        if (factor.risk_category, factor.risk_factor) not in triggered
    ]
    for factor in stale:
        db.query(RegulatoryEvidence).filter(
            RegulatoryEvidence.risk_factor_id == factor.id
        ).delete(synchronize_session=False)
        db.delete(factor)

    db.commit()

    return (
        db.query(RiskFactor)
        .filter(
            RiskFactor.change_request_id == change_request_id
        )
        .all()
    )