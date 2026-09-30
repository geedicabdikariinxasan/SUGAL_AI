import os
import io
import time
import random
import traceback
from datetime import datetime
from bson import ObjectId
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from groq import AsyncGroq

try:
    import pypdf
except ImportError:
    pypdf = None

app = FastAPI(title="SUGAL AI - Super Intelligence Edition")

# MongoDB Atlas
MONGO_DETAILS = "mongodb+srv://Haji:1122@cluster0.wcn5swm.mongodb.net/?appName=Cluster0"
client = AsyncIOMotorClient(MONGO_DETAILS, serverSelectionTimeoutMS=3000)
database = client.ai_chatbot_db
user_collection = database.get_collection("users")
chat_collection = database.get_collection("chats")

# Groq API Key
GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY", 
    "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"
).strip()

groq_client = AsyncGroq(api_key=GROQ_API_KEY)

# 🚀 1. MODEL-KA UGU CAQLIGA BADAN & KUWA FAST FALLBACK AH
PRIMARY_MODEL = "llama-3.3-70b-versatile"
BACKUP_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b"
]

def safe_object_id(id_val):
    if not id_val:
        return None
    try:
        return ObjectId(str(id_val)) if ObjectId.is_valid(str(id_val)) else None
    except Exception:
        return None

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterSchema(BaseModel):
    fullName: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

class ChatMessageRequest(BaseModel):
    message: str
    email: str = "guest@user.com"
    chat_id: str | None = None

class ImageGenRequest(BaseModel):
    prompt: str
    email: str = "guest@user.com"

class ProfileUpdateRequest(BaseModel):
    email: str
    fullName: str

# 🧠 2. SYSTEM PROMPT-KA HEERKA SARE EE AQOONTA, LUQADAHA & XAQIIQADA
system_prompt = """
You are SUGAL AI, an omniscient, world-class, highly accurate, and polyglot AI assistant.

CRITICAL INSTRUCTIONS:
1. FACTUAL ACCURACY & KNOWLEDGE:
   - Provide 100% accurate, deeply reasoned, and factual answers across all domains: Somali History, World History, Science, Islam & Religion, Coding, Mathematics, Business, Medicine, and Technology.
   - Never hallucinate, guess, or invent false information. If details are nuanced, explain them clearly with evidence.
   - When writing code, provide clean, optimized, bug-free, and well-commented code.

2. NATIVE MULTILINGUAL PRECISION:
   - Automatically detect the user's language and reply in that EXACT same language with native fluency.
   - Somali: Use rich, expressive, grammatically flawless, professional, and authentic Somali (Af-Soomaali qani ah, sax ah oo xikmadaysan).
   - Arabic: Use eloquent, grammatically sound Modern Standard Arabic (فصحى بليغة وسليمة).
   - English: Use articulate, professional, and concise English.

3. STRUCTURE & CLARITY:
   - Go straight to the point without unnecessary generic fluff.
   - Format answers beautifully using bold keywords, clean bullet points, numbered steps, and markdown code blocks.
"""

# ================= AUTH =================
@app.post("/api/register")
async def register_user(user: RegisterSchema):
    try:
        email_clean = user.email.strip().lower()
        existing_user = await user_collection.find_one({"email": email_clean})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email-kani hore ayuu u diiwaan gashanaa!")
        
        hashed_pwd = hash_password(user.password)
        await user_collection.insert_one({
            "fullName": user.fullName.strip(),
            "email": email_clean,
            "password": hashed_pwd,
            "created_at": datetime.utcnow()
        })
        return {"status": "success", "message": "Account-kaaga si guul leh ayaa loo sameeyay!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Register Error: {str(e)}")

@app.post("/api/login")
async def login_user(user: LoginSchema):
    try:
        email_clean = user.email.strip().lower()
        db_user = await user_collection.find_one({"email": email_clean})
        if not db_user or not verify_password(user.password, db_user["password"]):
            raise HTTPException(status_code=400, detail="Email-ka ama Password-ka waa khaldan yahay!")
        
        return {
            "status": "success",
            "message": "Si guul leh ayaad u soo gashay!",
            "user": {
                "fullName": db_user.get("fullName", "User"),
                "email": db_user["email"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login Error: {str(e)}")

@app.put("/api/user/profile")
async def update_user_profile(req: ProfileUpdateRequest):
    try:
        email_clean = req.email.strip().lower()
        await user_collection.update_one(
            {"email": email_clean},
            {"$set": {"fullName": req.fullName.strip()}}
        )
        return {"status": "success", "message": "Xogtaada waa la cusboonaysiiyay!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================= 🎨 ULTRA-SMART AI IMAGE GENERATOR =================
@app.post("/api/generate-image")
async def generate_ai_image(req: ImageGenRequest):
    user_prompt = req.prompt.strip()
    if not user_prompt:
        raise HTTPException(status_code=400, detail="Fadlan qor sawirka aad rabto!")

    enhanced_prompt = user_prompt
    try:
        completion = await groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a prompt engineer. Convert the user's prompt (Somali/Arabic/English) into an ultra-detailed, photorealistic, cinematic 8k English prompt for Flux. Return ONLY the prompt text, no quotes or explanation."
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=85,
            temperature=0.5
        )
        enhanced_prompt = completion.choices[0].message.content.strip().strip('"')
    except Exception:
        enhanced_prompt = user_prompt

    seed = random.randint(1000, 999999)
    safe_prompt = enhanced_prompt.replace("/", " ").replace("?", " ").strip()
    image_url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width=1024&height=1024&seed={seed}&nologo=true&enhance=true&model=flux"

    return {
        "status": "success",
        "original_prompt": user_prompt,
        "enhanced_prompt": enhanced_prompt,
        "image_url": image_url
    }

# ================= 🚀 FAST & INTELLIGENT CHAT (HIGH ACCURACY) =================
@app.post("/api/chat")
async def send_chat_message(req: ChatMessageRequest):
    user_msg = req.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Fariintu ma noqon karto mid maran!")

    user_email = (req.email or "guest@user.com").strip().lower()
    chat_doc = None
    valid_id = safe_object_id(req.chat_id)
    chat_id_str = str(valid_id) if valid_id else "temp_" + str(int(datetime.utcnow().timestamp()))

    # 1. MongoDB Session lookup
    try:
        if valid_id:
            chat_doc = await chat_collection.find_one({"_id": valid_id, "email": user_email})

        if not chat_doc:
            title = user_msg[:30] + ("..." if len(user_msg) > 30 else "")
            new_chat = {
                "email": user_email,
                "title": title,
                "messages": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            res_insert = await chat_collection.insert_one(new_chat)
            valid_id = res_insert.inserted_id
            chat_id_str = str(valid_id)
            chat_doc = new_chat
    except Exception as db_err:
        print(f"MongoDB Safe Mode: {db_err}")

    # 2. Context Memory (6-dii fariin ee u dambeeyay)
    history_messages = chat_doc.get("messages", []) if chat_doc else []
    context_window = history_messages[-6:]

    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in context_window:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            groq_messages.append({"role": msg["role"], "content": msg["content"]})
    groq_messages.append({"role": "user", "content": user_msg})

    # 3. Wac Model-ka 70B oo leh Temperature 0.4 (Strict Accuracy & Speed)
    ai_response = None
    last_error = ""

    for model_name in BACKUP_MODELS:
        try:
            chat_completion = await groq_client.chat.completions.create(
                messages=groq_messages,
                model=model_name,
                temperature=0.4,  # 🎯 0.4 = Saxnaan aad u sarreysa oo aan khaladaad lahayn
                max_tokens=2048,  # Jawaab buuxda oo mufasal ah
            )
            ai_response = chat_completion.choices[0].message.content
            if ai_response:
                break
        except Exception as model_err:
            last_error = str(model_err)
            continue

    if not ai_response:
        ai_response = f"Waan ka xumahay, cilad farsamo ayaa dhacday: {last_error}"

    # 4. Ku kaydi MongoDB
    try:
        if valid_id:
            now = datetime.utcnow()
            new_user_msg = {"role": "user", "content": user_msg, "timestamp": now.isoformat()}
            new_ai_msg = {"role": "assistant", "content": ai_response, "timestamp": now.isoformat()}

            await chat_collection.update_one(
                {"_id": valid_id},
                {
                    "$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}},
                    "$set": {"updated_at": now}
                }
            )
    except Exception as db_save_err:
        print(f"MongoDB Save Warning: {db_save_err}")

    return {
        "status": "success",
        "chat_id": chat_id_str,
        "title": chat_doc.get("title", "Sheeko") if chat_doc else "Sheeko",
        "reply": ai_response,
        "response": ai_response
    }

@app.get("/api/chats/{email}")
async def get_user_chat_history(email: str):
    try:
        email_clean = email.strip().lower()
        cursor = chat_collection.find({"email": email_clean}).sort("updated_at", -1)
        chats = []
        async for doc in cursor:
            chats.append({
                "chat_id": str(doc["_id"]),
                "title": doc.get("title", "Sheeko"),
                "updated_at": str(doc.get("updated_at", ""))
            })
        return {"status": "success", "chats": chats}
    except Exception:
        return {"status": "success", "chats": []}

@app.get("/api/chat/{chat_id}")
async def get_single_chat_messages(chat_id: str):
    try:
        valid_id = safe_object_id(chat_id)
        if not valid_id:
            raise HTTPException(status_code=400, detail="Invalid Chat ID")

        doc = await chat_collection.find_one({"_id": valid_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Sheekadan lama helin!")
        
        msgs = [{"role": m.get("role", "user"), "content": m.get("content", "")} for m in doc.get("messages", [])]
        return {
            "status": "success",
            "chat_id": str(doc["_id"]),
            "title": doc.get("title", "Sheeko"),
            "messages": msgs
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/{chat_id}")
async def delete_chat_session(chat_id: str):
    valid_id = safe_object_id(chat_id)
    if valid_id:
        try:
            await chat_collection.delete_one({"_id": valid_id})
        except Exception:
            pass
    return {"status": "success", "message": "Waa la tirtiray!"}

@app.delete("/api/chats/clear/{email}")
async def clear_all_user_chats(email: str):
    try:
        email_clean = email.strip().lower()
        await chat_collection.delete_many({"email": email_clean})
    except Exception:
        pass
    return {"status": "success", "message": "Dhammaan waa la tirtiray!"}

# ================= FILE EXTRACTOR =================
@app.post("/api/extract-file")
async def extract_file_content(file: UploadFile = File(...)):
    try:
        content_bytes = await file.read()
        filename_lower = file.filename.lower()
        extracted_text = ""

        if any(filename_lower.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp']):
            extracted_text = f"[Image File Uploaded: {file.filename}] - Please analyze this image and answer the user query."
        elif filename_lower.endswith(".pdf"):
            if pypdf:
                reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                extracted_text = "\n".join([p.extract_text() or "" for p in reader.pages]).strip()
            else:
                extracted_text = "PDF reader library is loading."
        else:
            try:
                extracted_text = content_bytes.decode("utf-8", errors="ignore").strip()
            except Exception:
                extracted_text = content_bytes.decode("latin-1", errors="ignore").strip()

        if not extracted_text:
            extracted_text = f"Dukumentiga '{file.filename}' ma laha qoraal toos ah."

        return {
            "status": "success",
            "file_name": file.filename,
            "extracted_text": extracted_text[:5000]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================= STATIC ROUTES =================
@app.get("/")
async def read_root():
    return FileResponse("frontend/dashboard.html")

@app.get("/dashboard")
async def read_dashboard():
    return FileResponse("frontend/dashboard.html")

@app.get("/login")
async def read_login():
    return FileResponse("frontend/login.html")

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")