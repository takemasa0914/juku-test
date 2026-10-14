import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes,createHash } from 'node:crypto';
import { audit,checked,context,liveEnabled } from '@/lib/server';
import { ApiError, own, requireRole,filterSharedScores } from '@/lib/access';
import { canPublishScale,courseItems,courses,scoreAnswers,SCORING_VERSION,RULESET_VERSION,VERSION,Domain,csv } from '@/lib/domain';
export const runtime='nodejs';export const dynamic='force-dynamic';
const uuid=z.string().uuid();const domain=z.enum(['motivation','planning','agency','dialogue','strengths','connection']);
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Vercel-CDN-Cache-Control':'no-store'}});
async function json(request:Request){const text=await request.text();if(text.length>20000)throw new ApiError(413,'入力が大きすぎます。');try{return JSON.parse(text);}catch{throw new ApiError(400,'JSON形式が不正です。');}}
async function handler(request:Request,{params}:{params:Promise<{path:string[]}>}){
 try{
  const {path}=await params;const [resource,id,action]=path;const method=request.method;
  if(resource==='status'&&method==='GET')return reply({mode:liveEnabled()?'configured':'demo',liveDataCollection:liveEnabled(),version:'0.1.0',phase0Required:true});
  const {db,actor}=await context(request);
  if(resource==='me'&&method==='GET')return reply({id:actor.id,role:actor.role,age:actor.age});
  if(resource==='scales'&&id==='eligible'&&method==='GET'){
   const scales=checked(await db.from('app_scale_versions').select('id,name,age_min,age_max,rights_approved,ethics_approved,status,course_id').eq('status','published'));
   return reply({scales:scales.filter(s=>canPublishScale({rightsApproved:s.rights_approved,ethicsApproved:s.ethics_approved,ageMin:s.age_min,ageMax:s.age_max,status:s.status},actor.age))});
  }
  if(resource==='assessments'&&method==='POST'&&!id){
   requireRole(actor,['child','caregiver']);
   const body=z.object({scaleVersionId:z.string().min(1).max(100),studyId:uuid.optional(),waveId:uuid.optional()}).strict().parse(await json(request));
   const scale=checked(await db.from('app_scale_versions').select('*').eq('id',body.scaleVersionId).single());
   if(!canPublishScale({rightsApproved:scale.rights_approved,ethicsApproved:scale.ethics_approved,ageMin:scale.age_min,ageMax:scale.age_max,status:scale.status},actor.age)||!scale.roles.includes(actor.role))throw new ApiError(403,'この尺度の実施条件が満たされていません。');
   if(scale.scoring_version!==SCORING_VERSION||scale.id!==VERSION)throw new ApiError(409,'この尺度版の採点実装は未登録です。');
   const consent=checked(await db.from('app_consents').select('id').eq('person_id',actor.id).eq('purpose','service').is('withdrawn_at',null).limit(1));
   if(!consent.length)throw new ApiError(403,'利用説明と同意の確認が必要です。');
   if(Boolean(body.studyId)!==Boolean(body.waveId))throw new ApiError(400,'研究と測定時点を一緒に指定してください。');
   if(body.studyId){const eligible=checked(await db.rpc('app_study_eligibility',{p_study:body.studyId,p_wave:body.waveId,p_actor:actor.id,p_scale:scale.id}));if(!eligible)throw new ApiError(403,'研究参加・測定時点の条件を満たしていません。');}
   const session=checked(await db.from('app_assessments').insert({study_id:body.studyId??null,wave_id:body.waveId??null,person_id:actor.id,informant_id:actor.id,role:actor.role,scale_version_id:scale.id,course_id:scale.course_id,profile_snapshot:{age:actor.age,role:actor.role}}).select('id,course_id,status,created_at').single());
   await audit(db,actor,'assessment.create',session.id);return reply({session,items:courseItems(scale.course_id).map(i=>({id:i.id,text:i[actor.role as 'child'|'caregiver']}))},201);
  }
  if(resource==='assessments'&&id){
   uuid.parse(id);requireRole(actor,['child','caregiver']);
   const session=checked(await db.from('app_assessments').select('*').eq('id',id).eq('person_id',actor.id).single());own(actor,session.person_id);
   if(method==='GET')return reply({session});
   if(method==='PATCH'&&action==='responses'){
    if(session.status!=='draft')throw new ApiError(409,'完了済みの回答は変更できません。');
    const body=z.object({answers:z.record(z.string(),z.number().int().min(1).max(5).nullable())}).strict().parse(await json(request));
    const merged={...session.answers,...body.answers};scoreAnswers(session.course_id,merged);
    const updated=checked(await db.from('app_assessments').update({answers:merged,revision:session.revision+1}).eq('id',id).eq('person_id',actor.id).eq('status','draft').eq('revision',session.revision).select('id,revision'));
    if(updated.length===0)throw new ApiError(409,'回答が別の操作で更新されました。再読込してください。');return reply({saved:true,revision:session.revision+1});
   }
   if(method==='POST'&&action==='complete'){
    if(session.status==='complete'){const report=checked(await db.from('app_reports').select('*').eq('assessment_id',id).single());return reply({report});}
    const selected=courseItems(session.course_id);if(selected.some(i=>session.answers[i.id]===undefined))throw new ApiError(400,'未選択の項目があります。回答しない場合も明示してください。');
    const result=scoreAnswers(session.course_id,session.answers,(Date.now()-Date.parse(session.created_at))/1000);
    const data=checked(await db.rpc('app_complete_assessment',{p_session:id,p_actor:actor.id,p_revision:session.revision,p_scores:result.scores,p_flags:result.flags,p_scoring:SCORING_VERSION,p_ruleset:RULESET_VERSION}));
    if(!data)throw new ApiError(409,'回答が更新されています。再読込してください。');return reply({report:data});
   }
  }
  if(resource==='reports'&&method==='GET'){
   if(id)uuid.parse(id);
   let query=db.from('app_reports').select('id,assessment_id,person_id,role,scale_version_id,scoring_version,ruleset_version,created_at,scores,quality_flags').eq('person_id',actor.id).order('created_at',{ascending:false}).limit(100);
   if(id)query=query.eq('id',id);const reports=checked(await query);if(id&&!reports.length)throw new ApiError(404,'対象が見つかりません。');await audit(db,actor,'report.read',id??'own');return reply({reports});
  }
  if(resource==='consents'&&method==='GET')return reply({consents:checked(await db.from('app_consents').select('*').eq('person_id',actor.id))});
  if(resource==='consents'&&method==='POST'&&!id){
   const body=z.object({purpose:z.enum(['service','research_contact','external_ai']),documentVersion:z.string().min(1).max(80)}).strict().parse(await json(request));
   // Research enrollment and pair permissions use their own purpose-bound endpoints.
   const document=checked(await db.from('app_consent_documents').select('id').eq('id',body.documentVersion).eq('purpose',body.purpose).eq('approved',true).single());
   if(body.purpose==='external_ai')throw new ApiError(409,'外部AI処理は未提供です。');
   const result=checked(await db.from('app_consents').insert({person_id:actor.id,purpose:body.purpose,document_version:document.id}).select().single());await audit(db,actor,'consent.grant',result.id);return reply(result,201);
  }
  if(resource==='consents'&&id&&action==='withdraw'&&method==='POST'){
   uuid.parse(id);const result=checked(await db.rpc('app_withdraw_consent',{p_consent:id,p_actor:actor.id}));if(!result)throw new ApiError(404,'対象が見つかりません。');return reply({withdrawn:true});
  }
  if(resource==='invitations'&&method==='POST'&&!id){
   requireRole(actor,['child','caregiver']);const token=randomBytes(32).toString('base64url');const hash=createHash('sha256').update(token).digest('hex');
   const invitation=checked(await db.from('app_invitations').insert({inviter_id:actor.id,token_hash:hash,expires_at:new Date(Date.now()+86400000).toISOString()}).select('id,expires_at').single());await audit(db,actor,'invitation.create',invitation.id);return reply({token,expiresAt:invitation.expires_at},201);
  }
  if(resource==='invitations'&&id==='accept'&&method==='POST'){
   requireRole(actor,['child','caregiver']);const body=z.object({token:z.string().min(40).max(100)}).strict().parse(await json(request));const hash=createHash('sha256').update(body.token).digest('hex');
   const dyad=checked(await db.rpc('app_accept_invitation',{p_hash:hash,p_actor:actor.id}));if(!dyad)throw new ApiError(400,'招待が無効、期限切れ、または対象が不適切です。');return reply({dyad});
  }
  if(resource==='dyads'&&id){
   uuid.parse(id);const dyad=checked(await db.from('app_dyads').select('*').eq('id',id).or(`child_id.eq.${actor.id},caregiver_id.eq.${actor.id}`).eq('active',true).single());
   if(action==='permission'&&method==='POST'){
    const body=z.object({scopes:z.array(z.enum(['agency','dialogue'])).max(2)}).strict().parse(await json(request));
    checked(await db.from('app_pair_permissions').upsert({dyad_id:id,person_id:actor.id,scopes:[...new Set(body.scopes)],updated_at:new Date().toISOString()},{onConflict:'dyad_id,person_id'}).select());await audit(db,actor,'pair.permission',id);return reply({saved:true});
   }
   if(action==='comparison'&&method==='GET'){
    const data=checked(await db.rpc('app_pair_comparison',{p_dyad:id,p_actor:actor.id}));if(!data)throw new ApiError(403,'双方の同意範囲と比較可能なレポートが必要です。');return reply(data);
   }
  }
  if(resource==='shares'&&method==='POST'&&!id){
   const body=z.object({viewerId:uuid,reportId:uuid,scopes:z.array(z.enum(['motivation','planning','agency'])).min(1).max(3),days:z.number().int().min(1).max(90)}).strict().parse(await json(request));
   const report=checked(await db.from('app_reports').select('id,person_id,scores').eq('id',body.reportId).eq('person_id',actor.id).single());
   const target=checked(await db.from('app_persons').select('id,role,active').eq('id',body.viewerId).eq('active',true).single());if(target.role!=='educator')throw new ApiError(400,'承認された教育者を指定してください。');
   const relation=checked(await db.from('app_support_assignments').select('id').eq('person_id',actor.id).eq('educator_id',target.id).eq('active',true));if(!relation.length)throw new ApiError(403,'所属・担当関係が確認されていません。');
   const scopes=body.scopes.filter(s=>report.scores.some((x:{domain:Domain})=>x.domain===s));if(!scopes.length)throw new ApiError(400,'対象領域がありません。');
   const grant=checked(await db.from('app_share_grants').insert({owner_id:actor.id,viewer_id:target.id,report_id:report.id,scopes,expires_at:new Date(Date.now()+body.days*86400000).toISOString()}).select().single());await audit(db,actor,'share.create',grant.id);return reply(grant,201);
  }
  if(resource==='shares'&&id&&action==='revoke'&&method==='POST'){
   uuid.parse(id);const grants=checked(await db.from('app_share_grants').update({revoked_at:new Date().toISOString()}).eq('id',id).eq('owner_id',actor.id).select('id'));if(!grants.length)throw new ApiError(404,'対象が見つかりません。');await audit(db,actor,'share.revoke',id);return reply({revoked:true});
  }
  if(resource==='shares'&&id&&method==='GET'){
   uuid.parse(id);requireRole(actor,['educator']);const result=checked(await db.rpc('app_shared_report',{p_grant:id,p_actor:actor.id}));if(!result)throw new ApiError(404,'対象が見つからないか、共有が終了しています。');return reply(result);
  }
  if(resource==='studies'&&id&&action==='enrollments'&&method==='POST'){
   uuid.parse(id);requireRole(actor,['child','caregiver']);const body=z.object({documentVersion:z.string().min(1).max(80)}).strict().parse(await json(request));
   const result=checked(await db.rpc('app_enroll',{p_study:id,p_actor:actor.id,p_document:body.documentVersion}));if(!result)throw new ApiError(403,'研究の承認・対象条件・同意文書を確認してください。');return reply(result,201);
  }
  if(resource==='studies'&&id&&action==='exports'&&method==='POST'){
   uuid.parse(id);requireRole(actor,['researcher']);const rows=checked(await db.rpc('app_research_export',{p_study:id,p_actor:actor.id}));if(!rows)throw new ApiError(403,'この研究のエクスポート権限がありません。');
   const records=Array.isArray(rows)?rows:[];const data=csv([['study_participant_id','wave','role','scale_version','scoring_version','domain','score','answered','total'],...records.map((r:Record<string,unknown>)=>[r.participant_id,r.wave,r.role,r.scale_version,r.scoring_version,r.domain,r.score,r.answered,r.total])]);
   return new Response(data,{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename="research-export.csv"','Cache-Control':'private,no-store'}});
  }
  if(resource==='deletion-requests'&&method==='POST'){
   const result=checked(await db.from('app_deletion_requests').insert({person_id:actor.id}).select('id,status,created_at').single());await audit(db,actor,'deletion.request',result.id);return reply(result,201);
  }
  throw new ApiError(404,'エンドポイントが見つかりません。');
 }catch(error){if(error instanceof ApiError)return reply({error:error.message},error.status);if(error instanceof z.ZodError)return reply({error:'入力形式を確認してください。'},400);if(error instanceof Error&&error.message==='Invalid answer')return reply({error:'回答値または項目が不正です。'},400);return reply({error:'処理を完了できませんでした。'},500);}
}
export {handler as GET,handler as POST,handler as PATCH};
