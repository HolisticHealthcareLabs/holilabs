# Docker Development Workflow for HoliLabs

## What Docker Does For You

**Problem Without Docker:** Your Mac and DigitalOcean server have different setups. Code that works locally might break on the server.

**Solution With Docker:** Both environments run identical containers. If it works locally, it WILL work on the server.

---

## Your New Daily Workflow

### 1. Start Your Day (ONE TIME PER DAY)

```bash
cd ~/prototypes/holilabsv2/infra/docker
docker compose up -d
```

This starts 3 services:
- ✅ **PostgreSQL** (Database) → `localhost:5432`
- ✅ **Redis** (Cache) → `localhost:6379`
- ✅ **MinIO** (File Storage) → `localhost:9000` | UI: `localhost:9001`

**Check if running:**
```bash
docker ps
```

You should see `holi-postgres`, `holi-redis`, and `holi-minio` all with status `Up` and `(healthy)`.

---

### 2. Develop Your Code (Your Existing Process)

**Navigate to project:**
```bash
cd ~/prototypes/holilabsv2
```

**Run your development server:**
```bash
npm run dev
```

Your app now connects to Docker containers automatically! Open `http://localhost:3000`

**Make changes:**
- Edit code in your editor (Cursor, VS Code, etc.)
- Changes auto-reload via `npm run dev`
- Database, cache, files all handled by Docker

---

### 3. Save Your Work (Your Existing Git Workflow)

**See what changed:**
```bash
git status
```

**Stage all changes:**
```bash
git add .
```

**Commit with message:**
```bash
git commit -m "Your detailed description of what you built/fixed"
```

**Push to GitHub (single source of truth):**
```bash
git push
```

---

### 4. Stop Docker (End of Day - OPTIONAL)

```bash
cd ~/prototypes/holilabsv2/infra/docker
docker compose down
```

**When to stop:**
- End of work day to free up Mac resources
- Switching to a different project
- Need to restart fresh

**Your data is safe!** Stopping containers doesn't delete your database. Data persists in Docker volumes.

---

## Common Docker Commands

### Check Status
```bash
docker ps                          # See running containers
docker ps -a                       # See all containers (including stopped)
```

### Logs & Debugging
```bash
docker logs holi-postgres          # PostgreSQL logs
docker logs holi-redis             # Redis logs
docker logs holi-minio             # MinIO logs
docker logs -f holi-postgres       # Follow logs in real-time (Ctrl+C to exit)
```

### Connect Directly to Services
```bash
# Connect to PostgreSQL database
docker exec -it holi-postgres psql -U holi -d holi_protocol

# Connect to Redis CLI
docker exec -it holi-redis redis-cli

# Check PostgreSQL connection
docker exec holi-postgres pg_isready -U holi
```

### Restart Services
```bash
cd ~/prototypes/holilabsv2/infra/docker
docker compose restart             # Restart all services
docker compose restart postgres    # Restart only PostgreSQL
```

### Nuclear Option (Start Fresh)
```bash
cd ~/prototypes/holilabsv2/infra/docker
docker compose down -v             # Stop and DELETE all data (volumes)
docker compose up -d               # Start fresh containers
```

⚠️ **WARNING:** `-v` flag deletes all database data, uploaded files, cache. Only use when you want a completely clean slate.

---

## Web UIs You Can Access

| Service | URL | Login |
|---------|-----|-------|
| MinIO Console (File Storage) | http://localhost:9001 | User: `holi`<br>Pass: `holi_dev_password` |
| Your App | http://localhost:3000 | Your app login |

---

## Troubleshooting

### "Docker command not found"
**Fix:** Restart your terminal or run:
```bash
source ~/.zshrc
```

### "Port already in use"
**Problem:** Something else is using ports 5432, 6379, or 9000/9001

**Fix:** Stop other services or change ports in `infra/docker/docker-compose.yml`

### "Container unhealthy"
**Check logs:**
```bash
docker logs holi-postgres
```

**Restart:**
```bash
cd ~/prototypes/holilabsv2/infra/docker
docker compose restart
```

### "Can't connect to database"
1. Check Docker is running: `docker ps`
2. Check .env file exists: `ls -la .env` (should be in project root)
3. Check DATABASE_URL in .env matches: `postgresql://holi:holi_dev_password@localhost:5432/holi_protocol?schema=public`

---

## Deploying to DigitalOcean (Production)

### Step 1: Push to GitHub (Your Single Source of Truth)
```bash
git add .
git commit -m "Feature ready for production"
git push
```

### Step 2: SSH into DigitalOcean
```bash
ssh root@129.212.184.190
```

### Step 3: Pull Latest Code
```bash
cd ~/holilabs  # Or wherever your project lives
git pull
```

### Step 4: Start Docker on Server
```bash
cd infra/docker
docker compose up -d
```

### Step 5: Run Migrations & Build
```bash
cd ~/holilabs
npm install           # Install any new dependencies
npm run build         # Build for production
```

**Same Docker setup on both Mac and server = zero surprises!**

---

## Your Complete Workflow (Summary)

```
┌─────────────────────────────────────────────────────┐
│ 1. START DOCKER (once per day)                      │
│    cd ~/prototypes/holilabsv2/infra/docker          │
│    docker compose up -d                             │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 2. DEVELOP (your existing process)                  │
│    cd ~/prototypes/holilabsv2                       │
│    npm run dev                                      │
│    → Make changes → Auto-reload → Test              │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 3. SAVE TO GIT (your existing process)              │
│    git status                                       │
│    git add .                                        │
│    git commit -m "description"                      │
│    git push                                         │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 4. DEPLOY (when ready)                              │
│    ssh root@129.212.184.190                         │
│    cd ~/holilabs && git pull                        │
│    cd infra/docker && docker compose up -d          │
│    cd ~/holilabs && npm install && npm run build    │
└─────────────────────────────────────────────────────┘
```

---

## Key Principles (From Your Notes)

1. **GitHub is the single source of truth** - Always push changes here first
2. **Mac is development** - Test everything locally in Docker before production
3. **DigitalOcean is production** - Only deploy tested, working code
4. **Atomic changes** - Make small, focused commits with clear messages
5. **Docker ensures consistency** - Same environment everywhere = no surprises

---

## Questions?

- Check if Docker is running: `docker ps`
- View logs for errors: `docker logs holi-postgres`
- Restart fresh: `cd infra/docker && docker compose restart`
- Nuclear option: `docker compose down -v && docker compose up -d`

**Your data persists** even when containers stop (stored in Docker volumes). Only `down -v` deletes data.
