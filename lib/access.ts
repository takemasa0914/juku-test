export class ApiError extends Error { constructor(public status:number, message:string){super(message);} }
export type Actor = { id:string; account_id:string; role:'child'|'caregiver'|'educator'|'researcher'|'administrator'; age:number; active:boolean; };
export function own(actor:Actor, owner:string){if(actor.id!==owner)throw new ApiError(404,'対象が見つかりません。');}
export function requireRole(actor:Actor, roles:Actor['role'][]){if(!actor.active||!roles.includes(actor.role))throw new ApiError(403,'この操作は許可されていません。');}
export function requireAssurance(actor:Actor, aal:string){if(actor.role!=='child'&&aal!=='aal2')throw new ApiError(403,'多要素認証を完了してください。');}
export function filterSharedScores<T extends {domain:string}>(scores:T[],scopes:string[]){return scores.filter(s=>scopes.includes(s.domain));}
