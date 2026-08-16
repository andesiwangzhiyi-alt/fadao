/* ============ 法渡 · 法考学习工具 v0.1 ============ */
/* 题库数据来源：竹马法考真题库（题目/答案/解析），仅供个人学习使用 */
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const LS_KEY='fadao_v1';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function fmtDate(offset){const d=new Date(Date.now()+offset*86400000);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function shuffle(a){const r=[...a];for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}
function mulberry32(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seededShuffle(a,seed){const rnd=mulberry32(seed);const r=[...a];for(let i=r.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function toast(msg,type){const t=$('#toast');t.textContent=msg;t.className='toast '+(type||'');t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),2200);}

/* ---------- 题库 ---------- */
Object.assign(QUESTION_BANK, QUESTION_BANK2 || {});
const MODS=Object.keys(QUESTION_BANK);
const PALETTE=['#1a2f4a','#2f5d8a','#8a3a2f','#2f6b4f','#6b3a8a','#8a6b2f','#2f8a8a','#a0522d','#4a6b8a','#7a2f4a','#3a7a2f','#8a4a2f','#2f4a6b','#6b8a2f','#8a2f6b','#4a8a6b','#2f6b6b','#8a2f2f'];
const MOD_COLOR={}; MODS.forEach((m,i)=>MOD_COLOR[m]=PALETTE[i%PALETTE.length]);
const MOD_ICO={}; MODS.forEach((m,i)=>MOD_ICO[m]=['⚖️','📜','🏛️','📗','📘','📙','📕','📔','📓','📒','📑','🧾','🗂️','📎','⚖️','📜','🏛️','📗'][i%18]);
const QTYPE_WEIGHT={单选题:0.5,多选题:0.35,不定项:0.15}; // 法考客观题结构
function allQuestions(){return MODS.flatMap(m=>QUESTION_BANK[m].map(q=>({...q,mod:m})));}

/* ---------- 数据操作 ---------- */
const DEF={wrongs:{},checkins:{},stats:{answered:0,correct:0,byMod:{},daily:[]},favs:[],pomo:{count:0,minutes:0},settings:{dailyCount:10,reviewOn:true}};
let store=load();
function load(){try{const d=JSON.parse(localStorage.getItem(LS_KEY));return Object.assign({},DEF,d||{},{stats:Object.assign({},DEF.stats,(d||{}).stats),settings:Object.assign({},DEF.settings,(d||{}).settings)});}catch(e){return JSON.parse(JSON.stringify(DEF));}}
function save(){localStorage.setItem(LS_KEY,JSON.stringify(store));}
function recordResult(q,picked,correct){
  store.stats.answered++;correct&&store.stats.correct++;
  const bm=store.stats.byMod[q.mod]=store.stats.byMod[q.mod]||{answered:0,correct:0};
  bm.answered++;correct&&bm.correct++;
  if(!correct){const w=store.wrongs[q.id]=store.wrongs[q.id]||{count:0,mastered:false,lastWrong:''};w.count++;w.mastered=false;w.lastWrong=today();}
  store.checkins[today()]=store.checkins[today()]||{answered:0,correct:0};
  store.checkins[today()].answered++;correct&&store.checkins[today()].correct++;
  const td=store.stats.daily;const last=td[td.length-1];
  if(last&&last.date===today()){last.answered++;correct&&last.correct++;}else td.push({date:today(),answered:1,correct:correct?1:0});
  if(td.length>60)td.shift();
  save();
}
function streakDays(){let n=0;const d=new Date();while(true){const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;if(store.checkins[k]){n++;d.setDate(d.getDate()-1);}else break;}return n;}
function reviewDue(){
  if(!store.settings.reviewOn)return[];
  const days={1:1,2:2,3:4,4:7,5:15};const out=[];
  for(const qid in store.wrongs){const w=store.wrongs[qid];if(w.mastered||!w.lastWrong)continue;
    const gap=Math.floor((Date.now()-new Date(w.lastWrong).getTime())/86400000);
    if(days[gap]===undefined)continue;
    const q=allQuestions().find(x=>x.id===qid);
    if(q&&(w.count<=5||gap>=7))out.push(q);}
  return out;
}

/* ---------- 视图路由 ---------- */
const VIEWS=['dashboard','practice','daily','exam','wrongbook','laws','more'];
function switchTab(v){VIEWS.forEach(x=>{$$(`.tab[data-view="${x}"]`)[0].classList.toggle('active',x===v);});renderView(v);}
function renderView(v){
  $('#streakBadge').innerHTML=`🔥 <b>${streakDays()}</b>天`;
  if(v==='dashboard')renderDash();
  else if(v==='practice')renderPractice();
  else if(v==='daily')renderDaily();
  else if(v==='exam')renderExamConfig();
  else if(v==='wrongbook')renderWrong();
  else if(v==='laws')renderLaws();
  else if(v==='more')renderMore();
}

/* ============ 法条库 ============ */
function renderLaws(q){
  const kw=(q||'').trim();
  const laws=typeof LAW_BANK!=='undefined'?LAW_BANK:[];
  let flat=[];
  laws.forEach(l=>{(l.sections||[]).forEach(s=>{if(s.content)flat.push({law:l.title,title:s.title,content:s.content,id:s.id});});});
  const show=kw?flat.filter(f=>f.content.includes(kw)||f.title.includes(kw)||f.law.includes(kw)):flat.slice(0,40);
  $('#view').innerHTML=`
  <div class="card"><h3><span class="dot"></span>权威法条库</h3>
    <div class="muted mb10">共 ${laws.length} 部领域 ${flat.length} 条法规章节（宪法/民法典/刑法/刑诉/民诉/行政法/商法，含核心司法解释）。输入关键词或法条号检索。</div>
    <div class="field"><input id="lawSearch" placeholder="🔍 检索法条（如：正当防卫 / 民法典 第1254条）" value="${esc(kw)}" oninput="renderLaws(this.value)"></div>
    <div class="muted mt8">${kw?`找到 ${show.length} 条`:'显示前 40 条'}</div>
  </div>
  ${show.slice(0,50).map(f=>`<div class="sl-item"><div class="sl-title"><span>📜 ${f.law} · ${f.title}</span></div>
    <div class="sl-body law-body">${esc(f.content).slice(0,500)}${f.content.length>500?'…':''}</div></div>`).join('')}`;
}

/* ============ 首页 ============ */
function renderDash(){
  const b=store.stats;const acc=b.answered?Math.round(b.correct/b.answered*100):0;
  const mods=Object.keys(store.stats.byMod);
  const topMods=mods.map(m=>{const x=store.stats.byMod[m];return{m,p:x.answered?Math.round(x.correct/x.answered*100):0,n:x.answered};}).sort((a,b)=>a.p-b.p).slice(0,3);
  const due=reviewDue();
  $('#view').innerHTML=`
  <div class="card"><h3><span class="dot"></span>欢迎回来，法考人</h3>
    <div class="muted mb10">今天是 ${today()} · 距离 2026 法考客观题（9月12-13日）还有 <b>${Math.max(0,Math.ceil((new Date('2026-09-12')-new Date())/86400000))} 天</b>。按规律刷题、吃透选项、主客一体，稳扎稳打。</div>
    <div class="dash-grid">
      <div class="dash-cell"><b>${b.answered}</b><span>已做题</span></div>
      <div class="dash-cell"><b>${acc}%</b><span>正确率</span></div>
      <div class="dash-cell"><b>${Object.keys(store.checkins).length}</b><span>打卡天数</span></div>
      <div class="dash-cell"><b>${due.length}</b><span>待复习</span></div>
    </div>
  </div>
  <div class="card"><h3><span class="dot"></span>今日推荐</h3>
    <div class="btn-row">
      <button class="btn primary" onclick="startQuiz(makeDaily(),'每日一练 · '+makeDaily().length+'题')">📅 每日一练</button>
      <button class="btn gold" onclick="startQuiz(shuffle(allQuestions().filter(q=>q.tag==='不定项')).slice(0,10),'不定项专项 10 题')">🎯 不定项专项</button>
      <button class="btn" onclick="startQuiz(shuffle(allQuestions().filter(q=>q.mod==='刑法'||q.mod==='民法')).slice(0,10),'刑法+民法 10 题')">⚖️ 刑法民法</button>
    </div>
    ${topMods.length?`<div class="muted mt8">薄弱模块：${topMods.map(m=>`<span class="tag" style="background:${MOD_COLOR[m.mod]}22;color:${MOD_COLOR[m.mod]}">${m.mod} ${m.p}%</span>`).join(' ')}</div>`:''}
  </div>
  <div class="card"><h3><span class="dot"></span>法考刷题心法</h3>
    <div class="muted">
      • 客观题要"吃透选项"：每个选项都要说出对错理由<br>
      • 多选/不定项漏选不得分，宁少勿错<br>
      • 真题三轮：按科目→按考点→按年份套卷<br>
      • 错题按考点复盘，不只看答案</div>
  </div>`;
}

/* ============ 刷题 ============ */
function renderPractice(filter){
  $('#view').innerHTML=`
  <div class="card"><h3><span class="dot"></span>选择部门法开始刷题</h3>
    <div class="muted mb10">共 ${allQuestions().length} 题（${MODS.length} 个部门法）· 含逐选项解析</div>
    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn small ${!filter?'primary':''}" onclick="renderPractice()">全部</button>
      <button class="btn small ${filter==='单选题'?'primary':''}" onclick="renderPractice('单选题')">单选</button>
      <button class="btn small ${filter==='多选题'?'primary':''}" onclick="renderPractice('多选题')">多选</button>
      <button class="btn small ${filter==='不定项'?'primary':''}" onclick="renderPractice('不定项')">不定项</button>
    </div>
    <div class="mod-list">
      ${MODS.map(m=>{const qs=QUESTION_BANK[m];const fl=filter?qs.filter(q=>q.tag===filter):qs;if(!fl.length)return'';
        const b=store.stats.byMod[m]||{answered:0,correct:0};const p=b.answered?Math.round(b.correct/b.answered*100):0;
        return `<button class="mod-card" onclick="startModPractice('${m}','${filter||''}')">
        <span class="mi" style="background:${MOD_COLOR[m]}22">${MOD_ICO[m]}</span>
        <span class="mt"><b>${m}${b.answered?`<span class="acc">${p}%</span>`:''}</b><span>${fl.length} 题 · 含解析</span></span></button>`;}).join('')}
    </div>
  </div>`;
}
function quickStart(which){
  if(which==='random')startQuiz(shuffle(allQuestions()).slice(0,15),'全题库随机 15 题');
}
function startModPractice(m,filter){
  const qs=(QUESTION_BANK[m]||[]).filter(q=>!filter||q.tag===filter);
  if(!qs.length){toast('该分类暂无题目','error');return;}
  startQuiz(shuffle(qs),`${m} · ${filter||'顺序'}练习 · ${qs.length}题`);
}

/* ============ 每日一练 ============ */
function makeDaily(){
  const seed=Number(today().replace(/-/g,''));
  const plan={刑法:1,民法:2,刑事诉讼法:1,民事诉讼法与仲裁制度:1,行政法与行政诉讼法:1,商法:1,经济法:1,理论法:0,宪法:1,法理学:1};
  let out=[];
  MODS.forEach(m=>{out=out.concat(seededShuffle(QUESTION_BANK[m],seed+m.length).slice(0,plan[m]||0));});
  return seededShuffle(out,seed).slice(0,10);
}
function renderDaily(){
  const seed=Number(today().replace(/-/g,''));const qs=makeDaily();const t=today();const ci=store.checkins[t]||{};
  const best=ci.answered?`${ci.correct}/${ci.answered}`:'未完成';
  $('#view').innerHTML=`
  <div class="card">
    <h3><span class="dot"></span>每日一练 · ${t}</h3>
    <div class="muted">每天 10 题（按日期生成，当天题目不变）：刑法/民法/两大诉讼法/行政法/商经 交叉训练，保持手感。</div>
    <div class="mt14" style="display:flex;gap:10px;align-items:center">
      <button class="btn primary" onclick="startQuiz(makeDaily(),'每日一练 · '+makeDaily().length+'题')">开始今日练习 (${qs.length}题)</button>
      <span class="pill">今日成绩：${best}</span>
    </div>
  </div>
  <div class="card"><h3><span class="dot"></span>本周打卡</h3><div class="cal-wrap"><div class="weekdays">${'一二三四五六日'.split('').map((w,i)=>`<span>${w}</span>`).join('')}</div><div class="cal-grid">${weekStrip()}</div></div></div>`;
}
function weekStrip(){
  const t=new Date();const dow=(t.getDay()+6)%7;let html='';
  for(let i=6;i>=0;i--){const d=new Date(Date.now()-(dow+i)*86400000);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const done=!!store.checkins[key];const isT=key===today();
    html+=`<div class="cal-cell ${done?'done':''} ${isT?'today':''}">${d.getDate()}</div>`;}
  return html;
}

/* ============ 模拟考试 ============ */
function renderExamConfig(){
  $('#view').innerHTML=`
  <div class="card"><h3><span class="dot"></span>模拟考试</h3>
    <div class="muted mb10">按法考客观题结构组卷：单选/多选/不定项 ≈ 50:35:15，跨部门法混合计时作答，交卷出成绩单。</div>
    <div class="exam-config mt14">
      <div class="ec" onclick="examQuick(20)"><b>20题</b><span>20分钟 · 快速自测</span></div>
      <div class="ec" onclick="examQuick(50)"><b>50题</b><span>50分钟 · 半套</span></div>
      <div class="ec" onclick="examQuick(100)"><b>100题</b><span>100分钟 · 标准卷</span></div>
      <div class="ec" onclick="renderExamCustom()"><b>自定义</b><span>自选题量/时间</span></div>
    </div>
  </div>
  <div class="card"><h3><span class="dot"></span>客观题应试技巧</h3><div class="muted">
    • 单选 50 题每题 1 分，是得分基本盘，正确率保 80%+<br>
    • 多选/不定项漏选、错选均不得分，不确定就保守<br>
    • 卷一（公法）与卷二（私法）各 150 分，180 分及格<br>
    • 时间分配：单选 ≤40s，多选/不定项 ≤90s</div>
  </div>`;
}
function examQuick(n){startQuiz(makeExam(n),`模拟考试 · ${n}题/${n}分钟`,n*60);}
function renderExamCustom(){
  $('#view').innerHTML=`
  <div class="card"><h3><span class="dot"></span>自定义模考</h3>
    <div class="field"><label>题目数量（10-100）</label><input id="exN" type="number" min="10" max="100" value="50"></div>
    <div class="field"><label>考试时长（分钟）</label><input id="exT" type="number" min="5" max="150" value="50"></div>
    <button class="btn primary" onclick="examCustom()">开始考试</button>
  </div>`;
}
function examCustom(){const n=+$('#exN').value,t=+$('#exT').value;startQuiz(makeExam(n),`模拟考试 · ${n}题/${t}分钟`,t*60);}
function makeExam(n){
  const single=Math.round(n*0.5),multi=Math.round(n*0.35),indef=n-single-multi;
  const pick=(tag,cnt)=>{const pool=allQuestions().filter(q=>q.tag===tag);const out=[];const seen=new Set();
    for(let i=0;i<cnt&&out.length<cnt;i++){const q=pool[Math.floor(Math.random()*pool.length)];if(seen.has(q.id))continue;seen.add(q.id);out.push(q);}return out;};
  let out=[...pick('单选题',single),...pick('多选题',multi),...pick('不定项',indef)];
  return shuffle(out).slice(0,n);
}

/* ============ 错题本 ============ */
function wrongList(){const ids=Object.keys(store.wrongs).filter(id=>!store.wrongs[id].mastered);return allQuestions().filter(q=>ids.includes(q.id));}
function renderWrong(){
  const list=wrongList();const tot=Object.keys(store.wrongs).length;
  $('#view').innerHTML=`
  <div class="card"><h3><span class="dot"></span>错题本</h3>
    <div class="muted mb10">答错的题自动收录，共 ${tot} 题（待重练 ${list.length} 题）。按艾宾浩斯遗忘曲线安排复习，掌握后可标记移除。</div>
    <div class="btn-row">
      <button class="btn primary" onclick="startQuiz(shuffle(list),'错题重练 · '+list.length+'题')">重练全部错题 (${list.length})</button>
      <button class="btn" onclick="renderWrongByMod()">按部门法筛选</button>
    </div>
  </div>
  ${list.length===0?`<div class="empty"><span class="big">🎉</span>太棒了，没有待重练的错题！<br><span class="muted">继续刷题保持手感吧</span></div>`:
  `<div class="card"><h3><span class="dot"></span>错题列表（${list.length}）</h3>
   ${list.slice(0,50).map(q=>{const w=store.wrongs[q.id];
     return `<div class="wrong-item"><div class="wt">${esc(q.stem).slice(0,60)}…</div>
     <div class="wm"><span class="tag">${q.mod}</span><span class="tag" style="color:${MOD_COLOR[q.mod]}">${q.tag}</span><span class="tag">错${w.count}次</span><span class="tag">${w.lastWrong}</span>
     <button class="btn small" style="margin-left:auto" onclick="startQuiz([allQuestions().find(x=>x.id==='${q.id}')],'单题精练')">重练</button>
     <button class="btn small green" onclick="markMastered('${q.id}')">已掌握 ✓</button></div></div>`;}).join('')}
  </div>`}`;
}
function renderWrongByMod(){
  const list=wrongList();const byMod={};
  list.forEach(q=>{(byMod[q.mod]=byMod[q.mod]||[]).push(q);});
  $('#view').innerHTML=`
  <div class="card"><h3><span class="dot"></span>按部门法重练</h3><button class="btn small" onclick="renderWrong()" style="margin-bottom:10px">← 返回错题本</button>
    <div class="mod-list">${Object.keys(byMod).map(m=>`<button class="mod-card" onclick="startModPractice('${m}','')"><span class="mi">${MOD_ICO[m]}</span><span class="mt"><b>${m}</b><span>${byMod[m].length} 题待重练</span></span></button>`).join('')}
    </div></div>`;
}
function markMastered(qid){store.wrongs[qid].mastered=true;save();toast('已标记掌握 ✅','ok');renderWrong();}

/* ============ 更多 ============ */
function renderMore(){
  const due=reviewDue();
  $('#view').innerHTML=`
  <div class="card"><h3><span class="dot"></span>打卡日历</h3>
    <div class="muted mb10">连续打卡 ${streakDays()} 天，共打卡 ${Object.keys(store.checkins).length} 天。每天首次完成练习即自动打卡。</div>
    <div class="cal-wrap"><div class="weekdays">${'一二三四五六日'.split('').map(w=>`<span>${w}</span>`).join('')}</div><div class="cal-grid">${heatmap()}</div></div>
  </div>
  <div class="card"><h3><span class="dot"></span>🍅 番茄专注钟</h3>
    <div class="pomo-circle" id="pomoC"><div class="pomo-time" id="pomoT">25:00</div></div>
    <div class="pomo-state" id="pomoS">工作 25 分钟 · 休息 5 分钟</div>
    <div class="btn-row">
      <button class="btn primary" id="pomoBtn" onclick="pomoToggle()">开始专注</button>
      <button class="btn" onclick="pomoReset()">重置</button>
    </div>
    <div class="center muted mt8">今日已完成 <b id="pomoCnt">${store.pomo.count}</b> 个番茄 · 累计专注 <b>${store.pomo.minutes}</b> 分钟</div>
  </div>
  <div class="card"><h3><span class="dot"></span>复习与提醒</h3>
    <div class="list-row"><div><div class="l-title">艾宾浩斯复习提醒</div><div class="l-sub">错题按 1/2/4/7/15 天提醒复习，今日 ${due.length} 题</div></div>
    <div class="switch ${store.settings.reviewOn?'on':''}" onclick="toggleReview()"></div></div>
  </div>
  <div class="card"><h3><span class="dot"></span>📚 外部资源（法考）</h3>
    <div class="muted mb10">以下为全网公开的法考资源，点开即可使用：</div>
    <div class="sl-item"><div class="sl-title"><span>⚖️ 竹马法考（众合）</span></div>
      <div class="sl-body">免费真题刷题：客观题/主观题题库、错题本、模拟机考（1:1 还原司法部机考系统）。本题库即源自竹马真题数据。</div>
      <div class="btn-row"><button class="btn small primary" onclick="openUrl('https://www.zhumavip.com/w/questionBank')">打开竹马题库</button></div>
    </div>
    <div class="sl-item"><div class="sl-title"><span>🏛️ 司法部机考模拟答题系统（官方）</span></div>
      <div class="sl-body">官方客观题/主观题机考模拟系统，含电子法条检索，考前务必练手感。</div>
      <div class="btn-row"><button class="btn small primary" onclick="openUrl('https://www.moj.gov.cn')">打开司法部官网</button></div>
    </div>
    <div class="sl-item"><div class="sl-title"><span>📱 觉晓法考</span></div>
      <div class="sl-body">主客一体备考，主观题 AI 批改（采分点级）、免费题库、记忆曲线背诵。</div>
      <div class="btn-row"><button class="btn small primary" onclick="openUrl('https://www.juexiao.cn')">觉晓官网</button></div>
    </div>
    <div class="sl-item"><div class="sl-title"><span>📖 学法网</span></div>
      <div class="sl-body">法考论坛，历年真题回忆版、经验帖、资料分享。</div>
      <div class="btn-row"><button class="btn small primary" onclick="openUrl('https://www.xuefa.com')">打开学法网</button></div>
    </div>
  </div>
  <div class="card"><h3><span class="dot"></span>数据管理</h3>
    <div class="btn-row">
      <button class="btn" onclick="exportData()">📤 导出备份</button>
      <button class="btn" onclick="document.getElementById('importFile').click()">📥 导入备份</button>
      <button class="btn red" onclick="confirmReset()">🗑 清空数据</button>
      <input type="file" id="importFile" accept=".json" class="hidden" onchange="importData(this)">
    </div>
    <div class="muted mt8">数据保存在浏览器本地（localStorage），导出为 JSON 文件可随时恢复或迁移到其他设备。</div>
  </div>
  <div class="card"><h3><span class="dot"></span>关于</h3>
    <div class="muted">法渡 v0.1 — 法考学习工具（参考粉笔AI训练营思路）。题库来自竹马法考真题（2016-2025，含逐选项解析），仅供个人学习。祝你 2026 一战而过！🎉</div>
  </div>`;
}
function heatmap(){
  const t=new Date();const todayIdx=(t.getDay()+6)%7;const totalDays=16*7;
  const start=new Date(Date.now()-(totalDays-1)*86400000);let html='';
  for(let week=0;week<16;week++){
    for(let d=0;d<7;d++){
      const date=new Date(start.getTime()+(week*7+d)*86400000);
      const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const ci=store.checkins[key];
      const level=ci?(ci.answered>=10?3:ci.answered>=5?2:1):0;
      html+=`<div class="cal-cell ${level>0?'done':''}" style="opacity:${level?0.5+level*0.17:1}" title="${key} ${ci?ci.answered+'题':'未打卡'}">${date.getDate()}</div>`;
    }
  }
  return html;
}
function exportData(){
  const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`法渡备份_${today()}.json`;a.click();toast('备份已导出 ✅','ok');
}
function importData(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{try{const d=JSON.parse(e.target.result);
    if(!d.stats||!d.wrongs)throw 0;
    store=Object.assign({},DEF,d,{settings:Object.assign({},DEF.settings,d.settings)});
    save();toast('导入成功 ✅','ok');renderView('more');
  }catch(err){toast('备份文件格式不正确','error');}};
  reader.readAsText(f);
}
function confirmReset(){
  if(confirm('确定清空全部学习数据吗？此操作不可恢复，建议先导出备份。')){
    store=JSON.parse(JSON.stringify(DEF));save();renderView('more');toast('已清空');
  }
}
function toggleReview(){store.settings.reviewOn=!store.settings.reviewOn;save();renderMore();}

/* ============ 番茄钟 ============ */
let pomo={running:false,work:true,left:25*60,timer:null,total:25*60};
function pomoRender(){
  if(!$('#pomoT'))return;
  const m=String(Math.floor(pomo.left/60)).padStart(2,'0'),s=String(pomo.left%60).padStart(2,'0');
  $('#pomoT').textContent=`${m}:${s}`;
  const pct=pomo.left/pomo.total;
  $('#pomoC').style.background=`conic-gradient(var(--gold) ${pct*360}deg, #eef1f5 0deg)`;
  $('#pomoS').textContent=pomo.work?(pomo.running?'专注中…':'工作 25 分钟 · 休息 5 分钟'):'休息时间 ☕';
  $('#pomoBtn').textContent=pomo.running?'暂停':'开始专注';
  $('#pomoBtn').className='btn '+(pomo.work?'primary':'gold');
}
function pomoToggle(){
  if(pomo.running){pomo.running=false;clearInterval(pomo.timer);}
  else{pomo.running=true;pomo.timer=setInterval(()=>{
    pomo.left--;
    if(pomo.left<=0){
      if(pomo.work){store.pomo.count++;store.pomo.minutes+=25;save();$('#pomoCnt').textContent=store.pomo.count;toast('🍅 专注完成，休息 5 分钟吧！','ok');}
      else toast('休息结束，开始下一轮！');
      pomo.work=!pomo.work;
      pomo.left=pomo.work?25*60:5*60;pomo.total=pomo.left;
    }
    pomoRender();
  },1000);}
  pomoRender();
}
function pomoReset(){pomo={running:false,work:true,left:25*60,timer:null,total:25*60};pomoRender();}

/* ============ 答题引擎（支持单选/多选/不定项） ============ */
let Q={list:[],idx:0,answers:{},pending:[],marks:{},mode:'practice',start:0,limit:0,timer:null,elapsed:0};
function isSingle(q){return q.tag==='单选题';}
function isCorrect(q,picked){
  if(!picked||!picked.length)return false;
  const a=[...(q.answer||[])].sort((x,y)=>x-y);
  const p=[...picked].sort((x,y)=>x-y);
  return a.length===p.length&&a.every((v,i)=>v===p[i]);
}
function startQuiz(list,title,seconds){
  Q={list,idx:0,answers:{},pending:[],marks:{},mode:'practice',start:Date.now(),limit:seconds||0,timer:null,elapsed:0};
  $('#quizTitle').textContent=title;
  $('#resultLayer').classList.add('hidden');
  $('#quizLayer').classList.remove('hidden');
  document.body.style.overflow='hidden';
  if(seconds){Q.timer=setInterval(()=>{Q.elapsed++;const left=seconds-Q.elapsed;
    $('#quizTimer').textContent='⏱ '+fmtClock(Math.max(0,left));
    if(left<=0){clearInterval(Q.timer);Q.timer=null;finishQuiz(true);}
  },1000);}
  renderQ();
}
function fmtClock(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function renderQ(){
  const q=Q.list[Q.idx];if(!q)return;
  $('#quizProgress').textContent=`${Q.idx+1}/${Q.list.length}`;
  const chosen=Q.answers[q.id];
  const pending=Q.pending||[];
  const single=isSingle(q);
  const answered=chosen!==undefined;
  $('#quizBody').innerHTML=`
  <div class="q-stem"><span class="q-tag" style="color:${MOD_COLOR[q.mod]}">${MOD_ICO[q.mod]} ${q.mod} · ${q.type||q.tag}${q.year?` · ${q.year}`:''}</span>
    <span class="q-tag" style="float:right;color:${q.tag==='单选题'?'#2f6b4f':q.tag==='多选题'?'#8a6b2f':'#8a3a2f'}">${q.tag}</span>
    <div class="q-text">${esc(q.stem)}</div></div>
  ${q.options.map((op,i)=>{
    let cls='q-opt';
    if(answered){
      const isA=(q.answer||[]).includes(i);
      const isP=(chosen||[]).includes(i);
      cls+=isA?' correct':(isP?' wrong':'');
    }else if(!single){
      cls+=pending.includes(i)?' pend':'';
    }
    const mark=answered?((isA(q,i)&&isP(q,i))?'✅':(isP(q,i)?'❌':(isA(q,i)?'<span class="miss">漏选</span>':''))):'';
    return `<button class="${cls}" onclick="pick(${i})"><span class="ol">${'ABCD'[i]}</span>${esc(op)}${mark?`<span class="mark">${mark}</span>`:''}</button>`;
  }).join('')}
  ${answered?`<div class="q-analy"><b>💡 解析：</b>${esc(q.analysis||'（本题暂无解析）')}</div>
    <div class="q-analy" style="background:var(--gold)14;border-color:var(--gold)55"><b>✅ 答案：</b>${(q.answer||[]).map(i=>'ABCD'[i]).join('、')} ${isCorrect(q,chosen)?'· 回答正确':'· 回答错误'}</div>`:''}
  ${!answered&&!single?`<button class="btn primary" style="width:100%;margin-top:12px" onclick="confirmPick()">确认答案（已选 ${pending.length} 项）</button>`:''}
  `;
  updateFoot();
  if(Q.limit){$('#quizTimer').textContent='⏱ '+fmtClock(Math.max(0,Q.limit-Q.elapsed));}
}
function isA(q,i){return (q.answer||[]).includes(i);}
function isP(q,i){return (Q.answers[q.id]||[]).includes(i);}
function updateFoot(){
  const q=Q.list[Q.idx];const chosen=Q.answers[q.id];
  const isLast=Q.idx===Q.list.length-1;
  const reviewing=Q.mode==='review';
  $('#footPrev').textContent=Q.idx>0?'上一题':'';
  $('#footPrev').style.visibility=Q.idx>0?'visible':'hidden';
  if(reviewing){
    $('#footMark').style.display='none';
    $('#footNext').textContent=isLast?'返回结果':'下一题';
    $('#footNext').className='btn primary';
    $('#footNext').onclick=()=>{if(isLast){$('#quizLayer').classList.add('hidden');document.body.style.overflow='';$('#resultLayer').classList.remove('hidden');}else{Q.idx++;renderReview();}};
    return;
  }
  $('#footMark').style.display='';
  $('#footMark').textContent=Q.marks[q.id]?'⚑ 取消标记':'⚑ 标记';
  $('#footNext').textContent=isLast?'交卷':'下一题';
  $('#footNext').className='btn primary';
  $('#footNext').onclick=nextQ;
}
function pick(i){
  const q=Q.list[Q.idx];
  if(Q.answers[q.id]!==undefined)return;
  if(isSingle(q)){
    Q.answers[q.id]=[i];
    recordResult(q,[i],isCorrect(q,[i]));
    renderQ();
  }else{
    const p=Q.pending.includes(i)?Q.pending.filter(x=>x!==i):[...Q.pending,i];
    Q.pending=p;
    renderQ();
  }
}
function confirmPick(){
  const q=Q.list[Q.idx];
  if(Q.answers[q.id]!==undefined)return;
  if(!Q.pending.length){toast('请先选择至少一个选项','error');return;}
  const p=[...Q.pending].sort((a,b)=>a-b);
  Q.answers[q.id]=p;
  recordResult(q,p,isCorrect(q,p));
  renderQ();
}
function nextQ(){if(Q.idx<Q.list.length-1){Q.idx++;Q.pending=[];renderQ();}else finishQuiz();}
function prevQ(){if(Q.idx>0){Q.idx--;Q.pending=[];renderQ();}}
function markQ(){const id=Q.list[Q.idx].id;if(Q.answers[id]!==undefined)return;Q.marks[id]=!Q.marks[id];renderQ();}
function finishQuiz(forced){
  clearInterval(Q.timer);Q.timer=null;
  const total=Q.list.length;
  const answered=Object.keys(Q.answers).length;
  const correct=Q.list.filter(q=>isCorrect(q,Q.answers[q.id])).length;
  const unans=total-answered;
  $('#quizLayer').classList.add('hidden');
  document.body.style.overflow='';
  const acc=answered?Math.round(correct/answered*100):0;
  const mods={};Q.list.forEach(q=>{(mods[q.mod]=mods[q.mod]||{n:0,c:0});mods[q.mod].n++;if(isCorrect(q,Q.answers[q.id]))mods[q.mod].c++;});
  const tips=acc>=90?'状态极佳，保持！':acc>=75?'发挥稳定，查漏补缺更上一层楼':acc>=60?'基础尚可，错题本多复习':'别灰心，错题就是提分空间，复习后再来！';
  $('#resultBox').innerHTML=`
    <h3 style="color:var(--navy)">${forced?'⏰ 时间到 · 交卷':'✅ 答题完成'}</h3>
    <div class="r-score">${acc}<small>%</small></div>
    <div class="r-row">
      <div class="r-cell"><b>${correct}/${total}</b><span>答对/总题数</span></div>
      <div class="r-cell"><b>${unans}</b><span>未作答</span></div>
      <div class="r-cell"><b>${fmtClock(Q.elapsed)}</b><span>用时</span></div>
      <div class="r-cell"><b>✅</b><span>错题已入错题本</span></div>
    </div>
    <div class="center mb10">${Object.keys(mods).map(m=>{const p=Math.round(mods[m].c/mods[m].n*100);return `<span class="tag" style="background:${MOD_COLOR[m]}22;color:${MOD_COLOR[m]};font-weight:600">${m} ${p}%</span>`;}).join('')}</div>
    <div class="r-tip">💬 ${tips}</div>
    <div class="btn-row">
      <button class="btn primary" onclick="reviewQuiz()">🔍 逐题回顾</button>
      <button class="btn" onclick="closeResult()">完成</button>
    </div>`;
  $('#resultLayer').classList.remove('hidden');
}
function reviewQuiz(){
  $('#resultLayer').classList.add('hidden');
  Q.idx=0;Q.mode='review';
  $('#quizTitle').textContent='逐题回顾（含解析）';
  $('#quizLayer').classList.remove('hidden');
  document.body.style.overflow='hidden';
  renderReview();
}
function renderReview(){
  const q=Q.list[Q.idx];
  $('#quizProgress').textContent=`${Q.idx+1}/${Q.list.length}`;
  const chosen=Q.answers[q.id]||[];
  const ans=(q.answer||[]);
  $('#quizBody').innerHTML=`
  <div class="q-stem"><span class="q-tag" style="color:${MOD_COLOR[q.mod]}">${MOD_ICO[q.mod]} ${q.mod} · ${q.type||q.tag}</span>
    <span class="q-tag" style="float:right">${q.tag}</span>
    <div class="q-text">${esc(q.stem)}</div></div>
  ${q.options.map((op,i)=>{
    const isA=ans.includes(i),isC=chosen.includes(i);
    let cls='q-opt disabled'+(isA?' correct':(isC?' wrong':''));
    const mark=isA&&isC?'✅':(isC?'❌':(isA?'<span class="miss">漏选</span>':''));
    return `<div class="${cls}"><span class="ol">${'ABCD'[i]}</span>${esc(op)}${mark?`<span class="mark">${mark}</span>`:''}</div>`;
  }).join('')}
  <div class="q-analy"><b>💡 解析：</b>${esc(q.analysis||'（本题暂无解析）')}</div>
  <div class="q-analy" style="background:var(--gold)14;border-color:var(--gold)55"><b>✅ 正确答案：</b>${ans.map(i=>'ABCD'[i]).join('、')} · 你${chosen.length?'选了 '+chosen.map(i=>'ABCD'[i]).join('、')+(isCorrect(q,chosen)?'，回答正确':'，回答错误'):'未作答'}</div>`;
  updateFoot();
}
function reviewNav(dir){Q.idx+=dir;if(Q.idx<0)Q.idx=0;if(Q.idx>=Q.list.length)Q.idx=Q.list.length-1;renderReview();}
document.addEventListener('keydown',e=>{
  if($('#quizLayer').classList.contains('hidden'))return;
  if(e.key>='1'&&e.key<='4')pick(+e.key-1);
  else if(e.key==='Enter'&&Q.mode!=='review'&&Q.answers[Q.list[Q.idx].id]===undefined&&!isSingle(Q.list[Q.idx]))confirmPick();
  else if(e.key==='ArrowRight')Q.mode==='review'?reviewNav(1):nextQ();
  else if(e.key==='ArrowLeft')Q.mode==='review'?reviewNav(-1):prevQ();
});
$('#quizClose').onclick=function(){
  clearInterval(Q.timer);
  const answering=Q.mode!=='review'&&Object.keys(Q.answers).length<Q.list.length;
  if(answering&&!confirm('还有题目未作答，确定退出？'))return;
  $('#quizLayer').classList.add('hidden');document.body.style.overflow='';
};

/* 底部导航 */
$$('.tab').forEach(t=>t.onclick=()=>switchTab(t.dataset.view));

/* 初始化 */
window.closeResult=()=>{Q.mode='practice';$('#resultLayer').classList.add('hidden');renderView(currentView());};
function currentView(){const a=$('.tab.active');return a?a.dataset.view:'dashboard';}
window.pick=pick;window.confirmPick=confirmPick;window.nextQ=nextQ;window.prevQ=prevQ;window.markQ=markQ;
window.finishQuiz=finishQuiz;window.startQuiz=startQuiz;window.quickStart=quickStart;window.startModPractice=startModPractice;window.markMastered=markMastered;
window.renderWrongByMod=renderWrongByMod;window.renderExamConfig=renderExamConfig;
window.renderExamCustom=renderExamCustom;window.examCustom=examCustom;window.examQuick=examQuick;
window.renderLaws=renderLaws;
window.exportData=exportData;window.importData=importData;window.confirmReset=confirmReset;
window.openUrl=(u)=>{window.open(u,'_blank');};
window.toggleReview=toggleReview;window.pomoToggle=pomoToggle;window.pomoReset=pomoReset;
window.reviewQuiz=reviewQuiz;window.reviewNav=reviewNav;window.closeResult=closeResult;
pomoRender();
renderDash();
