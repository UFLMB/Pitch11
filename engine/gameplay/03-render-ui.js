'use strict';
/* ===================== 8. RENDER ===================== */
let LINES=new Path2D(),NETS=new Path2D();
function rebuildLines(){
  LINES=new Path2D();NETS=new Path2D();
  const L=LINES;
  L.rect(PX0,PY0,PW,PH);L.moveTo(CX,PY0);L.lineTo(CX,PY1);
  L.moveTo(CX+ARC_R,CY);L.arc(CX,CY,ARC_R,0,TAU);
  L.rect(PX0,CY-PEN_WIDTH/2,PEN_DEPTH,PEN_WIDTH);L.rect(PX1-PEN_DEPTH,CY-PEN_WIDTH/2,PEN_DEPTH,PEN_WIDTH);
  L.rect(PX0,CY-SIX_WIDTH/2,SIX_DEPTH,SIX_WIDTH);L.rect(PX1-SIX_DEPTH,CY-SIX_WIDTH/2,SIX_DEPTH,SIX_WIDTH);
  const a=Math.acos((PEN_DEPTH-SPOT)/ARC_R);
  L.moveTo(PX0+SPOT+ARC_R*Math.cos(-a),CY+ARC_R*Math.sin(-a));L.arc(PX0+SPOT,CY,ARC_R,-a,a);
  L.moveTo(PX1-SPOT+ARC_R*Math.cos(Math.PI-a),CY+ARC_R*Math.sin(Math.PI-a));L.arc(PX1-SPOT,CY,ARC_R,Math.PI-a,Math.PI+a);
  L.moveTo(PX0+10,PY0);L.arc(PX0,PY0,10,0,Math.PI/2);
  L.moveTo(PX1,PY0+10);L.arc(PX1,PY0,10,Math.PI/2,Math.PI);
  L.moveTo(PX1-10,PY1);L.arc(PX1,PY1,10,Math.PI,Math.PI*1.5);
  L.moveTo(PX0,PY1-10);L.arc(PX0,PY1,10,Math.PI*1.5,TAU);
  for(const gx of [PX0-GOALD,PX1]){                        // net mesh
    for(let x=0;x<=GOALD;x+=5.5){NETS.moveTo(gx+x,CY-GOALH);NETS.lineTo(gx+x,CY+GOALH);}
    for(let y=-GOALH;y<=GOALH+0.1;y+=5.5){NETS.moveTo(gx,CY+y);NETS.lineTo(gx+GOALD,CY+y);}
  }
}
function drawPitch(){
  // Broadcast-quality grass base: soft longitudinal light falloff, mowing lanes and a restrained edge vignette.
  ctx.fillStyle='#173d27';ctx.fillRect(PX0-18,PY0-18,PW+36,PH+36);
  const turf=ctx.createLinearGradient(PX0,PY0,PX1,PY1);
  turf.addColorStop(0,'#286b38');turf.addColorStop(.48,'#347f40');turf.addColorStop(1,'#225d32');
  ctx.fillStyle=turf;ctx.fillRect(PX0,PY0,PW,PH);
  ctx.save();ctx.beginPath();ctx.rect(PX0,PY0,PW,PH);ctx.clip();
  const sw=PW/14;
  for(let i=0;i<14;i++){
    const x=PX0+i*sw;
    ctx.fillStyle=i%2?'rgba(8,35,18,.075)':'rgba(190,235,170,.045)';
    ctx.fillRect(x,PY0,sw,PH);
    ctx.fillStyle='rgba(255,255,255,.018)';ctx.fillRect(x+sw*.12,PY0,Math.max(1,sw*.018),PH);
  }
  const edge=ctx.createRadialGradient(CX,CY,Math.min(PW,PH)*.2,CX,CY,Math.max(PW,PH)*.72);
  edge.addColorStop(0,'rgba(0,0,0,0)');edge.addColorStop(1,'rgba(0,18,8,.23)');
  ctx.fillStyle=edge;ctx.fillRect(PX0,PY0,PW,PH);
  ctx.restore();
  ctx.strokeStyle='rgba(210,245,215,.13)';ctx.lineWidth=7;ctx.strokeRect(PX0+1.5,PY0+1.5,PW-3,PH-3);
  ctx.lineJoin='round';ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=2;ctx.stroke(LINES);
  ctx.fillStyle='rgba(255,255,255,.92)';
  for(const [x,y] of [[CX,CY],[PX0+SPOT,CY],[PX1-SPOT,CY]]){ctx.beginPath();ctx.arc(x,y,2.6,0,TAU);ctx.fill();}
  ctx.fillStyle='rgba(255,255,255,.14)';
  ctx.fillRect(PX0-GOALD,CY-GOALH,GOALD,GOALH*2);ctx.fillRect(PX1,CY-GOALH,GOALD,GOALH*2);
  ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=0.5;ctx.stroke(NETS);
  ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.beginPath();
  ctx.moveTo(PX0,CY-GOALH);ctx.lineTo(PX0-GOALD,CY-GOALH);ctx.lineTo(PX0-GOALD,CY+GOALH);ctx.lineTo(PX0,CY+GOALH);
  ctx.moveTo(PX1,CY-GOALH);ctx.lineTo(PX1+GOALD,CY-GOALH);ctx.lineTo(PX1+GOALD,CY+GOALH);ctx.lineTo(PX1,CY+GOALH);ctx.stroke();
  ctx.fillStyle='#fff';ctx.strokeStyle='#999';ctx.lineWidth=0.8;
  for(const gx of [PX0,PX1])for(const s of [-1,1]){ctx.beginPath();ctx.arc(gx,CY+s*GOALH,3,0,TAU);ctx.fill();ctx.stroke();}
  for(const [x,y] of [[PX0,PY0],[PX1,PY0],[PX1,PY1],[PX0,PY1]]){   // corner flags
    ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-11);ctx.stroke();
    ctx.fillStyle='#ffd400';ctx.beginPath();ctx.moveTo(x,y-11);ctx.lineTo(x+(x<CX?6:-6),y-8.5);ctx.lineTo(x,y-6);ctx.fill();
  }
}
function animInfo(p){
  const u=pz(p), ak=u?p.ak:0;
  const sp=Math.hypot(p.vx,p.vy);
  const pace=clamp(sp/70,0,1.15), gait=clamp(sp/50,0,1);
  const t=p.anim,cq=Math.cos(t),sq=Math.sin(t);
  const hi=(0.5+0.36*pace)*gait, kn=(0.72+0.5*pace)*gait;
  let Lh=hi*sq,Lk=-kn*Math.max(0,cq),Rh=-hi*sq,Rk=-kn*Math.max(0,-cq);
  let lsh=(0.5+0.5*pace)*gait*sq,rsh=-lsh,el=0.45*gait;
  let rot=clamp(sp/200,0,.16)+pace*0.07,bob=Math.abs(sq)*Math.min(1.2,sp/60),lift=0,scale=1,wob=0;
  if(gait<0.04){rot=0;bob=0;lsh=rsh=0;el=0.15+0.03*Math.sin(S.t*3+p.role);}   // idle breathing
  if(p.dive>0)return{dive:true,down:false,u,ak,rot:0,bob:0,lift:0,scale:1,wob:0,L:{hip:0,knee:0},R:{hip:0,knee:0},arms:{L:{sh:0,el:0},R:{sh:0,el:0}}};
  if(p.down)return{down:true,dive:false,u,ak,rot:0,bob:0,lift:0,scale:1,wob:0,L:{hip:0,knee:0},R:{hip:0,knee:0},arms:{L:{sh:0,el:0},R:{sh:0,el:0}}};
  switch(ak){
    case 1: case 2:{const kA=-(u<.45?-.9+2.2*(u/.45):1.3-1.1*((u-.45)/.55)),kK=-(u<.45?.6*u/.45:.3+.55*((u-.45)/.55));
      Rh=kA;Rk=kK;Lh=Lh*(.45+.55*(1-u));Lk=Lk*.4;lsh=0.5;rsh=-0.9;el=0.5;rot=-0.12*Math.sin(u*Math.PI);break;}
    case 3:{Lh=0.5;Lk=0;Rh=-1.3;Rk=0.35;lsh=0.5;rsh=-0.5;el=0.4;rot=1.1*Math.sin(u*Math.PI);break;}
    case 5:{lsh=2.6;rsh=2.6+0.3*Math.sin(S.t*14);el=-0.4;rot=0;bob=Math.abs(Math.sin(S.t*8+p.role))*3;break;}
    case 6:{rot=1.2*(1-u);scale=0.8+0.2*u;bob=0;break;}
  }
  if(p.jump>0){lift=Math.sin(clamp(p.jump/.5,0,1)*Math.PI)*7;lsh=2.4;rsh=2.4;el=-0.4;}   // header jump / raised arms
  if(p.skill>0){wob=Math.sin(p.skill*30);rot+=wob*0.18;bob+=Math.abs(wob)*1.5;}
  return{dive:false,down:false,u,ak,rot,bob,lift,scale,wob,L:{hip:Lh,knee:Lk},R:{hip:Rh,knee:Rk},arms:{L:{sh:lsh,el},R:{sh:rsh,el}}};
}
// Legacy 2D player-body renderers are intentionally hard-disabled.
// All match player bodies must come from the skinned 3D model renderer.
function drawPlayer(p,a){return;}
function drawPlayerOld(p,a){return;}

function drawBallShadow(a){
  const b=ball,x=b.px+(b.x-b.px)*a,y=b.py+(b.y-b.py)*a,z=b.pz+(b.z-b.pz)*a,s=1+Math.min(0.35,z/450);
  ctx.fillStyle='rgba(0,0,0,'+(0.32/(1+z/60))+')';
  ctx.beginPath();ctx.ellipse(x+1+z*0.12,y+1.5+z*0.08,BVR*1.1*s,BVR*0.8*s,0,0,TAU);ctx.fill();
}
function drawBall(a){
  const b=ball,x=b.px+(b.x-b.px)*a,y=b.py+(b.y-b.py)*a-(b.pz+(b.z-b.pz)*a)*0.55,sq=b.sq>0?b.sq/0.1:0,sp=Math.hypot(b.vx,b.vy);
  if(sp>300&&!b.owner){ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=BVR*1.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-b.vx*0.012,y-b.vy*0.012);ctx.stroke();ctx.lineCap='butt';}
  ctx.fillStyle='#fff';ctx.strokeStyle='#222';ctx.lineWidth=0.7;ctx.beginPath();ctx.ellipse(x,y,BVR*(1+0.3*sq),BVR*(1-0.25*sq),0,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='#222';for(let i=0;i<2;i++){const r=b.rot+i*3.3;ctx.beginPath();ctx.arc(x+Math.cos(r)*1.8,y+Math.sin(r)*1.8,i?1:1.5,0,TAU);ctx.fill();}
}
function drawMarker(a){
  const p=ctrl;if(!p||S.mode==='menu')return;
  const x=p.px+(p.x-p.px)*a,y=p.py+(p.y-p.py)*a;
  if(I.shoot&&ball.owner===p){                             // shot power ring
    const c=clamp(I.chargeT/0.85,0,1);
    ctx.strokeStyle=c>0.85?'#ff5030':'#fff';ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(x,y,15,-Math.PI/2,-Math.PI/2+c*TAU);ctx.stroke();
    ctx.strokeStyle='rgba(90,255,120,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,15,-Math.PI/2+0.66*TAU,-Math.PI/2+0.86*TAU);ctx.stroke();
  }
}
function drawModelPlayerOverlay2D(p,a){
  if(p!==ctrl)return;
  const x=p.px+(p.x-p.px)*a,y=p.py+(p.y-p.py)*a;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#a3e635';ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(4,-11);ctx.lineTo(-4,-11);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(-8,-23,16,2);
  ctx.fillStyle=p.winded?'#ff5030':p.stam<.3?'#ffc040':'#a3e635';ctx.fillRect(-8,-23,16*p.stam,2);
  ctx.restore();
}
function render2D(a){
  const cw=cv.width,ch=cv.height;
  ctx.setTransform(1,0,0,1,0,0);
  const vh=cam.pv+(cam.v-cam.pv)*a,sc=ch/vh,vw=cw/sc;
  let cx=cam.px+(cam.x-cam.px)*a,cy=cam.py+(cam.y-cam.py)*a;
  cx=vw>=WW?WW/2:clamp(cx,vw/2,WW-vw/2);cy=vh>=WH?WH/2:clamp(cy,vh/2,WH-vh/2);
  const stadiumTop=!!(window.P11Stadium&&window.P11Stadium.ready);
  if(stadiumTop){window.P11Stadium.renderTopDown(cx,cy,vw,vh,W,H,{timeOfDay:G.tod|0,players:P,selectedPlayer:ctrl,alpha:a,delta:window.P11Stadium.mobile?1/30:DT,ball,ballOwner:ball.owner,restart:S.rs});ctx.clearRect(0,0,cw,ch);}
  else{ctx.fillStyle='#24602f';ctx.fillRect(0,0,cw,ch);}
  ctx.setTransform(sc,0,0,sc,cw/2-cx*sc,ch/2-cy*sc);
  if(FX.shake>0)ctx.translate((Math.random()-0.5)*FX.shake*2*SHKM(),(Math.random()-0.5)*FX.shake*2*SHKM());
  if(!stadiumTop)drawPitch();
  if(!stadiumTop)drawBallShadow(a);
  for(let i=1;i<22;i++){const v=ORD[i];let j=i-1;while(j>=0&&ORD[j].y>v.y){ORD[j+1]=ORD[j];j--;}ORD[j+1]=v;}   // depth sort (insertion, nearly sorted)
  drawMarker(a);
  // Player bodies are rendered exclusively by the 3D skinned-model renderer.
  // Keep only the lightweight 2D selection/stamina overlay; never draw legacy 2D bodies.
  for(const p of ORD)if(!p.out)drawModelPlayerOverlay2D(p,a);
  for(const p of P)if(p.down){const x=p.x,y=p.y;ctx.fillStyle='#fff';ctx.fillRect(x-5,y-24,10,10);ctx.fillStyle='#e22';ctx.fillRect(x-1.5,y-23,3,8);ctx.fillRect(x-4,y-20.5,8,3);}   // medic cross
  if(!stadiumTop)drawBall(a);
  drawParts();
  drawRet2();
  drawHud();
}

/* ===================== 9. UI ===================== */
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function txt(s,x,y,size,col,weight){ctx.font=(weight||700)+' '+size+'px sans-serif';ctx.fillStyle=col||'#fff';ctx.fillText(s,x,y);}
function banner(big,sub,alpha){
  ctx.save();ctx.globalAlpha=alpha;const bx=W*.24,bw=W*.52,g=ctx.createLinearGradient(bx,0,bx+bw,0);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.18,'rgba(0,0,0,.55)');g.addColorStop(.82,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.fillRect(bx,H*0.33,bw,H*0.28);
  fit(big,W/2,H*0.45,bw*.6,H*0.1,'#fff');if(sub)fit(sub,W/2,H*0.56,bw*.6,H*0.045,'#ffe600');ctx.restore();
}
function panel(title,lines){
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,W,H);
  txt(title,W/2,H*0.18,H*0.13,'#fff',900);
  lines.forEach((l,i)=>txt(l,W/2,H*0.34+i*H*0.075,H*0.045,i===0?'#ffe600':'#dfe7ee',i===0?800:600));
}
function ubtn(x,y,w,h,label,fn,col){                       // canvas button; hit-tested in uiTap
  UI.r.push({x,y,w,h,fn});
  ctx.fillStyle=col||'rgba(255,255,255,.18)';rr(x,y,w,h,h*.25);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.stroke();
  fit(label,x+w/2,y+h/2,w*.9,h*.4);
}
function clockStr(){
  if(S.prac)return 'PRACTICE';const h=S.half;if(h>4)return 'PENALTIES';
  const base=plen(),periodLabel=['','1ST','2ND','ET1','ET2'][h];
  if(S.clock>=base){
    const label=PITCH11Law.addedTimeClockLabel({clock:S.clock,regulationSeconds:base,secondsPerMatchMinute:periodSecondsPerMatchMinute(),baseMinute:PERIOD.base[h]+PERIOD.mins[h]});
    return label+'  '+periodLabel;
  }
  const sec=gmin()*60,mm=Math.floor(sec/60),ss=Math.floor(sec%60);
  return (mm<10?'0':'')+mm+':'+(ss<10?'0':'')+ss+'  '+periodLabel;
}
function drawStats(o){                                     // stat bars for the tapped pitch or bench player
  const rh=H*0.057,y0=H*0.14+7.9*rh,fs=rh*0.5;
  if(!o||!o.st){txt('Tap a player to see stats',W*0.74,y0+rh*1.2,fs,'#9fb0c0',600);return;}
  const nm=(o.nm||'#'+o.num)+'  '+o.pos;
  fit(nm+'   OVR '+ovr(o.st),W*0.74,y0,W*0.4,fs,'#ffe600');
  ctx.textAlign='left';
  STK.forEach((k,i)=>{
    const cx=W*(i<4?0.55:0.75),cy=y0+rh*0.9+(i%4)*rh*0.62,v=o.st[k];
    txt(STL[i],cx,cy,fs*0.9,'#dfe7ee',700);
    ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(cx+W*0.045,cy-rh*0.16,W*0.12,rh*0.32);
    ctx.fillStyle=v>0.75?'#5cff8a':v>0.55?'#ffc040':'#ff6040';ctx.fillRect(cx+W*0.045,cy-rh*0.16,W*0.12*v,rh*0.32);
  });
  ctx.textAlign='center';
}
function drawInstr(){
  UI.r.length=0;UI.def=null;
  ctx.fillStyle='rgba(6,12,20,.97)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.textBaseline='middle';
  txt('QUICK INSTRUCTIONS',W/2,H*0.08,H*0.05,'#ffe600',900);
  const presets=[['BALANCED','balanced'],['ATTACK','attack'],['DEFEND','defend'],['PARK BUS','park'],['ALL-OUT','allout']];
  presets.forEach((p,i)=>{
    const w=W*0.6,h=H*0.07,x=W/2-w/2,y=H*(0.16+i*0.082);
    const on=TC[0].press===TACT[p[1]].press&&TC[0].line===TACT[p[1]].line&&TC[0].tempo===TACT[p[1]].tempo;
    ctx.fillStyle=on?'rgba(255,230,0,.4)':'rgba(255,255,255,.1)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
    txt(p[0]+(on?'   ●':''),W/2,y+h/2,h*0.4,on?'#000':'#fff',on?900:700);
    UI.r.push({x,y,w,h,fn:()=>applyTact(p[1])});
  });
  const mini=(label,field)=>{
    txt(label,W*0.18,H*0.60,H*0.032,'#fff',700);
    const names=field==='line'?['DEEP','NORMAL','HIGH']:['LOW','MID','HIGH'];
    for(let n=0;n<3;n++){
      const w=W*0.17,x=W*(0.28+n*0.18),yy=H*0.64;
      const on=TC[0][field]===n;
      ctx.fillStyle=on?'rgba(90,255,120,.4)':'rgba(255,255,255,.1)';ctx.fillRect(x,yy,w,H*0.05);
      ctx.strokeStyle='rgba(255,255,255,.4)';ctx.strokeRect(x,yy,w,H*0.05);
      txt(names[n],x+w/2,yy+H*0.025,H*0.028,on?'#000':'#fff',on?900:700);
      UI.r.push({x,y:yy,w,h:H*0.05,fn:()=>bumpTact(field,n-TC[0][field])});
    }
  };
  mini('PRESSING','press');
  mini('LINE HEIGHT','line');
  ubtn(W*0.32,H*0.82,W*0.36,H*0.1,'BACK',()=>{M.instr=0;});UI.def=()=>{M.instr=0;};
}
function drawSubs(){
  if(M.instr){drawInstr();return;}
  ctx.fillStyle='rgba(0,0,0,.84)';ctx.fillRect(0,0,W,H);
  txt('SUBSTITUTIONS  '+S.subs[0]+'/5   ·   WINDOWS  '+S.subWindows[0]+'/3',W/2,H*0.07,H*0.06,'#fff',900);
  const rh=H*0.057,y0=H*0.14,fs=rh*0.55,atStoppage=S.ret==='whistle';
  txt('ON THE PITCH  (tap one, then a bench player)',W*0.28,y0-rh*0.5,fs*0.9,'#ffe600',700);txt('BENCH',W*0.74,y0-rh*0.5,fs*0.9,'#ffe600',700);
  ctx.textAlign='left';
  for(let r=0;r<11;r++){
    const p=P[r],y=y0+r*rh,x=W*0.06,w=W*0.44;
    UI.r.push({x,y,w,h:rh-2,fn:()=>{if(!p.out){S.sel=p;S.pv=p;}}});
    ctx.fillStyle=S.sel===p?'rgba(255,230,0,.35)':'rgba(255,255,255,.1)';ctx.fillRect(x,y,w,rh-2);
    fit((p.nm||'#'+p.num)+'  '+p.pos+'  '+ovr(p.st)+((S.subExits.some(e=>e.player===p)||S.subExitRunners.some(e=>e.player===p))?'  LEAVING':p.substitutionPending?'  SUB DELAYED':p.tempOff?'  OFF FIELD':p.out?'  SENT OFF':p.inj?'  INJURED':p.yc?'  YELLOW':''),x+8,y+rh/2,w*.6,fs,p.out?'#888':'#fff','left');
    ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(x+w*0.64,y+rh*0.3,w*0.32,rh*0.35);
    ctx.fillStyle=p.fat>0.5?'#ff6040':p.fat>0.3?'#ffc040':'#5cff8a';ctx.fillRect(x+w*0.64,y+rh*0.3,w*0.32*(1-p.fat),rh*0.35);
  }
  BENCH[0].forEach((bn,i)=>{
    const y=y0+i*rh,x=W*0.54,w=W*0.4;
    UI.r.push({x,y,w,h:rh-2,fn:()=>{if(S.sel&&doSub(S.sel,bn)){S.sel=null;S.pv=null;}else S.pv=bn;}});
    ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(x,y,w,rh-2);fit((bn.nm||'#'+bn.num)+'  '+bn.pos+'  '+ovr(bn.st),x+8,y+rh/2,w-16,fs,'#fff','left');
  });
  ctx.textAlign='center';
  if(S.subExits.length)txt('PLAYERS LEAVING · '+Math.max(0,10-Math.max(...S.subExits.map(e=>e.elapsed))).toFixed(1)+'s',W*.74,y0+7.35*rh,fs*.82,'#ffcf70',700);else if(S.subExitRunners.length)txt('PLAYER STILL EXITING · SUBSTITUTE DELAYED',W*.74,y0+7.35*rh,fs*.82,'#ffcf70',700);else if(S.pendingSubs.length)txt('SUBSTITUTE DELAYED · 1 MINUTE',W*.74,y0+7.35*rh,fs*.82,'#ffcf70',700);else if(S.subs[0]>=5)txt('No substitutions left',W*0.74,y0+7.35*rh,fs,'#ff9a80',700);else if(S.ret!=='half'&&!atStoppage)txt('Subs only at a stoppage or half-time',W*.74,y0+7.35*rh,fs*.82,'#ffcf70',700);else if(S.ret!=='half'&&S.subWindows[0]>=3)txt('No substitution windows left',W*.74,y0+7.35*rh,fs*.82,'#ff9a80',700);
  drawStats(S.pv||S.sel);
  ubtn(W*0.4,H*0.84,W*0.22,H*0.11,'RESUME',resumeSubs,'rgba(255,230,0,.35)');UI.def=resumeSubs;
  ubtn(W*0.04,H*0.84,W*0.22,H*0.11,M.conf?'TAP TO CONFIRM':'QUIT MATCH',()=>{if(M.conf)quitMatch();else M.conf=1;},M.conf?'rgba(255,60,40,.5)':0);
  ubtn(W*0.72,H*0.84,W*0.24,H*0.11,'INSTRUCTIONS',()=>{M.instr=1;});
}
function drawHud(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.textAlign='center';ctx.textBaseline='middle';
  if(H>W){UI.r.length=0;UI.def=null;pauseBtn.r=camBtn.r=0;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);txt('Rotate your phone to landscape',W/2,H/2,Math.min(W*0.07,40),'#fff',700);return;}
  if(S.mode==='menu'){UI.r.length=0;UI.def=null;pauseBtn.r=camBtn.r=0;drawMenu();return;}
  const m=S.mode,u=Math.max(10,H*0.045);
  const w=u*13.5,h=u*1.9,x=W/2-w/2,y=H*0.015;if(m!=='subs')scoreboard2(u,x,y,w,h);
  UI.r.length=0;UI.def=null;
  if(m==='kickoff'||m==='play'||m==='goal'||m==='whistle'){
    drawControls();
    pauseBtn.x=W-W*0.04-H*0.04;pauseBtn.y=H*0.07;pauseBtn.r=H*0.038;
    ctx.fillStyle='rgba(12,18,30,.8)';ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(pauseBtn.x,pauseBtn.y,pauseBtn.r,0,TAU);ctx.fill();ctx.stroke();
    txt('II',pauseBtn.x,pauseBtn.y,pauseBtn.r*0.9,'#fff',900);
  camBtn.x=pauseBtn.x-pauseBtn.r*2.5;camBtn.y=pauseBtn.y;camBtn.r=pauseBtn.r;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=camBtn.r*.35;
    ctx.fillStyle='rgba(9,15,25,.88)';ctx.beginPath();ctx.arc(camBtn.x,camBtn.y,camBtn.r,0,TAU);ctx.fill();
    ctx.shadowBlur=0;ctx.lineWidth=Math.max(1.5,camBtn.r*.055);ctx.strokeStyle='rgba(255,255,255,.48)';ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(camBtn.x,camBtn.y,camBtn.r*.78,0,TAU);ctx.stroke();
    drawCameraControlIcon(camBtn.x,camBtn.y,camBtn.r*.48);
    ctx.restore();
  }else pauseBtn.r=camBtn.r=0;
  if(S.so){                                                // shootout tracker
    for(let t=0;t<2;t++){
      const k=S.so.k[t],n=Math.max(5,k.length);
      for(let i=0;i<n;i++){
        ctx.beginPath();ctx.arc(W/2+(i-(n-1)/2)*u*1.1,y+h+u*2.6+t*u*1.1,u*.4,0,TAU);
        ctx.fillStyle=i<k.length?(k[i]?'#4cff7a':'#ff5040'):'rgba(255,255,255,.3)';ctx.fill();
      }
    }
  }
  if(toast.t>0)txt(toast.s,W/2,H*0.70,H*0.045,'#ffe600',800);
  if(S.card&&S.card.t>0){
    ctx.fillStyle=S.card.c;rr(W*0.03,H*0.3,u*1.3,u*1.8,u*.2);ctx.fill();
    ctx.textAlign='left';txt(S.card.txt,W*0.03+u*1.7,H*0.3+u*0.9,u*.8,'#fff',800);ctx.textAlign='center';
  }
  const mg=S.msg&&S.msg.t>0?S.msg:null;
  if(mg&&(m==='kickoff'||m==='play'||m==='whistle'))banner(mg.big,mg.sub,Math.min(1,mg.t*3));
  else if(m==='kickoff'&&S.t<1.3)banner(S.half===1&&S.clock===0&&S.score[0]+S.score[1]===0?'KICK OFF':'GET READY','',1);
  else if(m==='goal'&&S.t<2.8)banner('GOAL!',KIT[S.goalTeam].name+'  '+S.score[0]+' - '+S.score[1],Math.min(1,S.t*4));
  else if(m==='half'){endScreen(0);
  }else if(m==='full'){endScreen(1);
  }else if(m==='menu'){
    panel('PITCH 11',['11 v 11  -  3 min halves','Fouls, cards, offside, advantage, injuries, 5 subs','Hold SHOOT to charge   -   PASS / THRU / LOB aim with the stick','II button (or P key): pause, substitutions and player stats','SKILL (U) dodges a defender  -  KEEPER CHARGE (G)  -  SHOOT on a high ball: header / volley']);
    ubtn(W*0.17,H*0.72,W*0.3,H*0.13,'KNOCKOUT: '+(S.ko?'ON':'OFF'),()=>{S.ko=!S.ko;});
    ubtn(W*0.53,H*0.72,W*0.3,H*0.13,'KICK OFF',startGame,'rgba(255,230,0,.35)');UI.def=startGame;
  }
  if(m==='subs')drawSubs();
}
function drawControls(){
  if(joy.on)drawJoy(joy.bx,joy.by,H*0.13,joy.kx,joy.ky,H*0.06,true);
  else{const jp=joyBasePos();drawJoy(jp.x,jp.y,H*0.11,jp.x,jp.y,H*0.045,false);}
  const lab=GLAB[GS.att?'att':'def'],fl=GS.flash>0?GS.flash/TUNING.relabel:0;
  for(const b of BTN){
    const i=b.id,q=GS.s[i],c=btnPos(b),on=q.on||(i===3&&I.sprint),r=c.r*(1+fl*0.12);
    const BC=['#3aa0ff','#ff4b3a','#3ddc84','#ffd400'];
    drawBtnFace(i,c,r,on,lab[i],BC[i]);
    if(i===1&&GS.att&&I.shoot){ctx.strokeStyle='#ffe600';ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,r+5,-Math.PI/2,-Math.PI/2+clamp(I.chargeT/0.85,0,1)*TAU);ctx.stroke();}
    ring8(i,q,c,r);
    if(i===3&&ctrl){ctx.strokeStyle=ctrl.winded||ctrl.stam<0.2?'#ff5030':'#5cff8a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,r+5,-Math.PI/2,-Math.PI/2+ctrl.stam*TAU);ctx.stroke();}
    if(q.on){                                              // swipe hint ring: 4 arrows (up/right/down/left), the one under the finger lights up
      const R=r*1.5,mv=Math.hypot(q.x-q.x0,q.y-q.y0),cur=q.dir>=0?q.dir:(mv>q.thr*0.5?gDir(q.x-q.x0,q.y-q.y0):-1),as=r*0.17;
      ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(c.x,c.y,R,0,TAU);ctx.stroke();
      for(const d of [0,2,4,6]){
        const ux=GDX[d],uy=GDY[d],px=c.x+ux*R,py=c.y+uy*R;
        ctx.fillStyle=d===cur?'#ffe600':'rgba(255,255,255,.5)';
        ctx.beginPath();ctx.moveTo(px+ux*as,py+uy*as);ctx.lineTo(px-ux*as*0.6-uy*as*0.8,py-uy*as*0.6+ux*as*0.8);ctx.lineTo(px-ux*as*0.6+uy*as*0.8,py-uy*as*0.6-ux*as*0.8);ctx.closePath();ctx.fill();
      }
      hint8(i,q,c,R,as,cur);
    }
  }
  pop8Draw();
}
function startGame(){p11UiSemanticSound=true;window.P11AudioAssets?.play('uiConfirm',.75);goFullscreen();newMatch();}
function uiTap(x,y){
  if(S.t<0.4&&S.mode!=='subs')return false;
  for(const r of UI.r)if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){r.fn();return true;}
  if(S.mode==='full'&&UI.def){UI.def();return true;}  // tap anywhere also starts / restarts
  return false;
}
function goFullscreen(){
  try{
    const e=document.documentElement,r=(e.requestFullscreen||e.webkitRequestFullscreen).call(e);
    if(r&&r.then)r.then(()=>screen.orientation.lock('landscape')).catch(()=>{});
  }catch(_){}
}
