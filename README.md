# 🛡️ RoboFusion 1.0 — SCS-RG
### Multi-Hazard Smart Campus Safety & Response Grid
**Techathon Round 1** | UFTB Robotics Club | Track B — Simulation (Wokwi ESP32)

---

## Team: The Underdogs

---

## Overview

A full-stack IoT hazard monitoring system for UFTB's technical labs. Independently-monitored **zones** report raw fire/gas/water/occupancy sensor readings to the backend, which computes a server-side **risk score** and SAFE/WARNING/CRITICAL state, ranks concurrently-critical zones by priority, and gives security staff a live command dashboard.

**Core architectural rule:** Zone nodes send raw sensor values only — the backend is the sole authority on risk score and state. Zone nodes never self-report their own state.

---

## Zones Monitored

| Zone | Code | Hazard Profile |
|------|------|---------------|
| Chemical Synthesis Lab | CHEM-204 | Fire, gas, occupancy |
| Battery Thermal Runaway Test Cell | BATT-005 | Fire, gas, occupancy |
| Robotics & Autonomous Arena | ROBO-101 | Fire, occupancy |
| High Voltage & Power Test Grid | ELEC-302 | Fire, water |
| Fluid Dynamics & Hydraulics Rig | FLUID-102 | Water, occupancy |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Zone Simulation | Wokwi ESP32 (diagram.json + sketch/sketch.ino) |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (sql.js — in-memory + file-backed) |
| Frontend | React 19 + Vite |
| Real-time | WebSocket + 1.5s polling fallback |
| ML Prediction | Custom risk predictor (display-only, never triggers actuation) |

---

## Risk Fusion Formula

```
risk_score = (0.4 × fire) + (0.3 × gas_norm) + (0.2 × water_norm) + (0.1 × occupancy)

SAFE:     score < 30
WARNING:  30 ≤ score < 60
CRITICAL: score ≥ 60
```

Computed **server-side only** inside `src/utils/riskCalculator.ts`.  
See `docs/DOCUMENTATION.pdf` for full weight justification.

---

## Setup

### Prerequisites
- Node.js v18+
- npm

### Install

```bash
git clone https://github.com/imTariful/Techathon.git
cd Techathon
npm install
cp .env.example .env
```

### Run (two terminals)

```bash
# Terminal 1 — Backend
npx tsx server.ts

# Terminal 2 — Frontend
npx vite
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Health Check | http://localhost:3000/api/v1/health |

### Default Logins

| Role | Username |
|------|----------|
| Security Staff | sec_officer_sarah |
| Admin | admin_marcus |

*(Passwords in `.env` — never commit real credentials)*

---

## Zone Node Simulation (Track B — Wokwi ESP32)

Open `diagram.json` in [Wokwi](https://wokwi.com) or via the IntelliJ Wokwi plugin.  
Firmware in `sketch/sketch.ino` implements:

- Fire debounce (5 consecutive HIGH readings required)
- Gas 30s warm-up suppression after boot
- Water level normalization + negative value rejection
- PIR retrigger delay
- Raw values POSTed to backend — ESP32 never decides its own state

**Circuit pin mapping:**

| Sensor/Actuator | ESP32 Pin | Type |
|----------------|-----------|------|
| Flame Sensor | D13 | Digital Input |
| Gas Sensor (MQ-2) | D34 | Analog Input |
| Water Level | D35 | Analog Input |
| PIR Motion | D14 | Digital Input |
| Green LED (SAFE) | D25 | Digital Output |
| Yellow LED (WARNING) | D26 | Digital Output |
| Red LED (CRITICAL) | D27 | Digital Output |
| Buzzer | D32 | Digital Output |

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | System health check |
| GET | `/api/v1/zones` | All zone current status + risk scores |
| GET | `/api/v1/incidents` | Incident history (filterable by date) |
| POST | `/api/v1/sensor-data` | Zone → backend raw readings ingestion |
| POST | `/api/v1/incidents/:id/acknowledge` | Acknowledge alert (race-condition safe) |
| POST | `/api/v1/actuators/control` | Trigger actuator (Admin) |
| POST | `/api/v1/config/thresholds` | Update thresholds (Admin only) |
| GET | `/api/v1/incidents/critical-last-24h` | Indexed CRITICAL query |

---

## Database Schema

SQLite via `sql.js`. Tables: `Zones`, `Sensors`, `Readings`, `Incidents`, `Acknowledgments`, `Users`, `Settings`

Key constraints:
- `Readings.zone_id` → `Zones.id` ON DELETE RESTRICT
- `Incidents.zone_id` → `Zones.id` ON DELETE RESTRICT
- `Acknowledgments.incident_id` UNIQUE (race-condition safety — only one ack wins)
- `INDEX idx_incidents_status_time ON Incidents(status, start_time)`

---

## Project Structure

```
Techathon/
├── server.ts                      # Backend entry point
├── src/
│   ├── components/                # React dashboard components
│   ├── data/initialData.ts        # Seed data
│   ├── database/db.ts             # SQLite (sql.js) init + schema
│   ├── utils/
│   │   ├── riskCalculator.ts      # Server-side risk fusion
│   │   └── sensorSimulator.ts     # Debounce + warmup logic
│   └── types.ts
├── sketch/sketch.ino              # ESP32 firmware
├── diagram.json                   # Wokwi circuit diagram
├── wokwi.toml                     # Wokwi config
├── docs/
│   ├── circuits/                  # Wokwi screenshots (SAFE/WARNING/CRITICAL)
│   └── DOCUMENTATION.pdf          # Full system documentation
└── README.md
```

---

## Key Requirements Met

### Section A — Hardware & Sensing (TC1–TC5)
- [x] TC1: Fire debounce — 5 consecutive HIGH readings required (sketch/sketch.ino)
- [x] TC2: Gas 30s warm-up suppression after boot (sensorSimulator.ts)
- [x] TC3: Water level normalized 0.0–1.0, proportional risk contribution
- [x] TC4: PIR occupancy detection with retrigger delay
- [x] TC5: CRITICAL triggers Buzzer ON + LED ON + Relay within 1s; WARNING = visual only

### Section B — Backend System (TC6–TC11)
- [x] TC6: Server-side risk computation only — zone never self-reports state
- [x] TC7: Race-condition safe acknowledgment via UNIQUE constraint
- [x] TC8: REST API — zones, incidents, acknowledge, override all documented
- [x] TC9: Backend restart reconstructs zone state from database
- [x] TC10: Zone API key auth + dashboard session token enforced
- [x] TC11: Load handling demonstrated; scalability plan documented

### Section C — Frontend Dashboard (TC12–TC16)
- [x] TC12: Live zone map auto-updates + priority queue with ranking explanation
- [x] TC13: RBAC — Staff vs Admin, enforced server-side on every endpoint
- [x] TC14: Incident timeline — filterable log with full timeline per incident
- [x] TC15: CRITICAL HAZARD ALARM banner + audio cue; clears on acknowledge
- [x] TC16: Mixed-state dashboard; accessibility via icon+label not color alone

### Section D — Database Design (TC17–TC21)
- [x] TC17: Normalized schema — Zones, Sensors, Readings, Incidents, Acknowledgments, Users
- [x] TC18: ON DELETE RESTRICT + UNIQUE ack constraint; concurrent write safe
- [x] TC19: INDEX idx_incidents_status_time on Incidents(status, start_time)
- [x] TC20: SQLite backup via sql.js export; recovery path documented
- [x] TC21: Raw readings >90 days dropped; only Admin can query raw history

### Section E — Integration & Edge Cases (TC22–TC25)
- [x] TC22: End-to-end multi-zone incident demonstrated via Simulate Anomaly
- [x] TC23: Edge cases — invalid values rejected (f), backend restart (e), browser reconnect (d)
- [x] TC24: System stable under combined load — no crash or freeze
- [x] TC25: Dashboard, backend, zone node state always consistent

### Section F — Documentation (TC26–TC31)
- [x] TC26: Wokwi circuit diagrams — SAFE/WARNING/CRITICAL states (docs/circuits/)
- [x] TC27: Software architecture diagram in docs/DOCUMENTATION.pdf
- [x] TC28: Full API documentation with example payloads
- [x] TC29: Database ER schema diagram
- [x] TC30: Risk fusion formula with weight justification
- [x] TC31: Video demonstration ≤7 minutes (see submission)

### Section G — Bonus
- [x] Bonus 3: ML risk prediction — logistic regression, synthetic data, display-only

---

## License
Built for RoboFusion 1.0 — UFTB Robotics Club Techathon, Round 1.
