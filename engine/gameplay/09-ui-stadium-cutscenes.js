'use strict';
/* ===================== 28. STAGE 22: team defence + tactics for the human side, FC Mobile layout defaults ===================== */
const T22={tick:0,lost:[0,0],prev:[false,false],cache:[{n:-1},{n:-1}]};   // per team: counter-press timer, possession flag, shared info
const al22=(p,x)=>(x-ownGX(p))*dirOf(p.team);                 // distance from my own goal line towards the opponent goal
function team22(t){                                             // per-tick shared info for one team
  const c=T22.cache[t];if(c.n===T22.tick)return c;c.n=T22.tick;
  const b=ball,o=b.owner,L=[],me=t?null:ctrl;
  for(let i=t*11;i<t*11+11;i++){const q=P[i];if(q.out||q.down||q.gk)continue;L.push([Math.hypot(q.x-b.x,q.y-b.y),q]);}
  L.sort((a,z)=>a[0]-z[0]);c.rank=L.map(z=>z[1]);c.cover=null;c.sup=[];
  if(o&&o.team!==t){                                            // cover defender: nearest back-liner who is not pressing
    const pr=new Set([me,TI[t].c1,TI[t].c2,D9.pp[t]]);
    for(const q of c.rank)if(!pr.has(q)&&q.line===1){c.cover=q;break;}
    if(!c.cover)for(const q of c.rank)if(!pr.has(q)&&q.line===2){c.cover=q;break;}
  }else if(o&&o.team===t){                                      // two short passing options for the carrier
    for(const q of c.rank){if(q!==o&&q!==me&&q.line<=2&&q.role!==2&&q.role!==3){c.sup.push(q);if(c.sup.length>=2)break;}}
  }
  return c;
}
function go22(p,x,y,spr){goTo(p,clamp(x,PX0+15,PX1-15),clamp(y,PY0+15,PY1-15),spr&&p.stam>0.2);}
function defend22(p,o,c){
  const t=p.team,d=dirOf(t),gx=ownGX(p),ba=clamp(al22(p,ball.x),0,PW),fast=Math.hypot(o.vx,o.vy)>85;
  const dist=Math.hypot(o.x-p.x,o.y-p.y),mine=al22(p,p.x),theirs=al22(p,o.x);
  const gl={x:gx,y:CY};
  // beaten: the carrier is goal-side of me -> sprint back and get between him and the goal
  if(p.line<=2&&theirs<mine-10&&dist<320){
    let ux=gl.x-o.x,uy=gl.y-o.y;const l=Math.hypot(ux,uy)||1;go22(p,o.x+ux/l*46,o.y+uy/l*46,true);return;}
  // counter-press for a couple of seconds after losing the ball
  if(T22.lost[t]>0&&ba>PW*.3&&dist<150&&false){
    go22(p,o.x+o.vx*.25,o.y+o.vy*.25,true);if(dist<42)closeIn(p,o);tackleTry(p,TUNING.df.auto.chance*(t?.85*DIF[G.diff].tk:1),1);return;}
  // cover: sit behind the presser, between ball and goal
  if(c.cover===p&&ba<PW*.62){
    const pr=(t===0&&ctrl&&Math.hypot(ctrl.x-ball.x,ctrl.y-ball.y)<130)?ctrl:(TI[t].c1||o);
    let ux=gl.x-pr.x,uy=gl.y-pr.y;const l=Math.hypot(ux,uy)||1;
    go22(p,pr.x+ux/l*54,pr.y+uy/l*54+(CY-pr.y)*.12,dist>80);return;}
  // compact block: lines hold depth relative to the ball
  const back=clamp(ba-250-(fast?35:0),135,430);
  let a=p.line===1?Math.min(back,Math.max(55,ba-22)):p.line===2?Math.min(back+115,Math.max(90,ba+30)):Math.min(back+230,Math.max(130,ba+90),PW*.56);
  homePos(p);let tx=gx+d*a,ty=CY+(HP[1]-CY)*.8+(ball.y-CY)*.12;
  // man + zone marking inside a leash so the shape never breaks
  const m=p.mk;
  if(m&&!m.out&&p.line<=2&&m!==o){
    let ux=gl.x-m.x,uy=gl.y-m.y,l=Math.hypot(ux,uy)||1;ux/=l;uy/=l;
    let vx=ball.x-m.x,vy=ball.y-m.y,bl=Math.hypot(vx,vy)||1;vx/=bl;vy/=bl;
    const w=p.line===1?.2:.4,k=14-6*p.st.def;let ax=ux*(1-w)+vx*w,ay=uy*(1-w)+vy*w;const q=Math.hypot(ax,ay)||1;
    let mx=m.x+ax/q*k,my=m.y+ay/q*k;const lx=mx-tx,ly=my-ty,ld=Math.hypot(lx,ly),lash=p.line===1?105:150;
    if(ld>lash){mx=tx+lx/ld*lash;my=ty+ly/ld*lash;}
    tx+=(mx-tx)*.75;ty+=(my-ty)*.75;
  }
  if(p.line===1&&al22(p,tx)>ba+10&&ba>150)tx=gx+d*(ba+10);   // never ahead of the ball line at the back
  go22(p,tx,ty,Math.hypot(tx-p.x,ty-p.y)>60);
}
function attack22(p,o,c){
  const d=dirOf(p.team),gx=ownGX(p),ba=clamp(al22(p,ball.x),0,PW),off=TI[p.team].off;
  homePos(p);const hy=HP[1],wideP=Math.abs(hy-CY)>PH*.28,capX=x=>{const v=Math.min(x*d,off-8);return v*d;};
  const si=c.sup.indexOf(p);
  if(si>=0){                                                    // support triangle: short option behind / beside the carrier
    let side=(c.sup[0].y<o.y?-1:1);if(si===1)side=-side;
    if(o.y<PY0+90)side=1;else if(o.y>PY1-90)side=-1;
    go22(p,o.x-d*28,o.y+side*88,Math.hypot(p.x-o.x,p.y-o.y)>110);return;}
  if(p.role===1||p.role===4){                                   // full-backs: overlap on the carrier's flank, tuck in on the far one
    const sameFlank=Math.abs(o.y-p.y)<230&&(p.y<CY)===(o.y<CY);
    if(sameFlank&&ba>PW*.42){go22(p,capX(gx+d*clamp(ba+10,0,PW*.82)),p.y<CY?PY0+50:PY1-50,true);return;}
    if(!sameFlank&&ba>PW*.42){go22(p,gx+d*clamp(ba-200,150,450),hy*.85+CY*.15,false);return;}
  }
  if(p.role===2||p.role===3){                                   // centre-backs: rest defence against the counter
    go22(p,gx+d*clamp(ba-300,150,PW*.5),CY+(p.role===2?-45:45)+(ball.y-CY)*.12,false);return;}
  if(p.role===6){go22(p,gx+d*clamp(ba-170,200,PW*.62),CY+(ball.y-CY)*.3,false);return;}   // holding midfielder
  if((p.role===8||p.role===10)&&wideP){                         // wingers: stretch the pitch, then cut inside in the final third
    const fin=ba>PW*.6,ty=fin?CY+(p.y<CY?-1:1)*110:(p.y<CY?PY0+55:PY1-55);
    go22(p,capX(gx+d*clamp(ba+(fin?80:120),0,PW)),ty,Math.abs(ty-p.y)>60);return;}
}
const _aiP22=aiPlayer;
aiPlayer=function(p){
  _aiP22(p);
  if(p.gk||p.out||p===ctrl||S.mode!=='play'||S.rs||S.so||S.prac||p.sd||p.freeze>0||p.down||p.stun>0||p.wr>0||p.dive>0)return;
  const o=ball.owner;if(!o||o===p||ball.receiver===p)return;
  const t=p.team,c=team22(t),ti=TI[t];
  if(o.team!==t){if(ti.c1===p||ti.c2===p||D9.pp[t]===p)return;defend22(p,o,c);}
  else attack22(p,o,c);
};
/* defending: control the best-placed defender (close to the ball AND goal-side), not just the nearest */
const _as22=autoSwitch;
autoSwitch=function(){
  const o=ball.owner;
  if(!o||o.team!==1||o.gk||S.rs||(S.swCd>0&&ctrl)){_as22();return;}
  const bx=ball.x+ball.vx*.2,by=ball.y+ball.vy*.2,sc=p=>Math.hypot(p.x-bx,p.y-by)+(al22(p,p.x)>al22(p,o.x)+8?55:0);
  let best=ctrl&&!ctrl.out?ctrl:null,bs=best?sc(best)*.8:1e9;
  for(let i=0;i<11;i++){const p=P[i];if(p.gk||p.out)continue;const v=sc(p);if(v<bs){bs=v;best=p;}}
  if(best&&best!==ctrl){ctrl=best;S.swCd=.35;}
};
/* match-situation tactics: protect a late lead, chase a late deficit (the saved tactic is restored after every tick) */
const _up22=update;
update=function(){
  T22.tick++;
  const tc=TC[0],bk=[tc.press,tc.line,tc.tempo,tc.width];
  if(S.mode==='play'&&!S.prac&&!S.so){
    const late=(S.half===2||S.half===4)&&S.clock>plen()*.62,lead=S.score[0]-S.score[1];
    if(late&&lead>0){tc.line=Math.min(tc.line,.5);tc.press=Math.min(tc.press,.6);tc.tempo=Math.max(0,tc.tempo-.8);}
    else if((late&&lead<0)||lead<=-2){tc.line=Math.min(2,tc.line+1);tc.press=Math.min(2,tc.press+1);tc.tempo=Math.min(2,tc.tempo+1);}
  }
  try{_up22();}finally{tc.press=bk[0];tc.line=bk[1];tc.tempo=bk[2];tc.width=bk[3];}
  if(S.mode!=='play'){for(let t=0;t<2;t++){T22.lost[t]=0;T22.prev[t]=TI[t].att;}return;}
  for(let t=0;t<2;t++){if(T22.lost[t]>0)T22.lost[t]-=DT;const att=TI[t].att;if(T22.prev[t]&&!att&&ball.owner&&ball.owner.team===1-t)T22.lost[t]=2.4;T22.prev[t]=att;}
};
/* FC Mobile control layout as the default (one-time; the layout editor still works) */
function fcLayout22(){G.btns=[[4.3,4.9,1.1],[2.4,2.5,1.5],[5.5,1.9,1.25],[1.5,5.4,1.2]];G.preset='fc';G.joy=[.13,.72];G.op=.75;syncLayout();save();}
const _ld22=load;load=function(){_ld22();if(!G.hud22){G.hud22=1;fcLayout22();}};
const _rs22=resetSave;resetSave=function(){_rs22();G.hud22=1;fcLayout22();};

/* ===================== 29. STAGE 23: receivers, real set pieces, name bar, new ball ===================== */
TUNING.rcv.r=22;                                                // pick-up radius for the intended receiver (was 19)
/* a pass to the player you control: he runs onto the ball even while the stick is held (the stick only nudges the line) */
const _ha23=humanAct;humanAct=function(p){
  const sx=I.mx,sy=I.my;_ha23(p);
  if(p===ctrl&&rcvOn()&&ball.receiver===p&&!p.sd&&!W8.p&&!(S.rs&&S.rs.p===p)&&!D9.auto&&Math.hypot(sx,sy)>=TUNING.rcv.stick){
    rcvRun(p);p.ix+=sx*.3;p.iy+=sy*.3;const m=Math.hypot(p.ix,p.iy);if(m>1){p.ix/=m;p.iy/=m;}
  }
};
/* set pieces: the taker cannot touch the ball again until someone else has (no dribbling off from a throw-in / kick-off) */
const _kk23=kick;kick=function(p,vx,vy,vz,spin,rcv,tx,ty,mode){const rs=S.rs;_kk23(p,vx,vy,vz,spin,rcv,tx,ty,mode);if(rs&&rs.p===p&&rs.kind!=='drop'){ball.dbl=p;ball.dblKind=rs.kind;}};
const _tk23=take;take=function(p,byHand=false){if(p!==ball.dbl||ball.last!==ball.dbl)ball.dbl=null;_tk23(p,byHand);};
/* throw-in: the three nearest team-mates come to offer a short, a forward and a safe option along the touchline */
function throwSup23(p,rs){
  const t=p.team,d=dirOf(t),n=rs.y<CY?1:-1,tk=rs.p,L=[];
  for(let i=t*11;i<t*11+11;i++){const q=P[i];if(q===tk||q.gk||q.out)continue;L.push([Math.hypot(q.x-tk.x,q.y-tk.y),q]);}
  L.sort((a,z)=>a[0]-z[0]);
  const k=L.slice(0,3).findIndex(z=>z[1]===p);if(k<0)return null;
  const o=[[20,70],[90,115],[-70,60]][k];
  return[clamp(tk.x+d*o[0],PX0+20,PX1-20),clamp(tk.y+n*o[1],PY0+20,PY1-20)];
}
const _aiP23=aiPlayer;aiPlayer=function(p){
  const rs=S.rs;
  if(rs&&rs.kind==='throw'&&p.team===rs.team&&!p.gk&&!p.out&&p!==rs.p&&ball.owner===rs.p&&S.mode==='play'){
    const q=throwSup23(p,rs);if(q){goTo(p,q[0],q[1],false);return;}
  }
  _aiP23(p);
};
/* name bar of the player on the ball, bottom centre (the head labels are gone) */
const hexL23=c=>/^#[0-9a-f]{6}$/i.test(c)?((parseInt(c.slice(1,3),16)*.3+parseInt(c.slice(3,5),16)*.59+parseInt(c.slice(5,7),16)*.11)/255):.5;
function nameBar23(){
  const m=S.mode;if(H>W||(m!=='play'&&m!=='kickoff'&&m!=='whistle')||CUT.t>0||TOSS.on)return;
  const p=ball.owner&&!ball.owner.out?ball.owner:ctrl;if(!p||p.out)return;
  const nm=(p.nm||('PLAYER '+p.num)).toUpperCase(),k=KIT[p.team],tc=p.gk?k.gk:k.shirt,h=H*.085,fs=h*.42;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font='800 '+fs+'px sans-serif';
  const bw=Math.max(W*.22,ctx.measureText(nm).width+h*3.1),x=W/2-bw/2,y=H-h-H*.03,s=clamp(p.stam===undefined?1:p.stam,0,1);
  ctx.fillStyle='rgba(10,16,28,.88)';rr(x,y,bw,h,h*.22);ctx.fill();
  ctx.fillStyle=tc;rr(x,y,h*.95,h,h*.22);ctx.fill();
  ctx.textBaseline='middle';ctx.textAlign='center';txt(String(p.num),x+h*.475,y+h*.52,h*.5,hexL23(tc)>.6?'#111':'#fff',900);
  ctx.textAlign='left';txt(nm,x+h*1.1,y+h*.5,fs,'#fff',800);
  ctx.textAlign='right';txt(p.pos||'',x+bw-h*.3,y+h*.5,fs*.7,'#9fb0c0',700);
  ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(x+h*.95,y+h-h*.08,bw-h*.95,h*.08);
  ctx.fillStyle=s>.5?'#5cff8a':s>.25?'#ffd400':'#ff5a40';ctx.fillRect(x+h*.95,y+h-h*.08,(bw-h*.95)*s,h*.08);
  ctx.restore();
}
const _ti23=tint;tint=function(){_ti23();if(S.mode!=='menu')nameBar23();};
/* new ball: white shell, orange centre panel and four navy panels that roll with the ball */
function ballPent(x,y,r,a){ctx.beginPath();for(let j=0;j<5;j++){const t=a+j*TAU/5;ctx[j?'lineTo':'moveTo'](x+Math.cos(t)*r,y+Math.sin(t)*r);}ctx.closePath();ctx.fill();}
function ballPat(x,y,rx,ry,rot){
  ctx.save();ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.clip();
  ctx.fillStyle='#ff6a00';ballPent(x+Math.cos(rot)*rx*.1,y+Math.sin(rot)*ry*.1,rx*.45,rot);
  ctx.fillStyle='#16295c';
  for(let i=0;i<4;i++){const r=rot+i*1.571+.5;ballPent(x+Math.cos(r)*rx*.9,y+Math.sin(r)*ry*.9,rx*.42,r);}
  ctx.restore();
}

/* assists default to MANUAL (one-time switch for existing saves; the ASSIST menu still changes it) */
function fixAssistSettings(){
  const a=G.assist&&typeof G.assist==='object'?G.assist:{},valid=v=>['assisted','semi','manual'].includes(v);
  G.assist={pass:valid(a.pass)?a.pass:'manual',shot:valid(a.shot)?a.shot:'manual'};
}
const _ld23=load;load=function(){_ld23();if(!G.as23){G.as23=1;G.assist={pass:'manual',shot:'manual'};save();}fixAssistSettings();};
const _rs23=resetSave;resetSave=function(){_rs23();G.as23=1;G.assist={pass:'manual',shot:'manual'};save();};

/* ===================== 29. UI POLISH: unified look for every menu + reorganised SETTINGS ===================== */
function mtHead(t){txt(t,W/2,H*.085,H*.07,'#fff',900);ctx.fillStyle='#ffe600';rr(W/2-W*.04,H*.127,W*.08,H*.008,H*.004);ctx.fill();}
ubtn=function(x,y,w,h,label,fn,col){                         // one consistent button style: soft glass, yellow accent = selected / primary, red = danger
  UI.r.push({x,y,w,h,fn});
  const cs=typeof col==='string'?col:'',acc=col===Y||/255,\s?230,\s?0/.test(cs),dng=/255,\s?60,\s?40/.test(cs);
  ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=h*.14;ctx.shadowOffsetY=h*.05;
  const g=ctx.createLinearGradient(0,y,0,y+h);
  if(acc){g.addColorStop(0,'#ffe94a');g.addColorStop(1,'#f0b800');}
  else if(dng){g.addColorStop(0,'#ff6a55');g.addColorStop(1,'#c4301f');}
  else{g.addColorStop(0,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,.07)');}
  ctx.fillStyle=g;rr(x,y,w,h,h*.28);ctx.fill();ctx.shadowColor='transparent';
  if(cs&&!acc&&!dng){ctx.fillStyle=cs;rr(x,y,w,h,h*.28);ctx.fill();}
  ctx.strokeStyle=acc?'#fff3a0':'rgba(255,255,255,.35)';ctx.lineWidth=1.5;rr(x,y,w,h,h*.28);ctx.stroke();ctx.restore();
  fit(label,x+w/2,y+h/2,w*.9,h*.4,acc?'#14202b':'#fff');
};
seg=function(x,y,w,h,labs,sel,fn){                          // segmented control: one rounded track, the chosen option is highlighted
  const bw=w/labs.length;ctx.fillStyle='rgba(0,0,0,.28)';rr(x-3,y-3,w+6,h+6,h*.32);ctx.fill();
  labs.forEach((l,i)=>ubtn(x+i*bw+2,y,bw-4,h,l,()=>fn(i),i===sel?Y:0));
};
function gpanel(x,y,w,h,title){ctx.fillStyle='rgba(255,255,255,.06)';rr(x,y,w,h,H*.025);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1.5;ctx.stroke();
  if(title){ctx.textAlign='left';txt(title,x+W*.02,y+H*.04,H*.03,'#ffe600',800);ctx.textAlign='center';}}
function lbl(s,x,y,sub){ctx.textAlign='left';txt(s,x,y,H*.036,'#fff',800);if(sub)txt(sub,x,y+H*.04,H*.026,'#9fb0c0',600);ctx.textAlign='center';}
drawMenu=function(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#10402b');g.addColorStop(1,'#06101a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(W/2,H*.55,H*.45,0,TAU);ctx.moveTo(W/2,H*.1);ctx.lineTo(W/2,H);ctx.stroke();
  const v=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.95);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  (MS[M.scr]||MS.main)();
  if(toast.t>0){ctx.fillStyle='rgba(0,0,0,.6)';rr(W*.25,H*.915,W*.5,H*.07,H*.03);ctx.fill();txt(toast.s,W/2,H*.95,H*.038,'#ffe600',800);}
};
/* --- SETTINGS hub: six clear categories instead of one crowded page --- */
MS.set=function(){
  mt('SETTINGS');mbk();
  const T=[['GAMEPLAY','Difficulty, camera, pitch & sizes','game','#3ddc84'],['SOUND & VISUALS','Volume, crowd, mini-map, replays','opt','#4aa3ff'],['CONTROLS','Assists, presets, layout, training','ctl','#ffb020'],
    ['REFEREE & RULES','Fouls, offside, referee, kits','cust','#ff6a55'],['ADVANCED','Haptics, swipes, hints','adv','#b07cff'],['DATA','Reset saved progress','data','#9fb0c0']];
  const cw=W*.28,ch=H*.3,gx=W*.02,x0=(W-(cw*3+gx*2))/2;
  T.forEach((t,i)=>{const x=x0+(i%3)*(cw+gx),y=H*(.2+(i>>1<1?0:.34)*(i>>1)*1);const yy=i<3?H*.2:H*.56;
    UI.r.push({x,y:yy,w:cw,h:ch,fn:()=>go(t[2])});
    ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=H*.03;ctx.shadowOffsetY=H*.01;
    const g=ctx.createLinearGradient(0,yy,0,yy+ch);g.addColorStop(0,'rgba(255,255,255,.17)');g.addColorStop(1,'rgba(255,255,255,.06)');ctx.fillStyle=g;rr(x,yy,cw,ch,H*.035);ctx.fill();ctx.restore();
    ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1.5;rr(x,yy,cw,ch,H*.035);ctx.stroke();
    ctx.fillStyle=t[3];rr(x+cw*.08,yy+ch*.14,cw*.84,ch*.05,ch*.025);ctx.fill();
    fit(t[0],x+cw/2,yy+ch*.42,cw*.84,H*.05);
    ctx.save();ctx.font='600 '+H*.03+'px sans-serif';const words=t[1].split(' '),ln=[''];words.forEach(w=>{const c=ln[ln.length-1]+(ln[ln.length-1]?' ':'')+w;if(ctx.measureText(c).width>cw*.84&&ln[ln.length-1])ln.push(w);else ln[ln.length-1]=c;});ctx.restore();
    ln.slice(0,3).forEach((l,k)=>txt(l,x+cw/2,yy+ch*.62+k*H*.036,H*.03,'#c3cfda',600));});
};
MS.game=function(){
  mt('GAMEPLAY');mbk();
  const S3=['SMALL','STANDARD','LARGE'],px=W*.06,pw=W*.88;
  gpanel(px,H*.16,pw,H*.27,'MATCH');
  lbl('DIFFICULTY',W*.1,H*.255);seg(W*.36,H*.21,W*.54,H*.09,DIF.map(d=>d.n.split(' ')[0]),G.diff,i=>{G.diff=i;save();});
  lbl('CAMERA',W*.1,H*.365);seg(W*.36,H*.32,W*.54,H*.09,['TOP','WIDE','MED','CLOSE','HIGH','LOW','ACTION','AUTO','G2G'],G.cam,i=>{G.cam=i;save();});
  gpanel(px,H*.46,pw,H*.49,'PITCH & SIZES   ·   STANDARD = REAL-LIFE PROPORTIONS');
  [['PITCH SIZE','pitch'],['GOAL SIZE','goal'],['BALL SIZE','ball'],['PLAYER SIZE','player']].forEach((r,i)=>{const y=H*(.52+i*.105);
    lbl(r[0],W*.1,y+H*.045);seg(W*.36,y,W*.54,H*.09,S3,G.cfg[r[1]],v=>{G.cfg[r[1]]=v;save();applyConfig();});});
};
MS.ctl=function(){
  mt('CONTROLS');mbk();
  [['ASSIST','Pass and shot aiming help','assist'],['CONTROL PRESET','Choose a button scheme','preset'],['LAYOUT EDITOR','Move and resize on-screen buttons','layout'],['TRAINING','Practise passing, shooting, tackling','train'],['CHEAT SHEET','All gestures at a glance','cheat']]
  .forEach((b,i)=>{const y=H*(.17+i*.15),x=W*.1,w=W*.8,h=H*.125;UI.r.push({x,y,w,h,fn:()=>go(b[2])});
    ctx.fillStyle='rgba(255,255,255,.1)';rr(x,y,w,h,H*.03);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.textAlign='left';txt(b[0],x+w*.04,y+h*.36,H*.045,'#fff',800);txt(b[1],x+w*.04,y+h*.72,H*.03,'#9fb0c0',600);txt('\u203a',x+w*.95,y+h*.5,H*.07,'#ffe600',800);ctx.textAlign='center';});
};
MS.adv=function(){
  mt('ADVANCED');mbk();
  gpanel(W*.06,H*.17,W*.88,H*.64,'INPUT & FEEDBACK');
  lbl('HAPTICS',W*.1,H*.3,'Vibration on kicks and tackles');seg(W*.62,H*.27,W*.28,H*.09,['ON','OFF'],G.haptic?0:1,i=>{G.haptic=i?0:1;save();});
  lbl('SWIPE ANYWHERE',W*.1,H*.44,'Swipe gestures on the whole screen');seg(W*.62,H*.41,W*.28,H*.09,['ON','OFF'],G.swAnywhere?0:1,i=>{G.swAnywhere=i?0:1;save();});
  lbl('HINTS',W*.1,H*.58,'Show the tutorial tips again');ubtn(W*.62,H*.55,W*.28,H*.09,G.tut?'ON':'SHOW AGAIN',()=>{G.tut=0;S.tutT=0;save();toast.s='Hints will show again';toast.t=1.6;},0);
  lbl('SET-PIECE CAMERA',W*.1,H*.72,'FC-style angles: free kicks, penalties, corners, goal kicks');seg(W*.62,H*.69,W*.28,H*.09,['ON','OFF'],G.spc?0:1,i=>{G.spc=i?0:1;save();});
};
MS.data=function(){
  mt('DATA');mbk();
  gpanel(W*.2,H*.2,W*.6,H*.5,'SAVED PROGRESS');
  mtx('Resets club selection, records, career, cups, leagues',.4,'#c3cfda',.034);mtx('and every setting back to default.',.46,'#c3cfda',.034);
  ubtn(W*.3,H*.54,W*.4,H*.11,M.conf?'TAP AGAIN TO ERASE':'RESET SAVE',()=>{if(M.conf)resetSave();else M.conf=1;},M.conf?'rgba(255,60,40,.5)':0);
};

/* ===================== 30. SPATIAL UI: frosted glass, depth, glow, floating layers ===================== */
function glass(x,y,w,h,r,o){o=o||{};
  ctx.save();ctx.shadowColor=o.glow||'rgba(0,0,0,.42)';ctx.shadowBlur=o.glow?h*.55:h*.38;ctx.shadowOffsetY=o.glow?0:h*.12;
  const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,o.top||'rgba(255,255,255,.2)');g.addColorStop(1,o.bot||'rgba(255,255,255,.07)');
  ctx.fillStyle=g;rr(x,y,w,h,r);ctx.fill();ctx.shadowColor='transparent';
  rr(x,y,w,h,r);ctx.clip();                                   // specular sheen on the upper half
  const sh=ctx.createLinearGradient(0,y,0,y+h*.55);sh.addColorStop(0,'rgba(255,255,255,'+(o.hl==null?.18:o.hl)+')');sh.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sh;ctx.fillRect(x,y,w,h*.55);ctx.restore();
  ctx.save();const b=ctx.createLinearGradient(x,y,x+w*.55,y+h);b.addColorStop(0,o.bd||'rgba(255,255,255,.8)');b.addColorStop(.5,'rgba(255,255,255,.18)');b.addColorStop(1,'rgba(255,255,255,.08)');
  ctx.strokeStyle=b;ctx.lineWidth=Math.max(1.2,h*.02);rr(x,y,w,h,r);ctx.stroke();ctx.restore();
}
const GOLD={top:'rgba(255,247,200,.97)',bot:'rgba(255,212,60,.92)',glow:'rgba(255,214,70,.55)',hl:.4,bd:'#fffdf0'};
ubtn=function(x,y,w,h,label,fn,col){
  UI.r.push({x,y,w,h,fn});
  const cs=typeof col==='string'?col:'',acc=col===Y||/255,\s?230,\s?0/.test(cs),dng=/255,\s?60,\s?40/.test(cs);
  let o=acc?GOLD:dng?{top:'rgba(255,125,105,.88)',bot:'rgba(196,40,30,.82)',glow:'rgba(255,80,60,.4)'}:cs?{top:cs,bot:cs}:null;
  glass(x,y,w,h,h*.5,o||{});
  fit(label,x+w/2,y+h/2,w*.86,h*.4,acc?'#1b2430':'#fff');
};
let FITCAP=0;const _fit27=fit;fit=function(s,x,y,mw,sz,col,al){if(FITCAP&&sz>FITCAP)sz=FITCAP;return _fit27(s,x,y,mw,sz,col,al);};
seg=function(x,y,w,h,labs,sel,fn){                         // recessed glass track with a floating, glowing selection pill
  const bw=w/labs.length;ctx.font='800 '+h*.38+'px sans-serif';FITCAP=h*.38;                // every label in one row shares the smallest size, so no option looks shrunken
  for(const l of labs){const m=ctx.measureText(String(l)).width;if(m>(bw-4)*.94)FITCAP=Math.min(FITCAP,h*.38*(bw-4)*.94/m);}
  FITCAP=Math.max(FITCAP,h*.38*.74);                         // floor: only a really long label shrinks further on its own
  try{ctx.save();ctx.fillStyle='rgba(0,0,0,.3)';rr(x-4,y-4,w+8,h+8,(h+8)/2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
  labs.forEach((l,i)=>{const bx=x+i*bw+2,bwid=bw-4;
    if(i===sel)ubtn(bx,y,bwid,h,l,()=>fn(i),Y);
    else{UI.r.push({x:bx,y,w:bwid,h,fn:()=>fn(i)});fit(l,bx+bwid/2,y+h/2,bwid*.94,h*.38,'rgba(230,238,255,.82)');}});
  }finally{FITCAP=0;}
};
function gpanel(x,y,w,h,title){glass(x,y,w,h,H*.04,{top:'rgba(255,255,255,.13)',bot:'rgba(255,255,255,.04)',hl:.1});
  if(title){ctx.textAlign='left';txt(title,x+W*.025,y+H*.045,H*.027,'rgba(255,224,110,.95)',800);ctx.textAlign='center';}}
function mtHead(t){ctx.save();ctx.shadowColor='rgba(110,190,255,.65)';ctx.shadowBlur=H*.04;txt(t,W/2,H*.085,H*.07,'#fff',900);ctx.restore();glass(W/2-W*.035,H*.127,W*.07,H*.011,H*.006,{flat:1,top:'rgba(255,230,120,.95)',bot:'rgba(255,200,40,.9)',glow:'rgba(255,214,70,.6)',hl:0});}
drawMenu=function(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b1730');g.addColorStop(1,'#04070d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const t=performance.now()/1000;                              // soft colour orbs drifting behind the glass give it something to refract
  [[.2,.25,'rgba(31,211,122,.38)',.5,0],[.82,.3,'rgba(58,123,255,.36)',.55,2],[.55,.85,'rgba(155,92,255,.32)',.6,4],[.1,.9,'rgba(255,170,60,.18)',.4,1]].forEach(o=>{
    const cx=W*(o[0]+.05*Math.sin(t*.25+o[4])),cy=H*(o[1]+.05*Math.cos(t*.2+o[4])),r=H*o[3],q=ctx.createRadialGradient(cx,cy,0,cx,cy,r);q.addColorStop(0,o[2]);q.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=q;ctx.fillRect(0,0,W,H);});
  ctx.strokeStyle='rgba(255,255,255,.045)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(W/2,H*.55,H*.45,0,TAU);ctx.moveTo(W/2,H*.1);ctx.lineTo(W/2,H);ctx.stroke();
  (MS[M.scr]||MS.main)();
  if(toast.t>0){glass(W*.25,H*.9,W*.5,H*.075,H*.0375,{top:'rgba(30,40,60,.85)',bot:'rgba(10,15,25,.85)'});txt(toast.s,W/2,H*.9375,H*.036,'#ffe600',800);}
};
function orb(cx,cy,r,c){ctx.save();ctx.shadowColor=c;ctx.shadowBlur=r*1.2;const g=ctx.createRadialGradient(cx-r*.3,cy-r*.35,r*.1,cx,cy,r);g.addColorStop(0,'#fff');g.addColorStop(.35,c);g.addColorStop(1,'rgba(0,0,0,.35)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fill();ctx.restore();}
MS.set=function(){
  mt('SETTINGS');mbk();
  const T=[['GAMEPLAY','Difficulty, camera, pitch & sizes','game','#3ddc84'],['SOUND & VISUALS','Volume, crowd, mini-map, replays','opt','#4aa3ff'],['CONTROLS','Assists, presets, layout, training','ctl','#ffb020'],
    ['REFEREE & RULES','Fouls, offside, referee, kits','cust','#ff6a55'],['ADVANCED','Haptics, swipes, hints','adv','#b07cff'],['DATA','Reset saved progress','data','#9fb0c0']];
  const cw=W*.28,ch=H*.31,gx=W*.02,x0=(W-(cw*3+gx*2))/2;
  T.forEach((t,i)=>{const x=x0+(i%3)*(cw+gx),yy=i<3?H*.2:H*.57;
    UI.r.push({x,y:yy,w:cw,h:ch,fn:()=>go(t[2])});
    glass(x,yy,cw,ch,H*.05,{top:'rgba(255,255,255,.17)',bot:'rgba(255,255,255,.05)'});
    orb(x+cw/2,yy+ch*.25,ch*.11,t[3]);
    fit(t[0],x+cw/2,yy+ch*.5,cw*.84,H*.046);
    ctx.save();ctx.font='600 '+H*.029+'px sans-serif';const ln=[''];t[1].split(' ').forEach(w=>{const c=ln[ln.length-1]+(ln[ln.length-1]?' ':'')+w;if(ctx.measureText(c).width>cw*.84&&ln[ln.length-1])ln.push(w);else ln[ln.length-1]=c;});ctx.restore();
    ln.slice(0,3).forEach((l,k)=>txt(l,x+cw/2,yy+ch*.67+k*H*.036,H*.029,'rgba(220,230,245,.8)',600));});
};
MS.ctl=function(){
  mt('CONTROLS');mbk();
  [['ASSIST','Pass and shot aiming help','assist','#3ddc84'],['CONTROL PRESET','Choose a button scheme','preset','#4aa3ff'],['LAYOUT EDITOR','Move and resize on-screen buttons','layout','#ffb020'],['TRAINING','Practise passing, shooting, tackling','train','#ff6a55'],['CHEAT SHEET','All gestures at a glance','cheat','#b07cff']]
  .forEach((b,i)=>{const y=H*(.17+i*.15),x=W*.1,w=W*.8,h=H*.125;UI.r.push({x,y,w,h,fn:()=>go(b[2])});
    glass(x,y,w,h,h*.4,{});orb(x+w*.07,y+h/2,h*.2,b[3]);
    ctx.textAlign='left';txt(b[0],x+w*.14,y+h*.36,H*.045,'#fff',800);txt(b[1],x+w*.14,y+h*.72,H*.03,'rgba(210,222,240,.75)',600);ctx.textAlign='center';
    glass(x+w*.9,y+h*.25,h*.5,h*.5,h*.25,{hl:.1});txt('\u203a',x+w*.9+h*.25,y+h*.5,H*.06,'#ffe600',800);});
};

/* ===================== 31. CALM HOME: title + one hero button; modes live on their own PLAY screen ===================== */
function modeRows(R){R.forEach((b,i)=>{const y=H*(.17+i*.15),x=W*.1,w=W*.8,h=H*.125;UI.r.push({x,y,w,h,fn:b[2]});
  glass(x,y,w,h,h*.4,i===0?{top:'rgba(255,247,200,.3)',bot:'rgba(255,212,60,.1)',glow:'rgba(255,214,70,.3)'}:{});orb(x+w*.07,y+h/2,h*.2,b[3]);
  ctx.textAlign='left';txt(b[0],x+w*.14,y+h*.36,H*.045,'#fff',800);txt(b[1],x+w*.14,y+h*.72,H*.03,'rgba(210,222,240,.75)',600);ctx.textAlign='center';
  glass(x+w*.9,y+h*.25,h*.5,h*.5,h*.25,{hl:.1});txt('\u203a',x+w*.9+h*.25,y+h*.5,H*.06,'#ffe600',800);});}
MS.main=function(){
  // Console-style menu: one consistent inset keeps all four corners aligned.
  const mx=W*.038,my=H*.052,bottom=H-my;
  const logoX=mx,logoSize=H*.115,logoY=my+logoSize*.53;
  ctx.save();
  ctx.font='900 '+logoSize+'px sans-serif';
  ctx.textAlign='left';ctx.textBaseline='middle';
  const logo='PITCH 11',logoW=ctx.measureText(logo).width;
  ctx.shadowColor='rgba(0,0,0,.72)';ctx.shadowBlur=H*.022;ctx.shadowOffsetY=H*.004;
  ctx.fillStyle='#fff';ctx.fillText(logo,logoX,logoY);ctx.restore();

  // Fine gold underline, measured to the actual wordmark width.
  const underlineW=Math.min(logoW,W*.34),underlineY=logoY+logoSize*.57;
  const ug=ctx.createLinearGradient(logoX,0,logoX+underlineW,0);
  ug.addColorStop(0,'rgba(255,190,35,.2)');ug.addColorStop(.28,'#d69b25');
  ug.addColorStop(.72,'#ffe36a');ug.addColorStop(1,'#fff2b5');
  ctx.save();ctx.shadowColor='rgba(255,205,65,.42)';ctx.shadowBlur=H*.014;
  ctx.fillStyle=ug;rr(logoX,underlineY,underlineW,Math.max(2,H*.006),H*.003);ctx.fill();ctx.restore();

  // Compact upper-right HUD. Every displayed value comes from live game state.
  const hx=W*.43,hy=my,hw=W-mx-hx,hh=H*.105;
  glass(hx,hy,hw,hh,hh*.2,{top:'rgba(13,29,27,.78)',bot:'rgba(4,13,15,.72)',hl:.12,
    bd:'rgba(213,185,112,.46)',glow:'rgba(0,0,0,.24)'});
  const liveHud=[
    String(CL[G.club][0]),
    String(FORMS[G.form][0]),
    String(DIF[G.diff].n),
    'W'+G.rec[0]+' D'+G.rec[1]+' L'+G.rec[2]
  ];
  const versionBadge=document.getElementById('p11-version');
  if(versionBadge){
    const badgeWidth=versionBadge.offsetWidth||72;
    const gapStart=logoX+logoW, gapEnd=hx;
    const badgeCenter=(gapStart+gapEnd)*.5;
    const minCenter=gapStart+badgeWidth*.5+8, maxCenter=gapEnd-badgeWidth*.5-8;
    versionBadge.style.left=Math.max(minCenter,Math.min(maxCenter,badgeCenter))+'px';
  }
  const cellW=hw/4;
  liveHud.forEach((value,i)=>{
    const cx=hx+cellW*(i+.5);
    if(i){
      ctx.save();ctx.translate(hx+cellW*i,hy+hh*.5);ctx.rotate(Math.PI/4);
      ctx.fillStyle='rgba(244,211,137,.72)';ctx.fillRect(-H*.004,-H*.004,H*.008,H*.008);ctx.restore();
    }
    fit(value,cx,hy+hh*.53,cellW*.86,H*.032,'#f2eee3');
  });

  // Bottom-left glass navigation, with distinct profile and settings icons.
  const navH=H*.12,navW=W*.18,navGap=W*.018,navY=bottom-navH;
  const drawIcon=(kind,cx,cy,r)=>{
    ctx.save();ctx.strokeStyle='#f2d58e';ctx.lineWidth=Math.max(1.5,r*.09);
    ctx.lineCap='round';ctx.lineJoin='round';
    if(kind==='club'){
      // Larger, simplified three-player silhouette for small mobile displays.
      ctx.fillStyle='#f2d58e';
      ctx.beginPath();ctx.arc(cx,cy-r*.31,r*.205,0,TAU);ctx.fill();
      ctx.beginPath();ctx.arc(cx-r*.43,cy-r*.10,r*.155,0,TAU);ctx.fill();
      ctx.beginPath();ctx.arc(cx+r*.43,cy-r*.10,r*.155,0,TAU);ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx-r*.36,cy+r*.43);
      ctx.bezierCurveTo(cx-r*.35,cy-r*.02,cx+r*.35,cy-r*.02,cx+r*.36,cy+r*.43);
      ctx.quadraticCurveTo(cx,cy+r*.57,cx-r*.36,cy+r*.43);ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx-r*.73,cy+r*.38);
      ctx.bezierCurveTo(cx-r*.72,cy+r*.02,cx-r*.25,cy+r*.02,cx-r*.20,cy+r*.37);
      ctx.quadraticCurveTo(cx-r*.46,cy+r*.52,cx-r*.73,cy+r*.38);ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx+r*.20,cy+r*.37);
      ctx.bezierCurveTo(cx+r*.25,cy+r*.02,cx+r*.72,cy+r*.02,cx+r*.73,cy+r*.38);
      ctx.quadraticCurveTo(cx+r*.46,cy+r*.52,cx+r*.20,cy+r*.37);ctx.fill();
    }else{
      // Bold eight-tooth gear; enlarged teeth and a clear central opening.
      const teeth=8,steps=4;
      ctx.beginPath();
      for(let i=0;i<teeth*steps;i++){
        const a=-Math.PI/2+i*TAU/(teeth*steps);
        const phase=i%steps;
        const rradius=(phase===1||phase===2)?r*.69:r*.49;
        const x=cx+Math.cos(a)*rradius,y=cy+Math.sin(a)*rradius;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.fillStyle='#f2d58e';ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,r*.27,0,TAU);ctx.fillStyle='rgba(5,16,18,.96)';ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,r*.27,0,TAU);ctx.strokeStyle='#f2d58e';ctx.lineWidth=Math.max(1.5,r*.085);ctx.stroke();
    }
    ctx.restore();
  };
  const navButton=(x,label,kind,fn)=>{
    UI.r.push({x,y:navY,w:navW,h:navH,fn});
    glass(x,navY,navW,navH,navH*.28,{top:'rgba(23,40,39,.84)',bot:'rgba(4,14,17,.78)',
      hl:.14,bd:'rgba(215,222,216,.32)'});
    const ir=navH*.31,icx=x+navH*.58,icy=navY+navH*.5;
    drawIcon(kind,icx,icy,ir);
    fit(label,x+navH*1.05,navY+navH*.53,navW-navH*1.12,navH*.34,'#f3f1e9','left');
  };
  navButton(mx,'MY CLUB','club',()=>go('club'));
  navButton(mx+navW+navGap,'SETTINGS','settings',()=>go('set'));

  // Prominent bottom-right PLAY button, matching the glassmorphism navigation style.
  const pw=W*.225,ph=H*.165,px=W-mx-pw,py=bottom-ph;
  UI.r.push({x:px,y:py,w:pw,h:ph,fn:()=>go('play')});
  glass(px,py,pw,ph,ph*.22,{top:'rgba(23,40,39,.84)',bot:'rgba(4,14,17,.78)',
    hl:.14,bd:'rgba(212,175,75,.58)'});
  ctx.save();ctx.strokeStyle='rgba(212,175,75,.76)';ctx.lineWidth=Math.max(1,H*.0016);
  rr(px,py,pw,ph,ph*.22);ctx.stroke();ctx.restore();
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=ph*.16;ctx.shadowOffsetY=ph*.045;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+(H*.074)+'px sans-serif';
  ctx.fillStyle='#f3f1e9';ctx.fillText('PLAY',px+pw*.5,py+ph*.51);
  ctx.restore();
  UI.def=()=>pre('quick');
};
MS.play=function(){
  mt('PLAY');mbk();
  modeRows([['QUICK MATCH','One friendly match, start right away',()=>pre('quick'),'#ffd84a'],['CUP','Knockout tournament',()=>go('cup'),'#4aa3ff'],['LEAGUE SEASON','Play a full season',()=>go('league'),'#3ddc84'],['PENALTY SHOOTOUT','Spot-kick duel',()=>pre('pens'),'#ff6a55'],['PRACTICE','No clock, no offside, free play',()=>pre('prac'),'#b07cff']]);
  UI.def=()=>pre('quick');
};

MS.club=function(){
  mt('MY CLUB');mbk();
  modeRows([['TEAM SETUP','Club, formation, lineup and subs',()=>go('setup'),'#3ddc84'],['CAREER','Build your player career',carGo,'#ffd84a'],['RATINGS','Squad and player ratings',()=>go('rate'),'#4aa3ff'],['CUSTOMISE','Kits, look and feel',()=>go('cust'),'#ff6a55']]);
};

/* default control preset = CLASSIC (one-time switch for saves that were on the FC layout; the CONTROLS menu still changes it) */
const _ld24=load;load=function(){_ld24();if(!G.cl24){G.cl24=1;applyPreset('classic');G.op=0.55;save();}};
const _rs24=resetSave;resetSave=function(){_rs24();G.cl24=1;applyPreset('classic');G.op=0.55;save();};

/* ===================== 32. PAUSE HUB, MATCH SETTINGS, HALF-TIME / FULL-TIME SCREENS ===================== */
function tile(x,y,w,h,t,sub,c,fn){UI.r.push({x,y,w,h,fn});glass(x,y,w,h,H*.045,{});orb(x+w/2,y+h*.27,h*.11,c);fit(t,x+w/2,y+h*.58,w*.86,H*.043);fit(sub,x+w/2,y+h*.8,w*.88,H*.027,'rgba(210,222,240,.75)');}
const _oS=openSubs;openSubs=function(r,manualPause=false){_oS(r,manualPause);M.pp=(r==='half'||r==='full')?'subs':'hub';M.cf2=0;M.st=0;};
const _dS=drawSubs;
function matchSettings(back){
  ctx.fillStyle='rgba(4,8,16,.84)';ctx.fillRect(0,0,W,H);mtHead('MATCH SETTINGS');ubtn(W*.02,H*.03,W*.14,H*.09,'\u2039 BACK',back);
  gpanel(W*.05,H*.15,W*.9,H*.77);
  const AS=['assisted','semi','manual'];
  [['CAMERA',['TOP','WIDE','MED','CLOSE','HIGH','LOW','ACT','AUTO','G2G'],G.cam,i=>{G.cam=i;}],['DIFFICULTY',DIF.map(d=>d.n.split(' ')[0]),G.diff,i=>{G.diff=i;}],['SOUND',['OFF','LOW','MED','HIGH'],G.vol,i=>{G.vol=i;AU.init();AU.vol();}],
   ['CROWD',['OFF','LOW','FULL'],G.crowd,i=>{G.crowd=i;}],['MINI-MAP',['OFF','SMALL','LARGE'],G.radar,i=>{G.radar=i;}],['COMMENTARY',['OFF','ON'],G.com,i=>{G.com=i;}],
   ['PASS BODY ALIGNMENT',['ASSISTED','SEMI','MANUAL'],AS.indexOf(G.assist.pass),i=>{G.assist.pass=AS[i];}]]
  .forEach((r,k)=>{const y=H*(.185+k*.103);lbl(r[0],W*.09,y+H*.038);seg(W*.33,y,W*.58,H*.076,r[1],r[2],i=>{r[3](i);save();});});
}
drawSubs=function(){
  if(M.instr){_dS();return;}
  const back=()=>{if(S.ret==='half'||S.ret==='full')resumeSubs();else M.pp='hub';};
  if(M.pp==='tact'){resumeSubs();return;}
  if(M.pp==='stats'){if(M.st){statsScr();return;}back();if(S.mode!=='subs')return;}
  if(M.pp==='subs'){_dS();ubtn(W*.02,H*.03,W*.14,H*.09,'\u2039 BACK',back);return;}
  if(M.pp==='set'){matchSettings(back);return;}
  ctx.fillStyle='rgba(4,8,16,.8)';ctx.fillRect(0,0,W,H);mtHead('PAUSED');
  glass(W*.2,H*.15,W*.6,H*.075,H*.0375,{top:'rgba(255,255,255,.12)',bot:'rgba(255,255,255,.04)',hl:.08});
  fit(KIT[0].name+'   '+S.score[0]+' - '+S.score[1]+'   '+KIT[1].name+'   \u00b7   '+clockStr(),W/2,H*.1875,W*.56,H*.036,'rgba(255,224,110,.95)');
  ubtn(W*.3,H*.27,W*.4,H*.14,'RESUME',resumeSubs,Y);UI.def=resumeSubs;
  const gap=W*.018,tw=(W*.88-gap*3)/4;
  [['SUBS',S.subs[0]+'/5 used','#3ddc84',()=>{M.pp='subs';}],['TACTICS','Press, line, style','#4aa3ff',()=>{M.instr=1;}],['STATS','Live match stats','#ffb020',()=>{M.pp='stats';M.st=1;}],['SETTINGS','Camera, sound, assists','#b07cff',()=>{M.pp='set';}]]
  .forEach((t,i)=>tile(W*.06+i*(tw+gap),H*.47,tw,H*.25,t[0],t[1],t[2],t[3]));
  ubtn(W*.07,H*.78,W*.26,H*.1,'CAMERA: '+CAMN[G.cam],cycleCam,0);
  ubtn(W*.37,H*.78,W*.26,H*.1,M.cf2?'TAP TO CONFIRM':'RESTART',()=>{if(M.cf2){M.cf2=0;rematch();}else{M.cf2=1;M.conf=0;}},M.cf2?'rgba(255,60,40,.5)':0);
  ubtn(W*.67,H*.78,W*.26,H*.1,M.conf?'TAP TO CONFIRM':'QUIT MATCH',()=>{if(M.conf)quitMatch();else{M.conf=1;M.cf2=0;}},M.conf?'rgba(255,60,40,.5)':0);
};
function endScreen(full){
  ctx.fillStyle='rgba(4,8,16,.74)';ctx.fillRect(0,0,W,H);
  const sa=S.score[0],sb=S.score[1],so=S.so?[S.so.k[0].filter(Boolean).length,S.so.k[1].filter(Boolean).length]:null,forfeited=full&&Number.isInteger(S.forfeitTeam),win=forfeited?1-S.forfeitTeam:sa!==sb?(sa>sb?0:1):so?(so[0]>so[1]?0:1):-1;
  mtHead(full?(forfeited?'MATCH ABANDONED':'FULL TIME'):S.brk.title);
  glass(W*.1,H*.16,W*.8,H*.47,H*.05,{top:'rgba(255,255,255,.14)',bot:'rgba(255,255,255,.05)'});
  fit(KIT[0].name,W*.27,H*.255,W*.3,H*.05);fit(KIT[1].name,W*.73,H*.255,W*.3,H*.05);txt(sa+' - '+sb,W/2,H*.255,H*.12,'#fff',900);
    fit(full?(forfeited?KIT[win].name+' WIN BY FORFEIT':(so?'Penalties '+so[0]+' - '+so[1]+'   ·   ':'')+(win<0?'DRAW':KIT[win].name+' WIN')):'Substitutions used '+S.subs[0]+'/5',W/2,H*.345,W*.7,H*.04,'rgba(255,224,110,.95)');
  const tp=(ST.pos[0]+ST.pos[1])||1,a=Math.round(ST.pos[0]/tp*100);
  [['POSSESSION',a,100-a,'%'],['SHOTS',ST.sh[0],ST.sh[1],''],['ON TARGET',ST.sot[0],ST.sot[1],'']].forEach((r,i)=>{const y=H*(.43+i*.062),tot=r[1]+r[2]||1;
    txt(r[1]+r[3],W*.2,y,H*.04,'#fff',800);txt(r[2]+r[3],W*.8,y,H*.04,'#fff',800);txt(r[0],W/2,y,H*.028,'#9fb0c0',700);
    ctx.fillStyle='rgba(0,0,0,.3)';rr(W*.3,y+H*.027,W*.4,H*.009,H*.0045);ctx.fill();ctx.fillStyle=KIT[1].shirt;rr(W*.3,y+H*.027,W*.4,H*.009,H*.0045);ctx.fill();ctx.fillStyle=KIT[0].shirt;rr(W*.3,y+H*.027,W*.4*(r[1]/tot),H*.009,H*.0045);ctx.fill();});
  const more=()=>{openSubs(S.mode,true);},cl=M.kind==='cup'||M.kind==='league';
  const row=full?[['STATS',()=>{M.st=1;}],['SETTINGS',()=>{more();M.pp='set';}]].concat(cl?[]:[['MENU',finishMatch]]):[['SUBS',()=>openSubs('half')],['TACTICS',()=>{more();M.pp='tact';M.instr=1;}],['STATS',()=>{M.st=1;}],['SETTINGS',()=>{more();M.pp='set';}]];
  const g=W*.015,bw=(W*.8-g*(row.length-1))/row.length;row.forEach((b,i)=>ubtn(W*.1+i*(bw+g),H*.67,bw,H*.1,b[0],b[1],0));
  const hf=full?(cl?finishMatch:rematch):S.brk.fn;ubtn(W*.3,H*.81,W*.4,H*.14,full?(cl?'CONTINUE':'PLAY AGAIN'):S.brk.btn,hf,Y);UI.def=hf;
}
addEventListener('keydown',e=>{if(e.code!=='Escape')return;const m=S.mode;if(m==='subs'){if(M.pp==='hub'&&!M.instr)resumeSubs();else if(M.pp==='set'||M.pp==='stats'||M.pp==='subs'){if(S.ret==='half'||S.ret==='full')resumeSubs();else{M.pp='hub';M.instr=0;M.st=0;}}}else if(m==='play'||m==='kickoff'||m==='whistle'||m==='goal')openSubs(m);});

/* ===================== 33. CAMERAS (goal-to-goal + set-piece angles), SHAKE, SOUND ===================== */
const SHKM=()=>[0,.5,1][G.shk==null?2:G.shk];
const faceSide=a=>V.yw?((-Math.cos(a)*V.sh+Math.sin(a)*V.ch)>=0?1:-1):(Math.cos(a)>=0?1:-1);
const depthOf=p=>(p.x-V.ex)*V.ch+(p.y-V.ey)*V.sh;
const ballBehind=p=>V.yw?depthOf(ball)>=depthOf(p):ball.y<=p.y;
sortOrd=function(){const k=V.yw?(p=>-depthOf(p)):(p=>p.y);for(let i=1;i<22;i++){const v=ORD[i],kv=k(v);let j=i-1;while(j>=0&&k(ORD[j])>kv){ORD[j+1]=ORD[j];j--;}ORD[j+1]=v;}};
function drawEnds(){for(const gx of [PX0-95,PX1+95]){path3([gx,PY0-70,0,gx,PY1+70,0,gx,PY1+70,95,gx,PY0-70,95],3);ctx.closePath();ctx.fillStyle='#243447';ctx.fill();
  for(let i=0;i<CROWD.length;i+=2){const c=CROWD[i],y=PY0-70+(c[0]-(PX0-80))/(PW+160)*(PH+140);pj(gx,y,4+c[1]*88);const z=Math.max(1.5,V.s*2.4);ctx.fillStyle=c[2];ctx.fillRect(V.sx-z/2,V.sy-z/2,z,z);}}}
const SPC={p:null,until:0};
function fcam(ex,ey,tx,ty,hz,lz,fm,k){return{ex,ey,h:Math.atan2(ty-ey,tx-ex),hz,lz,fm,ld:Math.hypot(tx-ex,ty-ey)*k};}
function spParams(rs){const d=dirOf(rs.team),gx=d>0?PX1:PX0,x=rs.x,y=rs.y;
  if(rs.kind==='pen')return fcam(x-d*230,CY,gx,CY,95,0,.95,1.15);                                // well behind the taker, goal and keeper ahead
  if(rs.kind==='fk'){const dx=gx-x,dy=CY-y,m=Math.hypot(dx,dy)||1;return fcam(x-dx/m*250,y-dy/m*250,gx,CY,125,0,.9,1.1);}   // down the line of the shot
  if(rs.kind==='corner'){const tx=gx-d*110,dx=tx-x,dy=CY-y,m=Math.hypot(dx,dy)||1;return fcam(x-dx/m*170,y-dy/m*170,tx,CY,115,0,.9,1.1);}   // from behind the flag across the box
  if(rs.kind==='throw')return fcam(x-d*260,y+(CY-y)*.45,x+d*180,CY,135,0,.9,1.1);               // along the touchline, whole play ahead
  return{ex:rs.x-d*240,ey:rs.y*.5+CY*.5,h:d>0?0:Math.PI,hz:160,lz:0,ld:430,fm:.9};}             // goal kick: behind the keeper, up the pitch
function spCam(){
  if(G.spc===0||H>W||S.mode==='menu'||S.mode==='replay'){SPC.p=null;return false;}
  const rs=S.rs,now=performance.now();
  if(rs&&S.mode==='play'&&rs.team===0&&(rs.kind==='fk'||rs.kind==='pen'||rs.kind==='corner'||rs.kind==='gk'||rs.kind==='throw')){SPC.p=spParams(rs);SPC.until=now+1100;return true;}
  if(SPC.p&&!rs&&S.mode==='play'&&now<SPC.until)return true;                                    // linger so the shot / cross is seen
  SPC.p=null;return false;}
function g2g(a){const d=dirOf(0),bx=cam.px+(cam.x-cam.px)*a,by=cam.py+(cam.y-cam.py)*a,ex=clamp(bx-d*560,PX0-200,PX1+200);   // high and far back, behind the goal when the ball is near it
  return{ex,ey:CY+(by-CY)*.4,h:d>0?0:Math.PI,hz:190,lz:0,ld:Math.max(260,(bx-ex)*d),fm:.95};}
const _cs33=camSet;camSet=function(a){
  const c=SPC.p||(G.cam===8?g2g(a):null);
  if(!c){V.yw=0;_cs33(a);return;}
  V.yw=1;V.ex=c.ex;V.ey=c.ey;V.h=c.h;V.ch=Math.cos(c.h);V.sh=Math.sin(c.h);V.cx=c.ex;V.Cy=0;V.hz=c.hz;
  const L=Math.hypot(c.ld,c.hz-c.lz)||1;V.fy=c.ld/L;V.fz=(c.hz-c.lz)/L;V.K=H*c.fm;};
const _cc33=calcCams;calcCams=function(){_cc33();CAMS[8]=CAMS[1];};
const _ui33=updateInput;updateInput=function(){_ui33();if(V.yw){const mx=I.mx,my=I.my;I.mx=V.ch*(-my)-V.sh*mx;I.my=V.sh*(-my)+V.ch*mx;}};   // stick up = away from the camera
let _pst=0;function hitPost(v){const n=performance.now();if(v<110||n-_pst<250)return;_pst=n;FX.shake=Math.max(FX.shake,clamp(v/70,3,9));AU.post(v);buzz(30);}
const _up33=update;update=function(){_up33();if(S.mode==='goal'&&S.t<.7)FX.shake=Math.max(FX.shake,8*(1-S.t/.7));};
const _ld33=load;load=function(){_ld33();const ni=(v,a,b,d)=>Number.isInteger(v)&&v>=a&&v<=b?v:d;G.mus=ni(G.mus,0,1,1);G.shk=ni(G.shk,0,2,2);G.spc=ni(G.spc,0,1,1);};
const _rs33=resetSave;resetSave=function(){_rs33();G.mus=1;G.shk=2;G.spc=1;save();};
/* --- sound: compressor on the master bus, more effects, menu music --- */
AU.tone=function(f0,f1,dur,pk,type){if(!this.c||!G.vol)return;const c=this.c,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(pk,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(this.m);o.start(t);o.stop(t+dur+.02);};
AU.swell=function(f0,f1,f2,len,pk){if(!this.c||!G.vol)return;const c=this.c,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.nb;s.loop=true;f.type='bandpass';f.Q.value=.7;f.frequency.setValueAtTime(f0,t);f.frequency.linearRampToValueAtTime(f1,t+len*.3);f.frequency.linearRampToValueAtTime(f2,t+len);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+len*.15);g.gain.setValueAtTime(pk,t+len*.45);g.gain.exponentialRampToValueAtTime(.001,t+len);s.connect(f);f.connect(g);g.connect(this.m);s.start(t);s.stop(t+len+.1);};
AU.post=function(v){const k=clamp(v/500,.3,1);window.P11AudioAssets?.play('post',.35+k*.45);this.tone(1250,1100,.5,.3*k,'triangle');this.tone(2400,2200,.35,.16*k);this.noise(.05,'highpass',3000,.4*k);this.tone(180,90,.12,.4*k);};
AU.net=function(){this.noise(.7,'bandpass',1800,.3);this.noise(.4,'highpass',4000,.12);};
AU.bounce=function(v){const k=clamp(v/300,.12,1);window.P11AudioAssets?.play('bounce',.3+k*.42);this.tone(130+k*40,60,.09,.3*k);this.noise(.04,'lowpass',700,.2*k);};
AU.tackle=function(){this.noise(.12,'lowpass',400,.7);this.tone(110,50,.14,.4);};
AU.glove=function(){this.noise(.06,'bandpass',1600,.6);this.tone(150,70,.1,.4);};
AU.head=function(){this.tone(210,90,.09,.4);this.noise(.06,'lowpass',900,.35);};
AU.click=function(){this.tone(900,600,.05,.1,'triangle');};
AU.cheer=function(){this.swell(500,1300,700,3.4,.5);};
AU.groan=function(){this.swell(900,600,330,1.4,.3);};
AU.goalFx=function(){this.net();this.cheer();this.roar(2.6);this.tone(196,196,1.1,.09,'sawtooth');this.tone(247,247,1.1,.07,'sawtooth');};
AU.musOn=function(on,fadeSeconds=0){window.P11AudioAssets?.menuMusic(!!on,!!G.mus,window.P11LoadingMusicRamp?1:.32,fadeSeconds);};
const _tk33=AU.tick;let p11FootstepTimer=0,p11DribbleTimer=0;AU.tick=function(){
  _tk33.call(this);
  if(window.P11LoadingMusicRamp&&!window.P11LoadingMusicRampStarted&&window.P11AudioAssets){window.P11LoadingMusicRampStarted=true;this.musOn(true,15);}
  const walkoutFade=!!(S.mode==='kickoff'&&TOSS.on&&!LU.done&&!LU.musicFadeStarted);
  if(walkoutFade)LU.musicFadeStarted=1;
  const musicIntent=window.P11AudioAssets?.resolveMenuMusicIntent?.(S.mode,walkoutFade,!!(CUT.t>0),S.ret,M.pp==='subs',M.pp==='hub'&&S.ret==='play')||{active:S.mode==='menu'||S.mode==='half'||S.mode==='full'||(S.mode==='subs'&&S.ret!=='whistle'&&S.ret!=='goal'&&S.ret!=='replay'),fadeSeconds:0};
  this.musOn(musicIntent.active,musicIntent.fadeSeconds);
  const active=S.mode==='play'&&!S.prac&&!S.so;
  const selected=active?ctrl:null;
  if(selected&&!selected.out){
    const speed=Math.hypot(selected.vx||0,selected.vy||0);
    if(speed>38){
      p11FootstepTimer-=DT;
      if(p11FootstepTimer<=0){
        window.P11AudioAssets?.play('grassStep',.24);
        p11FootstepTimer=clamp(.52-speed/1050,.24,.46);
      }
    }else p11FootstepTimer=0;
  }else p11FootstepTimer=0;
  const carrier=active?ball.owner:null;
  if(carrier&&!carrier.gk){
    const speed=Math.hypot(carrier.vx||0,carrier.vy||0);
    if(speed>30){
      p11DribbleTimer-=DT;
      if(p11DribbleTimer<=0){
        window.P11AudioAssets?.play('dribble',.2);
        p11DribbleTimer=clamp(.58-speed/1100,.3,.5);
      }
    }else p11DribbleTimer=0;
  }else p11DribbleTimer=0;
};
const _gl33=goal;goal=function(dr){_gl33(dr);AU.goalFx();buzz(60);};
const _ttA=tryTackle;tryTackle=function(p,c){const r=_ttA(p,c);if(r||p===ctrl)AU.tackle();return r;};
const _tkA=take;take=function(p,byHand=false){_tkA(p,byHand);if(p.gk&&S.mode==='play')AU.glove();};
const _apA=airPlay;airPlay=function(p){_apA(p);if(p.jump>0)AU.head();};
const _kA=kick;kick=function(p,vx,vy,vz,sp,r,tx,ty,m){_kA(p,vx,vy,vz,sp,r,tx,ty,m);};
const _uiT=uiTap;uiTap=function(x,y){
  const target=UI.r.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
  p11UiSemanticSound=false;
  p11HoverIndex=-1;const handled=_uiT(x,y);
  if(handled&&target&&!p11UiSemanticSound){
    if(target.kind==='segment')window.P11AudioAssets?.play('uiTransition',.42);
    else AU.click();
  }
  p11UiSemanticSound=false;
};
MS.opt=function(){mt('SOUND & VISUALS');mbk();
  [['TIME OF DAY','tod',['DAY','DUSK','NIGHT']],['SOUND FX','vol',['OFF','LOW','MED','HIGH']],['MUSIC','mus',['OFF','ON']],['CROWD','crowd',['OFF','LOW','FULL']],['SCREEN SHAKE','shk',['OFF','LOW','FULL']],['MINI-MAP','radar',['OFF','SMALL','LARGE']],['GOAL REPLAYS','rep',['OFF','ON']],['COMMENTARY','com',['OFF','ON']],['DOUBLE-TAP SHOT','ftap',['OFF','ON']]]
  .forEach((r,i)=>{const y=H*(.16+i*.085);lbl(r[0],W*.08,y+H*.035);seg(W*.34,y,W*.6,H*.07,r[2],G[r[1]],v=>{G[r[1]]=v;syncDbl();save();AU.init();AU.vol();});});};
/* ===================== 34. STAGE 24: celebration camera, more shake events, bigger sound system ===================== */
/* --- goal celebration camera: low, in front of the scorer, looking back at him as he runs to the fans --- */
const _spc34=spCam;
spCam=function(){
  if(G.spc!==0&&H<=W&&S.mode==='goal'&&S.scorer&&S.t>.5&&S.t<3.4&&!S.so){
    const sc=S.scorer,d=dirOf(S.goalTeam);
    SPC.p=fcam(sc.x-d*120,sc.y+(CY-sc.y)*.25,sc.x,sc.y,22,14,2.7,1);SPC.until=0;return true;}
  return _spc34();};
/* --- more screen shake: tackles, fouls, cards --- */
const _tt34=tryTackle;tryTackle=function(p,c){const r=_tt34(p,c);if(r)FX.shake=Math.max(FX.shake,1.4);return r;};
const _fl34=foul;foul=function(p,o,b){_fl34(p,o,b);FX.shake=Math.max(FX.shake,2.6);if(o&&o.team===0&&!S.prac)AU.boo(.7);};
const _gc34=giveCard;giveCard=function(p,c){_gc34(p,c);if(c===1){FX.shake=Math.max(FX.shake,3);AU.card(0);}else if(c>1){FX.shake=Math.max(FX.shake,6);AU.card(1);}};
/* --- sound: effects bus with stereo pan (follows the ball) + stadium reverb --- */
AU.bus=function(){if(!this.c||this.fb)return;const c=this.c,fb=this.fb=c.createGain();let out=fb;
  if(c.createStereoPanner){const pn=this.pn=c.createStereoPanner();fb.connect(pn);out=pn;}
  out.connect(this.m);
  try{const len=c.sampleRate*1.6|0,ir=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.8);}
    const cv=c.createConvolver();cv.buffer=ir;const wg=c.createGain();wg.gain.value=.2;out.connect(cv);cv.connect(wg);wg.connect(this.m);}catch(_){}};
const _in34=AU.init;AU.init=function(){_in34.call(this);this.bus();};
AU.noise=function(dur,type,fq,pk){if(!this.c||!G.vol)return;const c=this.c,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  s.buffer=this.nb;f.type=type;f.frequency.value=fq;g.gain.setValueAtTime(pk,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(this.fb||this.m);s.start(t,Math.random()*1.5,dur+.05);};
AU.tone=function(f0,f1,dur,pk,type){if(!this.c||!G.vol)return;const c=this.c,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(pk,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(this.fb||this.m);o.start(t);o.stop(t+dur+.02);};
/* --- new sounds --- */
AU.later=function(ms,fn){setTimeout(()=>{if(this.c)fn.call(this);},ms);};
AU.ooh=function(k){k=k||1;this.swell(450,750,500,1.6,.32*k);this.swell(900,1200,800,1.2,.12*k);this.roar(.7*k);};   // near miss / post
AU.gasp=function(){this.noise(.35,'bandpass',1400,.35);this.swell(700,1000,700,.9,.2);};                            // big save
AU.boo=function(k){k=k||1;this.swell(260,200,170,2.2,.4*k);this.tone(140,120,1.6,.05*k,'sawtooth');};
AU.applause=function(len){len=len||2.2;const n=Math.floor(len*14);for(let i=0;i<n;i++)this.later(i*(len*1000/n)+Math.random()*30,()=>this.noise(.05,'highpass',2500+Math.random()*2500,.18*(1-i/n)));this.swell(1500,2200,1600,len,.12);};
AU.horn=function(){this.tone(233,233,.9,.08,'sawtooth');this.tone(349,349,.9,.06,'sawtooth');this.tone(466,466,.9,.05,'square');};
AU.drums=function(){for(let i=0;i<8;i++)this.later(i*260,()=>{this.tone(90,55,.14,.35);if(i%2)this.noise(.05,'bandpass',900,.2);});};
AU.chant=function(){for(let i=0;i<10;i++)this.later(i*300,()=>{this.noise(.06,'bandpass',1800,.1);if(i%4===0)this.tone(80,55,.14,.15);});this.swell(400,600,450,3,.1);};
AU.pass=function(v){const k=clamp(v/450,.2,.8);this.noise(.05,'lowpass',700,.35*k);this.tone(140,80,.06,.22*k);};
AU.lob=function(){this.noise(.1,'lowpass',600,.5);this.tone(120,60,.1,.35);this.noise(.35,'bandpass',900,.05);};
AU.gk=function(){this.tone(70,35,.18,.6);this.noise(.12,'lowpass',450,.7);};
AU.throwIn=function(){this.noise(.18,'bandpass',500,.25);this.tone(160,90,.06,.15);};
AU.swish=function(){this.noise(.3,'bandpass',1100,.12);};
AU.card=function(red){this.whistle(.15,2);this.later(300,()=>{if(red){this.boo(.9);this.gasp();}else this.ooh(.8);});};
AU.sub=function(){this.applause(1.6);this.tone(880,880,.25,.08);this.later(180,()=>this.tone(1320,1320,.3,.07));};
AU.var=function(){for(let i=0;i<3;i++)this.later(i*180,()=>this.tone(1000,1000,.1,.12,'square'));};
/* --- hooks --- */
const _hp34=hitPost;hitPost=function(v){const b=_pst;_hp34(v);if(_pst!==b)AU.ooh(1);};
const _go34=goal;goal=function(dr){_go34(dr);AU.horn();AU.drums();AU.applause(3);};
const _oo34=outOfPlay;outOfPlay=function(){const s=ST.sc;if(s&&!s.on&&!S.so&&ball.shotId===s.id&&ball.last===s.p&&s.xg>.08)AU.ooh(.9);_oo34();};
const _gr34=gkReact;gkReact=function(p){const s=ST.sc,was=s&&s.on;_gr34(p);if(s&&!was&&s.on&&s.t!==p.team&&s.xg>.12)AU.gasp();};
const _ds34=doSub;doSub=function(p,bn){const r=_ds34(p,bn);if(r&&!S.prac)AU.sub();return r;};
const _eh34=endHalf;endHalf=function(){_eh34();if(S.mode==='full')AU.applause(3.2);};
const _ko34=setupKickoff;setupKickoff=function(t){_ko34(t);if(S.clock===0){AU.roar(1.3);AU.swell(500,900,600,1.6,.2);}};
const _sp34=setupPen;setupPen=function(t,sh,so){_sp34(t,sh,so);if(!S.prac){AU.hushT=so?2.5:3.5;if(!so)AU.var();}};
const _kk34=kick;kick=function(p,vx,vy,vz,sp,r,tx,ty,m){const rs=S.rs;_kk34(p,vx,vy,vz,sp,r,tx,ty,m);const v=Math.hypot(vx,vy);
  if(m==='pass'||m==='thru')AU.pass(v);else if(m==='lob')AU.lob();
  if(m==='shot'&&v>650)AU.swish();
  if(rs&&rs.kind==='gk')AU.gk();else if(rs&&rs.kind==='throw')AU.throwIn();
  if(AU.hushT>0&&m==='shot'){AU.hushT=0;AU.roar(1.2);}};
const _tk34=AU.tick;AU.tick=function(){_tk34.call(this);if(!this.c)return;const t=this.c.currentTime;
  if(this.pn){let q=clamp((ball.x-CX)/(PW*.5),-1,1)*.6;if(V.yw&&V.ch<0)q=-q;this.pn.pan.setTargetAtTime(q,t,.05);}
  if(this.hushT>0&&S.mode==='play'){this.hushT-=DT;this.g.gain.setTargetAtTime(.01,t,.1);}else if(this.hushT>0)this.hushT=0;
  this.cT=(this.cT||40)-DT;if(this.cT<=0){this.cT=45+Math.random()*50;if(S.mode==='play'&&G.crowd===2)this.chant();}};
/* ===================== 35. STAGE 24b: cyan ball-holder marker, max 2 pressers ===================== */
function indCol(p){return p.team===0&&ball.owner===p?'#00e5ff':p===ctrl?'#ffe600':null;}   // small circle under the feet: cyan = my player on the ball, yellow = controlled player without it
const _aiP35=aiPlayer;aiPlayer=function(p){
  _aiP35(p);
  const o=ball.owner;
  if(p.team!==1||!o||o.team===1||o===p||p.gk||p.out||S.mode!=='play'||S.rs||S.so||p.sd||p.down||p.dive>0||p.freeze>0||p.stun>0||p.wr>0)return;
  const ti=TI[1];if(p===ti.c1||p===(D9.pp[1]||ti.c2))return;          // only the nearest man + one more may close the carrier down
  const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy);
  if(d<90){const m=d||1;goTo(p,clamp(o.x+dx/m*105,PX0,PX1),clamp(o.y+dy/m*105,PY0,PY1),false);p.sp=false;}   // everyone else holds shape and keeps off him
};
/* ===================== 36. STAGE 24c: stick collects a loose ball ===================== */
function ctrlMagnet(){
  const b=ball,p=ctrl;
  if(!p||p.out||p.gk||p.off||b.owner||S.mode!=='play'||S.rs||b.z>14||p.kcd>0||p.stun>0||p.down||p.sd||p.dive>0||p.freeze>0||p===b.dbl)return;
  const sx=I.mx,sy=I.my,sm=Math.hypot(sx,sy);if(sm<.25)return;                       // only while the stick is pushed
  const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy)||.01;
  if(d>17||(sx*dx+sy*dy)/(sm*d)<.2||Math.hypot(b.vx,b.vy)>330)return;                // close, stick roughly towards it, not a rocket
  for(let i=11;i<22;i++){const q=P[i];if(q.out||q.kcd>0||q.stun>0||q.gk)continue;if(Math.hypot(q.x-b.x,q.y-b.y)<d-1)return;}   // an opponent who is closer wins it
  take(p);
}
const _up36=update;update=function(){_up36();ctrlMagnet();};
/* ===================== 37. STAGE 24d: lock the set-piece taker ===================== */
/* corner, throw-in, free kick, goal kick, penalty, kick-off: the taker stays exactly on the spot until the ball is kicked */
const _up37=update;update=function(){_up37();
  const rs=S.rs,p=rs&&rs.p;
  if(p&&!p.out&&ball.owner===p&&S.mode==='play'){
    if(Math.hypot(p.x-rs.x,p.y-rs.y)>.5){p.x=p.px=rs.x;p.y=p.py=rs.y;}
    p.vx=p.vy=0;p.ix=p.iy=0;p.sp=false;
  }};
const _sw37=switchPlayer;switchPlayer=function(){const rs=S.rs;if(rs&&rs.p&&rs.p.team===0&&ball.owner===rs.p)return;_sw37();};   // no switching away from my taker either
/* ===================== 38. STAGE 25: 4-way swipes, nicer buttons ===================== */
/* skill moves on the SPRINT swipe: up / right / down / left (double-tap = knock-on stays) */
SK8[0]={n:'STEP OVER',a:0,m:1.05,d:0,r:34,t:.5};
SK8[2]={n:'FLIP FLAP',a:.85,m:1.15,d:.06,r:36,t:.55};
SK8[4]={n:'DRAG BACK',a:Math.PI,m:.9,d:0,r:32,t:.5};
SK8[6]={n:'ELASTICO',a:-.85,m:1.2,d:.1,r:36,t:.55};
function icoArrow(x,y,a,s){ctx.beginPath();ctx.moveTo(x+Math.cos(a)*s,y+Math.sin(a)*s);ctx.lineTo(x+Math.cos(a+2.5)*s,y+Math.sin(a+2.5)*s);ctx.lineTo(x+Math.cos(a-2.5)*s,y+Math.sin(a-2.5)*s);ctx.closePath();ctx.fill();}
const BTN_ICO={
  'THROUGH':(x,y,s)=>{ctx.setLineDash([s*.28,s*.22]);ctx.beginPath();ctx.moveTo(x-s*.7,y+s*.8);ctx.quadraticCurveTo(x-s*.1,y+s*.1,x+s*.45,y-s*.5);ctx.stroke();ctx.setLineDash([]);icoArrow(x+s*.62,y-s*.68,Math.atan2(-.7,.65),s*.42);ctx.beginPath();ctx.arc(x-s*.75,y+s*.82,s*.2,0,TAU);ctx.fill();},
  'SHOOT':(x,y,s)=>{ctx.beginPath();ctx.arc(x+s*.1,y,s*.78,0,TAU);ctx.stroke();ctx.beginPath();for(let j=0;j<5;j++){const a=-Math.PI/2+j*TAU/5;ctx[j?'lineTo':'moveTo'](x+s*.1+Math.cos(a)*s*.34,y+Math.sin(a)*s*.34);}ctx.closePath();ctx.fill();for(const k of [-.45,0,.45]){ctx.beginPath();ctx.moveTo(x-s*1.25,y+k*s);ctx.lineTo(x-s*.9,y+k*s);ctx.stroke();}},
  'PASS':(x,y,s)=>{ctx.beginPath();ctx.moveTo(x-s*.9,y-s*.55);ctx.lineTo(x-s*.25,y);ctx.lineTo(x-s*.9,y+s*.55);ctx.moveTo(x-s*.05,y-s*.55);ctx.lineTo(x+s*.6,y);ctx.lineTo(x-s*.05,y+s*.55);ctx.stroke();},
  'SPRINT':(x,y,s)=>{ctx.beginPath();ctx.moveTo(x+s*.2,y-s*1.0);ctx.lineTo(x-s*.6,y+s*.12);ctx.lineTo(x-s*.05,y+s*.12);ctx.lineTo(x-s*.25,y+s*1.0);ctx.lineTo(x+s*.6,y-s*.2);ctx.lineTo(x+s*.05,y-s*.2);ctx.closePath();ctx.fill();},
  '2NDPRESS':(x,y,s)=>{for(const k of [-1,1]){ctx.beginPath();ctx.arc(x+k*s*.42,y-s*.5,s*.28,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(x+k*s*.42,y+s*.85,s*.62,Math.PI*1.18,Math.PI*1.82);ctx.stroke();}},
  'SLIDE':(x,y,s)=>{ctx.beginPath();ctx.arc(x-s*.7,y-s*.55,s*.24,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(x-s*.5,y-s*.3);ctx.lineTo(x+s*.05,y+s*.4);ctx.lineTo(x+s*.9,y+s*.4);ctx.moveTo(x-s*.9,y+s*.75);ctx.lineTo(x+s*.9,y+s*.75);ctx.stroke();},
  'SWITCH':(x,y,s)=>{ctx.beginPath();ctx.arc(x,y,s*.72,Math.PI*1.1,Math.PI*1.85);ctx.stroke();icoArrow(x+s*.72*Math.cos(Math.PI*1.85),y+s*.72*Math.sin(Math.PI*1.85),Math.PI*1.85+Math.PI/2,s*.36);ctx.beginPath();ctx.arc(x,y,s*.72,Math.PI*.1,Math.PI*.85);ctx.stroke();icoArrow(x+s*.72*Math.cos(Math.PI*.85),y+s*.72*Math.sin(Math.PI*.85),Math.PI*.85+Math.PI/2,s*.36);},
};
BTN_ICO['SPRINT+TACKLE']=(x,y,s)=>{BTN_ICO.SPRINT(x-s*.2,y,s*.9);ctx.beginPath();ctx.moveTo(x+s*.45,y+s*.15);ctx.lineTo(x+s*1.0,y+s*.7);ctx.moveTo(x+s*1.0,y+s*.15);ctx.lineTo(x+s*.45,y+s*.7);ctx.stroke();};
function drawCameraControlIcon(x,y,s){
  ctx.save();ctx.translate(x,y);ctx.lineWidth=Math.max(1.7,s*.13);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='rgba(255,255,255,.96)';ctx.fillStyle='rgba(255,255,255,.08)';
  ctx.beginPath();ctx.moveTo(-s*.92,-s*.42);ctx.lineTo(-s*.52,-s*.42);ctx.lineTo(-s*.32,-s*.7);ctx.lineTo(s*.22,-s*.7);ctx.lineTo(s*.42,-s*.42);ctx.lineTo(s*.82,-s*.42);ctx.quadraticCurveTo(s,-s*.42,s,s*.0);ctx.lineTo(s,s*.52);ctx.quadraticCurveTo(s,s*.78,s*.76,s*.78);ctx.lineTo(-s*.76,s*.78);ctx.quadraticCurveTo(-s,s*.78,-s,s*.52);ctx.lineTo(-s,-s*.12);ctx.quadraticCurveTo(-s,-s*.42,-s*.92,-s*.42);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(0,s*.15,s*.34,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.arc(0,s*.15,s*.17,0,TAU);ctx.strokeStyle='rgba(255,255,255,.48)';ctx.lineWidth=Math.max(1,s*.07);ctx.stroke();
  ctx.fillStyle='#a3e635';ctx.beginPath();ctx.arc(s*.62,-s*.13,s*.065,0,TAU);ctx.fill();
  ctx.restore();
}
function drawBtnFace(i,c,r,on,L,col){
  const key=L.replace('|','').replace(/ /g,''),ico=BTN_ICO[key];
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor=col;ctx.shadowBlur=on?r*.62:r*.24;
  let g=ctx.createRadialGradient(c.x-r*.22,c.y-r*.48,r*.06,c.x,c.y,r*1.08);
  g.addColorStop(0,on?'rgba(255,255,255,.72)':'rgba(66,83,111,.92)');
  g.addColorStop(.48,on?'rgba(255,255,255,.34)':'rgba(25,36,54,.94)');
  g.addColorStop(1,on?'rgba(255,255,255,.2)':'rgba(5,9,17,.96)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,r,0,TAU);ctx.fill();
  ctx.shadowBlur=0;ctx.lineWidth=Math.max(2.5,r*.065);ctx.strokeStyle=col;ctx.stroke();
  ctx.lineWidth=Math.max(1,r*.018);ctx.strokeStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.arc(c.x,c.y,r*.86,0,TAU);ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(c.x,c.y,r*.96,0,TAU);ctx.clip();
  g=ctx.createLinearGradient(0,c.y-r,0,c.y+r*.35);
  g.addColorStop(0,'rgba(255,255,255,.34)');g.addColorStop(.38,'rgba(255,255,255,.07)');g.addColorStop(1,'rgba(0,0,0,.16)');
  ctx.fillStyle=g;ctx.fillRect(c.x-r,c.y-r,r*2,r*2);
  ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=Math.max(1,r*.025);
  ctx.beginPath();ctx.arc(c.x,c.y+r*.04,r*.72,.18*Math.PI,.82*Math.PI);ctx.stroke();
  ctx.restore();
  if(ico){ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(2,r*.075);ctx.lineCap='round';ctx.lineJoin='round';ico(c.x,c.y-r*.17,r*.3);ctx.lineCap='butt';}
  if(L.includes('|')){const q=L.split('|');txt(q[0],c.x,c.y+r*.5,r*.2,'#fff',800);txt(q[1],c.x,c.y+r*.74,r*.2,'#fff',800);}   // two short lines fit the round face at a readable size
  else txt(L,c.x,c.y+r*.57,r*(ico?.24:.3),'#fff',800);
  ctx.restore();
}
function drawJoy(bx,by,R,kx,ky,kr,act){
  ctx.save();
  let g=ctx.createRadialGradient(bx,by,R*.1,bx,by,R);g.addColorStop(0,'rgba(255,255,255,.04)');g.addColorStop(1,'rgba(255,255,255,.16)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(bx,by,R,0,TAU);ctx.fill();
  ctx.strokeStyle=act?'rgba(120,220,255,.7)':'rgba(255,255,255,.4)';ctx.lineWidth=Math.max(2.5,R*.04);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(bx,by,R*.66,0,TAU);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.5)';for(const a of [0,1,2,3]){const t=a*Math.PI/2;ctx.beginPath();ctx.moveTo(bx+Math.cos(t)*R*.86,by+Math.sin(t)*R*.86);ctx.lineTo(bx+Math.cos(t)*R*.74+Math.cos(t+1.57)*R*.07,by+Math.sin(t)*R*.74+Math.sin(t+1.57)*R*.07);ctx.lineTo(bx+Math.cos(t)*R*.74-Math.cos(t+1.57)*R*.07,by+Math.sin(t)*R*.74-Math.sin(t+1.57)*R*.07);ctx.closePath();ctx.fill();}
  ctx.shadowColor=act?'rgba(120,220,255,.9)':'rgba(0,0,0,.5)';ctx.shadowBlur=kr*.5;
  g=ctx.createRadialGradient(kx-kr*.3,ky-kr*.35,kr*.1,kx,ky,kr);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,act?'rgba(150,215,255,.75)':'rgba(190,200,215,.6)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(kx,ky,kr,0,TAU);ctx.fill();
  ctx.restore();
}
/* ===================== 39. STAGE 26: MATCH-DAY CUTSCENES ===================== */
/* A scene is only a camera move + player choreography. It runs on the normal pitch renderer (render3D), so pitch, lines, kits, ball and crowd look exactly as in play. Switch: CUTSCENES in rules settings. */
const SC={on:0,k:'',m:'',t:0,d:0,cam:null,mv:null,sk:0,hold:0,koUsed:0,lastInj:null,h:null,x:0,y:0,ft:-1,fp:null,gx:0,dd:1,q:null,a0:0};
const FL26={p:null,o:null},ptag=p=>p.nm||'#'+p.num;
const scOK=()=>!!(G.rf&&G.rf.cut)&&!S.prac&&H<=W&&S.mode!=='menu'&&S.mode!=='replay'&&S.mode!=='full';
function scStart(k,d,cam,mv,sk,hold){SC.on=1;SC.k=k;SC.m=S.mode;SC.t=0;SC.d=d;SC.cam=cam;SC.mv=mv;SC.sk=sk?1:0;SC.hold=hold?1:0;SC.h=P.map(p=>[p.x,p.y]);}
function scEnd(){SC.on=0;SC.cam=null;SC.mv=null;SC.hold=0;SC.sk=0;}
function scWalk(p,tx,ty,sp,fx,fy){                          // walk a player towards a point (same run animation as normal play), face (fx,fy) on arrival
  const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy),st=Math.min(d,sp*DT);
  if(d>.6){p.x+=dx/d*st;p.y+=dy/d*st;p.vx=dx/d*st/DT;p.vy=dy/d*st/DT;p.face=Math.atan2(dy,dx);p.anim+=st*.35;}
  else{p.vx=p.vy=0;if(fx!==undefined)p.face=Math.atan2(fy-p.y,fx-p.x);}
  return d;}
function CUT_ICO(ic,ix,iy,ph){ctx.save();ctx.translate(ix,iy);const s=ph*.26;ctx.lineWidth=ph*.035;ctx.strokeStyle=ctx.fillStyle=CUT.col;
  if(ic===4){ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.stroke();ctx.beginPath();for(let j=0;j<5;j++){const a=-Math.PI/2+j*TAU/5;ctx[j?'lineTo':'moveTo'](Math.cos(a)*s*.45,Math.sin(a)*s*.45);}ctx.closePath();ctx.fill();}
  else if(ic===5){ctx.fillRect(-s*.32,-s,s*.64,s*2);ctx.fillRect(-s,-s*.32,s*2,s*.64);}
  else if(ic===6){ctx.beginPath();ctx.arc(-s*.15,s*.1,s*.62,0,TAU);ctx.stroke();ctx.fillRect(s*.3,-s*.7,s*.9,s*.3);ctx.fillRect(-s*.15,-s*.58,s*.5,s*.18);}
  else if(ic===8){ctx.beginPath();ctx.moveTo(-s*.5,s);ctx.lineTo(-s*.5,-s);ctx.stroke();ctx.beginPath();ctx.moveTo(-s*.5,-s);ctx.lineTo(s*.8,-s*.45);ctx.lineTo(-s*.5,s*.1);ctx.closePath();ctx.fill();}
  else{ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-s*.6);ctx.lineTo(0,0);ctx.lineTo(s*.5,s*.3);ctx.stroke();}
  ctx.restore();}
/* --- cameras (fcam = same projection the set-piece and celebration cameras use) --- */
const camKO=u=>{const e=u*u*(3-2*u),d0=dirOf(0);return fcam(CX-d0*(470-235*e),CY+100*(1-e),CX,CY,155-75*e,0,1.12,1.05);};
const camFoul=u=>{const sg=SC.y<CY?-1:1,dd=dirOf(0);return fcam(SC.x-dd*(170-45*u),SC.y+sg*(115-20*u),SC.x,SC.y,62,6,1.45,1);};
const camPen=u=>{const sg=SC.y<CY?-1:1;return fcam(SC.gx-SC.dd*(210-35*u),CY+sg*(300-35*u),SC.gx-SC.dd*90,CY,90,8,1.0,1);};
const camOff=u=>{const sg=SC.y<CY?-1:1,dd=dirOf(0);return fcam(SC.x-dd*(200-60*u),SC.y+sg*130,SC.x,(SC.y+CY)/2,90,0,1.25,1);};
const camInj=u=>{const q=SC.q,a=SC.a0+u*.9;return fcam(q.x+Math.cos(a)*135,q.y+Math.sin(a)*135,q.x,q.y,58,4,1.7,1);};
const camHT=u=>fcam(CX-145+290*u,PY1+190,CX,PY1+58,82,0,1.22,1.0);
/* --- choreography --- */
function mvFoul(){const x=SC.x,y=SC.y,rx=G.rf.show?REF.x:x,ry=G.rf.show?REF.y:y;       // fouled side gathers round the spot, the fouling side walks over to appeal to the referee
  for(let i=0;i<22;i++){const p=P[i];if(p.out||p.gk)continue;const h=SC.h[i];if(Math.hypot(h[0]-x,h[1]-y)>190)continue;
    if(p===SC.fp){scWalk(p,p.x,p.y,0,x,y);}
    else if(p.team===SC.ft){const d=Math.hypot(h[0]-rx,h[1]-ry)||1,r=26+(i%3)*8;scWalk(p,rx+(h[0]-rx)/d*r,ry+(h[1]-ry)/d*r,34,rx,ry);}
    else{const d=Math.hypot(h[0]-x,h[1]-y)||1,r=26+(i%4)*6;scWalk(p,x+(h[0]-x)/d*r,y+(h[1]-y)/d*r,40,x,y);}}}
function mvInj(){const q=SC.q;if(!q)return;                                              // both sides gather round the injured player
  for(let i=0;i<22;i++){const p=P[i];if(p.out||p.gk||p===q)continue;const h=SC.h[i];if(Math.hypot(h[0]-q.x,h[1]-q.y)>170)continue;
    const a=Math.atan2(h[1]-q.y,h[0]-q.x),r=34+(i%4)*7;scWalk(p,q.x+Math.cos(a)*r,q.y+Math.sin(a)*r,34,q.x,q.y);}}
function mvHT(){for(let i=0;i<22;i++){const p=P[i];if(p.out)continue;const k=i%11,tm=i<11?0:1,dl=k*.12+tm*.25,h=SC.h[i];       // teams walk off to the tunnel in two lines
  if(SC.t<dl){p.vx=p.vy=0;continue;}
  const tx=CX+(tm?16:-16)+((k%3)-1)*5,ty=PY1+46+(k>>2)*6,sp=clamp(Math.hypot(tx-h[0],ty-h[1])/Math.max(.5,SC.d-dl-.5),40,90);
  scWalk(p,tx,ty,sp,CX,PY1+60);}}
/* --- stage 26b: corner, free kick, restarts, full-time celebration --- */
function winner26(){const a=S.score[0],b=S.score[1];if(a!==b)return a>b?0:1;if(S.so){const x=S.so.k[0].filter(Boolean).length,y=S.so.k[1].filter(Boolean).length;if(x!==y)return x>y?0:1;}return -1;}
const camCorner=u=>{const e=u*u*(3-2*u),tx=SC.gx-SC.dd*70,ty=CY,dx=tx-SC.x,dy=ty-SC.y,m=Math.hypot(dx,dy)||1,k=200-80*e;return fcam(SC.x-dx/m*k,SC.y-dy/m*k,tx,ty,105-45*e,0,1.0,1.1);};
const camFK=u=>{const dx=SC.gx-SC.x,dy=CY-SC.y,m=Math.hypot(dx,dy)||1,k=160-45*u;return fcam(SC.x-dx/m*k-dy/m*40,SC.y-dy/m*k+dx/m*40,SC.gx,CY,55,8,1.0,1.05);};
const camFTS=u=>{const a=.4+u*1.1;return fcam(CX+Math.cos(a)*128,CY+Math.sin(a)*128,CX,CY,30,5,1.85,1);};
function inPlace(side){for(let i=0;i<22;i++){const p=P[i];if(p.out)continue;const h=SC.h[i];let sx,sy;
  if(side){sx=h[0];sy=PY1+34;}
  else{const pr=(SC.pre&&SC.pre[i])||h,d=Math.hypot(pr[0]-h[0],pr[1]-h[1])||1,k=Math.min(1,150/d);sx=h[0]+(pr[0]-h[0])*k;sy=h[1]+(pr[1]-h[1])*k;}
  p.x=p.px=sx;p.y=p.py=sy;p.vx=p.vy=0;}}
function mvIn(){for(let i=0;i<22;i++){const p=P[i];if(p.out)continue;const h=SC.h[i],dl=(i%11)*.05;if(SC.t<dl){p.vx=p.vy=0;continue;}
  scWalk(p,h[0],h[1],clamp(Math.hypot(h[0]-p.x,h[1]-p.y)/Math.max(.4,SC.d-dl-.5),20,120),CX,CY);}}
function mvFTS(){const w=winner26();for(let i=0;i<22;i++){const p=P[i];if(p.out)continue;
  if(p.team!==w){p.vx=p.vy=0;continue;}
  const a=i*2.4,r=26+(i%4)*14,d=scWalk(p,CX+Math.cos(a)*r,CY+Math.sin(a)*r,70,CX,CY);   // winners rush to the centre circle and celebrate
  if(d<6&&!(p.at>0))setAct(p,5,0);}}
/* --- triggers --- */
const _fo26=foul;foul=function(p,o,b,context){FL26.p=p;FL26.o=o;try{_fo26(p,o,b,context);}finally{FL26.p=FL26.o=null;}};
const _of26=callOffside;callOffside=function(p){FL26.p=p;FL26.o=null;try{_of26(p);}finally{FL26.p=FL26.o=null;}};
const _ws26=whistleStop;whistleStop=function(sec,big,sub,fn,hurt){
  _ws26(sec,big,sub,fn,hurt);
  if(!scOK()||S.so||hurt||S.mode!=='whistle')return;
  const fp=FL26.p;
  if(big==='FOUL'||big==='PENALTY'){
    SC.x=ball.x;SC.y=ball.y;SC.ft=fp?fp.team:-1;SC.fp=fp;
    if(big==='PENALTY'){S.wt=Math.max(S.wt,3.2);SC.dd=dirOf(1-SC.ft);SC.gx=SC.dd>0?PX1:PX0;scStart('pen',S.wt,camPen,mvFoul,1);cut('PENALTY',(fp?tag(fp)+' fouls in the box':'Foul in the box'),'#ff5a40',6,2.8);}
    else{S.wt=Math.max(S.wt,2.4);scStart('foul',S.wt,camFoul,mvFoul,1);cut('FOUL',fp?tag(fp):'Free kick','#ffd400',6,2.2);}
  }else if(big==='OFFSIDE'&&fp){SC.x=fp.x;SC.y=fp.y;S.wt=Math.max(S.wt,2);scStart('off',S.wt,camOff,null,1);cut('OFFSIDE',tag(fp),'#4aa8ff',6,1.8);}};
const _eh26=endHalf;endHalf=function(){
  const h=S.half;
  if(!scOK()||S.so||S.mode!=='play'||!(h===1||h===3||(h===2&&S.ko&&S.score[0]===S.score[1])))return _eh26();
  for(const p of P){p.ix=p.iy=0;p.sp=false;}I.shoot=false;I.chargeT=0;S.adv=null;S.rs=null;
  S.mode='whistle';S.t=0;S.wt=4.6;S.inj=null;S.after=()=>{scEnd();_eh26();};
  msg(h===2?'FULL TIME':'HALF TIME','',3.4);scStart('ht',S.wt,camHT,mvHT,1);
  cut(h===2?'FULL TIME':'HALF TIME',KIT[0].name+' '+S.score[0]+' - '+S.score[1]+' '+KIT[1].name,'#5cff8a',7,3.8);};
const _gl26=goal;goal=function(dr){_gl26(dr);const sc=S.scorer;if(!sc||S.prac||S.so)return;
  const st=ball.ast&&ball.ast.team===S.goalTeam&&ball.ast!==sc?ball.ast:null;
  cut('GOAL!  '+(gmin()|0)+"'",ptag(sc)+(st?'  -  assist '+ptag(st):''),KIT[S.goalTeam].shirt,4,3.2);};
const _sk26=setupKickoff;setupKickoff=function(t){SC.pre=P.map(p=>[p.x,p.y]);_sk26(t);};
const _up26=update;update=function(){
  if(SC.on&&SC.hold&&S.mode==='kickoff'&&S.t>1.45)S.t=1.45;                         // keep the kick-off sweep on screen
  _up26();
  if(S.mode!=='whistle')SC.lastInj=null;
  if(S.mode!=='kickoff')SC.koUsed=0;
  if(SC.on){SC.t+=DT;if(SC.t>=SC.d||S.mode!==SC.m||H>W)scEnd();else if(SC.mv)SC.mv();}
  if(!scOK()||H>W)return;
  if(S.mode==='kickoff'&&!S.so&&!TOSS.on&&!SC.koUsed&&S.t<1.4){SC.koUsed=1;
    if(S.clock>0){scStart('ret',2.6,null,mvIn,0,1);inPlace(0);}                       // after a goal: players jog back to their kick-off spots
    else if(S.half>1){scStart('walk',4.4,camKO,mvIn,0,1);inPlace(1);}                 // 2nd half / extra time: teams run out from the touchline
    else scStart('ko',3.2,camKO,null,0,1);}
  else if(S.mode==='play'&&S.rs&&!SC.on&&SC.rsUsed!==S.rs){const rs=S.rs;
    if(rs.kind==='corner'){SC.rsUsed=rs;SC.x=rs.x;SC.y=rs.y;SC.dd=dirOf(rs.team);SC.gx=SC.dd>0?PX1:PX0;scStart('corner',2.4,camCorner,null,0);cut('CORNER',tag(rs.p),'#ffd400',8,2.0);}
    else if(rs.kind==='fk'&&rs.wall){const gx=dirOf(rs.team)>0?PX1:PX0;SC.rsUsed=rs;SC.x=rs.x;SC.y=rs.y;SC.gx=gx;scStart('fk',2.4,camFK,null,0);cut('FREE KICK',tag(rs.p)+'  -  '+Math.round(Math.hypot(gx-rs.x,CY-rs.y)/10)+' m','#ffd400',4,2.0);}}
  if(!S.rs)SC.rsUsed=null;
  if(HS.on&&HS.cel&&HS.t>HS_D&&SC.k!=='fts'){scStart('fts',4.4,camFTS,mvFTS,0);cut('FULL TIME',KIT[0].name+' '+S.score[0]+' - '+S.score[1]+' '+KIT[1].name,'#5cff8a',7,3.8);try{AU.cheer();}catch(_){}}
  if(SC.on&&(SC.k==='corner'||SC.k==='fk')&&(!S.rs||S.mode!=='play'))scEnd();
  if(SC.on&&SC.k==='fts'&&!HS.on)scEnd();
  else if(S.mode==='whistle'&&S.inj&&!S.inj.out&&SC.lastInj!==S.inj){const q=S.inj;SC.lastInj=q;SC.q=q;SC.a0=Math.atan2(CY-q.y,CX-q.x)+.5;S.wt=Math.max(S.wt,4.4);
    scStart('inj',S.wt,camInj,mvInj,1);cut('PLAYER DOWN',tag(q)+' - medical team on','#ff8a8a',5,3.6);}};
const _spc39=spCam;spCam=function(){
  if(SC.on&&SC.cam&&G.spc!==0&&H<=W&&S.mode!=='menu'&&S.mode!=='replay'){SPC.p=SC.cam(Math.min(1,SC.t/SC.d));SPC.until=0;return true;}
  return _spc39();};
cv.addEventListener('pointerdown',e=>{if(SC.on&&SC.sk&&S.mode==='whistle'&&S.t>.3){e.stopImmediatePropagation();e.preventDefault();SC.t=SC.d;S.t=Math.max(S.t,S.wt);CUT.t=0;}},true);   // tap to skip
/* throw-in: a ball released from the taker's hands (he stands just outside the line) must start inside the pitch, or a throw down the line is called out again at once */
const _kk40=kick;kick=function(p,vx,vy,vz,spin,rcv,tx,ty,mode){const rs=S.rs;_kk40(p,vx,vy,vz,spin,rcv,tx,ty,mode);
  if(rs&&rs.kind==='throw'&&rs.p===p&&!ball.owner){ball.x=clamp(ball.x,PX0+1,PX1-1);ball.y=clamp(ball.y,PY0+1,PY1-1);}};
/* ===================== 40. STAGE 27: MORE CUTSCENES + CINEMATIC LOOK ===================== */
/* Same machinery as stage 26 (SC scenes = camera move + choreography on the normal renderer). Adds throw-in, goal-kick, penalty stand-off and yellow-card close-ups,
   a goal slow-mo, cinematic letterbox + vignette, a scorer lower-third and a match-intro card. All of it obeys the CUTSCENES setting. */
const ez27=u=>u*u*(3-2*u),lp27=(a,b,t)=>a+(b-a)*t;
const camThrow=u=>{const d=SC.dd,e=ez27(u);return fcam(SC.x-d*(175-55*e),SC.y+(CY-SC.y)*.4,SC.x+d*160,CY,52+14*e,6,1.2,1);};
const camGKick=u=>{const d=SC.dd,e=ez27(u);return fcam(SC.x-d*(52+32*e),CY+(SC.y-CY)*.2+22-10*e,SC.x+d*185,CY,18+12*e,7,1.32,1);};
const camPen2=u=>{const e=ez27(u),d=SC.dd,gx=SC.gx;
  return fcam(lp27(gx+d*190,gx+d*165,e),lp27(CY+70,CY+50,e),lp27(SC.x-d*35,gx-d*75,e),CY,lp27(85,75,e),lp27(10,8,e),lp27(.95,.9,e),1);};   // from behind the keeper's net, sweeping back over the taker's shoulder
const camCard=u=>{const a=SC.a0+ez27(u)*.7,r=92-22*u;return fcam(SC.cx+Math.cos(a)*r,SC.cy+Math.sin(a)*r,SC.cx,SC.cy,25,15,2.3,1);};
function mvCard(){for(let i=0;i<22;i++){const p=P[i];if(p.out||p.gk||p===SC.q)continue;const h=SC.h[i];if(Math.hypot(h[0]-SC.cx,h[1]-SC.cy)>150)continue;   // the others step back into a loose ring and watch
  const a=Math.atan2(h[1]-SC.cy,h[0]-SC.cx),r=44+(i%4)*8;scWalk(p,SC.cx+Math.cos(a)*r,SC.cy+Math.sin(a)*r,30,SC.cx,SC.cy);}
  if(SC.q&&!SC.q.out){SC.q.vx=SC.q.vy=0;}}
/* --- triggers --- */
let CARD27=null;
const _gc27=giveCard;giveCard=function(p,c){const px=p.x,py=p.y;_gc27(p,c);CARD27=c===1?{p,x:px,y:py}:null;};
const _ws27=whistleStop;whistleStop=function(sec,big,sub,fn,hurt){
  const cd=CARD27;CARD27=null;_ws27(sec,big,sub,fn,hurt);
  if(!cd||!scOK()||S.so||hurt||S.mode!=='whistle'||big!=='FOUL')return;
  SC.q=cd.p;SC.cx=cd.x;SC.cy=cd.y;SC.a0=Math.atan2(CY-cd.y,CX-cd.x)+Math.PI*.8;S.wt=Math.max(S.wt,3.2);
  scStart('card',S.wt,camCard,mvCard,1);};
const _go27=goal;goal=function(dr){_go27(dr);if(CUT.title&&CUT.title.indexOf('GOAL')===0)CUT.t=0;   // the scorer lower-third replaces the old top banner
  if(!S.prac&&!S.so&&G.rf&&G.rf.cut)FX.slow=Math.max(FX.slow,.45);};   // ball hits the net: a beat of slow-motion
const _up27=update;update=function(){_up27();
  const want=H<=W&&S.mode!=='menu'&&S.mode!=='replay'&&((SC.on&&G.rf&&G.rf.cut)||(S.mode==='goal'&&S.t>.45&&S.t<3.3&&!S.so&&G.rf&&G.rf.cut))?1:0;
  BAR27.v+=(want-BAR27.v)*.1;if(Math.abs(want-BAR27.v)<.003)BAR27.v=want;
  if(!scOK()||H>W||S.mode!=='play'||!S.rs||SC.on||SC.rsUsed===S.rs)return;
  const rs=S.rs;
  if(rs.kind==='throw'){SC.rsUsed=rs;SC.x=rs.x;SC.y=rs.y;SC.dd=dirOf(rs.team);scStart('throw',1.5,camThrow,null,0);}
  else if(rs.kind==='gk'){SC.rsUsed=rs;SC.x=rs.x;SC.y=rs.y;SC.dd=dirOf(rs.team);scStart('gkick',1.7,camGKick,null,0);}
  else if(rs.kind==='pen'&&!S.so){SC.rsUsed=rs;SC.x=rs.x;SC.y=rs.y;SC.dd=dirOf(rs.team);SC.gx=SC.dd>0?PX1:PX0;scStart('pen2',3.2,camPen2,null,0);}
  if(SC.on&&(SC.k==='throw'||SC.k==='gkick'||SC.k==='pen2')&&!S.rs)scEnd();};
const _up27b=update;update=function(){_up27b();if(SC.on&&(SC.k==='throw'||SC.k==='gkick'||SC.k==='pen2')&&(!S.rs||S.mode!=='play'))scEnd();};
/* --- cinematic look: letterbox, vignette, scorer lower-third, match intro --- */
const BAR27={v:0};
function cine27(){
  if(H>W||S.mode==='menu'||S.mode==='replay')return;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.textBaseline='middle';
  const v=BAR27.v;
  if(v>.01){
    const g=ctx.createRadialGradient(W/2,H/2,H*.38,W/2,H/2,H*.95);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+(.5*v)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const bh=H*.075*v;ctx.fillStyle='#05070b';ctx.fillRect(0,0,W,bh);ctx.fillRect(0,H-bh,W,bh);
    ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(0,bh,W,1);ctx.fillRect(0,H-bh-1,W,1);}
  if(S.mode==='goal'&&S.scorer&&S.t>.6&&S.t<3.3&&!S.so&&G.rf&&G.rf.cut){                      // scorer lower-third slides in from the left
    const sc=S.scorer,t=S.goalTeam,u=S.t-.6,a=clamp(Math.min(u*3.5,(3.3-S.t)*3.5),0,1),e=ez27(a),col=KIT[t].shirt;
    const w=W*.34,h=H*.135,x=W*.05-(1-e)*w*1.1,y=H*.25;
    ctx.globalAlpha=a;
    const gr=ctx.createLinearGradient(x,y,x+w,y);gr.addColorStop(0,'rgba(10,14,24,.94)');gr.addColorStop(1,'rgba(10,14,24,.6)');ctx.fillStyle=gr;rr(x,y,w,h,h*.12);ctx.fill();
    ctx.fillStyle=col;rr(x,y,h*.07,h,h*.035);ctx.fill();
    ctx.textAlign='center';
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(x+h*.62,y+h*.5,h*.3,0,TAU);ctx.fill();txt(String(sc.num),x+h*.62,y+h*.52,h*.3,'#fff',900);
    const og=sc.team!==t,st=ball.ast&&ball.ast.team===t&&ball.ast!==sc?ball.ast:null;
    fit('GOAL  '+(gmin()|0)+"'",x+h*1.1,y+h*.24,w-h*1.25,h*.21,col,'left');
    fit((og?'OWN GOAL  ':'')+(sc.nm||'#'+sc.num).toUpperCase(),x+h*1.1,y+h*.52,w-h*1.25,h*.27,'#fff','left');
    fit(st?'assist  '+ptag(st):KIT[t].name,x+h*1.1,y+h*.82,w-h*1.25,h*.19,'#b9c8d8','left');
    ctx.textAlign='center';ctx.globalAlpha=1;}
  if(SC.on&&SC.k==='ko'&&S.clock===0&&S.half===1&&SC.t<SC.d){                                     // match intro: kits face off
    const u=SC.t/SC.d,a=clamp(Math.min(u*5,(1-u)*5),0,1),e=ez27(clamp(u*4,0,1)),bw=W*.32,bh=H*.1,y=H*.5-bh/2;
    ctx.globalAlpha=a;
    for(let i=0;i<2;i++){const s=i?1:-1,x=i?W/2+W*.05+(1-e)*W*.4:W/2-W*.05-bw-(1-e)*W*.4,col=KIT[i].shirt;
      const g=ctx.createLinearGradient(x,0,x+bw,0);if(i){g.addColorStop(0,col);g.addColorStop(1,'rgba(10,14,24,.9)');}else{g.addColorStop(0,'rgba(10,14,24,.9)');g.addColorStop(1,col);}
      ctx.fillStyle=g;ctx.beginPath();const sk=bh*.35;ctx.moveTo(x+(i?sk:0),y);ctx.lineTo(x+bw,y);ctx.lineTo(x+bw-(i?0:sk),y+bh);ctx.lineTo(x,y+bh);ctx.closePath();ctx.fill();
      fit(String(KIT[i].name).toUpperCase(),x+bw/2,y+bh/2,bw*.8,bh*.42,'#fff');}
    ctx.fillStyle='#0b0f18';ctx.beginPath();ctx.arc(W/2,H*.5,bh*.42,0,TAU);ctx.fill();txt('VS',W/2,H*.5+1,bh*.34,'#fff',900);
    ctx.globalAlpha=1;}
  ctx.restore();}
const _ti27=tint;tint=function(){_ti27();cine27();};
/* ===================== STAGE 27: 20 football menu backgrounds (SOUND & VISUALS > MENU BACKGROUND; 0 = AUTO cycles) ===================== */
Object.assign(G,{mbg:0});
const R27=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};
function pent27(x,y,r,a){ctx.beginPath();for(let i=0;i<5;i++){const b=a+i*TAU/5;i?ctx.lineTo(x+Math.cos(b)*r,y+Math.sin(b)*r):ctx.moveTo(x+Math.cos(b)*r,y+Math.sin(b)*r);}ctx.closePath();ctx.fill();}
function ball27(x,y,r,a){ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();ctx.fillStyle='#f2f2f2';ctx.fillRect(x-r,y-r,r*2,r*2);ctx.fillStyle='#222';pent27(x,y,r*.38,a);for(let i=0;i<5;i++){const b=a+i*TAU/5+TAU/10;pent27(x+Math.cos(b)*r*.85,y+Math.sin(b)*r*.85,r*.3,b);}ctx.restore();}
function grad27(a,b){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,a);g.addColorStop(1,b);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
function glow27(x,y,r,c){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
const chalk27=(a)=>{ctx.strokeStyle='rgba(255,255,255,'+(a||.14)+')';ctx.lineWidth=Math.max(2,H*.006);};
const BG27=[
['MOWED PITCH',t=>{const n=14,w=W/n,o=(t*12)%(w*2);for(let i=-2;i<n+2;i++){ctx.fillStyle=i%2?'#14612f':'#0f5428';ctx.fillRect(i*w+o,0,w+1,H);}chalk27();ctx.beginPath();ctx.arc(W/2,H/2,H*.28,0,TAU);ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();}],
['FLOODLIGHT NIGHT',t=>{grad27('#050914','#0b2a1a');[.12,.38,.62,.88].forEach((x,i)=>{const f=.8+.2*Math.sin(t*3+i*2),g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(255,250,220,'+.3*f+')');g.addColorStop(1,'rgba(255,250,220,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(W*x-8,0);ctx.lineTo(W*x+8,0);ctx.lineTo(W*(x+(x<.5?.2:-.2))+W*.1,H);ctx.lineTo(W*(x+(x<.5?.2:-.2))-W*.1,H);ctx.fill();glow27(W*x,H*.03,H*.25,'rgba(255,250,220,'+.7*f+')');});}],
['CENTRE CIRCLE',t=>{grad27('#0e4a28','#06210f');chalk27(.3);ctx.beginPath();ctx.arc(W/2,H/2,H*.38,0,TAU);ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([H*.03,H*.03]);ctx.lineDashOffset=-t*30;ctx.beginPath();ctx.arc(W/2,H/2,H*.46,0,TAU);ctx.stroke();ctx.setLineDash([]);ball27(W/2,H/2,H*.07,t*.5);}],
['PENALTY BOX',t=>{grad27('#0d4f2a','#07240f');chalk27(.3);const bw=W*.62,bh=H*.62,x=(W-bw)/2,y=H*.5;ctx.strokeRect(x,y,bw,bh);ctx.strokeRect(W/2-bw*.3,y,bw*.6,bh*.4);ctx.beginPath();ctx.arc(W/2,y+bh*.7,H*.15,.2*Math.PI,.8*Math.PI);ctx.stroke();ctx.beginPath();ctx.arc(W/2,y+bh*.62,H*.008,0,TAU);ctx.fillStyle='#fff';ctx.fill();const k=(t*.4)%1;ball27(W/2+(k-.5)*W*.05,y+bh*.62-k*H*.4,H*.03*(1-k*.4),t*5);}],
['GOAL NET',t=>{grad27('#0a1220','#05080f');ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=2;const s=H*.06,sw=Math.sin(t*.8)*4;ctx.beginPath();for(let i=-20;i<W/s+H/s;i++){ctx.moveTo(i*s+sw,0);ctx.lineTo(i*s-H+sw,H);ctx.moveTo(i*s-sw,0);ctx.lineTo(i*s+H-sw,H);}ctx.stroke();ctx.fillStyle='#eee';ctx.fillRect(W*.03,0,W*.012,H);ctx.fillRect(W*.958,0,W*.012,H);ctx.fillRect(0,H*.04,W,H*.012);}],
['BALL PATTERN',t=>{grad27('#0b1a12','#050a07');const r=H*.09,dx=r*1.732,o=(t*14)%dx;for(let row=-1;row<H/(r*1.5)+1;row++)for(let c=-1;c<W/dx+2;c++){const x=c*dx+(row&1?dx/2:0)+o,y=row*r*1.5;ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2;ctx.fillStyle=(c+row*2)%3===0?'rgba(255,255,255,.1)':'rgba(255,255,255,0)';ctx.beginPath();for(let k=0;k<6;k++){const a=k*TAU/6+TAU/12;k?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();}}],
['TUNNEL LIGHT',t=>{ctx.fillStyle='#030304';ctx.fillRect(0,0,W,H);glow27(W/2,H/2,H*(.9+.05*Math.sin(t*2)),'rgba(255,245,200,.85)');ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=3;for(let i=0;i<9;i++){const k=((i+t*.35)%9)/9,s=k*k;ctx.strokeRect(W/2-W*s*.6,H/2-H*s*.6,W*s*1.2,H*s*1.2);}ctx.fillStyle='#000';[-1,1].forEach(d=>{ctx.beginPath();ctx.moveTo(W/2+d*W*.5,0);ctx.lineTo(W/2+d*W*.08,H*.42);ctx.lineTo(W/2+d*W*.08,H*.58);ctx.lineTo(W/2+d*W*.5,H);ctx.fill();});}],
['TACTICS BOARD',t=>{grad27('#123524','#0a2216');chalk27(.18);ctx.strokeRect(W*.05,H*.08,W*.9,H*.84);ctx.beginPath();ctx.moveTo(W/2,H*.08);ctx.lineTo(W/2,H*.92);ctx.stroke();ctx.font='900 '+H*.06+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<14;i++){const x=W*(.1+.8*R27(i)),y=H*(.15+.7*R27(i+50));ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillText(i%2?'X':'O',x,y);}ctx.setLineDash([10,8]);ctx.lineDashOffset=-t*25;ctx.strokeStyle='rgba(255,230,0,.35)';for(let i=0;i<4;i++){const x=W*(.15+.7*R27(i+90)),y=H*(.25+.5*R27(i+70));ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+W*.15,y-H*.25,x+W*.3,y+H*.05*(i-1));ctx.stroke();}ctx.setLineDash([]);}],
['SEARCHLIGHTS',t=>{grad27('#070b1f','#0c1a2e');for(let i=0;i<4;i++){const bx=W*(.15+i*.23),a=Math.sin(t*.6+i*1.7)*.5,g=ctx.createLinearGradient(bx,H,bx+Math.sin(a)*H,0);g.addColorStop(0,'rgba(180,220,255,.4)');g.addColorStop(1,'rgba(180,220,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(bx-10,H);ctx.lineTo(bx+10,H);ctx.lineTo(bx+Math.sin(a)*H*1.2+W*.07,0);ctx.lineTo(bx+Math.sin(a)*H*1.2-W*.07,0);ctx.fill();}}],
['GOLD CONFETTI',t=>{grad27('#101a3a','#1c1030');const C=['#ffd23a','#fff','#ff6a55','#4aa3ff','#3ddc84'];for(let i=0;i<110;i++){const x=W*R27(i)+Math.sin(t+i)*20,y=((R27(i+200)*H+t*H*(.12+.15*R27(i+9)))%(H+20))-10;ctx.save();ctx.translate(x,y);ctx.rotate(t*2+i);ctx.fillStyle=C[i%5];ctx.globalAlpha=.75;ctx.fillRect(-H*.012,-H*.006,H*.024,H*.012*Math.abs(Math.cos(t*3+i)));ctx.restore();}}],
['RAINY MATCH',t=>{grad27('#14201f','#0a1210');ctx.strokeStyle='rgba(180,210,230,.28)';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<150;i++){const x=(W*1.2*R27(i)+t*W*.25)%(W*1.2)-W*.1,y=((R27(i+300)+t*(.9+R27(i)))%1)*H*1.1-H*.05;ctx.moveTo(x,y);ctx.lineTo(x-H*.02,y+H*.05);}ctx.stroke();ctx.fillStyle='rgba(120,160,150,.12)';ctx.fillRect(0,H*.82,W,H*.18);}],
['FIREWORKS',t=>{grad27('#04050f','#0a1a14');for(let b=0;b<4;b++){const k=((t*.35+b*.25)%1),x=W*(.2+.2*b+.05*Math.sin(b*9)),y=H*(.25+.2*R27(b+4));if(k<.7){const e=k/.7,c=['#ffd23a','#ff6a55','#4aa3ff','#3ddc84'][b];ctx.fillStyle=c;ctx.globalAlpha=1-e;for(let i=0;i<28;i++){const a=i*TAU/28,d=H*.3*Math.sqrt(e);ctx.beginPath();ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d+e*e*H*.08,H*.007,0,TAU);ctx.fill();}ctx.globalAlpha=1;}}ctx.fillStyle='#02030a';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,H*.85);ctx.quadraticCurveTo(W/2,H*.7,W,H*.85);ctx.lineTo(W,H);ctx.fill();}],
['SUNSET STADIUM',t=>{const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a1548');g.addColorStop(.55,'#c8512f');g.addColorStop(1,'#f0a640');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);glow27(W/2,H*.62,H*.35,'rgba(255,230,150,.7)');ctx.fillStyle='#0b0a14';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,H*.72);ctx.lineTo(W*.2,H*.66);ctx.lineTo(W*.8,H*.66);ctx.lineTo(W,H*.72);ctx.lineTo(W,H);ctx.fill();[.15,.85].forEach(x=>{ctx.fillRect(W*x-3,H*.3,6,H*.4);ctx.fillRect(W*x-W*.04,H*.24,W*.08,H*.07);});}],
['CROWD LIGHTS',t=>{grad27('#080a12','#10131f');for(let r=0;r<9;r++)for(let c=0;c<48;c++){const i=r*48+c,x=W*(c+.5)/48,y=H*(.12+r*.1)+Math.sin(c/48*Math.PI)*-H*.03,on=Math.sin(t*2+R27(i)*40)>.55;ctx.fillStyle=on?'rgba(255,255,255,.9)':'rgba(80,90,120,.35)';ctx.beginPath();ctx.arc(x,y,on?H*.007:H*.005,0,TAU);ctx.fill();}}],
['FALLING BALLS',t=>{grad27('#0d3a22','#06180e');for(let i=0;i<14;i++){const s=H*(.04+.07*R27(i)),x=W*R27(i+30),y=((R27(i+60)+t*(.04+.06*R27(i+90)))%1)*(H+s*4)-s*2;ctx.globalAlpha=.35+.4*R27(i+120);ball27(x,y,s,t*(R27(i)-.5)*4+i);}ctx.globalAlpha=1;}],
['LED SCOREBOARD',t=>{ctx.fillStyle='#050505';ctx.fillRect(0,0,W,H);const s=H*.045;for(let y=s/2;y<H;y+=s)for(let x=s/2;x<W;x+=s){const v=Math.sin(x/W*9+t*2)*.5+.5,on=Math.abs(y/H-(.5+.25*Math.sin(x/W*7-t*2)))<.05;ctx.fillStyle=on?'rgba(255,170,30,'+(.5+.5*v)+')':'rgba(255,170,30,.07)';ctx.beginPath();ctx.arc(x,y,s*.32,0,TAU);ctx.fill();}}],
['PITCH PERSPECTIVE',t=>{const hz=H*.3;grad27('#0a1530','#16315a');ctx.fillStyle='#0f5a2a';ctx.fillRect(0,hz,W,H-hz);for(let i=0;i<14;i++){const k=((i+t*.5)%14)/14,y0=hz+(H-hz)*k*k,y1=hz+(H-hz)*((k+.035)*(k+.035));ctx.fillStyle=i%2?'rgba(255,255,255,.05)':'rgba(0,0,0,.08)';ctx.fillRect(0,y0,W,Math.max(1,y1-y0));}chalk27(.35);ctx.beginPath();ctx.moveTo(W*.44,hz);ctx.lineTo(-W*.1,H);ctx.moveTo(W*.56,hz);ctx.lineTo(W*1.1,H);ctx.stroke();}],
['TROPHY RAYS',t=>{ctx.fillStyle='#0b0a10';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(255,210,60,.1)';for(let i=0;i<12;i++){const a=t*.15+i*TAU/12;ctx.beginPath();ctx.moveTo(W/2,H*.5);ctx.lineTo(W/2+Math.cos(a)*W,H*.5+Math.sin(a)*W);ctx.lineTo(W/2+Math.cos(a+.13)*W,H*.5+Math.sin(a+.13)*W);ctx.fill();}glow27(W/2,H*.5,H*.5,'rgba(255,200,60,.45)');ctx.fillStyle='#ffd23a';ctx.beginPath();ctx.moveTo(W/2-H*.12,H*.3);ctx.lineTo(W/2+H*.12,H*.3);ctx.quadraticCurveTo(W/2+H*.12,H*.52,W/2,H*.55);ctx.quadraticCurveTo(W/2-H*.12,H*.52,W/2-H*.12,H*.3);ctx.fill();ctx.fillRect(W/2-H*.02,H*.55,H*.04,H*.12);ctx.fillRect(W/2-H*.08,H*.67,H*.16,H*.04);}],
['GRASS BLADES',t=>{grad27('#0c3a1a','#1a7a30');ctx.lineWidth=3;for(let i=0;i<260;i++){const x=W*R27(i),h=H*(.1+.3*R27(i+7)),sw=Math.sin(t*1.5+i)*h*.15;ctx.strokeStyle='hsl('+(110+R27(i+3)*30)+',60%,'+(18+R27(i+5)*22)+'%)';ctx.beginPath();ctx.moveTo(x,H);ctx.quadraticCurveTo(x+sw*.3,H-h*.6,x+sw,H-h);ctx.stroke();}}],
['NEON ARENA',t=>{grad27('#1a0638','#050210');const hz=H*.5;glow27(W/2,hz,H*.5,'rgba(255,60,180,.5)');ctx.fillStyle='#ff3cb4';ctx.beginPath();ctx.arc(W/2,hz,H*.2,Math.PI,0);ctx.fill();ctx.strokeStyle='rgba(60,220,255,.55)';ctx.lineWidth=2;ctx.beginPath();for(let i=-12;i<=12;i++){ctx.moveTo(W/2+i*W*.02,hz);ctx.lineTo(W/2+i*W*.16,H);}for(let i=0;i<10;i++){const k=((i+t*.5)%10)/10,y=hz+(H-hz)*k*k;ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke();ball27(W/2,hz-H*.2+Math.abs(Math.sin(t*2))*-H*.08,H*.05,t*3);}],
];
const mbgPick27=()=>{const k=Number.isInteger(G.mbg)&&G.mbg>=1&&G.mbg<=20?G.mbg-1:Math.floor(performance.now()/15000)%20;return BG27[k];};
function menuBg27(){ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';mbgPick27()[1](performance.now()/1000);ctx.restore();
  ctx.fillStyle='rgba(0,0,0,.32)';ctx.fillRect(0,0,W,H);const v=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.95);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);}
drawMenu=function(){menuBg27();(MS[M.scr]||MS.main)();
  if(toast.t>0){glass(W*.25,H*.9,W*.5,H*.075,H*.0375,{top:'rgba(30,40,60,.85)',bot:'rgba(10,15,25,.85)'});txt(toast.s,W/2,H*.9375,H*.036,'#ffe600',800);}};
MS.opt=function(){mt('SOUND & VISUALS');mbk();
  [['TIME OF DAY','tod',['DAY','DUSK','NIGHT']],['SOUND FX','vol',['OFF','LOW','MED','HIGH']],['MUSIC','mus',['OFF','ON']],['CROWD','crowd',['OFF','LOW','FULL']],['SCREEN SHAKE','shk',['OFF','LOW','FULL']],['MINI-MAP','radar',['OFF','SMALL','LARGE']],['GOAL REPLAYS','rep',['OFF','ON']],['COMMENTARY','com',['OFF','ON']],['DOUBLE-TAP SHOT','ftap',['OFF','ON']]]
  .forEach((r,i)=>{const y=H*(.15+i*.077);lbl(r[0],W*.08,y+H*.031);seg(W*.34,y,W*.6,H*.062,r[2],G[r[1]],v=>{G[r[1]]=v;syncDbl();save();AU.init();AU.vol();});});
  const y=H*(.15+9*.077),h=H*.062,step=d=>{G.mbg=((Number.isInteger(G.mbg)?G.mbg:0)+d+21)%21;save();};
  lbl('MENU BACKGROUND',W*.08,y+H*.031);ubtn(W*.34,y,W*.1,h,'\u2039',()=>step(-1));ubtn(W*.84,y,W*.1,h,'\u203a',()=>step(1));
  txt(G.mbg>=1&&G.mbg<=20?G.mbg+'. '+BG27[G.mbg-1][0]:'AUTO (CYCLES)',W*.64,y+h/2,H*.034,'#fff',800);};
/* ===================== PERSPECTIVE BALL SCALE ===================== */
/* Top-down renderer: scale the ball by its ground-plane depth and airborne height.
   The perspective renderers already use pj()/V.s, so they are deliberately untouched. */
const ballPerspective2D=(y,z=0)=>{
  const depth=clamp((y-PY0)/PH,0,1);
  const ground=0.78+depth*0.44;             // far touchline -> near touchline
  const height=1+Math.min(0.35,Math.max(0,z)/900); // modest airborne growth, applied once only
  return ground*height;
};
const _ballShadowPerspective2D=drawBallShadow;
drawBallShadow=function(a){
  const z=ball.pz+(ball.z-ball.pz)*a,y=ball.py+(ball.y-ball.py)*a;
  const x=ball.px+(ball.x-ball.px)*a,s=0.78+clamp((y-PY0)/PH,0,1)*0.44;
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.translate(-x,-y);
  _ballShadowPerspective2D(a);ctx.restore();
};
const _ballPerspective2D=drawBall;
drawBall=function(a){
  const z=ball.pz+(ball.z-ball.pz)*a,y=ball.py+(ball.y-ball.py)*a;
  const x=ball.px+(ball.x-ball.px)*a,s=ballPerspective2D(y,z);
  ctx.save();ctx.translate(x,y-z*0.55);ctx.scale(s,s);ctx.translate(-x,-(y-z*0.55));
  _ballPerspective2D(a);ctx.restore();
};
