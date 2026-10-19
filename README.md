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
JWT_SECRET=your_long_random_secret
```

Use the exact variable names expected by your application. Replace the example values with your own configuration. Never commit real credentials or secrets.

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

Keep the backend running while using the frontend. Ensure the frontend API configuration points to the correct backend URL.

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
