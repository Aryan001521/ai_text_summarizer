from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from transformers import pipeline
from auth import router as auth_router, get_current_user
import PyPDF2
import io
import os

app = FastAPI()

# 🔥 DEBUG CHECK
print("MAIN APP LOADED 🚀")
print("AUTH ROUTER LOADED 🚀")

# ---------------- AUTH ROUTES ----------------
app.include_router(auth_router, prefix="/auth")

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-text-summarizer-pi-ten.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- STATIC ----------------
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------------- MODEL ----------------
summarizer = pipeline("text-generation", model="distilgpt2")

# ---------------- KEYWORDS ----------------
def extract_keywords(text):
    words = text.split()
    words = [w.strip(".,!?").lower() for w in words]

    stop_words = ["the","is","and","a","an","of","to","in","for","on","with"]

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
        raise HTTPException(400, "No input provided")

    content = content[:1000]

    result = summarizer("summarize: " + content, max_length=100, do_sample=False)

    return {
        "summary": result[0]["generated_text"],
        "keywords": extract_keywords(content),
        "user": user
    }
