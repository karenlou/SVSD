/* Spotting board engine: the reel, cue lanes, the script that unfolds over the reel, the cue panel (notes, comments, trim) and the cue list.
   Shared by the board (index.html, starts empty: you upload a reel and optionally a script) and the demo (demo.html, Challengers reel 6).
   Pages call boot(data); see the comment above boot() for what data holds. */
const CATS={ambience:"Ambience",footsteps:"Footsteps",props:"Props",cloth:"Cloth",hardfx:"Hard FX",score:"Score"};
/* sign-off: the director and the sound designer each confirm every cue and every comment thread from their side (dir, snd). Done means both have.
   Older boards stored a single status (cues: none/approved/recorded, comments: open/addressed/approved); signoff() reads that once */
function signoff(o){if(o.dir===undefined){if("s" in o){o.dir=o.s!=="none";o.snd=o.s==="recorded";delete o.s}else{o.dir=o.status==="approved";o.snd=!!o.status&&o.status!=="open";delete o.status}}return o}
const ok=q=>!!(q.dir||q.snd), done=q=>!!(q.dir&&q.snd);
const PEOPLE={
 maya:{n:"Maya Ortiz",r:"Director",i:"MO",c:"--score"},
 theo:{n:"Theo Lindqvist",r:"Sound designer",i:"TL",c:"--footsteps"},
 priya:{n:"Priya Nair",r:"Sound supervisor",i:"PN",c:"--ambience"},
 sam:{n:"Sam Okafor",r:"Re-recording mixer",i:"SO",c:"--props"}};
let ROLE="director";try{if(localStorage.getItem("svsd-role")==="foley")ROLE="foley"}catch(e){}
const ME=()=>ROLE==="director"?"maya":"theo", first=k=>PEOPLE[k].n.split(" ")[0];
const PRI={high:{n:"High",c:"--hardfx"},med:{n:"Medium",c:"--props"},low:{n:"Low",c:"--muted-foreground"}};
const KIND={memo:"Voice memo"}, EMO=["👍","🔥","👀","🎧","✅","❓"], ARROW={left:"←",right:"→",top:"↑",bottom:"↓"};
const AUD={};let aidN=0;const newAud=o=>{const id="a"+(++aidN);AUD[id]={id,...o};return id};
const CUES={},COMMENTS={};let cuid=0;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tc=t=>{t=Math.max(0,t);const s=(t%60).toFixed(1);return Math.floor(t/60)+":"+s.padStart(4,"0")};
const rel=at=>{const s=(Date.now()-at)/1000;return s<45?"just now":s<3600?Math.round(s/60)+"m ago":s<86400?Math.round(s/3600)+"h ago":Math.round(s/86400)+"d ago"};
const rangeTxt=m=>m.t1!=null?`${tc(m.t0)} – ${tc(m.t1)}`:`at ${tc(m.t0)}`;
const snip=(m,n=60)=>{const x=m.msgs.find(x=>!x.sys&&(x.text||x.audio?.length));const t=x?.text||(x?.audio?.length?KIND[AUD[x.audio[0]].kind]:"");return t.length>n?t.slice(0,n-2).trimEnd()+"…":t};
const FIRST=Object.fromEntries(Object.keys(PEOPLE).map(k=>[first(k).toLowerCase(),k]));
const fmtText=t=>esc(t).replace(/@(\w+)/g,(s,w)=>FIRST[w.toLowerCase()]?`<b class="mention">@${w}</b>`:s);
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
/* ---------- glyphs: 5x5 dot-matrix states, stepped at 12fps ---------- */
const PI=Math.PI,TAU=PI*2, cl=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), ramp=(p,at,len=.08)=>cl((p-at)/len);
const ix=(x,y)=>(y+2)*5+(x+2), blank=()=>new Float32Array(25);
const CELLS=[];for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)CELLS.push([x,y]);
const setv=(b,pts,v)=>{for(const[x,y]of pts){const i=ix(x,y);b[i]=Math.max(b[i],v)}};
const FLOWER=[[0,0,1],[0,-1,.35],[0,1,.35],[-1,0,.35],[1,0,.35],[0,-2,1],[0,2,1],[-2,0,1],[2,0,1],[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1]];
const PLUS=[[0,0],[0,-1],[0,1],[-1,0],[1,0]];
const DIAMOND=CELLS.filter(([x,y])=>Math.abs(x)+Math.abs(y)===2).sort((a,b)=>((Math.atan2(a[0],-a[1])+TAU)%TAU)-((Math.atan2(b[0],-b[1])+TAU)%TAU));
const CHECK=[[-2,0],[-1,1],[0,0],[1,-1],[2,-2]];
const GARDEN=[[0,0],[0,-2],[2,-2],[2,0],[2,2],[0,2],[-2,2],[-2,0],[-2,-2]];
const G={
  seed:{kind:"loop",f(t){const b=blank(),s=.5+.5*Math.sin(t/2.4*TAU);b[ix(0,0)]=.35+.5*s;setv(b,PLUS.slice(1),.12+.1*s);return b}},
  bud:{kind:"loop",f(t){const b=blank(),s=.5+.5*Math.sin(t/2*TAU);b[ix(0,0)]=1;setv(b,PLUS.slice(1),.35+.65*s);return b}},
  unfurl:{kind:"shot",dur:.6,f(t,p){const b=blank();b[ix(0,0)]=ramp(p,0,.2);const k1=ramp(p,.22,.2),k2=ramp(p,.48,.25);
    for(const[x,y]of PLUS.slice(1))b[ix(x,y)]=k1*(k2>0?1-.65*k2:1);for(const[x,y]of DIAMOND)b[ix(x,y)]=k2;return b}},
  orbit:{kind:"loop",f(t){const b=blank(),ph=(t/1.2%1)*8;DIAMOND.forEach(([x,y],i)=>{const d=(ph-i+8)%8;b[ix(x,y)]=d<4?1-d/4:0});b[ix(0,0)]=.25+.2*Math.sin(t*5);return b}},
  pulse:{kind:"loop",f(t){const b=blank();for(const[x,y]of CELLS){const d=Math.abs(x)+Math.abs(y);if(!d){b[ix(x,y)]=1;continue}const a=Math.atan2(y,x),amp=cl(.5+.5*Math.sin(t*6.5+a*1.7)*Math.cos(t*3.1-a*1.3));b[ix(x,y)]=cl(amp*2.4-(d-1))*(d>2?.6:1)}return b}},
  set:{kind:"shot",dur:1.1,f(t,p){const b=blank();if(p<.5){const k=p<.3?1:1-ramp(p,.3,.2);for(const[x,y,v]of FLOWER)b[ix(x,y)]=(x===0&&y===0)?1:v*k}
    CHECK.forEach(([x,y],i)=>{b[ix(x,y)]=Math.max(b[ix(x,y)]*(p<.5?1:0),ramp(p,.5+i*.08,.08))});return b}},
  check:{kind:"loop",f(){const b=blank();setv(b,CHECK,1);return b}},
  pollinate:{kind:"loop",f(t){const b=blank(),p=(t/1.8)%1,path=[[-1,0],[0,-1],[1,0]];setv(b,[[-2,-1],[-2,1]],.45);b[ix(-2,0)]=.9;
    const glow=p>.7?1-(p-.7)*1.2:.25;setv(b,[[2,-1],[2,1]],.25+.4*Math.max(0,glow-.25));b[ix(2,0)]=Math.max(.35,glow);
    if(p>.1&&p<.72){const q=(p-.1)/.62,j=Math.min(2,Math.floor(q*3)),[x,y]=path[j];b[ix(x,y)]=1}return b}},
  flower:{kind:"loop",f(){const b=blank();for(const[x,y,v]of FLOWER)b[ix(x,y)]=v;return b}},
  garden:{kind:"count",f(t,p,it){const b=blank(),n=it.count||0;GARDEN.forEach(([x,y],i)=>{b[ix(x,y)]=i<n?1:.12});return b}}
};
const insts=new Set(); let NOW=performance.now()/1000;
function glyph(cv,key,o={}){const it={cv,ctx:cv.getContext("2d"),key,start:NOW,color:o.color||"--foreground",count:o.count,base:o.base??.1};size(it);insts.add(it);return it}
function size(it){const w=parseFloat(it.cv.style.width)||it.cv.getBoundingClientRect().width||16,d=Math.min(devicePixelRatio||1,2);it.w=w;it.d=d;it.cv.width=it.cv.height=Math.round(w*d)}
function setG(it,key,color){if(!it)return;it.key=key;it.start=NOW;if(color)it.color=color}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
const colCache={}; function col(v){return v.startsWith("--")?(colCache[v]??=css(v)):v}
const clearCols=()=>{for(const k in colCache)delete colCache[k]};
new MutationObserver(clearCols).observe(document.documentElement,{attributes:true});
matchMedia("(prefers-color-scheme:dark)").addEventListener?.("change",clearCols);
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
function draw(it){
  const g=G[it.key];let t=Math.floor((NOW-it.start)*12)/12,p=1;
  if(g.kind==="shot")p=Math.floor(cl((NOW-it.start)/g.dur)*12)/12;
  if(reduce){t=0;p=1}
  const b=g.f(t,p,it),c=it.ctx,S=it.w*it.d,cell=S/5,dot=cell*(it.w<=14?.78:.74),off=(cell-dot)/2;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,S,S);c.fillStyle=col(it.color);
  for(let i=0;i<25;i++){const v=Math.round(cl(b[i])*4)/4;c.globalAlpha=it.base+(1-it.base)*v;rr(c,(i%5)*cell+off,((i/5)|0)*cell+off,dot,dot,dot*.3);c.fill()}
  c.globalAlpha=1;
}
const restKey=q=>done(q)?"check":ok(q)?"bud":"seed";
const restColor="--muted-foreground";

function hash(s){let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}
/* comment times are kept relative to their cue and shown on the reel's clock */
const rtc=(m,q=CUES[m.clip])=>m.t1!=null?`${tc(q.ft+m.t0)} – ${tc(q.ft+m.t1)}`:`at ${tc(q.ft+m.t0)}`;
const commentsOf=id=>Object.values(COMMENTS).filter(m=>m.clip===id).sort((a,b)=>a.t0-b.t0);
const mmss=t=>{t=Math.max(0,Math.round(t));return Math.floor(t/60)+":"+String(t%60).padStart(2,"0")};
const span=q=>`${mmss(q.ft)}–${mmss(q.ft+q.dur)}`, secs=d=>(Math.round(d*10)/10)+"s";
const ICON={play:'<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.5v9l7-4.5z"/></svg>',pause:'<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3.5" width="2.6" height="9" rx=".6"/><rect x="9.4" y="3.5" width="2.6" height="9" rx=".6"/></svg>',
  mark:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5H3.5v11H5M11 2.5h1.5v11H11"/><path d="M8 5.5v5M5.5 8h5"/></svg>',
  more:'<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>',
  up:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 9.5L8 6l3.5 3.5"/></svg>',
  pen:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 3l2.5 2.5L6 12.5 3 13l.5-3z"/></svg>',
  prev:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4L6 8l4 4"/><path d="M3.5 4v8"/></svg>',
  next:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/><path d="M12.5 4v8"/></svg>',
  unfold:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5.5h11M2.5 10.5h11"/><path d="M5 3l3-1.5L11 3M5 13l3 1.5 3-1.5"/></svg>',
  x:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  back:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>',
  down:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5L8 10l3.5-3.5"/></svg>',
  check:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>',
  film:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><path d="M5.5 3.5v9M10.5 3.5v9M2.5 6.5h3M2.5 9.5h3M10.5 6.5h3M10.5 9.5h3"/></svg>',
  send:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V3.5M4 7.5l4-4 4 4"/></svg>',
  plus:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
  box:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 1.6"><rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/></svg>',
  comment:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2.5 4a1.5 1.5 0 011.5-1.5h8A1.5 1.5 0 0113.5 4v5.5A1.5 1.5 0 0112 11H7l-3 2.5V11a1.5 1.5 0 01-1.5-1.5z"/></svg>'};


/* ---------- screenplay text → acts/scenes/blocks. Scene headings start INT./EXT.; an all-caps line followed by more text is a character and their dialogue ---------- */
function parseScreenplay(text,name){const paras=text.replace(/\r/g,"").split(/\n\s*\n/).map(p=>p.split("\n").map(l=>l.trim()).filter(Boolean)).filter(p=>p.length);
  if(paras[0]?.every(l=>/^[A-Za-z][\w ]*:/.test(l)))paras.shift(); /* a Fountain title page */
  const scenes=[];let sc=null;const slug=l=>/^(INT|EXT|INT\.?\s*\/\s*EXT|I\/E|EST)[.\s]/i.test(l)&&l===l.toUpperCase();
  const add=b=>{if(!sc){sc={n:1,slug:"",b:[]};scenes.push(sc)}sc.b.push(b)};
  for(const p of paras){let i=0;
    if(slug(p[0])){sc={n:scenes.length+1,slug:p[0],b:[]};scenes.push(sc);i=1;if(p.length===1)continue}
    const head=p[i],rest=p.slice(i+1);
    if(rest.length&&head===head.toUpperCase()&&/[A-Z]/.test(head)&&head.length<=40&&!/[.!?]$/.test(head.replace(/\(.*\)/,"").trim())){add(["c",head]);add(["l",rest.join(" ")])}
    else if(head===head.toUpperCase()&&/TO:$/.test(head)&&!rest.length)add(["t",head]);
    else add(["a",p.slice(i).join(" ")])}
  scenes.forEach((s,i)=>s.n=i+1);
  return scenes.length?[{name:name||"Script",board:"",reel:true,scenes}]:[]}

/* ---------- reading a script file: plain text / Fountain, or a PDF (its text, laid out by indent: scene headings and action at the left margin,
   character names far in, dialogue in between). A PDF whose fonts carry no text (common with some exports) can't be read and says so ---------- */
const PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
function pdfLib(){if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);return new Promise((ok,no)=>{const s=document.createElement("script");s.src=PDFJS+"pdf.min.js";
  s.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.js";ok(pdfjsLib)};s.onerror=()=>no(new Error("Couldn't load the PDF reader. Check your connection."));document.head.appendChild(s)})}
async function pdfToText(file){const lib=await pdfLib(),pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise,out=[];
  for(let n=1;n<=pdf.numPages;n++){const pg=await pdf.getPage(n),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent(),lines=[];
    for(const it of tc.items){if(!it.str||!it.str.trim())continue;const x=it.transform[4]/vp.width,y=vp.height-it.transform[5];let L=lines.find(l=>Math.abs(l.y-y)<2.5);if(!L)lines.push(L={y,items:[]});L.items.push({x,w:it.width/vp.width,s:it.str})}
    lines.sort((a,b)=>a.y-b.y);
    const ls=lines.map(L=>{L.items.sort((a,b)=>a.x-b.x);let t="",end=null;for(const i of L.items){t+=(end!=null&&i.x-end>.004&&!/\s$/.test(t)?" ":"")+i.s;end=i.x+i.w}return {y:L.y,x:L.items[0].x,t:t.replace(/\s+/g," ").trim()}})
      .filter(l=>!(l.y<vp.height*.09&&/^\d+\.?$/.test(l.t))&&!/^\(?(CONTINUED|MORE)\)?:?$/i.test(l.t)&&!/^CONT'D$/.test(l.t));
    const gaps=ls.slice(1).map((l,i)=>l.y-ls[i].y).filter(g=>g>4).sort((a,b)=>a-b),lh=gaps[Math.floor(gaps.length*.25)]||12;
    /* a paragraph that runs over a page break carries on, unless the last page ended a sentence */
    ls.forEach((l,i)=>{const prev=ls[i-1],cue=l.x>.33&&l.t===l.t.toUpperCase()&&/[A-Z]/.test(l.t)&&!/[.!?]$/.test(l.t),last=out[out.length-1];
      if(i?(l.y-prev.y>lh*1.5||cue):(last&&(cue||/[.!?:"')\]]$/.test(last))))out.push("");out.push(l.t)})}
  const text=out.join("\n"),body=text.replace(/\s/g,""),junk=(body.match(/[\u0000-\u001f\ufffd]/g)||[]).length,words=(text.match(/\b(the|and|to|of|in|he|she|is|at|his|her)\b/gi)||[]).length;
  if(body.length<80||junk>body.length*.02||words<body.length/200)throw new Error("This PDF has no readable text (its fonts don't carry any). Export it from your screenwriting app as text, Fountain or a fresh PDF.");
  return text}
async function readScript(file,name="Script"){const pdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name),text=pdf?await pdfToText(file):await file.text(),acts=parseScreenplay(text,name);
  if(!acts.length)throw new Error("Couldn't find any script in that file.");return acts}

/* ---------- the board. D = {mode:"demo"|"app", title, video (url, or none yet in the app), script:[acts]|null, cues:{id:cue}, reel:[ids on this reel], comments:[...],
   onChange(state), onVideo(file), onReset()}.
   A cue is {c (sound), n (name), d (director's note), s (none/approved/recorded), ft (start on the reel, s), dur (s), scene?} ---------- */
function boot(D){
const APP=D.mode==="app";let TITLE=D.title||"Untitled reel";
$("#app").innerHTML=`<div class="wrap">
<header class="top">
  <div class="brand"><canvas class="g" id="garden" width="16" height="16" style="width:16px;height:16px" aria-hidden="true"></canvas><span class="scr" data-scr>Spotting</span><span class="crumb">/ ${APP?`<button class="ttl" id="ttl" title="Rename this board">${esc(TITLE)}</button>`:`<span class="scr" data-scr>${esc(TITLE)}</span>`}</span></div>
  <nav class="nav" role="tablist" aria-label="Stage"><button role="tab" aria-selected="true"><span class="scr" data-scr>Spot</span></button></nav>
  <div class="meta">${APP?`<button class="lk" id="newReel">New reel</button>`:`<a class="lk" href="${esc(D.home||"index.html")}">Start your own</a>`}<div class="toggles" id="role" role="group" aria-label="Working as"></div><span><span class="scr" data-scr>Takes</span> <b id="navTally">0/0</b></span></div>
</header>
<div class="main">
  <div class="col">
    <section class="card player" id="player" aria-label="Film">
      <div class="screen paused" id="screen" title="Play or pause (space)"><video id="vid" playsinline preload="auto"></video><span class="big" id="big"></span>
        <label class="vdrop" id="vdrop" hidden><input type="file" accept="video/*" id="fVid"><canvas class="g vdg" style="width:44px;height:44px" aria-hidden="true"></canvas><b>Upload the reel</b><span>Drop a video here, or choose a file. It stays in this browser.</span><em id="vErr"></em></label></div>
      <div class="tp">
        <div class="ctl"><button class="btn btn-ghost btn-icon" id="pp" aria-label="Play or pause (space)"></button><button class="btn btn-ghost btn-icon" id="prev" aria-label="Previous cue ([)"></button><button class="btn btn-ghost btn-icon" id="next" aria-label="Next cue (])"></button><span class="tc" id="tc"></span>
          <button class="btn btn-default mkb" id="mark" title="Add a cue at the playhead, then drag its ends on the timeline to fit the sound (or press M at the start of a sound and again at its end)"><i></i><span>Add cue</span></button><button class="btn btn-outline frm" id="frm" title="Comment on a frame: pause and draw a box on the picture (B)"><span class="ic"></span>Draw box</button><div class="legend" id="bar" role="group" aria-label="Filter by sound"></div></div>
        <div class="tlh"><span id="tlL"></span><span id="tlR"></span></div>
        <div class="ftl" id="ftl"></div>
      </div>
    </section>
    <section class="pane ex" id="ex" aria-label="Script"><div class="sp-h" id="sph"><span>Script</span><button class="btn btn-ghost sv" id="sv" hidden>${ICON.down}Back to film<kbd>Esc</kbd></button></div>
      <label class="sdrop" id="sdrop" hidden><input type="file" accept=".pdf,.txt,.fountain,.md,text/plain,application/pdf" id="fScript"><b id="sdT"></b><span id="sdS"></span></label>
      <main class="doc scroller" id="doc" tabindex="-1"></main></section>
  </div>
  <div class="vdiv" aria-hidden="true"></div>
  <aside class="cuelist" id="cuelist" aria-label="Cues"><div class="cuelist-h"><span>Cues <b id="allN"></b></span></div><div class="cl-scroll" id="clScroll"></div><section class="dock" id="dock" aria-label="Selected cue"></section></aside>
</div>
</div>
<div class="pop" id="scard" hidden></div>
<div class="toasts" id="toasts" aria-live="polite"></div>`;
document.title=`${TITLE} · Spotting`;
Object.values(D.cues||{}).forEach(signoff);(D.comments||[]).forEach(signoff);Object.assign(CUES,D.cues||{});const REEL={};(D.reel||Object.keys(D.cues||{})).forEach(id=>{if(CUES[id])REEL[id]=CUES[id]});
for(const m of D.comments||[])COMMENTS[m.id]=m;
const maxN=(ks,p)=>Math.max(0,...ks.map(k=>+(k.match(new RegExp("^"+p+"(\\d+)$"))||[0,0])[1]));
cuid=maxN(Object.keys(COMMENTS),"c");let uid=maxN(Object.keys(CUES),"u");
let SCRIPT=D.script||[];const hasScript=()=>SCRIPT.some(a=>a.scenes?.length);
let VID=!!D.video;
/* anything the team changes goes back to the host (the app saves it in this browser) */
let saveT=0;function changed(){if(!D.onChange)return;clearTimeout(saveT);saveT=setTimeout(()=>D.onChange({title:TITLE,cues:Object.fromEntries(FILM.map(id=>[id,CUES[id]])),comments:COMMENTS,script:SCRIPT}),300)}

/* ---------- undo / redo: every edit to cues, comments or the script takes a snapshot first; ⌘Z steps back, ⇧⌘Z (or Ctrl+Y) forward ---------- */
const UNDO=[],REDO=[];
const snap=()=>JSON.stringify({cues:FILM.map(id=>[id,CUES[id]]),comments:COMMENTS,script:SCRIPT});
function checkpoint(label){UNDO.push({s:snap(),label});if(UNDO.length>80)UNDO.shift();REDO.length=0}
function restore(str){const o=JSON.parse(str);
  for(const id of FILM){delete CUES[id];delete REEL[id]}FILM.length=0;
  for(const [id,q] of o.cues){CUES[id]=REEL[id]=q;FILM.push(id)}FILM.sort((a,b)=>CUES[a].ft-CUES[b].ft);
  for(const k in COMMENTS)delete COMMENTS[k];Object.assign(COMMENTS,o.comments);SCRIPT=o.script;
  renderDoc();renderList();counts();tally();renderTL();applyFilter();
  if(SC.id&&!CUES[SC.id])SC.id=null;for(const k in SC.open)if(!COMMENTS[k])delete SC.open[k];
  setCur(ownerAt(now()),true);renderCard();if(EXP)placeCard();changed()}
function undo(){const u=UNDO.pop();if(!u)return toast("Nothing to undo","Edits to cues, comments and the script can be undone","score","seed");REDO.push({s:snap(),label:u.label});restore(u.s);toast(`Undone: ${u.label}`,"⇧⌘Z to redo","score","seed")}
function redo(){const r=REDO.pop();if(!r)return;UNDO.push({s:snap(),label:r.label});restore(r.s);toast(`Redone: ${r.label}`,"⌘Z to undo","score","seed")}

/* ---------- the script: one sticky section per set. Sets that belong to other reels start folded and their phrases aren't live here.
   Every paragraph knows which block it came from, so a cue made or removed in the text is written back to the script ---------- */
const doc=$("#doc");
const parse=t=>t.split(/(\[\[\w+\|[^\]]+\]\])/).map(part=>{const m=part.match(/^\[\[(\w+)\|([^\]]+)\]\]$/);if(!m)return esc(part);const [,id,txt]=m,q=CUES[id];
  if(!q)return esc(txt);return REEL[id]?`<span class="cue" tabindex="0" data-id="${id}" style="--c:var(--${q.c})">${esc(txt)}</span>`:`<span class="cue off" data-off="${id}" title="On another reel" style="--c:var(--${q.c})">${esc(txt)}</span>`}).join("");
function renderDoc(){doc.innerHTML=SCRIPT.map((act,ai)=>{const rows=[];
  act.scenes.forEach((sc,si)=>{
    rows.push({gut:`<div class="scene-no">${sc.n}</div>`,page:sc.slug?`<p class="slug" data-scene="${sc.n}">${esc(sc.slug)}</p>`:""});
    sc.b.forEach(([t,txt],bi)=>{const body=parse(txt);for(const [,id] of txt.matchAll(/\[\[(\w+)\|/g))if(CUES[id]){CUES[id].scene=sc.n;CUES[id].act=ai}
      const cls=t==="a"?"":t==="t"?"sub":t==="c"?"char":"line",prev=rows[rows.length-1],p=`<p class="${cls}" data-b="${ai}.${si}.${bi}">${body}</p>`;
      if(t==="l"&&prev?.dlg){prev.page+=p;return}
      rows.push({gut:"",page:p,dlg:t==="c"})})});
  return `<section class="act${act.reel?"":" collapsed"}" data-act="${ai}"${act.reel?" data-reel":""}><button class="act-h${SCRIPT.length>1?"":" solo"}" aria-expanded="${!!act.reel}"><svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg><span class="nm"><i></i>${esc(act.name)}</span><span class="bd">${esc(act.board||"")}</span>${SCRIPT.length>1?`<span class="at">${act.reel?"This reel":"Other reels"}</span>`:""}</button><div class="act-body"><div class="inner">`+
    rows.map(r=>`<div class="row"><div class="gut">${r.gut}</div><div class="page">${r.page}</div></div>`).join("")+`</div></div></section>`}).join("");
  renderSlot()}
/* write a paragraph's text (with its cue markers) back into the script */
function serial(p){if(!p?.dataset.b)return;let s="";p.childNodes.forEach(n=>{const id=n.nodeType===1&&(n.dataset.id||n.dataset.off);s+=id?`[[${id}|${n.textContent}]]`:n.textContent});
  const [a,sc,b]=p.dataset.b.split(".").map(Number);SCRIPT[a].scenes[sc].b[b][1]=s}
function toggleAct(sec,force){const c=force??!sec.classList.contains("collapsed");sec.classList.toggle("collapsed",c);sec.querySelector(".act-h").setAttribute("aria-expanded",String(!c))}
/* the script panel without a script: locked until there's a reel, then a place to drop one (optional) */
function renderSlot(){const sd=$("#sdrop"),has=hasScript();$("#ex").hidden=!has&&!APP;sd.hidden=has;doc.hidden=!has;$("#sph").hidden=!has;if(has)return;
  sd.classList.toggle("locked",!VID);$("#fScript").disabled=!VID;sd.classList.remove("bad");
  $("#sdT").innerHTML=VID?`Add the script <small>optional</small>`:`Script <small>optional</small>`;
  $("#sdS").textContent=VID?"PDF, Fountain or plain text. Drop it here or choose a file.":"Unlocks once the reel is in."}

/* ---------- the film ---------- */
const FILM=Object.keys(REEL).sort((a,b)=>CUES[a].ft-CUES[b].ft);
const timedScenes=()=>(SCRIPT.find(a=>a.reel)?.scenes||[]).filter(s=>s.e!=null);
const vid=$("#vid"),screen=$("#screen");let LEN=D.duration||1;if(VID)vid.src=D.video;
vid.addEventListener("loadedmetadata",()=>{if(isFinite(vid.duration)){LEN=vid.duration;counts();renderTL();layoutFilm();renderCard()}});
const now=()=>vid.currentTime||0;
function ownerAt(t){let o=FILM[0];for(const id of FILM)if(CUES[id].ft<=t+.01)o=id;return o}
const ppIcon=()=>{const p=!vid.paused&&!vid.ended;$("#pp").innerHTML=p?ICON.pause:ICON.play;$("#big").innerHTML=ICON.play;screen.classList.toggle("paused",!p);const z=$("[data-act=pp]",host());if(z)z.innerHTML=p?ICON.pause:ICON.play};
["play","pause","ended"].forEach(e=>vid.addEventListener(e,ppIcon));vid.addEventListener("play",()=>{if(EXP)SC.pin=false});["play","pause","seeked"].forEach(e=>vid.addEventListener(e,()=>renderAnc()));
const play=()=>{if(!VID)return;if(vid.ended)vid.currentTime=0;vid.play().catch(()=>{})},pause=()=>vid.pause();
function seek(t){if(!VID)return;vid.currentTime=cl(t,0,LEN);update(cl(t,0,LEN))}
const toggle=()=>vid.paused||vid.ended?play():pause();
function step(d){if(!FILM.length)return;const i=FILM.indexOf(cur),id=d<0&&now()-CUES[cur].ft>1.5?cur:FILM[cl(i+d,0,FILM.length-1)];seek(CUES[id].ft);toCue(id)}
const tcx=()=>$("#tcv")?.getContext("2d");
function loop(t){NOW=t/1000;for(const it of insts){if(!it.cv.isConnected){insts.delete(it);continue}draw(it)}
  update(now());if(EXP&&vid.readyState>=2){const c=tcx();if(c)c.drawImage(vid,0,0,480,270)}trimTick();if(MARK)markTick();
  requestAnimationFrame(loop)}
/* the reel arriving (app): from the drop zone over the player, or a file dropped anywhere on the page */
function setVideo(f){if(!f)return;if(!f.type.startsWith("video/")){$("#vErr").textContent="That isn't a video file.";return}
  D.onVideo?.(f);vid.src=URL.createObjectURL(f);VID=true;document.body.classList.remove("novid");$("#vdrop").hidden=true;
  if(TITLE==="Untitled reel")setTitle(f.name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," "));
  renderSlot();layoutFilm();toast("Reel loaded","Press M where a sound starts, and again where it ends","ambience");if(!hasScript())$("#sdrop").classList.add("ping")}
function setTitle(t){TITLE=t.trim()||"Untitled reel";const b=$("#ttl");if(b)b.textContent=TITLE;document.title=`${TITLE} · Spotting`;changed()}
/* a script arriving: read it, then let it make its entrance */
async function setScriptFile(f){if(!f||!VID)return;const sd=$("#sdrop");$("#sdT").textContent="Reading "+f.name+"…";$("#sdS").textContent="";sd.classList.remove("bad","ping");
  let acts;try{acts=await readScript(f,"Script")}catch(e){renderSlot();sd.classList.add("bad");$("#sdS").textContent=e.message;return}
  checkpoint("add script");SCRIPT=acts;renderDoc();layoutFilm();setCur(cur,true);changed();renderCard();
  await introScript(f.name);toast("Script added",`${acts[0].scenes.length} scene${acts[0].scenes.length===1?"":"s"} · select a line to make or attach a cue`,"props")}
if(APP){$("#fVid").addEventListener("change",e=>setVideo(e.target.files[0]));$("#fScript").addEventListener("change",e=>{setScriptFile(e.target.files[0]);e.target.value=""});
  addEventListener("dragover",e=>{if([...e.dataTransfer.types].includes("Files")){e.preventDefault();document.body.classList.add("dragging-file")}});
  addEventListener("dragleave",e=>{if(!e.relatedTarget)document.body.classList.remove("dragging-file")});
  addEventListener("drop",e=>{const f=e.dataTransfer.files[0];document.body.classList.remove("dragging-file");if(!f)return;e.preventDefault();
    if(f.type.startsWith("video/"))return VID?toast("This board already has its reel","Start a new reel from the header to use another","score","seed"):setVideo(f);
    if(!VID)return toast("Start with the reel","The script unlocks once the reel is in","score","seed");setScriptFile(f)})}

/* ---------- timeline: a lane for every kind of sound. Above it, the cue at the playhead: [its interval] and name on the left, how long it runs on the right.
   The selected cue (the one in the panel) gets handles: drag its ends to trim, drag its body to move it; Delete removes it ---------- */
const ftl=$("#ftl"),XP=t=>(t/LEN*100).toFixed(3)+"%",LANES=Object.keys(CATS),LTOP=16,LH=16;let AX=0;
function renderTL(){const W=ftl.clientWidth||800,px=t=>t/LEN*W;AX=LTOP+LANES.length*LH+6;
  let h=timedScenes().map(s=>`<div class="scb" style="left:${XP(s.s)};width:${XP(s.e-s.s)};top:${LTOP-4}px;height:${AX-LTOP+4}px"><span>SC ${s.n}</span></div>`).join("");
  h+=LANES.map((c,i)=>`<div class="lnl" style="top:${LTOP+i*LH+LH/2}px;--c:var(--${c})"></div>`).join("");
  h+=`<div class="ax" style="top:${AX}px"></div>`;
  if(VID){const stp=LEN>600?30:LEN>240?10:5,big=stp*6;for(let t=0;t<=LEN;t+=stp)h+=`<i class="tk${t%big?"":" l"}" style="left:${XP(t)};top:${AX}px">${t%big?"":`<b>${mmss(t)}</b>`}</i>`}
  h+=FILM.map(id=>{const q=CUES[id];return `<button class="fm${id===cur?" cur":""}" data-id="${id}" style="--c:var(--${q.c});--zz:${100-Math.min(98,Math.round(q.dur))};left:${px(q.ft)}px;width:${Math.max(3,px(q.dur))}px;top:${LTOP+LANES.indexOf(q.c)*LH+1}px" aria-label="${span(q)} ${esc(q.n)}"></button>`}).join("");
  ftl.style.height=AX+22+"px";
  ftl.innerHTML=h+`<i class="fh" data-h="in" hidden></i><i class="fh" data-h="out" hidden></i><div class="rng-ax" id="crng" style="top:${AX}px"></div><div class="rng-ax hov" id="hrng" style="top:${AX}px" hidden></div><div class="rng-ax mrk" id="mrng" style="top:${AX}px" hidden></div><div class="fph" id="fph" style="top:${LTOP-6}px;height:${AX-LTOP+8}px"></div>`;
  placeLabel();applyFilter();markSel();lastT=-1;update(now())}
let tlW=0;new ResizeObserver(()=>{if(ftl.clientWidth!==tlW){tlW=ftl.clientWidth;renderTL()}}).observe(ftl);
function rngAt(el,q){el.style.setProperty("--c",`var(--${q.c})`);el.style.left=XP(q.ft);el.style.width=XP(q.dur)}
/* the selected cue's bar, and its handles */
function markSel(){$$(".fm.sel",ftl).forEach(x=>x.classList.remove("sel"));$$(".ci.sel").forEach(x=>x.classList.remove("sel"));if(CUES[SC.id])$(`.ci[data-id="${SC.id}"]`)?.classList.add("sel");const q=CUES[SC.id],fm=q&&$(`.fm[data-id="${SC.id}"]`,ftl),hs=$$(".fh",ftl);
  $$(".ffd",ftl).forEach(x=>x.remove());
  if(!fm){hs.forEach(h=>h.hidden=true);return}fm.classList.add("sel");const top=LTOP+LANES.indexOf(q.c)*LH+1;
  hs.forEach(h=>{h.hidden=false;h.style.setProperty("--c",`var(--${q.c})`);h.style.top=top+"px";h.style.left=XP(h.dataset.h==="in"?q.ft:q.ft+q.dur)});
  /* a dot on the bar at each freeze frame someone drew a box on */
  ftl.insertAdjacentHTML("beforeend",commentsOf(SC.id).filter(m=>m.box).map(m=>`<i class="ffd" data-cid="${m.id}" style="left:${XP(q.ft+m.t0)};top:${top+7}px" title="Freeze-frame comment at ${tc(q.ft+m.t0)}"></i>`).join(""))}
function placeLabel(){if(MARK)return;const q=CUES[cur],c=$("#crng");
  if(!q){$("#tlL").innerHTML=`<span class="hint">${!VID?"Upload the reel to start.":FILM.length?"":"No cues yet. Press Add cue at the playhead, then drag its ends to fit the sound."}</span>`;$("#tlR").textContent="";if(c)c.hidden=true;return}
  $("#tlL").innerHTML=`<b>[${span(q)}]</b> ${esc(q.n)}`;$("#tlR").textContent=secs(q.dur);if(c){c.hidden=false;rngAt(c,q)}}
/* while a cue's timing changes (here or in the panel), everything showing it follows along live */
function liveTiming(id){const q=CUES[id],fm=$(`.fm[data-id="${id}"]`,ftl);if(fm){const W=ftl.clientWidth;fm.style.left=q.ft/LEN*W+"px";fm.style.width=Math.max(3,q.dur/LEN*W)+"px"}
  if(id===SC.id){markSel();trimShow()}if(id===cur)placeLabel()}
const tAt=e=>{const r=ftl.getBoundingClientRect();return cl((e.clientX-r.left)/r.width)*LEN};
let drag=null;
/* within a few pixels of either end of any cue, the pointer grabs that end (like a clip in an editor) */
const edgeOf=(fm,e)=>{const r=fm.getBoundingClientRect(),g=Math.min(7,r.width/3);return e.clientX-r.left<=g?"in":r.right-e.clientX<=g?"out":null};
ftl.addEventListener("pointerdown",e=>{if(e.button||!VID)return;e.preventDefault();const dot=e.target.closest(".ffd");if(dot)return openThread(dot.dataset.cid);try{ftl.setPointerCapture(e.pointerId)}catch(_){}tip?.remove();
  const fh=e.target.closest(".fh"),fm=e.target.closest(".fm"),ed=fm&&edgeOf(fm,e);
  if(ed&&fm.dataset.id!==SC.id)toCue(fm.dataset.id);const q=CUES[SC.id];
  if(ed&&q)drag={kind:ed,id:SC.id,f0:q.ft,e0:q.ft+q.dur,moved:false,x:e.clientX};
  else if(fh&&q)drag={kind:fh.dataset.h,id:SC.id,f0:q.ft,e0:q.ft+q.dur,moved:false,x:e.clientX};
  else if(fm&&fm.dataset.id===SC.id&&q)drag={kind:"move",id:SC.id,f0:q.ft,e0:q.ft+q.dur,t0:tAt(e),moved:false,x:e.clientX};
  else drag={kind:"scrub",x:e.clientX,id:fm?.dataset.id,moved:false,was:!vid.paused};
  ftl.classList.toggle("grabbing",drag.kind!=="scrub")});
ftl.addEventListener("pointermove",e=>{if(!drag){const fm=e.target.closest(".fm");ftl.classList.toggle("edge",!!(fm&&edgeOf(fm,e))&&!fm.classList.contains("faded"));return}if(!drag.moved&&Math.abs(e.clientX-drag.x)<4)return;
  if(drag.kind==="scrub"){if(!drag.moved){drag.moved=true;if(drag.was)pause()}return seek(tAt(e))}
  if(!drag.moved){drag.moved=true;checkpoint(drag.kind==="move"?"move cue":"trim cue");pause()}
  const q=CUES[drag.id],t=tAt(e);
  if(drag.kind==="in"){q.ft=cl(t,0,drag.e0-.3);q.dur=drag.e0-q.ft;seek(q.ft)}
  else if(drag.kind==="out"){const end=cl(t,drag.f0+.3,LEN);q.dur=end-q.ft;seek(end-.05)}
  else{q.ft=cl(drag.f0+t-drag.t0,0,LEN-q.dur);seek(q.ft)}
  liveTiming(drag.id)});
ftl.addEventListener("pointerup",e=>{if(!drag)return;const d=drag;drag=null;ftl.classList.remove("grabbing");
  if(d.kind==="scrub"){if(d.moved){if(d.was)play();return}if(d.id){seek(CUES[d.id].ft);toCue(d.id)}else seek(tAt(e));return}
  if(d.moved)trimDone(d.id);else seek(CUES[d.id].ft)});
ftl.addEventListener("pointercancel",()=>{drag=null;ftl.classList.remove("grabbing")});

/* ---------- boxes on the picture: a comment can point at a box drawn on a freeze frame of its cue. Paused on that frame, the box shows on the video
   (click it to open the thread); while you write one, your box shows too. B (or Comment on frame) pauses and lets you drag a box ---------- */
const anc=document.createElement("div");anc.className="anc";screen.appendChild(anc);let ancH="",DRAW=null;
const boxCSS=b=>`left:${b.x*100}%;top:${b.y*100}%;width:${b.w*100}%;height:${b.h*100}%`;
function renderAnc(){const t=now(),bs=[];
  if(vid.paused&&VID)for(const m of Object.values(COMMENTS))if(m.box&&CUES[m.clip]&&REEL[m.clip]&&Math.abs(CUES[m.clip].ft+m.t0-t)<.12)bs.push([m.box,m.msgs[0].by,CUES[m.clip].c,m.id,!!SC.open[m.id]]);
  if(SC.draft?.box&&CUES[SC.id])bs.push([SC.draft.box,ME(),CUES[SC.id].c,"",true]);
  const h=bs.map(([b,by,c,cid,on])=>`<${cid?"button":"div"} class="abox${on?" on":""}"${cid?` data-cid="${cid}" aria-label="Open this freeze-frame comment"`:""} style="${boxCSS(b)};--c:var(--${c})">${avHTML(by)}</${cid?"button":"div"}>`).join("");
  if(h!==ancH){ancH=h;anc.innerHTML=h}}
anc.addEventListener("click",e=>{const b=e.target.closest(".abox[data-cid]");if(!b)return;e.stopPropagation();openThread(b.dataset.cid)});
/* jump to a comment's freeze frame (from the script view too) and flash its box */
function showFrame(cid){const m=COMMENTS[cid],q=CUES[m.clip];if(EXP)closeScript();SC.open[cid]=true;pause();seek(q.ft+m.t0);renderCard();
  setTimeout(()=>{renderAnc();const b=$(`.abox[data-cid="${cid}"]`,anc);if(b){b.classList.remove("flash");void b.offsetWidth;b.classList.add("flash")}},80)}
/* the cue a box belongs to: the one you're in (if the playhead is inside it), otherwise the cue under the playhead */
const inCue=(id,t)=>{const q=CUES[id];return q&&t>=q.ft-.01&&t<=q.ft+q.dur+.01};
function startDraw(id){if(!VID||EXP)return;if(DRAW)return endDraw();pause();let t=now();
  if(id&&!inCue(id,t)){seek(CUES[id].ft+Math.min(.5,CUES[id].dur/2));t=now()}
  id=id&&inCue(id,t)?id:FILM.filter(k=>inCue(k,t)).sort((a,b)=>CUES[a].dur-CUES[b].dur)[0];
  if(!id)return toast("No cue at the playhead","Move the playhead into a cue, then draw on the frame","props","seed");
  DRAW={id};const d=document.createElement("div");d.className="draw";d.style.setProperty("--c",`var(--${CUES[id].c})`);d.innerHTML=`<small>Drag a box on the frame · Esc to cancel</small>`;screen.appendChild(d);DRAW.el=d;
  d.addEventListener("pointerdown",drawDown)}
function endDraw(){DRAW?.el.remove();DRAW=null}
/* the box is kept in 0–1 coordinates of the frame, so it fits the player at any size */
function drawDown(e){if(e.button)return;e.preventDefault();e.stopPropagation();const dr=DRAW.el,r=dr.getBoundingClientRect(),P=ev=>[cl((ev.clientX-r.left)/r.width),cl((ev.clientY-r.top)/r.height)],[x0,y0]=P(e);
  const bx=document.createElement("div");bx.className="abox on";dr.appendChild(bx);try{dr.setPointerCapture(e.pointerId)}catch(_){}let box=null;
  const mv=ev=>{const [x,y]=P(ev);box={x:Math.min(x,x0),y:Math.min(y,y0),w:Math.abs(x-x0),h:Math.abs(y-y0)};bx.style.cssText=boxCSS(box)};
  const up=()=>{dr.removeEventListener("pointermove",mv);dr.removeEventListener("pointerup",up);dr.removeEventListener("pointercancel",up);
    if(!box||box.w<.03||box.h<.03){bx.remove();return}const id=DRAW.id,q=CUES[id];endDraw();
    if(SC.id!==id)toCue(id);SC.pin=true;SC.draft={t0:cl(now()-q.ft,0,q.dur),t1:null,box};renderCard(true)};
  dr.addEventListener("pointermove",mv);dr.addEventListener("pointerup",up);dr.addEventListener("pointercancel",up)}
$("#frm").addEventListener("click",()=>startDraw(SC.pin?SC.id:null));

/* ---------- marking a cue from the reel: M (or the button) at the start of the sound, again at its end, then name it and pick what kind of sound it is ---------- */
let MARK=null;const mkb=$("#mark");
function mark(){if(!VID)return;if(MARK){const t1=now();let a=Math.min(MARK.t0,t1),b=Math.max(MARK.t0,t1);if(b-a<.3)b=Math.min(LEN,a+3);MARK=null;mkb.classList.remove("on");$("span",mkb).textContent="Add cue";$("#mrng").hidden=true;newCueForm(a,b);return}
  closeNC();MARK={t0:now()};mkb.classList.add("on");$("span",mkb).textContent="Set end";const m=$("#mrng");m.hidden=false;markTick()}
function cancelMark(){if(!MARK)return;MARK=null;mkb.classList.remove("on");$("span",mkb).textContent="Add cue";$("#mrng").hidden=true;placeLabel()}
function markTick(){const a=Math.min(MARK.t0,now()),b=Math.max(MARK.t0,now()),m=$("#mrng");if(m){m.style.left=XP(a);m.style.width=XP(Math.max(b-a,LEN/400))}
  $("#tlL").innerHTML=`<b>[${mmss(a)}–${mmss(b)}]</b> <span class="hint">Marking. Press M again where the sound ends</span>`;$("#tlR").textContent=secs(b-a)}
/* Add cue (the button): a cue at the playhead, 3s long, to name and then fit on the timeline by dragging its ends */
function addAt(){if(!VID)return;if(MARK)return mark();const a=Math.min(now(),Math.max(0,LEN-.5));newCueForm(a,Math.min(LEN,a+3))}
mkb.addEventListener("click",addAt);
/* the new-cue card: a name, a tile per kind of sound, and the sound's flower blooming in the background in its colour */
const nc=document.createElement("div");nc.className="nc";nc.hidden=true;document.body.appendChild(nc);let NC=null,NCG=null,lastCat="hardfx";
function ncCat(c){NC.c=c;nc.style.setProperty("--c",`var(--${c})`);$$(".nct",nc).forEach(x=>{const on=x.dataset.cat===c;x.setAttribute("aria-checked",on);x._g.base=on?.16:.1;x._g.color=`--${x.dataset.cat}`});NCG.color=`--${c}`}
function newCueForm(a,b){pause();seek(a);NC={a,b,c:curCat!=="all"?curCat:lastCat};
  nc.innerHTML=`<canvas class="nc-bg" style="width:196px;height:196px" aria-hidden="true"></canvas>
    <div class="nc-h"><span>New cue</span><b>[${mmss(a)}–${mmss(b)}]</b><small>${secs(b-a)}</small></div>
    <input class="nc-n" placeholder="What do we hear?" aria-label="Cue name">
    <div class="nc-c" role="radiogroup" aria-label="Kind of sound">${LANES.map(k=>`<button class="nct" data-cat="${k}" role="radio" aria-checked="false" style="--c:var(--${k})"><canvas class="g" style="width:14px;height:14px" aria-hidden="true"></canvas><span>${CATS[k]}</span></button>`).join("")}</div>
    <div class="nc-f"><button class="btn btn-ghost" data-nc="x">Cancel</button><button class="btn btn-default" data-nc="ok">Add cue</button></div>`;
  NCG=glyph($(".nc-bg",nc),"flower",{color:`--${NC.c}`,base:.08});$$(".nct",nc).forEach(x=>x._g=glyph($("canvas",x),"flower",{color:`--${x.dataset.cat}`,base:.1}));ncCat(NC.c);
  nc.hidden=false;const r=ftl.getBoundingClientRect(),w=nc.offsetWidth,h=nc.offsetHeight,x=r.left+(a+b)/2/LEN*r.width;nc.style.left=cl(x-w/2,8,innerWidth-w-8)+"px";nc.style.top=Math.max(8,r.top-h-10)+"px";$(".nc-n",nc).focus()}
function closeNC(){nc.hidden=true;NC=null;placeLabel()}
nc.addEventListener("click",e=>{const c=e.target.closest("[data-cat]");if(c){ncCat(c.dataset.cat);$(".nc-n",nc).focus();return}
  const b=e.target.closest("[data-nc]");if(!b)return;if(b.dataset.nc==="x")return closeNC();addMarked()});
nc.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addMarked()}if(e.key==="Escape"){e.stopPropagation();closeNC()}});
function addMarked(){if(!NC)return;const {a,b,c}=NC,name=$(".nc-n",nc).value.trim()||`${CATS[c]} at ${mmss(a)}`;lastCat=c;closeNC();checkpoint("add cue");
  const id="u"+(++uid);insertCue(id,{c,n:name,dir:false,snd:false,d:"",ft:a,dur:b-a});pause();seek(a);setCur(ownerAt(now()),true);toCue(id);changed();
  toast(`Cue added [${span(CUES[id])}]`,"Drag its ends on the timeline to fit the sound · ⌘Z undoes",c)}
/* a new cue goes everywhere a cue shows: the list (in reel order), the lanes, the legend, the counts */
function insertCue(id,q){CUES[id]=REEL[id]=q;FILM.push(id);FILM.sort((a,b)=>CUES[a].ft-CUES[b].ft);const nx=FILM[FILM.indexOf(id)+1];
  $(".cm-empty",clScroll)?.remove();clScroll.insertAdjacentHTML("beforeend",ciHTML(id));const ci=clScroll.lastElementChild;clScroll.insertBefore(ci,nx?$(`.ci[data-id="${nx}"]`):null);
  RG[id]=glyph(ci.querySelector("canvas"),"seed",{color:`--${q.c}`,base:.14});counts();tally();renderTL()}

/* ---------- the current cue: list, lanes, label, script and the cue panel follow the playhead ---------- */
let cur=null,lastT=-1;
function update(t){if(t===lastT)return;lastT=t;const ph=$("#fph");if(!ph)return;ph.style.left=XP(t);$("#tc").textContent=VID?`${tc(t)} / ${mmss(LEN)}`:"–:–";setCur(ownerAt(t));draftTick()}
function setCur(id,force){if(!id){if(cur&&!CUES[cur]){cur=null;placeLabel();cardFollow(true)}return}if(id===cur&&!force)return;const prev=cur;cur=id;const q=CUES[id];
  $$(".ci.in").forEach(x=>x.classList.remove("in"));$(`.ci[data-id="${id}"]`)?.classList.add("in");settleList();
  $$(".fm.cur").forEach(x=>x.classList.remove("cur"));$(`.fm[data-id="${id}"]`)?.classList.add("cur");placeLabel();
  $$("#doc .now").forEach(x=>x.classList.remove("now"));anchorIn(doc)?.classList.add("now");
  if(prev&&RG[prev]&&CUES[prev])setG(RG[prev],restKey(CUES[prev]),`--${CUES[prev].c}`);if(RG[id])setG(RG[id],"bud",`--${q.c}`);
  if(!ANIM){if(EXP)follow();cardFollow()}}
const hideTools=()=>{hl.hidden=true;hideCtx()};

/* ---------- the script panel under the film: scrolls on its own (it doesn't follow the playhead); the current cue's line is marked,
   and "Show in script" in the cue panel scrolls to a cue's line. Drag its header to give it more or less of the column ---------- */
let ANIM=false,EXP=false,manualAt=-1e9;const dock=$("#dock"),scard=$("#scard"),player=$("#player"),host=()=>EXP?scard:dock;
function anchorIn(root){return cur?$(`.cue[data-id="${cur}"]`,root):null}
function centreOn(el,instant){const b=doc.getBoundingClientRect(),r=el.getBoundingClientRect(),dy=r.top+r.height/2-(b.top+b.height/2);
  doc.scrollTo({top:doc.scrollTop+dy,behavior:instant||reduce||Math.abs(dy)>innerHeight*2?"auto":"smooth"})}
function reveal(id){const el=$(`.cue[data-id="${id}"]`,doc);if(!el)return;centreOn(el);el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash")}
const SHARE=.26;
const slotH=()=>{const ch=$(".col").clientHeight;return hasScript()?(innerWidth<=860?320:Math.round(cl(ch*SHARE,150,ch*.62))):APP?(innerWidth<=860?120:104):0};
function layoutFilm(){if(EXP)return;const col=$(".col"),narrow=innerWidth<=860,ch=col.clientHeight,H=slotH();$("#ex").style.height=H+"px";
  if(narrow){col.style.width="";col.style.flex="";screen.style.width="100%";return}
  const other=player.offsetHeight-screen.offsetHeight,ratio=vid.videoWidth&&vid.videoHeight?vid.videoWidth/vid.videoHeight:16/9,maxW=$(".main").clientWidth-$("#cuelist").offsetWidth-48;
  /* the column (timeline, script) always runs the full width up to the divider; only the picture is sized to fit the height, centred above them */
  const W=Math.round(Math.max(420,Math.min(maxW,(ch-H-(H?14:0)-other)*ratio)));col.style.flex="none";col.style.width=maxW+"px";screen.style.width=Math.min(W,maxW-36)+"px";screen.style.aspectRatio=ratio}
new ResizeObserver(()=>{layoutFilm();if(EXP)placeCard()}).observe($(".main"));
/* the script under the film is a preview: it scrolls, and a click opens script view (a click on a highlighted line also jumps the film to it) */
$("#ex").addEventListener("click",e=>{if(EXP||ANIM||!hasScript()||e.target.closest("button,.sdrop"))return;const c=e.target.closest(".cue:not(.off)");if(c){const id=c.dataset.id;seek(CUES[id].ft);toCue(id)}openScript()});
/* in the script: click a highlighted line to jump the film there (and open its cue); Enter does the same from the keyboard */
doc.addEventListener("click",e=>{if(!EXP)return;const h=e.target.closest(".act-h");if(h){if(SCRIPT.length>1){toggleAct(h.closest(".act"));setTimeout(placeCard,320)}return}if(!getSelection().isCollapsed)return;
  const c=e.target.closest(".cue:not(.off)");if(c){manualAt=-1e9;const id=c.dataset.id;seek(CUES[id].ft);toCue(id)}});
doc.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.classList.contains("cue"))e.target.click()});
["wheel","touchmove"].forEach(ev=>doc.addEventListener(ev,()=>manualAt=performance.now(),{passive:true}));
doc.addEventListener("scroll",()=>placeCard(),{passive:true});

/* ---------- script view: the script panel slides up over the film and takes the column. Here it follows the film (scroll away and it waits a few seconds),
   and the cue's card floats beside its line with the clip on top: click the clip, the button or Esc to slide back down ---------- */
const svLabel=()=>{$("#sv").hidden=!EXP;$("#ex").classList.toggle("peek",!EXP&&hasScript())};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let exTop=0;
/* paper sliding: a damped spring on the panel's top edge whose pull eases in (the sheet takes a moment to get going), with a touch of overshoot as it settles */
function slide(el,from,to,k,c){if(reduce){el.style.top=to+"px";return Promise.resolve()}return new Promise(res=>{let x=from,v=0,last=performance.now();
  const t0=last;(function f(n){const dt=Math.min(.032,(n-last)/1000);last=n;const e=Math.min(1,((n-t0)/150)**2);v+=(-k*e*(x-to)-c*v)*dt;x+=v*dt;el.style.top=x+"px";if(Math.abs(x-to)<.3&&Math.abs(v)<6){el.style.top=to+"px";return res()}requestAnimationFrame(f)})(last)})}
async function openScript(){if(EXP||ANIM||!hasScript())return;ANIM=true;closeNC();hideTools();closeMenu();
  const ex=$("#ex");exTop=ex.offsetTop;Object.assign(ex.style,{position:"absolute",left:0,right:0,bottom:0,top:exTop+"px",height:"auto",zIndex:6});ex.offsetWidth;
  EXP=true;document.body.classList.add("sview");dock.innerHTML="";svLabel();
  await slide(ex,exTop,0,95,15.5);ANIM=false;manualAt=-1e9;follow(true);cardFollow(true)}
async function closeScript(){if(!EXP||ANIM)return;ANIM=true;closeMenu();hideTools();closeNC();scard.hidden=true;SC.free=false;
  const ex=$("#ex");await slide(ex,0,exTop,140,19);
  ["position","left","right","bottom","top","zIndex","transition"].forEach(k=>ex.style[k]="");EXP=false;document.body.classList.remove("sview");svLabel();ANIM=false;layoutFilm();cardFollow(true)}
$("#sv").addEventListener("click",e=>{e.stopPropagation();closeScript()});
function follow(instant){if(!EXP||performance.now()-manualAt<3000||!hl.hidden||!ctx.hidden)return;const el=anchorIn(doc);if(el)centreOn(el,instant)}

/* ---------- a script arriving: a trifold letter. It appears folded in the middle of the screen (the middle third showing the top of the script),
   the top flap unfolds up from behind it onto a cover with the title, the bottom flap unfolds down, then both fold back and the letter drops
   into the script panel. Click anywhere to skip ---------- */
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, seg=(t,a,d)=>cl((t-a)/d);
function run(dur,f){return new Promise(r=>{const t0=performance.now();(function fr(n){const t=Math.min(1,(n-t0)/dur);if(f(t*dur)===false||t>=1)return r();requestAnimationFrame(fr)})(t0)})}
function buildTrifold(src,W,Hs,name){const sh=document.createElement("div");sh.className="sheet";Object.assign(sh.style,{left:0,top:0,width:W+"px",height:3*Hs+"px",transformOrigin:"0 0"});
  const clone=y=>{const c=src.cloneNode(true);c.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id"));c.removeAttribute("id");c.classList.remove("pre");c.classList.add("clone");
    Object.assign(c.style,{top:-y+"px",width:W+"px",height:2*Hs+"px",display:"flex"});return c};
  const panel=(cls,t)=>{const el=document.createElement("div");el.className="pnl "+cls;Object.assign(el.style,{top:t+"px",height:Hs+"px"});el.innerHTML='<div class="face"></div><div class="cr"></div>';sh.appendChild(el);return el};
  const sc=SCRIPT[0].scenes,first=sc.find(s=>s.slug)?.slug||"";
  const up=panel("up",0);$(".face",up).innerHTML=`<div class="cover"><b>${esc(TITLE)}</b><span>${esc(name||"Script")}</span><small>${sc.length} scene${sc.length===1?"":"s"}${first?` · opens on ${esc(first)}`:""}</small></div>`;
  const dn=panel("dn",2*Hs);$(".face",dn).appendChild(clone(Hs));const mid=panel("mid",Hs);$(".face",mid).appendChild(clone(0));
  document.body.appendChild(sh);$$(".doc",sh).forEach(d=>d.scrollTop=0);return {sh,up,dn}}
function poseTrifold(S,x,y,s,fu,fd){S.sh.style.transform=`translate3d(${x}px,${y}px,0) scale(${s})`;
  const v=(el,f,sign,z)=>{el.style.setProperty("--a",sign*180*f+"deg");el.style.setProperty("--z",-z*f+"px");el.style.setProperty("--c",Math.sin(f*PI).toFixed(3))};v(S.up,fu,1,2);v(S.dn,fd,-1,1)}
async function introScript(name){if(!hasScript()||ANIM)return;const ex=$("#ex");doc.scrollTop=0;if(reduce)return;
  ANIM=true;closeNC();hideTools();ex.classList.add("pre");await new Promise(r=>requestAnimationFrame(r));
  const A=ex.getBoundingClientRect(),W=A.width,Hs=A.height,s0=Math.min(1.2,(innerHeight-80)/(3*Hs),(innerWidth-80)/W);
  const S=buildTrifold(ex,W,Hs,name),scrim=document.createElement("div");scrim.className="scrim";document.body.appendChild(scrim);let skip=false;scrim.addEventListener("click",()=>skip=true);
  const IN=320,TOP=[340,440],BOT=[620,440],HOLD=1100,shutB=[TOP[0]+TOP[1]+HOLD+180,420],shutT=[shutB[0]+260,420],FLY=[shutT[0]+shutT[1]-60,600],END=FLY[0]+FLY[1];
  await run(END,ms=>{if(skip)return false;const a=easeIO(seg(ms,0,IN)),p=easeIO(seg(ms,...FLY)),s=s0*(.9+.1*a)*(1-p)+p;
    const fu=ms<shutT[0]?1-easeIO(seg(ms,...TOP)):easeIO(seg(ms,...shutT)),fd=ms<shutB[0]?1-easeIO(seg(ms,...BOT)):easeIO(seg(ms,...shutB));
    /* the middle third stays put mid-screen, then flies to the panel */
    const mx=(innerWidth-W*s)/2,my=(innerHeight-Hs*s)/2;
    poseTrifold(S,mx*(1-p)+A.left*p,(my-Hs*s)*(1-p)+(A.top-Hs)*p,s,fu,fd);S.sh.style.opacity=a;scrim.style.opacity=(.3*Math.min(a,1-p)).toFixed(3)});
  S.sh.remove();scrim.remove();ex.classList.remove("pre");ANIM=false;cardFollow(true)}

/* ---------- the cue panel: in the film view it rises over the cue list when you pick a cue (× or Esc puts it away); in script view it is a draggable card
   beside the line, with the clip on top (click it to go back). Either way it reads top to bottom: the cue's name and timing, the director's note,
   your confirm box, then its comment threads. A thread opens and closes in place to show its replies and a reply box; a new comment goes in at the bottom.
   A comment can point at a moment (or a stretch) of the cue, or at a box drawn on a freeze frame of the picture ---------- */
let MP=null; /* the @mention picker, while it's open */
const SC={id:null,pin:false,open:{},replyTo:null,draft:null,text:"",note:false,rename:false,free:false,fx:0,fy:0};
const avHTML=k=>`<span class="av" style="--c:var(${PEOPLE[k].c})" title="${PEOPLE[k].n}" aria-label="${PEOPLE[k].n}"></span>`;
/* the cue's sign-off box, one per cue (not per comment): the director approves, the sound designer confirms. Each sees only their own */
const myK=()=>ROLE==="director"?"dir":"snd";
const checksHTML=o=>{const on=!!o[myK()],[v,d]=ROLE==="director"?["Approve","Approved"]:["Confirm","Confirmed"];return `<button class="sg${on?" on":""}" data-act="tick" role="checkbox" aria-checked="${on}" title="${on?`${d}. Click to undo`:`${v} this cue`}"><i>${on?ICON.check:""}</i>${on?d:v}</button>`};
/* the cue's actions: your confirm box, and (in the film view) drawing a box on the frame to comment on */
const actsHTML=q=>`<div class="acts">${checksHTML(q)}${EXP?"":`<button class="btn btn-outline cmt" data-act="draw" title="Pause on a frame and draw a box to comment on it">${ICON.box}Draw on frame<kbd>B</kbd></button>`}</div>`;
function toggleSign(q){const k=myK();checkpoint(ROLE==="director"?"approve":"confirm");q[k]=!q[k];refreshCue(SC.id);tally();renderComments();changed();renderCard()}
const typing=()=>{const a=document.activeElement;return /TEXTAREA|INPUT/.test(a?.tagName||"")&&(host().contains(a)||nc.contains(a))};
const busy=()=>SC.draft||SC.replyTo||SC.text.trim()||SC.rename;
/* the panel follows the playhead, except that a cue you pick (on the timeline, in the list, in the script) stays selected until you pick another */
function cardFollow(force){if(ANIM)return;if(!force&&typing())return;const keep=SC.pin&&CUES[SC.id];
  if(!busy()&&!keep&&(SC.id!==cur||force)){if(SC.id!==cur){SC.addNote=false;SC.open={}}SC.id=CUES[cur]?cur:null;renderCard()}else if(force)renderCard()}
function toCue(id){if(id!==undefined){if(id!==SC.id){SC.addNote=false;SC.open={}}SC.id=id;SC.pin=!!id}SC.draft=null;SC.replyTo=null;SC.text="";SC.rename=false;renderCard()}
/* open a cue's panel with one thread open, at the moment it points to */
function openThread(cid){const m=COMMENTS[cid];if(SC.id!==m.clip)toCue(m.clip);SC.pin=true;SC.open[cid]=true;pause();seek(CUES[m.clip].ft+m.t0);renderCard();
  $(`.th[data-cid="${cid}"]`,host())?.scrollIntoView({block:"nearest",behavior:reduce?"auto":"smooth"})}
function openDraft(){const q=CUES[SC.id];if(!q)return;SC.pin=true;if(!SC.draft&&!SC.replyTo){pause();SC.draft={t0:cl(now()-q.ft,0,q.dur),t1:null,box:null}}renderCard(true)}
function closePanel(){SC.pin=false;SC.draft=null;SC.replyTo=null;SC.text="";SC.open={};renderCard();renderAnc()}
const linked=id=>!!$(`.cue[data-id="${id}"]`,doc);
function headHTML(){const q=CUES[SC.id],title=SC.rename?`<input class="rn" value="${esc(q.n)}" aria-label="Cue name">`:`<b>${esc(q.n)}</b>`;
  return `<div class="ch"><div class="tt">${title}<small><i class="cdot" style="--c:var(--${q.c})" title="${CATS[q.c]}"></i>${span(q)} · ${secs(q.dur)} · ${CATS[q.c]}</small></div><button class="btn btn-ghost btn-icon more" data-act="more" aria-label="Edit cue">${ICON.more}</button>${EXP?"":`<button class="btn btn-ghost btn-icon cls" data-act="close" aria-label="Close (Esc)">${ICON.x}</button>`}</div>`}
/* a message: who, and (on a thread's opening message) the moment of the cue it points at; when it was posted sits on the right */
function msgHTML(x,at){if(x.sys)return `<div class="msg sys">${esc(x.text)} · ${rel(x.at)}</div>`;const p=PEOPLE[x.by],rx=Object.entries(x.react||{}).filter(([,a])=>a.length);
  return `<div class="msg">${avHTML(x.by)}<div><div class="who"><span>${p.n}${at?`<i>@ ${at}</i>`:""}</span><small>${rel(x.at)}</small></div>${x.text?`<p>${fmtText(x.text)}</p>`:""}${rx.length?`<div class="rxs">${rx.map(([e,a])=>`<span class="rx" title="${a.map(first).join(", ")}">${e}<b>${a.length}</b></span>`).join("")}</div>`:""}</div></div>`}
/* what the new comment points at: a freeze frame with its box, a moment, or (Extend to) a stretch */
function rangeHTML(){const d=SC.draft,q=CUES[SC.id],t=cl(now()-q.ft,0,q.dur);
  if(d.box)return `<div class="rng"><span class="ffl">${ICON.box}Freeze frame at ${tc(q.ft+d.t0)}</span><button class="btn btn-ghost btn-icon" data-act="clrbox" title="Remove the box" aria-label="Remove the box">${ICON.x}</button></div>`;
  return `<div class="rng"><span>${d.t1!=null?`${tc(q.ft+d.t0)} – ${tc(q.ft+d.t1)}`:`At ${tc(q.ft+d.t0)}`}</span>${d.t1!=null?`<button class="btn btn-ghost btn-icon" data-act="clrend" title="Back to a single moment" aria-label="Remove the end">${ICON.x}</button>`:""}
    <button class="btn btn-ghost" data-act="setend" title="Play or scrub to where the sound ends, then click"${Math.abs(t-d.t0)<.15?" disabled":""}>Extend to<b>${tc(q.ft+t)}</b></button></div>`}
function draftTick(){if(!SC.draft||SC.draft.box)return;const b=$('[data-act="setend"]',host());if(!b)return;const q=CUES[SC.id],t=cl(now()-q.ft,0,q.dur);$("b",b).textContent=tc(q.ft+t);b.disabled=Math.abs(t-SC.draft.t0)<.15}
/* a thread: its opening message (click to show or hide the replies), a freeze-frame link if it has a box, and a Reply button that points the box at the bottom at it */
function threadHTML(m){const q=CUES[m.clip],ms=m.msgs.filter(x=>!x.sys),n=ms.length-1,on=!!SC.open[m.id],at=(m.box?ICON.box:"")+rtc(m).replace(/^at /,"").replace(" – ","–");
  const ff=m.box?`<button class="ff" data-act="frame" data-cid="${m.id}" title="Jump to this frame and show the box on the video">${ICON.box}<span>Freeze frame at ${tc(q.ft+m.t0)}</span><b>Show</b></button>`:"";
  return `<div class="th${on?" open":""}${SC.replyTo===m.id?" rto-on":""}" data-cid="${m.id}"><div class="th-h" data-act="tog" data-cid="${m.id}" role="button" tabindex="0" aria-expanded="${on}">${msgHTML(ms[0],at)}</div>${on?ff:""}
    ${on&&n>0?`<div class="th-r">${m.msgs.slice(m.msgs.indexOf(ms[0])+1).map(x=>msgHTML(x)).join("")}</div>`:""}
    <div class="cft">${n>0?`<button class="tgl" data-act="tog" data-cid="${m.id}" aria-expanded="${on}">${on?"Hide replies":`${n} repl${n>1?"ies":"y"}`}${on?ICON.up:ICON.down}</button>`:""}<button class="tgl rp" data-act="rep" data-cid="${m.id}">Reply</button></div></div>`}
/* the director writes the note; the sound designer reads it */
const noteHTML=q=>!q.d&&!SC.addNote?"":ROLE==="director"?`<label class="cnote ed"><b>Director's note</b><textarea data-note rows="2" placeholder="What should this sound like?">${esc(q.d||"")}</textarea></label>`
  :`<button class="cnote" data-act="note" aria-expanded="${SC.note}"><b>Director's note</b>${esc(q.d)}</button>`;
function bodyHTML(){const q=CUES[SC.id],cs=commentsOf(SC.id);
  return `${noteHTML(q)}${actsHTML(q)}<div class="clist"><div class="clh">Comments${cs.length?` <b>${cs.length}</b>`:""}</div>${cs.map(threadHTML).join("")||`<p class="empty hint">No comments yet. Write one below, or draw a box on the frame.</p>`}</div>`}
/* trim strip (script view): a zoomed-in window a little wider than the cue, for fine timing; its ends set the in and out, dragging between them moves the whole cue */
let TW=null;
function trimHTML(){const q=CUES[SC.id],pad=Math.max(4,q.dur*.75);TW=[Math.max(0,q.ft-pad),Math.min(LEN,q.ft+q.dur+pad)];
  return `<div class="trim" title="Fine timing: drag the ends to trim, the middle to move"><span>In <b data-k="in">${tc(q.ft)}</b></span><div class="trk" data-trk style="--c:var(--${q.c})">${trimMarks(q)}</div><span>Out <b data-k="out">${tc(q.ft+q.dur)}</b></span></div>`}
const TX=t=>((t-TW[0])/(TW[1]-TW[0])*100).toFixed(2)+"%";
const trimMarks=q=>`<div class="win" data-h="mid" style="left:${TX(q.ft)};width:${TX(TW[0]+q.dur)}"></div><i class="hd" data-h="in" style="left:${TX(q.ft)}"></i><i class="hd" data-h="out" style="left:${TX(q.ft+q.dur)}"></i><i class="tph" style="left:${TX(cl(now(),TW[0],TW[1]))}"></i>`;
function trimShow(){const q=CUES[SC.id],k=$(".trim",host());if(!k||!q)return;$("[data-trk]",k).innerHTML=trimMarks(q);$('[data-k="in"]',k).textContent=tc(q.ft);$('[data-k="out"]',k).textContent=tc(q.ft+q.dur);
  const tag=$(".cliptag",host());if(tag)tag.lastChild.textContent=span(q)}
function trimTick(){const t=$(".trim .tph",host());if(t&&TW)t.style.left=TX(cl(now(),TW[0],TW[1]))}
/* after a trim or move, everything that shows the cue's timing catches up */
function trimDone(id){FILM.sort((a,b)=>CUES[a].ft-CUES[b].ft);const ci=$(`.ci[data-id="${id}"]`),nx=FILM[FILM.indexOf(id)+1];if(ci)clScroll.insertBefore(ci,nx?$(`.ci[data-id="${nx}"]`):null);
  refreshCue(id);renderTL();renderComments();setCur(ownerAt(now()),true);renderCard();changed()}
function renderCard(focus){const h=host(),show=!!(SC.id&&CUES[SC.id]&&(EXP||SC.pin));scard.hidden=!EXP||!show;
  if(!EXP){const was=dock.classList.contains("up");dock.classList.toggle("up",show);if(show&&!was)dock.classList.add("rise")}
  if(!show){if(!EXP)dock.innerHTML=!VID||!FILM.length?`<p class="dock-e">${!VID?"Upload the reel to start the board.":"Add a cue to start the board: press <b>Add cue</b> at the playhead, then drag its ends on the timeline to fit the sound."}</p>`:"";markSel();renderAnc();return}
  const q=CUES[SC.id],p=!vid.paused&&!vid.ended,rt=COMMENTS[SC.replyTo],ph=rt?`Reply to ${first(rt.msgs[0].by)}…`:SC.draft?.box?"What should change in this frame?":SC.draft?"What should change here?":`Comment at ${tc(cl(now(),q.ft,q.ft+q.dur))}`;MP=null;
  const keep=h._id===SC.id?$(".cbody",h)?.scrollTop||0:0;h._id=SC.id;
  h.innerHTML=`<div class="panel">${EXP?`<div class="clipslot" data-act="film" title="Back to the film"><canvas id="tcv" width="480" height="270" aria-hidden="true"></canvas><span class="cliptag" style="--c:var(--${q.c})"><i></i>${span(q)}</span>
      <button class="btn btn-icon pz" data-act="pp" aria-label="Play or pause">${p?ICON.pause:ICON.play}</button><span class="bk2">${ICON.film}Back to film</span></div>${trimHTML()}`:""}
    ${headHTML()}<div class="cbody">${bodyHTML()}</div>${rt?`<div class="rng rto"><span>Replying to <b>${esc(PEOPLE[rt.msgs[0].by].n)}</b> · ${esc(snip(rt,40))}</span><button class="btn btn-ghost btn-icon" data-act="norep" title="Cancel the reply (Esc)" aria-label="Cancel the reply">${ICON.x}</button></div>`:SC.draft?rangeHTML():""}
    <div class="compose"><div class="cin">${avHTML(ME())}<textarea rows="1" data-new placeholder="${ph}" aria-label="${ph}">${esc(SC.text)}</textarea><button class="btn send" data-act="send" aria-label="Send">${ICON.send}</button></div></div></div>`;
  $(".cbody",h).scrollTop=keep;
  if(EXP&&vid.readyState>=2)tcx()?.drawImage(vid,0,0,480,270);
  if(SC.rename){const i=$(".rn",h);i.focus();i.select()}
  else if(focus){const ta=$("[data-new]",h);if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}}
  markSel();renderAnc();if(EXP)placeCard()}
/* in script view: beside its line, in the margin to the right of the script (over the cue list) so it never covers the text; level with the line.
   A cue not in the script sits at the top of that margin. While you're writing it stays put. Once dragged, it keeps the spot it was dropped in */
function placeCard(){if(!EXP||ANIM||scard.hidden)return;scard.style.opacity="";scard.style.pointerEvents="";
  if(SC.free){scard.style.setProperty("--mh",`${innerHeight-24}px`);
    scard.style.left=cl(SC.fx,8,innerWidth-scard.offsetWidth-8)+"px";scard.style.top=cl(SC.fy,8,innerHeight-Math.min(scard.offsetHeight,innerHeight-16)-8)+"px";return}
  const el=$(`.cue[data-id="${SC.id}"]`,doc),d=$("#ex").getBoundingClientRect(),w=scard.offsetWidth,x=Math.min(d.right-20,innerWidth-w-12);
  const r=el&&!el.closest(".act.collapsed")?el.getClientRects()[0]:null,pin=!!busy(),off=el&&(!r||r.bottom<d.top+40||r.top>d.bottom-20);
  if(off&&!pin){scard.style.opacity=0;scard.style.pointerEvents="none";return}
  scard.style.setProperty("--mh",`${Math.min(560,d.height-16)}px`);const h=scard.offsetHeight,y=r&&!off?r.top-14:d.top+8;
  scard.style.left=x+"px";scard.style.top=cl(y,d.top+8,Math.max(d.top+8,d.bottom-h-8))+"px"}
/* drag the card by anything that isn't a control. The pointer is only captured once it has actually moved, so a plain click (on the clip, say) still lands */
let scDrag=false;
scard.addEventListener("pointerdown",e=>{if(e.button||e.target.closest("button:not(.clipslot),textarea,input,.cmenu,.th-h,.cnote,.trim,.loc,[data-act=pp]"))return;
  const x0=e.clientX,y0=e.clientY,bb=scard.getBoundingClientRect(),pid=e.pointerId;scDrag=false;
  const mv=ev=>{const mx=ev.clientX-x0,my=ev.clientY-y0;if(!scDrag&&Math.hypot(mx,my)<4)return;if(!scDrag){scDrag=true;try{scard.setPointerCapture(pid)}catch(_){}scard.classList.add("dragging")}SC.free=true;SC.fx=bb.left+mx;SC.fy=bb.top+my;placeCard()};
  const up=()=>{scard.classList.remove("dragging");document.removeEventListener("pointermove",mv);document.removeEventListener("pointerup",up);document.removeEventListener("pointercancel",up);setTimeout(()=>{scDrag=false},0)};
  document.addEventListener("pointermove",mv);document.addEventListener("pointerup",up);document.addEventListener("pointercancel",up)});
function closeMenu(){$$(".pop .cmenu,.dock .cmenu").forEach(m=>m.remove())}
function showMenu(a,html){closeMenu();const p=$(".panel",host()),m=document.createElement("div");m.className="cmenu";m.innerHTML=html;p.appendChild(m);
  const pr=p.getBoundingClientRect(),r=a.getBoundingClientRect();m.style.top=r.bottom-pr.top+4+"px";m.style.right=pr.right-r.right+"px";
  if(m.getBoundingClientRect().bottom>innerHeight-8){m.style.top="";m.style.bottom=pr.bottom-r.top+4+"px"}}
/* a new comment: at the moment (or stretch, or freeze frame) the draft points at, or the playhead. It opens as a thread */
function send(){const text=SC.text.trim();if(!text)return;const q=CUES[SC.id];
  if(SC.replyTo&&COMMENTS[SC.replyTo]){checkpoint("reply");const cid=SC.replyTo;COMMENTS[cid].msgs.push({by:ME(),at:Date.now(),text,audio:[],react:{}});SC.replyTo=null;SC.text="";SC.open[cid]=true;renderComments();renderCard();changed();return}
  checkpoint("comment");
  const d=SC.draft||{t0:cl(now()-q.ft,0,q.dur),t1:null,box:null},id="c"+(++cuid);
  COMMENTS[id]={id,clip:SC.id,t0:d.t1!=null?Math.min(d.t0,d.t1):d.t0,t1:d.t1!=null?Math.max(d.t0,d.t1):null,cat:q.c,pri:"med",dir:false,snd:false,box:d.box||null,edge:null,msgs:[{by:ME(),at:Date.now(),text,audio:[],react:{}}]};
  SC.text="";SC.draft=null;renderComments();renderCard();changed()}
/* edits from the ⋯ menu: rename, change the kind of sound, remove */
function rename(v){const q=CUES[SC.id];SC.rename=false;v=v.trim();if(v&&v!==q.n){checkpoint("rename cue");q.n=v;refreshCue(SC.id);renderTL();changed()}renderCard()}
function recat(id,c){const q=CUES[id];if(q.c===c)return;checkpoint("change sound");q.c=c;$$(`.cue[data-id="${id}"]`).forEach(s=>s.style.setProperty("--c",`var(--${c})`));refreshCue(id);renderTL();renderCard();changed()}
const cardClick=e=>{if(scDrag){e.stopPropagation();return}const m=e.target.closest(".cmenu [data-m]");
  if(m){const v=m.dataset.v,k=m.dataset.m;closeMenu();
    if(k==="ren"){SC.rename=true}
    else if(k==="note"){SC.addNote=true;renderCard();$("[data-note]",host())?.focus();return}
    else if(k==="cat")return recat(SC.id,v);
    else if(k==="del")return removeCue(SC.id);
    renderCard();return}
  const a=e.target.closest("[data-act]");if(!a){closeMenu();return}const act=a.dataset.act;if(act!=="more")closeMenu();
  if(act==="pp"){e.stopPropagation();toggle()}
  else if(act==="film")closeScript();
  else if(act==="reveal")reveal(SC.id);
  else if(act==="note"){SC.note=!SC.note;a.setAttribute("aria-expanded",SC.note);placeCard()}
  else if(act==="tog"){const c=a.dataset.cid;if(SC.open[c]){delete SC.open[c];renderCard()}else openThread(c)}
  else if(act==="frame")showFrame(a.dataset.cid);
  else if(act==="close")closePanel();
  else if(act==="mention")mentionPick(a.dataset.v);
  else if(act==="setend"){const q=CUES[SC.id];SC.draft.t1=cl(now()-q.ft,0,q.dur);if(SC.draft.t1<SC.draft.t0)[SC.draft.t0,SC.draft.t1]=[SC.draft.t1,SC.draft.t0];renderCard(true)}
  else if(act==="clrend"){SC.draft.t1=null;renderCard(true)}
  else if(act==="clrbox"){SC.draft.box=null;renderCard(true)}
  else if(act==="send")send();
  else if(act==="rep"){SC.replyTo=a.dataset.cid;SC.draft=null;SC.pin=true;renderCard(true)}
  else if(act==="norep"){SC.replyTo=null;renderCard(true)}
  else if(act==="tick")toggleSign(CUES[SC.id]);
  else if(act==="draw")startDraw(SC.id);
  else if(act==="more"){const q=CUES[SC.id];showMenu(a,`<button data-m="ren">${ICON.pen}Rename</button>${ROLE==="director"&&!q.d?`<button data-m="note">${ICON.pen}Add director's note</button>`:""}<div class="mh">Sound</div>${LANES.map(k=>`<button data-m="cat" data-v="${k}"><i class="sw" style="--c:var(--${k})"></i>${CATS[k]}${k===q.c?`<span class="ck2">${ICON.check}</span>`:""}</button>`).join("")}<hr><button data-m="del" class="danger">${ICON.x}Remove cue<kbd>Del</kbd></button>`)}};
/* @mentions in whichever box you're typing in: typing @ lists the team; arrows pick, Enter or Tab inserts */
function mentionScan(t){const c=t.closest(".compose");$$(".mpop",host()).forEach(x=>x.remove());const m=t.value.slice(0,t.selectionStart).match(/(^|\s)@(\w*)$/);
  const ks=m?Object.keys(PEOPLE).filter(k=>k!==ME()&&first(k).toLowerCase().startsWith(m[2].toLowerCase())):[];if(!ks.length){MP=null;return}
  MP={ks,ta:t,i:MP?Math.min(MP.i,ks.length-1):0,at:t.selectionStart-m[2].length-1};c.insertAdjacentHTML("beforeend",`<div class="mpop" role="listbox">${ks.map((k,i)=>`<button data-act="mention" data-v="${k}" role="option" aria-selected="${i===MP.i}">${avHTML(k)}<span>${PEOPLE[k].n}</span></button>`).join("")}</div>`)}
function mentionPick(k){if(!MP)return;const t=MP.ta,v=t.value,end=t.selectionStart,ins="@"+first(k)+" ";
  t.value=v.slice(0,MP.at)+ins+v.slice(end);SC.text=t.value;const pos=MP.at+ins.length;MP=null;$$(".mpop",host()).forEach(x=>x.remove());t.focus();t.setSelectionRange(pos,pos)}
let noteT=0,noteOpen=false;
dock.addEventListener("animationend",e=>{if(e.target===dock)dock.classList.remove("rise")});
[scard,dock].forEach(h=>{
  h.addEventListener("click",cardClick);
  h.addEventListener("focusin",e=>{if(e.target.matches("[data-new]")&&!SC.draft)openDraft();if(e.target.matches("[data-note]"))noteOpen=false});
  h.addEventListener("input",e=>{const t=e.target;if(t.matches("[data-note]")){if(!noteOpen){checkpoint("edit note");noteOpen=true}const q=CUES[SC.id];q.d=t.value;clearTimeout(noteT);noteT=setTimeout(changed,400)}
    else if(t.closest(".cin")){SC.text=t.value;t.style.height="auto";t.style.height=Math.min(120,t.scrollHeight)+"px";mentionScan(t)}});
  h.addEventListener("pointerdown",e=>{if(e.target.closest(".mpop"))e.preventDefault()});
  h.addEventListener("focusout",e=>{if(e.target.matches(".rn")&&SC.rename)rename(e.target.value)});
  h.addEventListener("keydown",e=>{const t=e.target;
    if(t.matches(".rn")){if(e.key==="Enter"){e.preventDefault();rename(t.value)}if(e.key==="Escape"){e.stopPropagation();SC.rename=false;renderCard()}return}
    if(MP&&t.closest(".cin")){const n=MP.ks.length;
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();MP.i=(MP.i+(e.key==="ArrowDown"?1:n-1))%n;$$(".mpop button",host()).forEach((b,i)=>b.setAttribute("aria-selected",i===MP.i));return}
      if(e.key==="Enter"||e.key==="Tab"){e.preventDefault();return mentionPick(MP.ks[MP.i])}
      if(e.key==="Escape"){e.stopPropagation();MP=null;$$(".mpop",host()).forEach(x=>x.remove());return}}
    if(t.closest(".cin")&&e.key==="Enter"&&!e.shiftKey){e.preventDefault();return send()}
    if(t.matches(".th-h")&&(e.key==="Enter"||e.key===" ")){e.preventDefault();t.click();return}
    if(e.key==="Escape"&&(SC.draft||SC.replyTo)){e.stopPropagation();SC.draft=null;SC.replyTo=null;renderCard();return}
    if(e.key==="Escape"&&!EXP){e.stopPropagation();t.blur?.();closePanel()}})});
/* trim drags in the panel (capture phase, so they win over the card drag) */
const trimDown=e=>{const h=e.target.closest("[data-h]"),trk=e.target.closest("[data-trk]");if(e.button||!trk)return;e.stopPropagation();e.preventDefault();
  const r=trk.getBoundingClientRect(),q=CUES[SC.id],id=SC.id,tAt=ev=>TW[0]+cl((ev.clientX-r.left)/r.width)*(TW[1]-TW[0]),t0=tAt(e),f0=q.ft,e0=q.ft+q.dur,kind=h?.dataset.h;
  pause();if(!kind){seek(t0);trimTick();return}try{trk.setPointerCapture(e.pointerId)}catch(_){}$(".trim",host()).classList.add("dragging");let moved=false;
  const mv=ev=>{const t=tAt(ev);if(!moved){moved=true;checkpoint(kind==="mid"?"move cue":"trim cue")}
    if(kind==="in"){q.ft=cl(t,0,e0-.3);q.dur=e0-q.ft;seek(q.ft)}
    else if(kind==="out"){const end=cl(t,f0+.3,LEN);q.dur=end-q.ft;seek(end-.05)}
    else{q.ft=cl(f0+t-t0,0,LEN-q.dur);seek(q.ft)}
    liveTiming(id)};
  const up=()=>{trk.removeEventListener("pointermove",mv);trk.removeEventListener("pointerup",up);trk.removeEventListener("pointercancel",up);$(".trim",host())?.classList.remove("dragging");if(moved)trimDone(id)};
  trk.addEventListener("pointermove",mv);trk.addEventListener("pointerup",up);trk.addEventListener("pointercancel",up)};
[scard,dock].forEach(h=>h.addEventListener("pointerdown",trimDown,true));

/* shadcn Sonner-style toast */
function toast(msg,file,cat,key="set"){const t=document.createElement("div");t.className="toast";t.innerHTML=`<canvas class="g" style="width:16px;height:16px" aria-hidden="true"></canvas><div>${msg}<small>${file}</small></div>`;
  $("#toasts").appendChild(t);glyph(t.querySelector("canvas"),key,{color:`--${cat}`,base:.08});setTimeout(()=>t.remove(),3200)}

/* ---------- the script and cues: select a phrase on this reel and either make it a new cue (at the playhead, or between its neighbours when the scenes are timed)
   or attach the selected cue to it. Right-click a cue to remove it: the phrase goes back to plain text and the cue disappears everywhere ---------- */
const hl=document.createElement("div");hl.className="hl";hl.hidden=true;document.body.appendChild(hl);
let hlRange=null,hlT=0;
/* a selection is usable when it sits inside one paragraph of this reel's script and doesn't touch a cue. A selection that runs past the paragraph
   (a triple-click, say) is cut back to it; leading and trailing spaces are dropped */
function usable(sel){const r=sel.getRangeAt(0).cloneRange(),el=n=>n.nodeType===3?n.parentElement:n,p=el(r.startContainer)?.closest("p[data-b]");
  if(!p||!doc.contains(p))return null;
  if(!p.contains(r.endContainer)){const last=[...p.childNodes].pop();r.setEndAfter(last)}
  if($$(".cue",p).some(c=>r.intersectsNode(c)))return "cue";
  while(r.startContainer.nodeType===3&&/\s/.test(r.startContainer.textContent[r.startOffset]||"")&&r.toString().length)r.setStart(r.startContainer,r.startOffset+1);
  while(r.endContainer.nodeType===3&&r.endOffset>0&&/\s/.test(r.endContainer.textContent[r.endOffset-1])&&r.toString().length)r.setEnd(r.endContainer,r.endOffset-1);
  return r.toString().trim().length>=2?r:null}
function checkSel(){const sel=getSelection();hlRange=null;hl.hidden=true;if(!EXP||ANIM||!VID||!sel||sel.isCollapsed||!sel.rangeCount)return;
  const a=sel.anchorNode,p=(a?.nodeType===3?a.parentElement:a)?.closest?.(".page");if(!p||!doc.contains(p))return;
  if(!p.closest(".act[data-reel]")){toast("That scene is on another reel","Cues here can only come from this reel's scenes","score","seed");return}
  const r=usable(sel);if(r==="cue"){toast("That runs into a cue already","Select words beside it, or right-click the cue to remove it","score","seed");return}if(!r)return;
  const att=SC.id&&CUES[SC.id]&&!linked(SC.id)?SC.id:null;
  hl.innerHTML=`${LANES.map(k=>`<button data-cat="${k}" style="--c:var(--${k})" title="New ${CATS[k]} cue" aria-label="New ${CATS[k]} cue"></button>`).join("")}${att?`<button class="att" data-att="${att}" title="Attach the cue to this line">Attach “${esc(CUES[att].n.length>22?CUES[att].n.slice(0,21)+"…":CUES[att].n)}”</button>`:""}`;
  const b=r.getBoundingClientRect(),vw=document.documentElement.clientWidth;hlRange=r;hl.hidden=false;
  hl.style.left=cl(b.left+b.width/2,hl.offsetWidth/2+8,vw-hl.offsetWidth/2-8)+"px";hl.style.top=(b.top>doc.getBoundingClientRect().top+60?b.top-40:b.bottom+8)+"px"}
document.addEventListener("selectionchange",()=>{clearTimeout(hlT);hlT=setTimeout(checkSel,120)});
["wheel","touchmove"].forEach(ev=>doc.addEventListener(ev,()=>{hl.hidden=true},{passive:true}));
hl.addEventListener("pointerdown",e=>e.preventDefault());
hl.addEventListener("click",e=>{e.stopPropagation();const b=e.target.closest("button");if(!b||!hlRange)return;b.dataset.att?attachCue(hlRange,b.dataset.att):addCue(hlRange,b.dataset.cat)});
const sceneOf=row=>{for(let r=row;r;r=r.previousElementSibling){const n=r.querySelector(".scene-no");if(n)return +n.textContent}return 1};
function wrap(range,id,c){const sp=document.createElement("span");sp.className="cue";sp.tabIndex=0;sp.dataset.id=id;sp.style.setProperty("--c",`var(--${c})`);sp.appendChild(range.extractContents());range.insertNode(sp);sp.parentNode.normalize();getSelection().removeAllRanges();hl.hidden=true;hlRange=null;serial(sp.closest("p"));return sp}
function addCue(range,cat){checkpoint("add cue");
  const text=range.toString().replace(/\s+/g," ").trim(),id="u"+(++uid),row=range.startContainer.parentElement.closest(".row"),scene=sceneOf(row);
  CUES[id]={c:cat,n:text.length>34?text.slice(0,33).trimEnd()+"…":text[0].toUpperCase()+text.slice(1),dir:false,snd:false,d:"",ft:0,dur:3,scene,act:+row.closest(".act").dataset.act};
  const sp=wrap(range,id,cat),sc=timedScenes().find(s=>s.n===scene);let t,dur;
  if(sc){const live=$$("#doc .cue:not(.off)"),i=live.indexOf(sp),inSc=x=>x&&CUES[x.dataset.id]?.scene===scene&&x!==sp&&REEL[x.dataset.id];
    const pv=inSc(live[i-1])?CUES[live[i-1].dataset.id]:null,nq=inSc(live[i+1])?CUES[live[i+1].dataset.id]:null;
    const lo=pv?pv.ft:sc.s,hi=nq?nq.ft:sc.e;t=pv&&nq?(lo+hi)/2:pv?Math.min(pv.ft+pv.dur,hi-2):nq?Math.max(lo,nq.ft-4):sc.s+2;t=cl(t,sc.s,Math.max(sc.s,sc.e-1));
    dur=Math.max(1.5,Math.min(4,(nq?nq.ft:sc.e)-t))}
  else{t=cl(now(),0,Math.max(0,LEN-.5));dur=Math.min(3,LEN-t)}
  Object.assign(CUES[id],{ft:t,dur});insertCue(id,CUES[id]);pause();seek(t);setCur(ownerAt(now()),true);toCue(id);changed();
  toast(`Cue added [${span(CUES[id])}]`,"Drag its ends on the timeline if the timing is off",cat)}
function attachCue(range,id){checkpoint("attach cue");const q=CUES[id],row=range.startContainer.parentElement.closest(".row");wrap(range,id,q.c);q.scene=sceneOf(row);q.act=+row.closest(".act").dataset.act;
  setCur(cur,true);renderCard();changed();toast("Cue attached to the script",q.n,q.c)}
function removeCue(id){const q=CUES[id];if(!q)return;checkpoint("remove cue");
  $$(`#doc .cue[data-id="${id}"]`).forEach(sp=>{const par=sp.parentNode;sp.replaceWith(...sp.childNodes);par.normalize();serial(par.closest("p")||par)});
  FILM.splice(FILM.indexOf(id),1);delete REEL[id];delete CUES[id];$(`.ci[data-id="${id}"]`)?.remove();$(`.fm[data-id="${id}"]`)?.remove();delete RG[id];
  for(const k in COMMENTS)if(COMMENTS[k].clip===id)delete COMMENTS[k];
  if(SC.id===id)toCue(null);
  if(!FILM.length)renderList();counts();tally();renderTL();setCur(ownerAt(now()),true);cardFollow(true);changed();toast("Cue removed",`${q.n} · ⌘Z to undo`,q.c,"check")}
const ctx=document.createElement("div");ctx.className="ctx";ctx.hidden=true;ctx.innerHTML=`<button type="button">${ICON.x}Remove cue<kbd>Del</kbd></button>`;document.body.appendChild(ctx);
let ctxId=null;function hideCtx(){ctx.hidden=true;ctxId=null}
const ctxAt=(e,id)=>{e.preventDefault();ctxId=id;ctx.hidden=false;ctx.style.left=Math.min(e.clientX,innerWidth-ctx.offsetWidth-8)+"px";ctx.style.top=Math.min(e.clientY,innerHeight-ctx.offsetHeight-8)+"px"};
doc.addEventListener("contextmenu",e=>{const c=e.target.closest(".cue:not(.off)");if(c)ctxAt(e,c.dataset.id)});
ctx.addEventListener("click",()=>{const id=ctxId;hideCtx();if(id)removeCue(id)});
document.addEventListener("pointerdown",e=>{if(!ctx.contains(e.target))hideCtx()});
["wheel","touchmove"].forEach(ev=>doc.addEventListener(ev,hideCtx,{passive:true}));addEventListener("resize",hideCtx);

/* ---------- cue list (right-click an entry or a lane to remove it) and comments ---------- */
const list=$("#cuelist"),clScroll=$("#clScroll"),RG={};
const ciHTML=id=>{const q=CUES[id];return `<button class="ci" data-id="${id}" style="--c:var(--${q.c})"><canvas class="g" style="width:16px;height:16px" aria-hidden="true"></canvas><span class="lbl" title="${CATS[q.c]}">${esc(q.n)}</span>${cmcHTML(id)}<span class="tcs">${mmss(q.ft)}</span></button>`};
/* how many comments a cue has (in the link colour while any is still open); click it to open them */
const cmcHTML=id=>{const cs=commentsOf(id),o=!CUES[id][myK()];return cs.length?`<span class="cmc${o?" open":""}" data-cms title="${cs.length} comment${cs.length>1?"s":""}${o?` · not ${ROLE==="director"?"approved":"confirmed"} by you yet`:""}">${ICON.comment}${cs.length}</span>`:"<span></span>"};
function renderList(){clScroll.innerHTML=FILM.map(ciHTML).join("")||`<p class="cm-empty">No cues yet. They'll collect here as you mark them on the reel.</p>`;
  $$(".ci",clScroll).forEach(b=>{RG[b.dataset.id]=glyph(b.querySelector("canvas"),restKey(CUES[b.dataset.id]),{color:restColor})})}
function refreshCue(id){const old=$(`.ci[data-id="${id}"]`);if(!old)return;old.outerHTML=ciHTML(id);const b=$(`.ci[data-id="${id}"]`);RG[id]=glyph(b.querySelector("canvas"),restKey(CUES[id]),{color:`--${CUES[id].c}`,base:.14});
  counts();applyFilter();setCur(id===cur?id:cur,true)}
let overList=false,settleRaf=0;clScroll.addEventListener("pointerenter",()=>overList=true);clScroll.addEventListener("pointerleave",()=>overList=false);
function settleList(){if(overList)return;cancelAnimationFrame(settleRaf);settleRaf=requestAnimationFrame(()=>{const a=$(".ci.in",clScroll);if(!a||!a.offsetParent)return;
  clScroll.scrollTo({top:cl(a.offsetTop+a.offsetHeight/2-clScroll.clientHeight/2,0,clScroll.scrollHeight-clScroll.clientHeight),behavior:reduce?"auto":"smooth"})})}
clScroll.addEventListener("click",e=>{const b=e.target.closest(".ci");if(!b)return;seek(CUES[b.dataset.id].ft);toCue(b.dataset.id)});
[clScroll,ftl].forEach(r=>r.addEventListener("contextmenu",e=>{const c=e.target.closest(".ci,.fm");if(c)ctxAt(e,c.dataset.id)}));
/* comments live on their cues: keep each row's count current */
function renderComments(){$$(".ci",clScroll).forEach(b=>{const c=$(".cmc,.lbl+span",b);if(c)c.outerHTML=cmcHTML(b.dataset.id)})}
function counts(){$("#allN").textContent=FILM.length;renderComments();renderBar()}
function tally(){const n=FILM.filter(id=>done(CUES[id])).length;garden.count=FILM.length?Math.round(n/FILM.length*9):0;$("#navTally").textContent=`${n}/${FILM.length}`;$("#navTally").title=`${n} of ${FILM.length} cues checked off by both the director and the sound designer`}

/* ---------- filter by sound: a small legend naming every kind of sound; click one to show only it, click it again for all ---------- */
let curCat="all";
function renderBar(){const n={};FILM.forEach(id=>n[CUES[id].c]=(n[CUES[id].c]||0)+1);$("#bar").classList.toggle("filtering",curCat!=="all");
  $("#bar").innerHTML=LANES.map(k=>`<button class="lg${n[k]?"":" none"}" data-cat="${k}" aria-pressed="${curCat===k}" title="${curCat===k?"Show all sounds":`Only ${CATS[k]} (${n[k]||0})`}" style="--c:var(--${k})"><i></i>${CATS[k]}</button>`).join("")}
function applyFilter(){const on=curCat!=="all",hit=id=>!on||CUES[id]?.c===curCat;
  doc.classList.toggle("filtering",on);list.classList.toggle("filtering",on);
  $$(".cue:not(.off)",doc).forEach(el=>el.classList.toggle("match",hit(el.dataset.id)&&on));$$(".ci").forEach(el=>el.classList.toggle("match",hit(el.dataset.id)));
  $$(".fm",ftl).forEach(el=>el.classList.toggle("faded",!hit(el.dataset.id)));$$(".lnl",ftl).forEach((l,i)=>l.classList.toggle("on",on&&LANES[i]===curCat))}
$("#bar").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;curCat=curCat===b.dataset.cat?"all":b.dataset.cat;renderBar();applyFilter()});

/* ---------- hover: a cue lights up wherever it appears; on the lanes its interval shows on the axis ---------- */
let tip=null;
const showTip=(el,text)=>{tip?.remove();const r=el.getBoundingClientRect();tip=document.createElement("div");tip.className="tip";tip.textContent=text;tip.style.left=r.left+Math.min(r.width/2,40)+"px";tip.style.top=r.top-4+"px";document.body.appendChild(tip)};
function link(id,on){const q=CUES[id];if(!q)return;$$(`[data-id="${id}"]`).forEach(el=>el.classList.toggle("hot",on));
  if(id!==cur&&RG[id])setG(RG[id],on?"unfurl":restKey(q),`--${q.c}`)}
[ftl,clScroll,doc].forEach(r=>{
  r.addEventListener("pointerover",e=>{const t=e.target.closest("[data-id]");if(!t||t.contains(e.relatedTarget))return;link(t.dataset.id,true);
    if(t.classList.contains("fm")&&!drag){const q=CUES[t.dataset.id],h=$("#hrng");showTip(t,`[${span(q)}] ${q.n} · ${secs(q.dur)}${t.dataset.id===SC.id?" · drag to move, ends to trim":" · drag an end to trim"}`);rngAt(h,q);h.hidden=t.dataset.id===cur}});
  r.addEventListener("pointerout",e=>{const t=e.target.closest("[data-id]");if(t&&!t.contains(e.relatedTarget)){link(t.dataset.id,false);tip?.remove();tip=null;const h=$("#hrng");if(h)h.hidden=true}})});

/* ---------- controls and keys: space play/pause, ←/→ five seconds (⇧ one), [ ] previous/next cue, M mark (start, then end), C comment, B comment on a frame (draw a box), Delete removes the selected cue,
   ⌘Z / ⇧⌘Z undo and redo, Esc cancels a mark or leaves script view ---------- */
$("#prev").innerHTML=ICON.prev;$("#next").innerHTML=ICON.next;$("i",mkb).outerHTML=ICON.plus;$("#frm .ic").outerHTML=ICON.box;
$("#pp").addEventListener("click",toggle);screen.addEventListener("click",e=>{if(!e.target.closest(".vdrop,.anc .abox,.draw"))toggle()});
$("#prev").addEventListener("click",()=>step(-1));$("#next").addEventListener("click",()=>step(1));
document.addEventListener("keydown",e=>{const inText=e.target.closest?.("textarea,input");
  if((e.metaKey||e.ctrlKey)&&!e.altKey&&!inText){const k=e.key.toLowerCase();if(k==="z"){e.preventDefault();return e.shiftKey?redo():undo()}if(k==="y"){e.preventDefault();return redo()}}
  if(e.metaKey||e.ctrlKey||e.altKey||inText)return;
  if([" ","ArrowLeft","ArrowRight","[","]","Escape","b","B","c","C","m","M","Delete","Backspace"].includes(e.key)&&document.activeElement!==document.body)document.activeElement.blur?.();
  if(e.key===" "){e.preventDefault();toggle()}
  else if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();seek(now()+(e.key==="ArrowRight"?1:-1)*(e.shiftKey?1:5))}
  else if(e.key==="]"||e.key==="[")step(e.key==="]"?1:-1);
  else if(e.key==="m"||e.key==="M"){e.preventDefault();mark()}
  else if((e.key==="Delete"||e.key==="Backspace")&&SC.id&&CUES[SC.id]&&(SC.pin||EXP)){e.preventDefault();removeCue(SC.id)}
  else if(e.key==="Escape"&&DRAW)endDraw();
  else if(e.key==="Escape"&&MARK)cancelMark();
  else if(e.key==="Escape"&&!ctx.hidden)hideCtx();
  else if(e.key==="Escape"&&EXP)closeScript();
  else if((e.key==="c"||e.key==="C")&&SC.id){e.preventDefault();openDraft()}
  else if((e.key==="b"||e.key==="B")&&!EXP){e.preventDefault();startDraw(SC.pin?SC.id:null)}
  else if(e.key==="Escape"&&!EXP&&SC.pin)closePanel();});
document.addEventListener("pointerdown",e=>{if(!e.target.closest(".cmenu,[data-act=more]"))closeMenu();if(!nc.hidden&&!nc.contains(e.target)&&!e.target.closest("#mark"))closeNC()});

/* header: who's working, takes recorded out of approved; in the app, rename the board or start over */
function renderRole(){$("#role").innerHTML=[["director","Director"],["foley","Sound designer"]].map(([k,n])=>`<button class="tg" data-role="${k}" aria-pressed="${ROLE===k}">${n}</button>`).join("")}
$("#role").addEventListener("click",e=>{const b=e.target.closest("[data-role]");if(!b||b.dataset.role===ROLE)return;ROLE=b.dataset.role;try{localStorage.setItem("svsd-role",ROLE)}catch(e){}renderRole();renderComments();renderCard()});
if(APP){$("#ttl").addEventListener("click",()=>{const t=prompt("Name this board",TITLE);if(t!=null)setTitle(t)});
  $("#newReel").addEventListener("click",()=>{if(confirm("Start a new reel? This board (reel, script, cues, notes and comments) will be cleared from this browser."))D.onReset?.()})}
const garden=glyph($("#garden"),"garden",{count:0,base:.14});
const GLY="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>[]";
function scramble(el){
  if(reduce)return; const final=el.dataset.text||(el.dataset.text=el.textContent); if(el._raf)cancelAnimationFrame(el._raf);
  el.style.width=el.getBoundingClientRect().width+"px"; const t0=performance.now(), per=28, settle=final.length*per+160;
  (function step(now){const e=now-t0; let out="";
    for(let i=0;i<final.length;i++){const ch=final[i]; if(ch===" "||e>i*per+160){out+=ch;continue} out+=GLY[(Math.random()*GLY.length)|0]}
    el.textContent=out; if(e<settle){el._raf=requestAnimationFrame(step)}else{el.textContent=final;el.style.width="";el._raf=null}})(t0);
}
$$("[data-scr]").forEach(el=>{const host=el.closest("button")||el; host.addEventListener("pointerenter",()=>scramble(el))});
setTimeout(()=>$$("[data-scr]").forEach((el,i)=>setTimeout(()=>scramble(el),i*60)),200);

/* without a reel yet, the player is a drop zone and the transport waits */
if(!VID){document.body.classList.add("novid");$("#vdrop").hidden=false;glyph($(".vdg"),"seed",{color:"--muted-foreground",base:.12})}
renderDoc();renderList();renderRole();svLabel();counts();tally();renderTL();ppIcon();layoutFilm();setCur(ownerAt(0),true);applyFilter();renderCard();requestAnimationFrame(loop);
/* for tests and the console */
return {seek,now,play,pause,introScript,openScript,closeScript,mark,removeCue,reveal,undo,redo,setVideo,setScriptFile,get ANIM(){return ANIM},get EXP(){return EXP},get cur(){return cur},FILM,CUES,COMMENTS,SC,vid,get LEN(){return LEN}};
}
