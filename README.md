# PlayerValue ⚽

*Vibecoded with Gemini Antigravity*

Football player market value intelligence platform and ML-powered valuation engine built on verified Transfermarkt and FBref performance statistics across Europe's top leagues.

---

## 🚀 Live Cloud Deployment Architecture

- **Backend API**: Hosted on **[Railway](https://railway.app)** (FastAPI + SQLite + XGBoost ML Engine)
- **Frontend App**: Hosted on **[Vercel](https://vercel.com)** (Static assets + Vercel edge rewrite proxy)

---

## Step 1: Deploy Backend on Railway

1. **Sign in to Railway**:
   - Go to [railway.app](https://railway.app) and sign in with your GitHub account.

2. **Create New Project**:
   - Click **+ New Project** → **Deploy from GitHub repo**.
   - Select your repository: `Swaroop677/PlayerValue`.

3. **Configure Settings**:
   - Railway will automatically detect the `Dockerfile` and `Procfile`.
   - Go to the **Settings** tab for your service:
     - Under **Networking** → Click **Generate Domain** (e.g., `playervalue-production.up.railway.app`).
   - Under **Variables**, no required variables are needed (it runs out of the box using the included SQLite database and trained XGBoost model).

4. **Verify Health**:
   - Test your endpoint in your browser:
     `https://playervalue.up.railway.app/api/health`
     Should return: `{"status":"ok"}`.

---

## Step 2: Deploy Frontend on Vercel

1. **Sign in to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub.

2. **Import Repository**:
   - Click **Add New...** → **Project**.
   - Select `Swaroop677/PlayerValue`.

3. **Project Settings**:
   - **Root Directory**: Select `frontend` (or leave as `./` using the root `vercel.json`).
   - **Framework Preset**: Other / None.

4. **Connected Railway Backend**:
   - `vercel.json` is already preconfigured to forward all `/api/*` requests to your Railway backend:
     ```json
     {
       "rewrites": [
         {
           "source": "/api/(.*)",
           "destination": "https://playervalue.up.railway.app/api/$1"
         }
       ]
     }
     ```
   - Commit and push to GitHub, or trigger a Redeploy in Vercel.

---

## 💻 Local Development

1. **Clone & install dependencies**:
   ```bash
   git clone https://github.com/Swaroop677/PlayerValue.git
   cd PlayerValue
   pip install -r requirements.txt
   ```

2. **Run local server**:
   ```bash
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

3. **Visit in browser**:
   Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

## 🧪 Testing

Run pytest suite:
```bash
pytest tests/
```

---

## 👤 Author

**Made by Swaroop Mane**
