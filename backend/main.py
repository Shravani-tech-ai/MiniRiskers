from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from backend.database import engine, get_db
from backend.models import Base, ChangeRequest


app = FastAPI(
    title="MiniRiskers",
    description="AI-Assisted Financial Crime Risk Assessment Workbench",
    version="1.0.0"
)


# Create database tables
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():

    return {
        "application": "MiniRiskers",
        "status": "running",
        "message": "Risk Assessment Workbench API"
    }


@app.post("/change-requests")
def create_change_request(
    request_number: str,
    title: str,
    description: str,
    change_type: str,
    product_type: str,
    business_unit: str,
    customer_segment: str,
    requested_by: str,
    db: Session = Depends(get_db)
):

    change_request = ChangeRequest(
        request_number=request_number,
        title=title,
        description=description,
        change_type=change_type,
        product_type=product_type,
        business_unit=business_unit,
        customer_segment=customer_segment,
        requested_by=requested_by
    )

    db.add(change_request)
    db.commit()
    db.refresh(change_request)

    return change_request