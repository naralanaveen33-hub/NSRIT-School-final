# Stitch Audit & Consolidation Report

This document contains the complete consolidation plan, mapping reports, and file classifications of the Stitch-generated assets against the existing NSRITSchoolApp codebase.

---

## A. Parent ↔ Student Consolidation Report

The Parent portal behaves strictly as a **restricted view layer** of the primary `Student` data domain. Parent CRUD tables, duplicate parent services, and duplicate child metrics logic are avoided. Parent functionality consumes `Student` data as the single source of truth.

| Parent Component | Student Component (Source of Truth) | Action | Justification |
| :--- | :--- | :--- | :--- |
| `parent/DashboardScreen.jsx` | `students/StudentDetailsScreen.jsx` | **Retain & Consolidate** | The parent dashboard renders student metrics (attendance summary, fees due) fetched directly using [parentService.js](file:///d:/NSRITSchoolApp/src/services/parents/parentService.js) which queries student records. |
| `parent/AttendanceScreen.jsx` | `attendance/attendanceService.js` | **Retain & Consolidate** | Displays child attendance metrics sourced directly from the primary `Attendance` table (using `attendanceService.getAttendance`). |
| `parent/FeeLedgerScreen.jsx` | `fees/StudentFeeProfileScreen.jsx` | **Retain & Consolidate** | Displays student ledger records (concessions, term fees, receipt history) sourced directly from standard student fee tables. |
| `parent/ProfileScreen.jsx` | `students/StudentDetailsScreen.jsx` | **Retain & Consolidate** | Displays parent metadata and details of linked children sourced directly from student records. |
| `parent/StudentSelectorScreen.jsx` | `StudentSelector` component | **Retain** | Dropdown selection to swap active child scope in the parent portal. |
| `parent/NoticeBoardScreen.jsx` | **None** | **Retain Stub** | Out-of-scope stub for announcements; deferred for this build scope. |
| `parent/PaymentScreen.jsx` | **None** | **Retain Stub** | Out-of-scope stub for payment gateway; deferred for this build scope. |
| `parent/ReceiptScreen.jsx` | **None** | **Retain Stub** | Out-of-scope stub; deferred. |
| `parent/SuggestionScreen.jsx` | **None** | **Retain Stub** | Out-of-scope stub; deferred. |
| `parent/SuggestionStatusScreen.jsx` | **None** | **Retain Stub** | Out-of-scope stub; deferred. |

* **Service Layer**:
  - `src/services/parents/parentService.js` reads child data from the `students` table via standard GQL queries, applying parent security filters. It does not maintain duplicate services or duplicate CRUD logic.
* **Repositories**:
  - No `parentRepository.js` is created. All data access goes through the core Firebase Data Connect GraphQL layer.

---

## B. Teacher ↔ Teachers Consolidation Report

All teacher-related screens are consolidated into a **single teacher module** located under `src/screens/teachers/`. The legacy redundant `src/screens/teacher/` folder is marked for deletion.

| teacher/* (Legacy Source) | teachers/* (Target Destination) | Action | Justification |
| :--- | :--- | :--- | :--- |
| `teacher/TeacherDashboardScreen.jsx` | `teachers/TeacherDashboardScreen.jsx` | **Moved & Reused** | Consolidated dashboard screen for logged-in teachers. |
| `teacher/TakeAttendanceScreen.jsx` | `teachers/TakeAttendanceScreen.jsx` | **Moved & Reused** | Consolidated attendance marking screen. |
| `teacher/StudentsListScreen.jsx` | `teachers/StudentsListScreen.jsx` | **Moved & Reused** | Consolidated section student roster. |
| `teacher/HomeworkScreen.jsx` | `teachers/HomeworkScreen.jsx` | **Moved & Reused** | Deferred stub for class diary. |
| `teacher/CommunicationScreen.jsx` | `teachers/CommunicationScreen.jsx` | **Moved & Reused** | Deferred stub for announcements. |
| `teacher/SectionFeesScreen.jsx` | `teachers/SectionFeesScreen.jsx` | **Moved & Reused** | Fee collection summary. |
| `teacher/DashboardScreen.jsx` | **None** | **Deleted** | Redundant wrapper page. |
| `teacher/StudentProfileScreen.jsx` | `students/StudentDetailsScreen.jsx` | **Deleted** | Pointed navigation directly to the primary student details screen. |

---

## C. Coordinator ↔ Incharge Consolidation Report

Coordinator and Incharge represent the exact same business role.
* **Database Role/Permission**: Strictly maintain the `'COORDINATOR'` role in the database. No `Incharge` database role or entities will be generated.
* **Dashboard/Navigation**:
  - `CoordinatorNavigator.jsx` is the single authoritative navigator.
  - `coordinator/DashboardScreen.jsx` remains the single dashboard for this role.
  - Redundant mockups or screens referencing "Incharge" are ignored.

---

## D. Database Consolidation Report

All entity structures are consolidated to avoid duplication. The schema `schema.gql` remains the authoritative source of truth.

| Existing Table | Matching Stitch Model | Consolidation Rule |
| :--- | :--- | :--- |
| `User` | `User` | Stores credentials, user role (`MAIN_ADMIN`, `PRINCIPAL`, `TEACHER`, `STUDENT`, `COORDINATOR`, `PARENT`). |
| `Student` | `Student` | Single source of truth for student records (roll number, class, section, status). |
| `Parent` | `Parent` | Restricted strictly to contact info and relationship mapping (`parentId`). No duplicate student records. |
| `Teacher` | `Teacher` | Staff profile details, joins subjects. |
| `Coordinator` | `Coordinator` / `Incharge` | Single role representation. No "Incharge" tables are created. |

---

## E. Navigation Consolidation Report

The navigation system strictly enforces the single-navigator role architecture.
* `TeacherNavigator.jsx` is updated to load components exclusively from `src/screens/teachers/` and point student profile navigation to `src/screens/students/StudentProfileScreen` (which maps to `StudentDetailsScreen.jsx`).
* `ParentNavigator.jsx` serves as the restricted view tab navigator. It points profile and child cards to `StudentDetailsScreen.jsx` / `AttendanceScreen.jsx` without duplicate screens.
* `CoordinatorNavigator.jsx` handles wing management. No parallel navigators or parallel navigation stacks are generated.

---

## F. Safe Deletion List

List of folders, files, services, screens, and queries that are safe to delete or have been removed:

### Folders
* `src/screens/teacher/` (Redundant legacy folder; active screens moved to `src/screens/teachers/`) - **Deleted**
* `src/dataconnect-generated/react/` (Unused React SDK generator output) - **Deleted**
* `src/dataconnect-generated/.guides/` (Developer instruction guides) - **Deleted**

### Files
* `src/screens/teacher/DashboardScreen.jsx` - **Deleted**
* `src/screens/teacher/StudentProfileScreen.jsx` - **Deleted**
* `src/dataconnect-generated/README.md` - **Deleted**
* `src/dataconnect-generated/react/README.md` - **Deleted**
* `src/dataconnect-generated/.guides/config.json` - **Deleted**
* `src/dataconnect-generated/.guides/setup.md` - **Deleted**
* `src/dataconnect-generated/.guides/usage.md` - **Deleted**

### Services / Repositories
* No duplicate parent repositories or teacher repositories exist on disk. Re-exports in `src/services/` (`parentService.js` and `studentService.js`) are kept to prevent import breaks.

### Queries / Mutations
* No duplicate Stitch operations are generated or stored.
