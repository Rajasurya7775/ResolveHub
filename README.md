# ResolveHub - Incident & Issue Management System

ResolveHub is a modern, responsive web console for manufacturing operations, factory plants, and technical support teams. It provides a fixed-viewport operational dashboard for Supporters and Developers to report, triage, track, and collaborate on production incidents.

---

## Tech Stack

* **Frontend:** React 18 (TypeScript), Vite
* **Styling:** Bootstrap 5.3, Bootstrap Icons, custom responsive design system
* **Routing:** React Router DOM v6
* **State Management:** React Context API with persistent `localStorage` synchronization
* **Data Visualization:** Lightweight, zero-dependency inline SVG charts (7-day trend trajectory & resolution histogram)

---

## Operational Shift Rules

The platform automatically classifies incident reports into plant operational shifts based on local factory time:

| Shift | Operating Hours | Description |
| :--- | :--- | :--- |
| **Shift A** | `06:15 AM – 02:15 PM` | Morning production shift |
| **Shift B** | `02:15 PM – 10:15 PM` | Afternoon / evening shift |
| **Shift C** | `10:15 PM – 06:15 AM` | Night shift |

---

## Key Features

1. **Role-Based Authentication & Sign-Up:**
   * **Support:** Plant incident reporting and triage without requiring role-type classification.
   * **Developer:** Bug fixing and technical diagnostics with role-type specializations (Frontend, Backend, Database, Others).
2. **Operational Dashboard (`/home`):**
   * Personalized welcome banner with employee ID and session status.
   * Key Performance Indicators (KPIs): Total Logged, Active/Resolved ratio, In-Progress count, and Open tickets.
   * Two zero-dependency SVG charts: 7-day incident volume vs resolution velocity, and resolution duration distribution histogram.
3. **Issue Reporting (`/issues/new` & Modal):**
   * Auto-shift detection with override option.
   * Mandatory validation on Title, Description, and Occurrence Time.
   * Auto-assignment of sequential IDs (`ISS-1001`+).
4. **Ticket Tracking & 6-Parameter Filtering (`/issues/my`):**
   * Filter by Issue ID/Title, Project, Issue Category, Date, Shift, and Status.
   * Strict deletion safety (only `Open` status tickets may be deleted).
   * One-click **Export to CSV** for shift handovers.
5. **Historical Archive & RCA (`/issues/previous`):**
   * Archive of all resolved issues with Root Cause Analysis (RCA) records and developer triage logs.
   * Historical CSV export.
6. **2-Way Discussion Threads:**
   * Embedded live chat on ticket details allowing Supporters and Developers to coordinate in real time.

---

## Directory Structure

```
src/
├── components/
│   ├── auth/          # SVG avatars & login hero graphics
│   ├── common/        # Brand logo, shift & status badges
│   ├── dashboard/     # Custom SVG trend & histogram charts
│   ├── issues/        # Issue reporting modal
│   └── layout/        # Top navbar, dark navy sidebar, dashboard layout
├── context/
│   ├── AuthContext.tsx    # User session, login, signup & profile state
│   └── IssueContext.tsx   # Issue store, discussion threads, CRUD logic
├── data/
│   ├── mockIssues.ts      # Seeded manufacturing incidents
│   └── mockUsers.ts       # Pre-configured demo accounts
├── pages/
│   ├── auth/          # Login and Sign-Up pages
│   ├── dashboard/     # Supporter console home
│   ├── developer/     # Developer console
│   ├── issues/        # Issue Form, My Issues, Previous Issues, Details Modal
│   └── profile/       # User profile & contact management
├── types/             # TypeScript definitions for Users and Issues
└── utils/             # Shift calculation, date formatting & CSV export
```

---

## Getting Started

### Prerequisites
* Node.js 18+
* npm or pnpm

### Installation & Run
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run TypeScript compile & production build
npm run build

# Preview production build
npm run preview
```

---

## Demo Accounts

| Role | Employee ID | Email | Password |
| :--- | :--- | :--- | :--- |
| **Support** | `EMP101` | `surya@resolvehub.com` | `password123` |
| **Developer** | `EMP205` | `arun@resolvehub.com` | `password123` |
