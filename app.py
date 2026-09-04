import os
import re
import html
import tempfile

import streamlit as st
import fitz  # PyMuPDF
import chromadb
from sentence_transformers import SentenceTransformer
import ollama

from document_processor import (
    extract_pages_from_pdf,
    create_chunks
)


# ============================================================
# PAGE CONFIG
# ============================================================

st.set_page_config(
    page_title="DocuMind",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ============================================================
# CUSTOM CSS
# ============================================================

st.markdown(
    """
    <style>

    .stApp {
        background: #1b120e;
        color: #f5eadf;
    }

    .block-container {
        max-width: 1450px;
        padding-top: 2rem;
        padding-bottom: 4rem;
    }

    .brand-title {
        font-size: 48px;
        font-weight: 800;
        color: #f3d0ad;
        letter-spacing: -1px;
        margin-bottom: 0;
    }

    .brand-subtitle {
        font-size: 18px;
        color: #bda18b;
        margin-bottom: 30px;
    }

    .section-title {
        font-size: 23px;
        font-weight: 700;
        color: #e9c19b;
        margin-top: 15px;
        margin-bottom: 7px;
    }

    .section-description {
        color: #ad9180;
        font-size: 14px;
        margin-bottom: 15px;
    }

    .document-card {
        background: #2a1b14;
        border: 1px solid #60412f;
        border-radius: 15px;
        padding: 18px 20px;
        margin: 15px 0 10px 0;
    }

    .document-name {
        font-size: 19px;
        font-weight: 700;
        color: #f3d0ad;
    }

    .document-status {
        font-size: 13px;
        color: #b89a84;
        margin-top: 5px;
    }

    .answer-card {
        background: #281a13;
        border: 1px solid #704c34;
        border-left: 4px solid #c18a5b;
        border-radius: 14px;
        padding: 22px;
        color: #f5eadf;
        font-size: 16px;
        line-height: 1.75;
        margin-top: 10px;
        margin-bottom: 20px;
    }

    .pdf-container {
        background: #241710;
        border: 1px solid #5d3d2a;
        border-radius: 15px;
        padding: 15px;
        text-align: center;
    }

    .page-indicator {
        background: #332117;
        border: 1px solid #694832;
        border-radius: 9px;
        padding: 8px 12px;
        color: #e7c5a5;
        text-align: center;
        margin-bottom: 12px;
        font-weight: 600;
    }

    .stButton > button {
        background: #8f603f;
        color: #fff5ec;
        border: 1px solid #b27b53;
        border-radius: 10px;
        font-weight: 700;
        transition: all 0.18s ease;
    }

    .stButton > button:hover {
        background: #ad7650;
        border-color: #d09a70;
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }

    div[data-baseweb="input"] {
        background: #2a1b14 !important;
        border: 1px solid #65442f !important;
        border-radius: 12px !important;
    }

    div[data-baseweb="input"]:focus-within {
        border-color: #bd8658 !important;
        box-shadow: 0 0 0 1px #bd8658 !important;
    }

    div[data-baseweb="input"] input {
        color: #f5eadf !important;
    }

    div[data-baseweb="input"] input::placeholder {
        color: #927766 !important;
    }

    [data-testid="stFileUploader"] {
        background: #241710;
        border: 1px solid #5c3d2a;
        border-radius: 14px;
        padding: 12px;
    }

    section[data-testid="stSidebar"] {
        background: #241710;
        border-right: 1px solid #5a3a28;
    }

    section[data-testid="stSidebar"] * {
        color: #f5eadf;
    }

    hr {
        border: none;
        border-top: 1px solid #4d3223;
        margin: 25px 0;
    }

    </style>
    """,
    unsafe_allow_html=True
)


# ============================================================
# SESSION STATE
# ============================================================

defaults = {
    "document_ready": False,
    "document_name": "",
    "document_bytes": None,
    "chunk_count": 0,
    "current_page": 1,
    "highlight_chunks": [],
    "highlight_pages": [],
    "last_answer": "",
    "last_question": "",
    "evidence_quotes": [],
    "upload_key": 0
}

for key, value in defaults.items():

    if key not in st.session_state:
        st.session_state[key] = value


# ============================================================
# EMBEDDING MODEL
# ============================================================

@st.cache_resource
def load_embedding_model():

    return SentenceTransformer(
        "all-MiniLM-L6-v2",
        local_files_only=True
    )


embedding_model = load_embedding_model()


# ============================================================
# CHROMADB
# ============================================================

@st.cache_resource
def load_chroma():

    return chromadb.PersistentClient(
        path="./chroma_db"
    )


client = load_chroma()


# ============================================================
# RESET FUNCTION
# ============================================================

def reset_application():

    # Delete old vector collection
    try:

        client.delete_collection(
            name="uploaded_document"
        )

    except Exception:

        pass


    # Reset everything
    st.session_state.document_ready = False
    st.session_state.document_name = ""
    st.session_state.document_bytes = None

    st.session_state.chunk_count = 0
    st.session_state.current_page = 1

    st.session_state.highlight_chunks = []
    st.session_state.highlight_pages = []

    st.session_state.last_answer = ""
    st.session_state.last_question = ""

    st.session_state.evidence_quotes = []

    # Force a fresh uploader
    st.session_state.upload_key += 1

    st.rerun()


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.markdown(
        """
        <div style="
            font-size:28px;
            font-weight:800;
            color:#e9c19b;
        ">
            📚 DocuMind
        </div>

        <div style="
            color:#9e806d;
            font-size:13px;
            margin-bottom:20px;
        ">
            Intelligent Document Assistant
        </div>
        """,
        unsafe_allow_html=True
    )

    st.divider()

    st.markdown("### 🧠 RAG Pipeline")

    st.markdown(
        """
        **1. 📤 Upload**

        Upload a PDF.

        **2. ✂️ Chunk**

        Split the document into meaningful sections.

        **3. 🔢 Embed**

        Convert text into vectors.

        **4. 🔎 Retrieve**

        Find relevant evidence.

        **5. 🤖 Generate**

        Llama 3.2 creates the answer.

        **6. 🎯 Highlight**

        Show the exact evidence in the PDF.
        """
    )

    st.divider()

    st.markdown("### ⚙️ System")

    st.write("🟢 Llama 3.2 3B")
    st.write("🟢 MiniLM Embeddings")
    st.write("🟢 ChromaDB")
    st.write("🟢 PyMuPDF")


# ============================================================
# HEADER
# ============================================================

st.markdown(
    '<div class="brand-title">📚 DocuMind</div>',
    unsafe_allow_html=True
)

st.markdown(
    """
    <div class="brand-subtitle">
        Ask questions. Find answers.
        See exactly where the answer came from.
    </div>
    """,
    unsafe_allow_html=True
)


# ============================================================
# UPLOAD
# ============================================================

st.markdown(
    '<div class="section-title">📤 Upload Document</div>',
    unsafe_allow_html=True
)

st.markdown(
    """
    <div class="section-description">
        Upload a PDF to create your searchable knowledge base.
    </div>
    """,
    unsafe_allow_html=True
)

uploaded_file = st.file_uploader(
    "Choose a PDF",
    type=["pdf"],
    label_visibility="collapsed",
    key=f"pdf_uploader_{st.session_state.upload_key}"
)


# ============================================================
# PROCESS DOCUMENT
# ============================================================

if uploaded_file is not None:

    if st.button(
        "⚡ Process Document",
        key="process_document"
    ):

        with st.spinner(
            "Processing document..."
        ):

            try:

                pdf_bytes = uploaded_file.getvalue()

                st.session_state.document_bytes = pdf_bytes
                st.session_state.document_name = uploaded_file.name


                # ------------------------------------------------
                # Temporary PDF
                # ------------------------------------------------

                with tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix=".pdf"
                ) as temp_file:

                    temp_file.write(pdf_bytes)

                    temp_path = temp_file.name


                # ------------------------------------------------
                # Extract pages
                # ------------------------------------------------

                pages = extract_pages_from_pdf(
                    temp_path
                )


                # ------------------------------------------------
                # Create intelligent chunks
                # ------------------------------------------------

                chunks = create_chunks(
                    pages
                )


                texts = [
                    chunk["text"]
                    for chunk in chunks
                ]


                # ------------------------------------------------
                # Embeddings
                # ------------------------------------------------

                embeddings = embedding_model.encode(
                    texts
                ).tolist()


                # ------------------------------------------------
                # Reset Chroma collection
                # ------------------------------------------------

                try:

                    client.delete_collection(
                        name="uploaded_document"
                    )

                except Exception:

                    pass


                collection = client.create_collection(
                    name="uploaded_document"
                )


                # ------------------------------------------------
                # IDs
                # ------------------------------------------------

                ids = [
                    f"chunk_{i}"
                    for i in range(len(chunks))
                ]


                # ------------------------------------------------
                # Metadata
                # ------------------------------------------------

                metadatas = []

                for chunk in chunks:

                    metadatas.append(
                        {
                            "page": chunk["page_number"],
                            "source": uploaded_file.name
                        }
                    )


                # ------------------------------------------------
                # Store vectors
                # ------------------------------------------------

                collection.add(
                    ids=ids,
                    documents=texts,
                    embeddings=embeddings,
                    metadatas=metadatas
                )


                os.remove(temp_path)


                # ------------------------------------------------
                # Update state
                # ------------------------------------------------

                st.session_state.document_ready = True
                st.session_state.chunk_count = len(chunks)

                st.session_state.current_page = 1

                st.session_state.highlight_chunks = []
                st.session_state.highlight_pages = []

                st.session_state.last_answer = ""
                st.session_state.last_question = ""

                st.session_state.evidence_quotes = []


                st.success(
                    f"✓ Document processed successfully! "
                    f"{len(chunks)} chunks created."
                )


            except Exception as e:

                st.error(
                    f"Document processing failed:\n\n{e}"
                )


# ============================================================
# DOCUMENT STATUS
# ============================================================

if st.session_state.document_ready:

    st.markdown(
        f"""
        <div class="document-card">

            <div class="document-name">
                📄 {html.escape(
                    st.session_state.document_name
                )}
            </div>

            <div class="document-status">
                🟢 Ready
                &nbsp; • &nbsp;
                {st.session_state.chunk_count} chunks
                &nbsp; • &nbsp;
                RAG enabled
            </div>

        </div>
        """,
        unsafe_allow_html=True
    )


    # --------------------------------------------------------
    # RESET
    # --------------------------------------------------------

    reset_col1, reset_col2 = st.columns(
        [5, 1]
    )

    with reset_col2:

        if st.button(
            "↻ Reset",
            key="reset_button",
            use_container_width=True
        ):

            reset_application()


# ============================================================
# PDF PAGE RENDERING
# ============================================================

def render_pdf_page(
    pdf_bytes,
    page_number,
    highlight_chunks,
    evidence_quotes
):

    try:

        pdf = fitz.open(
            stream=pdf_bytes,
            filetype="pdf"
        )

        total_pages = len(pdf)


        if page_number < 1:
            page_number = 1

        if page_number > total_pages:
            page_number = total_pages


        page = pdf[
            page_number - 1
        ]


        highlight_count = 0


        # ====================================================
        # EXACT EVIDENCE HIGHLIGHTING
        # ====================================================

        page_quotes = [
            quote
            for quote in evidence_quotes
            if quote["page"] == page_number
        ]


        for item in page_quotes:

            quote = item["quote"].strip()


            if not quote:
                continue


            # Try the exact quote first
            rectangles = []

            try:

                rectangles = page.search_for(
                    quote
                )

            except Exception:

                rectangles = []


            # ------------------------------------------------
            # If exact quote wasn't found, try shorter pieces
            # ------------------------------------------------

            if not rectangles:

                words = quote.split()


                # Try first 20 words
                if len(words) >= 20:

                    search_text = " ".join(
                        words[:20]
                    )

                    try:

                        rectangles = page.search_for(
                            search_text
                        )

                    except Exception:

                        rectangles = []


                # Try first 12 words
                if not rectangles and len(words) >= 12:

                    search_text = " ".join(
                        words[:12]
                    )

                    try:

                        rectangles = page.search_for(
                            search_text
                        )

                    except Exception:

                        rectangles = []


                # Try first 8 words
                if not rectangles and len(words) >= 8:

                    search_text = " ".join(
                        words[:8]
                    )

                    try:

                        rectangles = page.search_for(
                            search_text
                        )

                    except Exception:

                        rectangles = []


            # ------------------------------------------------
            # Add highlights
            # ------------------------------------------------

            for rect in rectangles[:10]:

                annotation = (
                    page.add_highlight_annot(
                        rect
                    )
                )

                annotation.update()

                highlight_count += 1


        # ====================================================
        # FALLBACK FOR CHUNK
        # ====================================================

        if (
            highlight_count == 0
            and highlight_chunks
        ):

            page_chunks = [
                chunk
                for chunk in highlight_chunks
                if chunk["page"] == page_number
            ]


            for chunk in page_chunks:

                words = chunk["text"].split()


                if len(words) > 0:

                    search_text = " ".join(
                        words[:10]
                    )


                    try:

                        rectangles = page.search_for(
                            search_text
                        )

                    except Exception:

                        rectangles = []


                    for rect in rectangles[:3]:

                        annotation = (
                            page.add_highlight_annot(
                                rect
                            )
                        )

                        annotation.update()

                        highlight_count += 1


        # ====================================================
        # RENDER
        # ====================================================

        matrix = fitz.Matrix(
            1.5,
            1.5
        )

        pixmap = page.get_pixmap(
            matrix=matrix,
            alpha=False
        )

        image_bytes = pixmap.tobytes(
            "png"
        )


        pdf.close()


        return (
            image_bytes,
            highlight_count,
            total_pages
        )


    except Exception:

        return (
            None,
            0,
            0
        )


# ============================================================
# MAIN APPLICATION
# ============================================================

if st.session_state.document_ready:

    left_column, right_column = st.columns(
        [1.15, 1],
        gap="large"
    )


    # ========================================================
    # LEFT — PDF
    # ========================================================

    with left_column:

        st.markdown(
            '<div class="section-title">'
            '📖 PDF Preview'
            '</div>',
            unsafe_allow_html=True
        )


        # ----------------------------------------------------
        # Total pages
        # ----------------------------------------------------

        try:

            pdf_document = fitz.open(
                stream=st.session_state.document_bytes,
                filetype="pdf"
            )

            total_pages = len(
                pdf_document
            )

            pdf_document.close()

        except Exception:

            total_pages = 1


        # ----------------------------------------------------
        # Evidence pages
        # ----------------------------------------------------

        if st.session_state.highlight_pages:

            pages_text = ", ".join(
                str(page)
                for page in
                st.session_state.highlight_pages
            )

            st.markdown(
                f"""
                <div class="section-description">
                    🎯 Relevant evidence:
                    <b>Pages {pages_text}</b>
                </div>
                """,
                unsafe_allow_html=True
            )

        else:

            st.markdown(
                """
                <div class="section-description">
                    Ask a question to highlight the
                    exact evidence automatically.
                </div>
                """,
                unsafe_allow_html=True
            )


        # ----------------------------------------------------
        # Navigation
        # ----------------------------------------------------

        nav1, nav2, nav3 = st.columns(
            [1, 1.3, 1]
        )


        with nav1:

            if st.button(
                "◀ Previous",
                key="previous_page",
                use_container_width=True
            ):

                if st.session_state.current_page > 1:

                    st.session_state.current_page -= 1

                    st.rerun()


        with nav2:

            st.markdown(
                f"""
                <div class="page-indicator">
                    📄 Page
                    {st.session_state.current_page}
                    / {total_pages}
                </div>
                """,
                unsafe_allow_html=True
            )


        with nav3:

            if st.button(
                "Next ▶",
                key="next_page",
                use_container_width=True
            ):

                if (
                    st.session_state.current_page
                    < total_pages
                ):

                    st.session_state.current_page += 1

                    st.rerun()


        # ----------------------------------------------------
        # Render PDF
        # ----------------------------------------------------

        image_bytes, highlight_count, _ = (
            render_pdf_page(
                st.session_state.document_bytes,
                st.session_state.current_page,
                st.session_state.highlight_chunks,
                st.session_state.evidence_quotes
            )
        )


        if image_bytes:

            st.image(
                image_bytes,
                use_container_width=True
            )

        else:

            st.error(
                "Unable to render this PDF page."
            )


        # ----------------------------------------------------
        # Highlight status
        # ----------------------------------------------------

        if (
            st.session_state.highlight_pages
            and
            st.session_state.current_page
            in st.session_state.highlight_pages
        ):

            if highlight_count > 0:

                st.success(
                    f"🎯 {highlight_count} "
                    f"exact evidence highlight(s) "
                    f"found on this page."
                )

            else:

                st.warning(
                    "This page was identified as relevant, "
                    "but the exact text could not be located."
                )


    # ========================================================
    # RIGHT — QUESTION / ANSWER
    # ========================================================

    with right_column:

        st.markdown(
            '<div class="section-title">'
            '💬 Ask Your Document'
            '</div>',
            unsafe_allow_html=True
        )

        st.markdown(
            """
            <div class="section-description">
                Ask anything about the uploaded PDF.
                Press <b>Enter</b> to submit.
            </div>
            """,
            unsafe_allow_html=True
        )


        # ====================================================
        # QUESTION FORM
        # ====================================================

        with st.form(
            key="question_form"
        ):

            question = st.text_input(
                "Question",
                placeholder=(
                    "e.g. What are the types of "
                    "semi-supervised learning?"
                ),
                label_visibility="collapsed"
            )


            submitted = st.form_submit_button(
                "➤ Ask Question"
            )


        # ====================================================
        # ASK QUESTION
        # ====================================================

        if submitted:

            if not question.strip():

                st.warning(
                    "Please enter a question."
                )

            else:

                try:

                    # ----------------------------------------
                    # ChromaDB
                    # ----------------------------------------

                    collection = client.get_collection(
                        name="uploaded_document"
                    )


                    # ----------------------------------------
                    # Question embedding
                    # ----------------------------------------

                    question_embedding = (
                        embedding_model
                        .encode(question)
                        .tolist()
                    )


                    # ----------------------------------------
                    # Retrieve chunks
                    # ----------------------------------------

                    results = collection.query(
                        query_embeddings=[
                            question_embedding
                        ],
                        n_results=5
                    )


                    documents = results[
                        "documents"
                    ][0]

                    metadata = results[
                        "metadatas"
                    ][0]


                    # ====================================================
                    # NUMBER THE RETRIEVED CHUNKS
                    # ====================================================

                    context = ""


                    for i, document in enumerate(
                        documents
                    ):

                        page = metadata[i]["page"]


                        context += f"""

[CHUNK {i + 1}]
[PAGE {page}]

{document}

"""


                    # ====================================================
                    # LLM PROMPT
                    # ====================================================

                    prompt = f"""
You are DocuMind, a document question-answering assistant.

Answer the user's question using ONLY the retrieved
document chunks below.

Do not use outside knowledge.

Your most important task is to identify the EXACT
piece of text from the document that supports your answer.

Retrieved document:

{context}

User question:

{question}

Return your response in EXACTLY this format:

ANSWER:
<clear answer to the question>

EVIDENCE:
CHUNK <number> | PAGE <page number> | QUOTE: <exact sentence or short passage copied from the document>

If multiple pieces of evidence are needed, put each one
on a separate line.

For example:

ANSWER:
There are four common semi-supervised learning algorithms:
Self-Training, Co-Training, Graph-Based Methods, and
Low-Density Separation Methods.

EVIDENCE:
CHUNK 2 | PAGE 6 | QUOTE: Self-Training, Co-Training, Graph-Based Methods, Low-Density Separation Methods

IMPORTANT:
The QUOTE must be copied EXACTLY from the retrieved
document text.

Only select evidence that actually supports the answer.

If the answer cannot be found in the document, return:

ANSWER:
I couldn't find the answer in the document.

EVIDENCE:
NONE
"""


                    # ====================================================
                    # ASK LLAMA
                    # ====================================================

                    with st.spinner(
                        "🤖 Finding the answer..."
                    ):

                        response = ollama.chat(
                            model="llama3.2:3b",
                            messages=[
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ]
                        )


                    raw_response = response[
                        "message"
                    ]["content"]


                    # ====================================================
                    # PARSE ANSWER
                    # ====================================================

                    answer = raw_response


                    if "ANSWER:" in raw_response:

                        answer = raw_response.split(
                            "ANSWER:",
                            1
                        )[1]


                        if "EVIDENCE:" in answer:

                            answer = answer.split(
                                "EVIDENCE:",
                                1
                            )[0]


                    answer = answer.strip()


                    # ====================================================
                    # PARSE EVIDENCE
                    # ====================================================

                    evidence_quotes = []


                    evidence_section = ""


                    if "EVIDENCE:" in raw_response:

                        evidence_section = (
                            raw_response.split(
                                "EVIDENCE:",
                                1
                            )[1]
                        )


                    # ----------------------------------------------------
                    # Find each evidence line
                    # ----------------------------------------------------

                    evidence_lines = (
                        evidence_section
                        .strip()
                        .splitlines()
                    )


                    for line in evidence_lines:

                        line = line.strip()


                        if not line:
                            continue


                        if line.upper() == "NONE":
                            continue


                        # --------------------------------------------
                        # Extract chunk number
                        # --------------------------------------------

                        chunk_match = re.search(
                            r"CHUNK\s*(\d+)",
                            line,
                            re.IGNORECASE
                        )


                        # --------------------------------------------
                        # Extract page number
                        # --------------------------------------------

                        page_match = re.search(
                            r"PAGE\s*(\d+)",
                            line,
                            re.IGNORECASE
                        )


                        # --------------------------------------------
                        # Extract quote
                        # --------------------------------------------

                        quote_match = re.search(
                            r"QUOTE:\s*(.*)",
                            line,
                            re.IGNORECASE
                        )


                        if (
                            chunk_match
                            and page_match
                            and quote_match
                        ):

                            chunk_number = int(
                                chunk_match.group(1)
                            )

                            page_number = int(
                                page_match.group(1)
                            )

                            quote = (
                                quote_match
                                .group(1)
                                .strip()
                            )


                            if (
                                1 <= chunk_number
                                <= len(documents)
                                and quote
                            ):

                                evidence_quotes.append(
                                    {
                                        "chunk": chunk_number,
                                        "page": page_number,
                                        "quote": quote
                                    }
                                )


                    # ====================================================
                    # FALLBACK
                    # ====================================================

                    if not evidence_quotes:

                        # We don't want to falsely highlight
                        # every retrieved chunk.

                        # Instead use the first retrieved
                        # chunk only as a fallback.

                        evidence_quotes.append(
                            {
                                "chunk": 1,
                                "page": metadata[0]["page"],
                                "quote": documents[0][:200]
                            }
                        )


                    # ====================================================
                    # HIGHLIGHT CHUNKS
                    # ====================================================

                    highlight_chunks = []


                    for item in evidence_quotes:

                        chunk_number = (
                            item["chunk"]
                        )

                        index = chunk_number - 1


                        highlight_chunks.append(
                            {
                                "text": documents[index],
                                "page": metadata[index]["page"]
                            }
                        )


                    # ====================================================
                    # SOURCE PAGES
                    # ====================================================

                    highlight_pages = sorted(
                        set(
                            item["page"]
                            for item in evidence_quotes
                        )
                    )


                    # ====================================================
                    # SAVE STATE
                    # ====================================================

                    st.session_state.last_question = (
                        question
                    )

                    st.session_state.last_answer = (
                        answer
                    )

                    st.session_state.highlight_chunks = (
                        highlight_chunks
                    )

                    st.session_state.highlight_pages = (
                        highlight_pages
                    )

                    st.session_state.evidence_quotes = (
                        evidence_quotes
                    )


                    # ====================================================
                    # JUMP TO FIRST EVIDENCE PAGE
                    # ====================================================

                    if highlight_pages:

                        st.session_state.current_page = (
                            highlight_pages[0]
                        )


                    st.rerun()


                except Exception as e:

                    st.error(
                        f"Unable to answer the question:\n\n{e}"
                    )


        # ========================================================
        # ANSWER DISPLAY
        # ========================================================

        if st.session_state.last_answer:

            st.markdown(
                '<div class="section-title">'
                '✨ Answer'
                '</div>',
                unsafe_allow_html=True
            )


            answer_html = html.escape(
                st.session_state.last_answer
            ).replace(
                "\n",
                "<br>"
            )


            st.markdown(
                f"""
                <div class="answer-card">
                    {answer_html}
                </div>
                """,
                unsafe_allow_html=True
            )


            # ====================================================
            # SOURCES
            # ====================================================

            st.markdown(
                '<div class="section-title">'
                '📚 Sources'
                '</div>',
                unsafe_allow_html=True
            )


            st.markdown(
                """
                <div class="section-description">
                    These pages contain the evidence used
                    to generate the answer.
                </div>
                """,
                unsafe_allow_html=True
            )


            source_pages = (
                st.session_state.highlight_pages
            )


            if source_pages:

                source_columns = st.columns(
                    min(
                        len(source_pages),
                        4
                    )
                )


                for i, page in enumerate(
                    source_pages
                ):

                    with source_columns[
                        i % len(source_columns)
                    ]:

                        if st.button(
                            f"📄 Page {page}",
                            key=f"source_page_{page}",
                            use_container_width=True
                        ):

                            st.session_state.current_page = (
                                page
                            )

                            st.rerun()


            # ====================================================
            # EVIDENCE
            # ====================================================

            if st.session_state.evidence_quotes:

                st.markdown(
                    '<div class="section-title">'
                    '🎯 Evidence Used'
                    '</div>',
                    unsafe_allow_html=True
                )


                for evidence in (
                    st.session_state.evidence_quotes
                ):

                    quote_html = html.escape(
                        evidence["quote"]
                    )


                    st.markdown(
                        f"""
                        <div style="
                            background:#241710;
                            border-left:3px solid #c18a5b;
                            border-radius:8px;
                            padding:12px 15px;
                            margin-bottom:10px;
                            color:#d9b99c;
                            font-size:14px;
                            line-height:1.6;
                        ">
                            <b>
                                Page {evidence["page"]}
                            </b>

                            <br><br>

                            "{quote_html}"
                        </div>
                        """,
                        unsafe_allow_html=True
                    )


# ============================================================
# EMPTY STATE
# ============================================================

else:

    st.markdown(
        """
        <div style="
            margin-top:50px;
            padding:50px;
            text-align:center;
            background:#241710;
            border:1px solid #513625;
            border-radius:18px;
        ">

            <div style="font-size:55px;">
                📄
            </div>

            <div style="
                font-size:25px;
                font-weight:700;
                color:#e9c19b;
                margin-top:10px;
            ">
                No document loaded
            </div>

            <div style="
                color:#a98b78;
                margin-top:8px;
            ">
                Upload a PDF above to start asking questions.
            </div>

        </div>
        """,
        unsafe_allow_html=True
    )


# ============================================================
# FOOTER
# ============================================================

st.divider()

st.markdown(
    """
    <div style="
        text-align:center;
        color:#806756;
        font-size:12px;
        padding-top:10px;
    ">
        DocuMind • RAG-powered Document Assistant
        <br>
        Llama 3.2 3B • MiniLM • ChromaDB • PyMuPDF
    </div>
    """,
    unsafe_allow_html=True
)