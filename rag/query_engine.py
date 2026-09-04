from pathlib import Path

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings


# ChromaDB location
CHROMA_DIR = Path("../chroma_db")

# Same embedding model used while creating the vector store
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def load_vector_store():

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL
    )

    vector_store = Chroma(
        collection_name="regulatory_documents",
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR)
    )

    return vector_store


def search_regulations(question, number_of_results=5):

    vector_store = load_vector_store()

    results = vector_store.similarity_search_with_score(
        question,
        k=number_of_results
    )

    return results


def display_results(question):

    print("\n" + "=" * 70)
    print("REGULATORY SEARCH")
    print("=" * 70)

    print(f"\nQuestion:\n{question}")

    results = search_regulations(question)

    if not results:
        print("\nNo relevant regulatory evidence found.")
        return

    print("\nRelevant Regulatory Evidence:\n")

    for index, (document, score) in enumerate(results, start=1):

        metadata = document.metadata

        print("-" * 70)

        print(f"Result {index}")

        print(f"Authority     : {metadata.get('authority')}")
        print(f"Document      : {metadata.get('document')}")
        print(f"Document Type : {metadata.get('document_type')}")
        print(f"Status        : {metadata.get('status')}")
        print(f"Page          : {metadata.get('page')}")
        print(f"Similarity    : {score:.4f}")

        print("\nRelevant Text:")
        print(document.page_content)

    print("-" * 70)


if __name__ == "__main__":

    print("MiniRiskers Regulatory Query Engine")

    question = input(
        "\nEnter your regulatory question: "
    )

    display_results(question)