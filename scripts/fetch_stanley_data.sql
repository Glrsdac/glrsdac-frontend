-- Fetch all data for stanley yeboah (single result set via CTEs)
WITH
  target_user AS (
    SELECT id, email, created_at, last_sign_in_at
    FROM auth.users
    WHERE email ILIKE '%stanley%' OR email ILIKE '%yeboah%'
  ),
  target_member AS (
    SELECT m.*
    FROM public.members m
    WHERE m.user_id IN (SELECT id FROM target_user)
       OR CONCAT(m.first_name, ' ', m.last_name) ILIKE '%stanley%'
       OR CONCAT(m.first_name, ' ', m.last_name) ILIKE '%yeboah%'
  )
SELECT
  tu.id                                                      AS auth_user_id,
  tu.email,
  tu.created_at                                              AS auth_created_at,
  tu.last_sign_in_at,
  p.full_name,
  tm.id                                                      AS member_id,
  tm.member_no,
  tm.status,
  tm.position,
  tm.dob,
  tm.phone,
  ch.name                                                    AS church_name,
  STRING_AGG(DISTINCT r.name, ', ' ORDER BY r.name)          AS roles,
  (SELECT COUNT(*) FROM public.contributions co
   WHERE co.member_id = tm.id)                               AS contribution_count,
  (SELECT COUNT(*) FROM public.department_members dm
   WHERE dm.member_id = tm.id)                               AS department_count,
  tm.created_at                                              AS member_created_at
FROM target_user tu
LEFT JOIN public.profiles p    ON p.id = tu.id
LEFT JOIN target_member tm     ON tm.user_id = tu.id
LEFT JOIN public.churches ch   ON ch.id = tm.church_id
LEFT JOIN public.user_roles ur ON ur.user_id = tu.id
LEFT JOIN public.roles r       ON r.id = ur.role_id
GROUP BY
  tu.id, tu.email, tu.created_at, tu.last_sign_in_at,
  p.full_name, tm.id, tm.member_no, tm.status, tm.position,
  tm.dob, tm.phone, ch.name, tm.created_at;
