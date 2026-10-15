export interface DashboardWeight {
  date: string; // YYYY-MM-DD
  kg: number;
}

export interface DashboardPlan {
  name: string;
  startDate: string;
  targetDate: string;
  startKg: number;
  targetKg: number;
  heightCm: number;
}

export interface DashboardPayload {
  generatedAt: string;
  weights: DashboardWeight[]; // 按日期升序（已剔除异常值）
  removedOutliers: DashboardWeight[]; // 被判定为录入异常、已从图表剔除的记录
  plan: DashboardPlan | null;
}

/** 生成自包含的体重大盘 HTML（数据内嵌，ECharts 走 CDN） */
export function buildDashboardHtml(payload: DashboardPayload): string {
  const dataJson = JSON.stringify(payload);
  return HTML_TEMPLATE.replace("__DATA__", dataJson);
}

const HTML_TEMPLATE = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>体重大盘</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
<style>
  :root {
    --paper: #f2f3f1;
    --panel: #ffffff;
    --ink: #171a1d;
    --muted: #6c7570;
    --line: #e3e5e2;
    --accent: #1f6f6b;
    --accent-soft: #d7e6e3;
    --warn: #c2603b;
    --good: #2f7d5b;
    --bad: #b4432b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--paper); color: var(--ink);
    font-family: "IBM Plex Sans", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--accent); }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 40px 24px 72px; }
  header.top { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; border-bottom: 2px solid var(--ink); padding-bottom: 16px; }
  header.top h1 { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 40px; letter-spacing: -0.02em; margin: 0; }
  header.top .meta { text-align: right; color: var(--muted); font-size: 13px; line-height: 1.7; }
  .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 24px 0 8px; }
  .kpi { background: var(--panel); border: 1px solid var(--line); padding: 16px 16px 14px; }
  .kpi .label { color: var(--muted); font-size: 12px; }
  .kpi .value { font-family: "Space Grotesk", sans-serif; font-size: 26px; font-weight: 600; margin-top: 6px; }
  .kpi .sub { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .up { color: var(--bad); } .down { color: var(--good); } .flat { color: var(--muted); }
  section { margin-top: 28px; }
  h2 { font-family: "Space Grotesk", sans-serif; font-size: 15px; letter-spacing: 0.02em; margin: 0 0 12px; display: flex; align-items: baseline; gap: 10px; }
  h2 .note { font-family: "IBM Plex Sans"; font-weight: 400; font-size: 12px; color: var(--muted); }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .panel { background: var(--panel); border: 1px solid var(--line); padding: 16px; }
  .chart { width: 100%; height: 320px; }
  .chart.tall { height: 380px; }
  .chart.cal { height: 480px; }
  .rangebar { margin-left: auto; display: flex; gap: 6px; }
  .rangebar button {
    font: inherit; font-size: 12px; padding: 3px 10px; border: 1px solid var(--line);
    background: var(--panel); color: var(--muted); cursor: pointer; border-radius: 999px;
  }
  .rangebar button.on { background: var(--ink); color: #fff; border-color: var(--ink); }
  .rates { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .rate { background: var(--panel); border: 1px solid var(--line); padding: 14px 16px; }
  .rate .k { color: var(--muted); font-size: 12px; }
  .rate .v { font-family: "Space Grotesk", sans-serif; font-size: 22px; font-weight: 600; margin-top: 4px; }
  .milestones { columns: 2; column-gap: 24px; }
  .milestones div { break-inside: avoid; display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px dashed var(--line); font-size: 13px; }
  .milestones span:last-child { font-family: "Space Grotesk", sans-serif; color: var(--ink); }
  footer { margin-top: 40px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--line); padding-top: 14px; }
  @media (max-width: 900px) {
    .kpis { grid-template-columns: repeat(3, 1fr); }
    .grid2 { grid-template-columns: 1fr; }
    .rates { grid-template-columns: repeat(2, 1fr); }
    .milestones { columns: 1; }
    header.top { flex-direction: column; align-items: flex-start; }
    header.top .meta { text-align: left; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <h1>体重大盘</h1>
    <div class="meta" id="meta"></div>
  </header>

  <div class="kpis" id="kpis"></div>

  <section>
    <h2>体重趋势 <span class="note">原始记录 · 7 日 / 30 日均线</span>
      <span class="rangebar" id="rangebar"></span>
    </h2>
    <div class="panel"><div class="chart tall" id="chartTrend"></div></div>
  </section>

  <div class="grid2">
    <section>
      <h2>累积减重</h2>
      <div class="panel"><div class="chart" id="chartCum"></div></div>
    </section>
    <section>
      <h2>月度净变化</h2>
      <div class="panel"><div class="chart" id="chartMonthly"></div></div>
    </section>
  </div>

  <section>
    <h2>速率</h2>
    <div class="rates" id="rates"></div>
  </section>

  <div class="grid2">
    <section>
      <h2>周变化 <span class="note">每周体重差（负=下降）</span></h2>
      <div class="panel"><div class="chart" id="chartWeekly"></div></div>
    </section>
    <section>
      <h2>星期效应 <span class="note">各星期几的平均体重</span></h2>
      <div class="panel"><div class="chart" id="chartWeekday"></div></div>
    </section>
  </div>

  <section>
    <h2>分布</h2>
    <div class="panel"><div class="chart" id="chartHist"></div></div>
  </section>

  <section>
    <h2>打卡热力图 <span class="note">有记录的日期</span></h2>
    <div class="panel"><div class="chart cal" id="chartCal"></div></div>
  </section>

  <section id="planSection">
    <h2>计划 vs 实际 <span class="note" id="planNote"></span></h2>
    <div class="panel"><div class="chart tall" id="chartPlan"></div></div>
  </section>

  <section>
    <h2>极值与里程碑</h2>
    <div class="milestones" id="milestones"></div>
  </section>

  <footer id="foot"></footer>
</div>

<script>
var DATA = __DATA__;
var C = {
  ink: "#171a1d", muted: "#6c7570", line: "#e3e5e2",
  accent: "#1f6f6b", soft: "#d7e6e3", good: "#2f7d5b", bad: "#b4432b", warn: "#c2603b"
};

// ---------- 工具 ----------
function parseDate(s){ var p=s.split("-").map(Number); return new Date(p[0], p[1]-1, p[2]); }
function fmt(d){ var p=function(n){return String(n).padStart(2,"0");}; return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); }
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
function themeGrid(){ return { left: 46, right: 16, top: 24, bottom: 30 }; }
function axisLine(){ return { lineStyle:{ color:C.line } }; }
function fmtMoney(){} // noop

var pts = DATA.weights.map(function(w){ return { d: parseDate(w.date), v: w.kg, s: w.date }; });
var ma7 = movingAvg(pts, 7);
var ma30 = movingAvg(pts, 30);

// ---------- 头部 ----------
document.getElementById("meta").innerHTML =
  "记录 " + pts.length + " 天<br/>" + DATA.weights[0].date + " → " + DATA.weights[DATA.weights.length-1].date +
  "<br/>生成于 " + DATA.generatedAt.slice(0,10);

// ---------- KPI ----------
var last = pts.length-1;
var latestRaw = pts[last].v, latestMa7 = ma7[last];
var i30 = 0; for(var k=last;k>=0;k--){ if(dayDiff(pts[last].d, pts[k].d)<=30) i30=k; }
var change30 = r2(latestMa7 - ma7[i30]);
var baseKg = DATA.plan ? DATA.plan.startKg : pts[0].v;
var cumLoss = r2(baseKg - latestMa7);
var heightCm = DATA.plan ? DATA.plan.heightCm : null;
var bmi = heightCm ? r1(latestMa7/((heightCm/100)*(heightCm/100))) : null;
var toTarget = DATA.plan ? r2(latestMa7 - DATA.plan.targetKg) : null;

function kpi(label, value, sub, cls){ return '<div class="kpi"><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="sub '+(cls||"")+'">'+(sub||"")+'</div></div>'; }
var kpis = "";
kpis += kpi("最新体重", latestRaw.toFixed(1)+" kg", "7 日均 "+latestMa7.toFixed(1)+" kg", "");
kpis += kpi("30 天变化", (change30<=0?"":"+")+change30.toFixed(1)+" kg", change30<=0?"下降":"上升", change30<0?"down":change30>0?"up":"flat");
kpis += kpi("累计减重", cumLoss.toFixed(1)+" kg", "较起始 "+baseKg+" kg", cumLoss>0?"down":"flat");
kpis += kpi("BMI", bmi!=null?bmi.toFixed(1):"—", bmi!=null?(bmi>=24.9?"超重":bmi<18.5?"偏瘦":"正常"):"缺身高", bmi!=null&&bmi>=24.9?"up":"flat");
kpis += kpi("距目标", toTarget!=null?((toTarget<=0?"已达标 ":toTarget.toFixed(1)+" kg")):"—", DATA.plan?("目标 "+DATA.plan.targetKg+" kg"):"无计划", toTarget!=null&&toTarget<=0?"down":"flat");
kpis += kpi("记录覆盖", pts.length+" 天", "跨度 "+dayDiff(pts[last].d, pts[0].d)+" 天", "");
document.getElementById("kpis").innerHTML = kpis;

// ---------- 趋势（可切范围） ----------
var trend = echarts.init(document.getElementById("chartTrend"), null, { renderer: "canvas" });
var RANGES = [ {k:"30", label:"30 天", days:30}, {k:"90", label:"90 天", days:90}, {k:"365", label:"1 年", days:365}, {k:"all", label:"全部", days:1e9} ];
var curRange = "all";
function renderTrend(){
  var def = RANGES.filter(function(r){return r.k===curRange;})[0];
  var from = new Date(pts[last].d);
  if (def.days >= 100000) { from = new Date(pts[0].d); }
  else { from.setDate(from.getDate()-def.days); }
  var idx = pts.map(function(p,i){return i;}).filter(function(i){ return dayDiff(pts[i].d, from)>=0; });
  var x = idx.map(function(i){ return pts[i].s; });
  var series = [
    { name:"原始", type:"scatter", symbolSize:3, itemStyle:{ color: C.muted, opacity:0.35 }, data: idx.map(function(i){return pts[i].v;}) },
    { name:"7 日均", type:"line", smooth:true, showSymbol:false, lineStyle:{ width:2.5, color:C.accent }, itemStyle:{color:C.accent}, data: idx.map(function(i){return ma7[i];}) },
    { name:"30 日均", type:"line", smooth:true, showSymbol:false, lineStyle:{ width:1.5, color:C.warn, type:"dashed" }, itemStyle:{color:C.warn}, data: idx.map(function(i){return ma30[i];}) }
  ];
  if (DATA.plan){
    var target = idx.map(function(i){
      var d=pts[i].d, s=parseDate(DATA.plan.startDate), t=parseDate(DATA.plan.targetDate);
      var jd=dayDiff(t,s); if(jd<=0) return DATA.plan.targetKg;
      var f=Math.min(1, Math.max(0, dayDiff(d,s)/jd));
      return r2(DATA.plan.startKg + (DATA.plan.targetKg-DATA.plan.startKg)*f);
    });
    series.push({ name:"计划", type:"line", showSymbol:false, lineStyle:{ width:1.5, color:C.ink, type:"dotted" }, itemStyle:{color:C.ink}, data: target });
  }
  trend.setOption({
    color:[C.accent,C.warn,C.ink],
    grid: themeGrid(), tooltip:{ trigger:"axis" },
    legend:{ top:0, left:0, textStyle:{ color:C.muted }, itemGap:16 },
    xAxis:{ type:"category", data:x, axisLine:axisLine(), axisLabel:{ color:C.muted, hideOverlap:true } },
    yAxis:{ type:"value", scale:true, axisLine:{show:false}, splitLine:{ lineStyle:{color:C.line} }, axisLabel:{ color:C.muted } },
    series: series
  }, true);
}
var bar = document.getElementById("rangebar");
RANGES.forEach(function(r){
  var b=document.createElement("button"); b.textContent=r.label; b.className = r.k===curRange?"on":"";
  b.onclick=function(){ curRange=r.k; Array.prototype.forEach.call(bar.children,function(c){c.className="";}); b.className="on"; renderTrend(); };
  bar.appendChild(b);
});
renderTrend();

// ---------- 累积减重 ----------
(function(){
  var s=parseDate(DATA.plan?DATA.plan.startDate:pts[0].s);
  var base = DATA.plan?DATA.plan.startKg:pts[0].v;
  var idx=[]; for(var i=0;i<pts.length;i++){ if(dayDiff(pts[i].d,s)>=0) idx.push(i); }
  if(!idx.length){ idx=[0]; }
  var x=idx.map(function(i){return pts[i].s;});
  var y=idx.map(function(i){ return r2(base - ma7[i]); });
  echarts.init(document.getElementById("chartCum")).setOption({
    grid: themeGrid(), tooltip:{trigger:"axis"},
    xAxis:{ type:"category", data:x, axisLine:axisLine(), axisLabel:{color:C.muted, hideOverlap:true} },
    yAxis:{ type:"value", name:"kg", axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted} },
    series:[{ type:"line", smooth:true, showSymbol:false, areaStyle:{ color:C.soft }, lineStyle:{color:C.accent,width:2}, data:y }]
  });
})();

// ---------- 月度净变化 ----------
(function(){
  var byMonth={};
  for(var i=0;i<pts.length;i++){ var key=pts[i].s.slice(0,7); if(!byMonth[key]) byMonth[key]=[]; byMonth[key].push(ma7[i]); }
  var keys=Object.keys(byMonth).sort();
  var vals=keys.map(function(k){ var a=byMonth[k]; return r2(a[a.length-1]-a[0]); });
  echarts.init(document.getElementById("chartMonthly")).setOption({
    grid: themeGrid(), tooltip:{trigger:"axis"},
    xAxis:{ type:"category", data:keys, axisLine:axisLine(), axisLabel:{color:C.muted, hideOverlap:true} },
    yAxis:{ type:"value", axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted} },
    series:[{ type:"bar", data: vals.map(function(v){ return { value:v, itemStyle:{ color: v<=0?C.good:C.bad } }; }) }]
  });
})();

// ---------- 速率 ----------
(function(){
  function rate(days){
    var i0=0; for(var k=last;k>=0;k--){ if(dayDiff(pts[last].d, pts[k].d)<=days) i0=k; }
    var dw=dayDiff(pts[last].d, pts[i0].d); if(dw<=0) return 0;
    return r2(((ma7[i0]-ma7[last])/dw)*7);
  }
  var all = (function(){ var dw=dayDiff(pts[last].d, pts[0].d); return dw>0? r2(((ma7[0]-ma7[last])/dw)*7):0; })();
  var recent = rate(14);
  var monthPct = latestMa7>0 ? r2((recent*(30/7))/baseKg*100) : 0;
  var items = [
    ["近 14 天", recent.toFixed(2)+" kg/周"],
    ["近 30 天", rate(30).toFixed(2)+" kg/周"],
    ["近 90 天", rate(90).toFixed(2)+" kg/周"],
    ["全程", all.toFixed(2)+" kg/周"]
  ];
  document.getElementById("rates").innerHTML = items.map(function(it){
    return '<div class="rate"><div class="k">'+it[0]+'</div><div class="v">'+it[1]+'</div></div>';
  }).join("");
})();

// ---------- 周变化 ----------
(function(){
  var weeks={};
  for(var i=0;i<pts.length;i++){
    var d=pts[i].d; var monday=new Date(d); var wd=(d.getDay()+6)%7; monday.setDate(d.getDate()-wd);
    var key=fmt(monday); if(!weeks[key]) weeks[key]=[]; weeks[key].push(ma7[i]);
  }
  var keys=Object.keys(weeks).sort();
  var vals=keys.map(function(k){ var a=weeks[k]; return r2(a[a.length-1]-a[0]); });
  echarts.init(document.getElementById("chartWeekly")).setOption({
    grid: themeGrid(), tooltip:{trigger:"axis"},
    dataZoom:[{ type:"inside" }],
    xAxis:{ type:"category", data:keys, axisLine:axisLine(), axisLabel:{color:C.muted, hideOverlap:true} },
    yAxis:{ type:"value", axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted} },
    series:[{ type:"bar", data: vals.map(function(v){ return { value:v, itemStyle:{ color: v<=0?C.good:C.bad } }; }) }]
  });
})();

// ---------- 星期效应 ----------
(function(){
  var names=["周日","周一","周二","周三","周四","周五","周六"];
  var buckets=[[],[],[],[],[],[],[]];
  for(var i=0;i<pts.length;i++) buckets[pts[i].d.getDay()].push(ma7[i]);
  var vals=buckets.map(function(b){ return b.length? r2(avg(b)) : null; });
  echarts.init(document.getElementById("chartWeekday")).setOption({
    grid: themeGrid(), tooltip:{trigger:"axis"},
    xAxis:{ type:"category", data:names, axisLine:axisLine(), axisLabel:{color:C.muted} },
    yAxis:{ type:"value", scale:true, axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted} },
    series:[{ type:"bar", data: vals, itemStyle:{ color:C.accent } }]
  });
})();

// ---------- 分布 ----------
(function(){
  var vs=pts.map(function(p){return p.v;});
  var min=Math.min.apply(null,vs), max=Math.max.apply(null,vs);
  var bins=14, step=(max-min)/bins || 1, counts=new Array(bins).fill(0), labels=[];
  for(var b=0;b<bins;b++) labels.push((min+step*b).toFixed(1));
  for(var i=0;i<vs.length;i++){ var bi=Math.min(bins-1, Math.floor((vs[i]-min)/step)); counts[bi]++; }
  echarts.init(document.getElementById("chartHist")).setOption({
    grid: themeGrid(), tooltip:{trigger:"axis"},
    xAxis:{ type:"category", data:labels, axisLine:axisLine(), axisLabel:{color:C.muted, hideOverlap:true} },
    yAxis:{ type:"value", axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted} },
    series:[{ type:"bar", data:counts, itemStyle:{ color:C.accent } }]
  });
})();

// ---------- 打卡热力图 ----------
(function(){
  var years = [];
  for (var i=0;i<pts.length;i++){ var y=pts[i].d.getFullYear(); if(years.indexOf(y)<0) years.push(y); }
  years.sort(function(a,b){return a-b;});
  var el = document.getElementById("chartCal");
  var rowH = 122;
  el.style.height = (24 + years.length*rowH) + "px";
  var byYear = {}; years.forEach(function(y){ byYear[y]=[]; });
  for (var i=0;i<pts.length;i++){ byYear[pts[i].d.getFullYear()].push([pts[i].s, 1]); }
  var calendars = years.map(function(y,i){ return {
    top: 20 + i*rowH, left: 46, right: 16,
    range: [y+"-01-01", y+"-12-31"], cellSize: ["auto",13],
    itemStyle: { color:"#eef1ee", borderColor:"#fff" },
    splitLine: { lineStyle:{ color:C.line } },
    dayLabel: { color:C.muted, nameMap: ["日","一","二","三","四","五","六"] },
    monthLabel: { color:C.muted }, yearLabel: { color:C.ink }
  }; });
  var series = years.map(function(y){ return { type:"heatmap", coordinateSystem:"calendar", calendarIndex: years.indexOf(y), data: byYear[y] }; });
  var inst = echarts.init(el);
  inst.setOption({
    tooltip:{},
    visualMap:{ show:false, min:0, max:1, inRange:{ color:["#eef1ee", C.accent] } },
    calendar: calendars,
    series: series
  });
})();

// ---------- 计划 vs 实际 ----------
(function(){
  var sec=document.getElementById("planSection");
  if(!DATA.plan){ sec.style.display="none"; return; }
  var s=parseDate(DATA.plan.startDate), t=parseDate(DATA.plan.targetDate);
  var jd=dayDiff(t,s)||1;
  var idx=[]; for(var i=0;i<pts.length;i++){ if(dayDiff(pts[i].d,s)>=0) idx.push(i); }
  var x=idx.map(function(i){return pts[i].s;});
  var plan=idx.map(function(i){ var f=Math.min(1, Math.max(0, dayDiff(pts[i].d,s)/jd)); return r2(DATA.plan.startKg+(DATA.plan.targetKg-DATA.plan.startKg)*f); });
  var actual=idx.map(function(i){return ma7[i];});
  var diff=idx.map(function(i){ return r2(ma7[i]-plan[i]); });
  document.getElementById("planNote").textContent = DATA.plan.name + " · 目标 " + DATA.plan.targetKg + "kg · 应到 " + DATA.plan.targetDate;
  echarts.init(document.getElementById("chartPlan")).setOption({
    grid: themeGrid(), tooltip:{trigger:"axis"},
    legend:{ top:0, textStyle:{color:C.muted} },
    xAxis:{ type:"category", data:x, axisLine:axisLine(), axisLabel:{color:C.muted, hideOverlap:true} },
    yAxis:[
      { type:"value", scale:true, axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted} },
      { type:"value", axisLine:{show:false}, splitLine:{show:false}, axisLabel:{color:C.muted, formatter:"{value} kg"} }
    ],
    series:[
      { name:"计划", type:"line", showSymbol:false, lineStyle:{color:C.ink,type:"dotted"}, data:plan },
      { name:"实际(7日均)", type:"line", smooth:true, showSymbol:false, lineStyle:{color:C.accent,width:2}, areaStyle:{color:C.soft, opacity:0.5}, data:actual }
    ]
  });
})();

// ---------- 极值/里程碑 ----------
(function(){
  var maxP=pts[0], minP=pts[0];
  for(var i=1;i<pts.length;i++){ if(pts[i].v>maxP.v) maxP=pts[i]; if(pts[i].v<minP.v) minP=pts[i]; }
  // 最大单日降幅 / 增幅
  var maxDrop={kg:0,s:""}, maxGain={kg:0,s:""};
  for(var i=1;i<pts.length;i++){ var d=pts[i].v-pts[i-1].v; if(-d>maxDrop.kg){maxDrop.kg=-d;maxDrop.s=pts[i].s;} if(d>maxGain.kg){maxGain.kg=d;maxGain.s=pts[i].s;} }
  // 最快 7 日降幅：滑动 7 天窗 MA 差
  var best7={kg:0,a:"",b:""};
  for(var i=0;i<pts.length;i++){
    var from=new Date(pts[i].d); from.setDate(from.getDate()-6);
    for(var j=i-1;j>=0 && dayDiff(pts[i].d, pts[j].d)<=6;j--){
      var dd=ma7[j]-ma7[i]; if(dd>best7.kg){ best7.kg=dd; best7.a=pts[j].s; best7.b=pts[i].s; }
    }
  }
  var rows=[
    ["最新记录", pts[last].s+" · "+pts[last].v+" kg"],
    ["历史最高", maxP.s+" · "+maxP.v+" kg"],
    ["历史最低", minP.s+" · "+minP.v+" kg"],
    ["区间跨度", dayDiff(pts[last].d, pts[0].d)+" 天"],
    ["最大单日降幅", r2(maxDrop.kg)+" kg · "+maxDrop.s],
    ["最大单日增幅", r2(maxGain.kg)+" kg · "+maxGain.s],
    ["最快 7 日降幅", r2(best7.kg)+" kg · "+best7.a+" → "+best7.b],
    ["平均体重", r2(avg(pts.map(function(p){return p.v;})))+" kg"]
  ];
  document.getElementById("milestones").innerHTML = rows.map(function(r){ return "<div><span>"+r[0]+"</span><span>"+r[1]+"</span></div>"; }).join("");
  var foot = "数据源：datas/fitness/synced/weights.json（练练健身同步）";
  if (DATA.removedOutliers && DATA.removedOutliers.length){
    var ex = DATA.removedOutliers.slice(0,3).map(function(o){ return o.date+" "+o.kg+"kg"; }).join("、");
    foot += " · 已剔除 " + DATA.removedOutliers.length + " 条疑似录入异常（" + ex + (DATA.removedOutliers.length>3?" 等":"") + "）";
  }
  document.getElementById("foot").textContent = foot;
})();

// 自适应
var charts=[ "chartTrend","chartCum","chartMonthly","chartWeekly","chartWeekday","chartHist","chartCal","chartPlan" ];
window.addEventListener("resize", function(){
  charts.forEach(function(id){ var el=document.getElementById(id); if(!el) return; var inst=echarts.getInstanceByDom(el); if(inst) inst.resize(); });
});
</script>
</body>
</html>`;