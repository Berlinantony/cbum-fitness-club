# CBUM Fitness Club — Gym Membership Management System

A full-stack gym membership management web application built using the MERN stack. It provides an interface for administrators to manage members, memberships, and payment records, while members can view their own membership information.

## Features

### Authentication and Authorization
- User registration and login
- Password hashing using bcryptjs
- JWT-based authentication
- Role-based access for Admin and Member
- Protected backend routes

### Admin Dashboard
- View registered members
- Edit member details
- Delete member records
- Assign memberships to members
- Track membership expiry dates
- View payment history
- Monitor revenue and pending payment totals

### Member Dashboard
- View membership details
- Check membership expiry
- Access relevant account information

## Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend user interface |
| Vite | Frontend development and build tool |
| Node.js | JavaScript runtime |
| Express.js | Backend API |
| MongoDB | Database |
| Mongoose | MongoDB object modeling |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Git and GitHub | Version control and source hosting |

## Project Structure

```text
gym-membership-management-system/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── .gitignore
└── README.md
```

*The structure above is illustrative; the actual folders and files may differ.*

## Prerequisites

Install the following:

- Node.js and npm
- MongoDB or access to a MongoDB database
- Git

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Berlinantony/cbum-fitness-club.git
cd cbum-fitness-club
```

### 2. Configure and start the backend

Open a terminal in the project directory and run:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder and configure the environment variables required by your backend code.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
MONGO_DB_NAME=gym_membership_db
JWT_SECRET=your_long_random_secret
```

The backend defaults to the `gym_membership_db` database if `MONGO_DB_NAME` is omitted. Replace the example values with your own configuration. Never commit real credentials or secrets.

Start the backend using a script defined in `backend/package.json`. For example, if the project defines a `start` script:

```bash
npm start
```

### 3. Configure and start the frontend

Open a second terminal at the project root and run:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

The frontend uses `VITE_API_URL` as the backend base URL. For local development, copy `frontend/.env.example` to `frontend/.env.local`; the example points to `http://localhost:5000`. Keep the backend running while using the frontend.

### Deploy to Render

1. Deploy `backend` as a Render Web Service with build command `npm install` and start command `node server.js`. Set `MONGO_URI`, `MONGO_DB_NAME`, and `JWT_SECRET` in the service's environment settings.
2. Deploy `frontend` as a Render Static Site with build command `npm install && npm run build` and publish directory `dist`.
3. In the frontend Static Site's environment settings, add `VITE_API_URL` with the full backend service URL, for example `https://your-backend.onrender.com` (no trailing slash).
4. Trigger a new frontend deployment after setting or changing `VITE_API_URL`. Vite embeds this value during the build, so changing the variable without rebuilding does not update the deployed site.

### Deploy to Vercel

1. Import the repository into Vercel and set the project's **Root Directory** to `.` (the repository root), not `frontend` or `backend`, so Vercel reads the root `vercel.json`.
2. The root `vercel.json` configures the `backend` Express service and the `frontend` Vite service under one project and domain. Requests to `/api/*` are routed to the backend; all other paths are routed to the frontend.
3. Set `MONGO_URI`, `MONGO_DB_NAME`, and `JWT_SECRET` in Vercel's environment settings for the backend service. The MongoDB Atlas cluster must allow connections from the deployed backend.
4. Deploy the project. The frontend uses same-origin `/api` requests in production, so `VITE_API_URL` should not be set for this Vercel multi-service deployment.

## Testing

The developer has reported successful API checks for:
- Membership assignment and expiry
- Revenue and pending-payment calculations
- Member editing and deletion
- Payment-history persistence

Run additional end-to-end tests to verify registration, login, role-based permissions, and frontend-to-backend integration.

## Security

- Keep `.env` files out of version control.
- Never publish database passwords or JWT secrets.
- Use strong, unique secrets for authentication.
- Enforce authorization checks on protected backend endpoints.

## Future Improvements

- Add automated tests
- Improve validation and error handling
- Add membership renewal reminders
- Deploy the application
- Include application screenshots and a live demo link

## Author

**Berlin Antony**

GitHub: [Berlinantony](https://github.com/Berlinantony)

## License

No license has been specified yet.
