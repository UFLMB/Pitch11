/* PITCH 11 — matchday character visual pass
   Purely visual overlays. Gameplay entities, animation state, collisions and camera stay authoritative. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const shade=(hex,k)=>{
    const n=parseInt(String(hex).replace('#',''),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    return 'rgb('+Math.round(clamp(r*k,0,255))+','+Math.round(clamp(g*k,0,255))+','+Math.round(clamp(b*k,0,255))+')';
  };
  function humanDetail(p, x, y, angle, scale, kit, projected) {
    if (!window.ctx || !Number.isFinite(x+y+angle+scale) || scale<.001) return;
    const c=ctx, skin=(typeof SKIN!=='undefined'&&SKIN[p.skin])||'#c68642';
    const shirt=(p.gk?kit.gk:kit.shirt)||'#333', shorts=(p.gk?'#242424':kit.shorts)||'#222';
    const dark=shade(shirt,.58), light=shade(shirt,1.24);
    c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);
    // Neck and a more readable face profile.
    c.fillStyle=shade(skin,.78);c.beginPath();c.roundRect(-.1,-19.8,2.5,3.2,.8);c.fill();
    const face=c.createRadialGradient(2.1,-22.1,.35,1.7,-21.5,3.5);
    face.addColorStop(0,shade(skin,1.18));face.addColorStop(.72,skin);face.addColorStop(1,shade(skin,.72));
    c.fillStyle=face;c.beginPath();c.ellipse(1.55,-21.5,2.65,3.05,.12,0,TAU);c.fill();
    c.fillStyle=shade(skin,.62);c.beginPath();c.arc(3.35,-21.2,.75,0,TAU);c.fill();
    // Hairline / hairstyle variation is deterministic per player.
    const hair=['#171311','#302017','#4b3324','#17191c','#6a4b2e'][((p.skin||0)+(p.role||0))%5];
    c.fillStyle=hair;c.beginPath();
    if ((p.role||0)%4===0) { c.ellipse(1.25,-23.25,2.75,1.55,-.08,Math.PI,TAU);c.fill();c.fillRect(-1.3,-23.5,1.5,1.6); }
    else if ((p.role||0)%4===1) { c.ellipse(1.35,-23.25,2.7,1.15,0,Math.PI,TAU);c.fill(); }
    else if ((p.role||0)%4===2) { c.arc(1.3,-22.7,2.85,Math.PI*1.05,Math.PI*1.95);c.fill(); }
    else { c.ellipse(1.25,-23.15,2.55,1.35,0,Math.PI,TAU);c.fill();c.fillRect(-1.2,-23.2,1.1,1.4); }
    // Eye, brow and nose give a clear human face without over-detail at match scale.
    c.strokeStyle=shade(hair,.72);c.lineWidth=.42;c.beginPath();c.moveTo(2.25,-22.1);c.lineTo(2.95,-22.0);c.stroke();
    c.fillStyle='#171717';c.beginPath();c.arc(2.65,-21.75,.32,0,TAU);c.fill();
    c.strokeStyle=shade(skin,.58);c.lineWidth=.38;c.beginPath();c.moveTo(3.1,-21.2);c.lineTo(3.55,-20.85);c.stroke();
    // Neckline, shoulder seams, sleeve cuffs and shirt panel.
    c.strokeStyle='rgba(255,255,255,.62)';c.lineWidth=.48;c.beginPath();c.arc(.5,-16.7,2.15,Math.PI*1.05,Math.PI*1.95);c.stroke();
    c.strokeStyle=dark;c.lineWidth=.72;c.beginPath();c.moveTo(-3.6,-17.1);c.lineTo(-2.9,-14.5);c.moveTo(4.2,-17.1);c.lineTo(3.4,-14.5);c.stroke();
    c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=.42;c.beginPath();c.moveTo(-2.7,-18.1);c.lineTo(-2.7,-14.5);c.moveTo(3.4,-18.1);c.lineTo(3.4,-14.5);c.stroke();
    c.fillStyle=light;c.globalAlpha=.45;c.beginPath();c.moveTo(-.35,-18.8);c.lineTo(.15,-18.8);c.lineTo(.15,-13.8);c.lineTo(-.35,-13.8);c.closePath();c.fill();c.globalAlpha=1;
    // Small club crest and shirt number; no external club branding.
    c.fillStyle='rgba(255,255,255,.88)';c.beginPath();c.roundRect(-2.9,-17.4,1.05,1.35,.2);c.fill();
    c.fillStyle=dark;c.font='bold 1px sans-serif';c.textAlign='center';c.fillText(p.team===0?'11':'11',-2.38,-16.45);
    c.fillStyle='rgba(255,255,255,.8)';c.font='bold 2.1px sans-serif';c.textAlign='center';c.fillText(String(p.num||''),.7,-14.9);
    // Shorts hem and two subtle fabric highlights.
    c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=.48;c.beginPath();c.moveTo(-4.5,3.1);c.quadraticCurveTo(-1,4.1,3.6,3);c.stroke();
    c.fillStyle=shade(shorts,1.25);c.globalAlpha=.45;c.fillRect(-3.4,1.3,.6,2.2);c.fillRect(2.1,1.3,.6,2.2);c.globalAlpha=1;
    // Sock bands and boot studs.
    c.strokeStyle='rgba(255,255,255,.86)';c.lineWidth=.62;c.beginPath();c.moveTo(-2.5,7.4);c.lineTo(-.8,7.4);c.moveTo(1,7.4);c.lineTo(2.7,7.4);c.stroke();
    c.fillStyle='#090b0d';for(const bx of[-2.2,2.2]){c.beginPath();c.arc(bx,10.1,.34,0,TAU);c.fill();}
    c.restore();
  }
  if (typeof drawPlayer==='function') {
    const old=drawPlayer;
    drawPlayer=function(p,a){old(p,a);const x=p.px+(p.x-p.px)*a,y=p.py+(p.y-p.py)*a;humanDetail(p,x,y,p.rf===undefined?p.face:p.rf,PLAYER_SCALE,KIT[p.team],false);};
  }
  if (typeof drawPlayer3==='function') {
    const old=drawPlayer3;
    drawPlayer3=function(p,a){old(p,a);const x=p.px+(p.x-p.px)*a,y=p.py+(p.y-p.py)*a;pj(x,y,0);const fc=typeof faceSide==='function'?faceSide(p.rf===undefined?p.face:p.rf):1;humanDetail(p,V.sx,V.sy,p.rf===undefined?p.face:p.rf,V.s*PLAYER_SCALE*fc,KIT[p.team],true);};
  }
  function officialDetail(o,x,y,angle,scale,threeD) {
    const c=ctx,k=o.kit||{s:'#f0e000',sh:'#111',t:'#222'},skin=o.sk||'#c68642';
    c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);
    // Official shirt: contrasting shoulder panels, collar, chest badge and radio earpiece.
    c.fillStyle=k.s;c.beginPath();c.ellipse(-1,0,4.7,6.5,0,0,TAU);c.fill();
    c.fillStyle=k.t||'#222';c.beginPath();c.moveTo(-4.4,-4.8);c.lineTo(-1.1,-6.2);c.lineTo(-.2,-2.8);c.lineTo(-3.2,-1.9);c.closePath();c.fill();
    c.beginPath();c.moveTo(2.8,-5.7);c.lineTo(4.2,-4.5);c.lineTo(3.4,-1.8);c.lineTo(1.7,-2.5);c.closePath();c.fill();
    c.strokeStyle='rgba(255,255,255,.78)';c.lineWidth=.65;c.beginPath();c.moveTo(-1.7,-5.5);c.lineTo(-.8,-4.3);c.lineTo(.2,-5.5);c.stroke();
    c.fillStyle='#f2d34c';c.fillRect(1.4,-2.4,1.25,1.45);
    c.fillStyle=skin;c.beginPath();c.ellipse(1.5,-19.1,2.05,2.25,0,0,TAU);c.fill();
    c.fillStyle='#171311';c.beginPath();c.arc(1.4,-20.1,2.15,Math.PI,TAU);c.fill();
    c.fillStyle='#111';c.beginPath();c.arc(3.25,-19,.28,0,TAU);c.fill();
    c.strokeStyle='#d9d9d9';c.lineWidth=.6;c.beginPath();c.moveTo(3.4,-18.5);c.lineTo(4.2,-17.2);c.stroke();
    c.restore();
  }
  if (typeof drawFig2==='function') {
    const old=drawFig2;drawFig2=function(o){old(o);officialDetail(o,o.x,o.y,o.face||0,PLAYER_SCALE,false);};
  }
  if (typeof drawFig3==='function') {
    const old=drawFig3;drawFig3=function(o){old(o);pj(o.x,o.y,0);const fc=Math.cos(o.face)>=0?1:-1;officialDetail(o,V.sx,V.sy,o.face||0,V.s*PLAYER_SCALE*fc,true);};
  }
  window.P11CharacterVisuals={version:'1.0.0',style:'procedural-2.5D',scope:'players-goalkeepers-referee-assistants'};
})();
