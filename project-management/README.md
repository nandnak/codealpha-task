# Nexora — Collaborative Project Management Tool

> **Task 3:** Build a collaborative project management tool similar to Trello or Asana, featuring full-stack authentication, group projects, Kanban boards, task cards, task assignment, rich comments, and real-time WebSocket updates and notifications.

---

## 🚀 Key Features

### 1. 🔐 Full-Stack Authentication & User Management
- Secure user registration and sign-in with **bcrypt** password hashing and **JWT** (JSON Web Tokens).
- User profile management with display name, bio, avatar selection/URL, and password update.
- Instant user search by name, `@username`, or email for easy team collaboration.

### 2. 📁 Group Projects
- Create group projects with title, description, and team milestone tracking.
- Invite members to group projects with real-time user search.
- Role-based permissions: Project owners can manage members and project settings; team members can contribute to boards and leave projects.
- Visual project completion progress bars (% of completed tasks) and member avatar stacks.

### 3. 📋 Interactive Kanban Boards & Task Cards (Trello / Asana Style)
- 4 workflow stages:
  - 📝 **To Do**
  - ⚡ **In Progress**
  - 🔍 **In Review**
  - ✅ **Completed**
- **HTML5 Drag-and-Drop:** Smoothly drag task cards between workflow columns with instant optimistic UI update and real-time team synchronization.
- **Dual Views:** Switch seamlessly between **Kanban Board View** and **List / Table View**.
- **Filters:** Real-time search by task title or description, filter by Assignee, or filter by Priority (**Low**, **Medium**, **High**, **Urgent**).

### 4. 👤 Task Assignment & Due Dates
- Assign tasks to any project member with visual avatar chips.
- Due date tracking with smart indicators:
  - ⚠️ **Overdue** highlighting for past-due tasks.
  - ⏳ **Due soon** highlighting for tasks due within 48 hours.

### 5. 💬 Comments & In-Task Communication
- Full-featured task details modal with rich threaded discussion.
- Instant comment posting and deletion of own comments.
- **@username Mentions:** Automatically detects `@username` in comment text and sends high-priority notifications to mentioned teammates.

### 6. ⚡ Bonus: Real-Time WebSockets & Push Notifications
- Powered by **Socket.IO** with scoped project and user rooms (`project_${id}` and `user_${id}`).
- **Zero-refresh synchronization:** When any teammate creates, edits, moves, or deletes a task, or posts a comment, all active team members' screens update in real time.
- **Push Notification Center:** Header bell icon with live unread counter and interactive dropdown panel.
- Instant animated toast notifications for assignments, status updates, and mentions.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB & Mongoose ORM (configured with MongoDB Atlas)
- **Real-Time Engine:** Socket.IO (WebSockets)
- **Frontend:** Modern Semantic HTML5, CSS3 Custom Properties (Design System & responsive layout), Vanilla ES6+ JavaScript
- **Security:** JSON Web Tokens (JWT), bcryptjs password hashing, input sanitization

---

## 📦 Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) installed.

### 2. Installation
Clone or navigate to the project directory:
```bash
cd "c:\Users\nanda\OneDrive\Desktop\codealpha task\project-management"
npm install
```

### 3. Configuration
The `.env` file is already configured with your MongoDB Atlas database URI:
```env
PORT=5000
MONGODB_URI=mongodb+srv://nandananandhukr_db_user:nBadR60eHu0tg766@cluster0.5su0esi.mongodb.net/?appName=Cluster0
JWT_SECRET=dev_jwt_secret_change_me_please_use_a_long_random_value
```

### 4. Start the Application
Run the server:
```bash
npm start
```
Or with auto-restart on changes:
```bash
npm run dev
```

### 5. Access the Web App
Open your browser and navigate to:
**[http://localhost:5000](http://localhost:5000)**

---

## 📂 Project Structure

```
project-management/
├── middleware/
│   ├── authMiddleware.js        # JWT authentication & protect middleware
│   └── errorMiddleware.js       # Centralized 404 & error handling
├── models/
│   ├── Comment.js               # Task comment schema
│   ├── Notification.js          # Notification schema
│   ├── Project.js               # Group project & membership schema
│   ├── Task.js                  # Kanban task schema
│   └── User.js                  # User credentials & profile schema
├── public/                      # Modern Frontend Client
│   ├── css/
│   │   └── style.css            # Modern design system & responsive styling
│   ├── js/
│   │   ├── api.js               # Fetch API wrapper with token handling
│   │   ├── auth.js              # Auth check & redirect helpers
│   │   ├── dashboard.js         # Dashboard metrics & projects view logic
│   │   ├── login.js             # Login handler
│   │   ├── notifications.js     # App shell & notification manager
│   │   ├── profile.js           # Profile & account settings handler
│   │   ├── project.js           # Flagship Kanban board, drag & drop, sockets
│   │   ├── register.js          # Registration handler
│   │   ├── socket.js            # Socket.IO client setup
│   │   └── ui.js                # UI helpers (avatars, badges, toasts, etc.)
│   ├── dashboard.html           # Main dashboard page
│   ├── index.html               # Landing & welcome page
│   ├── login.html               # Sign in page
│   ├── profile.html             # Profile & settings page
│   ├── project.html             # Trello / Asana Kanban board page
│   └── register.html            # Registration page
├── routes/
│   ├── authRoutes.js            # /api/auth (register, login, me)
│   ├── commentDeleteRoutes.js   # /api/comments/:id (delete)
│   ├── commentRoutes.js         # /api/tasks/:taskId/comments
│   ├── notificationRoutes.js    # /api/notifications
│   ├── projectRoutes.js         # /api/projects (CRUD, members, tasks)
│   ├── taskRoutes.js            # /api/tasks (CRUD, mine)
│   └── userRoutes.js            # /api/users (search, profile)
├── sockets/
│   └── socketHandler.js         # Socket.IO rooms & real-time event routing
├── utils/
│   ├── ids.js                   # ObjectId validation
│   ├── notify.js                # Push notification helpers
│   └── projectAccess.js         # Access control & membership checks
├── .env                         # Environment variables
├── package.json                 # Dependencies & scripts
└── server.js                    # Express + Socket.IO server entrypoint
```
