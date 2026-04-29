from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from transformers import pipeline
from auth import router as auth_router, get_current_user
import PyPDF2
import io

app = FastAPI()

# Auth router
app.include_router(auth_router)

# CORS fix
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# static folder
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/favicon.ico")
def favicon():
    return FileResponse("static/favicon.ico")


# ✅ KEEP YOUR ORIGINAL MODEL (NO CHANGE REQUESTED)
summarizer = pipeline(
    "text-generation",
    model="google/flan-t5-base"
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
    return {"message": "AI Text Summarizer API Running"}


# ---------------- SUMMARIZE (FIXED) ----------------
@app.post("/summarize")
async def summarize(
    text: str = Form(None),
    file: UploadFile = File(None),
    user: dict = Depends(get_current_user)
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

    # NO INPUT ERROR FIX
    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="Please provide text or PDF file"
        )

    # limit input size
    content = content[:2000]

    # prompt (safe for your model)
    prompt = "summarize: " + content

    try:
        result = summarizer(prompt, max_length=200, do_sample=False)

        summary = result[0]["generated_text"]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Summarization failed: {str(e)}"
        )

    keywords = extract_keywords(content)

    return {
        "summary": summary,
        "keywords": keywords,
        "user": user
    }