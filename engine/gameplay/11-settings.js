'use strict';
/* ===================== SETTINGS 2.0 — responsive category navigation =====================
   Existing settings state and actions remain authoritative. This layer only reorganises
   the menu UI; camera preview is a live schematic driven by the selected camera mode.
   ================================================================================ */
const SETTINGS_NAV=[
  {name:'GAMEPLAY',sub:'Difficulty and pitch dimensions',key:'game',abbr:'GP',kind:'game'},
  {name:'CAMERA',sub:'Match views and set-piece camera',key:'camera',abbr:'CM',kind:'camera'},
  {name:'SOUND & VISUALS',sub:'Audio, stadium and presentation',key:'opt',abbr:'AV',kind:'sound'},
  {name:'CONTROLS',sub:'Input, assists and layout',key:'ctl',abbr:'CT',kind:'controls'},
  {name:'MATCH SETTINGS',sub:'Rules, match feel, pitch, kits & officials',key:'cust',abbr:'MT',kind:'match'},
  {name:'DATA MANAGEMENT',sub:'Saved progress and reset',key:'data',abbr:'DM',kind:'data'}
];
function settingsNavIcon(kind,cx,cy,r,color){
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=Math.max(1.7,r*.115);ctx.lineCap='round';ctx.lineJoin='round';
  if(kind==='game'){
    // Finished circular gameplay gauge: one closed silhouette, inset scale and anchored needle.
    const gy=cy,gr=r*.76;
    ctx.beginPath();ctx.arc(cx,gy,gr,0,TAU);ctx.stroke();
    for(let i=0;i<5;i++){
      const a=Math.PI+i*Math.PI/4;
      const x1=cx+Math.cos(a)*gr*.58,y1=gy+Math.sin(a)*gr*.58;
      const x2=cx+Math.cos(a)*gr*.79,y2=gy+Math.sin(a)*gr*.79;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    }
    ctx.beginPath();ctx.moveTo(cx,gy);ctx.lineTo(cx+r*.39,gy-r*.43);ctx.stroke();
    ctx.beginPath();ctx.arc(cx,gy,r*.105,0,TAU);ctx.fill();
  }else if(kind==='camera'){
    rr(cx-r*.82,cy-r*.58,r*1.64,r*1.16,r*.2);ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r*.34,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-r*.55,cy-r*.8);ctx.lineTo(cx-r*.2,cy-r*.8);ctx.stroke();
  }else if(kind==='sound'){
    ctx.beginPath();ctx.moveTo(cx-r*.75,cy-r*.25);ctx.lineTo(cx-r*.35,cy-r*.25);ctx.lineTo(cx+r*.05,cy-r*.62);ctx.lineTo(cx+r*.05,cy+r*.62);ctx.lineTo(cx-r*.35,cy+r*.25);ctx.lineTo(cx-r*.75,cy+r*.25);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,r*.52,-.85,.85);ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r*.82,-.8,.8);ctx.stroke();
  }else if(kind==='controls'){
    // One controller with a clear D-pad and a simplified four-button cluster.
    ctx.beginPath();ctx.moveTo(cx-r*.78,cy+r*.12);ctx.lineTo(cx-r*.63,cy-r*.42);ctx.quadraticCurveTo(cx-r*.57,cy-r*.62,cx-r*.34,cy-r*.62);ctx.lineTo(cx+r*.34,cy-r*.62);ctx.quadraticCurveTo(cx+r*.57,cy-r*.62,cx+r*.63,cy-r*.42);ctx.lineTo(cx+r*.78,cy+r*.12);ctx.quadraticCurveTo(cx+r*.82,cy+r*.48,cx+r*.57,cy+r*.48);ctx.lineTo(cx+r*.27,cy+r*.18);ctx.lineTo(cx-r*.27,cy+r*.18);ctx.lineTo(cx-r*.57,cy+r*.48);ctx.quadraticCurveTo(cx-r*.82,cy+r*.48,cx-r*.78,cy+r*.12);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-r*.49,cy-r*.18);ctx.lineTo(cx-r*.19,cy-r*.18);ctx.moveTo(cx-r*.34,cy-r*.33);ctx.lineTo(cx-r*.34,cy-r*.03);ctx.stroke();
    // A single small action button sits in the controller's right-hand area.
    ctx.beginPath();ctx.arc(cx+r*.39,cy-r*.17,r*.075,0,TAU);ctx.stroke();
  }else if(kind==='match'){
    // A conventional gear silhouette with eight distinct teeth and a central bore.
    const teeth=8,outer=r*.88,root=r*.68,inner=r*.29,steps=teeth*4;
    ctx.beginPath();
    for(let i=0;i<steps;i++){
      const a=-Math.PI/2+i*Math.PI*2/steps;
      const phase=i%4,rad=(phase===0||phase===1)?outer:root;
      const px=cx+Math.cos(a)*rad,py=cy+Math.sin(a)*rad;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,inner,0,TAU);ctx.stroke();
  }else{
    const rx=r*.70,ry=r*.23,top=cy-r*.48,mid=cy,bot=cy+r*.48;
    ctx.beginPath();ctx.ellipse(cx,top,rx,ry,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-rx,top);ctx.lineTo(cx-rx,bot);ctx.moveTo(cx+rx,top);ctx.lineTo(cx+rx,bot);ctx.stroke();ctx.beginPath();ctx.ellipse(cx,mid,rx,ry,0,0,Math.PI);ctx.stroke();ctx.beginPath();ctx.ellipse(cx,bot,rx,ry,0,0,Math.PI);ctx.stroke();
  }
  ctx.restore();
}
function settingsSelect(key){M.scr=key;M.conf=0;}
function settingsSidebar(active,collapsed){
  const x=collapsed?W*.018:W*.035,w=collapsed?W*.078:W*.235,y0=H*.19,rowH=H*.105;
  SETTINGS_NAV.forEach(n=>{
    const i=SETTINGS_NAV.indexOf(n),y=y0+i*rowH,sel=n.key===active,fn=()=>settingsSelect(n.key);
    UI.r.push({x,y,w,h:rowH*.86,fn});
    glass(x,y,w,rowH*.86,collapsed?H*.018:H*.022,{top:sel?'rgba(255,224,120,.24)':'rgba(255,255,255,.10)',bot:sel?'rgba(255,190,45,.08)':'rgba(255,255,255,.035)',bd:sel?'rgba(255,220,120,.72)':'rgba(255,255,255,.16)',glow:sel?'rgba(255,196,55,.18)':null,hl:.06});
    const cx=x+(collapsed?w/2:w*.17),cy=y+rowH*.43,ir=collapsed?rowH*.22:rowH*.2;
    settingsNavIcon(n.kind,cx,cy,ir,sel?'#ffe08a':'rgba(230,238,245,.8)');
    if(!collapsed){ctx.textAlign='left';fit(n.name,x+w*.32,cy-rowH*.045,w*.64,H*.031,sel?'#ffe08a':'#f3f6fa','left');fit(n.sub,x+w*.32,cy+rowH*.19,w*.64,H*.022,'rgba(190,205,218,.72)','left');ctx.textAlign='center';}
  });
}
function settingsPage(title,active){mt(title);mbk();settingsSidebar(active,true);}
function settingsPanel(x,y,w,h,title){
  glass(x,y,w,h,H*.025,{top:'rgba(255,255,255,.105)',bot:'rgba(255,255,255,.035)',bd:'rgba(255,255,255,.18)',hl:.07});
  if(title){ctx.textAlign='left';txt(title,x+W*.022,y+H*.045,H*.028,'#ffe08a',800);ctx.textAlign='center';}
}
function settingsText(value,x,y,w,size,color,align){
  const text=String(value==null?'':value),a=align||'left';
  ctx.save();
  ctx.beginPath();ctx.rect(x,y-size*1.35,w,size*1.8);ctx.clip();
  fit(text,a==='right'?x+w:a==='center'?x+w/2:x,y,w,size,color,a);
  ctx.restore();
}
function settingsWrap(value,x,y,w,h,size,color,align,maxLines){
  const words=String(value==null?'':value).split(/\s+/).filter(Boolean);
  if(!words.length)return;
  const a=align||'center',limit=maxLines||2;
  ctx.save();let fs=size,lines=[];
  const build=()=>{
    ctx.font='600 '+fs+'px sans-serif';lines=[''];
    words.forEach(word=>{
      const current=lines[lines.length-1],next=current?current+' '+word:word;
      if(current&&ctx.measureText(next).width>w)lines.push(word);else lines[lines.length-1]=next;
    });
  };
  build();
  while(lines.length>limit&&fs>size*.68){fs*=.92;build();}
  if(lines.length>limit)lines=lines.slice(0,limit);
  ctx.beginPath();ctx.rect(x,y-h*.58,w,h*1.16);ctx.clip();
  ctx.textBaseline='middle';
  const lineH=Math.min(fs*1.18,h/Math.max(1,lines.length));
  const start=y-(lines.length-1)*lineH/2;
  lines.forEach((line,i)=>fit(line,a==='left'?x:a==='right'?x+w:x+w/2,start+i*lineH,w,fs,color,a));
  ctx.restore();
}
function settingsSeg(x,y,w,h,labs,sel,fn){
  const mobileSwitchLabels=(navigator.userAgentData&&navigator.userAgentData.mobile===true)||/Android.*Mobile|iPhone|iPod|Windows Phone/i.test(navigator.userAgent)||(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches&&Math.min(screen.width||innerWidth,screen.height||innerHeight)<=600);
  const padX=mobileSwitchLabels?3:5,padY=mobileSwitchLabels?1.5:5,gap=2,innerW=Math.max(1,w-padX*2),innerH=Math.max(1,h-padY*2),cellW=innerW/labs.length;
  ctx.save();
  // Match the fully lit gold treatment used by MATCH CAMERA buttons.
  ctx.globalAlpha=1;
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='rgba(4,9,15,.72)';rr(x,y,w,h,h/2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;ctx.stroke();
  labs.forEach((label,i)=>{
    const bx=x+padX+i*cellW+gap/2,by=y+padY,bw=Math.max(1,cellW-gap),bh=innerH;
    UI.r.push({x:x+padX+i*cellW,y:y+padY,w:cellW,h:innerH,kind:'segment',fn:()=>fn(i)});
    if(i===sel)glass(bx,by,bw,bh,bh*.5,GOLD);
    fit(label,bx+bw/2,by+bh/2,bw*.84,bh*(mobileSwitchLabels?.82:.4),i===sel?'#1b2430':'#e8edf3');
  });
  ctx.restore();
}
function settingsRow(label,x,y,segX,segW,options,value,fn,rowH){
  const rh=rowH||H*.062,sh=rh*.84,sy=y+(rh-sh)/2;
  const labelW=Math.max(12,segX-x-W*.035);
  settingsText(label,x,y+rh*.58,labelW,H*.027,'#f4f6fa','left');
  settingsSeg(segX,sy,segW,sh,options,value,fn);
}
function cameraOptionButton(x,y,w,h,label,fn,active){
  UI.r.push({x,y,w,h,fn});
  glass(x,y,w,h,h*.5,active?GOLD:{});
  fit(label,x+w/2,y+h/2,w*.82,h*.36,active?'#1b2430':'#fff');
}
function drawCameraProfilePreview(x,y,w,h){
  settingsPanel(x,y,w,h,'CAMERA PROFILE PREVIEW');
  const ix=x+w*.07,iy=y+H*.13,iw=w*.86,ih=h*.69,mode=G.cam|0,name=CAMN[mode]||'CAMERA';
  ctx.save();rr(ix,iy,iw,ih,H*.014);ctx.clip();
  const sky=ctx.createLinearGradient(0,iy,0,iy+ih);sky.addColorStop(0,'#13283a');sky.addColorStop(.48,'#173b35');sky.addColorStop(1,'#0b241b');ctx.fillStyle=sky;ctx.fillRect(ix,iy,iw,ih);
  const top=mode===0?iy+ih*.12:iy+ih*(.28+Math.min(.12,mode*.012));
  const zoom=mode===0?1:clamp((CAMS[mode]&&CAMS[mode].fm)||2.2,1.5,4.8);
  const pw=mode===0?iw*.78:iw*clamp(1.05/zoom,.42,.82),ph=mode===0?ih*.72:ih*.48,cx=ix+iw/2,py=top+ih*.12,nearY=py+ph;
  let pts;
  if(mode===0)pts=[[cx-pw/2,py],[cx+pw/2,py],[cx+pw/2,nearY],[cx-pw/2,nearY]];
  else{const far=pw*.72,near=pw;pts=[[cx-far/2,py],[cx+far/2,py],[cx+near/2,nearY],[cx-near/2,nearY]];}
  ctx.fillStyle='#286b3c';ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<4;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.78)';ctx.lineWidth=Math.max(1,H*.002);ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.stroke();
  const lerp=(a,b,t)=>a+(b-a)*t,line=t=>{ctx.beginPath();ctx.moveTo(lerp(pts[0][0],pts[3][0],t),lerp(pts[0][1],pts[3][1],t));ctx.lineTo(lerp(pts[1][0],pts[2][0],t),lerp(pts[1][1],pts[2][1],t));ctx.stroke();};line(.5);
  ctx.beginPath();ctx.ellipse(cx,py+ph*.52,pw*.105,ph*.09,0,0,TAU);ctx.stroke();
  const dots=[[.18,.25],[.34,.3],[.5,.22],[.66,.3],[.82,.25],[.28,.52],[.5,.58],[.72,.52],[.35,.78],[.5,.83],[.65,.78]];
  dots.forEach((d,i)=>{const t=d[1],left=lerp(pts[0][0],pts[3][0],t),right=lerp(pts[1][0],pts[2][0],t),xx=left+(right-left)*d[0],yy=lerp(pts[0][1],pts[3][1],t);ctx.fillStyle=i<5?'#dce8f2':'#e6bd4c';ctx.beginPath();ctx.arc(xx,yy,Math.max(2,H*.008),0,TAU);ctx.fill();});
  const bx=cx+Math.sin(performance.now()/850)*pw*.08,by=py+ph*.62;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx,by,Math.max(2,H*.007),0,TAU);ctx.fill();
  ctx.restore();fit(name,x+w/2,y+h*.89,w*.88,H*.034,'#fff');txt('Preview follows the selected camera profile.',x+w/2,y+h*.96,H*.021,'rgba(190,205,218,.75)',600);
}
MS.set=function(){
  mt('SETTINGS');mbk();settingsSidebar('set',false);
  const x=W*.3,y=H*.19,w=W*.66,h=H*.69;settingsPanel(x,y,w,h,'PERSONALISE YOUR MATCH');
  fit('SETTINGS',x+w*.5,y+h*.35,w*.8,H*.095,'#fff');
  fit('Configure gameplay, camera, controls and match presentation.',x+w*.5,y+h*.48,w*.82,H*.035,'rgba(220,230,240,.88)');
  fit('Choose a category from the left to get started.',x+w*.5,y+h*.58,w*.82,H*.03,'#ffe08a');
  const values=[['GAMEPLAY',String(DIF[G.diff].n)],['CAMERA',String(CAMN[G.cam]||'TOP-DOWN')],['SOUND & VISUALS',G.vol===0?'SOUND OFF':'AUDIO / DISPLAY'],['CONTROLS',String((G.preset||'FC STYLE').toUpperCase())],['MATCH SETTINGS','CUSTOM RULES'],['DATA MANAGEMENT','SAVE & RESET']];
  values.forEach((v,i)=>{const yy=y+h*.68+(i%3)*H*.055,xx=x+w*(i<3?.28:.72);fit(v[0]+'  ·  '+v[1],xx,yy,w*.43,H*.023,'rgba(220,230,240,.72)');});
};
MS.game=function(){
  settingsPage('GAMEPLAY','game');
  const x=W*.135,y=H*.17,w=W*.83,h=H*.74;
  settingsPanel(x,y,w,h,'MATCH EXPERIENCE');

  const dx=x+W*.025,dy=y+H*.085,dw=w-W*.05,dh=H*.17;
  glass(dx,dy,dw,dh,H*.018,{top:'rgba(255,255,255,.12)',bot:'rgba(255,255,255,.035)',bd:'rgba(255,255,255,.24)',hl:.1});
  ctx.save();ctx.fillStyle='rgba(255,213,105,.9)';
  rr(dx+W*.012,dy+H*.018,W*.004,dh-H*.036,H*.003);ctx.fill();ctx.restore();

  settingsText('DIFFICULTY',dx+W*.027,dy+H*.039,dw*.42,H*.027,'#f4f6fa','left');
  settingsText(DIF[G.diff].n,dx+dw-W*.025-dw*.38,dy+H*.039,dw*.38,H*.027,'#ffe08a','right');
  settingsSeg(dx+W*.018,dy+H*.065,dw-W*.036,H*.062,DIF.map(d=>d.n),G.diff,i=>{G.diff=i;save();});
  const difficultyNotes=[
    'A relaxed introduction to the match.',
    'A measured step up in challenge.',
    'Balanced opposition and the recommended starting point.',
    'More demanding defensive pressure and reactions.',
    'The toughest opposition available.'
  ];
  settingsWrap(difficultyNotes[G.diff]||'Choose the challenge level for your matches.',dx+dw*.04,dy+H*.145+5,dw*.92,H*.035,H*.021,'rgba(205,216,228,.86)','center',1);

  const opts=['SMALL','STANDARD','LARGE'];
  const gridX=x+W*.025,gridY=y+H*.285,gapX=W*.022,gapY=H*.022;
  const cardW=(w-W*.05-gapX)/2,cardH=H*.185;
  const cards=[
    {label:'PITCH SIZE',key:'pitch',note:()=>{const q=PITCH_SIZES[G.cfg.pitch];return (q[0]/10).toFixed(1)+' × '+(q[1]/10).toFixed(1)+' m';}},
    {label:'GOAL SIZE',key:'goal',note:()=>{const q=GOAL_SIZES[G.cfg.goal];return (q.h*2/10).toFixed(2)+' × '+(q.z/10).toFixed(2)+' m · width × height';}},
    {label:'BALL SIZE',key:'ball',note:()=> 'Relative scale: '+Math.round([.8,1,1.3][G.cfg.ball]*100)+'%'},
    {label:'PLAYER SIZE',key:'player',note:()=> 'Relative scale: '+Math.round([.66,.8,.95][G.cfg.player]*100)+'%'}
  ];
  cards.forEach((r,i)=>{
    const col=i%2,row=Math.floor(i/2),cx=gridX+col*(cardW+gapX),cy=gridY+row*(cardH+gapY);
    glass(cx,cy,cardW,cardH,H*.018,{top:'rgba(255,255,255,.105)',bot:'rgba(255,255,255,.025)',bd:'rgba(255,255,255,.19)',hl:.07});
    ctx.save();ctx.fillStyle='rgba(255,213,105,.78)';
    rr(cx+W*.014,cy+H*.016,cardW-W*.028,H*.003,H*.002);ctx.fill();ctx.restore();
    settingsText(r.label,cx+W*.022,cy+H*.041,cardW*.5,H*.027,'#f4f6fa','left');
    settingsText(opts[G.cfg[r.key]],cx+cardW-W*.022-cardW*.38,cy+H*.041,cardW*.38,H*.027,'#ffe08a','right');
    settingsSeg(cx+W*.018,cy+H*.065,cardW-W*.036,H*.061,opts,G.cfg[r.key],v=>{G.cfg[r.key]=v;save();applyConfig();});
    settingsWrap(r.note(),cx+cardW*.05,cy+H*.153,cardW*.9,H*.045,H*.021,'rgba(190,205,218,.86)','center',2);
  });
};
MS.camera=function(){
  settingsPage('CAMERA','camera');
  const x=W*.135,y=H*.17,w=W*.49,h=H*.74;
  settingsPanel(x,y,w,h,'MATCH CAMERA');
  const labels=['TOP-DOWN','SIDE WIDE','SIDE MEDIUM','SIDE CLOSE','BROADCAST HIGH','LOW STADIUM','ACTION CAM','AUTO DIRECTOR','GOAL TO GOAL'];
  const gridX=x+w*.045,gridY=y+H*.13,gapX=w*.055,bw=w*.45,bh=H*.082,rowGap=H*.018;
  labels.forEach((label,i)=>{
    const col=i%2,row=Math.floor(i/2),bx=gridX+col*(bw+gapX),by=gridY+row*(bh+rowGap);
    cameraOptionButton(bx,by,bw,bh,label,()=>{G.cam=i;save();},G.cam===i);
  });
  settingsRow('SET-PIECE CAMERA',x+W*.025,y+H*.675-10,x+w*.40,w*.57,['ON','OFF'],G.spc?0:1,i=>{G.spc=i?0:1;save();},H*.06);
  drawCameraProfilePreview(W*.645,y,W*.32,h);
};
MS.opt=function(){
  settingsPage('SOUND & VISUALS','opt');
  const x=W*.135,y=H*.16,w=W*.83,h=H*.76;
  settingsPanel(x,y,w,h,'AUDIO & PRESENTATION');
  const rows=[
    ['TIME OF DAY','tod',['DAY','DUSK','NIGHT']],
    ['SFX VOLUME','vol',['OFF','LOW','MED','HIGH']],
    ['MUSIC','mus',['OFF','ON']],
    ['CROWD','crowd',['OFF','LOW','FULL']],
    ['SCREEN SHAKE','shk',['OFF','LOW','FULL']],
    ['MINI-MAP','radar',['OFF','SMALL','LARGE']],
    ['GOAL REPLAYS','rep',['OFF','ON']],
    ['COMMENTARY','com',['OFF','ON']],
    ['CUTSCENES','cut',['OFF','ON'],'referee']
  ];
  const start=y+H*.085,step=H*.066,rowH=H*.057,segX=x+W*.30,segW=w*.60;
  rows.forEach((r,i)=>{
    const yy=start+i*step,value=r[3]==='referee'?G.rf[r[1]]:G[r[1]];
    settingsRow(r[0],x+W*.025,yy,segX,segW,r[2],value,v=>{
      if(r[3]==='referee'){G.rf[r[1]]=v;fixRf();}
      else G[r[1]]=v;
      syncDbl();save();AU.init();AU.vol();
    },rowH);
  });
  const yy=y+H*.69,hb=H*.057;
  settingsText('MENU BACKGROUND',x+W*.025,yy+hb*.58,W*.22,H*.027,'#f4f6fa','left');
  const stepBg=d=>{G.mbg=((Number.isInteger(G.mbg)?G.mbg:0)+d+21)%21;save();};
  ubtn(x+W*.28,yy,W*.07,hb,'‹',()=>stepBg(-1));
  ubtn(x+w-W*.095,yy,W*.07,hb,'›',()=>stepBg(1));
  const bgName=G.mbg>=1&&G.mbg<=20?G.mbg+'. '+BG27[G.mbg-1][0]:'AUTO (CYCLES)';
  settingsText(bgName,x+W*.375,yy+hb*.58,w*.4,H*.026,'#fff','center');
};
MS.ctl=function(){
  settingsPage('CONTROLS','ctl');const x=W*.135,y=H*.17,w=W*.83,h=H*.74;settingsPanel(x,y,w,h,'INPUT & ASSISTANCE');
  const rows=[['PASS / SHOT ASSIST','Aiming assistance settings','assist'],['CONTROL PRESET','Choose the on-screen action layout','preset'],['LAYOUT EDITOR','Move and resize the mobile controls','layout'],['TRAINING','Practise the core match actions','train'],['CHEAT SHEET','Review gestures and controls','cheat'],['ADVANCED INPUT','Haptics, swipe input, double-tap and hints','adv']];
  rows.forEach(r=>{const i=rows.indexOf(r),yy=y+H*(.09+i*.105),bx=x+W*.025,bw=w*.94,bh=H*.082;UI.r.push({x:bx,y:yy,w:bw,h:bh,fn:()=>go(r[2])});glass(bx,yy,bw,bh,bh*.38,{top:'rgba(255,255,255,.13)',bot:'rgba(255,255,255,.045)',hl:.07});ctx.textAlign='left';txt(r[0],bx+W*.025,yy+bh*.38,H*.032,'#fff',800);txt(r[1],bx+W*.025,yy+bh*.73,H*.023,'rgba(195,208,220,.78)',600);ctx.textAlign='center';txt('›',bx+bw-W*.025,yy+bh*.55,H*.055,'#ffe08a',800);});
};
MS.adv=function(){
  settingsPage('ADVANCED INPUT','ctl');const x=W*.135,y=H*.19,w=W*.83,h=H*.69;settingsPanel(x,y,w,h,'INPUT & FEEDBACK');
  settingsRow('HAPTICS',x+W*.025,y+H*.13,x+W*.42,w*.48,['ON','OFF'],G.haptic?0:1,i=>{G.haptic=i?0:1;save();});
  settingsRow('SWIPE ANYWHERE',x+W*.025,y+H*.27,x+W*.42,w*.48,['ON','OFF'],G.swAnywhere?0:1,i=>{G.swAnywhere=i?0:1;save();});
  settingsRow('FIRST-TIME HINTS',x+W*.025,y+H*.41,x+W*.42,w*.48,[G.tut?'ON':'SHOW AGAIN'],0,()=>{G.tut=0;S.tutT=0;save();});
  settingsRow('DOUBLE-TAP SHOT',x+W*.025,y+H*.55,x+W*.42,w*.48,['OFF','ON'],G.ftap,v=>{G.ftap=v;syncDbl();save();AU.init();AU.vol();});
};
MS.assist=function(){
  settingsPage('PASS / SHOT ASSIST','ctl');
  const x=W*.135,y=H*.19,w=W*.83,h=H*.69;settingsPanel(x,y,w,h,'PASSING & SHOOTING');
  const left=x+W*.025,segX=x+W*.42,segW=w*.48,rowH=H*.055;
  const passLevels=['ASSISTED','SEMI','MANUAL'],passValues=['assisted','semi','manual'];
  settingsRow('PASS BODY ALIGNMENT',left,y+H*.13,segX,segW,passLevels,passValues.indexOf(G.assist.pass),i=>{G.assist.pass=passValues[i];save();},rowH);
  settingsRow('SHOT AIM ASSIST',left,y+H*.24,segX,segW,passLevels,passValues.indexOf(G.assist.shot),i=>{G.assist.shot=passValues[i];save();},rowH);
  settingsRow('PASS TARGET ASSIST',left,y+H*.35,segX,segW,['MANUAL','SEMI','FULL'],G.rf.pas,i=>{G.rf.pas=i;fixRf();save();},rowH);
  settingsRow('PASS PREVIEW',left,y+H*.46,segX,segW,['OFF','ON'],G.rf.pprev,i=>{G.rf.pprev=i;fixRf();save();},rowH);
  settingsRow('PASS & GO',left,y+H*.57,segX,segW,['OFF','ON'],G.rf.pgo,i=>{G.rf.pgo=i;fixRf();save();},rowH);
};
MS.preset=function(){
  settingsPage('CONTROL PRESET','ctl');
  const x=W*.135,y=H*.19,w=W*.83,h=H*.69;settingsPanel(x,y,w,h,'ON-SCREEN CONTROL SCHEME');
  const names=['CLASSIC','FC STYLE','EFOOTBALL STYLE'],keys=['classic','fc','efoot'],gap=w*.035,bw=w*.28,bh=H*.17,start=x+w*.045,yy=y+H*.28;
  names.forEach((name,i)=>cameraOptionButton(start+i*(bw+gap),yy,bw,bh,name,()=>applyPreset(keys[i]),G.preset===keys[i]));
};
MS.layout=function(){
  settingsPage('LAYOUT EDITOR','ctl');
  const x=W*.135,y=H*.16,w=W*.83,h=H*.76;settingsPanel(x,y,w,h,'EDIT MOBILE CONTROLS');
  const u=H*.09,lab=GLAB[GS.att?'att':'def'];
  for(let i=0;i<4;i++){
    const c=BTN[i],p=btnPos(c),bx=p.x,by=p.y,r=p.r;
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(bx,by,r,0,TAU);ctx.fill();
    if(i===layoutSel||(layoutDrag&&layoutDrag.i===i)){ctx.strokeStyle='#ffe08a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(bx,by,r+6,0,TAU);ctx.stroke();}
    txt(lab[i],bx,by,r*.3,'#fff',700);
  }
  settingsText('DRAG A BUTTON TO REPOSITION IT',x+W*.025,y+H*.13,w*.5,H*.026,'#dfe7ee','left');
  settingsText(lab[layoutSel].replace('|',' ')+'  ·  SIZE '+BTN[layoutSel].m.toFixed(2),x+W*.025,y+H*.22,w*.5,H*.026,'#ffe08a','left');
  settingsText('SIZE',x+W*.025,y+H*.34,w*.12,H*.025,'#fff','left');
  const size=(delta)=>{const list=G.btns||BTN.map(b=>[b.dx,b.dy,b.m]);list[layoutSel][2]=clamp(delta(list[layoutSel][2]),.6,2.2);G.btns=list;syncLayout();save();};
  ubtn(x+W*.13,y+H*.30,W*.075,H*.075,'−',()=>size(v=>v-.1));
  ubtn(x+W*.215,y+H*.30,W*.075,H*.075,'1',()=>size(()=>1));
  ubtn(x+W*.30,y+H*.30,W*.075,H*.075,'+',()=>size(v=>v+.1));
  settingsText('OPACITY',x+W*.025,y+H*.49,w*.18,H*.025,'#fff','left');
  settingsSeg(x+W*.13,y+H*.455,w*.29,H*.075,['LOW','MID','HIGH'],G.op<.4?0:G.op<.75?1:2,i=>{G.op=[.35,.55,.85][i];save();});
  settingsText('JOYSTICK',x+W*.025,y+H*.64,w*.18,H*.025,'#fff','left');
  ubtn(x+W*.13,y+H*.605,W*.07,H*.075,'‹',()=>{G.joy[0]=Math.max(.06,G.joy[0]-.05);save();});
  ubtn(x+W*.21,y+H*.605,W*.07,H*.075,'›',()=>{G.joy[0]=Math.min(.94,G.joy[0]+.05);save();});
  ubtn(x+W*.29,y+H*.605,W*.07,H*.075,'↑',()=>{G.joy[1]=Math.max(.1,G.joy[1]-.06);save();});
  ubtn(x+W*.37,y+H*.605,W*.07,H*.075,'↓',()=>{G.joy[1]=Math.min(.9,G.joy[1]+.06);save();});
  ubtn(x+W*.025,y+H*.68,W*.19,H*.075,'RESET LAYOUT',()=>{G.btns=null;G.preset='classic';G.joy=[.15,.7];syncLayout();save();},'rgba(255,60,40,.4)');
  ubtn(x+W*.23,y+H*.68,W*.19,H*.075,'DONE',back,Y);
};
MS.train=function(){
  settingsPage('TRAINING','ctl');
  const x=W*.135,y=H*.18,w=W*.83,h=H*.70;settingsPanel(x,y,w,h,'PRACTICE DRILLS');
  if(train.on&&TRAIN[train.drill]){
    const d=TRAIN[train.drill],progress=clamp(train.count/d.need,0,1);
    settingsText('DRILL: '+d.n,x+w*.08,y+H*.15,w*.84,H*.045,'#ffe08a','center');
    settingsWrap(d.p,x+w*.12,y+H*.26,w*.76,H*.10,H*.03,'#dfe7ee','center',2);
    settingsText('SUCCESS  '+Math.min(train.count,d.need)+' / '+d.need,x+w*.08,y+H*.42,w*.84,H*.035,'#5cff8a','center');
    glass(x+w*.18,y+H*.49,w*.64,H*.025,H*.012,{top:'rgba(255,255,255,.12)',bot:'rgba(255,255,255,.06)'});
    glass(x+w*.18,y+H*.49,w*.64*progress,H*.025,H*.012,{top:'#5cff8a',bot:'#269d62'});
    ubtn(x+w*.25,y+H*.59,w*.5,H*.09,train.count>=d.need?'NEXT DRILL':'END TRAINING',()=>{
      if(train.count>=d.need){train.drill=(train.drill+1)%TRAIN.length;train.count=0;pre('prac');}
      else{train.on=false;train.count=0;M.scr='train';}
    },Y);
    return;
  }
  TRAIN.forEach((d,i)=>{
    const yy=y+H*(.12+i*.145),bx=x+w*.07,bw=w*.86,bh=H*.09;
    UI.r.push({x:bx,y:yy,w:bw,h:bh,fn:()=>{train.on=true;train.drill=i;train.count=0;pre('prac');}});
    glass(bx,yy,bw,bh,bh*.34,{top:'rgba(255,255,255,.13)',bot:'rgba(255,255,255,.04)',hl:.07});
    settingsText(d.n,bx+W*.025,yy+bh*.38,bw*.34,H*.029,'#ffe08a','left');
    settingsText(d.p,bx+bw*.36,yy+bh*.52,bw*.59,H*.022,'#dfe7ee','left');
    ctx.textAlign='right';txt('›',bx+bw-W*.025,yy+bh*.53,H*.05,'#ffe08a',800);ctx.textAlign='center';
  });
};
MS.cheat=function(){
  settingsPage('CHEAT SHEET','ctl');
  const x=W*.135,y=H*.19,w=W*.83,h=H*.69;settingsPanel(x,y,w,h,'CONTROLS REFERENCE');
  const rows=[
    ['LEFT SIDE / JOYSTICK','Move, aim and sprint'],
    ['SHOOT','Hold to charge; release to fire'],
    ['PASS','Tap or swipe for pass variants'],
    ['THROUGH','Tap or swipe for through balls'],
    ['SPRINT','Hold to sprint; swipe for a skill move'],
    ['SWITCH','Tap to switch player; SLIDE tackles'],
    ['FAKE SHOT','Swipe back while charging SHOOT']
  ];
  rows.forEach((r,i)=>{
    const yy=y+H*(.13+i*.082);
    settingsText(r[0],x+W*.025,yy,w*.34,H*.024,'#ffe08a','left');
    settingsText(r[1],x+w*.39,yy,w*.55,H*.024,'#dfe7ee','left');
  });
};
function drawMatchSettingsPreview(x,y,w,h,data,tb){
   settingsPanel(x,y,w,h,'LOOKS PREVIEW');
   const ix=x+w*.035,iy=y+h*.105+3,iw=w*.93,ih=h*.855-3;
   // The UI canvas sits above the WebGL canvas. Clear this viewport so the live
   // stadium render beneath it is actually visible instead of being covered.
   ctx.save();
   ctx.beginPath();
   const radius=Math.min(H*.018,iw*.035,ih*.035);
   ctx.roundRect(ix,iy,iw,ih,radius);
   ctx.clip();
   ctx.clearRect(ix,iy,iw,ih);
   ctx.restore();
   // Fill the complete inner viewport; the rounded 2D clip masks its corners.
   const live=window.P11Stadium&&window.P11Stadium.renderPreview&&window.P11Stadium.renderPreview(
     {x:ix,y:iy,w:iw,h:ih},{timeOfDay:G.tod|0,pitch:data.pitch|0,mowing:data.mow|0,weather:data.wx|0}
   );
   if(live){
     // Opaque bezel masks any residual one-pixel WebGL edge shimmer.
     ctx.save();ctx.strokeStyle='rgba(3,8,12,.98)';ctx.lineWidth=6;rr(ix,iy,iw,ih,radius);ctx.stroke();
     ctx.strokeStyle='rgba(148,163,184,.22)';ctx.lineWidth=1;rr(ix+3,iy+3,iw-6,ih-6,Math.max(1,radius-3));ctx.stroke();ctx.restore();
     const pillW=Math.min(iw*.34,H*.12),pillH=Math.max(18,H*.03),pillX=ix+iw*.035,pillY=iy+ih*.045;
     glass(pillX,pillY,pillW,pillH,pillH*.5,{top:'rgba(5,12,18,.88)',bot:'rgba(5,12,18,.7)',bd:'rgba(255,255,255,.2)'});
     fit('LIVE 3D',pillX+pillW*.53,pillY+pillH*.5,pillW*.86,pillH*.38,'#e8f0f4');
   }else{
     const stadium=window.P11Stadium,boot=window.P11StadiumBoot||{};
     const state=stadium&&stadium.status?stadium.status:(boot.state||'loading-runtime');
     const progress=Math.round(100*(stadium&&Number.isFinite(stadium.progress)?stadium.progress:(boot.progress||0)));
     const message=state==='error'||state==='runtime-error'?'STADIUM LOAD FAILED':
       state==='retrying'?'RETRYING STADIUM...':
       state==='ready'?'3D PREVIEW UNAVAILABLE':
       'LOADING STADIUM '+Math.max(0,Math.min(100,progress))+'%';
     settingsText(message,x+w*.5,y+h*.49,w*.9,H*.035,state==='error'||state==='runtime-error'?'#ff8c8c':'#ffe08a','center');
   }
 }
function resetMatchSettingsTab(tb){
  if(tb===4){
    ['strict','kit','ar','adv','spray','hit'].forEach(k=>{G.rf[k]=DRF[k];});
  }else if(tb===3)G.x.kit=[null,null,null];
  else{
    const keys={0:['len','win','offside','fouls','cards','inj'],1:['spd','spr','stam','ball','aitk','gk'],2:['pitch','mow','wx']}[tb]||[];
    keys.forEach(k=>{G.x[k]=DX[k];});
    if(tb===0)G.rf.toss=DRF.toss;
  }
  fixX();applyX();fixRf();save();
}
MS.cust=function(){
  settingsPage('MATCH SETTINGS','cust');
  const x=W*.135,y=H*.15,w=W*.83,h=H*.77,tb=M.ctab|0;
  const headerTitle=tb===4?'REFEREE & OFFICIALS':'MATCH RULES & CUSTOMISATION';
  settingsPanel(x,y,w,h,headerTitle);
  const data=X(),hasPreview=tb===2,leftX=x+W*.025,leftW=hasPreview?w*.55:w*.95,previewX=x+w*.62,previewW=w*.34;
  settingsSeg(x+W*.02,y+H*.075,w*.95,H*.06,CTABS,tb,i=>{M.ctab=i;M.conf=0;});
  if(tb===0){
    const rows=CROWS[0].concat([['MATCH INTRO','toss',['OFF','ON'],'referee']]),rowH=H*.05,start=y+H*.16,step=H*.075;
    rows.forEach((r,i)=>{
      const yy=start+i*step+(i>=2?H*.06:0),value=r[3]==='referee'?G.rf[r[1]]:data[r[1]];
      settingsRow(r[0],leftX,yy,leftX+leftW*.22,leftW*.76,r[2],value,j=>{
        if(r[3]==='referee'){G.rf[r[1]]=j;fixRf();save();}
        else{data[r[1]]=j;chgX();}
      },rowH);
    });
    settingsWrap('Golden = first goal wins. Mercy = match ends at a 4 goal gap.',leftX,y+H*.30,leftW,H*.045,H*.024,'#9fb0c0','center',2);
    const dividerY=y+H*.34,dividerX=leftX,dividerW=leftW;
    ctx.save();
    const divider=ctx.createLinearGradient(dividerX,dividerY,dividerX+dividerW,dividerY);
    divider.addColorStop(0,'rgba(255,213,105,0)');
    divider.addColorStop(.025,'rgba(255,213,105,.42)');
    divider.addColorStop(.5,'rgba(255,224,138,.95)');
    divider.addColorStop(.975,'rgba(255,213,105,.42)');
    divider.addColorStop(1,'rgba(255,213,105,0)');
    ctx.strokeStyle=divider;ctx.lineWidth=Math.max(1,H*.0015);
    ctx.shadowColor='rgba(255,210,90,.3)';ctx.shadowBlur=H*.006;
    ctx.beginPath();ctx.moveTo(dividerX,dividerY);ctx.lineTo(dividerX+dividerW,dividerY);ctx.stroke();ctx.restore();
  }else if(tb===1||tb===2){
    const rows=CROWS[tb]||[],rowH=H*.055,start=y+H*.16,step=H*.096;
    rows.forEach((r,i)=>settingsRow(r[0],leftX,start+i*step,leftX+leftW*.22,leftW*.76,r[2],data[r[1]],j=>{data[r[1]]=j;chgX();},rowH));
  }else if(tb===3){
    const names=['SHIRT','SHORTS','KEEPER'],swatches=SWC.length+1,bw=leftW*.78/swatches;
    names.forEach((nm,r)=>{
      const yy=y+H*(.19+r*.17);settingsText(nm,leftX,yy+H*.045,leftW*.2,H*.028,'#fff','left');
      for(let i=0;i<swatches;i++){
        const club=i===swatches-1,c=club?null:SWC[i],sel=club?!data.kit[r]:data.kit[r]===c,bx=leftX+leftW*.22+i*bw;
        ubtn(bx+1,yy,bw-3,H*.085,club?'CLUB':'',()=>{data.kit[r]=c;chgX();},club?(sel?Y:0):c);
        if(sel&&!club){ctx.strokeStyle='#ffe08a';ctx.lineWidth=2;rr(bx+1,yy,bw-3,H*.085,H*.012);ctx.stroke();}
      }
    });
  }else{
    const rows=RROWS,rowH=H*.055,start=y+H*.14,step=H*.082;
    rows.forEach((r,i)=>settingsRow(r[0],leftX,start+i*step,leftX+leftW*.29,leftW*.68,r[2],G.rf[r[1]],j=>{G.rf[r[1]]=j;fixRf();save();},rowH));
  }
  if(hasPreview)drawMatchSettingsPreview(previewX,y+H*.15,previewW,h-H*.18,data,tb);
  ctx.save();ctx.font='800 '+(H*.028)+'px sans-serif';
  const resetLabelBottom=y+H*.045+(ctx.measureText(headerTitle).actualBoundingBoxDescent||H*.006);ctx.restore();
  ubtn(x+w-W*.135,resetLabelBottom-H*.045+7,W*.11,H*.045,M.conf?'CONFIRM RESET':'RESET',()=>{
    if(M.conf){resetMatchSettingsTab(tb);M.conf=0;}else M.conf=1;
  },M.conf?'rgba(255,60,40,.5)':0);
};
MS.data=function(){
  settingsPage('DATA MANAGEMENT','data');
  const x=W*.22,y=H*.21,w=W*.72,h=H*.62;
  settingsPanel(x,y,w,h,'SAVE DATA');
  settingsText('RESET ALL SAVED PROGRESS?',x+w*.06,y+H*.19,w*.88,H*.045,'#fff','center');
  settingsWrap('This resets your selected club, records, career, cups, leagues and saved settings. Your custom clubs are preserved.',x+w*.08,y+H*.34,w*.84,H*.105,H*.028,'rgba(205,216,228,.85)','center',3);
  ubtn(x+w*.24,y+H*.46,w*.52,H*.095,M.conf?'TAP AGAIN TO ERASE':'RESET SAVE DATA',()=>{
    if(M.conf)resetSave();else M.conf=1;
  },M.conf?'rgba(255,60,40,.5)':0);
};
/* ===================== END SETTINGS 2.0 ===================== */

const _portraitPauseFinal=update;update=function(){if(H>W)return;_portraitPauseFinal();};