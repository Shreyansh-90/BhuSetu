# Land Acquisition Process & User Manual

Welcome to the BhuSetu User Manual. This document explains the end-to-end digital land acquisition lifecycle under the RFCTLARR Act 2013, mapping out exactly how different officers use the portal to complete an acquisition project.

---

## Phase 1: Project Initiation & Setup

**Actors Involved:** `admin`, `state_officer`

1. **Creating the Project Profile**: 
   - An administrator or state officer logs into the portal and clicks **"+ New Proposal"**.
   - They enter the core details: Project Name, Requiring Body (e.g., Highways Department), Acquiring Body, and the estimated area required.
   - The project is assigned to a specific District (e.g., Surat).
2. **Assigning the Team**: 
   - The system automatically places the project in the workspace of the relevant `district_collector` and `project_manager` based on the district code.

---

## Phase 2: Ground Execution & GIS Mapping

**Actors Involved:** `project_manager`, `field_officer`

1. **Mapping the Boundaries**:
   - The `field_officer` logs in, navigates to the **Spatial & Parcels** tab of the project, and uploads the verified PostGIS/Shapefile boundaries of the project.
2. **Adding Land Parcels**:
   - The `field_officer` manually adds or bulk-imports the specific land parcels falling under the project boundaries.
   - **Crucial Step**: Each parcel is assigned a 14-digit **ULPIN (Bhu-Aadhaar)**. This unique identifier is critical as it links the parcel to the public citizen tracking portal.
3. **Drafting Initial Timelines**:
   - The `project_manager` sets up the preliminary milestones (e.g., Social Impact Assessment dates) in the **Activity Timeline** tab.

---

## Phase 3: Statutory Notifications & SIA

**Actors Involved:** `project_manager`, `district_collector`

1. **Social Impact Assessment (SIA)**:
   - External SIA reports are uploaded to the **Documents** tab by the `project_manager`.
2. **Section 11 (Preliminary Notification)**:
   - Once the SIA is approved, the `district_collector` formally marks the "Preliminary Notification" milestone as complete. 
   - The system state machine updates the project status, automatically triggering alerts to the state dashboard.

---

## Phase 4: Compensation & R&R Drafting

**Actors Involved:** `project_manager`

1. **Calculating Compensation**:
   - The `project_manager` goes to the **Financials & R&R** tab.
   - For each parcel, they input the Base Market Value, Multiplication Factor, and Solatium (as mandated by the Act). The system strictly calculates the Final Award Amount.
2. **Drafting R&R Packages**:
   - The `project_manager` lists the affected families and configures their Rehabilitation and Resettlement packages (e.g., housing allowance, employment assistance).
3. **Submission for Review**:
   - The manager locks the drafts and assigns a workflow task to the District Collector for final approval.

---

## Phase 5: Final Award & Disbursal

**Actors Involved:** `district_collector`

1. **Review & Approve**:
   - The `district_collector` reviews the financial ledger in the workspace.
   - If accurate, they click "Approve" on the compensations.
2. **Section 19 & Section 21**:
   - The Collector updates the milestones for Final Declarations and Notices to landowners.
3. **Generating the Cryptographic Award Document**:
   - In the **Documents** tab, the system generates the Final Award PDF. 
   - The system calculates a secure SHA-256 hash of the document to prevent future tampering, locking the financials permanently.

---

## Phase 6: Citizen Transparency

**Actors Involved:** `Citizen / Landowner`

1. **Checking Status**:
   - The landowner visits the public unauthenticated portal (`/citizen/track`).
   - They enter their 14-digit ULPIN (e.g., `11112222333300`).
2. **Viewing Data**:
   - The system fetches real-time data from the live database.
   - The citizen can securely view the current phase of the acquisition, the approved compensation amount, and R&R benefits without needing to visit a government office. Internal administrative notes and officer IDs are safely hidden from this view.
