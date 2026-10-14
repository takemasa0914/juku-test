export type Role = 'child' | 'caregiver';
export type Domain = 'motivation' | 'planning' | 'agency' | 'dialogue' | 'strengths' | 'connection';
export const domainInfo: Record<Domain, { name: string; short: string; action: string; question: string; color: string }> = {
  motivation: { name: '学ぶことへの関心', short: '学びへの関心', action: '今日の勉強の中から「少し気になること」を一つ選んでみましょう。', question: 'どんなときに「もっと知りたい」と感じる？', color: '#547b67' },
  planning: { name: '学習の進め方', short: '学習の進め方', action: '最初の5分にすることを、一つだけ紙に書いてみましょう。', question: '今のやり方で、続けやすいところはどこ？', color: '#b2945b' },
  agency: { name: '自分で選ぶ感覚', short: '自分で選ぶ感覚', action: '今日取り組む順番を、自分で決める時間をつくってみましょう。', question: '自分で決めたいことと、相談したいことは何？', color: '#7b92a7' },
  dialogue: { name: '気持ちの伝えやすさ', short: '気持ちの伝えやすさ', action: '「聞いてほしいだけか、助言がほしいか」を先に伝えてみましょう。', question: 'どんな聞き方をしてもらえると話しやすい？', color: '#b98470' },
  strengths: { name: '自分のよさへの気づき', short: '強みへの気づき', action: '今日できた小さなことを、結果だけでなく工夫にも目を向けて一つ探しましょう。', question: '自分では当たり前でも、人の役に立ったことは？', color: '#8d83a4' },
  connection: { name: '周りとのつながり', short: '周りとのつながり', action: '困ったとき、声をかけやすい相手を一人思い浮かべてみましょう。', question: 'どんな助けがあれば、少し取り組みやすくなる？', color: '#719d98' },
};
export interface Item { id: string; domain: Domain; child: string; caregiver: string; reverse?: boolean }
export const items: Item[] = [
  {id:'m1',domain:'motivation',child:'勉強の中に、もう少し知りたいと思うことがある。',caregiver:'子どもが何に興味を持っているか、聞く機会をつくっている。'},
  {id:'m2',domain:'motivation',child:'学んだことが、自分にとってどう役に立つか考えることがある。',caregiver:'勉強する意味について、子ども自身の考えを聞いている。'},
  {id:'m3',domain:'motivation',child:'自分が気になったことを、調べたり試したりしている。',caregiver:'子どもが自分で調べたり試したりする時間を大切にしている。'},
  {id:'p1',domain:'planning',child:'勉強を始める前に、取り組むことを決めている。',caregiver:'子どもと相談して、無理のない勉強の進め方を考えている。'},
  {id:'p2',domain:'planning',child:'うまくいかないときは、勉強のやり方を変えてみる。',caregiver:'子どもがうまくいかないとき、別のやり方を一緒に考えている。'},
  {id:'p3',domain:'planning',child:'何から始めるか決められず、時間が過ぎることがある。',caregiver:'何を手助けすればよいか決められず、時間が過ぎることがある。',reverse:true},
  {id:'a1',domain:'agency',child:'勉強のやり方を、自分で選べている。',caregiver:'子どもは勉強のやり方を、自分で選べていると思う。'},
  {id:'a2',domain:'agency',child:'家の人に、自分の考えを聞いてもらえている。',caregiver:'子どもの考えを聞く時間をとれていると思う。'},
  {id:'a3',domain:'agency',child:'家の人と意見が違うときも、自分の希望を伝えられる。',caregiver:'意見が違うときも、子どもは自分の希望を伝えられていると思う。'},
  {id:'d1',domain:'dialogue',child:'家の人に、困っていることを話しやすい。',caregiver:'子どもは私に、困っていることを話しやすいと思う。'},
  {id:'d2',domain:'dialogue',child:'家の人は、話を最後まで聞いてくれる。',caregiver:'子どもの話を、最後まで聞けていると思う。'},
  {id:'d3',domain:'dialogue',child:'家の人と、勉強以外のことも気軽に話せる。',caregiver:'子どもと、勉強以外のことも気軽に話せていると思う。'},
  {id:'s1',domain:'strengths',child:'自分なりに工夫できたことに気づく。',caregiver:'自分なりに工夫できたかかわり方に気づく。'},
  {id:'s2',domain:'strengths',child:'自分のよいところを、一つ思い浮かべられる。',caregiver:'保護者としての自分のよいところを、一つ思い浮かべられる。'},
  {id:'s3',domain:'strengths',child:'小さなことでも、自分ができたことを認められる。',caregiver:'小さなことでも、自分ができたことを認められる。'},
  {id:'c1',domain:'connection',child:'わからないことを、誰かに聞くことができる。',caregiver:'子育てでわからないことを、誰かに聞くことができる。'},
  {id:'c2',domain:'connection',child:'自分のことを気にかけてくれる人がいると感じる。',caregiver:'自分のことを気にかけてくれる人がいると感じる。'},
  {id:'c3',domain:'connection',child:'一人で難しいとき、助けを頼める。',caregiver:'一人で難しいとき、助けを頼める。'},
];
export const courses = [
  {id:'basics', name:'はじめての自己理解', tag:'まずはここから', description:'学び方や気持ちを、いくつかの視点から。今の自分をゆっくり振り返ります。', minutes:'約3〜5分', domains:['motivation','planning','agency','dialogue'] as Domain[], icon:'sprout'},
  {id:'dialogue', name:'親子のコミュニケーション', tag:'気持ちをつなぐ', description:'自分で選ぶこと、気持ちを伝えること。親子それぞれの見え方を知るきっかけに。', minutes:'約2〜3分', domains:['agency','dialogue'] as Domain[], icon:'messages'},
  {id:'learning', name:'学習の進め方', tag:'小さな一歩を探す', description:'興味のあることや勉強の進め方から、自分に合う工夫を見つけます。', minutes:'約2〜3分', domains:['motivation','planning'] as Domain[], icon:'book'},
  {id:'strengths', name:'自分のよさとつながり', tag:'よさを見つける', description:'できていること、支えてくれる人。身近にある自分の資源に目を向けます。', minutes:'約2〜3分', domains:['strengths','connection'] as Domain[], icon:'sun'},
];
export const VERSION='original-demo-0.1';
export const SCORING_VERSION='mean-min-two-thirds-1.0';
export const RULESET_VERSION='reflection-draft-0.1';
export type Answers = Record<string, number | null>;
export interface Score { domain: Domain; value: number | null; answered: number; total: number; }
export interface Report { id: string; role: Role; courseId: string; createdAt: string; version: string; scoringVersion: string; rulesetVersion: string; scores: Score[]; flags: string[]; sample: boolean; }
export function courseItems(courseId: string) { const c=courses.find(c=>c.id===courseId); if(!c)throw new Error('Unknown course'); return items.filter(i=>c.domains.includes(i.domain)); }
export function scoreAnswers(courseId: string, answers: Answers, durationSeconds = 180) {
 const selected=courseItems(courseId); const allowed=new Set(selected.map(i=>i.id));
 for (const [key,value] of Object.entries(answers)) if (!allowed.has(key) || (value!==null && (!Number.isInteger(value) || value<1 || value>5))) throw new Error('Invalid answer');
 const values=Object.values(answers).filter((v):v is number=>v!==null);
 const flags: string[]=[];
 if(values.length<selected.length)flags.push('missing');
 if(values.length>=6 && new Set(values).size===1)flags.push('uniform');
 if(durationSeconds<selected.length*2)flags.push('short');
 const scores = [...new Set(selected.map(i=>i.domain))].map(domain=>{ const group=selected.filter(i=>i.domain===domain);const valid=group.filter(i=>typeof answers[i.id]==='number');return {domain,answered:valid.length,total:group.length,value:valid.length/group.length>=2/3?Math.round(valid.reduce((sum,i)=>sum+(i.reverse?6-answers[i.id]!:answers[i.id]!),0)/valid.length*100)/100:null};});
 return {scores, flags};
}
export function makeReport(role:Role,courseId:string,answers:Answers,duration=180):Report { return {id:crypto.randomUUID(),role,courseId,createdAt:new Date().toISOString(),version:VERSION,scoringVersion:SCORING_VERSION,rulesetVersion:RULESET_VERSION,...scoreAnswers(courseId,answers,duration),sample:false}; }
export function validGrant(grant:{expiresAt:string;revokedAt?:string|null}, now=Date.now()) {return !grant.revokedAt && Date.parse(grant.expiresAt)>now;}
export function commonScopes(child: Domain[], parent: Domain[]):Domain[]{return child.filter(d=>parent.includes(d)&&['agency','dialogue'].includes(d));}
export function mayViewShare(grant:{ownerId:string;viewerId:string;expiresAt:string;revokedAt?:string|null},viewerId:string,now=Date.now()){return grant.viewerId===viewerId&&validGrant(grant,now);}
export function canPublishScale(s:{rightsApproved:boolean;ethicsApproved:boolean;ageMin:number;ageMax:number;status:string},age:number){return s.rightsApproved&&s.ethicsApproved&&s.status==='published'&&age>=s.ageMin&&age<=s.ageMax;}
export function comparable(a:Report,b:Report,domain:Domain){return a.role===b.role&&a.version===b.version&&a.scoringVersion===b.scoringVersion&&a.scores.some(s=>s.domain===domain)&&b.scores.some(s=>s.domain===domain);}
export function canShowAggregate(n:number,rare=false){return Number.isInteger(n)&&n>=(rare?20:10);}
export function csvCell(value:unknown){let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function csv(rows:unknown[][]){return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
