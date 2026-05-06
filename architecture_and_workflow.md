# Crime Reporting System Architecture & Workflow

This document outlines the high-level architecture and key operational workflows for the **SafetyFirst - Crime Reporting & Public Safety Platform**.

## 1. System Architecture

The application follows a standard MERN (MongoDB, Express.js, React.js, Node.js) stack architecture. 

- **Frontend (Client-Side):** Built with React 19 and Vite. Uses React Router for Role-Based Access Control (RBAC) navigation. Employs `React Leaflet` for geospatial maps and `Recharts` for analytics.
- **Backend (Server-Side):** Powered by Express.js and Node.js. It exposes a RESTful API and utilizes middleware for authentication (JWT via HTTP-only cookies) and file uploads (Multer).
- **Database:** MongoDB via Mongoose ODM. It persists entities like Users, Reports, Alerts (SOS), Notifications, and Messages.

```mermaid
graph TD
    subgraph "Frontend (React + Vite)"
        UI[User Interface / Pages]
        RBAC[Role-Based Routing]
        Map[Leaflet Map Component]
        Charts[Recharts Dashboards]
    end

    subgraph "Backend (Node.js + Express)"
        Router[API Router]
        AuthMW[Auth Middleware]
        Controllers[Route Controllers]
        Multer[Multer File Upload]
        
        Router --> AuthMW
        AuthMW --> Controllers
        Multer --> Controllers
    end

    subgraph "Database (MongoDB)"
        Users[(Users)]
        Reports[(Reports)]
        Alerts[(Alerts / SOS)]
        Notifications[(Notifications)]
        Messages[(Messages)]
    end

    %% Interactions
    Citizen((Citizen)) -->|HTTPS Requests| UI
    Police((Police)) -->|HTTPS Requests| UI
    Admin((Admin)) -->|HTTPS Requests| UI

    UI -->|REST API & JWT Cookies| Router
    Map -->|Fetch Hotspots| Router
    Charts -->|Fetch Stats| Router

    Controllers -->|Mongoose Queries| Users
    Controllers -->|Mongoose Queries| Reports
    Controllers -->|Mongoose Queries| Alerts
    Controllers -->|Mongoose Queries| Notifications
    Controllers -->|Mongoose Queries| Messages
```

---

## 2. Core Workflows

### A. Authentication & Access Control Workflow

The system directs users to distinct operational dashboards based on their role: Citizen, Police, or Admin.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Backend API
    participant DB as MongoDB

    User->>Frontend: Fills Login / Registration Form
    Frontend->>API: POST /api/auth/login
    API->>DB: Verify Credentials
    DB-->>API: User Record
    API->>API: Generate JWT Token
    API-->>Frontend: Set HTTP-Only Cookie + Return User Data
    Frontend->>Frontend: Check User Role
    
    alt Role == Citizen
        Frontend-->>User: Redirect to Citizen Dashboard
    else Role == Police
        Frontend-->>User: Redirect to Police Control Room
    else Role == Admin
        Frontend-->>User: Redirect to Admin Workspace
    end
```

### B. Incident Reporting & Triage Workflow

When a citizen reports a crime, the frontend automatically categorizes the priority based on keywords (AI triage) and submits the report. Responders process it and updates are visible to the citizen.

```mermaid
sequenceDiagram
    participant Citizen
    participant Frontend
    participant Backend
    participant DB as MongoDB
    participant Police

    Citizen->>Frontend: Fill Report Form (Desc, Type, Area, File)
    Frontend->>Frontend: Run AI Triage on Description (Low, Med, High)
    Frontend->>Backend: POST /api/reports (FormData)
    Backend->>Backend: Process Evidence (Multer)
    Backend->>DB: Save Report & Generate Notification for Police
    Backend-->>Frontend: Return Success (Ref ID)
    
    %% Police Action
    Police->>Frontend: View Incident Queue (Auto-refreshed)
    Frontend->>Backend: GET /api/reports
    Backend->>DB: Fetch Reports
    DB-->>Backend: Return List
    Backend-->>Frontend: Render Dashboard Table
    Police->>Frontend: Update Status (e.g., "Investigating")
    Frontend->>Backend: PUT /api/reports/:id
    Backend->>DB: Update Status & Notify Citizen
    Backend-->>Frontend: Success
```

### C. Emergency SOS Alert Workflow

Citizens can trigger a one-tap SOS that dispatches an alert immediately to the Police Dashboard.

```mermaid
flowchart TD
    Citizen((Citizen)) -->|Clicks SOS Button| TriggerSOS[Trigger Alert]
    TriggerSOS -->|Capture Location & Details| POSTAlert[POST /api/alerts]
    POSTAlert --> SaveDB[(Save Alert to DB)]
    SaveDB --> Notify[Create Notification for Police]
    
    Notify --> PoliceView[Police Control Room Dashboard]
    PoliceView -->|Live Alert Card Appears| PoliceAction[Police dispatches response]
```

### D. Direct Messaging Workflow

A built-in chat mechanism allows Citizens and Police officers to exchange messages without leaving the platform.

```mermaid
sequenceDiagram
    participant Sender (Citizen/Police)
    participant API as Backend API
    participant DB as MongoDB
    participant Receiver (Police/Citizen)

    Sender->>API: POST /api/messages
    API->>DB: Save Message Document
    API-->>Sender: 201 Created
    
    note over Receiver, API: Receiver UI polls/fetches inbox
    Receiver->>API: GET /api/messages
    API->>DB: Retrieve Conversation
    DB-->>API: Message Array
    API-->>Receiver: Update Inbox UI
```
