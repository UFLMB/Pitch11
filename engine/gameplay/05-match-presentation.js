'use strict';
/* ===================== 12. STAGE 5: polish - replays, radar, match stats, commentary, WebAudio, day/night, settings ===================== */
const D5={tod:0,vol:2,crowd:2,radar:1,rep:1,com:1};Object.assign(G,D5);
const ST={pos:[0,0],sh:[0,0],sot:[0,0],pa:[0,0],po:[0,0],fl:[0,0],xg:[0,0],yc:[0,0],rc:[0,0],r:[],pp:null,ast:null,sc:null,now:0,lm:null};
const RP={R:360,N:180,buf:new Float32Array(360*180),total:0,t0:0,gf:0,did:false,f:0,s:0,e:0,skip:0,slow:false};
const cmL=[];
function cm(s){if(!G.com||S.prac)return;const q=(gmin()|0)+"' "+s;if(cmL.length&&cmL[cmL.length-1].s===q)return;cmL.push({s:q,t:3.6});if(cmL.length>2)cmL.shift();}
function stReset(){for(const k of ['pos','sh','sot','pa','po','fl','xg','yc','rc'])ST[k]=[0,0];ST.r=Array(22).fill(6);ST.pp=ST.ast=ST.sc=null;ST.now=0;RP.t0=RP.total;cmL.length=0;M.st=0;}
const rate=(p,v)=>{if(p&&!S.prac){const i=P.indexOf(p);if(i>=0)ST.r[i]+=v;}};
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* --- procedural audio: brown-noise crowd, whistle, kick, all synthesised --- */
const AU={c:null,ex:0,
init(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  if(!this.c){try{const c=this.c=new C(),m=this.m=c.createGain(),n=this.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=n.getChannelData(0);let b=0;
    for(let i=0;i<d.length;i++){b=b*.96+(Math.random()*2-1)*.25;d[i]=b;}
    const cp=c.createDynamicsCompressor();cp.threshold.value=-14;cp.ratio.value=5;m.connect(cp);cp.connect(c.destination);const s=c.createBufferSource(),f=this.f=c.createBiquadFilter(),g=this.g=c.createGain();
    s.buffer=n;s.loop=true;f.type='bandpass';f.frequency.value=700;f.Q.value=.5;g.gain.value=0;s.connect(f);f.connect(g);g.connect(m);s.start();this.vol();}catch(_){this.c=null;}}
  if(this.c&&this.c.state==='suspended')this.c.resume();},
vol(){if(this.c)this.m.gain.value=[0,.35,.65,1][G.vol];},
noise(dur,type,fq,pk){if(!this.c||!G.vol)return;const c=this.c,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  s.buffer=this.nb;f.type=type;f.frequency.value=fq;g.gain.setValueAtTime(pk,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(this.m);s.start(t,Math.random()*1.5,dur+.05);},
kick(v){window.P11AudioAssets?.play('kick',Math.min(1,Math.max(.35,v/500)));if(!this.c||!G.vol)return;const k=clamp(v/600,.25,1),c=this.c,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  this.noise(.09,'lowpass',500+k*400,.9*k);o.frequency.setValueAtTime(170,t);o.frequency.exponentialRampToValueAtTime(55,t+.08);
  g.gain.setValueAtTime(.55*k,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);o.connect(g);g.connect(this.m);o.start(t);o.stop(t+.1);},
whistle(len,n){window.P11AudioAssets?.play('whistle',n>1?.95:.72);if(!this.c||!G.vol)return;const c=this.c;for(let i=0;i<n;i++){const t=c.currentTime+i*(len+.1),o=c.createOscillator(),l=c.createOscillator(),lg=c.createGain(),g=c.createGain();
  o.frequency.value=2900;l.frequency.value=32;lg.gain.value=120;l.connect(lg);lg.connect(o.frequency);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2,t+.02);g.gain.setValueAtTime(.2,t+len);g.gain.linearRampToValueAtTime(0,t+len+.04);
  o.connect(g);g.connect(this.m);o.start(t);l.start(t);o.stop(t+len+.06);l.stop(t+len+.06);}},
roar(x){this.ex=Math.max(this.ex,x);},
event(type){
  window.P11AudioAssets?.event(type);
  if(!this.c||!G.vol||!G.crowd)return;
  const play=(dur,filter,freq,level)=>this.noise(dur,filter,freq,level);
  switch(type){
    case 'goal': this.roar(2.2);play(2.8,'bandpass',1050,.34);play(2.2,'highpass',1850,.16);play(1.8,'lowpass',420,.2);break;
    case 'keeperSave': this.roar(.95);play(.72,'bandpass',1450,.2);play(.48,'highpass',2300,.1);break;
    case 'bigChance': this.roar(.72);play(.9,'bandpass',1250,.15);break;
    case 'tackleWon': play(.48,'bandpass',850,.095);break;
    case 'tackleMissed': play(.38,'highpass',1700,.07);break;
    case 'foul': this.roar(.28);play(.65,'bandpass',520,.11);break;
    case 'yellowCard': this.roar(.5);play(1.05,'highpass',2050,.16);play(.8,'bandpass',720,.09);break;
    case 'redCard': this.roar(.85);play(1.6,'highpass',2250,.23);play(1.2,'bandpass',620,.14);break;
    case 'offside': play(.62,'highpass',1900,.105);break;
    case 'restartAwarded': play(.24,'bandpass',650,.035);break;
    default: break;
  }
},
tick(){if(!this.c)return;const m=S.mode,q=m==='menu'?0:(m==='half'||m==='subs'||m==='full')?.35:1,gd=Math.abs(ball.x-(ball.x<CX?PX0:PX1)),
  pr=m==='play'?Math.pow(Math.max(0,1-gd/380),2)*.7:0,t=this.c.currentTime;this.ex=Math.max(0,this.ex-DT*.4);
  const lv=Math.max(this.ex,pr);this.g.gain.setTargetAtTime([0,.5,1][G.crowd]*q*(.05+.1*Math.min(lv,2))*(1+.12*Math.sin(performance.now()/900)),t,.12);
  this.f.frequency.setTargetAtTime(600+lv*350,t,.2);}};
const _p11AuTick=AU.tick.bind(AU);AU.tick=function(){_p11AuTick();const m=S.mode;window.P11AudioAssets?.tick({active:m!=='menu'&&m!=='full'&&m!=='replay'&&!S.prac,volume:[0,1/3,2/3,1][G.vol],crowd:[0,.5,1][G.crowd]});};
const p11AudioUnlockEvents=['keydown','PointerEvent' in window?'pointerdown':'touchstart'];
for(const ev of p11AudioUnlockEvents)addEventListener(ev,()=>{AU.init();},{passive:true});

/* --- stat hooks: wrap existing actions --- */
const _doShoot=doShoot;doShoot=function(p,pw,a,l,e){
  const t=p.team,dx=Math.abs((dirOf(t)>0?PX1:PX0)-p.x),dy=p.y-CY,pen=!!(S.rs&&S.rs.kind==='pen'),xg=pen?.76:clamp(.95*Math.exp(-Math.hypot(dx,dy*1.4)/95),.01,.8);
  _doShoot(p,pw,a,l,e);if(S.so)return;
  ST.sh[t]++;ST.xg[t]+=xg;const gxx=dirOf(t)>0?PX1:PX0,yp=ball.y+ball.vy/(ball.vx||1e-6)*(gxx-ball.x);ST.sc={id:ball.shotId,t,p,xg,on:false,on0:ball.vx*(gxx-ball.x)>0&&Math.abs(yp-CY)<GOALH};rate(p,.05);
  if(xg>.3){cm('Big chance for '+tag(p)+'!');AU.event('bigChance');}};
const _gkReact=gkReact;gkReact=function(p){const s=ST.sc,l=ball.last;_gkReact(p);
  if(s&&!s.on&&s.on0&&s.t!==p.team&&ball.shotId===s.id&&(ball.owner===p||(ball.last===p&&l!==p))){s.on=true;ST.sot[s.t]++;rate(s.p,.15);rate(p,.4);if(s.xg>.12){cm(pick(['Great save!','Keeper denies it!','Smart stop by the keeper!']));AU.roar(1.1);}}};
const _goal=goal;goal=function(dr){_goal(dr);const t=S.goalTeam,sc=S.scorer,s=ST.sc,a=ST.ast;
  if(s&&!s.on&&s.t===t){s.on=true;ST.sot[t]++;}
  if(sc&&sc.team===t){rate(sc,1.2);if(a&&a.p.team===t&&a.p!==sc&&ST.now-a.at<8)rate(a.p,.8);}
  for(let r=0;r<5;r++)rate(P[(1-t)*11+r],-.15);
  RP.gf=RP.total;RP.did=false;AU.roar(2.2);
  cm(pick(['GOAL! ','What a goal! ','It\'s in! '])+(sc?tag(sc):KIT[t].name)+(a&&a.p.team===t&&a.p!==sc&&ST.now-a.at<8?' - set up by #'+a.p.num:''));};
const _doPass=doPass;doPass=function(p,t,m){_doPass(p,t,m);if(S.so)return;ST.pa[p.team]++;ST.pp={p,team:p.team};};
const _take=take;take=function(p,byHand=false){const q=ST.pp;
  if(q){ST.pp=null;if(p.team===q.team&&p!==q.p){ST.po[p.team]++;rate(q.p,.03);ST.ast={p:q.p,at:ST.now};}else if(p.team!==q.team)rate(p,.06);}
  _take(p,byHand);};
const _foul=foul;foul=function(p,o,b,context){_foul(p,o,b,context);ST.fl[p.team]++;rate(p,-.15);rate(o,.05);};
const _giveCard=giveCard;giveCard=function(p,c){_giveCard(p,c);if(c!==2)ST.yc[p.team]++;if(c>1)ST.rc[p.team]++;rate(p,c===1?-.4:-1.5);
  cm(c===1?'Yellow card for '+tag(p)+'.':'RED CARD! '+tag(p)+' is off!');};
const _oop=outOfPlay;outOfPlay=function(){const s=ST.sc;
  if(s&&!s.on&&!S.so&&ball.shotId===s.id&&ball.last===s.p&&s.xg>.08){cm(ball.z>20?'Over the bar!':'Just wide!');AU.roar(.9);}
  ST.pp=null;_oop();};
const _ws=whistleStop;whistleStop=function(sec,big,sub,fn,hurt){_ws(sec,big,sub,fn,hurt);ST.pp=null;if(big!=='GOAL!')AU.whistle(.35,1);};
const _endHalf=endHalf;endHalf=function(){_endHalf();AU.whistle(.5,3);cm(S.mode==='full'?'Full time!':'The whistle goes.');};
const _kick=kick;kick=function(p,vx,vy,vz,sp,r,tx,ty,m){_kick(p,vx,vy,vz,sp,r,tx,ty,m);if(m==='shot')AU.kick(Math.hypot(vx,vy));else window.P11AudioAssets?.play(m==='header'?'header':m==='lob'?'pass':'pass',.62);};
const _sk=setupKickoff;setupKickoff=function(t){_sk(t);RP.t0=RP.total;if(S.clock===0){window.P11AudioAssets?.play('matchStart',.72);AU.whistle(.25,1);}};
const _nm=newMatch;newMatch=function(){_nm();stReset();};
const MSG={FOUL:'Foul - the referee blows up.',OFFSIDE:'The flag is up - offside!',PENALTY:'Penalty awarded!',ADVANTAGE:'Referee plays advantage.',INJURY:'A player is down injured.','NO ADVANTAGE':'No advantage - back for the free kick.'};

/* --- stadium atmosphere event bridge: presentation reacts to real match events --- */
function emitStadiumEvent(type){
  if(S.mode==='menu'||S.mode==='replay'||S.prac||S.so)return;
  AU.event(type);
}
const _stadiumGoal=goal;goal=function(dr){_stadiumGoal(dr);window.P11AudioAssets?.play('net',.8);emitStadiumEvent('goal');};
const _stadiumKeeper=gkReact;gkReact=function(p){
  const sc=ST.sc,was=sc&&sc.on;
  _stadiumKeeper(p);
  if(sc&&!was&&sc.on&&sc.t!==p.team)emitStadiumEvent('keeperSave');
};
const _stadiumTackle=tryTackle;tryTackle=function(p,c){
  const cd=p.tcd,r=_stadiumTackle(p,c);
  if(p.tcd>cd+.5&&S.mode==='play')emitStadiumEvent(r?'tackleWon':'tackleMissed');
  return r;
};
const _stadiumFoul=foul;foul=function(p,o,b,context){_stadiumFoul(p,o,b,context);emitStadiumEvent('foul');};
const _stadiumCard=giveCard;giveCard=function(p,c){_stadiumCard(p,c);emitStadiumEvent(c===1?'yellowCard':'redCard');};
const _stadiumOffside=callOffside;callOffside=function(p){emitStadiumEvent('offside');_stadiumOffside(p);};
const _stadiumOut=outOfPlay;outOfPlay=function(){_stadiumOut();emitStadiumEvent('restartAwarded');};
const _stadiumKickoff=setupKickoff;setupKickoff=function(t){_stadiumKickoff(t);emitStadiumEvent('restartAwarded');};


/* --- goal replay: ring buffer of every tick, played back with slow motion --- */
function rec(){const b=RP.buf;let k=(RP.total%RP.R)*RP.N;
  for(const p of P){b[k++]=p.x;b[k++]=p.y;b[k++]=p.face;b[k++]=p.anim;b[k++]=p.dive>0?1:p.down?2:0;b[k++]=p.diveAng;b[k++]=(p.ak|0)+((p.at>0&&p.ak)?Math.min(.99,p.at/AD[p.ak]):0);b[k++]=p.skill;}
  b[k++]=ball.x;b[k++]=ball.y;b[k++]=ball.z;b[k]=ball.rot;RP.total++;}
function startReplay(){RP.did=true;const s=Math.max(RP.gf-170,RP.t0,RP.total-RP.R+2),e=Math.min(RP.gf+55,RP.total-2);
  if(e-s<30)return;RP.s=RP.f=s;RP.e=e;RP.skip=0;S.mode='replay';S.t=0;I.shoot=false;}
function tickReplay(){
  if(RP.skip||RP.f>=RP.e){S.mode='goal';S.t=3.5;return;}
  RP.slow=RP.f>RP.gf-50;RP.f+=RP.slow?.35:1;
  const f=Math.min(RP.f,RP.e),i=Math.floor(f),r=f-i,A=(i%RP.R)*RP.N,B=((i+1)%RP.R)*RP.N,b=RP.buf;
  for(let n=0;n<22;n++){const p=P[n],a=A+n*8,c=B+n*8;
    p.x=p.px=b[a]+(b[c]-b[a])*r;p.y=p.py=b[a+1]+(b[c+1]-b[a+1])*r;p.face=b[a+2];p.anim=b[a+3];p.dive=b[a+4]===1?1:0;p.down=b[a+4]===2;p.diveAng=b[a+5];{const v=b[a+6];p.ak=Math.floor(v);p.at=(v-p.ak)*AD[p.ak];}p.skill=b[a+7];p.jump=0;}
  const a=A+176,c=B+176;ball.x=ball.px=b[a]+(b[c]-b[a])*r;ball.y=ball.py=b[a+1]+(b[c+1]-b[a+1])*r;ball.z=ball.pz=b[a+2]+(b[c+2]-b[a+2])*r;ball.rot=b[a+3];ball.vx=ball.vy=ball.vz=0;ball.owner=null;
  cam.px=cam.x;cam.py=cam.y;cam.pv=cam.v;camUpdate();}
const _upd=update;update=function(){
  if(S.mode==='replay'){if(H<=W)tickReplay();return;}
  if(H>W){_upd();return;}
  _upd();
  if(S.mode==='menu'){RP.t0=RP.total;AU.tick();return;}
  ST.now+=DT;if(S.mode==='play'&&ball.owner)ST.pos[ball.owner.team]+=DT;
  rec();
  if(S.mode==='goal'&&S.t>1.6&&!RP.did&&G.rep&&!S.so&&!S.prac)startReplay();
  if(S.msg!==ST.lm){ST.lm=S.msg;if(S.msg&&MSG[S.msg.big])cm(MSG[S.msg.big]);}
  for(const c of cmL)c.t-=DT;while(cmL.length&&cmL[0].t<=0)cmL.shift();
  AU.tick();};

/* --- HUD extras --- */
function tint(){const k=G.tod;if(!k)return;ctx.setTransform(dpr,0,0,dpr,0,0);
  const has3D=!!(window.P11Stadium&&window.P11Stadium.ready);
  ctx.fillStyle=k===1?(has3D?'rgba(255,110,30,.055)':'rgba(255,110,30,.16)'):(has3D?'rgba(6,14,50,.14)':'rgba(6,14,50,.42)');ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,k===1?(has3D?'rgba(60,10,40,.12)':'rgba(60,10,40,.35)'):(has3D?'rgba(0,0,10,.2)':'rgba(0,0,10,.55)'));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(k===2){ctx.globalCompositeOperation='lighter';for(const x of [W*.08,W*.92]){const l=ctx.createRadialGradient(x,0,0,x,0,H*.7);l.addColorStop(0,has3D?'rgba(255,255,225,.08)':'rgba(255,255,225,.2)');l.addColorStop(1,'rgba(255,255,225,0)');ctx.fillStyle=l;ctx.fillRect(0,0,W,H);}ctx.globalCompositeOperation='source-over';}}
function radar(){const k=G.radar;if(!k)return;const w=W*(k>1?.2:.14),h=w*PH/PW,x=W*.015,y=H*.035,s=w/PW;
  ctx.globalAlpha=.8;ctx.fillStyle='rgba(10,40,20,.5)';rr(x,y,w,h,5);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
  ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w/2,y+h);ctx.moveTo(x+w/2+91.5*s,y+h/2);ctx.arc(x+w/2,y+h/2,91.5*s,0,TAU);ctx.stroke();
  ctx.strokeRect(x,y+h/2-201.5*s,165*s,403*s);ctx.strokeRect(x+w-165*s,y+h/2-201.5*s,165*s,403*s);
  const d=(wx,wy,r,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+clamp((wx-PX0)*s,0,w),y+clamp((wy-PY0)*s,0,h),r,0,TAU);ctx.fill();};
  for(const p of P)if(!p.out)d(p.x,p.y,Math.max(2,w*.017),KIT[p.team].shirt);
  if(ctrl&&!ctrl.out){ctx.strokeStyle='#ffe600';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x+clamp((ctrl.x-PX0)*s,0,w),y+clamp((ctrl.y-PY0)*s,0,h),Math.max(3.5,w*.03),0,TAU);ctx.stroke();}
  d(ball.x,ball.y,Math.max(1.8,w*.013),'#fff');ctx.globalAlpha=1;}
function comm(){if(CUT.t>0||!cmL.length)return;const c=cmL[cmL.length-1],fs=H*.03;ctx.font='700 '+fs+'px sans-serif';const w=ctx.measureText(c.s).width+H*.06,y=H*.185;
  ctx.save();ctx.globalAlpha=Math.min(1,c.t*2)*.9;ctx.fillStyle='rgba(8,12,18,.7)';rr(W/2-w/2,y,w,H*.045,H*.02);ctx.fill();
  txt(c.s,W/2,y+H*.024,fs,'#fff',700);ctx.restore();}
function repHud(){const g=ctx.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.5)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=5;ctx.strokeRect(3,3,W-6,H-6);
  if((performance.now()/500|0)%2){ctx.fillStyle='#ff3b30';ctx.beginPath();ctx.arc(W*.04,H*.13,H*.014,0,TAU);ctx.fill();}
  ctx.textAlign='left';txt('REPLAY'+(RP.slow?'  SLOW-MO 0.35x':''),W*.065,H*.13,H*.04,'#fff',900);ctx.textAlign='center';
  txt('TAP TO SKIP',W/2,H*.93,H*.032,'rgba(255,255,255,.75)',700);
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(W*.3,H*.96,W*.4,4);ctx.fillStyle='#ffe600';ctx.fillRect(W*.3,H*.96,W*.4*clamp((RP.f-RP.s)/(RP.e-RP.s),0,1),4);}
function statsScr(){UI.r.length=0;UI.def=null;ctx.fillStyle='rgba(6,12,20,.97)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.textBaseline='middle';
  const sa=S.score;txt(KIT[0].name+'  '+sa[0]+' - '+sa[1]+'  '+KIT[1].name,W/2,H*.07,H*.065,'#fff',900);
  const tp=(ST.pos[0]+ST.pos[1])||1,a=Math.round(ST.pos[0]/tp*100),pc=t=>ST.pa[t]?Math.round(ST.po[t]/ST.pa[t]*100):0,pf=v=>v+'%',x2=v=>v.toFixed(2);
  const R=[['POSSESSION',a,100-a,pf],['SHOTS',ST.sh[0],ST.sh[1]],['ON TARGET',ST.sot[0],ST.sot[1]],['PASSES',ST.pa[0],ST.pa[1]],['PASS ACCURACY',pc(0),pc(1),pf],['FOULS',ST.fl[0],ST.fl[1]],['CARDS',ST.yc[0]+ST.rc[0],ST.yc[1]+ST.rc[1]],['xG',ST.xg[0],ST.xg[1],x2]];
  R.forEach((r,i)=>{const y=H*.17+i*H*.092,f=r[3]||(v=>v),tot=r[1]+r[2];
    txt(f(r[1]),W*.07,y,H*.04,'#fff',800);txt(f(r[2]),W*.53,y,H*.04,'#fff',800);txt(r[0],W*.3,y,H*.03,'#9fb0c0',700);
    ctx.fillStyle=KIT[1].shirt;ctx.fillRect(W*.06,y+H*.032,W*.48,H*.012);ctx.fillStyle=KIT[0].shirt;ctx.fillRect(W*.06,y+H*.032,W*.48*(tot?r[1]/tot:.5),H*.012);});
  const fin=i=>clamp(ST.r[i]+(sa[0]===sa[1]?0:((sa[0]>sa[1])===(i<11)?.4:-.3)),3,10);
  let mo=0;for(let i=1;i<22;i++)if(fin(i)>fin(mo))mo=i;
  txt('PLAYER RATINGS',W*.79,H*.17,H*.04,'#ffe600',800);
  [...Array(11).keys()].sort((p,q)=>fin(q)-fin(p)).slice(0,6).forEach((i,k)=>{const y=H*.26+k*H*.085,v=fin(i);
    ctx.textAlign='left';fit((i===mo?'* ':'')+(P[i].nm||'#'+P[i].num)+'  '+P[i].pos,W*.64,y,W*.185,H*.037,'#fff','left');ctx.textAlign='right';txt(v.toFixed(1),W*.95,y,H*.04,v>=7.5?'#5cff8a':v<6?'#ff9a80':'#fff',800);ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(W*.64,y+H*.03,W*.31,H*.008);ctx.fillStyle=KIT[0].shirt;ctx.fillRect(W*.64,y+H*.03,W*.31*(v-3)/7,H*.008);});
  txt('MAN OF THE MATCH:  '+KIT[mo<11?0:1].name+' '+(P[mo].nm||'#'+P[mo].num)+' '+P[mo].pos+'  '+fin(mo).toFixed(1),W*.79,H*.82,H*.032,'#ffe600',800);
  ubtn(W*.02,H*.03,W*.14,H*.09,'< BACK',()=>{M.st=0;});}
const _hud=drawHud;drawHud=function(){
  if(H<=W&&S.mode!=='menu')tint();
  _hud();if(H>W||S.mode==='menu')return;
  ctx.textAlign='center';ctx.textBaseline='middle';
  const m=S.mode,live=m==='play'||m==='kickoff'||m==='goal'||m==='whistle';
  if(live)radar();
  if(live&&!S.so)comm();
  if(m==='replay')repHud();
  if(m==='half'||m==='full'){if(M.st)statsScr();}};

/* --- settings: sound & visuals page, persisted in the save --- */
const _set=MS.set;MS.set=function(){_set();ubtn(W*.3,H*.875,W*.4,H*.09,'SOUND & VISUALS',()=>go('opt'));};
MS.opt=function(){mt('SOUND & VISUALS');mbk();
  [['TIME OF DAY','tod',['DAY','DUSK','NIGHT']],['SOUND','vol',['OFF','LOW','MED','HIGH']],['CROWD','crowd',['OFF','LOW','FULL']],['MINI-MAP','radar',['OFF','SMALL','LARGE']],['GOAL REPLAYS','rep',['OFF','ON']],['COMMENTARY','com',['OFF','ON']],['DOUBLE-TAP SHOT',  'ftap',['OFF','ON']]]
  .forEach((r,i)=>{const y=H*(.17+i*.105);txt(r[0],W*.15,y+H*.045,H*.036,'#fff',800);seg(W*.3,y,W*.64,H*.09,r[2],G[r[1]],v=>{G[r[1]]=v;syncDbl();save();AU.init();AU.vol();});});};
const _ld=load;load=function(){_ld();const ni=(v,a,b,d)=>Number.isInteger(v)&&v>=a&&v<=b?v:d;
  G.tod=ni(G.tod,0,2,0);G.vol=ni(G.vol,0,3,2);G.crowd=ni(G.crowd,0,2,2);G.radar=ni(G.radar,0,2,1);G.rep=ni(G.rep,0,1,1);G.com=ni(G.com,0,1,1);};
const _rs=resetSave;resetSave=function(){_rs();Object.assign(G,D5);save();AU.vol();};
