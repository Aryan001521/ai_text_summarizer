from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from jose import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
import PyPDF2
import io

# ---------------- APP ----------------
app = FastAPI()

# ---------------- CORS FIX (IMPORTANT) ----------------
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

# ---------------- MODEL ----------------
summarizer = pipeline("text-generation", model="distilgpt2")

# ---------------- JWT ----------------
SECRET_KEY = "mysecretkey123"
ALGORITHM = "HS256"

# ---------------- SCHEMAS ----------------
class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

# ---------------- SIMPLE FAKE DB (for now) ----------------
users_db = {}

# ---------------- AUTH ----------------
def create_token(data: dict):
    payload = data.copy()
    payload.update({"exp": datetime.utcnow() + timedelta(hours=2)})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ---------------- SIGNUP ----------------
@app.post("/signup")
def signup(data: SignupRequest):
    if data.email in users_db:
        raise HTTPException(status_code=400, detail="User already exists")

    users_db[data.email] = {
        "username": data.username,
        "password": data.password
    }

    return {"message": "Signup successful"}

# ---------------- LOGIN ----------------
@app.post("/login")
def login(data: LoginRequest):
    user = users_db.get(data.email)

    if not user or user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"email": data.email})

    return {
        "access_token": token,
        "token_type": "bearer"
    }

# ---------------- AUTH CHECK ----------------
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token missing")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

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
        pdf = await file.read()
        reader = PyPDF2.PdfReader(io.BytesIO(pdf))

        for page in reader.pages:
            t = page.extract_text()
            if t:
                content += t

    if not content.strip():
        raise HTTPException(status_code=400, detail="No input provided")

    content = content[:1000]

    result = summarizer("summarize: " + content, max_length=120, do_sample=False)

    return {
        "summary": result[0]["generated_text"],
        "keywords": content.split()[:10]
    }
