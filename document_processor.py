import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter


def extract_pages_from_pdf(pdf_path):
    document = fitz.open(pdf_path)

    pages = []

    for page_number, page in enumerate(document):
        text = page.get_text()

        if text.strip():
            pages.append({
                "page_number": page_number + 1,
                "text": text
            })

    document.close()

    return pages


def create_chunks(pages):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
            ""
        ]
    )

    chunks = []

    for page in pages:

        page_chunks = splitter.split_text(page["text"])

        for chunk in page_chunks:
            chunks.append({
                "text": chunk,
                "page_number": page["page_number"]
            })

    return chunks


pdf_path = "documents/sample.pptx"

pages = extract_pages_from_pdf(pdf_path)

chunks = create_chunks(pages)

print("Total pages:", len(pages))
print("Total chunks:", len(chunks))

for i, chunk in enumerate(chunks):

    print("\n" + "=" * 70)
    print(f"CHUNK {i + 1}")
    print(f"PAGE: {chunk['page_number']}")
    print("=" * 70)

    print(chunk["text"])
