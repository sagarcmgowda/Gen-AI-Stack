# GenAI Stack — Workflow Builder (React + FastAPI)

This project implements the assignment UI/UX and execution flow you shared.
It provides a drag-and-drop canvas (React Flow), a configuration panel,
and a chat modal that executes the defined workflow against a vectorized
Knowledge Base and an LLM.

## ✨ Features
- React UI that mirrors the screenshots (Components / Canvas / Config / Chat).
- React Flow nodes for **User Query**, **Knowledge Base**, **LLM Engine**, **Output**.
- File upload & PDF text extraction (PyMuPDF).
- Embedding & retrieval via **ChromaDB** (in-process).
- LLM call via **OpenAI** (configurable via env).
- Optional Web Search via **SerpAPI**.
- Dockerized frontend & backend + `docker-compose`.

## 🧰 Prereqs
- Node 18+ and Python 3.11+ (or use Docker).
- OpenAI API key (optional for local echo fallback).

## 🚀 Local (without Docker)
### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export OPENAI_API_KEY=sk-... # set your key (or use .env)
uvicorn main:app --reload
```
### Frontend
```bash
cd frontend
npm install
npm run dev
```
Visit http://localhost:5173 (frontend proxies `/api` to http://localhost:8000).

## 🐳 Docker
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend:  http://localhost:8000/api/health

## 🔌 Usage
1. Open the app, verify nodes are visible.
2. Connect **User → LLM → Output** (and optionally **KB → LLM**).
3. Select **Knowledge Base** node on the right panel and upload PDFs.
4. Click **Build Stack**.
5. Click **Chat with Stack**, then ask a question.

## 🗂️ Notes
- ChromaDB runs in-process; embeddings default to OpenAI if the key is set.
- If no OpenAI key is provided, the backend echoes messages (for demo).
- Extend `/api/run` to add Gemini, Brave, persistent DB, etc.

## 📦 Structure
```
genai-stack/
  backend/
    main.py
    requirements.txt
    Dockerfile
  frontend/
    src/ui/App.jsx
    src/store/useWorkflowStore.js
    package.json
    Dockerfile
  docker-compose.yml
  README.md
```