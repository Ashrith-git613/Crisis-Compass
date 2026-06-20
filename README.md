# Crisis Compass

Crisis helpline classifier with a gamified step-by-step action plan frontend.

## Setup

### 1. Backend

```bash
cd Crisis-Compass
pip install -r requirements.txt
```

Create a `.env` file with your API keys:

```
OPENROUTER_API_KEY=sk-or-v1-...
SERP_API_KEY=...
```

Start the server:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd Crisis-Compass/crisis-compass-app
npm install
npx expo start
```

### 3. Open

- **Frontend:** http://localhost:8081
- **Backend API:** http://localhost:8000
- **Health check:** http://localhost:8000/health
