import os
import fitz
from pathlib import Path


DOCUMENTS_DIR = Path("../documents")
PROCESSED_DIR = Path("../data/processed")


def extract_pdf_text(pdf_path):
    """
    Extract text from a PDF while preserving page information.
    """

    document = fitz.open(pdf_path)

    pages = []

    for page_number, page in enumerate(document, start=1):
        text = page.get_text("text")

        if text.strip():
            pages.append({
                "page": page_number,
                "text": text.strip()
            })

    document.close()

    return pages


def process_all_documents():

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    pdf_files = list(DOCUMENTS_DIR.glob("*.pdf"))

    print(f"Found {len(pdf_files)} PDF files")

    for pdf_file in pdf_files:

        print(f"\nProcessing: {pdf_file.name}")

        pages = extract_pdf_text(pdf_file)

        output_file = PROCESSED_DIR / f"{pdf_file.stem}.txt"

        with open(output_file, "w", encoding="utf-8") as file:

            for page in pages:
                file.write(
                    f"\n--- PAGE {page['page']} ---\n"
                )
                file.write(page["text"])
                file.write("\n")

        print(
            f"Extracted {len(pages)} pages → "
            f"{output_file.name}"
        )


if __name__ == "__main__":
    process_all_documents()