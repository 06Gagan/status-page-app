# Status Page Server

A Node.js backend for the Status Page application that provides real-time service status updates and incident management.

## Features

- User authentication and authorization
- Organization management
- Service status monitoring
- Incident management
- Real-time updates using Socket.IO
- Role-based access control
- Input validation
- Error handling
- Logging
- Security features

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

5. Create the database:
   ```sql
   CREATE DATABASE status_page_db;
   ```

6. Initialize the database:
   ```bash
   npm run dev
   ```

## Development

Start the development server:
```bash
npm run dev
```

## Production

Start the production server:
```bash
npm start
```

## API Documentation

### Authentication

- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user

### Organizations

- GET `/api/organizations` - Get all organizations
- POST `/api/organizations` - Create organization
- GET `/api/organizations/:id` - Get organization
- PUT `/api/organizations/:id` - Update organization
- DELETE `/api/organizations/:id` - Delete organization

### Services

- GET `/api/services` - Get all services
- POST `/api/services` - Create service
- GET `/api/services/:id` - Get service
- PUT `/api/services/:id` - Update service
- DELETE `/api/services/:id` - Delete service

### Incidents

- GET `/api/incidents` - Get all incidents
- POST `/api/incidents` - Create incident
- GET `/api/incidents/:id` - Get incident
- PUT `/api/incidents/:id` - Update incident
- DELETE `/api/incidents/:id` - Delete incident

## Testing

Run tests:
```bash
npm test
```

## Linting

Run linter:
```bash
npm run lint
```

## Formatting

Format code:
```bash
npm run format
```

## License

ISC 