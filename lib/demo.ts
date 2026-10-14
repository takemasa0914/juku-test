import { Answers, Domain, Report, Role, VERSION, SCORING_VERSION, RULESET_VERSION, scoreAnswers, courses, courseItems, csv } from './domain';
export type View = 'home'|'courses'|'report'|'timeline'|'pair'|'sharing'|'research'|'catalog'|'privacy'|'educator';
export interface Draft { courseId:string; answers:Answers; index:number; startedAt:number; agreed:boolean }
export interface Grant {id:string;viewer:string;scopes:Domain[];expiresAt:string;revokedAt?:string;}
export interface Audit { id:string;date:string;action:string; }
export interface DemoState {version:1;role:Role;reports:Report[];drafts:Partial<Record<Role,Draft>>;pairScopes:Record<Role,Domain[]>;linked:boolean;invitation?:{code:string;expiresAt:string};shares:Record<Role,Grant[]>;researchConsent:Record<Role,boolean>;contactConsent:Record<Role,boolean>;reminder:Record<Role,string>;actions:string[];logs:Audit[];}
export const roleNames={child:'子ども',caregiver:'保護者'};
export const profiles={child:{name:'はる',age:14,grade:'中学2年生'},caregiver:{name:'はるの保護者',age:40,grade:'保護者'}};
export function initialState():DemoState {
 const reports:Report[]=[];
 for(const role of ['child','caregiver'] as Role[])for(let wave=0;wave<3;wave++){
  const answers:Answers={}; courseItems('basics').forEach((it,i)=>{answers[it.id]=Math.max(1,Math.min(5,3+((i+wave+(role==='caregiver'?1:0))%3)-1));});
  reports.push({id:`sample-${role}-${wave}`,role,courseId:'basics',createdAt:['2026-04-14T01:00:00Z','2026-07-14T01:00:00Z','2026-10-14T01:00:00Z'][wave],version:VERSION,scoringVersion:SCORING_VERSION,rulesetVersion:RULESET_VERSION,...scoreAnswers('basics',answers),sample:true});
 }
 return {version:1,role:'child',reports,drafts:{},pairScopes:{child:[],caregiver:[]},linked:false,shares:{child:[],caregiver:[]},researchConsent:{child:false,caregiver:false},contactConsent:{child:false,caregiver:false},reminder:{child:'',caregiver:''},actions:[],logs:[]};
}
export function addLog(state:DemoState,action:string):DemoState {return {...state,logs:[{id:crypto.randomUUID(),date:new Date().toISOString(),action},...state.logs].slice(0,100)};}
export function latest(state:DemoState,role:Role){return state.reports.filter(r=>r.role===role).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];}
export function researchCsv(){ const rows:unknown[][]=[['data_type','study_participant_id','wave','role','scale_version','scoring_version','domain','score','answered','total']];for(let n=1;n<=24;n++)for(let w=1;w<=3;w++)for(const d of courses[0].domains)rows.push(['SYNTHETIC_DEMO',`demo-study-${String(n).padStart(3,'0')}`,`T${w}`,'child',VERSION,SCORING_VERSION,d,((n+w+d.length)%9)/4+2,3,3]);return csv(rows);}
export const catalog=[
 {name:'親子の振り返り・体験用質問',construct:'学習・選択・対話・強み',age:'10〜18歳／成人の保護者',status:'体験版のみ',note:'本アプリ独自の未検証項目。標準化された心理尺度ではありません。'},
 {name:'自己決定理論に基づく学習動機尺度',construct:'学習動機',age:'中学生（原典の条件を確認）',status:'審査待ち',note:'日本語版原典・採点規則・電子化の利用条件を確認後に導入。'},
 {name:'基本的心理欲求充足尺度',construct:'自律性・有能感・関係性',age:'中学生（原典の条件を確認）',status:'審査待ち',note:'対象集団・日本語版の妥当性・電子化許諾の確認が必要。'},
 {name:'子ども用強み注目尺度',construct:'自分・他者の強みへの注目',age:'小中学生（原典を確認）',status:'審査待ち',note:'項目文は未収録。正式な利用審査後に登録。'},
 {name:'SDQ / RCADS',construct:'情緒・行動／不安等',age:'使用する版ごとに確認',status:'初期版対象外',note:'電子化許諾・対象年齢・専門職の安全対応体制を整備後に検討。'},
 {name:'K6 / WHO-5 / PBA-J',construct:'保護者の負担・健康',age:'成人（適用条件を確認）',status:'審査待ち',note:'利用条件と安全対応手順が未確定のため、質問は表示しません。'},
];
