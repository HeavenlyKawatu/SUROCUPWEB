
const ADMIN_PIN="EURO2425";

const T=[];
const F=[];
const R=["Kapten / operator","Operator","Strategi","Programmer","Mekanik","Cadangan"];
const K="rsf-demo-5";
let S,V="home",note="",ok=(()=>{try{return sessionStorage.getItem("suro-ok")==="1"}catch(e){return false}})();
function seed(){
  return {teams:T.map((x,i)=>({id:i,n:x[0],s:x[1],g:null,m:R.map((r,j)=>[F[(i*5+j*3)%12]+" "+L[(i+j*2)%8],r]),rb:[0,1,2].map(j=>({n:x[0].split(" ")[0]+" "+["Alfa","Beta","Gama"][j]}))})),matches:[],ko:null,cfg:{q:2,tz:"WITA"},aw:{c:[]}};
}
try{S=JSON.parse(localStorage.getItem(K))}catch(e){}
if(!S||!S.teams)S=seed();
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const nm=i=>esc((S.teams.find(t=>t.id===i)||{}).n);
const grp=()=>[...new Set(S.teams.map(t=>t.g).filter(Boolean))].sort();
const rn=n=>n===2?"Final":n===4?"Semifinal":n===8?"Perempat final":"Babak "+n+" besar";
const pl=m=>m.ga!=null&&m.gb!=null;
const win=m=>!pl(m)?null:m.ga>m.gb?m.a:m.ga<m.gb?m.b:m.pen==="a"?m.a:m.pen==="b"?m.b:null;
const lb=m=>m.st==="g"?"Ronde "+m.r:m.st==="3"?"Perebutan juara 3":rn(m.n);
function std(g){
  const s={};S.teams.filter(t=>t.g===g).forEach(t=>s[t.id]={t,p:0,w:0,d:0,l:0,gf:0,ga:0,mp:0});
  S.matches.filter(m=>m.st==="g"&&pl(m)).forEach(m=>{
    const A=s[m.a],B=s[m.b];if(!A||!B)return;
    A.mp++;B.mp++;A.gf+=m.ga;A.ga+=m.gb;B.gf+=m.gb;B.ga+=m.ga;
    if(m.ga>m.gb){A.w++;B.l++;A.p+=3}else if(m.ga<m.gb){B.w++;A.l++;B.p+=3}else{A.d++;B.d++;A.p++;B.p++}
  });
  return Object.values(s).sort((x,y)=>y.p-x.p||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf||x.t.n.localeCompare(y.t.n));
}
function add(o){S.matches.push({id:S.matches.reduce((n,m)=>Math.max(n,m.id),0)+1,r:0,t:"",ga:null,gb:null,...o})}
function mkSched(){
  const q=S.cfg.q,gs=grp(),by=[];
  if(S.matches.length)return "Jadwal sudah dibuat. Hapus jadwal dulu jika ingin mengubah grup.";
  if(S.teams.some(t=>!t.g))return "Semua tim harus punya grup. Atur grup tiap tim di daftar tim.";
  const mn=Math.min(...gs.map(g=>S.teams.filter(t=>t.g===g).length));
  if(!gs.length||mn<2)return "Setiap grup butuh minimal 2 tim.";
  if(q<1||q>mn)return "Jumlah lolos per grup harus 1 sampai "+mn+".";
  if(gs.length*q<2)return "Minimal 2 tim harus lolos ke babak gugur.";
  gs.forEach(g=>{
    const x=S.teams.filter(t=>t.g===g).map(t=>t.id);if(x.length%2)x.push(null);
    const k=x.length;
    for(let r=0;r<k-1;r++){
      for(let i=0;i<k/2;i++)if(x[i]!=null&&x[k-1-i]!=null)by.push({r:r+1,a:x[i],b:x[k-1-i]});
      x.splice(1,0,x.pop());
    }
  });
  by.sort((u,v)=>u.r-v.r).forEach(m=>add({st:"g",...m}));
  return "Dibuat "+S.matches.length+" pertandingan grup. Isi waktu main tiap pertandingan di bagian Input skor.";
}
function clrSched(){
  if(!S.matches.length)note="Belum ada jadwal.";
  else if(confirm("Hapus semua jadwal dan skor? Grup tiap tim tetap dipertahankan.")){S.matches=[];S.ko=null;note="Jadwal dan skor dihapus."}
  save();draw();
}
function sgrp(id,g){S.teams.find(t=>t.id===id).g=g||null;save();draw()}
function stm(id,v){S.matches.find(x=>x.id===id).t=v.trim();save()}
function parts(n){
  if(n===S.ko.P)return S.ko.order;
  const p=parts(n*2),o=[];
  for(let i=0;i<n;i++){
    const x=p[2*i],y=p[2*i+1];
    if(x==null||y==null)o.push(x??y??null);
    else{const m=S.matches.find(z=>z.st==="k"&&z.n===n*2&&z.s===i);o.push(m?win(m):null)}
  }
  return o;
}
function gen(){
  if(!S.matches.length)return "Undi grup dulu.";
  if(S.matches.some(m=>m.st==="g"&&!pl(m)))return "Isi dulu semua skor babak grup.";
  if(!S.ko){
    const seeds=[];
    for(let p=0;p<S.cfg.q;p++)grp().forEach(g=>{const r=std(g)[p];if(r)seeds.push(r.t.id)});
    const N=seeds.length;let P=2,o=[1];
    while(P<N)P*=2;
    while(o.length<P){const l=o.length*2+1;o=o.flatMap(v=>[v,l-v])}
    S.ko={P,order:o.map(v=>v<=N?seeds[v-1]:null)};
  }
  for(let n=S.ko.P;n>=2;n/=2){
    if(S.matches.some(m=>m.st==="k"&&m.n===n))continue;
    if(n<S.ko.P&&S.matches.some(m=>m.st==="k"&&m.n===n*2&&win(m)==null))return "Isi hasil "+rn(n*2).toLowerCase()+". Jika seri, pilih pemenang adu penalti.";
    const p=parts(n);
    for(let i=0;i<n/2;i++)if(p[2*i]!=null&&p[2*i+1]!=null)add({st:"k",n,s:i,a:p[2*i],b:p[2*i+1]});
    if(n===2){
      const sf=S.matches.filter(m=>m.st==="k"&&m.n===4),l=m=>win(m)===m.a?m.b:m.a;
      if(sf.length===2)add({st:"3",a:l(sf[0]),b:l(sf[1])});
    }
    return rn(n)+" dibuat.";
  }
  return "Semua babak sudah dibuat.";
}
function addTeam(){
  const v=id=>document.getElementById(id).value.trim(),n=v("tn");
  if(!n){note="Isi nama tim dulu.";return draw()}
  S.teams.push({id:S.teams.reduce((x,t)=>Math.max(x,t.id),-1)+1,n,s:v("ts"),g:null,m:R.map((r,j)=>[v("m"+j)||"Anggota "+(j+1),v("r"+j)]),rb:[0,1,2].map(j=>({n:v("rn"+j)||n+" "+(j+1)}))});
  note=S.matches.length?"Tim ditambahkan. Tim ini baru ikut jadwal setelah undian ulang.":"Tim ditambahkan.";
  save();draw();
}
function delTeam(id){
  if(S.matches.length)note="Tim tidak bisa dihapus setelah jadwal dibuat.";
  else{S.teams=S.teams.filter(t=>t.id!==id);save();note=""}
  draw();
}
function mc(m){
  const p=pl(m),w=win(m);
  return `<div class="mc" role="group" aria-label="Laga ${S.matches.indexOf(m)+1}: ${nm(m.a)} lawan ${nm(m.b)}${p?", skor "+m.ga+"-"+m.gb:""}"><small>Laga ${S.matches.indexOf(m)+1}, ${ft(m)}</small><div class="mr"><span class="ta">${nm(m.a)}</span><b class="sc2">${p?m.ga+" : "+m.gb:"vs"}</b><span>${nm(m.b)}</span></div>${p&&m.ga===m.gb&&w!=null?`<small>Adu penalti: ${nm(w)} menang</small>`:""}</div>`;
}
const VW={
  home(){
    const f=S.matches.find(m=>m.st==="k"&&m.n===2),c=f&&win(f)!=null?win(f):null,l=[...S.matches].reverse().find(pl),n=S.matches.filter(pl).length;
    return `<section class="board">${c!=null?`<h1 class="champ">Juara SURO Cup: ${nm(c)}</h1>`:""}<h2>${l?(lb(l)==="Final"?"Final":"Match Score"):"Match Score"}</h2>${l?`<div class="wood"><div class="side"><span class="big">${l.ga}</span><span class="plate">${nm(l.a)}</span></div><div class="side"><span class="big">${l.gb}</span><span class="plate">${nm(l.b)}</span></div></div><p><small>${lb(l)}</small></p>`:`<p>Belum ada pertandingan yang selesai.</p>`}</section>
<h2>Penghargaan individu</h2>${awc()}`;
  },
  st(){
    if(!grp().length)return ``;
    return `<div class="gt">`+grp().map(g=>`<div><h2>Grup ${g}</h2><div class="sx" tabindex="0" role="region" aria-label="Klasemen Grup ${g}"><table class="stt"><caption class="sr">Klasemen Grup ${g}</caption><thead><tr><th scope="col"><abbr title="Posisi">Pos</abbr><th scope="col">Tim<th scope="col"><abbr title="Main">MP</abbr><th scope="col"><abbr title="Menang">W</abbr><th scope="col"><abbr title="Seri">D</abbr><th scope="col"><abbr title="Kalah">L</abbr><th scope="col"><abbr title="Gol memasukkan">GF</abbr><th scope="col"><abbr title="Gol kemasukan">GA</abbr><th scope="col"><abbr title="Selisih gol">GD</abbr><th scope="col"><abbr title="Poin">Pts</abbr><tbody>${std(g).map((r,i)=>`<tr class="${i<S.cfg.q?"q":""}"><td>${i+1}${i<S.cfg.q?`<span aria-hidden="true"> ✓</span><span class="sr"> lolos ke babak gugur</span>`:""}<td>${esc(r.t.n)}<td>${r.mp}<td>${r.w}<td>${r.d}<td>${r.l}<td>${r.gf}<td>${r.ga}<td>${r.gf-r.ga}<td><b>${r.p}</b>`).join("")}</table></div></div>`).join("")+`</div><p><small>MP main, W menang, D seri, L kalah, GF gol memasukkan, GA gol kemasukan, GD selisih gol, Pts poin. Menang bernilai 3 poin, seri 1 poin, kalah 0 poin. Urutan klasemen: poin, selisih gol, lalu gol memasukkan. Jika masih sama, panitia menentukan sesuai peraturan lomba. ${S.cfg.q} tim teratas tiap grup (tanda ✓ dan garis oranye) lolos ke babak gugur.</small></p>`;
  },
  jd(){
    if(!S.matches.length)return ``;
    const o=[],mp={};
    S.matches.forEach(m=>{const k=lb(m);if(!mp[k])o.push(mp[k]=[k,[]]);mp[k][1].push(m)});
    return o.map(([k,a])=>`<h2>${k}</h2><div class="g2">${a.map(mc).join("")}</div>`).join("");
  },
  br(){
    if(!S.ko)return `<p>Bagan gugur muncul setelah babak grup selesai. ${S.cfg.q} tim teratas tiap grup akan lolos.</p>`;
    const c=[];
    for(let n=S.ko.P;n>=2;n/=2)c.push(`<div><h2>${rn(n)}</h2>${S.matches.filter(m=>m.st==="k"&&m.n===n).map(mc).join("")||`<div class="mc"><small>Menunggu hasil babak sebelumnya</small></div>`}</div>`);
    const t=S.matches.filter(m=>m.st==="3");
    return `<div class="g2">${c.join("")}</div>${t.length?`<h2>Perebutan juara 3</h2>${t.map(mc).join("")}`:""}`;
  },
  rb(){
    const a=rbs().sort((x,y)=>y.g-x.g||y.mv-x.mv||x.n.localeCompare(y.n));
    if(!a.length)return `<p>Belum ada robot terdaftar.</p>`;
    return `<div class="sx" tabindex="0" role="region" aria-label="Statistik robot"><table class="stt rt"><caption class="sr">Statistik robot</caption><thead><tr><th scope="col">#<th scope="col">Robot<th scope="col">Tim<th scope="col"><abbr title="Main">MP</abbr><th scope="col"><abbr title="Gol">G</abbr><th scope="col"><abbr title="Terbaik laga (Player of the Match)">POTM</abbr><tbody>${a.map((x,i)=>`<tr><td>${i+1}<td>${esc(x.n)}<td>${esc(x.t)}<td>${x.mp}<td><b>${x.g}</b><td>${x.mv}`).join("")}</table></div>`;
  },
  pt(){
    return `<div class="g2">`+S.teams.map(t=>`<details class="mc"><summary><b>${esc(t.n)}</b> <small>${esc(t.s)}${t.g?", Grup "+t.g:""}</small></summary><p><small>Anggota</small></p><table class="mt">${t.m.map(m=>`<tr><td>${esc(m[0])}<td>${esc(m[1])}`).join("")}</table><p><small>Robot</small></p><table class="mt">${(t.rb||[]).map(r=>`<tr><td>${esc(r.n)}`).join("")}</table></details>`).join("")+"</div>";
  },
  ad(){
    if(!ok)return `<p><input id="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" aria-label="PIN admin" onkeydown="if(event.key==='Enter')login()"> <button class="b" onclick="login()">Masuk</button></p><p role="status">${note}</p>`;
    const c=S.cfg,inp=(k,l,t)=>`<label>${l}<br><input type="${t||"number"}" min="1" value="${esc(c[k])}" onchange="S.cfg.${k}=${t?"this.value":"Math.max(1,+this.value||1)"};save()"></label> `;
    return `<p><button class="b b2" onclick="logout()">Keluar</button></p><p role="status">${note}</p><h2>Tim (${S.teams.length})</h2><p></p>${S.teams.map(t=>`<div class="ar"><span>${esc(t.n)} <small>${esc(t.s)}</small></span><span><select aria-label="Grup ${esc(t.n)}"${S.matches.length?" disabled":""} onchange="sgrp(${t.id},this.value)"><option value="">Belum ada grup</option>${"ABCDEFGH".split("").map(g=>`<option value="${g}"${t.g===g?" selected":""}>Grup ${g}</option>`).join("")}</select> <button class="b b2" onclick="delTeam(${t.id})">Hapus</button></span></div>`).join("")||"<p>Belum ada tim.</p>"}
<h2>Tambah tim</h2><div class="mc"><p><input id="tn" placeholder="Nama tim" aria-label="Nama tim"> <input id="ts" placeholder="Sekolah / instansi" aria-label="Sekolah atau instansi"></p>${R.map((r,j)=>`<p><input id="m${j}" placeholder="Anggota ${j+1}" aria-label="Nama anggota ${j+1}"> <select id="r${j}" aria-label="Peran anggota ${j+1}">${R.map(x=>`<option${x===r?" selected":""}>${x}</option>`).join("")}</select></p>`).join("")}${[0,1,2].map(j=>`<p><input id="rn${j}" placeholder="Nama robot ${j+1}" aria-label="Nama robot ${j+1}"></p>`).join("")}<button class="b" onclick="addTeam()">Tambah tim</button></div>
<h2>Jadwal grup</h2><p>${inp("q","Lolos per grup")}${inp("tz","Zona waktu","text")}</p><button class="b" onclick="note=mkSched();save();draw()">Buat pertandingan grup</button> <button class="b b2" onclick="clrSched()">Hapus jadwal &amp; skor</button>
<h2>Input skor</h2>${S.matches.map(m=>`<div class="ar"><span>${lb(m)}: ${nm(m.a)} vs ${nm(m.b)}</span><span><input class="tt" type="datetime-local" aria-label="Waktu main ${nm(m.a)} lawan ${nm(m.b)}" value="${esc(m.t)}" onchange="stm(${m.id},this.value)"> <input type="number" min="0" aria-label="Gol ${nm(m.a)}" value="${m.ga??""}" onchange="sm(${m.id},'ga',this.value)"> : <input type="number" min="0" aria-label="Gol ${nm(m.b)}" value="${m.gb??""}" onchange="sm(${m.id},'gb',this.value)">${m.st!=="g"?` <select aria-label="Pemenang adu penalti" onchange="sm(${m.id},'pen',this.value)"><option value="">Tanpa penalti</option><option value="a"${m.pen==="a"?" selected":""}>${nm(m.a)} menang</option><option value="b"${m.pen==="b"?" selected":""}>${nm(m.b)} menang</option></select>`:""}</span>${gd(m)}</div>`).join("")}
<h2>Babak berikutnya</h2><button class="b" onclick="note=gen();save();draw()">Buat babak berikutnya</button>
<h2>Penghargaan tambahan</h2><p>Pencetak gol dan Robot terbaik / MVP di Beranda dihitung otomatis dari data laga. Tambahkan penghargaan lain di sini, misalnya dari penilaian juri.</p>${(S.aw.c||[]).map((w,i)=>`<div class="ar"><span>${esc(w.t)}: ${esc((rbs().find(x=>x.id===w.r)||{}).n)}</span><button class="b b2" onclick="delAw(${i})">Hapus</button></div>`).join("")}<p><input id="at" placeholder="Nama penghargaan" aria-label="Nama penghargaan"> <select id="ar" aria-label="Robot pemenang">${rbs().map(x=>`<option value="${x.id}">${esc(x.n)} (${esc(x.t)})</option>`).join("")}</select> <button class="b" onclick="addAw()">Tambah</button></p>
<h2>Data</h2><button class="b b2" onclick="if(confirm('Hapus semua tim, jadwal, dan skor?')){S.teams=[];S.matches=[];S.ko=null;S.aw={c:[]};note='';save();draw()}">Kosongkan semua data</button>`;
  }
};
const TABS=[["home","Beranda","index",""],["st","Klasemen","klasemen",""],["jd","Jadwal &amp; hasil","jadwal",""],["br","Bagan gugur","bagan",""],["pt","Peserta","peserta",""],["rb","Robot","robot","",],["ad","Admin","admin","⚙️"]];
const MP=!!document.body.dataset.page,TT=Object.fromEntries(TABS.map(t=>[t[0],t[1]]));
const href=t=>MP?t[2]+".html":"#"+t[2];
function cur(){const h=MP?document.body.dataset.page:location.hash.slice(1);return (TABS.find(t=>t[2]===h)||TABS[0])[0]}
function setMenu(o){
  const n=document.getElementById("nav"),b=document.getElementById("bg");
  n.classList.toggle("open",o);b.setAttribute("aria-expanded",String(o));b.setAttribute("aria-label",o?"Tutup menu":"Buka menu");
}
function draw(){
  V=cur();document.body.dataset.p=V;
  document.title=(V==="home"?"":TT[V].replace("&amp;","&")+" | ")+"SURO Cup";
  document.getElementById("mn").innerHTML=TABS.filter(t => t[0] !== "ad").map(t=>`<a href="${href(t)}"${t[0]===V?' aria-current="page"':""}><span class="ic" aria-hidden="true">${t[3]}</span>${t[1]}</a>`).join("");
  setMenu(false);
  document.getElementById("app").innerHTML=`<div class="w">${V==="home"?`<h1 class="sr">Sulut United Robo Soccer Cup</h1>`:`<h1 class="pt">${TT[V]}</h1>`}${VW[V]()}</div>`;
}
function ft(m){
  if(!m.t)return "Waktu belum ditentukan";
  const d=new Date(m.t);if(isNaN(d))return esc(m.t);
  const p=n=>String(n).padStart(2,"0");
  return `<time datetime="${esc(m.t)}">${d.toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short"})}, ${p(d.getHours())}:${p(d.getMinutes())}</time> ${esc(S.cfg.tz||"")}`;
}
function logout(){ok=false;try{sessionStorage.removeItem("suro-ok")}catch(e){}draw()}
function login(){if(document.getElementById("pin").value===ADMIN_PIN){ok=true;note="";try{sessionStorage.setItem("suro-ok","1")}catch(e){}}else note="PIN salah. Coba lagi.";draw()}
function sm(id,k,v){const m=S.matches.find(x=>x.id===id);m[k]=v===""?null:k==="pen"||k==="mv"?v:Math.max(0,parseInt(v,10)||0);save()}
function sg(id,r,v){const m=S.matches.find(x=>x.id===id);(m.gs=m.gs||{})[r]=Math.max(0,parseInt(v,10)||0);save()}
function addAw(){
  const t=document.getElementById("at").value.trim(),r=document.getElementById("ar").value;
  if(t&&r){(S.aw.c=S.aw.c||[]).push({t,r});save();note=""}else note="Isi nama penghargaan dan pilih robot.";
  draw();
}
function delAw(i){S.aw.c.splice(i,1);save();draw()}
function rbOf(tid){return (S.teams.find(t=>t.id===tid).rb||[]).map((r,j)=>({...r,id:tid+":"+j}))}
function gd(m){
  return `<details><summary><small>Gol per robot &amp; robot terbaik laga</small></summary>${[m.a,m.b].map(t=>`<p>${nm(t)}: ${rbOf(t).map(x=>`<label>${esc(x.n)} <input type="number" min="0" value="${(m.gs||{})[x.id]??""}" onchange="sg(${m.id},'${x.id}',this.value)"></label>`).join(" ")}</p>`).join("")}<label>Robot terbaik laga <select onchange="sm(${m.id},'mv',this.value)"><option value="">Belum dipilih</option>${[m.a,m.b].flatMap(rbOf).map(x=>`<option value="${x.id}"${m.mv===x.id?" selected":""}>${esc(x.n)}</option>`).join("")}</select></label></details>`;
}
function rbs(){
  const o={};
  S.teams.forEach(t=>(t.rb||[]).forEach((r,j)=>o[t.id+":"+j]={id:t.id+":"+j,n:r.n,t:t.n,tid:t.id,g:0,mv:0,mp:0}));
  S.matches.filter(pl).forEach(m=>{
    [m.a,m.b].forEach(tid=>Object.values(o).filter(x=>x.tid===tid).forEach(x=>{x.mp++;x.g+=+((m.gs||{})[x.id])||0}));
    if(m.mv&&o[m.mv])o[m.mv].mv++;
  });
  return Object.values(o);
}
function awc(){
  const a=rbs(),b=(x,f)=>[...x].sort(f)[0],tg=b(a,(x,y)=>y.g-x.g||x.mp-y.mp),mv=b(a,(x,y)=>y.mv-x.mv||y.g-x.g);
  const c=(t,r,v,u)=>`<div class="mc"><small>${t}</small><br>${r&&v>0?`<b>${esc(r.n)}</b> <small>${esc(r.t)}, ${v} ${u}</small>`:"<b>Belum ada data</b>"}</div>`;
  const cu=(S.aw.c||[]).map(w=>{const r=a.find(x=>x.id===w.r);return `<div class="mc"><small>${esc(w.t)}</small><br><b>${r?esc(r.n):"-"}</b> <small>${r?esc(r.t):""}</small></div>`}).join("");
  return `<div class="g2">${c("Pencetak gol terbanyak",tg,tg&&tg.g,"gol")}${c("Robot terbaik / MVP",mv,mv&&mv.mv,"kali terbaik laga")}${cu}</div>`;
}
const nvEl=document.getElementById("nav");
document.getElementById("bg").onclick=()=>setMenu(!nvEl.classList.contains("open"));
document.onclick=e=>{if(!nvEl.contains(e.target))setMenu(false)};
document.onkeydown=e=>{if(e.key==="Escape")setMenu(false)};
if(!MP)addEventListener("hashchange",()=>{note="";draw();scrollTo(0,0);document.getElementById("app").focus({preventScroll:true})});
draw();
