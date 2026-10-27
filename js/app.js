// ── STATE ─────────────────────────────────────────────────────────────────────
// Holds only UI state and ids; report content is fetched from DataStore.
let state = { screen:"loading", user:null, reportId:null, tab:"summary", error:null };

function setState(patch){ Object.assign(state,patch); render(); }

// ── HELPERS ───────────────────────────────────────────────────────────────────
const C = {
  accent:"#2d7dd2",accentHi:"#4a9eff",muted:"#6b8299",
  green:"#38a169",yellow:"#d69e2e",orange:"#dd6b20",red:"#e53e3e",
  border:"#243447",card:"#1c2a3a",surface:"#162030",text:"#e8edf2"
};
const levelColor = {red:C.red,orange:C.orange,yellow:C.yellow};
const levelEmoji = {red:"🔴",orange:"🟠",yellow:"🟡"};
const typeColor  = {start:C.green,end:C.red,move:C.accent,stop:C.orange,change:"#805ad5",info:C.muted};
const typeIcon   = {start:"▶",end:"■",move:"→",stop:"⏸",change:"⇄",info:"i"};

// Escape every data value before it goes into innerHTML.
function esc(v){
  return String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function tag(text,color){
  const c=color||C.accent;
  return `<span class="tag" style="background:${c}22;color:${c};border:1px solid ${c}44">${esc(text)}</span>`;
}
function badge(status){
  const m={ok:["badge-ok","תקין"],warning:["badge-warning","חריגות"],alert:["badge-alert","התראה"]};
  const [cls,label]=(m[status]||["badge-ok","?"]);
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── SCREENS ───────────────────────────────────────────────────────────────────
function loadingHTML(){
  return `<div id="login-screen"><div class="login-box"><div class="login-sub">טוען נתונים…</div></div></div>`;
}

function errorHTML(msg){
  return `<div id="login-screen"><div class="login-box">
    <div class="login-err">שגיאה בטעינת הנתונים</div>
    <div class="login-footer">${esc(msg)}</div>
  </div></div>`;
}

function loginHTML(){
  return `
  <div id="login-screen">
    <div class="login-box" id="login-box">
      <div class="login-logo">
        <div class="login-icon">🛡️</div>
        <div class="login-title">הר ברכה</div>
        <div class="login-sub">פורטל ביטחון</div>
      </div>
      <div class="field-wrap">
        <div class="field-label">שם משתמש</div>
        <input class="field-input" id="inp-user" type="text" placeholder="הזן שם משתמש" autocomplete="username"/>
      </div>
      <div class="field-wrap">
        <div class="field-label">סיסמה</div>
        <input class="field-input" id="inp-pass" type="password" placeholder="הזן סיסמה" autocomplete="current-password"/>
      </div>
      <div class="login-err" id="login-err" style="display:none">שם משתמש או סיסמה שגויים</div>
      <button class="login-btn" onclick="doLogin()">כניסה למערכת</button>
      <div class="login-footer">גישה מורשית בלבד · הר ברכה</div>
    </div>
  </div>`;
}

function dashboardHTML(u, reports, stats){
  const statsHTML=[
    {label:"דוחות יומיים",val:stats.reportCount,icon:"📋",color:C.accent},
    {label:"חריגות השבוע",val:stats.totalAnomalies,icon:"⚠️",color:C.orange},
    {label:"ק\"מ השבוע",val:stats.totalKm,icon:"🛣️",color:C.green},
    {label:"סיירים פעילים",val:stats.activePatrollers,icon:"👤",color:"#805ad5"},
  ].map(s=>`
    <div class="stat-card" style="border-top:2px solid ${s.color}">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-val" style="color:${s.color}">${esc(s.val)}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join("");

  const reportsHTML=reports.map(r=>`
    <div class="report-card" data-report-id="${esc(r.id)}">
      <div class="report-card-left">
        <div class="report-card-meta">
          <span class="report-date">${esc(r.date)}</span>
          ${tag(r.shift==="יום"?"☀️ יום":"🌙 לילה")}
          ${badge(r.status)}
        </div>
        <div class="report-summary">${esc(r.summary)}</div>
      </div>
      <div class="report-card-right">
        <div class="stat-mini">
          <div class="stat-mini-val" style="color:${C.accentHi}">${esc(r.km)}</div>
          <div class="stat-mini-label">ק"מ</div>
        </div>
        <div class="stat-mini">
          <div class="stat-mini-val" style="color:${r.highAnomalies?C.orange:C.green}">${esc(r.anomalies)}</div>
          <div class="stat-mini-label">חריגות</div>
        </div>
        <div class="arrow">←</div>
      </div>
    </div>`).join("");

  const addCard=u.role==="admin"?`<div class="add-card">+ העלאת דוח חדש (בקרוב)</div>`:"";

  return `
  <div class="topbar">
    <div class="topbar-left">
      <span style="font-size:20px">🛡️</span>
      <div><span class="topbar-title">הר ברכה</span><span class="topbar-sub">· פורטל ביטחון</span></div>
    </div>
    <div class="topbar-right">
      <span class="topbar-user">${esc(u.label)} · <strong>${esc(u.username)}</strong></span>
      <button class="btn-ghost" onclick="doLogout()">יציאה</button>
    </div>
  </div>
  <div class="page">
    <div class="stats-grid">${statsHTML}</div>
    <div class="section-header">
      <div class="section-title">דוחות יומיים</div>
      <div class="section-hint">לחץ על דוח לצפייה</div>
    </div>
    <div class="report-list">${reportsHTML}</div>
    ${addCard}
  </div>`;
}

function vehicleCardHTML(v, r){
  if(!v.active){
    return `
        <div class="v-card" style="border-right:3px solid ${C.muted}">
          <div class="v-card-title">${esc(v.name)}</div>
          <div class="v-card-val" style="color:${C.muted}">ללא פעילות</div>
          <div class="v-card-sub">${esc(v.note)}</div>
        </div>`;
  }
  return `
        <div class="v-card" style="border-right:3px solid ${C.accent}">
          <div class="v-card-title">${esc(v.name)}</div>
          <div class="v-card-val" style="color:${C.accentHi}">פעיל</div>
          <div class="v-card-sub">${esc(v.km)} ק"מ · ${esc(r.patrols)} סיירים</div>
          <div class="progress-bar-wrap"><div class="progress-bar" style="width:${Number(v.engineOn)||0}%"></div></div>
          <div class="progress-label">מנוע דולק ${esc(v.engineOn)}% · כבוי ${esc(v.engineOff)}%</div>
        </div>`;
}

function reportHTML(r, t, isAdmin){
  const tabs=[["summary","סיכום"],["anomalies","חריגות"],["timeline","ציר זמן"],["coverage","כיסוי"]];
  if(isAdmin) tabs.push(["patrols","סיירים"]);

  const tabBtns=tabs.map(([k,l])=>`<button class="tab-btn${t===k?" active":""}" onclick="setTab('${k}')">${l}</button>`).join("");

  let content="";

  if(t==="summary"){
    const findings=r.findings.map(f=>`<div class="finding"><span class="finding-icon">${esc(f.icon)}</span><span class="finding-text">${esc(f.text)}</span></div>`).join("");
    content=`
      <div class="two-col">${r.vehicles.map(v=>vehicleCardHTML(v,r)).join("")}
      </div>
      <div class="findings-card">
        <div class="findings-header">ממצאים עיקריים</div>
        <div class="findings-body">${findings}</div>
      </div>`;
  }

  if(t==="anomalies"){
    const cards=r.anomalyList.map(a=>{
      const c=levelColor[a.level]||C.muted;
      return `<div class="anomaly-card" style="border-right:3px solid ${c}">
        <div class="anomaly-top">
          <div class="anomaly-badge" style="color:${c}">${levelEmoji[a.level]||""} עצירה חריגה &nbsp;${tag(a.location,c)}</div>
          <div class="anomaly-time">${esc(a.time)}</div>
        </div>
        <div class="anomaly-details">
          <span>משך: <strong>${esc(a.duration)}</strong></span>
          <span>מנוע: <strong>${esc(a.engine)}</strong></span>
        </div>
      </div>`;}).join("");
    const th=r.anomalyThreshold;
    content=`
      <div class="anomaly-alert" style="background:${C.red}15;border:1px solid ${C.red}44;color:${C.red}">
        ⚠️ ${esc(r.anomalies)} חריגות זוהו במשמרת זו – כל החריגות הן עצירות מעל ${esc(th.minutes)} דקות (${esc(th.label)})
      </div>${cards}`;
  }

  if(t==="timeline"){
    const rows=r.timeline.map(item=>{
      const c=typeColor[item.type]||C.muted;
      return `<div class="tl-row">
        <div class="tl-time">${esc(item.time)}</div>
        <div class="tl-dot-col">
          <div class="tl-line"></div>
          <div class="tl-dot" style="background:${c};box-shadow:0 0 6px ${c}"></div>
        </div>
        <div class="tl-event">
          <span class="tl-icon" style="color:${c}">${typeIcon[item.type]||""}</span>
          <span>${esc(item.event)}</span>
        </div>
      </div>`;}).join("");
    content=`<div class="tl-card"><div class="tl-header">ציר זמן מבצעי</div>${rows}</div>`;
  }

  if(t==="coverage"){
    const items=r.coverage.map(z=>`
      <div class="coverage-item" style="border:1px solid ${C.green}33;border-right:3px solid ${C.green}">
        <span style="color:${C.green}">✓</span>
        <span style="font-weight:600">${esc(z)}</span>
      </div>`).join("");
    const note=r.coverageComplete
      ? `<div class="info-box" style="background:${C.accent}15;border:1px solid ${C.accent}33;color:${C.accentHi}">ℹ️ כל אזורי הגזרה כוסו במהלך המשמרת</div>`
      : `<div class="info-box" style="background:${C.orange}15;border:1px solid ${C.orange}33;color:${C.orange}">⚠️ לא כל אזורי הגזרה כוסו במהלך המשמרת</div>`;
    content=`
      <div class="coverage-grid">${items}</div>
      ${note}`;
  }

  if(t==="patrols" && isAdmin){
    const cards=r.patrolDetails.map(p=>`
      <div class="patrol-card">
        <div class="patrol-header" style="background:rgba(45,125,210,0.1)">
          <div>
            <div class="patrol-name">${esc(p.name)}</div>
            <div class="patrol-time">${esc(p.start)} – ${esc(p.end)} · ${esc(p.duration)}</div>
          </div>
          <div class="patrol-km">${esc(p.km)} ק"מ</div>
        </div>
        <div class="patrol-body">
          <div class="zones">${p.zones.map(z=>tag(z)).join("")}</div>
        </div>
      </div>`).join("");
    content=`${cards}
      <div class="admin-note" style="background:${C.yellow}15;border:1px solid ${C.yellow}33;color:${C.yellow}">
        🔒 מידע זה מוצג לרכז ביטחון בלבד
      </div>`;
  }

  return `
  <div class="report-header">
    <div class="report-topbar">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn-ghost" onclick="goBack()">← חזרה</button>
        <span style="font-size:12px;color:${C.muted}">🛡️ הר ברכה · פורטל ביטחון</span>
      </div>
      ${badge(r.status)}
    </div>
    <div class="report-meta">
      <div class="report-meta-top">
        <div>
          <div class="report-kicker">דוח מבצעי יומי</div>
          <div class="report-title">${esc(r.date)} · משמרת ${esc(r.shift)}</div>
          <div class="report-subtitle">${esc(r.shiftHours)} · ${esc(r.vehicle)}</div>
        </div>
        <div class="report-stats">
          <div class="rstat"><div class="rstat-val" style="color:${C.accentHi}">${esc(r.km)} ק"מ</div><div class="rstat-label">מרחק</div></div>
          <div class="rstat"><div class="rstat-val" style="color:${C.accentHi}">${esc(r.patrols)}</div><div class="rstat-label">סיירים</div></div>
          <div class="rstat"><div class="rstat-val" style="color:${r.highAnomalies?C.orange:C.accentHi}">${esc(r.anomalies)}</div><div class="rstat-label">חריגות</div></div>
        </div>
      </div>
      <div class="tabs">${tabBtns}</div>
    </div>
  </div>
  <div class="tab-content">${content}</div>`;
}

// ── RENDER ────────────────────────────────────────────────────────────────────
// The only place that asks DataStore for data and hands it to the views.
function render(){
  const app=document.getElementById("app");
  if(state.screen==="loading")     app.innerHTML=loadingHTML();
  else if(state.screen==="error")  app.innerHTML=errorHTML(state.error);
  else if(state.screen==="login")  app.innerHTML=loginHTML();
  else if(state.screen==="dash")   app.innerHTML=dashboardHTML(state.user, DataStore.getReports(), DataStore.getDashboardStats());
  else if(state.screen==="report"){
    const r=DataStore.getReport(state.reportId);
    if(!r) return setState({screen:"dash",reportId:null});
    app.innerHTML=reportHTML(r, state.tab, state.user.role==="admin");
  }

  if(state.screen==="login"){
    document.getElementById("inp-pass").addEventListener("keydown",e=>{ if(e.key==="Enter") doLogin(); });
    document.getElementById("inp-user").addEventListener("keydown",e=>{ if(e.key==="Enter") doLogin(); });
  }
  if(state.screen==="dash"){
    app.querySelectorAll(".report-card[data-report-id]").forEach(el=>
      el.addEventListener("click",()=>openReport(el.dataset.reportId)));
  }
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────
function doLogin(){
  const u=document.getElementById("inp-user").value.trim();
  const p=document.getElementById("inp-pass").value.trim();
  const user=DataStore.authenticate(u,p);
  if(user){
    setState({screen:"dash",user});
  } else {
    document.getElementById("login-err").style.display="block";
    const box=document.getElementById("login-box");
    box.classList.add("shake");
    setTimeout(()=>box.classList.remove("shake"),500);
  }
}
function doLogout(){ setState({screen:"login",user:null,reportId:null,tab:"summary"}); }
function openReport(id){
  if(DataStore.getReport(id)) setState({screen:"report",reportId:id,tab:"summary"});
}
function goBack(){ setState({screen:"dash",reportId:null,tab:"summary"}); }
function setTab(t){ setState({tab:t}); }

// ── INIT ──────────────────────────────────────────────────────────────────────
render();
DataStore.load()
  .then(()=>setState({screen:"login"}))
  .catch(err=>setState({screen:"error",error:err.message}));
