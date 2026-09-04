import chromadb
from sentence_transformers import SentenceTransformer


# -----------------------------------------
# 1. Load the embedding model
# -----------------------------------------

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


# -----------------------------------------
# 2. Connect to our existing ChromaDB
# -----------------------------------------

client = chromadb.PersistentClient(path="./chroma_db")

collection = client.get_collection(
    name="documents"
)


# -----------------------------------------
# 3. Ask the user for a question
# -----------------------------------------

question = input("Ask a question about the PDF: ")


# -----------------------------------------
# 4. Convert the question into an embedding
# -----------------------------------------

question_embedding = embedding_model.encode(
    question
).tolist()


# -----------------------------------------
# 5. Search ChromaDB
# -----------------------------------------

results = collection.query(
    query_embeddings=[question_embedding],
    n_results=3
)


# -----------------------------------------
# 6. Display the results
# -----------------------------------------

print("\nMost relevant chunks:\n")

for i in range(len(results["documents"][0])):

    print("=" * 70)

    print(f"RESULT {i + 1}")

    print(f"Page: {results['metadatas'][0][i]['page']}")

    print("\nText:")

    print(results["documents"][0][i])