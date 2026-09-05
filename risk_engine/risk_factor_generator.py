from sqlalchemy.orm import Session

from backend.models import (
    Product,
    CustomerProfile,
    Geography,
    TransactionProfile,
    Channel,
    Vendor,
    RiskFactor
)


def add_factor(
    db: Session,
    change_request_id: int,
    category: str,
    factor: str,
    value: str,
    score: float,
    weight: float,
    source_type: str,
    source_reference: str
):

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
                70,
                0.40,
                "STRUCTURED_DATA",
                f"Product #{product.id}"
            )

        if product.cross_border:
            add_factor(
                db,
                change_request_id,
                "PRODUCT",
                "Cross Border Product",
                "true",
                80,
                0.30,
                "STRUCTURED_DATA",
                f"Product #{product.id}"
            )

        if product.digital_channel:
            add_factor(
                db,
                change_request_id,
                "PRODUCT",
                "Digital Product Channel",
                "true",
                65,
                0.30,
                "STRUCTURED_DATA",
                f"Product #{product.id}"
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
                85,
                0.30,
                "STRUCTURED_DATA",
                f"CustomerProfile #{customer.id}"
            )

        if customer.high_risk_customer_exposure:
            add_factor(
                db,
                change_request_id,
                "CUSTOMER",
                "High Risk Customer Exposure",
                "true",
                90,
                0.30,
                "STRUCTURED_DATA",
                f"CustomerProfile #{customer.id}"
            )

        if customer.onboarding_method:
            if "digital" in customer.onboarding_method.lower():
                add_factor(
                    db,
                    change_request_id,
                    "CUSTOMER",
                    "Digital Onboarding",
                    customer.onboarding_method,
                    70,
                    0.20,
                    "STRUCTURED_DATA",
                    f"CustomerProfile #{customer.id}"
                )

        if customer.expected_customer_count:
            if customer.expected_customer_count >= 100000:
                add_factor(
                    db,
                    change_request_id,
                    "CUSTOMER",
                    "Large Customer Population",
                    str(customer.expected_customer_count),
                    65,
                    0.20,
                    "STRUCTURED_DATA",
                    f"CustomerProfile #{customer.id}"
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
                75,
                0.40,
                "STRUCTURED_DATA",
                f"Geography #{geography.id}"
            )

        if geography.high_risk_jurisdiction_flag:
            add_factor(
                db,
                change_request_id,
                "GEOGRAPHY",
                "High Risk Jurisdiction",
                geography.country,
                95,
                0.35,
                "STRUCTURED_DATA",
                f"Geography #{geography.id}"
            )

        if geography.sanctions_exposure:
            add_factor(
                db,
                change_request_id,
                "GEOGRAPHY",
                "Sanctions Exposure",
                geography.country,
                100,
                0.25,
                "STRUCTURED_DATA",
                f"Geography #{geography.id}"
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
                80,
                0.25,
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}"
            )

        if velocity >= 5:
            add_factor(
                db,
                change_request_id,
                "TRANSACTION",
                "High Transaction Velocity",
                str(velocity),
                80,
                0.25,
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}"
            )

        if transaction.round_amount_risk:
            add_factor(
                db,
                change_request_id,
                "TRANSACTION",
                "Round Amount Pattern",
                "true",
                65,
                0.20,
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}"
            )

        if transaction.rapid_movement_possible:
            add_factor(
                db,
                change_request_id,
                "TRANSACTION",
                "Rapid Movement",
                "true",
                85,
                0.30,
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}"
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
                70,
                0.35,
                "STRUCTURED_DATA",
                f"Channel #{channel.id}"
            )

        if channel.remote_onboarding:
            add_factor(
                db,
                change_request_id,
                "CHANNEL",
                "Remote Onboarding",
                "true",
                80,
                0.35,
                "STRUCTURED_DATA",
                f"Channel #{channel.id}"
            )

        if channel.third_party_channel:
            add_factor(
                db,
                change_request_id,
                "CHANNEL",
                "Third Party Channel",
                "true",
                75,
                0.30,
                "STRUCTURED_DATA",
                f"Channel #{channel.id}"
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
                80,
                0.35,
                "STRUCTURED_DATA",
                f"Vendor #{vendor.id}"
            )

        if vendor.handles_customer_data:
            add_factor(
                db,
                change_request_id,
                "THIRD_PARTY",
                "Customer Data Handling",
                "true",
                70,
                0.25,
                "STRUCTURED_DATA",
                f"Vendor #{vendor.id}"
            )

        if vendor.handles_payment_data:
            add_factor(
                db,
                change_request_id,
                "THIRD_PARTY",
                "Payment Data Handling",
                "true",
                75,
                0.20,
                "STRUCTURED_DATA",
                f"Vendor #{vendor.id}"
            )

        if vendor.cross_border_processing:
            add_factor(
                db,
                change_request_id,
                "THIRD_PARTY",
                "Cross Border Processing",
                "true",
                80,
                0.20,
                "STRUCTURED_DATA",
                f"Vendor #{vendor.id}"
            )

    # ========================================================
    # FRAUD
    # ========================================================

    if transaction:

        velocity = float(transaction.transaction_velocity or 0)

        if velocity >= 5:
            add_factor(
                db,
                change_request_id,
                "FRAUD",
                "High Transaction Velocity",
                str(velocity),
                80,
                0.40,
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}"
            )

        if transaction.rapid_movement_possible:
            add_factor(
                db,
                change_request_id,
                "FRAUD",
                "Rapid Movement Pattern",
                "true",
                85,
                0.35,
                "STRUCTURED_DATA",
                f"TransactionProfile #{transaction.id}"
            )

    db.commit()

    return (
        db.query(RiskFactor)
        .filter(
            RiskFactor.change_request_id == change_request_id
        )
        .all()
    )