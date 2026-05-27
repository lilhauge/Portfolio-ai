import { useState, useEffect, useRef } from "react";

// API headers — works in Claude artifact (auto-injected key) AND standalone PWA (env key)
function apiHeaders() {
  const key = typeof window !== "undefined" && window.__ANTHROPIC_KEY__;
  const h = { "Content-Type": "application/json" };
  if (key) {
    h["x-api-key"] = key;
    h["anthropic-version"] = "2023-06-01";
    h["anthropic-dangerous-direct-browser-access"] = "true";
  }
  // Log headers in dev for debugging (key is masked)
  if (typeof window !== "undefined" && window.__ANTHROPIC_KEY__) {
    const keyPreview = window.__ANTHROPIC_KEY__.slice(0,12) + "...";
    console.log("[PortfolioAI] API call with key:", keyPreview);
  } else {
    console.warn("[PortfolioAI] No API key found — set VITE_ANTHROPIC_KEY in Vercel env vars");
  }
  return h;
}
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts";

// ─── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#05080f", panel:"#090e1a", card:"#0c1220",
  border:"#141f35", hi:"#1e304f",
  text:"#dce8f5", muted:"#4a6280", dim:"#1a2840",
  accent:"#38bdf8", gold:"#f59e0b", green:"#10b981", red:"#f43f5e",
};
const THEME_COLORS = {
  "Global kerne":                            "#34d399",
  "AI, automation & digital infrastruktur": "#534AB7",
  "Forsvar & geopolitisk sikkerhed":         "#1D9E75",
  "Energisikkerhed":                         "#BA7517",
  "Defensive aktiver":                       "#D4537E",
  "Value & udbytte":                         "#185FA5",
  "Råvarer & strategiske materialer":        "#639922",
  "Alternative bets":                        "#D85A30",
  "Kontanter":                               "#94a3b8",
};
const ALL_THEMES = Object.keys(THEME_COLORS);

// ─── Data ─────────────────────────────────────────────────────────────────────
// Kostpris = åbningskurs fra CSV (gennemsnitlig indkøbskurs)
// priceDKK = priceLocal × FX (EUR:7.46, USD:6.85 pr. 8. maj 2026)
const INIT_POS = [
  // ── Fælles depot ────────────────────────────────────────────────────────────
  { id:1,  name:"WisdomTree Core Physical Gold ETC",          account:"Fælles",      theme:"Defensive aktiver",                      symbol:"WGLD",   isin:"JE00BN2CJ301", currency:"EUR", shares:8,   price:null, chg:null, lots:[{id:101,date:"2026-04-27",shares:8,   priceLocal:397.65, currency:"EUR", priceDKK:2966.47}] },
  { id:2,  name:"WisdomTree Physical Precious Metals ETC",    account:"Fælles",      theme:"Defensive aktiver",                      symbol:"PHPM",   isin:"JE00B1VS3W29", currency:"EUR", shares:14,  price:null, chg:null, lots:[{id:102,date:"2024-01-01",shares:14,  priceLocal:281.53, currency:"EUR", priceDKK:2100.21}] },
  { id:3,  name:"WisdomTree Cybersecurity UCITS ETF",         account:"Fælles",      theme:"AI, automation & digital infrastruktur", symbol:"WCBR",   isin:"IE00BLPK3577", currency:"USD", shares:126, price:null, chg:null, lots:[{id:103,date:"2025-10-13",shares:126, priceLocal:31.63,  currency:"USD", priceDKK:216.66}] },
  { id:4,  name:"WisdomTree Enhanced Commodity UCITS ETF",    account:"Fælles",      theme:"Råvarer & strategiske materialer",       symbol:"WCOA",   isin:"IE00BYMLZY74", currency:"USD", shares:105, price:null, chg:null, lots:[{id:104,date:"2026-04-27",shares:105, priceLocal:22.26,  currency:"USD", priceDKK:152.48}] },
  { id:5,  name:"WisdomTree Physical Bitcoin ETN",            account:"Fælles",      theme:"Alternative bets",                       symbol:"WBTC",   isin:"GB00BJYDH287", currency:"EUR", shares:318, price:null, chg:null, lots:[{id:105,date:"2024-01-01",shares:318, priceLocal:15.25,  currency:"EUR", priceDKK:113.77}] },
  { id:6,  name:"VanEck Rare Earth & Strategic Metals ETF",   account:"Fælles",      theme:"Råvarer & strategiske materialer",       symbol:"REMX",   isin:"IE0002PG6CA6", currency:"EUR", shares:183, price:null, chg:null, lots:[{id:106,date:"2024-01-01",shares:183, priceLocal:14.01,  currency:"EUR", priceDKK:104.51}] },
  // ── Kristian ASK ────────────────────────────────────────────────────────────
  { id:7,  name:"iShares Core MSCI World ETF",                account:"Kristian ASK",theme:"Global kerne",                           symbol:"IWDA",   isin:"IE00B4L5Y983", currency:"EUR", shares:85,  price:null, chg:null, lots:[{id:107,date:"2024-01-01",shares:85,  priceLocal:112.17, currency:"EUR", priceDKK:836.79}] },
  { id:8,  name:"Maj Invest AI Semicon UCITS ETF",            account:"Kristian ASK",theme:"AI, automation & digital infrastruktur", symbol:"MAJAIS", isin:"DK0062615662", currency:"DKK", shares:303, price:null, chg:null, lots:[{id:108,date:"2025-09-17",shares:303, priceLocal:99.0,   currency:"DKK", priceDKK:99.0}] },
  { id:9,  name:"iShares MSCI World Value Factor ETF",        account:"Kristian ASK",theme:"Value & udbytte",                        symbol:"IWVL",   isin:"IE00BP3QZB59", currency:"EUR", shares:119, price:null, chg:null, lots:[{id:109,date:"2026-04-27",shares:119, priceLocal:58.46,  currency:"EUR", priceDKK:436.11}] },
  // ── Carina ASK ──────────────────────────────────────────────────────────────
  { id:10, name:"iShares Automation & Robotics ETF",          account:"Carina ASK",  theme:"AI, automation & digital infrastruktur", symbol:"2B76",   isin:"IE00BYZK4552", currency:"EUR", shares:261, price:null, chg:null, lots:[{id:110,date:"2024-01-01",shares:261, priceLocal:13.06,  currency:"EUR", priceDKK:97.43}] },
  { id:11, name:"VanEck Defense UCITS ETF",                   account:"Carina ASK",  theme:"Forsvar & geopolitisk sikkerhed",        symbol:"DFEN",   isin:"IE000YYE6WK5", currency:"EUR", shares:110, price:null, chg:null, lots:[{id:111,date:"2025-03-28",shares:110, priceLocal:41.61,  currency:"EUR", priceDKK:310.41}] },
  { id:12, name:"VanEck Uranium & Nuclear Technologies ETF",  account:"Carina ASK",  theme:"Energisikkerhed",                        symbol:"NUKL",   isin:"IE000M7V94E1", currency:"EUR", shares:111, price:null, chg:null, lots:[{id:112,date:"2024-01-01",shares:111, priceLocal:45.18,  currency:"EUR", priceDKK:337.04}] },
  { id:13, name:"iShares Core MSCI World ETF",                account:"Carina ASK",  theme:"Global kerne",                           symbol:"IWDA",   isin:"IE00B4L5Y983", currency:"EUR", shares:45,  price:null, chg:null, lots:[{id:113,date:"2024-01-01",shares:45,  priceLocal:111.49, currency:"EUR", priceDKK:831.72}] },
  { id:14, name:"Future of Defence UCITS ETF",                account:"Carina ASK",  theme:"Forsvar & geopolitisk sikkerhed",        symbol:"ASWC",   isin:"IE000OJ5TQP4", currency:"EUR", shares:179, price:null, chg:null, lots:[{id:114,date:"2026-05-08",shares:179, priceLocal:16.49,  currency:"EUR", priceDKK:123.02}] },
  { id:15, name:"iShares Global Clean Energy Transition ETF", account:"Carina ASK",  theme:"Energisikkerhed",                        symbol:"INRG",   isin:"IE00B1XNHC34", currency:"USD", shares:313, price:null, chg:null, lots:[{id:115,date:"2026-05-06",shares:313, priceLocal:12.30,  currency:"USD", priceDKK:84.25}] },
];
// Målvægte = midtpunkt af de angivne ranges
// Rebalanceringsalarmen slår til ved ±afvigelse fra målet
const INIT_TGT = {
  "Global kerne":                            19,   // range 18–20%
  "AI, automation & digital infrastruktur":  17,   // range 15–20%
  "Forsvar & geopolitisk sikkerhed":         11,   // range  8–15%
  "Energisikkerhed":                         11,   // range  8–15%
  "Defensive aktiver":                       11,   // range  8–15%
  "Value & udbytte":                         10,   // range  8–12%
  "Råvarer & strategiske materialer":         7,   // range  5–10%
  "Alternative bets":                         7,   // range  5–10%
  "Kontanter":                                7,   // range  6–8%
};

// ─── Pure helpers (FX-aware) ───────────────────────────────────────────────────
// fx = {USD:6.85, EUR:7.46, DKK:1, ...} — rates relative to DKK
function lotValueDKK(lot, fx) {
  // lots store priceLocal (in trading currency) + currency; fallback to priceDKK for old data
  const price = lot.priceLocal ?? lot.priceDKK ?? 0;
  const ccy   = lot.currency || "DKK";
  const rate  = fx ? (fx[ccy] ?? fx[ccy.toUpperCase()] ?? 1) : 1;
  return price * rate * lot.shares;
}
function avgCostDKK(p, fx) {
  const lots = p.lots || [], tot = lots.reduce((s,l)=>s+l.shares,0);
  if (!tot) return null;
  return lots.reduce((s,l)=>s+lotValueDKK(l,fx),0)/tot;
}
function posValue(p, fx) {
  if (p.price) return Math.round(p.price*p.shares);  // live price already in DKK
  return (p.lots||[]).reduce((s,l)=>s+lotValueDKK(l,fx),0);
}
function calcThemes(pos, tgt, fx) {
  const tot = pos.reduce((s,p)=>s+posValue(p,fx),0);
  return ALL_THEMES.map(theme=>{
    const ps=pos.filter(p=>p.theme===theme);
    const val=ps.reduce((s,p)=>s+posValue(p,fx),0);
    const act=tot>0?(val/tot)*100:0, tg=tgt[theme]??0;
    const cov=ps.filter(p=>p.chg!=null), covV=cov.reduce((s,p)=>s+posValue(p),0);
    const chg=covV>0?cov.reduce((s,p)=>s+posValue(p)*p.chg,0)/covV:null;
    return {theme,val,act,tg,drift:act-tg,ps,color:THEME_COLORS[theme],chg};
  });
}
const f2=(n,d=2)=>n?.toLocaleString("da-DK",{minimumFractionDigits:d,maximumFractionDigits:d})??"–";
const fK=n=>f2(n,0)+" kr";
const fP=n=>(n>=0?"+":"")+f2(n)+"%";
const tLbl=ts=>ts?new Date(ts).toLocaleTimeString("da-DK",{hour:"2-digit",minute:"2-digit"}):null;
const TTL=2*60*60*1000;

// ─── Storage ───────────────────────────────────────────────────────────────────
const SK={pos:"pf-pos-v8",tgt:"pf-tgt-v8",thr:"pf-thr-v8",ts:"pf-ts-v8"};
async function sg(k){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):null;}catch{return null;}}
async function ss(k,v){try{await window.storage.set(k,JSON.stringify(v));}catch{}}

// ─── FX ───────────────────────────────────────────────────────────────────────
const FX0={USD:6.85,EUR:7.46,DKK:1,GBP:8.70};
async function getFx(){
  try{
    const r=await fetch("https://api.frankfurter.app/latest?from=DKK&to=USD,EUR,GBP");
    if(!r.ok)return FX0;
    const d=await r.json(), out={DKK:1};
    for(const[c,v]of Object.entries(d.rates||{}))out[c]=1/v;
    return{...FX0,...out};
  }catch{return FX0;}
}

// ─── Claude price fetch (agentic loop) ────────────────────────────────────────
async function claudeFetch(positions,onLog){
  const tr=positions.filter(p=>p.symbol&&p.isin);
  if(!tr.length)return[];
  const list=tr.map(p=>p.name+" | ISIN:"+p.isin+" | currency:"+p.currency).join("\n");
  const sys="You are a financial data tool. Search for current market prices. Respond with ONLY a raw JSON array, nothing else. Format: [{\"isin\":\"...\",\"price\":12.34,\"currency\":\"EUR\",\"chgPct\":0.5}]. Omit instruments not found.";
  const msgs=[{role:"user",content:"Find today's prices for:\n"+list+"\n\nReturn ONLY the JSON array."}];
  // Check key before starting
  if (typeof window !== "undefined" && !window.__ANTHROPIC_KEY__) {
    throw new Error("Mangler API-nøgle. Tjek at VITE_ANTHROPIC_KEY er sat i Vercel Environment Variables og at du har redeployet.");
  }
  for(let i=0;i<12;i++){
    onLog("Søger kurser… (tur "+(i+1)+")");
    const resp=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:apiHeaders(),
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:4000,system:sys,tools:[{type:"web_search_20250305",name:"web_search"}],messages:msgs}),
    });
    if(!resp.ok){const t=await resp.text();throw new Error("API "+resp.status+": "+t.slice(0,300));}
    const data=await resp.json();
    msgs.push({role:"assistant",content:data.content});
    if(data.stop_reason==="end_turn"){
      const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      if(!text.trim())throw new Error("Tomt svar");
      const si=text.indexOf("["),ei=text.lastIndexOf("]");
      if(si===-1||ei===-1)throw new Error("Ingen JSON. Fik: "+text.slice(0,200));
      return JSON.parse(text.slice(si,ei+1));
    }
    if(data.stop_reason==="tool_use")continue;
    throw new Error("Uventet stop_reason: "+data.stop_reason);
  }
  throw new Error("Max ture nået");
}

// ─── useWindowWidth ────────────────────────────────────────────────────────────
function useWindowWidth(){
  const[w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}

// ─── UI atoms ──────────────────────────────────────────────────────────────────
const Dot=({color,size=8})=><div style={{width:size,height:size,borderRadius:2,background:color,flexShrink:0}}/>;
const Chip=({children,color})=><span style={{background:color+"1a",color,border:"1px solid "+color+"40",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;
const Card=({children,style})=><div style={{background:T.card,border:"1px solid "+T.border,borderRadius:14,padding:16,...(style||{})}}>{children}</div>;
const Inp=({label,...p})=>(
  <label style={{display:"block",marginBottom:12}}>
    <div style={{color:T.muted,fontSize:11,marginBottom:4}}>{label}</div>
    <input {...p} style={{background:T.bg,border:"1px solid "+T.border,borderRadius:7,color:T.text,padding:"9px 12px",fontSize:13,width:"100%",outline:"none",fontFamily:"inherit",...(p.style||{})}}/>
  </label>
);
const Sel=({label,children,...p})=>(
  <label style={{display:"block",marginBottom:12}}>
    <div style={{color:T.muted,fontSize:11,marginBottom:4}}>{label}</div>
    <select {...p} style={{background:T.bg,border:"1px solid "+T.border,borderRadius:7,color:T.text,padding:"9px 12px",fontSize:13,width:"100%",outline:"none",fontFamily:"inherit",appearance:"none"}}>{children}</select>
  </label>
);
const ActiveSlice=({cx,cy,innerRadius,outerRadius,startAngle,endAngle,fill})=>(
  <g>
    <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius+7} startAngle={startAngle} endAngle={endAngle} fill={fill}/>
    <Sector cx={cx} cy={cy} innerRadius={innerRadius-4} outerRadius={innerRadius-1} startAngle={startAngle} endAngle={endAngle} fill={fill}/>
  </g>
);

// ─── Stat cell — consistent label+value block ──────────────────────────────────
const StatCell=({label,value,sub,color})=>(
  <div>
    <div style={{fontSize:9,color:T.muted,letterSpacing:.8,textTransform:"uppercase",marginBottom:2}}>{label}</div>
    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:color||T.text}}>{value}</div>
    {sub&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:color||T.muted,marginTop:1}}>{sub}</div>}
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────

// ── BuySummary: shows total and new avg cost safely ───────────────────────────
function BuySummary({form, mPos, fx}) {
  const sh = parseFloat(form.shares);
  const pr = parseFloat(form.priceDKK);
  if (!sh || !pr || isNaN(sh) || isNaN(pr)) return null;
  const ccy = mPos ? (mPos.currency || "DKK") : (form.currency || "DKK");
  const rate = (fx && (fx[ccy] ?? fx[ccy.toUpperCase()])) || 1;
  const localTotal = sh * pr;
  const dkkTotal = localTotal * rate;
  const existingAvg = mPos ? avgCostDKK(mPos, fx) : null;
  const newAvg = (existingAvg && mPos)
    ? (existingAvg * mPos.shares + dkkTotal) / (mPos.shares + sh)
    : null;
  return (
    <div style={{background:"#05080f",borderRadius:7,padding:"8px 12px",marginBottom:14,fontSize:12,color:"#4a6280"}}>
      <span>Samlet: <strong style={{color:"#dce8f5"}}>{f2(localTotal,0)} {ccy}</strong></span>
      {ccy !== "DKK" && <span style={{color:"#4a6280"}}> ≈ <strong style={{color:"#dce8f5"}}>{fK(dkkTotal)}</strong></span>}
      {newAvg && <span style={{marginLeft:8}}>· Ny snitkurs: <strong style={{color:"#38bdf8"}}>{fK(newAvg)}</strong></span>}
    </div>
  );
}

export default function App(){
  const[pos,setPos]=useState(INIT_POS);
  const[tgt,setTgt]=useState(INIT_TGT);
  const[fx,setFx]=useState(FX0);
  const[thr,setThr]=useState(3);
  const[tab,setTab]=useState("overblik");
  const[ready,setReady]=useState(false);
  const[priceTs,setPriceTs]=useState(null);
  const[fetching,setFetching]=useState(false);
  const[priceLog,setPriceLog]=useState("");
  const[priceErr,setPriceErr]=useState(null);
  const[modal,setModal]=useState(null);
  const[mPos,setMPos]=useState(null);
  const[form,setForm]=useState({});
  const[aiText,setAiText]=useState("");
  const[aiLoading,setAiLoading]=useState(false);
  const[aiErr,setAiErr]=useState(null);
  const[pieHover,setPieHover]=useState(null);
  const[expandP,setExpandP]=useState(null);
  const[expandOT,setExpandOT]=useState(null);
  const[menuOpen,setMenuOpen]=useState(false);
  const w=useWindowWidth(),mob=w<640,tab_=w<1024;
  const fetchRef=useRef(false),timerRef=useRef(null);

  useEffect(()=>{
    (async()=>{
      const[p,t,th,ts,fxSaved]=await Promise.all([sg(SK.pos),sg(SK.tgt),sg(SK.thr),sg(SK.ts),sg("pf-fx-v8")]);
      if(p)setPos(p);if(t)setTgt(t);if(th)setThr(th);if(ts)setPriceTs(ts);if(fxSaved)setFx(fxSaved);
      setReady(true);
    })();
  },[]);
  useEffect(()=>{if(ready)ss(SK.pos,pos);},[pos,ready]);
  useEffect(()=>{if(ready)ss(SK.tgt,tgt);},[tgt,ready]);
  useEffect(()=>{if(ready)ss(SK.thr,thr);},[thr,ready]);

  async function fetchPrices(force){
    if(fetchRef.current)return;
    const age=priceTs?Date.now()-priceTs:Infinity;
    if(!force&&age<TTL)return;
    fetchRef.current=true;setFetching(true);setPriceErr(null);setPriceLog("Henter valutakurser…");
    try{
      const fxLive=await getFx();
      setFx(fxLive);
      ss("pf-fx-v8",fxLive);
      const current=(await sg(SK.pos))||INIT_POS;
      const data=await claudeFetch(current,setPriceLog);
      const map={};for(const d of data)if(d.isin&&d.price)map[d.isin]=d;
      setPos(prev=>prev.map(p=>{
        if(!p.isin)return p;const e=map[p.isin];if(!e)return p;
        const rate=fxLive[e.currency]??fxLive[(e.currency||"").toUpperCase()]??1;
        return{...p,price:e.price*rate,chg:e.chgPct??null};
      }));
      const ts=Date.now();setPriceTs(ts);ss(SK.ts,ts);setPriceLog("");
    }catch(e){setPriceErr(e.message);setPriceLog("");}
    setFetching(false);fetchRef.current=false;
  }
  useEffect(()=>{
    if(!ready)return;
    fetchPrices(false);
    timerRef.current=setInterval(()=>fetchPrices(true),TTL);
    return()=>clearInterval(timerRef.current);
  },[ready]); // eslint-disable-line

  const th=calcThemes(pos,tgt,fx);
  const tot=pos.reduce((s,p)=>s+posValue(p,fx),0);
  const alrt=th.filter(t=>Math.abs(t.drift)>thr);
  const tPct=th.reduce((s,t)=>s+t.tg,0);
  const actT=pieHover!=null?th[pieHover]:null;
  const covPos=pos.filter(p=>p.chg!=null);
  const covVal=covPos.reduce((s,p)=>s+posValue(p,fx),0);
  const portDlt=covVal>0?covPos.reduce((s,p)=>s+posValue(p,fx)*p.chg,0)/covVal:null;
  const portDltDKK=portDlt!=null?Math.round(tot*portDlt/100):null;

  function openBuyNew(){setForm({name:"",theme:ALL_THEMES[0],symbol:"",isin:"",currency:"EUR",shares:"",priceDKK:"",date:new Date().toISOString().slice(0,10)});setMPos(null);setModal("buy");}
  function openBuyExisting(p){setForm({shares:"",priceDKK:p.price?f2(p.price):"",date:new Date().toISOString().slice(0,10)});setMPos(p);setModal("buy");}
  function saveBuy(){
    const sh=+form.shares,pr=+form.priceDKK;if(!sh||!pr)return;
    const ccy=mPos?mPos.currency:(form.currency||"DKK");
    const fxRate=fx[ccy]??fx[ccy.toUpperCase()]??1;
    const lot={id:Date.now(),date:form.date||new Date().toISOString().slice(0,10),shares:sh,priceLocal:pr,currency:ccy,priceDKK:pr*fxRate};
    if(mPos){setPos(prev=>prev.map(p=>{if(p.id!==mPos.id)return p;const lots=[...(p.lots||[]),lot];return{...p,lots,shares:lots.reduce((s,l)=>s+l.shares,0)};}));}
    else setPos(prev=>[...prev,{id:Date.now()+1,name:form.name,theme:form.theme,symbol:form.symbol,isin:form.isin,currency:form.currency,shares:sh,price:null,chg:null,lots:[lot]}]);
    setModal(null);
  }
  function delLot(posId,lotId){
    setPos(prev=>prev.map(p=>{if(p.id!==posId)return p;const lots=(p.lots||[]).filter(l=>l.id!==lotId);if(!lots.length)return null;return{...p,lots,shares:lots.reduce((s,l)=>s+l.shares,0)};}).filter(Boolean));
  }
  function openEditLot(p,lot){
    const ccy=lot.currency||p.currency||"DKK";
    const localPrice=lot.priceLocal??lot.priceDKK??0;
    setForm({shares:String(lot.shares),priceDKK:f2(localPrice),currency:ccy,date:lot.date,lotId:lot.id,editing:false});
    setMPos(p);setModal("editLot");
  }
  function saveEditLot(){
    const sh=+form.shares,pr=parseFloat(form.priceDKK);if(!sh||!pr)return;
    const ccy=form.currency||mPos?.currency||"DKK";
    const rate=(fx&&(fx[ccy]??fx[ccy.toUpperCase()]))||1;
    setPos(prev=>prev.map(p=>{
      if(p.id!==mPos.id)return p;
      const lots=(p.lots||[]).map(l=>l.id===form.lotId
        ?{...l,shares:sh,priceLocal:pr,currency:ccy,priceDKK:pr*rate,date:form.date||l.date}
        :l);
      return{...p,lots,shares:lots.reduce((s,l)=>s+l.shares,0)};
    }));
    setModal(null);
  }
  function openTheme(t){setForm({theme:t.theme,tg:t.tg});setModal("theme");}
  function saveTheme(){setTgt(t=>({...t,[form.theme]:+form.tg}));setModal(null);}

  async function runAI(){
    setAiLoading(true);setAiText("");setAiErr(null);
    try{
      const themes=calcThemes(pos,tgt);
      const total=pos.reduce((s,p)=>s+posValue(p),0);
      const posLines=pos.map(p=>{
        const v=posValue(p,fx),avg=avgCostDKK(p,fx);
        const pctPf=total>0?((v/total)*100).toFixed(1):0;
        const ret=avg&&p.price?((p.price-avg)/avg*100).toFixed(1):null;
        return "- "+p.name+" ["+p.theme+"]: "+p.shares+" stk | snitkurs "+(avg?fK(avg):"?")+" | kurs "+(p.price?fK(p.price):"?")+" | "+fK(v)+" ("+pctPf+"% af portef.)"+(ret?" | afkast "+ret+"%":"")+(p.chg!=null?" | dag "+fP(p.chg):"");
      }).join("\n");
      const tLines=themes.map(t=>"- "+t.theme+": "+f2(t.act)+"% (mål "+t.tg+"%, drift "+fP(t.drift)+") = "+fK(t.val)).join("\n");
      const prompt="Du er en erfaren dansk porteføljerådgiver. Analyser denne ETF-portefølje og giv konkrete anbefalinger på dansk.\n\nPORTEFØLJE — total: "+fK(total)+"\n\nPositioner:\n"+posLines+"\n\nTema-balance (rebalanceringsgrænse ±"+thr+"%):\n"+tLines+"\n\nMålvægte summerer til: "+f2(tPct,0)+"%\n\nGiv en struktureret analyse:\n1. Overordnet vurdering (3-4 sætninger)\n2. Rebalancering — hvad skal købes/sælges og for hvilke beløb i DKK\n3. Afkast og snitkurser — kommentar til store gevinster/tab\n4. Top 3 anbefalinger\n5. Risici\n\nVær konkret. Nævn instrumentnavne og beløb i DKK.";
      const r=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:apiHeaders(),
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2000,messages:[{role:"user",content:prompt}]}),
      });
      if(!r.ok){const errTxt=await r.text();throw new Error("API "+r.status+": "+errTxt.slice(0,300));}
      const d=await r.json();
      if(d.error)throw new Error(d.error.message||JSON.stringify(d.error));
      const text=(d.content||[]).map(b=>b.text||"").join("").trim();
      if(!text)throw new Error("Tomt svar. Fuld respons: "+JSON.stringify(d).slice(0,300));
      setAiText(text);
    }catch(e){setAiErr(e.message);}
    setAiLoading(false);
  }

  const TABS=[{id:"overblik",label:"Overblik"},{id:"positioner",label:"Positioner"},{id:"rebalancer",label:"Rebalancering",badge:alrt.length},{id:"analyse",label:"AI Analyse"}];

  if(!ready)return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'Sora',sans-serif",color:T.muted}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700&display=swap');@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{fontSize:30,animation:"spin 2s linear infinite",color:T.accent}}>◌</div>Indlæser…
    </div>
  );

  function PriceBar(){
    const fxStr=priceTs?Object.entries(fx).filter(([c])=>c!=="DKK").map(([c,r])=>c+":"+f2(r,2)).join("  "):null;
    return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:5,height:5,borderRadius:"50%",flexShrink:0,background:fetching?T.accent:priceErr?T.red:priceTs&&Date.now()-priceTs<TTL?T.green:T.gold,animation:fetching?"pulse 1s infinite":"none"}}/>
      <span style={{fontSize:10,color:T.muted,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fetching?priceLog||"Henter…":priceErr?"⚠ "+priceErr.slice(0,80):priceTs?"Kurser: "+tLbl(priceTs):""}{fxStr&&!fetching?" · "+fxStr:""}</span>
      {!fetching&&<button onClick={()=>fetchPrices(true)} style={{background:T.accent+"15",color:T.accent,border:"1px solid "+T.accent+"30",borderRadius:5,padding:"2px 7px",fontSize:9,cursor:"pointer",fontWeight:600,flexShrink:0}}>↻</button>}
    </div>
  );}

  return(
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Sora',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:#05080f}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#05080f}::-webkit-scrollbar-thumb{background:#141f35;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .hov:hover{background:#0f1928!important}
        .trow:hover{background:rgba(14,25,45,.8)}
        input:focus,select:focus{border-color:#38bdf8!important;outline:none}
        button{font-family:inherit}
      `}</style>

      {/* Header */}
      <header style={{background:T.panel,borderBottom:"1px solid "+T.border,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 "+(mob?14:24)+"px",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0,flex:1}}>
            <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,"+T.accent+",#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,animation:"glow 3s infinite",flexShrink:0}}>◈</div>
            <span style={{fontWeight:700,fontSize:13,whiteSpace:"nowrap"}}>PortfolioAI</span>
            {!mob&&<div style={{marginLeft:6,width:170,flexShrink:0}}><PriceBar/></div>}
          </div>
          {!mob&&(
            <nav style={{display:"flex",height:"100%",flexShrink:0}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"0 14px",color:tab===t.id?T.accent:T.muted,fontWeight:tab===t.id?700:400,fontSize:12,borderBottom:"2px solid "+(tab===t.id?T.accent:"transparent"),transition:"color .15s"}}>
                  {t.label}{t.badge>0&&<span style={{marginLeft:4,background:T.red,color:"#fff",borderRadius:9,padding:"1px 5px",fontSize:9,fontWeight:700,verticalAlign:"middle"}}>{t.badge}</span>}
                </button>
              ))}
            </nav>
          )}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <button onClick={openBuyNew} style={{background:T.accent,color:T.bg,border:"none",borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:14}}>＋</span>{!mob&&" Tilføj"}
            </button>
            {mob&&<button onClick={()=>setMenuOpen(o=>!o)} style={{background:"none",border:"1px solid "+T.border,borderRadius:6,padding:"5px 9px",color:T.text,cursor:"pointer",fontSize:14}}>{menuOpen?"✕":"☰"}</button>}
          </div>
        </div>
        {mob&&<div style={{padding:"5px 14px 7px",borderTop:"1px solid "+T.border}}><PriceBar/></div>}
        {mob&&menuOpen&&(
          <div style={{background:T.panel,borderTop:"1px solid "+T.border,animation:"slideDown .2s ease"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setMenuOpen(false);}} style={{display:"block",width:"100%",background:"none",border:"none",cursor:"pointer",padding:"13px 18px",color:tab===t.id?T.accent:T.muted,fontWeight:tab===t.id?700:400,fontSize:13,textAlign:"left",borderBottom:"1px solid "+T.border}}>
                {t.label}{t.badge>0&&<span style={{marginLeft:5,background:T.red,color:"#fff",borderRadius:9,padding:"1px 5px",fontSize:9,fontWeight:700}}>{t.badge}</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      <main style={{padding:mob?"10px":"16px 20px",maxWidth:900,margin:"0 auto"}}>

        {/* ═══ OVERBLIK ══════════════════════════════════════════════════ */}
        {tab==="overblik"&&(
          <div style={{animation:"fadeUp .3s ease"}}>
            {/* Top stat row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:10,marginBottom:14}}>
              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px"}}>
                <div style={{color:T.muted,fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Total værdi</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,fontWeight:700}}>{fK(tot)}</div>
              </div>
              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px"}}>
                <div style={{color:T.muted,fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Dag ændring</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,fontWeight:700,color:portDlt!=null?(portDlt>=0?T.green:T.red):T.dim}}>{portDlt!=null?fP(portDlt):"–"}</div>
                {portDltDKK!=null&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:portDlt>=0?T.green:T.red,marginTop:2}}>{portDltDKK>=0?"+":""}{fK(portDltDKK)}</div>}
              </div>
              <button onClick={()=>setTab("rebalancer")} style={{background:alrt.length?T.gold+"18":T.card,border:"1px solid "+(alrt.length?T.gold+"60":T.border),borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left"}}>
                <div style={{color:T.muted,fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Alarmer</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,fontWeight:700,color:alrt.length?T.gold:T.green}}>{alrt.length}</div>
                {alrt.length>0&&<div style={{fontSize:9,color:T.gold,marginTop:2}}>Se rebalancering →</div>}
              </button>
            </div>

            {/* Pie + theme list */}
            <div style={{display:"grid",gridTemplateColumns:tab_?"1fr":"240px 1fr",gap:14}}>
              <Card style={{padding:14}}>
                <div style={{color:T.muted,fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Fordeling</div>
                <div style={{position:"relative"}}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={th} dataKey="val" nameKey="theme" cx="50%" cy="50%" outerRadius={78} innerRadius={40} paddingAngle={2}
                        activeIndex={pieHover} activeShape={ActiveSlice}
                        onMouseEnter={(_,i)=>setPieHover(i)} onMouseLeave={()=>setPieHover(null)}
                        onClick={d=>setExpandOT(expandOT===d.theme?null:d.theme)}>
                        {th.map((t,i)=><Cell key={i} fill={t.color} opacity={pieHover===null||pieHover===i?1:0.4} style={{cursor:"pointer"}}/>)}
                      </Pie>
                      <Tooltip content={({active,payload})=>{
                        if(!active||!payload?.length)return null;
                        const d=payload[0].payload;
                        return(<div style={{background:T.panel,border:"1px solid "+d.color+"50",borderRadius:8,padding:"8px 12px",fontSize:11}}>
                          <div style={{color:d.color,fontWeight:700,marginBottom:2}}>{d.theme}</div>
                          <div>{fK(d.val)} · {f2(d.act)}%</div>
                          {d.chg!=null&&<div style={{color:d.chg>=0?T.green:T.red}}>Dag: {fP(d.chg)}</div>}
                        </div>);
                      }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  {actT&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:actT.color}}>{f2(actT.act)}%</div>
                  </div>}
                </div>
                {th.map((t,i)=>(
                  <div key={t.theme} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,padding:"2px 3px",borderRadius:4,cursor:"pointer",background:pieHover===i?t.color+"12":"transparent"}}
                    onMouseEnter={()=>setPieHover(i)} onMouseLeave={()=>setPieHover(null)}
                    onClick={()=>setExpandOT(expandOT===t.theme?null:t.theme)}>
                    <Dot color={t.color}/>
                    <span style={{flex:1,color:pieHover===i?T.text:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.theme}</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",color:pieHover===i?t.color:T.text,fontSize:10}}>{f2(t.act)}%</span>
                    {Math.abs(t.drift)>thr&&<Chip color={t.drift>0?T.red:T.gold}>{t.drift>0?"▲":"▼"}</Chip>}
                  </div>
                ))}
              </Card>

              {/* Theme cards — vertical layout, no scroll needed */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...th].sort((a,b)=>b.val-a.val).map(t=>{
                  const open=expandOT===t.theme;
                  return(
                    <div key={t.theme} style={{background:T.panel,border:"1px solid "+(open?t.color+"55":T.border),borderRadius:12,overflow:"hidden",transition:"border-color .2s"}}>
                      {/* Collapsed: single row, all data fits */}
                      <div className="hov" style={{padding:"10px 14px",cursor:"pointer",background:open?t.color+"07":"transparent"}} onClick={()=>setExpandOT(open?null:t.theme)}>
                        {/* Row 1: name + chevron */}
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <div style={{width:3,height:14,borderRadius:2,background:t.color,flexShrink:0}}/>
                          <div style={{flex:1,fontWeight:600,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.theme}</div>
                          {Math.abs(t.drift)>thr&&<Chip color={t.drift>0?T.red:T.gold}>{t.drift>0?"OVER":"UNDER"}</Chip>}
                          <span style={{color:T.muted,fontSize:10,flexShrink:0}}>{open?"▲":"▼"}</span>
                        </div>
                        {/* Row 2: 4 data cells aligned */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,paddingLeft:11}}>
                          <StatCell label="Værdi" value={fK(t.val)}/>
                          <StatCell label="Portf." value={f2(t.act)+"%"}/>
                          <StatCell label="Dag Δ" value={t.chg!=null?fP(t.chg):"–"} color={t.chg!=null?(t.chg>=0?T.green:T.red):T.dim}/>
                          <StatCell label="Drift" value={(t.drift>=0?"+":"")+f2(t.drift)+"%" } color={Math.abs(t.drift)>thr?(t.drift>0?T.red:T.gold):T.muted}/>
                        </div>
                      </div>
                      {/* Expanded: positions */}
                      {open&&t.ps.map(p=>{
                        const v=posValue(p,fx),avg=avgCostDKK(p,fx),pctT=t.val>0?(v/t.val)*100:0;
                        return(
                          <div key={p.id} style={{borderTop:"1px solid "+T.border,padding:"9px 14px 9px 25px"}}>
                            <div style={{fontWeight:500,fontSize:12,marginBottom:4}}>{p.name}</div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                              <StatCell label="Snitkurs" value={avg?fK(avg):"–"}/>
                              <StatCell label="Markedsværdi" value={fK(v)}/>
                              <StatCell label="Andel tema" value={f2(pctT)+"%"}/>
                              <StatCell label="Dag Δ" value={p.chg!=null?fP(p.chg):"–"} color={p.chg!=null?(p.chg>=0?T.green:T.red):T.dim}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ POSITIONER ════════════════════════════════════════════════ */}
        {tab==="positioner"&&(
          <div style={{animation:"fadeUp .3s ease",display:"flex",flexDirection:"column",gap:10}}>
            {pos.map(p=>{
              const open=expandP===p.id;
              const v=posValue(p,fx),avg=avgCostDKK(p,fx);
              const tc=THEME_COLORS[p.theme]||T.muted;
              const retPct=avg&&p.price?(p.price-avg)/avg*100:null;
              return(
                <div key={p.id} style={{background:T.card,border:"1px solid "+(open?tc+"50":T.border),borderRadius:14,transition:"border-color .2s"}}>
                  {/* Header — vertical layout, no scroll */}
                  <div style={{padding:mob?"10px 12px":"12px 16px",cursor:"pointer"}} onClick={()=>setExpandP(open?null:p.id)}>
                    {/* Row 1: dot + name + buy button + chevron */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <Dot color={tc} size={7}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                        <div style={{fontSize:9,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1}}>{p.theme}{p.account&&<span style={{marginLeft:6,background:T.dim,color:T.muted,borderRadius:3,padding:"0 4px",fontSize:8}}>{p.account}</span>}</div>
                      </div>
                      <div onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>openBuyExisting(p)} style={{background:T.green+"18",color:T.green,border:"1px solid "+T.green+"35",borderRadius:6,padding:"4px 9px",fontSize:10,cursor:"pointer",fontWeight:700}}>+ Køb</button>
                      </div>
                      <span style={{color:T.muted,fontSize:10,flexShrink:0}}>{open?"▲":"▼"}</span>
                    </div>
                    {/* Row 2: 4 data cells — identical grid across all cards */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,paddingLeft:15}}>
                      <StatCell label="Antal" value={p.shares+" stk"}/>
                      <StatCell label="Snitkurs" value={avg?fK(avg):"–"}/>
                      <StatCell label="Live kurs" value={p.price?fK(p.price):"–"} sub={p.chg!=null?fP(p.chg):undefined} color={p.chg!=null?(p.chg>=0?T.green:T.red):undefined}/>
                      <StatCell label="Markedsværdi" value={fK(v)} sub={retPct!=null?fP(retPct):undefined} color={retPct!=null?(retPct>=0?T.green:T.red):undefined}/>
                    </div>
                  </div>

                  {/* Expanded: lots */}
                  {open&&(
                    <div style={{borderTop:"1px solid "+T.border}}>
                      {/* Lots header */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 60px 100px 90px",gap:8,padding:"5px 14px",background:T.bg}}>
                        {["Dato","Antal","Kurs (DKK)","Beløb"].map(h=>(
                          <div key={h} style={{fontSize:9,color:T.muted,fontWeight:600,letterSpacing:.6,textTransform:"uppercase",textAlign:h==="Dato"?"left":"right"}}>{h}</div>
                        ))}
                      </div>
                      {(p.lots||[]).map(lot=>(
                        <div key={lot.id} className="trow" onClick={e=>{e.stopPropagation();openEditLot(p,lot);}}
                          style={{display:"grid",gridTemplateColumns:"1fr 60px 100px 90px",gap:8,padding:"7px 14px",borderTop:"1px solid "+T.border,alignItems:"center",cursor:"pointer"}}>
                          <div style={{fontSize:11,color:T.muted,fontFamily:"'IBM Plex Mono',monospace"}}>{lot.date}</div>
                          <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",textAlign:"right"}}>{lot.shares}</div>
                          <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",textAlign:"right"}}>{fK(lot.priceDKK)}</div>
                          <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",textAlign:"right",fontWeight:600}}>{fK(lot.priceDKK*lot.shares)}</div>
                        </div>
                      ))}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 60px 100px 90px",gap:8,padding:"7px 14px",borderTop:"1px solid "+T.hi,background:tc+"08"}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.muted}}>Total / Snitkurs</div>
                        <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,textAlign:"right"}}>{p.shares}</div>
                        <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,textAlign:"right",color:tc}}>{avg?fK(avg):"–"}</div>
                        <div style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,textAlign:"right"}}>{fK(v)}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ REBALANCERING ═════════════════════════════════════════════ */}
        {tab==="rebalancer"&&(
          <div style={{animation:"fadeUp .3s ease"}}>
            <Card style={{marginBottom:12}}>
              <div style={{display:mob?"block":"flex",alignItems:"center",gap:20}}>
                <div style={{flex:1,marginBottom:mob?10:0}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>Rebalanceringsgrænse</div>
                  <div style={{color:T.muted,fontSize:12}}>Alarm når et tema afviger mere end ±{thr}%</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                  <input type="range" min={1} max={15} value={thr} onChange={e=>setThr(+e.target.value)} style={{width:140,accentColor:T.accent}}/>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,color:T.accent,minWidth:48,textAlign:"right"}}>±{thr}%</div>
                </div>
              </div>
            </Card>
            <Card style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{color:T.muted,fontSize:9,letterSpacing:1,textTransform:"uppercase"}}>Tema-drift</div>
                <div style={{fontSize:11,fontWeight:600,color:Math.abs(tPct-100)>0.5?T.red:T.green}}>{Math.abs(tPct-100)>0.5?"⚠ Mål = "+f2(tPct,0)+"%":"✓ Mål = 100%"}</div>
              </div>
              {th.map(t=>(
                <div key={t.theme} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <Dot color={t.color} size={6}/>
                  <div style={{flex:1,fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.theme}</div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted,whiteSpace:"nowrap",minWidth:70,textAlign:"right"}}>{f2(t.act)}% / {t.tg}%</div>
                  <div style={{flex:1,height:4,background:T.dim,borderRadius:2,position:"relative",maxWidth:120}}>
                    <div style={{position:"absolute",left:"50%",top:0,width:1,height:"100%",background:T.border}}/>
                    <div style={{position:"absolute",left:t.drift>=0?"50%":Math.max(0,50-Math.min(Math.abs(t.drift),20)*2.5)+"%",width:Math.min(Math.abs(t.drift),20)*2.5+"%",height:"100%",background:Math.abs(t.drift)>thr?(t.drift>0?T.red:T.gold):T.green,borderRadius:2}}/>
                  </div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:Math.abs(t.drift)>thr?(t.drift>0?T.red:T.gold):T.green,minWidth:40,textAlign:"right"}}>{t.drift>=0?"+":""}{f2(t.drift)}%</div>
                  <button onClick={()=>openTheme(t)} style={{background:t.color+"18",color:t.color,border:"1px solid "+t.color+"40",borderRadius:6,padding:"2px 8px",fontSize:10,cursor:"pointer",fontWeight:600,flexShrink:0}}>{t.tg}%</button>
                </div>
              ))}
            </Card>
            {alrt.length===0?(
              <Card style={{textAlign:"center",padding:32}}>
                <div style={{fontSize:28,marginBottom:8}}>✅</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Alle temaer er i balance</div>
                <div style={{color:T.muted,fontSize:12}}>Ingen temaer afviger mere end ±{thr}%</div>
              </Card>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[...alrt].sort((a,b)=>Math.abs(b.drift)-Math.abs(a.drift)).map(t=>{
                  const over=t.drift>0,amt=Math.abs(t.drift/100)*tot;
                  return(
                    <div key={t.theme} style={{background:T.card,border:"1px solid "+(over?T.red:T.gold)+"50",borderRadius:14,padding:14}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                        <div style={{width:3,alignSelf:"stretch",minHeight:40,borderRadius:2,background:over?T.red:T.gold,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{t.theme}</div>
                          <div style={{color:T.muted,fontSize:11,marginBottom:6}}>{t.ps.length} pos. · {fK(t.val)}</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                            <Chip color={over?T.red:T.gold}>{over?"OVERVÆGTET":"UNDERVÆGTET"}</Chip>
                            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:over?T.red:T.gold}}>{t.drift>=0?"+":""}{f2(t.drift)}%</span>
                            <span style={{color:T.muted,fontSize:11}}>{f2(t.act)}% → {t.tg}%</span>
                          </div>
                        </div>
                        <div style={{background:(over?T.red:T.gold)+"12",border:"1px solid "+(over?T.red:T.gold)+"30",borderRadius:10,padding:"10px 12px",textAlign:"center",flexShrink:0}}>
                          <div style={{color:T.muted,fontSize:9,letterSpacing:1,marginBottom:3}}>{over?"SÆLG CA.":"KØB CA."}</div>
                          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:over?T.red:T.gold}}>{fK(amt)}</div>
                          <div style={{color:T.muted,fontSize:9,marginTop:2}}>→ {t.tg}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ AI ANALYSE ════════════════════════════════════════════════ */}
        {tab==="analyse"&&(
          <div style={{animation:"fadeUp .3s ease"}}>
            <Card>
              <div style={{display:mob?"block":"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:14}}>
                <div style={{marginBottom:mob?12:0}}>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Ekspert Porteføljeanalyse</div>
                  <div style={{color:T.muted,fontSize:12}}>Dybdegående AI-analyse af positioner, snitkurser og balance</div>
                </div>
                <button onClick={runAI} disabled={aiLoading} style={{background:T.accent,color:T.bg,border:"none",borderRadius:8,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:aiLoading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:7,opacity:aiLoading?0.7:1,whiteSpace:"nowrap",width:mob?"100%":"auto",justifyContent:"center"}}>
                  {aiLoading?<><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>◌</span> Analyserer…</>:"◈ Analysér portefølje"}
                </button>
              </div>

              {/* Theme snapshot */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:8,marginBottom:16,paddingBottom:16,borderBottom:"1px solid "+T.border}}>
                {th.map(t=>{
                  const a=Math.abs(t.drift)>thr;
                  return(
                    <div key={t.theme} style={{background:T.bg,border:"1px solid "+(a?(t.drift>0?T.red:T.gold):T.border)+"50",borderRadius:9,padding:"7px 9px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:3}}>
                        <Dot color={t.color} size={5}/>
                        <span style={{fontSize:9,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.theme.split(",")[0].split("&")[0].trim().slice(0,12)}</span>
                      </div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,fontSize:13}}>{f2(t.act)}%</div>
                      <div style={{fontSize:9,color:a?(t.drift>0?T.red:T.gold):T.muted}}>mål {t.tg}% · {t.drift>=0?"+":""}{f2(t.drift)}%</div>
                    </div>
                  );
                })}
              </div>

              {!aiText&&!aiLoading&&!aiErr&&(
                <div style={{textAlign:"center",padding:"32px 0",color:T.muted}}>
                  <div style={{fontSize:36,marginBottom:10,opacity:.1}}>◈</div>
                  <div style={{fontSize:13}}>Klik "Analysér" for en ekspertvurdering</div>
                </div>
              )}
              {aiLoading&&<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:24,animation:"spin 2s linear infinite",marginBottom:10,color:T.accent}}>◌</div><div style={{color:T.muted}}>Analyserer…</div></div>}
              {aiErr&&!aiLoading&&(
                <div style={{background:T.red+"12",border:"1px solid "+T.red+"40",borderRadius:10,padding:14}}>
                  <div style={{color:T.red,fontWeight:600,fontSize:12,marginBottom:4}}>Fejl ved analyse</div>
                  <div style={{color:T.muted,fontSize:11,fontFamily:"'IBM Plex Mono',monospace",wordBreak:"break-all"}}>{aiErr}</div>
                </div>
              )}
              {aiText&&!aiLoading&&(
                <div style={{background:T.bg,border:"1px solid "+T.accent+"22",borderRadius:11,padding:mob?14:20}}>
                  <div style={{color:T.accent,fontSize:9,letterSpacing:1.3,textTransform:"uppercase",fontWeight:600,marginBottom:12}}>◈ Ekspertanalyse</div>
                  <div style={{lineHeight:1.85,fontSize:13,whiteSpace:"pre-wrap"}}>{aiText}</div>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* Modals */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(5,8,15,.92)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(5px)"}}
          onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{background:T.panel,border:"1px solid "+T.border,borderRadius:mob?"14px 14px 0 0":"14px",padding:22,width:mob?"100%":400,maxWidth:"calc(100vw - 16px)",animation:"fadeUp .2s ease",maxHeight:"92vh",overflowY:"auto"}}>

            {modal==="buy"&&(
              <div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{mPos?"Tilkøb — "+mPos.name:"Tilføj ny position"}</div>
                {mPos&&<div style={{color:T.muted,fontSize:12,marginBottom:14}}>{mPos.shares} stk · snitkurs {avgCostDKK(mPos,fx)?fK(avgCostDKK(mPos,fx)):"–"} · Valuta: <strong style={{color:T.text}}>{mPos.currency||"DKK"}</strong></div>}
                {!mPos&&<div>
                  <Inp label="Instrumentnavn" value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="f.eks. iShares Core MSCI World"/>
                  <Sel label="Tema" value={form.theme||ALL_THEMES[0]} onChange={e=>setForm(f=>({...f,theme:e.target.value}))}>{ALL_THEMES.map(t=><option key={t} value={t}>{t}</option>)}</Sel>
                  <Inp label="Symbol" value={form.symbol||""} onChange={e=>setForm(f=>({...f,symbol:e.target.value}))} placeholder="IWDA"/>
                  <Inp label="ISIN" value={form.isin||""} onChange={e=>setForm(f=>({...f,isin:e.target.value}))} placeholder="IE00B4L5Y983"/>
                  <Sel label="Handelsvaluta" value={form.currency||"EUR"} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                    {["EUR","USD","DKK","GBP","SEK","NOK","CHF"].map(c=><option key={c} value={c}>{c}</option>)}
                  </Sel>
                </div>}
                <Inp label="Dato" type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                <Inp label="Antal stk" type="number" value={form.shares||""} onChange={e=>setForm(f=>({...f,shares:e.target.value}))} placeholder="50"/>
                <Inp label={"Kurs pr. stk i "+(mPos?mPos.currency||"DKK":form.currency||"DKK")} type="number" value={form.priceDKK||""} onChange={e=>setForm(f=>({...f,priceDKK:e.target.value}))} placeholder="f.eks. 85.50"/>
                <BuySummary form={form} mPos={mPos} fx={fx}/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setModal(null)} style={{background:"transparent",color:T.muted,border:"1px solid "+T.border,borderRadius:8,padding:"10px 16px",fontSize:13,cursor:"pointer"}}>Annuller</button>
                  <button onClick={saveBuy} disabled={!form.shares||!form.priceDKK||(!mPos&&!form.name)}
                    style={{flex:1,background:(!form.shares||!form.priceDKK||(!mPos&&!form.name))?T.dim:T.green,color:T.bg,border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    {mPos?"Bekræft tilkøb":"Tilføj position"}
                  </button>
                </div>
              </div>
            )}

            {modal==="editLot"&&(
              <div>
                {!form.editing?(
                  /* Step 1: choose action */
                  <div>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>Køb — {mPos?.name}</div>
                    <div style={{color:T.muted,fontSize:12,marginBottom:20}}>
                      {form.date} · {form.shares} stk · {form.priceDKK&&fK(+form.priceDKK)} pr. stk
                    </div>
                    <div style={{background:T.bg,borderRadius:10,padding:14,marginBottom:16}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div>
                          <div style={{fontSize:9,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Antal</div>
                          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700}}>{form.shares} stk</div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Kurs pr. stk</div>
                          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700}}>{form.priceDKK&&fK(+form.priceDKK)}</div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Dato</div>
                          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700}}>{form.date}</div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Samlet beløb</div>
                          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700}}>{form.shares&&form.priceDKK&&fK(+form.shares*(+form.priceDKK))}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <button onClick={()=>setForm(f=>({...f,editing:true}))}
                        style={{background:T.accent,color:T.bg,border:"none",borderRadius:8,padding:"12px 16px",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left"}}>
                        ✎ Rediger dette køb
                      </button>
                      <button onClick={()=>{delLot(mPos.id,form.lotId);setModal(null);}}
                        style={{background:T.red+"18",color:T.red,border:"1px solid "+T.red+"40",borderRadius:8,padding:"12px 16px",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left"}}>
                        ✕ Slet dette køb
                      </button>
                      <button onClick={()=>setModal(null)}
                        style={{background:"transparent",color:T.muted,border:"1px solid "+T.border,borderRadius:8,padding:"10px 16px",fontSize:13,cursor:"pointer"}}>
                        Annuller
                      </button>
                    </div>
                  </div>
                ):(
                  /* Step 2: edit form */
                  <div>
                    <button onClick={()=>setForm(f=>({...f,editing:false}))} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:12,marginBottom:12,padding:0}}>← Tilbage</button>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Rediger køb</div>
                    <div style={{color:T.muted,fontSize:12,marginBottom:14}}>{mPos?.name}</div>
                    <Inp label="Dato" type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                    <Inp label="Antal stk" type="number" value={form.shares||""} onChange={e=>setForm(f=>({...f,shares:e.target.value}))} placeholder="50"/>
                    <Sel label="Handelsvaluta" value={form.currency||"EUR"} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                      {["EUR","USD","DKK","GBP","SEK","NOK","CHF"].map(c=><option key={c} value={c}>{c}</option>)}
                    </Sel>
                    <Inp label={"Kurs pr. stk i "+(form.currency||"DKK")} type="number" value={form.priceDKK||""} onChange={e=>setForm(f=>({...f,priceDKK:e.target.value}))} placeholder="f.eks. 85.50"/>
                    <BuySummary form={form} mPos={null} fx={fx}/>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setForm(f=>({...f,editing:false}))} style={{background:"transparent",color:T.muted,border:"1px solid "+T.border,borderRadius:8,padding:"10px 16px",fontSize:13,cursor:"pointer"}}>Annuller</button>
                      <button onClick={saveEditLot} disabled={!form.shares||!form.priceDKK}
                        style={{flex:1,background:(!form.shares||!form.priceDKK)?T.dim:T.accent,color:T.bg,border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                        Gem ændringer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {modal==="theme"&&(
              <div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Justér målvægt</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <Dot color={THEME_COLORS[form.theme]||T.muted} size={8}/>
                  <span style={{color:T.muted,fontSize:13}}>{form.theme}</span>
                </div>
                <Inp label="Målvægt (%)" type="number" min={0} max={100} value={form.tg||""} onChange={e=>setForm(f=>({...f,tg:e.target.value}))}/>
                <div style={{color:T.muted,fontSize:11,marginBottom:14}}>Alle mål summerer pt. til {f2(tPct,0)}%</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setModal(null)} style={{background:"transparent",color:T.muted,border:"1px solid "+T.border,borderRadius:8,padding:"10px 16px",fontSize:13,cursor:"pointer"}}>Annuller</button>
                  <button onClick={saveTheme} style={{flex:1,background:T.accent,color:T.bg,border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Gem</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
