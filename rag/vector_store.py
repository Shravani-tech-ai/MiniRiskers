from pathlib import Path
import re

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings


# Paths
PROCESSED_DIR = Path("../data/processed")
CHROMA_DIR = Path("../chroma_db")


# Embedding model
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def get_document_metadata(filename):
    """
    Assign metadata based on the regulatory document.
    """

    metadata = {
        "authority": "Unknown",
        "jurisdiction": "India",
        "status": "current",
        "document_type": "Regulatory Document"
    }

    filename_lower = filename.lower()

    if "rbi master direction on kyc" in filename_lower:
        metadata["authority"] = "RBI"
        metadata["document_type"] = "Master Direction - KYC"

    elif "money laundering act" in filename_lower:
        metadata["authority"] = "Government of India"
        metadata["document_type"] = "Act"

    elif "maintenance of records" in filename_lower:
        metadata["authority"] = "Government of India"
        metadata["document_type"] = "Rules"

    elif "fiu-ind" in filename_lower:
        metadata["authority"] = "FIU-IND"
        metadata["document_type"] = "Reporting Manual"

    elif "digital payment security" in filename_lower:
        metadata["authority"] = "RBI"
        metadata["document_type"] = "Digital Payment Security"
        metadata["status"] = "withdrawn"

    elif "fraud risk management" in filename_lower:
        metadata["authority"] = "RBI"
        metadata["document_type"] = "Fraud Risk Management"

    elif "information technology governance" in filename_lower:
        metadata["authority"] = "RBI"
        metadata["document_type"] = "IT Governance"

    elif "outsourcing" in filename_lower:
        metadata["authority"] = "RBI"
        metadata["document_type"] = "IT Outsourcing"

    elif "51a uapa" in filename_lower:
        metadata["authority"] = "MHA"
        metadata["document_type"] = "UAPA Section 51A"

    return metadata


def load_documents():

    documents = []

    text_files = list(PROCESSED_DIR.glob("*.txt"))

    print(f"Found {len(text_files)} processed documents")

    for text_file in text_files:

        print(f"Loading: {text_file.name}")

        metadata = get_document_metadata(text_file.name)

        with open(text_file, "r", encoding="utf-8") as file:
            text = file.read()

        # Split according to page markers
        pages = re.split(r"--- PAGE (\d+) ---", text)

        # pages structure:
        # [text_before, page_number, page_text, page_number, page_text...]

        for i in range(1, len(pages), 2):

            page_number = pages[i]
            page_text = pages[i + 1].strip()

            if not page_text:
                continue

            page_metadata = metadata.copy()

            page_metadata.update({
                "document": text_file.stem,
                "page": int(page_number),
                "source_file": text_file.name
            })

            documents.append({
                "text": page_text,
                "metadata": page_metadata
            })

    return documents


def create_vector_store():

    documents = load_documents()

    print(f"\nLoaded {len(documents)} pages")

    # Split documents into smaller chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150
    )

    chunks = []

    for document in documents:

        split_texts = splitter.split_text(document["text"])

        for text in split_texts:

            chunks.append({
                "text": text,
                "metadata": document["metadata"]
            })

    print(f"Created {len(chunks)} chunks")

    # Create embeddings
    print("\nLoading embedding model...")

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL
    )

    # Create ChromaDB
    print("\nCreating ChromaDB...")

    vector_store = Chroma(
        collection_name="regulatory_documents",
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR)
    )

    # Add documents
    vector_store.add_texts(
        texts=[chunk["text"] for chunk in chunks],
        metadatas=[chunk["metadata"] for chunk in chunks]
    )

    print("\n===================================")
    print("REGULATORY VECTOR STORE CREATED")
    print("===================================")
    print(f"Pages loaded : {len(documents)}")
    print(f"Chunks       : {len(chunks)}")
    print(f"Database     : {CHROMA_DIR}")
    print("===================================")


if __name__ == "__main__":
    create_vector_store()