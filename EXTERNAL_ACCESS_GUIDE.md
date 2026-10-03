# SentinelVault - External Access Guide

## Your Machine IP: `192.168.0.205`

Access SentinelVault from **any device on your network** using these URLs:

---

## 📍 Accessible URLs (From Any Device)

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | `http://192.168.0.205:5173` | Main UI Application |
| **Backend API** | `http://192.168.0.205:5000/api` | REST API Endpoint |
| **Backend Health** | `http://192.168.0.205:5000/api/health` | API Status Check |
| **AI Engine** | `http://192.168.0.205:8001` | AI/ML Microservice |
| **AI Engine Health** | `http://192.168.0.205:8001/health` | AI Service Status |

---

## 🚀 Quick Start

### Option 1: Run All Services (Easiest)
```powershell
cd "c:\Users\Lenovo\OneDrive\Desktop\internship project"
.\START_ALL_SERVICES.ps1
```
This opens all 3 services in separate terminals automatically.

### Option 2: Manual Start (Each in separate terminal)

**Terminal 1 - Backend:**
```powershell
cd "c:\Users\Lenovo\OneDrive\Desktop\internship project\backend"
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd "c:\Users\Lenovo\OneDrive\Desktop\internship project\frontend"
npm run dev
```

**Terminal 3 - AI Engine:**
```powershell
cd "c:\Users\Lenovo\OneDrive\Desktop\internship project\ai-engine"
uvicorn app:app --reload --host 0.0.0.0 --port 8001
```

---

## 🌍 Access From Other Devices

Once services are running, open these URLs on **any device on the same network**:

- **Laptop/Desktop:** `http://192.168.0.205:5173`
- **Mobile/Tablet:** `http://192.168.0.205:5173`
- **API Testing:** `http://192.168.0.205:5000/api/health`

> Note: Replace `192.168.0.205` with your actual machine IP if different

---

## 📋 Service Details

### Frontend (Port 5173)
- **Type:** React/Vite
- **Status:** `http://192.168.0.205:5173`
- **Bound to:** `0.0.0.0` (accessible from any device)

### Backend (Port 5000)
- **Type:** Node.js/Express
- **Status:** `http://192.168.0.205:5000/api/health`
- **Bound to:** `0.0.0.0` (accessible from any device)

### AI Engine (Port 8001)
- **Type:** Python/FastAPI
- **Status:** `http://192.168.0.205:8001/health`
- **Bound to:** `0.0.0.0` (accessible from any device)

---

## 🔧 Find Your Machine IP

If you need to find your machine IP dynamically:

```powershell
ipconfig | Select-String "IPv4"
```

Or use the automated launcher which detects it automatically.

---

## ✅ Verification Checklist

- [ ] All services are running (3 terminals active)
- [ ] Frontend loads at `http://192.168.0.205:5173`
- [ ] Backend responds at `http://192.168.0.205:5000/api/health`
- [ ] AI Engine responds at `http://192.168.0.205:8001/health`
- [ ] Can access from mobile/another device on network

---

## 🚫 Troubleshooting

**Can't access from other device?**
1. Ensure all devices are on the **same network**
2. Check Windows Firewall - may need to allow ports 5000, 5173, 8001
3. Verify IP with `ipconfig` command
4. Use `http://` not `https://` (unless configured)

**Port already in use?**
```powershell
# Find process using port
$p=(Get-NetTCPConnection -LocalPort 5000).OwningProcess
Get-Process -Id $p
```

---

## 📝 Notes

- All services now bind to `0.0.0.0` for external network access
- Localhost URLs (`http://localhost:*`) still work on this machine
- Services are in **development mode** with auto-reload enabled
- For production, use proper deployment configuration
