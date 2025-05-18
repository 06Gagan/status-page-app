# Status Page App

A simple, full-stack status page application. It helps teams track service status, incidents, and communicate updates to users. Built with Node.js, Express, PostgreSQL, and React.

## Project Structure

```
status-page-app/
├── client/      # React frontend
├── server/      # Express backend
├── package.json # Project-level scripts
```

### Backend (server)

- **Entry:** `server/index.js`
- **API:** RESTful endpoints under `/api/v1/`
- **Models:** User, Team, Organization, Service, Incident
- **Controllers:** Business logic for each resource
- **Middleware:** Auth, validation, error handling
- **Config:** Database and logger setup
- **Websockets:** Real-time updates with Socket.IO
- **Static:** Serves React build for production

### Frontend (client)

- **Entry:** `client/src/App.js`
- **Pages:** Dashboard, Services, Incidents, Teams, Profile, Public Status, Login, Register
- **Components:** Layout, PrivateRoute, and more
- **Contexts:** Auth and Socket state management
- **Theme:** MUI for UI and theming

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database (set up using pgAdmin or similar)

### Setup

1. **Clone the repo:**
   ```sh
   git clone <repo-url>
   cd status-page-app
   ```
2. **Install dependencies:**
   ```sh
   npm run install-all
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` in `server/` and fill in your DB and JWT settings.
   - Example:
     ```env
     DB_USER=youruser
     DB_PASSWORD=yourpassword
     DB_NAME=yourdb
     DB_HOST=localhost
     DB_PORT=5432
     JWT_SECRET=your_jwt_secret
     CORS_ORIGIN=http://localhost:3000
     ```
4. **Start the app (dev mode):**
   ```sh
   npm start
   ```
   - Runs both backend (on 5001) and frontend (on 3000).

### Build for Production

- Build frontend:
  ```sh
  npm run build
  ```
- Deploy backend (`server/`) to your preferred platform (e.g., Google Cloud Run).

## Database

- Uses PostgreSQL. Connect using the `pg` module.

## API Overview

- **Auth:** `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/profile`
- **Users, Teams, Organizations, Services, Incidents:** RESTful endpoints under `/api/v1/`

## Frontend

- React app with MUI for UI
- Responsive and works across devices
- State managed with React Context

## Development approach 

- Keep code clean and simple
- Separate frontend and backend logic

## License

MIT
