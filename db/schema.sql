-- Reviewed deployment script, not a Supabase CLI-generated migration.
-- Apply to a NEW dedicated Supabase project after Phase 0 approval.
-- Every app table is API-server-only. No browser/anon/authenticated role can read it.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
create table public.app_persons (
 id uuid primary key default gen_random_uuid(), account_id uuid not null unique references auth.users(id),
 role text not null check(role in ('child','caregiver','educator','researcher','administrator')),
 age integer not null check(age between 10 and 110), nickname text not null check(length(nickname) between 1 and 60),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.app_households(id uuid primary key default gen_random_uuid(),state text not null default 'active');
create table public.app_relationships(id uuid primary key default gen_random_uuid(),family_id uuid references public.app_households(id),person_a uuid not null references public.app_persons(id),person_b uuid not null references public.app_persons(id),relation_type text not null,valid_from timestamptz not null default now(),valid_to timestamptz,check(person_a<>person_b));
create table public.app_organizations(id uuid primary key default gen_random_uuid(),name text not null,org_type text not null);
create table public.app_memberships(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.app_organizations(id),person_id uuid not null references public.app_persons(id),role text not null,active boolean not null default true,unique(org_id,person_id));
create table public.app_support_assignments(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.app_organizations(id),person_id uuid not null references public.app_persons(id),educator_id uuid not null references public.app_persons(id),active boolean not null default true,unique(org_id,person_id,educator_id));
create table public.app_consent_documents(id text primary key,purpose text not null,body text not null,approved boolean not null default false,approved_at timestamptz);
create table public.app_studies(id uuid primary key default gen_random_uuid(),title text not null,protocol_version text not null,document_version text not null references public.app_consent_documents(id),ethics_reference text,status text not null default 'draft' check(status in ('draft','active','closed')),age_min integer not null,age_max integer not null,created_at timestamptz not null default now(),check(status<>'active' or ethics_reference is not null));
create table public.app_study_members(study_id uuid not null references public.app_studies(id),person_id uuid not null references public.app_persons(id),can_export boolean not null default false,active boolean not null default true,primary key(study_id,person_id));
create table public.app_waves(id uuid primary key default gen_random_uuid(),study_id uuid not null references public.app_studies(id),code text not null,opens_at timestamptz not null,closes_at timestamptz not null,check(opens_at<closes_at),unique(study_id,code));
create table public.app_scale_versions(id text primary key,name text not null,course_id text not null,scoring_version text not null,roles text[] not null,age_min integer not null,age_max integer not null,rights_approved boolean not null default false,ethics_approved boolean not null default false,rights_record text,source_record text,validation_record text,status text not null default 'draft' check(status in ('draft','published','retired')),check(age_min<=age_max),check(status<>'published' or (rights_approved and ethics_approved and rights_record is not null and source_record is not null and validation_record is not null)));
create table public.app_study_scales(study_id uuid not null references public.app_studies(id),scale_version_id text not null references public.app_scale_versions(id),primary key(study_id,scale_version_id));
create table public.app_consents(id uuid primary key default gen_random_uuid(),person_id uuid not null references public.app_persons(id),purpose text not null check(purpose in ('service','research','research_contact','external_ai')),study_id uuid references public.app_studies(id),document_version text not null references public.app_consent_documents(id),signed_at timestamptz not null default now(),withdrawn_at timestamptz,check((purpose='research')=(study_id is not null)));
create unique index app_active_service_consent on public.app_consents(person_id,purpose) where withdrawn_at is null and purpose<>'research';
create unique index app_active_research_consent on public.app_consents(person_id,study_id) where withdrawn_at is null and purpose='research';
create table private.app_enrollments(study_id uuid not null references public.app_studies(id),person_id uuid not null references public.app_persons(id),participant_id uuid not null default gen_random_uuid(),consent_id uuid not null references public.app_consents(id),enrolled_at timestamptz not null default now(),withdrawn_at timestamptz,primary key(study_id,person_id),unique(study_id,participant_id));
create table public.app_assessments(id uuid primary key default gen_random_uuid(),person_id uuid not null references public.app_persons(id),informant_id uuid not null references public.app_persons(id),role text not null,scale_version_id text not null references public.app_scale_versions(id),course_id text not null,study_id uuid references public.app_studies(id),wave_id uuid references public.app_waves(id),profile_snapshot jsonb not null,answers jsonb not null default '{}',revision integer not null default 0,status text not null default 'draft' check(status in ('draft','complete')),created_at timestamptz not null default now(),completed_at timestamptz,check((study_id is null)=(wave_id is null)));
create table public.app_reports(id uuid primary key default gen_random_uuid(),assessment_id uuid not null unique references public.app_assessments(id),person_id uuid not null references public.app_persons(id),role text not null,scale_version_id text not null references public.app_scale_versions(id),scoring_version text not null,ruleset_version text not null,model_version text not null default 'none',scores jsonb not null,quality_flags jsonb not null,created_at timestamptz not null default now());
create table public.app_invitations(id uuid primary key default gen_random_uuid(),inviter_id uuid not null references public.app_persons(id),token_hash text not null unique,expires_at timestamptz not null,consumed_at timestamptz,created_at timestamptz not null default now());
create table public.app_dyads(id uuid primary key default gen_random_uuid(),child_id uuid not null references public.app_persons(id),caregiver_id uuid not null references public.app_persons(id),relation_id uuid references public.app_relationships(id),active boolean not null default true,created_at timestamptz not null default now(),unique(child_id,caregiver_id),check(child_id<>caregiver_id));
create table public.app_pair_permissions(dyad_id uuid not null references public.app_dyads(id),person_id uuid not null references public.app_persons(id),scopes text[] not null default '{}',updated_at timestamptz not null default now(),primary key(dyad_id,person_id),check(scopes<@array['agency','dialogue']::text[]));
create table public.app_share_grants(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.app_persons(id),viewer_id uuid not null references public.app_persons(id),report_id uuid not null references public.app_reports(id),scopes text[] not null,expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now(),check(owner_id<>viewer_id),check(scopes<@array['motivation','planning','agency']::text[]));
create table public.app_intervention_events(id uuid primary key default gen_random_uuid(),person_id uuid not null references public.app_persons(id),educator_id uuid not null references public.app_persons(id),org_id uuid not null references public.app_organizations(id),note text not null,event_date date not null,created_at timestamptz not null default now());
create table public.app_audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references public.app_persons(id),action text not null,target text not null,created_at timestamptz not null default now());
create table public.app_deletion_requests(id uuid primary key default gen_random_uuid(),person_id uuid not null references public.app_persons(id),status text not null default 'pending' check(status in ('pending','reviewing','completed')),created_at timestamptz not null default now());
create table private.app_rate_limits(actor_id uuid not null references public.app_persons(id),bucket text not null,hits integer not null default 1,primary key(actor_id,bucket));
create index on public.app_assessments(person_id,created_at desc);
create index on public.app_reports(person_id,created_at desc);
create index on public.app_share_grants(viewer_id,expires_at);
create index on public.app_consents(person_id,purpose,study_id);
create index on public.app_audit_logs(actor_id,created_at desc);

-- A locked, unvalidated draft, NEVER automatically published.
insert into public.app_scale_versions(id,name,course_id,scoring_version,roles,age_min,age_max) values
('original-demo-0.1','親子の振り返り・未検証試作','basics','mean-min-two-thirds-1.0',array['child','caregiver'],10,110);

-- Invoker functions below are executable by service_role ONLY.
create function public.app_rate_limit(p_actor uuid,p_bucket text,p_max integer) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin insert into private.app_rate_limits(actor_id,bucket) values(p_actor,p_bucket) on conflict(actor_id,bucket) do update set hits=private.app_rate_limits.hits+1 returning hits into n;return n<=p_max;end;$$;

-- Narrow internal auth-session lookup; not exposed to browser roles.
create function private.app_session_active(p_session_id uuid,p_account_id uuid) returns boolean language sql security definer set search_path='' as $$
select exists(select 1 from auth.sessions where id=p_session_id and user_id=p_account_id and (not_after is null or not_after>now()));$$;
revoke all on function private.app_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function private.app_session_active(uuid,uuid) to service_role;
create function public.app_session_active(p_session_id uuid,p_account_id uuid) returns boolean language sql set search_path='' as $$select private.app_session_active(p_session_id,p_account_id);$$;

create function public.app_complete_assessment(p_session uuid,p_actor uuid,p_revision integer,p_scores jsonb,p_flags jsonb,p_scoring text,p_ruleset text) returns jsonb language plpgsql set search_path='' as $$
declare s public.app_assessments; result public.app_reports;sc public.app_scale_versions;
begin
 select * into s from public.app_assessments where id=p_session and person_id=p_actor for update;
 if not found then return null;end if;
 if s.status='complete' then select * into result from public.app_reports where assessment_id=s.id;return to_jsonb(result);end if;
 if s.revision<>p_revision then return null;end if;
 select * into sc from public.app_scale_versions where id=s.scale_version_id;
 if sc.status<>'published' or not sc.rights_approved or not sc.ethics_approved or sc.scoring_version<>p_scoring then return null;end if;
 insert into public.app_reports(assessment_id,person_id,role,scale_version_id,scoring_version,ruleset_version,scores,quality_flags) values(s.id,s.person_id,s.role,s.scale_version_id,p_scoring,p_ruleset,p_scores,p_flags) returning * into result;
 update public.app_assessments set status='complete',completed_at=now() where id=s.id;
 insert into public.app_audit_logs(actor_id,action,target) values(p_actor,'assessment.complete',s.id::text);
 return to_jsonb(result);
end;$$;
create function public.app_withdraw_consent(p_consent uuid,p_actor uuid) returns boolean language plpgsql set search_path='' as $$
declare c public.app_consents;
begin
 update public.app_consents set withdrawn_at=now() where id=p_consent and person_id=p_actor and withdrawn_at is null returning * into c;
 if not found then return false;end if;
 if c.purpose='research' then update private.app_enrollments set withdrawn_at=now() where consent_id=c.id;end if;
 if c.purpose='service' then
  update public.app_persons set active=false where id=p_actor;
  update public.app_share_grants set revoked_at=now() where owner_id=p_actor and revoked_at is null;
  update public.app_pair_permissions set scopes='{}' where person_id=p_actor;
 end if;
 insert into public.app_audit_logs(actor_id,action,target) values(p_actor,'consent.withdraw',c.id::text);return true;
end;$$;
create function public.app_accept_invitation(p_hash text,p_actor uuid) returns jsonb language plpgsql set search_path='' as $$
declare i public.app_invitations;a public.app_persons;b public.app_persons;d public.app_dyads;
begin
 select * into i from public.app_invitations where token_hash=p_hash and consumed_at is null and expires_at>now() for update;
 if not found or i.inviter_id=p_actor then return null;end if;
 select * into a from public.app_persons where id=i.inviter_id and active;
 select * into b from public.app_persons where id=p_actor and active;
 if a.id is null or b.id is null or not((a.role='child' and b.role='caregiver') or(a.role='caregiver' and b.role='child')) then return null;end if;
 insert into public.app_dyads(child_id,caregiver_id) values(case when a.role='child' then a.id else b.id end,case when a.role='caregiver' then a.id else b.id end) on conflict(child_id,caregiver_id) do update set active=true returning * into d;
 update public.app_invitations set consumed_at=now() where id=i.id;
 insert into public.app_audit_logs(actor_id,action,target) values(p_actor,'invitation.accept',d.id::text);
 return jsonb_build_object('id',d.id,'linked',true);
end;$$;
create function public.app_pair_comparison(p_dyad uuid,p_actor uuid) returns jsonb language plpgsql set search_path='' as $$
declare d public.app_dyads;scope text[];c public.app_reports;p public.app_reports;result jsonb;
begin
 select * into d from public.app_dyads where id=p_dyad and active and p_actor in(child_id,caregiver_id);
 if not found then return null;end if;
 if (select count(*) from public.app_persons where id in(d.child_id,d.caregiver_id) and active)<>2 then return null;end if;
 select array_agg(x) into scope from public.app_pair_permissions a join public.app_pair_permissions b on a.dyad_id=b.dyad_id cross join lateral unnest(a.scopes) x where a.dyad_id=d.id and a.person_id=d.child_id and b.person_id=d.caregiver_id and x=any(b.scopes);
 if coalesce(cardinality(scope),0)=0 then return null;end if;
 select * into c from public.app_reports where person_id=d.child_id and role='child' order by created_at desc limit 1;
 select * into p from public.app_reports where person_id=d.caregiver_id and role='caregiver' order by created_at desc limit 1;
 if c.id is null or p.id is null or c.scale_version_id<>p.scale_version_id or c.scoring_version<>p.scoring_version then return null;end if;
 select jsonb_agg(jsonb_build_object('domain',x->>'domain','child',x->'value','caregiver',y->'value')) into result from jsonb_array_elements(c.scores) x cross join jsonb_array_elements(p.scores) y where x->>'domain'=y->>'domain' and x->>'domain'=any(scope);
 insert into public.app_audit_logs(actor_id,action,target) values(p_actor,'pair.read',d.id::text);
 return jsonb_build_object('scores',coalesce(result,'[]'::jsonb),'child_date',c.created_at,'caregiver_date',p.created_at,'scale_version',c.scale_version_id);
end;$$;
create function public.app_shared_report(p_grant uuid,p_actor uuid) returns jsonb language plpgsql set search_path='' as $$
declare g public.app_share_grants;r public.app_reports;allowed jsonb;
begin
 select * into g from public.app_share_grants where id=p_grant and viewer_id=p_actor and revoked_at is null and expires_at>now();
 if not found then return null;end if;
 if not exists(select 1 from public.app_persons where id=p_actor and active and role='educator') or not exists(select 1 from public.app_persons where id=g.owner_id and active) then return null;end if;
 if not exists(select 1 from public.app_support_assignments a join public.app_memberships m on m.org_id=a.org_id and m.person_id=p_actor and m.active where a.person_id=g.owner_id and a.educator_id=p_actor and a.active) then return null;end if;
 select * into r from public.app_reports where id=g.report_id and person_id=g.owner_id;
 if not found then return null;end if;
 select jsonb_agg(x) into allowed from jsonb_array_elements(r.scores)x where x->>'domain'=any(g.scopes);
 insert into public.app_audit_logs(actor_id,action,target) values(p_actor,'share.read',g.id::text);
 return jsonb_build_object('report_id',r.id,'created_at',r.created_at,'scores',coalesce(allowed,'[]'::jsonb),'scale_version',r.scale_version_id,'scoring_version',r.scoring_version);
end;$$;
create function public.app_enroll(p_study uuid,p_actor uuid,p_document text) returns jsonb language plpgsql set search_path='' as $$
declare s public.app_studies;p public.app_persons;c public.app_consents;e private.app_enrollments;
begin
 select * into s from public.app_studies where id=p_study and status='active' and ethics_reference is not null;
 select * into p from public.app_persons where id=p_actor and active and role in('child','caregiver');
 if s.id is null or p.id is null or p.age not between s.age_min and s.age_max or s.document_version<>p_document then return null;end if;
 if not exists(select 1 from public.app_consent_documents where id=p_document and approved and purpose='research') then return null;end if;
 select * into e from private.app_enrollments where study_id=s.id and person_id=p.id for update;
 if found and e.withdrawn_at is null then return jsonb_build_object('enrolled',true);end if;
 insert into public.app_consents(person_id,purpose,study_id,document_version)values(p.id,'research',s.id,p_document)returning * into c;
 insert into private.app_enrollments(study_id,person_id,consent_id) values(s.id,p.id,c.id) on conflict(study_id,person_id) do update set withdrawn_at=null,consent_id=c.id;
 insert into public.app_audit_logs(actor_id,action,target)values(p_actor,'study.enroll',s.id::text);return jsonb_build_object('enrolled',true,'consent_id',c.id);
end;$$;
create function public.app_study_eligibility(p_study uuid,p_wave uuid,p_actor uuid,p_scale text)returns boolean language sql set search_path='' as $$
select exists(select 1 from private.app_enrollments e join public.app_consents c on c.id=e.consent_id join public.app_studies s on s.id=e.study_id join public.app_waves w on w.study_id=s.id join public.app_study_scales ss on ss.study_id=s.id where e.person_id=p_actor and e.study_id=p_study and e.withdrawn_at is null and c.withdrawn_at is null and s.status='active' and w.id=p_wave and now() between w.opens_at and w.closes_at and ss.scale_version_id=p_scale);$$;
create function public.app_research_export(p_study uuid,p_actor uuid)returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.app_study_members m join public.app_persons p on p.id=m.person_id join public.app_studies s on s.id=m.study_id where m.study_id=p_study and m.person_id=p_actor and m.active and m.can_export and p.role='researcher' and p.active and s.status='active' and s.ethics_reference is not null) then return null;end if;
 select jsonb_agg(jsonb_build_object('participant_id',e.participant_id,'wave',w.code,'role',r.role,'scale_version',r.scale_version_id,'scoring_version',r.scoring_version,'domain',x->>'domain','score',x->'value','answered',x->'answered','total',x->'total') order by e.participant_id,w.opens_at,r.created_at,x->>'domain')into result
 from private.app_enrollments e join public.app_consents c on c.id=e.consent_id join public.app_assessments a on a.person_id=e.person_id and a.study_id=e.study_id join public.app_reports r on r.assessment_id=a.id join public.app_waves w on w.id=a.wave_id and w.study_id=e.study_id cross join lateral jsonb_array_elements(r.scores)x
 where e.study_id=p_study and e.withdrawn_at is null and c.withdrawn_at is null and r.created_at>=c.signed_at;
 if coalesce(jsonb_array_length(result),0)>5000 then raise exception 'export_limit_exceeded';end if;
 insert into public.app_audit_logs(actor_id,action,target) values(p_actor,'study.export',p_study::text);
 return coalesce(result,'[]'::jsonb);
end;$$;

-- All application tables are inaccessible to Data API browser roles.
do $$ declare t record;begin
 for t in select schemaname,tablename from pg_tables where schemaname in('public','private') and tablename like 'app\_%' escape '\' loop
 execute format('alter table %I.%I enable row level security',t.schemaname,t.tablename);
 execute format('revoke all on %I.%I from public, anon, authenticated',t.schemaname,t.tablename);
 execute format('grant select,insert,update,delete on %I.%I to service_role',t.schemaname,t.tablename);
 end loop;
end;$$;
-- Audit is append-only through the API credential.
revoke update,delete on public.app_audit_logs from service_role;
do $$ declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'app\_%' escape '\' loop
 execute format('revoke all on function %s from public, anon, authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end;$$;
commit;
