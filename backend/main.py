from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from transformers import pipeline
import PyPDF2
import io
import os

from auth import router as auth_router, get_current_user

app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-text-summarizer-pi-ten.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- AUTH ROUTES ----------------
app.include_router(auth_router, prefix="/auth")

print("AUTH ROUTER LOADED ✅")

# ---------------- STATIC ----------------
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------------- MODEL ----------------
summarizer = pipeline("text-generation", model="distilgpt2")

# ---------------- HOME ----------------
@app.get("/")
def home():
    return {"message": "AI Text Summarizer API Running 🚀"}

# ---------------- KEYWORDS ----------------
def extract_keywords(text):
    words = text.split()
    stop_words = {"the","is","and","a","an","of","to","in","for","on","with"}

    keywords = []
    for w in words:
        w = w.strip(".,!?").lower()
        if w not in stop_words and len(w) > 4:
            if w not in keywords:
                keywords.append(w)

    return keywords[:10]

# ---------------- SUMMARIZE ----------------
@app.post("/summarize")
async def summarize(
    text: str = None,
    file: PyPDF2.types.UploadFile = None,
    user: dict = Depends(get_current_user)
):

    content = ""

    if text:
        content = text

    elif file:
        pdf_bytes = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))

        for page in pdf_reader.pages:
            if page.extract_text():
                content += page.extract_text()

    if not content.strip():
        return {"error": "No input provided"}

    content = content[:1000]

    result = summarizer(
        "summarize: " + content,
        max_length=100,
        do_sample=False
    )

    return {
        "summary": result[0]["generated_text"],
        "keywords": extract_keywords(content),
        "user": user
    }
