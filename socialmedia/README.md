# SocialConnect – Social Media Platform

A complete, beginner-friendly social media platform built with Node.js, Express, MongoDB Atlas, and vanilla HTML/CSS/JavaScript.

## Project Description

SocialConnect lets users register, log in, create posts, like and comment, follow other users, search for people, and manage their profiles. All data is stored in MongoDB Atlas with JWT-based authentication.

## Features

- User registration with validation and password hashing
- User login (username or email) with JWT
- User logout (clears client token)
- View and edit profile (username, bio, profile picture)
- Create, edit, and delete posts
- Home feed with real-time UI updates
- Like / unlike posts
- Add and delete comments
- Follow / unfollow users
- Followers and following counts & lists
- User search by username or email
- Responsive modern UI (desktop, tablet, mobile)
- Protected API routes with ownership checks
- Toast notifications, loading states, and confirmation dialogs

## Technologies Used

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | HTML5, CSS3, Vanilla JavaScript     |
| Backend      | Node.js, Express.js                 |
| Database     | MongoDB Atlas, Mongoose             |
| Auth         | JWT, bcryptjs                       |
| Other        | dotenv, cors                        |

## Project Structure

```
socialmedia/
├── server.js
├── package.json
├── .env
├── .env.example
├── .gitignore
├── README.md
├── models/
│   ├── User.js
│   ├── Post.js
│   └── Comment.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── postRoutes.js
│   └── commentRoutes.js
├── middleware/
│   └── authMiddleware.js
└── public/
    ├── index.html
    ├── login.html
    ├── register.html
    ├── profile.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        ├── auth.js
        ├── feed.js
        ├── profile.js
        └── post.js
```

## Requirements

- Node.js (v16 or higher recommended)
- npm
- A MongoDB Atlas account and cluster

## MongoDB Atlas Setup

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up / log in.
2. Create a free cluster.
3. Create a database user (username + password).
4. Under **Network Access**, allow your IP (or `0.0.0.0/0` for development).
5. Click **Connect** → **Connect your application** and copy the connection string.
6. Replace `<password>` with your database user password.
7. Optionally add a database name in the path, e.g. `...mongodb.net/socialconnect?retryWrites=true&w=majority`

## Environment Variables

Create a `.env` file in the project root (you can copy from `.env.example`):

```
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
```

Example (replace with your real values):

```
PORT=5000
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/socialconnect?retryWrites=true&w=majority
JWT_SECRET=a_long_random_secret_string_here
```

**Never commit your real `.env` file.** It is listed in `.gitignore`.

## Installation

```bash
npm install
```

## Running the Application

Production / normal start:

```bash
npm start
```

Development (auto-restart with nodemon):

```bash
npm run dev
```

Optional API self-test (uses an in-memory MongoDB; does not need Atlas):

```bash
npm test
```

Then open your browser at:

**http://localhost:5000**

You will be redirected to the login page if you are not authenticated.

## API Routes

### Health

| Method | Endpoint       | Auth | Description        |
|--------|----------------|------|--------------------|
| GET    | /api/health    | No   | Server health check|

### Auth

| Method | Endpoint            | Auth | Description              |
|--------|---------------------|------|--------------------------|
| POST   | /api/auth/register  | No   | Register a new user      |
| POST   | /api/auth/login     | No   | Log in and get JWT       |
| GET    | /api/auth/me        | Yes  | Get current user         |

### Users

| Method | Endpoint                    | Auth | Description           |
|--------|-----------------------------|------|-----------------------|
| GET    | /api/users/search?q=        | Yes  | Search users          |
| GET    | /api/users/:id              | Yes  | Get user profile      |
| PUT    | /api/users/profile          | Yes  | Update own profile    |
| POST   | /api/users/:id/follow       | Yes  | Follow a user         |
| POST   | /api/users/:id/unfollow     | Yes  | Unfollow a user       |
| GET    | /api/users/:id/followers    | Yes  | List followers        |
| GET    | /api/users/:id/following    | Yes  | List following        |

### Posts

| Method | Endpoint                 | Auth | Description        |
|--------|--------------------------|------|--------------------|
| GET    | /api/posts               | Yes  | Get all posts      |
| GET    | /api/posts/:id           | Yes  | Get single post    |
| POST   | /api/posts               | Yes  | Create a post      |
| PUT    | /api/posts/:id           | Yes  | Edit own post      |
| DELETE | /api/posts/:id           | Yes  | Delete own post    |
| POST   | /api/posts/:id/like      | Yes  | Like a post        |
| POST   | /api/posts/:id/unlike    | Yes  | Unlike a post      |

### Comments

| Method | Endpoint                      | Auth | Description           |
|--------|-------------------------------|------|-----------------------|
| GET    | /api/posts/:id/comments       | Yes  | Get post comments     |
| POST   | /api/posts/:id/comments       | Yes  | Add a comment         |
| DELETE | /api/comments/:id             | Yes  | Delete own comment    |

## Authentication Information

- Passwords are hashed with **bcryptjs** before storage.
- On login/register, the server returns a **JWT** valid for 7 days.
- The frontend stores the token in `localStorage` and sends it as:
  `Authorization: Bearer <token>`
- Protected routes reject missing, invalid, or expired tokens.
- Ownership is checked before editing/deleting posts or comments.
- Passwords are never returned in API responses.

## Troubleshooting

**Server won't start – "Please set a valid MONGODB_URI"**  
→ Copy `.env.example` to `.env` and paste your real Atlas connection string.

**MongoDB connection error**  
→ Check username/password in the URI, IP allowlist in Atlas Network Access, and that the cluster is running.

**"Invalid credentials" on login**  
→ Confirm you registered first and are using the correct username/email and password.

**"Not authorized" / redirected to login**  
→ Your JWT may be missing or expired. Log in again.

**Port already in use**  
→ Change `PORT` in `.env` to another value (e.g. `5001`).

**Images not showing**  
→ Use a valid public image URL (or leave blank). Broken URLs are hidden automatically.

## License

MIT
