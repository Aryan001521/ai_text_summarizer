from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from auth import router as auth_router, get_current_user, init_db
import PyPDF2
import io
import os

app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- AUTH ----------------
app.include_router(auth_router)

# ---------------- GLOBAL MODEL (lazy load) ----------------
summarizer = None


# ---------------- STARTUP SAFE ----------------
@app.on_event("startup")
def startup():
    global summarizer

    # DB safe init
    try:
        init_db()
        print("DB initialized")
    except Exception as e:
        print("DB init failed (non-blocking):", e)

    # Model load (still risky but controlled)
    try:
        summarizer = pipeline(
            "summarization",
            model="sshleifer/distilbart-cnn-12-6"  # lightweight model
        )
        print("Model loaded")
    except Exception as e:
        print("Model load failed:", e)


# ---------------- HOME ----------------
@app.get("/")
def home():
    return {"message": "AI Text Summarizer API Running 🚀"}


# ---------------- KEYWORDS ----------------
def extract_keywords(text):
    words = text.split()
    words = [w.strip(".,!?").lower() for w in words]

    stop_words = {"the", "is", "and", "a", "an", "of", "to", "in", "for", "on", "with"}

    keywords = []
    for w in words:
        if w not in stop_words and len(w) > 4 and w not in keywords:
            keywords.append(w)

    return keywords[:10]


# ---------------- SUMMARIZE ----------------
@app.post("/summarize")
async def summarize(
    text: str = Form(None),
    file: UploadFile = File(None),
    user: dict = Depends(get_current_user)
):

    if summarizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    content = ""

    if text:
        content = text

    elif file:
        pdf_bytes = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))

        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                content += page_text

    if not content.strip():
        raise HTTPException(status_code=400, detail="Please provide text or PDF")

    content = content[:1500]  # memory safe

    try:
        result = summarizer(
            content,
            max_length=150,
            min_length=40,
            do_sample=False
        )
        summary = result[0]["summary_text"]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "summary": summary,
        "keywords": extract_keywords(content),
        "user": user
    }
