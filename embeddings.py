from sentence_transformers import SentenceTransformer
import numpy as np


model = SentenceTransformer("all-MiniLM-L6-v2")


texts = [
    "Machine learning is a subset of artificial intelligence.",
    "Artificial intelligence allows computers to perform intelligent tasks.",
    "The football match was exciting and the striker scored two goals."
]


embeddings = model.encode(texts)


for i, text in enumerate(texts):
    print("\nText:", text)
    print("Vector dimensions:", len(embeddings[i]))


similarity_1 = np.dot(embeddings[0], embeddings[1]) / (
    np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
)

similarity_2 = np.dot(embeddings[0], embeddings[2]) / (
    np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[2])
)


print("\nSimilarity between AI sentences:")
print(similarity_1)

print("\nSimilarity between AI and football sentence:")
print(similarity_2)