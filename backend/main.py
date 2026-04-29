from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from auth import router as auth_router, get_current_user, init_db
import PyPDF2
import io
import os
import uvicorn

app = FastAPI()


# ---------------- STARTUP ----------------
@app.on_event("startup")
def on_startup():
    init_db()


# ---------------- AUTH ----------------
app.include_router(auth_router)

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- MODEL (FIXED) ----------------
summarizer = pipeline(
    "summarization",
    model="google/flan-t5-base"
)


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


# ---------------- HOME ----------------
@app.get("/")
def home():
    return {"message": "AI Text Summarizer API Running 🚀"}


# ---------------- SUMMARIZE ----------------
@app.post("/summarize")
async def summarize(
    text: str = Form(None),
    file: UploadFile = File(None),
    user: dict = Depends(get_current_user)
):

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

    content = content[:2000]

    try:
        result = summarizer(content, max_length=200, min_length=50, do_sample=False)
        summary = result[0]["summary_text"]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "summary": summary,
        "keywords": extract_keywords(content),
        "user": user
    }


# ---------------- RENDER ENTRY POINT ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
