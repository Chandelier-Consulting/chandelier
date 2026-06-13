do $$
declare
  unit_id uuid;
  rivera_id uuid;
  northstar_id uuid;
  seeded_invoice_id uuid;
  contractor_id uuid;
begin
  select id into unit_id
  from public.business_units
  where slug = 'chandelier-consulting'
  limit 1;

  insert into public.businesses (
    business_unit_id,
    name,
    contact_name,
    email,
    phone,
    website_found,
    website_url,
    category,
    requested_services,
    project_summary,
    lead_status,
    estimated_value_cents,
    next_action,
    next_follow_up_at,
    notes
  ) values
    (
      unit_id,
      'Rivera Bakery',
      'Jordan Rivera',
      'jordan@example.com',
      '+14155550101',
      true,
      'https://riverabakery.example',
      'Bakery',
      array['Website', 'Ordering automation'],
      'Launch site plus ordering workflow.',
      'active',
      925000,
      'Send final launch invoice',
      current_date + interval '3 days',
      'Seed business for admin CRM.'
    ),
    (
      unit_id,
      'Northstar Dental',
      'Alex Kim',
      'alex@example.com',
      '+14155550102',
      true,
      'https://northstardental.example',
      'Dental',
      array['AI intake', 'Operations dashboard'],
      'Automate intake and show weekly operations metrics.',
      'proposal',
      1600000,
      'Follow up on proposal',
      current_date + interval '5 days',
      'Seed lead for admin pipeline.'
    )
  on conflict (phone) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    email = excluded.email,
    requested_services = excluded.requested_services,
    project_summary = excluded.project_summary,
    lead_status = excluded.lead_status,
    estimated_value_cents = excluded.estimated_value_cents,
    next_action = excluded.next_action,
    next_follow_up_at = excluded.next_follow_up_at,
    updated_at = now();

  select id into rivera_id from public.businesses where phone = '+14155550101';
  select id into northstar_id from public.businesses where phone = '+14155550102';

  insert into public.invoices (
    business_unit_id,
    business_id,
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
  ) values (
    unit_id,
    rivera_id,
    'in_seed_rivera_001',
    'https://invoice.stripe.com/i/acct_seed/rivera',
    'open',
    925000,
    0,
    0,
    0,
    925000,
    current_date + interval '7 days',
    'Website implementation and ordering automation.'
  )
  on conflict (stripe_invoice_id) do update set
    business_id = excluded.business_id,
    status = excluded.status,
    total_cents = excluded.total_cents,
    updated_at = now();

  select id into seeded_invoice_id from public.invoices where stripe_invoice_id = 'in_seed_rivera_001';

  delete from public.invoice_line_items
  where public.invoice_line_items.invoice_id = seeded_invoice_id;
  insert into public.invoice_line_items (invoice_id, description, quantity, unit_amount_cents) values
    (seeded_invoice_id, 'Website implementation', 1, 750000),
    (seeded_invoice_id, 'Ordering automation setup', 1, 175000);

  insert into public.payments (
    seeded_invoice_id,
    business_id,
    stripe_payment_intent_id,
    amount_cents,
    stripe_fee_cents,
    status,
    paid_at
  ) values (
    invoice_id,
    rivera_id,
    'pi_seed_rivera_001',
    925000,
    27125,
    'paid',
    now() - interval '8 days'
  )
  on conflict (stripe_payment_intent_id) do update set
    amount_cents = excluded.amount_cents,
    stripe_fee_cents = excluded.stripe_fee_cents,
    status = excluded.status,
    paid_at = excluded.paid_at,
    updated_at = now();

  insert into public.expenses (
    business_unit_id,
    business_id,
    category,
    amount_cents,
    tax_deductible,
    reimbursable,
    business_purpose,
    spent_at
  ) values
    (unit_id, rivera_id, 'software', 12900, true, true, 'Design tooling for Rivera launch.', current_date - interval '4 days'),
    (unit_id, northstar_id, 'ai_credits', 8400, true, false, 'Prototype AI intake workflow.', current_date - interval '2 days');

  insert into public.contractors (
    business_unit_id,
    name,
    email,
    tax_form_status,
    payment_method_notes,
    notes
  )
  select
    unit_id,
    'Maya Contractor',
    'maya.contractor@example.com',
    'requested',
    'External bank transfer after invoice approval.',
    'Seed contractor.'
  where not exists (
    select 1 from public.contractors where email = 'maya.contractor@example.com'
  );

  select id into contractor_id
  from public.contractors
  where email = 'maya.contractor@example.com'
  limit 1;

  insert into public.contractor_payouts (
    contractor_id,
    business_id,
    amount_cents,
    receipt_path,
    status,
    paid_at
  ) values (
    contractor_id,
    rivera_id,
    220000,
    'contractor-invoices/maya-rivera-001.pdf',
    'approved',
    null
  );
end $$;
