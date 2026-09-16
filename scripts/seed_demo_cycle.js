require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDemoCycle() {
  console.log("🚀 Starting BhuSetu Demo Cycle Seeding...");

  // 1. Get users
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(5);

  if (usersError || !users || users.length === 0) {
    console.error("❌ Error fetching users or no users found. Please run seed users first if needed.");
    return;
  }

  const requester = users.find(u => u.role === 'project_manager' || u.role === 'district_officer') || users[0];
  const approver = users.find(u => u.role === 'admin' || u.role === 'state_officer') || users[1] || users[0];

  console.log(`👤 Using Requester: ${requester.email} (${requester.role})`);
  console.log(`👤 Using Approver: ${approver.email} (${approver.role})`);

  // 2. Get Organization
  let orgId = requester.organization_id;
  if (!orgId) {
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    if (orgs && orgs.length > 0) orgId = orgs[0].id;
    else {
      // Create a dummy org
      const { data: newOrg } = await supabase.from('organizations').insert({
        name: 'Ministry of Road Transport and Highways',
        org_type: 'central_ministry',
        state_code: 'GJ',
        district_code: 'GNR'
      }).select().single();
      orgId = newOrg.id;
    }
  }

  // 3. Create Project
  console.log("🏗️ Creating Project...");
  const { data: project, error: projError } = await supabase.from('projects').insert({
    title: 'NH-48 Highway Expansion (Gandhinagar Sector 11)',
    description: 'Land acquisition for widening NH-48 to 6 lanes.',
    status: 'under_scrutiny', // Pre-submitted for the demo
    category: 'urgent',
    purpose: 'Infrastructure Development',
    state_code: 'GJ',
    district_code: 'GNR',
    requesting_org_id: orgId,
    created_by: requester.id,
    estimated_area_sqm: 150000
  }).select().single();

  if (projError) {
    console.error("❌ Error creating project:", projError);
    return;
  }
  console.log(`✅ Project Created: ${project.title} (ID: ${project.id})`);

  // 4. Create Parcels
  console.log("🗺️ Creating Parcels...");
  const parcelsData = [
    {
      survey_number: 'S-45/1',
      village: 'Koba',
      tehsil: 'Gandhinagar',
      district: 'GNR',
      state_code: 'GJ',
      parcel_type: 'private',
      area_sqm: 4500,
      owner_name: 'Ramesh Patel',
      project_id: project.id
    },
    {
      survey_number: 'S-45/2',
      village: 'Koba',
      tehsil: 'Gandhinagar',
      district: 'GNR',
      state_code: 'GJ',
      parcel_type: 'government',
      area_sqm: 12000,
      owner_name: 'State Govt of Gujarat',
      project_id: project.id
    }
  ];

  const { data: parcels, error: parcelError } = await supabase.from('parcels').insert(parcelsData).select();
  if (parcelError) console.error("❌ Error creating parcels:", parcelError);
  else console.log(`✅ Created ${parcels.length} Parcels.`);

  // 5. Create Geometries (WKT approximation for Gandhinagar)
  console.log("📍 Creating Geometries...");
  const projGeom = 'POLYGON((72.6369 23.2156, 72.6400 23.2156, 72.6400 23.2200, 72.6369 23.2200, 72.6369 23.2156))';
  const { error: geomError } = await supabase.from('project_geometries').insert({
    project_id: project.id,
    geometry: projGeom,
    source_dataset: 'Demo Mock Data',
    verification_status: 'unverified'
  });
  if (geomError) console.error("❌ Error creating project geometry:", geomError);
  else console.log("✅ Created Project Geometry.");

  if (parcels && parcels.length >= 2) {
    const p1Geom = 'POLYGON((72.6370 23.2160, 72.6385 23.2160, 72.6385 23.2180, 72.6370 23.2180, 72.6370 23.2160))';
    const p2Geom = 'POLYGON((72.6385 23.2160, 72.6395 23.2160, 72.6395 23.2180, 72.6385 23.2180, 72.6385 23.2160))';
    await supabase.from('parcel_geometries').insert([
      { parcel_id: parcels[0].id, geometry: p1Geom, verification_status: 'unverified' },
      { parcel_id: parcels[1].id, geometry: p2Geom, verification_status: 'unverified' }
    ]);
    console.log("✅ Created Parcel Geometries.");

    // Create an award for compensation calculation demo
    console.log("💰 Creating Compensation (Award) Record...");
    await supabase.from('awards').insert({
      project_id: project.id,
      parcel_id: parcels[0].id,
      assessed_amount: 1500000, // 15 Lakhs
      award_date: new Date().toISOString().split('T')[0],
      status: 'draft'
    });
    console.log("✅ Created Award Record for Parcel 1.");
  }

  // 6. Create Workflow Task
  console.log("📝 Creating Workflow Task...");
  const { error: taskError } = await supabase.from('workflow_tasks').insert({
    project_id: project.id,
    title: 'Initial Scrutiny for NH-48 Expansion',
    description: 'Please review the preliminary boundary and parcel details for approval.',
    status: 'pending',
    assigned_to: approver.id,
    assigned_by: requester.id
  });
  if (taskError) console.error("❌ Error creating task:", taskError);
  else console.log("✅ Created Workflow Task assigned to Approver.");

  // 7. Create Documents
  console.log("📄 Creating Mock Document...");
  const { error: docError } = await supabase.from('documents').insert({
    project_id: project.id,
    classification: 'notice',
    status: 'verified'
  });
  if (docError) console.error("❌ Error creating document:", docError);
  else console.log("✅ Created Document Record.");

  console.log("\n🎉 Demo Cycle Seeding Complete!");
  console.log("======================================");
  console.log(`Please login as Approver: ${approver.email} to review Tasks.`);
  console.log(`Or login as Requester: ${requester.email} to view Project.`);
}

seedDemoCycle();
