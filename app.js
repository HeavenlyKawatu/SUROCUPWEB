/* SURO Cup - papan turnamen robot sepak bola.
   Data disimpan di database (Neon Postgres lewat /api/data) dan di-cache di localStorage.
   PIN admin diperiksa di server (env ADMIN_PIN), tidak ada lagi di kode ini. */

const API="/api/data";
let PIN=(()=>{try{return sessionStorage.getItem("suro-pin")||""}catch(e){return ""}})();
let pushT=null,synced=false,remoteEmpty=false,ver=null;

const R=["Kapten / operator","Operator","Elektronika","Programmer","Mekanik","Cadangan"];
const K="suro-cup-v1",OLD_K="rsf-demo-5";
let S,V="home",note="",ok=(()=>{try{return sessionStorage.getItem("suro-ok")==="1"&&!!sessionStorage.getItem("suro-pin")}catch(e){return false}})();

const blank=()=>({teams:[],matches:[],ko:null,cfg:{q:2,tz:"WITA"},aw:{c:[]}});
function norm(d){
  if(!d||typeof d!=="object"||!Array.isArray(d.teams))return blank();
  d.matches=Array.isArray(d.matches)?d.matches:[];
  d.ko=d.ko&&typeof d.ko==="object"&&Array.isArray(d.ko.order)?d.ko:null;
  d.cfg={...blank().cfg,...(d.cfg||{})};
  d.aw={c:Array.isArray(d.aw&&d.aw.c)?d.aw.c:[]};
  d.teams.forEach(t=>{t.m=Array.isArray(t.m)?t.m:[];t.rb=Array.isArray(t.rb)?t.rb:[]});
  return d;
}
function load(){
  for(const k of [K,OLD_K]){
    try{const d=JSON.parse(localStorage.getItem(k));if(d&&Array.isArray(d.teams))return norm(d)}catch(e){}
  }
  return blank();
}
S=load();
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){flash("Gagal menyimpan: penyimpanan browser penuh atau diblokir.")}push()};
function push(){if(!ok||!synced)return;clearTimeout(pushT);pushT=setTimeout(doPush,400)}
async function doPush(){
  try{
    const r=await fetch(API,{method:"PUT",headers:{"content-type":"application/json","x-admin-pin":PIN},body:JSON.stringify(S)});
    if(r.status===401)return flash("PIN ditolak server. Keluar lalu masuk lagi.");
    if(!r.ok)throw 0;
    ver=(await r.json()).updatedAt;remoteEmpty=false;flash("Tersimpan ke server.");
  }catch(e){flash("Gagal menyimpan ke server. Data masih ada di browser ini, coba ubah/simpan lagi.")}
}
// Ambil data dari server. Penonton: otomatis ikut berubah. Admin yang sedang login tidak ditimpa.
async function sync(first){
  if(!first&&V==="ad"&&ok)return;
  try{
    const r=await fetch(first?API+"?t="+Date.now():API,{cache:"no-store"});
    if(!r.ok)throw 0;
    const j=await r.json();
    synced=true;
    if(!j.data){remoteEmpty=true;return}
    remoteEmpty=false;
    if(j.updatedAt===ver)return;
    ver=j.updatedAt;S=norm(j.data);
    try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}
    draw();
  }catch(e){if(first)flash("Tidak bisa terhubung ke server. Menampilkan data tersimpan di browser ini.")}
}
function flash(msg){note=msg;const e=document.querySelector('[role="status"]');if(e)e.textContent=msg}

const esc=s=>s==null?"":String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nm=i=>esc((S.teams.find(t=>t.id===i)||{}).n);
const grp=()=>[...new Set(S.teams.map(t=>t.g).filter(Boolean))].sort();
const rn=n=>n===2?"Final":n===4?"Semifinal":n===8?"Perempat final":"Babak "+n+" besar";
const pl=m=>m.ga!=null&&m.gb!=null;
const win=m=>!pl(m)?null:m.ga>m.gb?m.a:m.ga<m.gb?m.b:m.pen==="a"?m.a:m.pen==="b"?m.b:null;
const lb=m=>m.st==="g"?"Ronde "+m.r:m.st==="3"?"Perebutan juara 3":rn(m.n);
// Urutan tahap: grup, lalu babak gugur makin dalam, perebutan juara 3 tepat sebelum final.
const rk=m=>m.st==="g"?0:m.st==="3"?8.5:10-Math.log2(m.n);
function lastPlayed(){
  const a=S.matches.map((m,i)=>[m,i]).filter(x=>pl(x[0]));
  a.sort((x,y)=>rk(x[0])-rk(y[0])||(x[0].t||"").localeCompare(y[0].t||"")||x[1]-y[1]);
  return a.length?a[a.length-1][0]:null;
}
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
function resetKo(){
  if(!S.ko&&!S.matches.some(m=>m.st!=="g"))note="Belum ada bagan gugur.";
  else if(confirm("Hapus bagan gugur beserta skornya? Skor babak grup tetap ada.")){
    S.matches=S.matches.filter(m=>m.st==="g");S.ko=null;
    note="Bagan gugur dihapus. Klik \"Buat babak berikutnya\" untuk membuatnya ulang dari klasemen grup.";
  }
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
// Susun bagan dari klasemen grup. Juara grup jadi unggulan teratas, lalu runner-up, dst.
// Tim dari grup yang sama dihindari bertemu di putaran pertama dengan menukar tim di tingkat unggulan yang sama.
function mkKo(){
  const sd=[];
  for(let p=0;p<S.cfg.q;p++)grp().forEach(g=>{const r=std(g)[p];if(r)sd.push({id:r.t.id,g,p})});
  const N=sd.length;let P=2,o=[1];
  while(P<N)P*=2;
  while(o.length<P){const l=o.length*2+1;o=o.flatMap(v=>[v,l-v])}
  const sl=o.map(v=>v<=N?sd[v-1]:null);
  const bad=()=>{let c=0;for(let i=0;i<P;i+=2)if(sl[i]&&sl[i+1]&&sl[i].g===sl[i+1].g)c++;return c};
  for(let pass=0;pass<20&&bad();pass++){
    let imp=false;
    for(let i=0;i<P;i++)for(let j=i+1;j<P;j++){
      if(!sl[i]||!sl[j]||sl[i].p!==sl[j].p)continue;
      const b=bad();
      [sl[i],sl[j]]=[sl[j],sl[i]];
      if(bad()<b)imp=true;else [sl[i],sl[j]]=[sl[j],sl[i]];
    }
    if(!imp)break;
  }
  return {P,order:sl.map(x=>x&&x.id)};
}
function gen(){
  if(!S.matches.length)return "Undi grup dulu.";
  if(S.matches.some(m=>m.st==="g"&&!pl(m)))return "Isi dulu semua skor babak grup.";
  if(!S.ko)S.ko=mkKo();
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
  if(!n)return flash("Isi nama tim dulu.");
  if(S.teams.some(t=>String(t.n).toLowerCase()===n.toLowerCase()))return flash("Nama tim sudah dipakai.");
  S.teams.push({id:S.teams.reduce((x,t)=>Math.max(x,t.id),-1)+1,n,s:v("ts"),g:null,m:R.map((r,j)=>[v("m"+j)||"Anggota "+(j+1),v("r"+j)]),rb:[0,1,2].map(j=>({n:v("rn"+j)||n+" "+(j+1)}))});
  note=S.matches.length?"Tim ditambahkan. Tim ini baru ikut jadwal setelah undian ulang.":"Tim ditambahkan.";
  save();draw();
}
function delTeam(id){
  if(S.matches.length)note="Tim tidak bisa dihapus setelah jadwal dibuat.";
  else{S.teams=S.teams.filter(t=>t.id!==id);S.aw.c=S.aw.c.filter(w=>!String(w.r).startsWith(id+":"));save();note=""}
  draw();
}
function mc(m){
  const p=pl(m),w=win(m),i=S.matches.indexOf(m)+1;
  return `<div class="mc" role="group" aria-label="Laga ${i}: ${nm(m.a)} lawan ${nm(m.b)}${p?", skor "+m.ga+"-"+m.gb:""}"><small>Laga ${i}, ${ft(m)}</small><div class="mr"><span class="ta">${nm(m.a)}</span><b class="sc2">${p?m.ga+" : "+m.gb:"vs"}</b><span>${nm(m.b)}</span></div>${p&&m.ga===m.gb&&w!=null?`<small>Adu penalti: ${nm(w)} menang</small>`:""}</div>`;
}
const VW={
  home(){
    const f=S.matches.find(m=>m.st==="k"&&m.n===2),c=f&&win(f)!=null?win(f):null,l=lastPlayed();
    return `<section class="board">${c!=null?`<h1 class="champ">Juara SURO Cup: ${nm(c)}</h1>`:""}<h2>${l&&lb(l)==="Final"?"Final":"Match Score"}</h2>${l?`<div class="wood"><div class="side"><span class="big">${l.ga}</span><span class="plate">${nm(l.a)}</span></div><div class="side"><span class="big">${l.gb}</span><span class="plate">${nm(l.b)}</span></div></div><p><small>${lb(l)}</small></p>`:`<p>Belum ada pertandingan yang selesai.</p>`}</section>
<h2>Penghargaan individu</h2>${awc()}`;
  },
  st(){
    if(!grp().length)return `<p>Klasemen muncul setelah tim dibagi ke dalam grup.</p>`;
    return `<div class="gt">`+grp().map(g=>`<div><h2>Grup ${g}</h2><div class="sx" tabindex="0" role="region" aria-label="Klasemen Grup ${g}"><table class="stt"><caption class="sr">Klasemen Grup ${g}</caption><thead><tr><th scope="col"><abbr title="Posisi">Pos</abbr><th scope="col">Tim<th scope="col"><abbr title="Main">MP</abbr><th scope="col"><abbr title="Menang">W</abbr><th scope="col"><abbr title="Seri">D</abbr><th scope="col"><abbr title="Kalah">L</abbr><th scope="col"><abbr title="Gol memasukkan">GF</abbr><th scope="col"><abbr title="Gol kemasukan">GA</abbr><th scope="col"><abbr title="Selisih gol">GD</abbr><th scope="col"><abbr title="Poin">Pts</abbr><tbody>${std(g).map((r,i)=>`<tr class="${i<S.cfg.q?"q":""}"><td>${i+1}${i<S.cfg.q?`<span aria-hidden="true"> </span><span class="sr"> lolos ke babak gugur</span>`:""}<td>${esc(r.t.n)}<td>${r.mp}<td>${r.w}<td>${r.d}<td>${r.l}<td>${r.gf}<td>${r.ga}<td>${r.gf-r.ga}<td><b>${r.p}</b>`).join("")}</table></div></div>`).join("")+`</div>`;
  },
  jd(){
    if(!S.matches.length)return `<p>Jadwal belum dibuat.</p>`;
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
    return `<div class="sx" tabindex="0" role="region" aria-label="Statistik robot"><table class="stt rt"><caption class="sr">Statistik robot</caption><thead><tr><th scope="col">#<th scope="col">Robot<th scope="col">Tim<th scope="col"><abbr title="Main (laga yang dimainkan timnya)">MP</abbr><th scope="col"><abbr title="Gol">G</abbr><th scope="col"><abbr title="Terbaik laga (Player of the Match)">POTM</abbr><tbody>${a.map((x,i)=>`<tr><td>${i+1}<td>${esc(x.n)}<td>${esc(x.t)}<td>${x.mp}<td><b>${x.g}</b><td>${x.mv}`).join("")}</table></div>`;
  },
  pt(){
    if(!S.teams.length)return `<p>Belum ada tim terdaftar.</p>`;
    return `<div class="g2">`+S.teams.map(t=>`<details class="mc"><summary><b>${esc(t.n)}</b> <small>${esc(t.s)}${t.g?", Grup "+t.g:""}</small></summary><p><small>Anggota</small></p><table class="mt">${t.m.map(m=>`<tr><td>${esc(m[0])}<td>${esc(m[1])}`).join("")}</table><p><small>Robot</small></p><table class="mt">${(t.rb||[]).map(r=>`<tr><td>${esc(r.n)}`).join("")}</table></details>`).join("")+"</div>";
  },
  ad(){
    if(!ok)return `<p><input id="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" aria-label="PIN admin" onkeydown="if(event.key==='Enter')login()"> <button class="b" onclick="login()">Masuk</button></p><p role="status">${esc(note)}</p>`;
    const c=S.cfg,inp=(k,l,t)=>`<label>${l}<br><input type="${t||"number"}" min="1" value="${esc(c[k])}" onchange="S.cfg.${k}=${t?"this.value":"Math.max(1,+this.value||1)"};save()"></label> `;
    return `<p><button class="b b2" onclick="logout()">Keluar</button></p><p role="status">${esc(note)}</p><h2>Tim (${S.teams.length})</h2><p></p>${S.teams.map(t=>`<div class="ar"><span>${esc(t.n)} <small>${esc(t.s)}</small></span><span><select aria-label="Grup ${esc(t.n)}"${S.matches.length?" disabled":""} onchange="sgrp(${t.id},this.value)"><option value="">Belum ada grup</option>${"ABCDEFGH".split("").map(g=>`<option value="${g}"${t.g===g?" selected":""}>Grup ${g}</option>`).join("")}</select> <button class="b b2" onclick="delTeam(${t.id})">Hapus</button></span></div>`).join("")||"<p>Belum ada tim.</p>"}
<h2>Tambah tim</h2><div class="mc"><p><input id="tn" placeholder="Nama tim" aria-label="Nama tim"> <input id="ts" placeholder="Sekolah / instansi" aria-label="Sekolah atau instansi"></p>${R.map((r,j)=>`<p><input id="m${j}" placeholder="Anggota ${j+1}" aria-label="Nama anggota ${j+1}"> <select id="r${j}" aria-label="Peran anggota ${j+1}">${R.map(x=>`<option${x===r?" selected":""}>${x}</option>`).join("")}</select></p>`).join("")}${[0,1,2].map(j=>`<p><input id="rn${j}" placeholder="Nama robot ${j+1}" aria-label="Nama robot ${j+1}"></p>`).join("")}<button class="b" onclick="addTeam()">Tambah tim</button></div>
<h2>Jadwal grup</h2><p>${inp("q","Lolos per grup")}${inp("tz","Zona waktu","text")}</p><button class="b" onclick="note=mkSched();save();draw()">Buat pertandingan grup</button> <button class="b b2" onclick="clrSched()">Hapus jadwal &amp; skor</button>
<h2>Input skor</h2>${S.matches.map(m=>`<div class="ar"><span>${lb(m)}: ${nm(m.a)} vs ${nm(m.b)}</span><span><input class="tt" type="datetime-local" aria-label="Waktu main ${nm(m.a)} lawan ${nm(m.b)}" value="${esc(m.t)}" onchange="stm(${m.id},this.value)"> <input type="number" min="0" aria-label="Gol ${nm(m.a)}" value="${m.ga??""}" onchange="sm(${m.id},'ga',this.value)"> : <input type="number" min="0" aria-label="Gol ${nm(m.b)}" value="${m.gb??""}" onchange="sm(${m.id},'gb',this.value)">${m.st!=="g"?` <select aria-label="Pemenang adu penalti" onchange="sm(${m.id},'pen',this.value)"><option value="">Tanpa penalti</option><option value="a"${m.pen==="a"?" selected":""}>${nm(m.a)} menang</option><option value="b"${m.pen==="b"?" selected":""}>${nm(m.b)} menang</option></select>`:""}</span>${gd(m)}</div>`).join("")}
<h2>Babak berikutnya</h2><button class="b" onclick="note=gen();save();draw()">Buat babak berikutnya</button> <button class="b b2" onclick="resetKo()">Reset bagan gugur</button>
<h2>Penghargaan tambahan</h2><p>Pencetak gol dan Robot terbaik / MVP di Beranda dihitung otomatis dari data laga. Tambahkan penghargaan lain di sini, misalnya dari penilaian juri.</p>${(S.aw.c||[]).map((w,i)=>`<div class="ar"><span>${esc(w.t)}: ${esc((rbs().find(x=>x.id===w.r)||{}).n)}</span><button class="b b2" onclick="delAw(${i})">Hapus</button></div>`).join("")}<p><input id="at" placeholder="Nama penghargaan" aria-label="Nama penghargaan"> <select id="ar" aria-label="Robot pemenang">${rbs().map(x=>`<option value="${x.id}">${esc(x.n)} (${esc(x.t)})</option>`).join("")}</select> <button class="b" onclick="addAw()">Tambah</button></p>
<h2>Data</h2><p>Data tersimpan di database server dan otomatis dilihat semua pengunjung. Ekspor tetap berguna sebagai cadangan.</p><p><button class="b" onclick="exportData()">Ekspor data (JSON)</button></p><p><label>Impor data dari file JSON<br><input type="file" accept="application/json,.json" onchange="importData(this)"></label></p><button class="b b2" onclick="clearAll()">Kosongkan semua data</button>`;
  }
};
const TABS=[["home","Beranda","index"],["st","Klasemen","klasemen"],["jd","Jadwal &amp; hasil","jadwal"],["br","Bagan gugur","bagan"],["pt","Peserta","peserta"],["rb","Robot","robot"],["ad","Admin","admin"]];
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
  document.getElementById("mn").innerHTML=TABS.filter(t=>t[0]!=="ad").map(t=>`<a href="${href(t)}"${t[0]===V?' aria-current="page"':""}>${t[1]}</a>`).join("");
  setMenu(false);
  document.getElementById("app").innerHTML=`<div class="w">${V==="home"?`<h1 class="sr">Sulut United Robo Soccer Cup</h1>`:`<h1 class="pt">${TT[V]}</h1>`}${VW[V]()}</div>`;
}
function ft(m){
  if(!m.t)return "Waktu belum ditentukan";
  const d=new Date(m.t);if(isNaN(d))return esc(m.t);
  const p=n=>String(n).padStart(2,"0");
  return `<time datetime="${esc(m.t)}">${d.toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short"})}, ${p(d.getHours())}:${p(d.getMinutes())}</time> ${esc(S.cfg.tz||"")}`;
}
function logout(){ok=false;PIN="";try{sessionStorage.removeItem("suro-ok");sessionStorage.removeItem("suro-pin")}catch(e){}draw()}
async function login(){
  const p=document.getElementById("pin").value;
  try{
    const r=await fetch(API,{method:"POST",headers:{"x-admin-pin":p}});
    if(r.ok){
      ok=true;PIN=p;note="";
      try{sessionStorage.setItem("suro-ok","1");sessionStorage.setItem("suro-pin",p)}catch(e){}
      // Server masih kosong tapi browser ini punya data lama: kirim sebagai data awal.
      if(synced&&remoteEmpty&&S.teams.length)doPush();
    }else note=r.status===401?"PIN salah. Coba lagi.":"Server tidak merespons. Coba lagi.";
  }catch(e){note="Tidak bisa terhubung ke server."}
  draw();
}
// Apakah hasil laga ini sudah dipakai untuk menyusun babak berikutnya?
function later(m){
  if(m.st==="g")return !!S.ko;
  if(m.st==="k")return S.matches.some(x=>(x.st==="k"&&x.n<m.n)||(m.n===4&&x.st==="3"));
  return false;
}
function sm(id,k,v){
  const m=S.matches.find(x=>x.id===id),w0=win(m);
  m[k]=v===""?null:k==="pen"||k==="mv"?v:Math.max(0,parseInt(v,10)||0);
  save();
  if(k==="ga"||k==="gb")upChk(m);
  if(k!=="mv"&&later(m)&&(m.st==="g"||win(m)!==w0))flash("Hasil laga ini diubah setelah babak berikutnya dibuat. Pasangan di bagan tidak ikut berubah otomatis. Klik \"Reset bagan gugur\" lalu buat ulang jika perlu.");
}
function sg(id,r,v){
  const m=S.matches.find(x=>x.id===id);
  (m.gs=m.gs||{})[r]=Math.max(0,parseInt(v,10)||0);
  save();upChk(m);
}
function addAw(){
  const t=document.getElementById("at").value.trim(),r=document.getElementById("ar").value;
  if(!t||!r)return flash("Isi nama penghargaan dan pilih robot.");
  (S.aw.c=S.aw.c||[]).push({t,r});save();note="";draw();
}
function delAw(i){S.aw.c.splice(i,1);save();draw()}
function clearAll(){
  if(confirm("Hapus semua tim, jadwal, dan skor?")){S=blank();note="Semua data dikosongkan.";save();draw()}
}
function exportData(){
  try{
    const u=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:"application/json"}));
    const a=document.createElement("a");a.href=u;a.download="suro-cup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),1000);
    flash("Data diekspor.");
  }catch(e){flash("Gagal mengekspor data.")}
}
function applyImport(txt){
  let d;try{d=JSON.parse(txt)}catch(e){return "File bukan JSON yang valid."}
  const okT=d&&Array.isArray(d.teams)&&d.teams.every(t=>t&&typeof t==="object"&&t.id!=null&&typeof t.n==="string");
  const ids=new Set(okT?d.teams.map(t=>t.id):[]);
  if(!okT||!Array.isArray(d.matches)||!d.matches.every(m=>m&&typeof m==="object"&&ids.has(m.a)&&ids.has(m.b)))return "Isi file tidak dikenali sebagai data SURO Cup.";
  if(!confirm("Ganti semua data di browser ini dengan isi file? ("+d.teams.length+" tim, "+d.matches.length+" laga)"))return "Impor dibatalkan.";
  S=norm(d);save();
  return "Data diimpor: "+S.teams.length+" tim, "+S.matches.length+" laga.";
}
function importData(inp){
  const f=inp.files&&inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{note=applyImport(String(r.result));draw()};
  r.onerror=()=>{note="File tidak bisa dibaca.";draw()};
  r.readAsText(f);
}
function rbOf(tid){const t=S.teams.find(t=>t.id===tid);return t?(t.rb||[]).map((r,j)=>({...r,id:tid+":"+j})):[]}
// Total gol per robot dibandingkan dengan skor tim, agar selisih input cepat terlihat.
const gsum=(m,t)=>rbOf(t).reduce((s,x)=>s+(+((m.gs||{})[x.id])||0),0);
function chk(m,t){
  const sc=t===m.a?m.ga:m.gb,s=gsum(m,t);
  return "Total gol robot: "+s+(sc==null?"":" dari skor "+sc+(s===sc?"":" ⚠ tidak sama"));
}
function upChk(m){[m.a,m.b].forEach(t=>{const e=document.getElementById("chk-"+m.id+"-"+t);if(e)e.textContent=chk(m,t)})}
function gd(m){
  return `<details><summary><small>Gol per robot &amp; robot terbaik laga</small></summary>${[m.a,m.b].map(t=>`<p>${nm(t)}: ${rbOf(t).map(x=>`<label>${esc(x.n)} <input type="number" min="0" value="${(m.gs||{})[x.id]??""}" onchange="sg(${m.id},'${x.id}',this.value)"></label>`).join(" ")}<br><small id="chk-${m.id}-${t}">${chk(m,t)}</small></p>`).join("")}<label>Robot terbaik laga <select onchange="sm(${m.id},'mv',this.value)"><option value="">Belum dipilih</option>${[m.a,m.b].flatMap(rbOf).map(x=>`<option value="${x.id}"${m.mv===x.id?" selected":""}>${esc(x.n)}</option>`).join("")}</select></label></details>`;
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
// Tab/halaman lain di browser ini mengubah data: ikuti otomatis. Admin yang sedang login tidak digambar ulang agar isian tidak hilang.
addEventListener("storage",e=>{
  if(e.key!==null&&e.key!==K)return;
  S=load();
  if(V==="ad"&&ok)flash("Data diubah dari tab lain. Muat ulang halaman ini agar tampilannya sama.");
  else draw();
});
draw();
sync(true);
setInterval(()=>{if(!document.hidden)sync(false)},15000);
