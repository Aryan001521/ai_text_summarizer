from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from transformers import pipeline
import PyPDF2
import io

app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- SAFE STATIC HANDLING ----------------
# (Railway crash avoid: folder check)
import os
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")


# ---------------- MODEL (LIGHTER SAFE OPTION) ----------------
# NOTE: Railway 1GB RAM limit → heavy models crash
summarizer = pipeline(
    "text-generation",
    model="distilgpt2"
)


# ---------------- KEYWORDS ----------------
def extract_keywords(text):
    words = text.split()
    words = [w.strip(".,!?").lower() for w in words]

    stop_words = [
        "the", "is", "and", "a", "an", "of", "to",
        "in", "for", "on", "with"
    ]

    keywords = []
    for w in words:
        if w not in stop_words and len(w) > 4:
            if w not in keywords:
                keywords.append(w)

    return keywords[:10]


# ---------------- HOME ----------------
@app.get("/")
def home():
    return {"message": "AI Text Summarizer API Running 🚀"}


# ---------------- SUMMARIZE ----------------
@app.post("/summarize")
async def summarize(
    text: str = Form(None),
    file: UploadFile = File(None)
):

    content = ""

    # TEXT INPUT
    if text:
        content = text

    # PDF INPUT
    elif file:
        pdf_bytes = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))

        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                content += page_text

    # ERROR HANDLING
    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="Please provide text or PDF file"
        )

    # LIMIT (important for Railway memory)
    content = content[:1000]

    # SAFE PROMPT
    prompt = "summarize: " + content

    try:
        result = summarizer(prompt, max_length=100, do_sample=False)
        summary = result[0]["generated_text"]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Summarization failed: {str(e)}"
        )

    keywords = extract_keywords(content)

    return {
        "summary": summary,
        "keywords": keywords
    }
