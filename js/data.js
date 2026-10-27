// ── DATA LAYER ────────────────────────────────────────────────────────────────
// The only module that knows where data lives and how it is shaped.
// Views never read the raw JSON; they get plain objects from these functions.

const DataStore = (() => {
  let users = {};
  let reports = [];
  let settings = {};

  async function fetchJSON(path){
    const res = await fetch(path, { cache:"no-cache" });
    if(!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }

  async function load(){
    [users, reports, settings] = await Promise.all([
      fetchJSON("data/users.json"),
      fetchJSON("data/reports.json"),
      fetchJSON("data/settings.json"),
    ]);
  }

  // Returns the public user record (without the password) or null.
  function authenticate(username, password){
    const found = users[username];
    if(!found || found.password !== password) return null;
    const { password:_, ...publicUser } = found;
    return { username, ...publicUser };
  }

  function withDerived(r){
    return {
      ...r,
      anomalies: r.anomalyList.length,
      patrols: r.patrolDetails.length,
      highAnomalies: r.anomalyList.length > settings.anomalyWarnThreshold,
    };
  }

  function getReports(){ return reports.map(withDerived); }

  function getReport(id){
    const r = reports.find(x => x.id === id);
    return r ? withDerived(r) : null;
  }

  function getDashboardStats(){
    const all = getReports();
    return {
      reportCount: all.length,
      totalAnomalies: all.reduce((a,r) => a + r.anomalies, 0),
      totalKm: all.reduce((a,r) => a + r.km, 0),
      activePatrollers: new Set(all.flatMap(r => r.patrolDetails.map(p => p.name))).size,
    };
  }

  return { load, authenticate, getReports, getReport, getDashboardStats };
})();
