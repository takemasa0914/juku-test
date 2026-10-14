import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ApiError, Actor, requireAssurance } from './access';
export function liveEnabled(){return process.env.LIVE_DATA_ENABLED==='true'&&!!process.env.LIVE_APPROVAL_REFERENCE&&!!process.env.SUPABASE_URL&&!!process.env.SUPABASE_PUBLISHABLE_KEY&&!!process.env.SUPABASE_SERVICE_ROLE_KEY;}
export async function context(request:Request):Promise<{db:SupabaseClient;actor:Actor}> {
 if(!liveEnabled())throw new ApiError(503,'体験版のため、実データAPIは停止中です。');
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token)throw new ApiError(401,'ログインが必要です。');
 const auth=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await auth.auth.getUser(token);
 if(error||!data.user||data.user.is_anonymous)throw new ApiError(401,'認証を確認できません。');
 const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:actor,error:actorError}=await db.from('app_persons').select('id,account_id,role,age,active').eq('account_id',data.user.id).eq('active',true).maybeSingle();
 if(actorError)throw new ApiError(503,'データの確認に失敗しました。');
 if(!actor)throw new ApiError(403,'承認された参加者アカウントが必要です。');
 // The bearer token has just been validated by Supabase Auth. Never read user_metadata for authorization.
 const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
 requireAssurance(actor,claims.aal??'aal1');
 // Server-side session revocation and account deactivation are checked on every API call.
 const {data:sessionOK,error:sessionError}=await db.rpc('app_session_active',{p_session_id:claims.session_id,p_account_id:actor.account_id});
 if(sessionError||!sessionOK)throw new ApiError(401,'セッションが無効です。再度ログインしてください。');
 const {data:allowed,error:limitError}=await db.rpc('app_rate_limit',{p_actor:actor.id,p_bucket:new Date().toISOString().slice(0,16),p_max:60});
 if(limitError)throw new ApiError(503,'受付状態を確認できません。');if(!allowed)throw new ApiError(429,'少し時間をおいてお試しください。');
 return {db,actor};
}
export async function audit(db:SupabaseClient,actor:Actor,action:string,target:string){const {error}=await db.from('app_audit_logs').insert({actor_id:actor.id,action,target});if(error)throw new ApiError(503,'監査記録を保存できないため、操作を完了できません。');}
export function checked<T>(r:{data:T;error:unknown}):NonNullable<T>{if(r.error)throw new ApiError(503,'データの処理に失敗しました。');if(r.data==null)throw new ApiError(404,'対象が見つかりません。');return r.data;}
