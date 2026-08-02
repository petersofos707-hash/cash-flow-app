-- Synthetic seed helper. Create the approved auth user first, then run `supabase db reset`.
-- No real financial records belong in this file.
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users order by created_at limit 1;
  if owner_id is null then
    raise notice 'No auth user exists; application demo data is seeded in the browser instead.';
    return;
  end if;
  insert into public.users (id, email, display_name) select owner_id, email, 'Demo Owner' from auth.users where id = owner_id on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (owner_id) on conflict (user_id) do nothing;
  insert into public.categories (user_id, name, classification, colour, sort_order) values
    (owner_id, 'Salary', 'income', '#25745a', 10), (owner_id, 'Groceries', 'essential', '#d68b3c', 20),
    (owner_id, 'Dining out', 'discretionary', '#b46c84', 30), (owner_id, 'Internal transfer', 'transfer', '#718096', 40),
    (owner_id, 'Investments', 'wealth', '#335f8a', 50)
  on conflict do nothing;
end $$;
