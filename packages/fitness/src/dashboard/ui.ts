/** 大盘站点共用的基础样式（浅色/深色由 [data-theme] 切换） */
export const BASE_CSS = String.raw`
  :root {
    --paper:#f2f3f1; --panel:#ffffff; --ink:#171a1d; --muted:#6c7570; --line:#e3e5e2;
    --accent:#1f6f6b; --accent-soft:#d7e6e3; --warn:#c2603b; --good:#2f7d5b; --bad:#b4432b;
    --chip:#eef1ee;
  }
  [data-theme="dark"] {
    --paper:#0f1311; --panel:#171c19; --ink:#e8ece8; --muted:#8b948d; --line:#262d29;
    --accent:#3fae9f; --accent-soft:#16241f; --warn:#d98a63; --good:#4fb07e; --bad:#e0654a;
    --chip:#1b211d;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin:0; background:var(--paper); color:var(--ink);
    font-family:"IBM Plex Sans", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing:antialiased; }
  .wrap { max-width:1180px; margin:0 auto; padding:32px 24px 72px; }
  header.top { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; border-bottom:2px solid var(--ink); padding-bottom:14px; }
  header.top h1 { font-family:"Space Grotesk", sans-serif; font-weight:700; font-size:36px; letter-spacing:-0.02em; margin:0; }
  header.top .meta { text-align:right; color:var(--muted); font-size:13px; line-height:1.7; }
  .toolbar { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin:16px 0 0; }
  .tabs { display:flex; gap:6px; }
  .tab { font:inherit; font-size:14px; padding:7px 16px; border:1px solid var(--line); background:var(--panel); color:var(--muted); cursor:pointer; border-radius:8px; }
  .tab.on { background:var(--ink); color:var(--paper); border-color:var(--ink); }
  .spacer { flex:1; }
  .toolbar label { font-size:12px; color:var(--muted); }
  select, .btn { font:inherit; font-size:13px; padding:6px 12px; border:1px solid var(--line); background:var(--panel); color:var(--ink); border-radius:8px; cursor:pointer; }
  .kpis { display:grid; grid-template-columns:repeat(6, 1fr); gap:12px; margin:20px 0 4px; }
  .kpi { background:var(--panel); border:1px solid var(--line); padding:14px 15px 12px; border-radius:10px; }
  .kpi .label { color:var(--muted); font-size:12px; }
  .kpi .value { font-family:"Space Grotesk", sans-serif; font-size:25px; font-weight:600; margin-top:6px; }
  .kpi .sub { color:var(--muted); font-size:12px; margin-top:2px; }
  .up { color:var(--bad); } .down { color:var(--good); } .flat { color:var(--muted); }
  section { margin-top:26px; }
  h2 { font-family:"Space Grotesk", sans-serif; font-size:15px; letter-spacing:0.01em; margin:0 0 12px; display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
  h2 .note { font-family:"IBM Plex Sans"; font-weight:400; font-size:12px; color:var(--muted); }
  h2 .rangebar { margin-left:auto; display:flex; gap:6px; }
  .rangebar button { font:inherit; font-size:12px; padding:3px 10px; border:1px solid var(--line); background:var(--panel); color:var(--muted); cursor:pointer; border-radius:999px; }
  .rangebar button.on { background:var(--ink); color:var(--paper); border-color:var(--ink); }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .panel { background:var(--panel); border:1px solid var(--line); padding:14px; border-radius:10px; }
  .chart { width:100%; height:320px; }
  .chart.tall { height:380px; }
  .chart.cal { height:auto; min-height:200px; }
  .rates { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
  .rate { background:var(--panel); border:1px solid var(--line); padding:14px 16px; border-radius:10px; }
  .rate .k { color:var(--muted); font-size:12px; }
  .rate .v { font-family:"Space Grotesk", sans-serif; font-size:22px; font-weight:600; margin-top:4px; }
  .badge { display:inline-block; font-size:12px; padding:3px 10px; border-radius:999px; border:1px solid var(--line); }
  .badge.ok { color:var(--good); border-color:var(--good); } .badge.warn { color:var(--warn); border-color:var(--warn); }
  .badge.info { color:var(--accent); border-color:var(--accent); }
  .milestones { columns:2; column-gap:24px; }
  .milestones div { break-inside:avoid; display:flex; justify-content:space-between; gap:12px; padding:7px 0; border-bottom:1px dashed var(--line); font-size:13px; }
  .milestones span:last-child { font-family:"Space Grotesk", sans-serif; }
  table.dt { width:100%; border-collapse:collapse; font-size:13px; }
  table.dt th, table.dt td { padding:7px 10px; border-bottom:1px solid var(--line); text-align:right; }
  table.dt th:first-child, table.dt td:first-child { text-align:left; }
  table.dt thead th { color:var(--muted); font-weight:500; position:sticky; top:0; background:var(--panel); }
  .tablewrap { max-height:360px; overflow:auto; }
  .lines { list-style:none; padding:0; margin:0; font-size:13px; line-height:1.9; }
  .lines.warn li { color:var(--warn); }
  details { margin-top:26px; }
  details > summary { cursor:pointer; font-family:"Space Grotesk", sans-serif; font-size:15px; list-style:none; }
  details > summary::-webkit-details-marker { display:none; }
  details > summary::before { content:"▸ "; color:var(--muted); }
  details[open] > summary::before { content:"▾ "; }
  footer { margin-top:40px; color:var(--muted); font-size:12px; border-top:1px solid var(--line); padding-top:14px; }
  .hidden { display:none !important; }
  @media (max-width:900px) {
    .kpis { grid-template-columns:repeat(3, 1fr); }
    .grid2 { grid-template-columns:1fr; }
    .rates { grid-template-columns:repeat(2, 1fr); }
    .milestones { columns:1; }
    header.top { flex-direction:column; align-items:flex-start; }
    header.top .meta { text-align:left; }
  }
`;

/** 浏览器端共用的 JS 小工具 */
export const JS_HELPERS = String.raw`
function parseDate(s){ var p=s.split("-").map(Number); return new Date(p[0], p[1]-1, p[2]); }
function fmtDate(d){ var p=function(n){return String(n).padStart(2,"0");}; return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); }
function dayDiff(a,b){ return Math.round((a-b)/86400000); }
function avg(a){ if(!a.length) return 0; var s=0; for(var i=0;i<a.length;i++) s+=a[i]; return s/a.length; }
function r1(n){ return Math.round(n*10)/10; }
function r2(n){ return Math.round(n*100)/100; }
function movingAvg(pts, win){
  var out=[]; var start=0;
  for(var i=0;i<pts.length;i++){
    var from=new Date(pts[i].d); from.setDate(from.getDate()-(win-1));
    while(dayDiff(pts[start].d, from) < 0) start++;
    var s=0,n=0;
    for(var j=start;j<=i;j++){ s+=pts[j].v; n++; }
    out.push(n>=Math.min(3,win)? r2(s/n) : pts[i].v);
  }
  return out;
}
function chartOf(id){ var el=document.getElementById(id); return el ? echarts.init(el) : null; }
function getC(){ var s=getComputedStyle(document.body); return {
  ink:s.getPropertyValue("--ink").trim(), muted:s.getPropertyValue("--muted").trim(),
  line:s.getPropertyValue("--line").trim(), accent:s.getPropertyValue("--accent").trim(),
  soft:s.getPropertyValue("--accent-soft").trim(), good:s.getPropertyValue("--good").trim(),
  bad:s.getPropertyValue("--bad").trim(), warn:s.getPropertyValue("--warn").trim(),
  panel:s.getPropertyValue("--panel").trim(), chip:s.getPropertyValue("--chip").trim()
}; }
function gridOpt(){ return { left:46, right:16, top:28, bottom:32 }; }
function axLine(){ return { lineStyle:{ color: C.line } }; }
function money(n){ return n.toLocaleString("zh-CN", { maximumFractionDigits:2 }); }
`;