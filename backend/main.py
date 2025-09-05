import os, io, json, uuid, shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz  # PyMuPDF
import chromadb
from chromadb.utils import embedding_functions
import httpx

app = FastAPI(title="GenAI Stack Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = "data"
DOC_DIR = os.path.join(DATA_DIR, "docs")
os.makedirs(DOC_DIR, exist_ok=True)

EMBED_PROVIDER = os.getenv("EMBED_PROVIDER","openai")
LLM_PROVIDER = os.getenv("LLM_PROVIDER","openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY","")
SERP_API_KEY = os.getenv("SERP_API_KEY","")

client = chromadb.Client()
if EMBED_PROVIDER == "openai" and OPENAI_API_KEY:
    ef = embedding_functions.OpenAIEmbeddingFunction(api_key=OPENAI_API_KEY, model_name="text-embedding-3-small")
else:
    # fallback to Chroma's default embedding (all-MiniLM-L6-v2 via sentence-transformers) if available
    ef = None

collection = client.get_or_create_collection(name="kb", embedding_function=ef)

class RunPayload(BaseModel):
    workflow: dict
    messages: list

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/upload")
async def upload(files: List[UploadFile] = File(...)):
    chunks, ids, metas = [], [], []
    for f in files:
        fid = str(uuid.uuid4())
        path = os.path.join(DOC_DIR, fid + "_" + f.filename)
        with open(path, "wb") as out:
            shutil.copyfileobj(f.file, out)
        # Extract text
        try:
            doc = fitz.open(path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
        except Exception as e:
            text = ""
        # chunking
        for i in range(0, len(text), 1200):
            chunk = text[i:i+1200]
            if chunk.strip():
                chunks.append(chunk)
                ids.append(str(uuid.uuid4()))
                metas.append({"source": f.filename})
    if chunks:
        collection.add(documents=chunks, metadatas=metas, ids=ids)
    return {"indexed_chunks": len(chunks)}

async def web_search(q:str)->str:
    if not SERP_API_KEY:
        return ""
    url = "https://serpapi.com/search.json"
    params = {"q": q, "engine": "google", "api_key": SERP_API_KEY}
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(url, params=params)
        j = r.json()
        # take first organic result snippet
        try:
            organic = j.get("organic_results", [])
            if organic:
                return organic[0].get("snippet","")
        except Exception:
            pass
    return ""

async def call_llm(system: str, messages: list, provider: str = "openai") -> str:
    # Minimal, provider-agnostic call (OpenAI chat completion endpoint only for demo)
    if provider == "openai" and OPENAI_API_KEY:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        msgs = [{"role":"system","content":system}] + messages
        resp = client.chat.completions.create(model="gpt-4o-mini", messages=msgs, temperature=0.7)
        return resp.choices[0].message.content
    # Fallback simple echo
    return "LLM not configured. Echo: " + messages[-1]["content"]

@app.post("/api/run")
async def run(payload: RunPayload):
    wf = payload.workflow
    messages = payload.messages
    cfg = wf.get("configs", {})
    prompt = cfg.get("llm", {}).get("prompt", "You are a helpful PDF assistant. Use context if available.")
    use_web = cfg.get("llm", {}).get("useWeb", False)
    top_k = int(cfg.get("kb", {}).get("topK", 4))
    query = messages[-1]["content"]
    context = ""
    # Retrieve from vector store when available
    try:
        results = collection.query(query_texts=[query], n_results=top_k)
        docs = results.get("documents", [[]])[0]
        context = "\n\n".join(docs)
    except Exception:
        context = ""
    web = ""
    if use_web:
        web = await web_search(query)
    system = f"""{prompt}

    Context:
    {context}

    Web:
    {web}
    """
    reply = await call_llm(system, messages, provider=os.getenv("LLM_PROVIDER","openai"))
    return {"reply": reply}