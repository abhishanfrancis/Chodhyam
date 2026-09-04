import chromadb
from sentence_transformers import SentenceTransformer
from document_processor import extract_pages_from_pdf, create_chunks


# --------------------------------------------------
# 1. Load the embedding model
# --------------------------------------------------

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


# --------------------------------------------------
# 2. Connect to ChromaDB
# --------------------------------------------------

client = chromadb.PersistentClient(path="./chroma_db")


collection = client.get_or_create_collection(
    name="documents"
)


# --------------------------------------------------
# 3. Read and chunk the PDF
# --------------------------------------------------

pdf_path = "documents/sample.pptx"

pages = extract_pages_from_pdf(pdf_path)

chunks = create_chunks(pages)


# --------------------------------------------------
# 4. Convert chunks into embeddings
# --------------------------------------------------

texts = [chunk["text"] for chunk in chunks]

embeddings = embedding_model.encode(texts).tolist()


# --------------------------------------------------
# 5. Store everything in ChromaDB
# --------------------------------------------------

ids = []

for i in range(len(chunks)):
    ids.append(f"chunk_{i}")


metadatas = []

for chunk in chunks:
    metadatas.append({
        "page": chunk["page_number"],
        "source": pdf_path
    })


collection.add(
    ids=ids,
    documents=texts,
    embeddings=embeddings,
    metadatas=metadatas
)


print("PDF successfully stored in ChromaDB!")
print("Number of chunks:", len(chunks))