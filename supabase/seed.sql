insert into public.business_units (name, slug, description) values
  ('Chandelier Consulting', 'chandelier-consulting', 'Public consulting services.'),
  ('AI Consulting', 'ai-consulting', 'AI deployment and automation engagements.'),
  ('SaaS Products', 'saas-products', 'Productized software revenue.'),
  ('Internal Tools', 'internal-tools', 'Internal systems and operating tooling.')
on conflict (slug) do nothing;

do $$
declare
  chandelier_id uuid;
  ai_id uuid;
  saas_id uuid;
  rivera_lead_id uuid;
  clinic_lead_id uuid;
  rivera_client_id uuid;
  clinic_client_id uuid;
  ops_client_id uuid;
  rivera_proposal_id uuid;
  clinic_proposal_id uuid;
  rivera_project_id uuid;
  clinic_project_id uuid;
  rivera_invoice_id uuid;
  clinic_invoice_id uuid;
  maya_contractor_id uuid;
  theo_contractor_id uuid;
begin
  select id into chandelier_id from public.business_units where slug = 'chandelier-consulting';
  select id into ai_id from public.business_units where slug = 'ai-consulting';
  select id into saas_id from public.business_units where slug = 'saas-products';

  insert into public.leads (
    business_unit_id,
    business_name,
    contact_name,
    email,
    phone,
    website,
    budget,
    requested_services,
    project_description,
    status
  ) values
    (
      chandelier_id,
      'Rivera Bakery',
      'Jordan Rivera',
      'jordan@example.com',
      '(555) 123-4567',
      'https://riverabakery.example',
      '$10k-$25k',
      array['Website Development','AI Automations'],
      'Replace phone-only ordering with a polished website, online ordering, and after-hours AI follow-up.',
      'proposal'
    ),
    (
      ai_id,
      'Northstar Dental',
      'Priya Shah',
      'priya@example.com',
      '(555) 234-9876',
      'https://northstardental.example',
      '$25k-$50k',
      array['AI Automations','Internal Dashboards'],
      'Automate missed-call follow-up, intake reminders, and daily appointment reconciliation.',
      'new'
    ),
    (
      saas_id,
      'Harbor Fitness',
      'Lee Morgan',
      'lee@example.com',
      null,
      null,
      '$5k-$10k',
      array['Maintenance Retainers','SEO & Local Presence'],
      'Improve local search visibility and create a maintenance plan for recurring landing page updates.',
      'won'
    );

  select id into rivera_lead_id from public.leads where business_name = 'Rivera Bakery' limit 1;
  select id into clinic_lead_id from public.leads where business_name = 'Northstar Dental' limit 1;

  insert into public.clients (
    business_unit_id,
    name,
    contact_name,
    email,
    phone,
    notes,
    stripe_customer_id
  ) values
    (
      chandelier_id,
      'Rivera Bakery',
      'Jordan Rivera',
      'jordan@example.com',
      '(555) 123-4567',
      'Bakery website launch with ordering workflow and follow-up automation.',
      'cus_seed_rivera'
    ),
    (
      ai_id,
      'Northstar Dental',
      'Priya Shah',
      'priya@example.com',
      '(555) 234-9876',
      'Clinic automation prospect moving from discovery into proposal.',
      'cus_seed_northstar'
    ),
    (
      saas_id,
      'Harbor Fitness',
      'Lee Morgan',
      'lee@example.com',
      '(555) 888-1010',
      'Local SEO and maintenance retainer client.',
      'cus_seed_harbor'
    )
  on conflict (stripe_customer_id) do nothing;

  select id into rivera_client_id from public.clients where stripe_customer_id = 'cus_seed_rivera';
  select id into clinic_client_id from public.clients where stripe_customer_id = 'cus_seed_northstar';
  select id into ops_client_id from public.clients where stripe_customer_id = 'cus_seed_harbor';

  insert into public.proposals (
    business_unit_id,
    lead_id,
    client_id,
    scope_of_work,
    deliverables,
    pricing_cents,
    pdf_path,
    status
  ) values
    (
      chandelier_id,
      rivera_lead_id,
      rivera_client_id,
      'Website rebuild, online ordering flow, and automated lead follow-up.',
      '[{"title":"Discovery and IA","done":true},{"title":"Website build","done":false},{"title":"Automation launch","done":false}]'::jsonb,
      1850000,
      'proposal-pdfs/rivera-bakery-launch.pdf',
      'accepted'
    ),
    (
      ai_id,
      clinic_lead_id,
      clinic_client_id,
      'Patient intake automation and appointment operations dashboard.',
      '[{"title":"Workflow mapping","done":true},{"title":"AI follow-up scripts","done":false},{"title":"Dashboard deployment","done":false}]'::jsonb,
      3200000,
      'proposal-pdfs/northstar-automation.pdf',
      'sent'
    );

  select id into rivera_proposal_id from public.proposals where client_id = rivera_client_id limit 1;
  select id into clinic_proposal_id from public.proposals where client_id = clinic_client_id limit 1;

  insert into public.projects (
    business_unit_id,
    client_id,
    proposal_id,
    name,
    deliverables,
    status,
    budget_cents,
    cost_cents
  ) values
    (
      chandelier_id,
      rivera_client_id,
      rivera_proposal_id,
      'Rivera Bakery Launch',
      '[{"title":"Homepage and menu pages","done":true},{"title":"Ordering intake form","done":true},{"title":"After-hours AI follow-up","done":false}]'::jsonb,
      'active',
      1850000,
      620000
    ),
    (
      ai_id,
      clinic_client_id,
      clinic_proposal_id,
      'Northstar Dental Automation',
      '[{"title":"Call triage workflow","done":true},{"title":"Reminder automation","done":false},{"title":"Operations dashboard","done":false}]'::jsonb,
      'active',
      3200000,
      850000
    );

  select id into rivera_project_id from public.projects where name = 'Rivera Bakery Launch';
  select id into clinic_project_id from public.projects where name = 'Northstar Dental Automation';

  insert into public.invoices (
    business_unit_id,
    client_id,
    project_id,
    stripe_invoice_id,
    hosted_invoice_url,
    status,
    subtotal_cents,
    discount_cents,
    deposit_cents,
    retainer_cents,
    total_cents,
    due_date,
    memo
  ) values
    (
      chandelier_id,
      rivera_client_id,
      rivera_project_id,
      'in_seed_rivera_001',
      'https://invoice.stripe.com/i/acct_seed/rivera',
      'paid',
      925000,
      0,
      0,
      0,
      925000,
      current_date - interval '14 days',
      'Rivera Bakery phase one deposit.'
    ),
    (
      ai_id,
      clinic_client_id,
      clinic_project_id,
      'in_seed_northstar_001',
      'https://invoice.stripe.com/i/acct_seed/northstar',
      'open',
      1600000,
      100000,
      0,
      0,
      1500000,
      current_date + interval '10 days',
      'Northstar Dental automation deposit.'
    )
  on conflict (stripe_invoice_id) do nothing;

  select id into rivera_invoice_id from public.invoices where stripe_invoice_id = 'in_seed_rivera_001';
  select id into clinic_invoice_id from public.invoices where stripe_invoice_id = 'in_seed_northstar_001';

  insert into public.invoice_line_items (invoice_id, description, quantity, unit_amount_cents) values
    (rivera_invoice_id, 'Website implementation deposit', 1, 750000),
    (rivera_invoice_id, 'Ordering automation setup', 1, 175000),
    (clinic_invoice_id, 'AI intake workflow', 1, 900000),
    (clinic_invoice_id, 'Operations dashboard foundation', 1, 700000);

  insert into public.payments (
    invoice_id,
    stripe_payment_intent_id,
    amount_cents,
    stripe_fee_cents,
    status,
    paid_at
  ) values
    (rivera_invoice_id, 'pi_seed_rivera_001', 925000, 27125, 'paid', now() - interval '8 days');

  insert into public.expenses (
    business_unit_id,
    client_id,
    project_id,
    category,
    amount_cents,
    receipt_path,
    tax_deductible,
    reimbursable,
    business_purpose,
    spent_at
  ) values
    (
      chandelier_id,
      rivera_client_id,
      rivera_project_id,
      'hosting',
      12900,
      'receipts/vercel-june.pdf',
      true,
      false,
      'Production hosting for Rivera Bakery launch.',
      current_date - interval '6 days'
    ),
    (
      ai_id,
      clinic_client_id,
      clinic_project_id,
      'ai_credits',
      8800,
      'receipts/openai-june.pdf',
      true,
      true,
      'AI model testing for Northstar Dental follow-up workflow.',
      current_date - interval '3 days'
    ),
    (
      chandelier_id,
      null,
      null,
      'software',
      4900,
      'receipts/design-tool.pdf',
      true,
      false,
      'Design tool subscription for client mockups.',
      current_date - interval '2 days'
    );

  insert into public.contractors (
    business_unit_id,
    name,
    email,
    tax_form_status,
    payment_method_notes,
    notes
  ) values
    (
      chandelier_id,
      'Maya Chen',
      'maya.contractor@example.com',
      'received',
      'Pays through external bank transfer after invoice approval.',
      'Frontend implementation support.'
    ),
    (
      ai_id,
      'Theo Grant',
      'theo.contractor@example.com',
      'requested',
      'Awaiting W-9 before first payout.',
      'Automation QA and workflow documentation.'
    );

  select id into maya_contractor_id from public.contractors where email = 'maya.contractor@example.com';
  select id into theo_contractor_id from public.contractors where email = 'theo.contractor@example.com';

  insert into public.contractor_payouts (
    contractor_id,
    client_id,
    project_id,
    amount_cents,
    receipt_path,
    status,
    paid_at
  ) values
    (
      maya_contractor_id,
      rivera_client_id,
      rivera_project_id,
      240000,
      'contractor-invoices/maya-rivera-001.pdf',
      'paid',
      current_date - interval '5 days'
    ),
    (
      theo_contractor_id,
      clinic_client_id,
      clinic_project_id,
      180000,
      'contractor-invoices/theo-northstar-001.pdf',
      'tracked',
      null
    );

  insert into public.cash_ledger_entries (
    business_unit_id,
    entry_type,
    source_table,
    source_id,
    amount_cents,
    memo,
    occurred_at
  ) values
    (
      chandelier_id,
      'invoice_payment',
      'invoices',
      rivera_invoice_id,
      925000,
      'Stripe invoice paid: in_seed_rivera_001',
      now() - interval '8 days'
    ),
    (
      chandelier_id,
      'stripe_fee',
      'payments',
      rivera_invoice_id,
      -27125,
      'Stripe processing fee for Rivera payment.',
      now() - interval '8 days'
    ),
    (
      chandelier_id,
      'contractor_payout',
      'contractor_payouts',
      rivera_project_id,
      -240000,
      'Contractor payout for Rivera launch support.',
      now() - interval '5 days'
    );

  insert into public.subscription_schedules (
    business_unit_id,
    client_id,
    stripe_customer_id,
    stripe_subscription_schedule_id,
    stripe_subscription_id,
    status,
    months,
    monthly_total_cents,
    memo
  ) values
    (
      saas_id,
      ops_client_id,
      'cus_seed_harbor',
      'sub_sched_seed_harbor_001',
      'sub_seed_harbor_001',
      'active',
      6,
      150000,
      'Monthly local SEO and maintenance retainer.'
    );
end $$;
