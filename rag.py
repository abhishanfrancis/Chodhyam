import chromadb
from sentence_transformers import SentenceTransformer
import ollama


# -----------------------------------------
# 1. Load the embedding model
# -----------------------------------------
embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2",
    local_files_only=True
)


# -----------------------------------------
# 2. Connect to ChromaDB
# -----------------------------------------

client = chromadb.PersistentClient(path="./chroma_db")

collection = client.get_collection(
    name="documents"
)


# -----------------------------------------
# 3. Ask the user a question
# -----------------------------------------

question = input("\nAsk a question about the PDF: ")


# -----------------------------------------
# 4. Convert question into an embedding
# -----------------------------------------

question_embedding = embedding_model.encode(
    question
).tolist()


# -----------------------------------------
# 5. Retrieve relevant chunks
# -----------------------------------------

results = collection.query(
    query_embeddings=[question_embedding],
    n_results=3
)


retrieved_documents = results["documents"][0]
retrieved_metadata = results["metadatas"][0]


# -----------------------------------------
# 6. Combine retrieved chunks into context
# -----------------------------------------

context = ""

for i, document in enumerate(retrieved_documents):

    page = retrieved_metadata[i]["page"]

    context += f"\n\n--- Page {page} ---\n"
    context += document


# -----------------------------------------
# 7. Create the prompt for Llama
# -----------------------------------------

prompt = f"""
You are a helpful document question-answering assistant.

Answer the user's question using ONLY the information
provided in the context below.

If the answer cannot be found in the context, say:
"I couldn't find the answer in the document."

Context:
{context}

Question:
{question}

Answer:
"""


# -----------------------------------------
# 8. Send the prompt to Llama
# -----------------------------------------

response = ollama.chat(
    model="llama3.2:3b",
    messages=[
        {
            "role": "user",
            "content": prompt
        }
    ]
)


# -----------------------------------------
# 9. Display the answer
# -----------------------------------------

print("\n" + "=" * 70)
print("ANSWER")
print("=" * 70)

print(response["message"]["content"])


# -----------------------------------------
# 10. Display sources
# -----------------------------------------

print("\n" + "=" * 70)
print("SOURCES")
print("=" * 70)

for metadata in retrieved_metadata:
    print(f"Page {metadata['page']}")