import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function seed() {
  try {
    const existing = await sql`SELECT count(*) FROM projects WHERE title IN ('Ahmedabad–Regional Mobility Corridor', 'North Gujarat Irrigation Expansion', 'Industrial Logistics Connectivity Project')`;
    if (parseInt(existing[0].count) > 0) {
      console.log("Demo data already seeded. Skipping to remain idempotent.");
      return;
    }

    const adminId = '40d6e780-6402-4409-9370-9689931bf37d';
    const managerId = '6bc675aa-f4cb-49a7-b6d1-c061a66aac41';
    const districtOrgId = '6f118314-5ce9-40f4-a81b-efcf1e516fdc';
    const stateOrgId = '1c0d0d10-4072-4b18-bf17-b8fc61b9bbf9';

    console.log("Starting seed transaction...");
    await sql.begin(async (tx) => {
      // 1. PROJECTS
      const p1 = await tx`
        INSERT INTO projects (id, title, description, status, category, state_code, district_code, requesting_org_id, acquiring_org_id, created_by, estimated_area_sqm)
        VALUES (gen_random_uuid(), 'Ahmedabad–Regional Mobility Corridor', 'Strategic corridor connecting Ahmedabad suburbs.', 'under_scrutiny', 'urgent', 'GJ', 'AHM', ${stateOrgId}, ${districtOrgId}, ${adminId}, 150000)
        RETURNING id;
      `;
      const p1Id = p1[0].id;

      const p2 = await tx`
        INSERT INTO projects (id, title, description, status, category, state_code, district_code, requesting_org_id, acquiring_org_id, created_by, estimated_area_sqm)
        VALUES (gen_random_uuid(), 'North Gujarat Irrigation Expansion', 'Canal expansion project to improve agricultural irrigation.', 'notification_issued', 'normal', 'GJ', 'BNS', ${stateOrgId}, ${districtOrgId}, ${managerId}, 500000)
        RETURNING id;
      `;
      const p2Id = p2[0].id;

      const p3 = await tx`
        INSERT INTO projects (id, title, description, status, category, state_code, district_code, requesting_org_id, acquiring_org_id, created_by, estimated_area_sqm)
        VALUES (gen_random_uuid(), 'Industrial Logistics Connectivity Project', 'Last mile connectivity for the upcoming industrial hub.', 'award_declared', 'normal', 'GJ', 'SRT', ${stateOrgId}, ${districtOrgId}, ${managerId}, 85000)
        RETURNING id;
      `;
      const p3Id = p3[0].id;

      // 2. PROJECT GEOMETRIES
      await tx`
        INSERT INTO project_geometries (project_id, geometry, source_dataset, verification_status)
        VALUES 
          (${p1Id}, ST_GeomFromText('POLYGON((72.57 23.02, 72.58 23.02, 72.58 23.03, 72.57 23.03, 72.57 23.02))', 4326), 'survey_2026', 'verified'),
          (${p2Id}, ST_GeomFromText('POLYGON((71.90 24.10, 71.95 24.10, 71.95 24.15, 71.90 24.15, 71.90 24.10))', 4326), 'survey_2026', 'verified'),
          (${p3Id}, ST_GeomFromText('POLYGON((72.82 21.17, 72.83 21.17, 72.83 21.18, 72.82 21.18, 72.82 21.17))', 4326), 'survey_2026', 'verified')
      `;

      // 3. PARCELS
      const parcels1 = await tx`
        INSERT INTO parcels (id, project_id, survey_number, district, state_code, parcel_type, area_sqm, owner_name)
        VALUES 
          (gen_random_uuid(), ${p1Id}, '101/1', 'AHM', 'GJ', 'private', 4000, 'Ramesh Patel'),
          (gen_random_uuid(), ${p1Id}, '101/2', 'AHM', 'GJ', 'private', 6000, 'Suresh Shah'),
          (gen_random_uuid(), ${p1Id}, '102', 'AHM', 'GJ', 'government', 2500, 'State Govt')
        RETURNING id;
      `;

      const parcels2 = await tx`
        INSERT INTO parcels (id, project_id, survey_number, district, state_code, parcel_type, area_sqm, owner_name)
        VALUES 
          (gen_random_uuid(), ${p2Id}, '45', 'BNS', 'GJ', 'private', 15000, 'Kamlesh Desai'),
          (gen_random_uuid(), ${p2Id}, '46', 'BNS', 'GJ', 'private', 20000, 'Mahesh Rajput')
        RETURNING id;
      `;

      const parcels3 = await tx`
        INSERT INTO parcels (id, project_id, survey_number, district, state_code, parcel_type, area_sqm, owner_name)
        VALUES 
          (gen_random_uuid(), ${p3Id}, '22', 'SRT', 'GJ', 'private', 8000, 'Dinesh Vaghani'),
          (gen_random_uuid(), ${p3Id}, '23', 'SRT', 'GJ', 'private', 12000, 'Paresh Patel')
        RETURNING id;
      `;

      // 4. PARCEL GEOMETRIES
      await tx`
        INSERT INTO parcel_geometries (parcel_id, geometry, verification_status)
        VALUES 
          (${parcels1[0].id}, ST_GeomFromText('POLYGON((72.571 23.021, 72.572 23.021, 72.572 23.022, 72.571 23.022, 72.571 23.021))', 4326), 'verified'),
          (${parcels1[1].id}, ST_GeomFromText('POLYGON((72.572 23.021, 72.573 23.021, 72.573 23.022, 72.572 23.022, 72.572 23.021))', 4326), 'verified'),
          (${parcels1[2].id}, ST_GeomFromText('POLYGON((72.573 23.021, 72.574 23.021, 72.574 23.022, 72.573 23.022, 72.573 23.021))', 4326), 'verified'),
          
          (${parcels2[0].id}, ST_GeomFromText('POLYGON((71.91 24.11, 71.92 24.11, 71.92 24.12, 71.91 24.12, 71.91 24.11))', 4326), 'verified'),
          (${parcels2[1].id}, ST_GeomFromText('POLYGON((71.92 24.11, 71.93 24.11, 71.93 24.12, 71.92 24.12, 71.92 24.11))', 4326), 'verified'),
          
          (${parcels3[0].id}, ST_GeomFromText('POLYGON((72.821 21.171, 72.822 21.171, 72.822 21.172, 72.821 21.172, 72.821 21.171))', 4326), 'verified'),
          (${parcels3[1].id}, ST_GeomFromText('POLYGON((72.822 21.171, 72.823 21.171, 72.823 21.172, 72.822 21.172, 72.822 21.171))', 4326), 'verified')
      `;

      // 5. COMPENSATIONS
      await tx`
        INSERT INTO compensations (project_id, parcel_id, base_market_value, multiplication_factor, solatium_amount, total_award_amount, status)
        VALUES
          (${p2Id}, ${parcels2[0].id}, 5000000, 1.5, 5000000, 12500000, 'calculated'),
          (${p2Id}, ${parcels2[1].id}, 7500000, 1.5, 7500000, 18750000, 'calculated'),
          (${p3Id}, ${parcels3[0].id}, 3000000, 2.0, 3000000, 9000000, 'approved'),
          (${p3Id}, ${parcels3[1].id}, 4000000, 2.0, 4000000, 12000000, 'approved')
      `;

      // 6. REHABILITATION
      await tx`
        INSERT INTO rehabilitation (project_id, parcel_id, family_head_name, category, status)
        VALUES
          (${p2Id}, ${parcels2[0].id}, 'Kamlesh Desai', 'landowner', 'pending'),
          (${p2Id}, ${parcels2[1].id}, 'Mahesh Rajput', 'landowner', 'pending'),
          (${p3Id}, ${parcels3[0].id}, 'Dinesh Vaghani', 'landowner', 'approved'),
          (${p3Id}, ${parcels3[1].id}, 'Paresh Patel', 'landowner', 'approved')
      `;

      // 7. MILESTONES
      await tx`
        INSERT INTO milestones (project_id, title, status, sort_order)
        VALUES 
          (${p1Id}, 'Preliminary Notification', 'in_progress', 1),
          (${p2Id}, 'Section 11 Notification', 'completed', 1),
          (${p2Id}, 'SIA Report Published', 'in_progress', 2),
          (${p3Id}, 'Section 19 Declaration', 'completed', 3),
          (${p3Id}, 'Section 21 Notices Issued', 'completed', 4),
          (${p3Id}, 'Final Award Declared', 'completed', 5)
      `;

      // 8. WORKFLOW TASKS
      await tx`
        INSERT INTO workflow_tasks (project_id, title, status, assigned_to, assigned_by)
        VALUES
          (${p1Id}, 'Review Initial Survey', 'in_progress', ${managerId}, ${adminId}),
          (${p2Id}, 'Publish SIA Summary', 'pending', ${managerId}, ${adminId}),
          (${p3Id}, 'Disburse Approved Awards', 'pending', ${managerId}, ${adminId})
      `;

      // 9. AUDIT EVENTS
      await tx`
        INSERT INTO audit_events (event_type, entity_type, entity_id, actor_id, actor_role, metadata)
        VALUES
          ('project_created', 'project', ${p1Id}, ${adminId}, 'admin', '{"demo": true}'),
          ('project_created', 'project', ${p2Id}, ${managerId}, 'project_manager', '{"demo": true}'),
          ('project_created', 'project', ${p3Id}, ${managerId}, 'project_manager', '{"demo": true}'),
          ('award_declared', 'project', ${p3Id}, ${adminId}, 'admin', '{"demo": true}')
      `;

      // 10. NOTIFICATIONS
      await tx`
        INSERT INTO notifications (user_id, title, type, entity_type, entity_id)
        VALUES
          (${managerId}, 'New Project Assigned: Ahmedabad Corridor', 'task_assigned', 'project', ${p1Id}),
          (${adminId}, 'Project North Gujarat requires SIA summary', 'status_change', 'project', ${p2Id})
      `;
    });
    
    console.log("Demo data successfully seeded.");
  } catch(e) {
    console.error("Seed transaction ROLLED BACK due to error:", e);
  } finally {
    sql.end();
  }
}

seed();
