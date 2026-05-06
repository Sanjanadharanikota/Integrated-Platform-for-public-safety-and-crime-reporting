# SafetyFirst - Crime Reporting & Public Safety Platform

SafetyFirst is a comprehensive, MERN-stack application designed to streamline crime reporting, facilitate emergency SOS alerts, and provide geospatial intelligence through a dynamic hotspot map. The platform features strict role-based access control to ensure citizens, police officers, and administrators have a tailored, secure workspace.

## Tech Stack

### Frontend
* **React 19** (Built with Vite for rapid development)
* **React Router v7** (For seamless page navigation)
* **React Leaflet** (For rendering the dynamic crime hotspot map)
* **Recharts** (For rendering status and category data visualizations)
* **Bootstrap 5** (For a mobile-first, responsive grid system)
* **Vanilla CSS** (Featuring a premium "Glassmorphism" design)

### Backend
* **Node.js & Express.js** (Fast, unopinionated backend web framework)
* **MongoDB & Mongoose** (NoSQL database for flexible data storage and ODM)
* **JSON Web Tokens (JWT)** (For secure, stateless authentication)
* **Bcrypt.js** (For robust password hashing)
* **Multer** (For handling multipart/form-data evidence file uploads)

### Security & Architecture
* **Role-Based Access Control (RBAC):** Distinct routing and permissions for `Citizen`, `Police`, and `Admin`.
* **HTTP-Only Cookies:** Used for storing JWTs securely to mitigate cross-site scripting (XSS) vulnerabilities.
* **RESTful API:** Clean API endpoint design for clear client-server communication.

## Key Features

1. **AI Enforcement & Triage:** Automatically scans incident descriptions for emergency keywords to detect high-risk reports.
2. **Safety Hotspot Map:** Live geospatial analysis grouping reports by area, with interactive markers scaling based on incident density.
3. **Role-Specific Dashboards:** 
    * *Citizens* manage their personal reports and alerts.
    * *Police* handle the live emergency queue and case management.
    * *Admins* govern overall user access.
4. **Emergency SOS Trigger:** A one-tap channel that dispatches live location coordinates to police dashboards.
5. **Secure Internal Messaging:** Allows direct follow-up communication between officers and citizens.

## Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (Running locally or via MongoDB Atlas)

### Backend Setup
1. Open a terminal and navigate to the `backend` directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file in the `backend` folder with the following variables:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   ```
4. Start the backend server: `npm run dev`

### Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`

The frontend will be available at `http://localhost:5173` (or the port specified by Vite), and the backend will run on `http://localhost:5000`.
