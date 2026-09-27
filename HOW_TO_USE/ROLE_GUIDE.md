# BhuSetu Role & Access Guide

This document defines the strict Role-Based Access Control (RBAC) and Multi-Tenancy isolation rules implemented within the BhuSetu (National Land Acquisition & Management Platform).

Access to data and actions is determined by a combination of a user's **Role** (what they can do) and their **Geographical Scope** (where they can do it). 

---

## 🌍 National / Global Roles
These roles have unrestricted geographic access. They oversee the entire country and do not require a `stateCode` or `districtCode`.

### 1. `admin`
- **Geographic Scope**: Global
- **Permissions**: Full system access.
- **Responsibilities**: 
  - Manage system-wide settings, user provisioning, and configuration.
  - Can bypass state machines and workflow constraints if a critical correction is needed.
  - Can create base infrastructure and assign major projects to states.

### 2. `ministry_officer`
- **Geographic Scope**: Global
- **Permissions**: Broad oversight and high-level reporting.
- **Responsibilities**:
  - View all national metrics, projects, and final approvals at the Ministry of Rural Development level.
  - Access the National Dashboard to monitor state-by-state performance and acquisition SLAs.

---

## 🏛️ State-Level Roles
These roles are strictly bound to their assigned `stateCode`. They cannot access or see data belonging to other states.

### 3. `state_officer`
- **Geographic Scope**: State-wide (e.g., all districts in Gujarat `GJ`)
- **Permissions**: Project oversight within the state.
- **Responsibilities**:
  - Oversee all projects within their specific state.
  - View aggregate dashboards across all districts in that state.
  - Intervene or reassign workflows if a district is falling behind on statutory timelines.

---

## 📍 District-Level Roles
These roles are strictly bound to their assigned `stateCode` AND `districtCode`. They are completely isolated from other districts. *(Note: Missing location codes instantly blocks access).*

### 4. `district_collector` (Approving Authority)
- **Geographic Scope**: District-wide only (e.g., Surat `SRT`)
- **Permissions**: Project approval, Award generation.
- **Responsibilities**:
  - The highest authority at the district level.
  - Review and approve land acquisition proposals, Social Impact Assessment (SIA) reports.
  - Formally generate, sign, and approve monetary Awards and R&R (Rehabilitation & Resettlement) packages.
  - Authorize the issuance of statutory notifications (Section 11, Section 19).

### 5. `project_manager` (Operational Lead)
- **Geographic Scope**: District-wide only
- **Permissions**: Edit drafts, configure R&R, manage workflows.
- **Responsibilities**:
  - Handle the heavy lifting of the land acquisition configuration.
  - Create draft configurations for Compensation calculations.
  - Prepare Rehabilitation & Resettlement lists.
  - Move workflows through their lifecycle stages and assign tasks to field officers.

### 6. `field_officer` (Ground Execution)
- **Geographic Scope**: District-wide only
- **Permissions**: Upload GIS data, manage land parcels.
- **Responsibilities**:
  - Manage ground data collection.
  - Enter and maintain land parcels, tagging them with 14-digit ULPINs (Bhu-Aadhaar).
  - Upload GIS boundary files and verify physical ground limits.
  - Conduct on-ground surveys and upload preliminary documents.

### 7. `viewer`
- **Geographic Scope**: District-wide only
- **Permissions**: Read-only access.
- **Responsibilities**:
  - Inspect project timelines, maps, and documents within their district.
  - Cannot modify any data, upload files, or trigger workflow state changes.

---

## 🧑‍🌾 Public Access
### 8. `Citizen / Landowner`
- **Geographic Scope**: N/A (Public)
- **Permissions**: Unauthenticated read-only tracking.
- **Responsibilities**:
  - Access the public Citizen Tracking Portal.
  - Input their 14-digit ULPIN to view the public-facing status of their specific land parcel.
  - Check acquisition phase, declared compensation, and R&R benefits without seeing sensitive internal administrative data.
