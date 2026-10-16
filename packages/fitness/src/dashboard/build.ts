import { CheckinVM } from "../checkin/view-model";

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
  removedOutliers: DashboardWeight[];
  plan: DashboardPlan | null;
  checkin: CheckinVM | null;
}

import { BASE_CSS, JS_HELPERS } from "./ui";

const PAGE_JS = String.raw`
var DATA = __DATA__;
var C = getC();
var RENDERERS = [];
function reg(fn){ RENDERERS.push(fn); }
var W = DATA.weights.map(function(w){ return { d: parseDate(w.date), v: w.kg, s: w.date }; });
var MA7 = movingAvg(W, 7), MA14 = movingAvg(W, 14), MA30 = movingAvg(W, 30), MA90 = movingAvg(W, 90);
var LAST = W.length-1;

document.getElementById("meta").innerHTML =
  "记录 " + W.length + " 天<br/>" + DATA.weights[0].date + " → " + DATA.weights[LAST].date +
  "<br/>生成于 " + DATA.generatedAt.slice(0,10);
document.getElementById("foot").textContent =
  "数据源：datas/fitness/synced/weights.json（练练健身同步）" +
  (DATA.removedOutliers && DATA.removedOutliers.length ? " · 已剔除 " + DATA.removedOutliers.length + " 条疑似录入异常" : "");

function kpi(label, value, sub, cls){
  return '<div class="kpi"><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="sub '+(cls||"")+'">'+(sub||"")+'</div></div>';
}
function lineOpt(x, series, yName){
  return { color:series.map(function(s){return s.color;}), grid:gridOpt(48), tooltip:{trigger:"axis", valueFormatter:fmtNum}, legend:{top:0,left:0,textStyle:{color:C.muted},itemGap:14},
    xAxis:{ type:"category", data:x, axisLine:axLine(), axisLabel:{color:C.muted, hideOverlap:true} },
    yAxis:{ type:"value", scale:true, axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted, formatter:fmtNum} },
    series: series.map(function(s){ return Object.assign({ type:s.type||"line", smooth:true, showSymbol:s.type==="scatter", symbolSize:3, data:s.data, name:s.name, itemStyle:{color:s.color}, lineStyle:{color:s.color,width:s.width||1.8,type:s.dash?"dashed":"solid"}, areaStyle:s.area?{color:s.area}:null }, s.extra||{}); })
  };
}
function barOpt(x, data, colors, yName){
  return { grid:gridOpt(30), tooltip:{trigger:"axis", valueFormatter:fmtNum},
    xAxis:{ type:"category", data:x, axisLine:axLine(), axisLabel:{color:C.muted, hideOverlap:true} },
    yAxis:{ type:"value", axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted, formatter:fmtNum} },
    series:[{ type:"bar", data: data.map(function(v,i){ return { value:v, itemStyle:{ color: typeof colors==="function"? colors(v):colors } }; }) }]
  };
}
function setChart(id, opt){ var el=document.getElementById(id); if(!el) return; var inst=echarts.getInstanceByDom(el)||echarts.init(el); inst.setOption(opt, true); }

// ================= Tab 1：体重大盘 =================
function renderWeight(){
  C = getC();
  renderKpis();
  renderTrend();
  renderPair();
  renderRates();
  renderChangeCharts();
  renderCalendar();
  renderTables();
}

function renderKpis(){
  var latestRaw = W[LAST].v, latestMa7 = MA7[LAST];
  var i30=0; for(var k=LAST;k>=0;k--){ if(dayDiff(W[LAST].d, W[k].d)<=30) i30=k; }
  var change30 = r2(latestMa7 - MA7[i30]);
  var baseKg = DATA.plan ? DATA.plan.startKg : W[0].v;
  var cumLoss = r2(baseKg - latestMa7);
  var heightCm = DATA.plan ? DATA.plan.heightCm : null;
  var bmi = heightCm ? r1(latestMa7/((heightCm/100)*(heightCm/100))) : null;
  var toTarget = DATA.plan ? r2(latestMa7 - DATA.plan.targetKg) : null;
  // 连续记录
  var streak=1; for(var k=LAST-1;k>=0;k--){ if(dayDiff(W[k+1].d, W[k].d)===1) streak++; else break; }
  var html = "";
  html += kpi("最新体重", latestRaw.toFixed(1)+" kg", "7 日均 "+latestMa7.toFixed(1)+" kg", "");
  html += kpi("30 天变化", (change30<=0?"":"+")+change30.toFixed(1)+" kg", change30<=0?"下降":"上升", change30<0?"down":change30>0?"up":"flat");
  html += kpi("累计减重", cumLoss.toFixed(1)+" kg", "较起始 "+baseKg+" kg", cumLoss>0?"down":"flat");
  html += kpi("BMI", bmi!=null?bmi.toFixed(1):"—", bmi!=null?(bmi>=24.9?"超重":bmi<18.5?"偏瘦":"正常"):"缺身高", bmi!=null&&bmi>=24.9?"up":"flat");
  html += kpi("距目标", toTarget!=null?(toTarget<=0?"已达标":toTarget.toFixed(1)+" kg"):"—", DATA.plan?("目标 "+DATA.plan.targetKg+" kg"):"无计划", toTarget!=null&&toTarget<=0?"down":"flat");
  html += kpi("连续记录", streak+" 天", "共 "+W.length+" 天", "");
  document.getElementById("kpis").innerHTML = html;
}

var RANGES = [ {k:"30",label:"30 天",days:30}, {k:"90",label:"90 天",days:90}, {k:"365",label:"1 年",days:365}, {k:"all",label:"全部",days:1e9} ];
var curRange = "all";
function sliceIdx(days){
  var from = days>=100000 ? new Date(W[0].d) : new Date(W[LAST].d);
  if (days<100000) from.setDate(from.getDate()-days);
  return W.map(function(p,i){return i;}).filter(function(i){ return dayDiff(W[i].d, from)>=0; });
}
function renderTrend(){
  var def = RANGES.filter(function(r){return r.k===curRange;})[0];
  var idx = sliceIdx(def.days);
  var histX = idx.map(function(i){return W[i].s;});
  var raw = idx.map(function(i){return W[i].v;});
  var m7 = idx.map(function(i){return MA7[i];});
  var m30 = idx.map(function(i){return MA30[i];});
  var planLine = null;
  if (DATA.plan){
    var s0=parseDate(DATA.plan.startDate), t0=parseDate(DATA.plan.targetDate), jd=dayDiff(t0,s0)||1;
    planLine = idx.map(function(i){ var f=Math.min(1,Math.max(0,dayDiff(W[i].d,s0)/jd)); return r2(DATA.plan.startKg+(DATA.plan.targetKg-DATA.plan.startKg)*f); });
  }

  // 未来预测轴：从最后一天向后到目标日或 +180 天
  var lastIdx = LAST;
  var recent = rate(14), sig = rollingStd(14);
  var futureDays = 0;
  if (DATA.plan){ futureDays = Math.max(0, Math.min(180, dayDiff(parseDate(DATA.plan.targetDate), W[lastIdx].d))); }
  if (futureDays <= 0) futureDays = Math.min(180, 120);
  var x = histX.slice();
  var pad = function(){ return new Array(histX.length).fill(null); };
  var rawS = raw.slice(), m7S = m7.slice(), m30S = m30.slice(), planS = planLine ? planLine.slice() : null;
  var midS = pad(), hiS = pad(), loS = pad();
  midS[lastIdx - idx[0]] = MA7[lastIdx]; hiS[lastIdx - idx[0]] = MA7[lastIdx]; loS[lastIdx - idx[0]] = MA7[lastIdx];
  var m = MA7[lastIdx], h = MA7[lastIdx], l = MA7[lastIdx];
  for (var f=1; f<=futureDays; f++){
    var d=new Date(W[lastIdx].d); d.setDate(d.getDate()+f);
    x.push(fmtDate(d));
    rawS.push(null); m7S.push(null); m30S.push(null); if(planS) planS.push(planS[planS.length-1]);
    m = m - (recent/7); h = h - ((recent+sig)/7); l = l - ((recent-sig)/7);
    midS.push(DATA.plan? Math.max(DATA.plan.targetKg, r2(m)) : r2(m));
    hiS.push(DATA.plan? Math.max(DATA.plan.targetKg, r2(h)) : r2(h));
    loS.push(DATA.plan? Math.max(DATA.plan.targetKg, r2(l)) : r2(l));
  }

  var series = [
    { name:"原始", color:C.muted, type:"scatter", data: rawS },
    { name:"7 日均", color:C.accent, width:2.4, data: m7S },
    { name:"30 日均", color:C.warn, dash:true, data: m30S }
  ];
  if (planS) series.push({ name:"计划", color:C.ink, dash:true, data: planS });
  if (recent > 0.05){
    series.push({ name:"预测·中性", color:C.accent, dash:true, width:1.2, data: midS });
    series.push({ name:"预测·乐观", color:C.good, dash:true, width:1, data: hiS });
    series.push({ name:"预测·悲观", color:C.bad, dash:true, width:1, data: loS });
  }
  setChart("chartTrend", lineOpt(x, series, "kg"));
  var bar = document.getElementById("rangebar");
  if (bar && !bar.dataset.done){
    RANGES.forEach(function(r){ var b=document.createElement("button"); b.textContent=r.label; b.className=r.k===curRange?"on":""; b.onclick=function(){ curRange=r.k; Array.prototype.forEach.call(bar.children,function(c){c.className="";}); b.className="on"; renderTrend(); }; bar.appendChild(b); });
    bar.dataset.done="1";
  }
}
function rate(days){ var idx=sliceIdx(days); var i0=idx[0]; var dw=dayDiff(W[LAST].d, W[i0].d); return dw>0? r2(((MA7[i0]-MA7[LAST])/dw)*7):0; }
function rollingStd(days){ var from=new Date(W[LAST].d); from.setDate(from.getDate()-(days-1)); var arr=[]; for(var i=1;i<W.length;i++){ if(dayDiff(W[i].d, from)>=0) arr.push(W[i].v-W[i-1].v); } var m=avg(arr); var s=0; for(var j=0;j<arr.length;j++) s+=(arr[j]-m)*(arr[j]-m); return arr.length? Math.sqrt(s/arr.length):0; }

function renderPair(){
  C=getC();
  renderCumulative(); renderMonthly();
}
function renderCumulative(){
  var s = DATA.plan?parseDate(DATA.plan.startDate):W[0].d, base = DATA.plan?DATA.plan.startKg:W[0].v;
  var idx=[]; for(var i=0;i<W.length;i++){ if(dayDiff(W[i].d,s)>=0) idx.push(i); } if(!idx.length) idx=[0];
  setChart("chartCum", lineOpt(idx.map(function(i){return W[i].s;}), [ { name:"累积减重", color:C.accent, area:C.soft, width:2, data: idx.map(function(i){ return r2(base-MA7[i]); }) } ], "kg"));
}
function renderMonthly(){
  var m={}; for(var i=0;i<W.length;i++){ var k=W[i].s.slice(0,7); (m[k]=m[k]||[]).push(MA7[i]); }
  var keys=Object.keys(m).sort(); var vals=keys.map(function(k){ var a=m[k]; return r2(a[a.length-1]-a[0]); });
  setChart("chartMonthly", barOpt(keys, vals, function(v){ return v<=0?C.good:C.bad; }));
}
function renderRates(){
  function r(days){ return rate(days); }
  var all = (function(){ var dw=dayDiff(W[LAST].d, W[0].d); return dw>0? r2(((MA7[0]-MA7[LAST])/dw)*7):0; })();
  var items=[ ["近 14 天", r(14)], ["近 30 天", r(30)], ["近 90 天", r(90)], ["全程", all] ];
  document.getElementById("rates").innerHTML = items.map(function(it){ return '<div class="rate"><div class="k">'+it[0]+'</div><div class="v">'+it[1].toFixed(2)+' kg/周</div></div>'; }).join("");
}
function renderChangeCharts(){
  C=getC();
  // 周变化
  var wk={}; for(var i=0;i<W.length;i++){ var d=W[i].d; var mon=new Date(d); var wd=(d.getDay()+6)%7; mon.setDate(d.getDate()-wd); var key=fmtDate(mon); (wk[key]=wk[key]||[]).push(MA7[i]); }
  var wkKeys=Object.keys(wk).sort(); var wkVals=wkKeys.map(function(k){ var a=wk[k]; return r2(a[a.length-1]-a[0]); });
  setChart("chartWeekly", Object.assign(barOpt(wkKeys, wkVals, function(v){ return v<=0?C.good:C.bad; }), { dataZoom:[{type:"inside"}] }));
  // 周内模式（各星期几平均日变化）
  var names=["周日","周一","周二","周三","周四","周五","周六"]; var byd=[[],[],[],[],[],[],[]];
  for(var i=1;i<W.length;i++){ byd[W[i].d.getDay()].push(W[i].v-W[i-1].v); }
  setChart("chartWeekday", barOpt(names, byd.map(function(a){ return a.length? r2(avg(a)) : null; }), function(v){ return v==null?C.muted : (v<=0?C.good:C.bad); }));
  // 同比 YoY：各月平均体重，今年 vs 去年
  var lastY=W[LAST].d.getFullYear();
  var curM={}, prevM={};
  for(var i=0;i<W.length;i++){ var y=W[i].d.getFullYear(), mo=W[i].d.getMonth()+1; if(y===lastY){ (curM[mo]=curM[mo]||[]).push(MA7[i]); } else if(y===lastY-1){ (prevM[mo]=prevM[mo]||[]).push(MA7[i]); } }
  var months=[1,2,3,4,5,6,7,8,9,10,11,12];
  setChart("chartYoY", lineOpt(months.map(function(x){return x+"月";}), [
    { name:String(lastY), color:C.accent, data: months.map(function(x){ return curM[x]? r2(avg(curM[x])):null; }) },
    { name:String(lastY-1), color:C.muted, dash:true, data: months.map(function(x){ return prevM[x]? r2(avg(prevM[x])):null; }) }
  ], "kg"));
  // 平台期：MA30 斜率≈0 段
  renderPlateau();
  // 波动性：滚动σ
  renderVolatility();
  // BMI 趋势
  renderBmi();
  // 日变化分布
  renderDayDiffHist();
  // 分段瀑布
  renderWaterfall();
}
function renderPlateau(){
  var x=W.map(function(p){return p.s;});
  var areas=[]; var start=null;
  for(var i=1;i<W.length;i++){
    var slope = (MA30[i]-MA30[Math.max(0,i-7)])/Math.min(7,i);
    if(Math.abs(slope)<0.03){ if(start===null) start=i; }
    else { if(start!==null && i-start>=10) areas.push([{xAxis:x[start]},{xAxis:x[i]}]); start=null; }
  }
  setChart("chartPlateau", lineOpt(x, [ { name:"30 日均", color:C.accent, width:2, data: MA30, extra:{ markArea:{ itemStyle:{color:C.soft}, data:areas } } } ], "kg"));
}
function renderVolatility(){
  var x=W.map(function(p){return p.s;}); var win=30; var arr=[];
  for(var i=0;i<W.length;i++){ var from=new Date(W[i].d); from.setDate(from.getDate()-(win-1)); var a=[]; for(var j=Math.max(1,i-40);j<=i;j++){ if(dayDiff(W[j].d, from)>=0) a.push(W[j].v-W[j-1].v); } var m=avg(a), s=0; for(var k=0;k<a.length;k++) s+=(a[k]-m)*(a[k]-m); arr.push(a.length>2? r2(Math.sqrt(s/a.length)):null); }
  setChart("chartVol", lineOpt(x, [ { name:"滚动波动 σ(30)", color:C.warn, width:1.6, data: arr } ], "kg"));
}
function renderBmi(){
  var el=document.getElementById("bmiSection");
  if(!DATA.plan || !DATA.plan.heightCm){ if(el) el.style.display="none"; return; }
  var h=(DATA.plan.heightCm/100)*(DATA.plan.heightCm/100);
  var x=W.map(function(p){return p.s;}); var arr=MA7.map(function(v){ return r2(v/h); });
  setChart("chartBmi", lineOpt(x, [ { name:"BMI(7日均)", color:C.accent, width:2, data: arr, extra:{ markLine:{ silent:true, symbol:"none", data:[{yAxis:18.5,lineStyle:{color:C.line}},{yAxis:24.9,lineStyle:{color:C.line}},{yAxis:28,lineStyle:{color:C.warn,type:"dashed"}}], label:{color:C.muted, formatter:"{c}"} } } } ], "BMI"));
}
function renderDayDiffHist(){
  var diffs=[]; for(var i=1;i<W.length;i++) diffs.push(W[i].v-W[i-1].v);
  renderHist("chartDDHist", diffs, 0.5, function(v){ return v<=0?C.good:C.bad; });
}
function renderWaterfall(){
  // 分段：按 30 日均变化方向切换点分段，输出每段净变化
  var segs=[]; var start=0;
  for(var i=1;i<W.length;i++){ var up = MA30[i]-MA30[i-1] >= 0; var prevUp = MA30[i-1]-MA30[i-2] >= 0; if(up!==prevUp){ segs.push([start, i-1]); start=i; } }
  segs.push([start, W.length-1]);
  var labels=[], vals=[];
  segs.forEach(function(seg,i){ var a=MA30[seg[0]], b=MA30[seg[1]]; if(seg[1]-seg[0] < 3) return; labels.push(fmtDate(W[seg[0]].d).slice(2)); vals.push(r2(b-a)); });
  setChart("chartWaterfall", barOpt(labels, vals, function(v){ return v<=0?C.good:C.bad; }));
}
function renderCalendar(){
  var years=[]; for(var i=0;i<W.length;i++){ var y=W[i].d.getFullYear(); if(years.indexOf(y)<0) years.push(y); } years.sort();
  var el=document.getElementById("chartCal"); if(el){ el.style.height=(24+years.length*122)+"px"; }
  var byYear={}; years.forEach(function(y){ byYear[y]=[]; }); for(var i=0;i<W.length;i++) byYear[W[i].d.getFullYear()].push([W[i].s,1]);
  var cals=years.map(function(y,i){ return { top:20+i*122, left:46, right:16, range:[y+"-01-01", y+"-12-31"], cellSize:["auto",13], itemStyle:{color:C.chip||"#eef1ee", borderColor:C.panel}, splitLine:{lineStyle:{color:C.line}}, dayLabel:{color:C.muted,nameMap:["日","一","二","三","四","五","六"]}, monthLabel:{color:C.muted}, yearLabel:{color:C.ink} }; });
  var ser=years.map(function(y,i){ return { type:"heatmap", coordinateSystem:"calendar", calendarIndex:i, data:byYear[y] }; });
  setChart("chartCal", { tooltip:{}, visualMap:{show:false,min:0,max:1,inRange:{color:[C.chip||"#eef1ee", C.accent]}}, calendar:cals, series:ser });
  // 日变化热力图
  var dEl=document.getElementById("chartCalDD"); if(dEl){ dEl.style.height=(24+years.length*122)+"px"; }
  var dd=[]; for(var i=1;i<W.length;i++){ dd.push([W[i].s, r2(W[i].v-W[i-1].v)]); }
  var cals2=years.map(function(y,i){ return { top:20+i*122, left:46, right:16, range:[y+"-01-01", y+"-12-31"], cellSize:["auto",13], itemStyle:{color:C.chip||"#eef1ee", borderColor:C.panel}, splitLine:{lineStyle:{color:C.line}}, dayLabel:{color:C.muted,nameMap:["日","一","二","三","四","五","六"]}, monthLabel:{color:C.muted}, yearLabel:{color:C.ink} }; });
  setChart("chartCalDD", { tooltip:{}, visualMap:{show:false,min:-2,max:2,inRange:{color:[C.good,"#eef1ee",C.bad]}}, calendar:cals2, series:years.map(function(y,i){ return { type:"heatmap", coordinateSystem:"calendar", calendarIndex:i, data: dd.filter(function(p){ return p[0].slice(0,4)===String(y); }) }; }) });
}
function renderTables(){
  // 分布
  renderHist("chartHist", W.map(function(p){return p.v;}), 1, function(){ return C.accent; });
  // 记录质量：每月记录天数
  var m={}; W.forEach(function(p){ var k=p.s.slice(0,7); m[k]=(m[k]||0)+1; });
  var keys=Object.keys(m).sort(); var vals=keys.map(function(k){return m[k];});
  setChart("chartQuality", Object.assign(barOpt(keys, vals, C.accent), { dataZoom:[{type:"inside"}] }));
  // 极值里程碑
  var maxP=W[0], minP=W[0]; for(var i=1;i<W.length;i++){ if(W[i].v>maxP.v) maxP=W[i]; if(W[i].v<minP.v) minP=W[i]; }
  var md={kg:0,s:""}, mg={kg:0,s:""}; for(var i=1;i<W.length;i++){ var d=W[i].v-W[i-1].v; if(-d>md.kg){md.kg=-d;md.s=W[i].s;} if(d>mg.kg){mg.kg=d;mg.s=W[i].s;} }
  var rows=[
    ["最新记录", W[LAST].s+" · "+W[LAST].v+" kg"], ["历史最高", maxP.s+" · "+maxP.v+" kg"],
    ["历史最低", minP.s+" · "+minP.v+" kg"], ["区间跨度", dayDiff(W[LAST].d, W[0].d)+" 天"],
    ["最大单日降幅", r2(md.kg)+" kg · "+md.s], ["最大单日增幅", r2(mg.kg)+" kg · "+mg.s],
    ["平均体重", r2(avg(W.map(function(p){return p.v;})))+" kg"], ["平均日变化", r2(avg(DATA.weights.map(function(p,i){ return i? p.kg-DATA.weights[i-1].kg : 0; }).slice(1)))+" kg"]
  ];
  document.getElementById("milestones").innerHTML = rows.map(function(r){ return "<div><span>"+r[0]+"</span><span>"+r[1]+"</span></div>"; }).join("");
  // 数据表
  var tb=document.getElementById("dataTable");
  var trs="";
  for(var i=LAST;i>=0 && i>LAST-800;i--){ var dv = i>0? r2(W[i].v-W[i-1].v):0; trs += "<tr><td>"+W[i].s+"</td><td>"+W[i].v+"</td><td>"+MA7[i]+"</td><td class='"+(dv<=0?"down":"up")+"'>"+(dv>0?"+":"")+dv+"</td></tr>"; }
  tb.innerHTML = trs;
  var search=document.getElementById("tblSearch");
  if(search && !search.dataset.done){ search.oninput=function(){ var q=this.value.trim(); Array.prototype.forEach.call(tb.children,function(tr){ tr.style.display = !q || tr.children[0].textContent.indexOf(q)>=0 ? "" : "none"; }); }; search.dataset.done="1"; }
}
function renderHist(id, values, binSize, colorFn){
  var vals=values.filter(function(v){return v!=null;}); if(!vals.length) return;
  var min=Math.min.apply(null,vals), max=Math.max.apply(null,vals); var bins=Math.max(6, Math.min(20, Math.round((max-min)/binSize)||10));
  var step=(max-min)/bins||1, counts=new Array(bins).fill(0), labels=[];
  for(var b=0;b<bins;b++) labels.push((min+step*b).toFixed(1));
  for(var i=0;i<vals.length;i++){ var bi=Math.min(bins-1, Math.floor((vals[i]-min)/step)); counts[bi]++; }
  setChart(id, barOpt(labels, counts, function(v){ return colorFn(v); }));
}

// ================= Tab 2：打卡复盘 =================
var checkinRendered = false;
function renderCheckin(){
  if(!DATA.checkin){ document.getElementById("checkinBody").innerHTML = '<div class="panel">没有可用的计划，生成时用 --plan 指定或先跑 fitness:calculate。</div>'; checkinRendered=true; return; }
  C=getC();
  var v=DATA.checkin;
  var badge = v.status==="reached"?"ok":v.status==="overdue"?"warn":"info";
  var statusText = v.status==="reached"?"已达标":v.status==="overdue"?("已超期 "+v.overdueDays+" 天"):v.status==="ongoing"?"进行中":"无数据";
  var k="";
  k+=kpi("当前体重", v.latest?v.latest.raw.toFixed(1)+" kg":"—", v.latest?("7日均 "+v.latest.ma7.toFixed(1)):"", "");
  k+=kpi("计划应到", v.planAt!=null?v.planAt.toFixed(1)+" kg":"—", "", "");
  k+=kpi("偏差", v.deviation!=null?((v.deviation>0?"+":"")+v.deviation.toFixed(1)+" kg"):"—", v.deviation==null?"":(v.deviation>0?"偏重":"偏轻"), v.deviation>0.05?"up":v.deviation<-0.05?"down":"flat");
  k+=kpi("完成率", v.completion.toFixed(1)+"%", "计划 "+v.startKg+"→"+v.targetKg, v.completion>=100?"down":"flat");
  k+=kpi("预计达成", v.eta?v.eta.date:"—", v.eta?((v.eta.diffDays<=0?"提前 ":-v.eta.diffDays+" 延后 ")+Math.abs(v.eta.diffDays)+" 天"):"速率≤0", "");
  k+=kpi("近况 vs 计划", v.rate.recent.toFixed(2)+" / "+v.rate.plan.toFixed(2), "kg/周", v.rate.recent>=v.rate.plan?"down":"up");
  document.getElementById("checkinKpis").innerHTML = k;
  document.getElementById("checkinBadge").innerHTML = '<span class="badge '+badge+'">'+statusText+'</span> · '+v.planName;

  // 趋势 + 计划线 + 节点
  var s=parseDate(v.startDate);
  var ser=v.series;
  var x=ser.map(function(p){return p.date;});
  var nodeW = v.nodes.week.filter(function(n){return n.ma!=null;}).map(function(n){ return [n.date, n.ma]; });
  setChart("chartCkTrend", lineOpt(x, [
    { name:"计划", color:C.ink, dash:true, data: ser.map(function(p){return p.plan;}) },
    { name:"实际(7日均)", color:C.accent, width:2, area:C.soft, data: ser.map(function(p){return p.actual;}) },
    { name:"周节点", color:C.warn, type:"scatter", data: ser.map(function(p){ var hit=nodeW.filter(function(n){return n[0]===p.date;})[0]; return hit? hit[1]: null; }) }
  ], "kg"));
  // 偏差轨迹
  setChart("chartCkDev", lineOpt(x, [ { name:"实际−计划", color:C.warn, width:1.8, data: ser.map(function(p){return p.diff;}), area:C.soft, extra:{ markLine:{ silent:true, symbol:"none", data:[{yAxis:0,lineStyle:{color:C.muted,type:"dashed"}}] } } } ], "kg"));
  // 节点对比（周/月）
  renderNodeCompare("chartCkWeek", v.nodes.week);
  renderNodeCompare("chartCkMonth", v.nodes.month);
  // 速率对比
  setChart("chartCkRate", barOpt(["近14天","近30天","近90天","全程","计划"], [v.rate.recent,v.rate.r30,v.rate.r90,v.rate.overall,v.rate.plan], function(val,i){ return i===4?C.muted:C.accent; }));
  // 建议 + 校验
  document.getElementById("ckAdvice").innerHTML = v.advice.lines.map(function(l){ return "<li>"+l+"</li>"; }).join("");
  document.getElementById("ckAdvice").className = "lines" + (v.advice.level==="warn"?" warn":"");
  var vs=v.validation; var vhtml="";
  if(!vs.errors.length && !vs.warnings.length) vhtml="<li>✓ 数据校验通过</li>";
  vs.errors.forEach(function(e){ vhtml+="<li>✗ "+e+"</li>"; }); vs.warnings.forEach(function(w){ vhtml+="<li>⚠ "+w+"</li>"; });
  document.getElementById("ckValid").innerHTML = vhtml;
  document.getElementById("ckValid").className = "lines" + (vs.errors.length?" warn":"");
  // 里程碑
  document.getElementById("ckMilestones").innerHTML = v.milestones.map(function(m){ return "<div><span>完成 "+m.pct+"%</span><span>"+(m.date||"—")+"</span></div>"; }).join("");
  // BMI
  document.getElementById("ckBmi").innerHTML = v.bmi ? ("当前 "+v.bmi.current+"（"+v.bmi.zone+"） · 目标 "+v.bmi.target) : "缺身高";
  checkinRendered = true;
}
function renderNodeCompare(id, nodes){
  var x=nodes.map(function(n){return "#"+n.index;});
  var plan=nodes.map(function(n){return n.planDrop;});
  var actual=nodes.map(function(n){return n.delta;});
  setChart(id, { color:[C.muted,C.accent], grid:gridOpt(48), tooltip:{trigger:"axis", valueFormatter:fmtNum}, legend:{top:0,textStyle:{color:C.muted}},
    xAxis:{ type:"category", data:x, axisLine:axLine(), axisLabel:{color:C.muted} },
    yAxis:{ type:"value", axisLine:{show:false}, splitLine:{lineStyle:{color:C.line}}, axisLabel:{color:C.muted, formatter:fmtNum} },
    series:[ { name:"计划降幅", type:"bar", data:plan, itemStyle:{color:C.muted} }, { name:"实际降幅", type:"bar", data:actual, itemStyle:{color:function(p){ return p.value!=null && p.value>=0 ? C.accent : C.bad; }} } ] });
}

// ================= 交互 =================
function switchTab(name){
  document.querySelectorAll(".tab").forEach(function(b){ b.classList.toggle("on", b.dataset.tab===name); });
  document.getElementById("tab-weight").classList.toggle("hidden", name!=="weight");
  document.getElementById("tab-checkin").classList.toggle("hidden", name!=="checkin");
  document.querySelector("h1").textContent = name==="weight" ? "体重大盘" : "打卡复盘";
  if(name==="checkin" && !checkinRendered) renderCheckin();
  resizeAll();
  history.replaceState(null, "", "#"+name);
}
document.querySelectorAll(".tab").forEach(function(b){ b.onclick=function(){ switchTab(b.dataset.tab); }; });
document.getElementById("themeBtn").onclick=function(){
  var dark = document.body.getAttribute("data-theme")==="dark";
  document.body.setAttribute("data-theme", dark?"light":"dark");
  this.textContent = dark?"🌙 深色":"☀️ 浅色";
  C=getC(); renderWeight(); if(checkinRendered) renderCheckin();
};
document.getElementById("csvBtn").onclick=function(){
  var lines=["date,kg,ma7"]; for(var i=0;i<W.length;i++) lines.push(W[i].s+","+W[i].v+","+MA7[i]);
  var blob=new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"});
  var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="weights.csv"; a.click();
};
function resizeAll(){ document.querySelectorAll(".chart").forEach(function(el){ if(el.offsetWidth===0) return; var inst=echarts.getInstanceByDom(el); if(inst) inst.resize(); }); }
window.addEventListener("resize", resizeAll);

renderWeight();
if(location.hash==="#checkin") switchTab("checkin");
`;

export function buildDashboardHtml(payload: DashboardPayload): string {
  const dataJson = JSON.stringify(payload);
  const pageJs = PAGE_JS.replace("__DATA__", dataJson);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>体重大盘</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
<style>${BASE_CSS}</style>
</head>
<body data-theme="light">
<div class="wrap">
  <header class="top">
    <h1>体重大盘</h1>
    <div class="meta" id="meta"></div>
  </header>

  <div class="toolbar">
    <div class="tabs">
      <button class="tab on" data-tab="weight">体重大盘</button>
      <button class="tab" data-tab="checkin">打卡复盘</button>
    </div>
    <span class="spacer"></span>
    <button class="btn" id="themeBtn">🌙 深色</button>
    <button class="btn" id="csvBtn">导出 CSV</button>
  </div>

  <div id="tab-weight">
    <div class="kpis" id="kpis"></div>

    <section>
      <h2>体重趋势 <span class="note">原始 · 7/30 日均 · 计划 · 预测</span><span class="rangebar" id="rangebar"></span></h2>
      <div class="panel"><div class="chart tall" id="chartTrend"></div></div>
    </section>

    <div class="grid2">
      <section><h2>累积减重</h2><div class="panel"><div class="chart" id="chartCum"></div></div></section>
      <section><h2>月度净变化</h2><div class="panel"><div class="chart" id="chartMonthly"></div></div></section>
    </div>

    <section><h2>速率</h2><div class="rates" id="rates"></div></section>

    <div class="grid2">
      <section><h2>周变化</h2><div class="panel"><div class="chart" id="chartWeekly"></div></div></section>
      <section><h2>周内模式 <span class="note">各星期几平均日变化</span></h2><div class="panel"><div class="chart" id="chartWeekday"></div></div></section>
    </div>

    <div class="grid2">
      <section><h2>同比 YoY <span class="note">各月平均体重</span></h2><div class="panel"><div class="chart" id="chartYoY"></div></div></section>
      <section><h2>分段瀑布 <span class="note">按趋势切分的净变化</span></h2><div class="panel"><div class="chart" id="chartWaterfall"></div></div></section>
    </div>

    <div class="grid2">
      <section><h2>平台期 <span class="note">MA30 近零区间</span></h2><div class="panel"><div class="chart" id="chartPlateau"></div></div></section>
      <section><h2>波动性 <span class="note">滚动 σ(30)</span></h2><div class="panel"><div class="chart" id="chartVol"></div></div></section>
    </div>

    <div class="grid2">
      <section id="bmiSection"><h2>BMI 趋势</h2><div class="panel"><div class="chart" id="chartBmi"></div></div></section>
      <section><h2>日变化分布</h2><div class="panel"><div class="chart" id="chartDDHist"></div></div></section>
    </div>

    <section><h2>打卡热力图 <span class="note">有记录的日期</span></h2><div class="panel"><div class="chart cal" id="chartCal"></div></div></section>
    <section><h2>日变化热力图 <span class="note">绿=下降 · 红=上升</span></h2><div class="panel"><div class="chart cal" id="chartCalDD"></div></div></section>

    <div class="grid2">
      <section><h2>分布</h2><div class="panel"><div class="chart" id="chartHist"></div></div></section>
      <section><h2>记录质量 <span class="note">每月记录天数</span></h2><div class="panel"><div class="chart" id="chartQuality"></div></div></section>
    </div>

    <section><h2>极值与里程碑</h2><div class="milestones" id="milestones"></div></section>

    <details>
      <summary>原始数据表</summary>
      <div class="panel" style="margin-top:12px">
        <input class="btn" id="tblSearch" placeholder="搜索日期，如 2026-10" style="margin-bottom:10px;width:220px" />
        <div class="tablewrap"><table class="dt"><thead><tr><th>日期</th><th>体重(kg)</th><th>7 日均</th><th>日变化</th></tr></thead><tbody id="dataTable"></tbody></table></div>
      </div>
    </details>
  </div>

  <div id="tab-checkin" class="hidden">
    <div class="toolbar"><div id="checkinBadge"></div></div>
    <div class="kpis" id="checkinKpis"></div>
    <section><h2>趋势 · 计划 · 周节点</h2><div class="panel"><div class="chart tall" id="chartCkTrend"></div></div></section>
    <section><h2>偏差轨迹 <span class="note">实际−计划（0 轴）</span></h2><div class="panel"><div class="chart" id="chartCkDev"></div></div></section>
    <div class="grid2">
      <section><h2>周节点对比 <span class="note">计划降幅 vs 实际降幅</span></h2><div class="panel"><div class="chart" id="chartCkWeek"></div></div></section>
      <section><h2>月节点对比</h2><div class="panel"><div class="chart" id="chartCkMonth"></div></div></section>
    </div>
    <div class="grid2">
      <section><h2>速率对比 <span class="note">实际 vs 计划 (kg/周)</span></h2><div class="panel"><div class="chart" id="chartCkRate"></div></div></section>
      <section><h2>BMI</h2><div class="panel" style="padding:18px"><div id="ckBmi" style="font-size:16px"></div></div></section>
    </div>
    <section>
      <div class="grid2">
        <div><h2>调整建议</h2><ul class="lines" id="ckAdvice"></ul></div>
        <div><h2>数据校验</h2><ul class="lines" id="ckValid"></ul></div>
      </div>
    </section>
    <section><h2>里程碑 <span class="note">计划总减重达成</span></h2><div class="milestones" id="ckMilestones"></div></section>
  </div>

  <footer id="foot"></footer>
</div>
<script>${JS_HELPERS}${pageJs}</script>
</body>
</html>`;
}