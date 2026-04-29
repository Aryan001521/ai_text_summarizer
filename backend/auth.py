from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, Base
from datetime import datetime, timedelta
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext

router = APIRouter()

SECRET_KEY = "mysecretkey123"
ALGORITHM = "HS256"

# password hashing (SAFE WAY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------- DB INIT ----------------

_tables_created = False

def init_db():
    global _tables_created
    if not _tables_created:
        Base.metadata.create_all(bind=engine)
        _tables_created = True

def get_db():
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- SCHEMAS ----------------

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

# ---------------- JWT ----------------

def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=2)

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ---------------- SIGNUP ----------------

@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):

    user_exists = db.query(User).filter(User.email == data.email).first()

    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(data.password)

    new_user = User(
        username=data.username,
        email=data.email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}

# ---------------- LOGIN ----------------

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not pwd_context.verify(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"email": user.email})

    return {
        "access_token": token,
        "token_type": "bearer"
    }

# ---------------- AUTH ----------------

def get_current_user(authorization: str = Header(None)):

    if not authorization:
        raise HTTPException(status_code=401, detail="Token missing")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
