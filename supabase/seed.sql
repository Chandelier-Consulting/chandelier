insert into public.business_units (name, slug, description) values
  ('Chandelier Consulting', 'chandelier-consulting', 'Public consulting services.'),
  ('AI Consulting', 'ai-consulting', 'AI deployment and automation engagements.'),
  ('SaaS Products', 'saas-products', 'Productized software revenue.'),
  ('Internal Tools', 'internal-tools', 'Internal systems and operating tooling.')
on conflict (slug) do nothing;

insert into public.leads (
  business_name,
  contact_name,
  email,
  phone,
  budget,
  requested_services,
  project_description,
  status
) values (
  'Rivera Bakery',
  'Jordan Rivera',
  'jordan@example.com',
  '(555) 123-4567',
  '$10k-$25k',
  array['Website Development','AI Automations'],
  'Replace phone-only ordering with a polished website, online ordering, and after-hours AI follow-up.',
  'new'
);
