## 3. Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Running the App

You need **two terminals** running simultaneously:

| Terminal | Command |
|----------|---------|
| 1 | `cd backend && npm run dev` |
| 2 | `cd frontend && npm run dev` |

Then open `http://localhost:3000` in your browser.

---

## Default Login

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `<password>` |

Create teacher and student accounts from the Admin portal after logging in.

---

## Roles & Portals

| Role | Landing page | What they can do |
|------|-------------|-----------------|
| **Admin** | `/admin` | Create/edit/disable all users |
| **Teacher** | `/teacher` | Manage groups, students, tests; grade attempts |
| **Student** | `/student` | View assigned tests, take tests, see results |

---

## Features

### Test Types
- **Multiple Choice** — single or multi-select, with optional images on questions and options
- **Free Text** — short answer with keyword-based auto-grading + teacher override
- **Drag & Drop** — reorder items, auto-graded on exact match

### Test Settings (per test)
- Time limit (optional countdown timer)
- Attempts allowed (default 1)
- Shuffle questions and answers per attempt (on by default, deterministic per seed)
- Show grade on completion
- Show correct answers on completion
- Allow back navigation between questions

### Teacher Workflow
1. Create a test with a title (+ optional image)
2. Add questions of any type, set points
3. Publish the test
4. Assign to a group or individual students
5. Review submissions — auto-graded immediately, free-text flagged for review
6. Edit scores and add feedback, finalize grade

### Student Workflow
1. Log in → see assigned tests on dashboard
2. Start test → questions appear one at a time in randomized order
3. Submit → see score (if enabled by teacher)

---

## Free-Text Auto-Grading

When creating a free-text question, the teacher can set:
- **Keywords** (comma-separated) — words that must appear in the answer
- **Min keywords needed** — how many keywords must match for full/partial credit
- **Sample answer** — reference for the teacher during manual review

Auto-scoring awards partial credit proportionally (`matched / total * points`). The teacher can always override the score and add per-question feedback.

---

## Project Structure

```
frontend/
   src/
   ├── api/client.js       # Axios + auth interceptor
   ├── context/AuthContext.jsx
   ├── components/         # Navbar, Modal, ProtectedRoute
   └── pages/
   │       ├── Login.jsx
   │       ├── admin/
   │       ├── teacher/        # Dashboard, Groups, Students, Tests, Assign, Results, Review
   │       └── student/        # Dashboard, TakeTest, Result
   ├── vite.config.js
   └── package.json
```
