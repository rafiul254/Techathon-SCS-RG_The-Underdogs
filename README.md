# RoboFusion SCS-RG

<div align="center">
  <h1>Multi-Hazard Smart Campus Safety & Response Grid</h1>
  <p>Real-time sensor fusion, risk assessment, and incident management system for university technical labs</p>
</div>

---

## Overview

RoboFusion SCS-RG (Smart Campus Safety & Response Grid) is a comprehensive IoT monitoring system designed for university technical laboratories. It combines data from multiple sensor types (fire, gas, water, PIR) to calculate real-time risk scores, prioritize incidents, and provide security personnel with actionable intelligence.

### Key Features

- **Real-time Sensor Fusion**: Combines data from multiple sensor types for comprehensive monitoring
- **Risk Scoring Algorithm**: Weighted fusion algorithm calculates risk scores based on configurable parameters
- **ML Risk Prediction**: Machine learning models forecast future risk trends
- **Live Incident Feed**: Real-time incident tracking with acknowledgment and resolution workflows
- **Actuator Controls**: Remote control of physical devices (buzzer, LED, relay, sprinkler lockout)
- **Command Dashboard**: Centralized interface for monitoring and response
- **Role-Based Access Control**: Different permissions for Security Staff and Admin users
- **Node Simulator**: Built-in simulator for testing and development
- **REST API**: Full API for external integrations (ESP32, Python, cURL, IoT gateways)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Zone Map │ │ Priority │ │ Incident │ │ Simulator│    │
│  │          │ │  Queue   │ │ Manager  │ │          │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP Polling
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Express.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │   CORS   │ │  Logging │ │ Rate     │ │  Error   │    │
│  │Middleware│ │Middleware│ │ Limiting │ │ Handling │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              REST API Endpoints                       │ │
│  │  /api/v1/zones, /api/v1/incidents, /api/v1/sensor-  │ │
│  │  data, /api/v1/actuators/control, etc.               │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              JSON Database (database.json)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Zones   │ │Incidents │ │ Weights  │ │Thresholds│    │
│  │          │ │          │ │          │ │          │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Sensor Data Ingestion**: External devices (ESP32, IoT gateways) send sensor data via REST API
2. **Risk Calculation**: Backend applies weighted fusion algorithm to calculate risk scores
3. **State Updates**: Zone states are updated based on risk thresholds (Safe, Warning, Critical)
4. **Incident Generation**: Critical states trigger automatic incident creation
5. **Frontend Polling**: React app polls backend every 1.5 seconds for live updates
6. **Actuator Control**: Security personnel can remotely control physical devices
7. **Persistence**: All state changes are persisted to JSON database

### Risk Fusion Algorithm

The risk score is calculated using a weighted fusion formula:

```
RiskScore = (W_fire × fireScore) + (W_gas × gasScore) + 
            (W_water × waterScore) + (W_occ × occupancyScore)

Where:
- W_fire = 0.4 (fire sensor weight)
- W_gas = 0.3 (gas sensor weight)
- W_water = 0.2 (water sensor weight)
- W_occ = 0.1 (occupancy sensor weight)
```

### State Determination

- **Safe**: RiskScore ≤ safeUpperLimit (default: 30)
- **Warning**: safeUpperLimit < RiskScore ≤ warningUpperLimit (default: 60)
- **Critical**: RiskScore > warningUpperLimit

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Zone                                  │
├─────────────────────────────────────────────────────────────┤
│ id (PK)              │ string                               │
│ name                 │ string                               │
│ code                 │ string                               │
│ location             │ string                               │
│ building             │ string                               │
│ floor                │ string                               │
│ occupantCount        │ number                               │
│ currentState         │ enum: SAFE, WARNING, CRITICAL        │
│ lastUpdated          │ string (timestamp)                    │
│ currentRiskScore     │ RiskScoreBreakdown                   │
│ mlPrediction         │ MLPrediction                         │
│ sensors              │ Sensor[]                             │
│ actuators           │ ActuatorState                        │
└─────────────────────────────────────────────────────────────┘
                            │ 1
                            │ has
                            │ N
┌─────────────────────────────────────────────────────────────┐
│                       Sensor                                 │
├─────────────────────────────────────────────────────────────┤
│ id (PK)              │ string                               │
│ zoneId (FK)          │ string                               │
│ type                 │ enum: fire, gas, water, pir          │
│ name                 │ string                               │
│ unit                 │ string                               │
│ minValue             │ number                               │
│ maxValue             │ number                               │
│ currentRawValue      │ number                               │
│ currentNormalizedValue│ number                             │
│ history              │ SensorReading[]                      │
└─────────────────────────────────────────────────────────────┘
                            │ 1
                            │ belongs to
                            │ N
┌─────────────────────────────────────────────────────────────┐
│                      Incident                               │
├─────────────────────────────────────────────────────────────┤
│ id (PK)              │ string                               │
│ zoneId (FK)          │ string                               │
│ zoneName             │ string                               │
│ zoneCode             │ string                               │
│ startTime            │ string (timestamp)                    │
│ endTime              │ string (timestamp)                    │
│ status               │ enum: active, acknowledged, resolved │
│ triggerReason        │ string                               │
│ acknowledgedBy       │ User                                 │
│ acknowledgedAt       │ string (timestamp)                    │
│ resolutionNotes      │ string                               │
│ maxRiskScore         │ number                               │
└─────────────────────────────────────────────────────────────┘
                            │ 1
                            │ acknowledged by
                            │ N
┌─────────────────────────────────────────────────────────────┐
│                        User                                  │
├─────────────────────────────────────────────────────────────┤
│ id (PK)              │ string                               │
│ username             │ string                               │
│ name                 │ string                               │
│ role                 │ enum: Security Staff, Admin          │
│ badgeId              │ string                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  RiskFusionWeights                           │
├─────────────────────────────────────────────────────────────┤
│ W_fire               │ number (0.0 - 1.0)                   │
│ W_gas                │ number (0.0 - 1.0)                   │
│ W_water              │ number (0.0 - 1.0)                   │
│ W_occ                │ number (0.0 - 1.0)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  RiskThresholds                              │
├─────────────────────────────────────────────────────────────┤
│ safeUpperLimit       │ number (0 - 100)                     │
│ warningUpperLimit    │ number (0 - 100)                     │
└─────────────────────────────────────────────────────────────┘
```

### Database File Structure

The `database.json` file contains:

```json
{
  "zones": [...],
  "incidents": [...],
  "weights": {...},
  "thresholds": {...},
  "users": [...],
  "metadata": {
    "version": "1.0",
    "lastUpdated": "ISO timestamp",
    "description": "RoboFusion SCS-RG JSON Database"
  }
}
```

---

## Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Techathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

The application will start:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health Check: http://localhost:3000/api/v1/health

---

## API Documentation

### Endpoints

#### Health Check
```
GET /api/v1/health
Response: { status, mode, uptime, zonesCount, activeIncidents }
```

#### Zones
```
GET /api/v1/zones
Response: { success: true, data: Zone[] }

GET /api/v1/zones/:id
Response: { success: true, data: Zone }
```

#### Incidents
```
GET /api/v1/incidents
Response: { success: true, data: Incident[] }

POST /api/v1/incidents/acknowledge
Body: { incidentId, user, notes }
Response: { success: true, incident: Incident }

POST /api/v1/incidents/resolve
Body: { incidentId, notes }
Response: { success: true, incident: Incident }
```

#### Sensor Data
```
POST /api/v1/sensor-data
Body: { zoneId, readings: [{ type, rawValue }] }
Response: { success: true, zone: Zone, receivedReadings: [...] }
```

#### Actuators
```
POST /api/v1/actuators/control
Body: { zoneId, actuator, state }
Response: { success: true }
```

#### Configuration
```
GET /api/v1/config/weights
Response: { success: true, weights: RiskFusionWeights }

POST /api/v1/config/weights
Body: { weights: RiskFusionWeights }
Response: { success: true, weights: RiskFusionWeights }

GET /api/v1/config/thresholds
Response: { success: true, thresholds: RiskThresholds }

POST /api/v1/config/thresholds
Body: { thresholds: RiskThresholds }
Response: { success: true, thresholds: RiskThresholds }
```

### Example Usage

#### cURL
```bash
curl -X POST http://localhost:3000/api/v1/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "z-1",
    "readings": [
      { "type": "gas", "rawValue": 450 }
    ]
  }'
```

#### Python
```python
import requests

response = requests.post('http://localhost:3000/api/v1/sensor-data', json={
    'zoneId': 'z-1',
    'readings': [
        {'type': 'gas', 'rawValue': 450}
    ]
})
print(response.json())
```

#### ESP32
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

void sendSensorData() {
  HTTPClient http;
  http.begin("http://localhost:3000/api/v1/sensor-data");
  http.addHeader("Content-Type", "application/json");
  
  String json = "{\"zoneId\":\"z-1\",\"readings\":[{\"type\":\"gas\",\"rawValue\":450}]}";
  int httpResponseCode = http.POST(json);
  
  http.end();
}
```

---

## Development

### Project Structure

```
Techathon/
├── src/
│   ├── components/          # React components
│   │   ├── Header.tsx
│   │   ├── LiveZoneMap.tsx
│   │   ├── PriorityQueue.tsx
│   │   ├── IncidentManager.tsx
│   │   ├── SensorAnalytics.tsx
│   │   ├── PredictedRiskPanel.tsx
│   │   ├── ZoneActuatorControl.tsx
│   │   ├── NodeSimulator.tsx
│   │   ├── AdminSettings.tsx
│   │   ├── ApiDocsModal.tsx
│   │   ├── AudioAlarm.tsx
│   │   └── ErrorBoundary.tsx
│   ├── data/
│   │   └── initialData.ts   # Initial data for zones, incidents, users
│   ├── utils/
│   │   └── riskCalculator.ts # Risk calculation algorithms
│   ├── types.ts             # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── server.ts                # Express.js backend server
├── database.json           # JSON database (auto-generated)
├── .env.example            # Environment variables template
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── README.md               # This file
```

### Available Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Environment Variables

```env
PORT=3000                          # Backend server port
NODE_ENV=development               # Environment mode
DB_PATH=./database.json            # Database file path
CORS_ORIGIN=http://localhost:5173 # CORS allowed origin
```

---

## Security Features

- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: All API endpoints validate input data
- **CORS Protection**: Configurable CORS origins
- **Error Handling**: Structured error responses without sensitive information
- **Role-Based Access Control**: Different permissions for different user roles

---

## Monitoring & Logging

### Request Logging

All HTTP requests are logged with:
- Method and path
- Response status code
- Request duration
- Log level (INFO/ERROR)

Example:
```
[INFO] GET /api/v1/zones - 200 (2ms)
[ERROR] POST /api/v1/sensor-data - 400 (5ms)
```

### Error Handling

The application includes comprehensive error handling:
- JSON parsing errors
- Request body size limits
- Invalid input validation
- 404 handler for unknown endpoints
- 500 handler for internal server errors

---

## Testing

### Manual Testing

1. **Start the application**: `npm run dev`
2. **Open browser**: Navigate to http://localhost:5173
3. **Test features**:
   - View live zone map
   - Trigger actuators
   - Acknowledge incidents
   - Change admin settings
   - Use the Node Simulator

### API Testing

Use the built-in API documentation modal in the application, or test endpoints directly using cURL, Postman, or similar tools.

---

## Deployment

### Production Build

```bash
npm run build
```

This creates a `dist/` directory with:
- Optimized frontend assets
- Compiled backend server
- Source maps for debugging

### Production Deployment

1. Set `NODE_ENV=production` in environment
2. Configure production database path
3. Set appropriate CORS origin
4. Run the compiled server

---

## Troubleshooting

### Common Issues

**Port already in use**
- Change `PORT` in `.env` file
- Kill existing process: `taskkill /F /IM node.exe` (Windows)

**Database not loading**
- Check `DB_PATH` in `.env` file
- Ensure `database.json` exists or will be auto-created

**CORS errors**
- Verify `CORS_ORIGIN` matches your frontend URL
- Check browser console for specific error details

**API not responding**
- Check backend server logs
- Verify API health endpoint: `curl http://localhost:3000/api/v1/health`

---

## License

This project is part of the RoboFusion SCS-RG system for university campus safety monitoring.

---

## Support

For issues, questions, or contributions, please refer to the project repository or contact the development team.
