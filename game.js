'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const el=id=>document.getElementById(id),imgs={};
let assetsReady=false;
el('play').disabled=true;el('play').textContent='Loading images…';
if(!ctx.roundRect)ctx.roundRect=function(x,y,w,h){this.rect(x,y,w,h);return this};
let state='ready',paused=false,muted=false,audioCtx,score=0,best=0,hot=0,t=0,travel=0,last=0,pipes=[],snacks=[],particles=[],popups=[],spawn=0,deathTime=0,W=1100,H=620;
let enemies=[],attackTimer=3;
const bird={x:280,y:290,vy:0,r:24};
try{best=Number(localStorage.getItem('snack-flight-best'))||0}catch{}el('best').textContent=best;
const ready=Promise.all(['face','dead','blue','red','enemy'].map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{imgs[name]=im;resolve()};im.onerror=reject;im.src=`assets/${name}.png`;})));
function resize(){
 const mobile=window.innerWidth<=700,nextW=mobile?420:1100;
 if(canvas.width===nextW&&canvas.height===H)return;
 W=nextW;canvas.width=W;canvas.height=H;bird.x=mobile?110:280;
 if(state==='playing'){paused=true;el('paused').hidden=false;el('pause').textContent='▶ Resume'}
}
window.addEventListener('resize',resize);resize();
function sound(type){if(muted)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const notes=type==='red'?[440,660,880]:type==='blue'?[660]:type==='dead'?[180,110]:[250];notes.forEach((n,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),s=audioCtx.currentTime+i*.09;o.type=type==='dead'?'sawtooth':'sine';o.frequency.setValueAtTime(n,s);o.frequency.exponentialRampToValueAtTime(type==='flap'?420:n*.8,s+.13);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(.12,s+.01);g.gain.exponentialRampToValueAtTime(.0001,s+.19);o.connect(g);g.connect(audioCtx.destination);o.start(s);o.stop(s+.2);})}catch{}}
function begin(){if(!assetsReady)return;state='playing';paused=false;enemies=[];attackTimer=3+Math.random()*2;score=0;hot=0;travel=0;pipes=[];snacks=[];particles=[];popups=[];spawn=.55+Math.random()*.35;bird.y=290;bird.vy=-290;deathTime=0;el('score').textContent='0';el('start').hidden=true;el('over').hidden=true;el('paused').hidden=true;el('pause').textContent='Ⅱ Pause';sound('flap');canvas.focus({preventScroll:true});}
function flap(){if(state==='ready')begin();else if(state==='playing'&&!paused){bird.vy=-325;sound('flap')}}
function togglePause(){if(state!=='playing')return;paused=!paused;el('paused').hidden=!paused;el('pause').textContent=paused?'▶ Resume':'Ⅱ Pause'}
el('play').onclick=begin;el('retry').onclick=begin;el('resume').onclick=togglePause;el('pause').onclick=togglePause;el('sound').onclick=()=>{muted=!muted;el('sound').textContent=muted?'♪ Sound off':'♪ Sound on';el('sound').setAttribute('aria-pressed',String(muted))};
function tapFlap(e){e.preventDefault();flap()}
if('PointerEvent' in window)canvas.addEventListener('pointerdown',tapFlap);
else {canvas.addEventListener('touchstart',tapFlap,{passive:false});canvas.addEventListener('mousedown',tapFlap)}
document.addEventListener('keydown',e=>{if(e.code==='KeyP'){togglePause();return}if(['Space','ArrowUp'].includes(e.code)&&!e.repeat){if(e.target.tagName==='BUTTON')return;e.preventDefault();flap()}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'&&!paused)togglePause()});
function addPipe(){const gap=210+Math.random()*25,cy=185+Math.random()*215,x=W+90;const p={x,cy,gap,w:72,color:Math.random()>.5?'teal':'coral'};pipes.push(p);snacks.push({x:x+36,y:cy+(Math.random()-.5)*52,red:Math.random()<.3,taken:false});}
function collect(s){s.taken=true;score+=s.red?3:1;el('score').textContent=score;if(s.red)hot=5;sound(s.red?'red':'blue');popups.push({x:bird.x,y:bird.y-55,text:s.red?'HOT! +2':'YUMMY! +1',sub:s.red?'+1 CRUNCH · +2 HEAT':'',red:s.red,life:1.35});for(let i=0;i<15;i++)particles.push({x:s.x,y:s.y,vx:(Math.random()-.5)*190,vy:(Math.random()-.5)*190,life:.65,c:s.red?'#ff603f':'#ffe18a'});}
function die(){if(state!=='playing')return;state='falling';bird.vy=-160;deathTime=0;hot=0;sound('dead');}
function finish(){state='over';if(score>best){best=score;try{localStorage.setItem('snack-flight-best',String(best))}catch{}}el('best').textContent=best;el('finalScore').textContent=score;el('over').hidden=false;el('retry').focus();}
function update(dt){if(paused)return;t+=dt;if(state==='playing'){updateEnemies(dt);hot=Math.max(0,hot-dt);const speed=(W<650?145:195)*(hot>0?2.25:1);travel+=speed*dt;bird.vy+=830*dt;bird.y+=bird.vy*dt;spawn-=speed*dt/330;if(spawn<=0){addPipe();spawn=.9+Math.random()*.25}for(const p of pipes){p.x-=speed*dt;if(bird.x+bird.r>p.x-6&&bird.x-bird.r<p.x+p.w+6&&(bird.y-bird.r<p.cy-p.gap/2||bird.y+bird.r>p.cy+p.gap/2))die()}for(const s of snacks){s.x-=speed*dt;if(state==='playing'&&!s.taken&&Math.hypot(s.x-bird.x,s.y-bird.y)<bird.r+23)collect(s)}pipes=pipes.filter(p=>p.x>-100);snacks=snacks.filter(s=>s.x>-80&&!s.taken);if(bird.y+bird.r>H-48||bird.y-bird.r<0)die();}else if(state==='falling'){deathTime+=dt;bird.vy+=1100*dt;bird.y=Math.min(H-73,bird.y+bird.vy*dt);if(deathTime>1.2)finish()}else if(state==='ready'){bird.y=290+Math.sin(t*2)*12;travel+=22*dt}for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);for(const p of popups){p.y-=35*dt;p.life-=dt}popups=popups.filter(p=>p.life>0);el('heat').hidden=hot<=0;el('timer').textContent=`${hot.toFixed(1)}s`;}
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
function cloud(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,0,57,20,'#ffffffb0');ellipse(-23,-12,24,23,'#ffffffb0');ellipse(13,-23,31,32,'#ffffffb0');ellipse(42,-6,24,22,'#ffffffb0');ctx.restore()}
function background(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#91dfe9');g.addColorStop(1,'#d4f3dd');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ellipse(W-140,110,42,42,'#fff4af');for(let i=0;i<7;i++)cloud(((i*240-travel*.15)%(W+300)+W+300)%(W+300)-100,95+(i%3)*110,.6+(i%3)*.25);ctx.fillStyle='#b2ddbf';ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W+20;x+=20)ctx.lineTo(x,H-65-25*Math.sin(x*.008+travel*.0005));ctx.lineTo(W,H);ctx.fill();ctx.fillStyle='#e4e8b9';ctx.fillRect(0,H-48,W,48);ctx.fillStyle='#7eae77';ctx.fillRect(0,H-48,W,6);ctx.fillStyle='#c3ca8c';for(let x=-travel%32;x<W;x+=32)ctx.fillRect(x,H-30,12,3);}
function pipeRect(x,y,w,h,color){if(h<=0)return;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=color==='teal'?'#3e9990':'#ed9873';ctx.fillRect(x,y,w,h);ctx.strokeStyle=color==='teal'?'#5eb6a5':'#f9b994';ctx.lineWidth=15;for(let yy=y-h-100;yy<y+h+100;yy+=46){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy+w);ctx.stroke()}ctx.fillStyle='#ffffff30';ctx.fillRect(x+6,y,7,h);ctx.restore();ctx.strokeStyle='#285254';ctx.lineWidth=3;ctx.strokeRect(x,y,w,h)}
function drawPipe(p){const top=p.cy-p.gap/2,bottom=p.cy+p.gap/2;pipeRect(p.x,-10,p.w,top+10,p.color);pipeRect(p.x,bottom,p.w,H-bottom-48,p.color);for(const yy of [top-20,bottom]){ctx.fillStyle=p.color==='teal'?'#72c5a9':'#ffbc8e';ctx.strokeStyle='#285254';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(p.x-7,yy,p.w+14,20,4);ctx.fill();ctx.stroke()}}
function wing(side,dead){ctx.save();ctx.translate(side*24,14);ctx.rotate(side*(dead?.9:Math.sin(t*20)*.4-.3));ctx.scale(side,1);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(17,-29,42,-28,39,-15);ctx.bezierCurveTo(50,-15,47,-3,37,1);ctx.bezierCurveTo(46,6,32,18,20,16);ctx.quadraticCurveTo(7,16,0,0);ctx.fillStyle='#fffdf1';ctx.strokeStyle='#2a5153';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(12,5);ctx.lineTo(32,-8);ctx.strokeStyle='#b4d7ce';ctx.stroke();ctx.restore()}
function drawBird(){ctx.save();let bx=bird.x;if(state==='ready'&&W>650)bx=310;if(state==='ready'&&W<650)bx=90;ctx.translate(bx,bird.y);const dead=state==='falling'||state==='over';ctx.rotate(dead?Math.min(deathTime*2,1.5):state==='playing'?Math.max(-.3,Math.min(.5,bird.vy*.001)):-.12);const scale=state==='ready'?1.7:1;ctx.scale(scale,scale);if(hot>0){ctx.shadowColor='#ff5634';ctx.shadowBlur=25;ellipse(0,0,36,40,'#ff754b66');ctx.shadowBlur=0}wing(-1,dead);wing(1,dead);ctx.save();ctx.beginPath();ctx.moveTo(-29,-20);ctx.bezierCurveTo(-37,-47,28,-49,33,-25);ctx.bezierCurveTo(38,-12,29,23,18,31);ctx.quadraticCurveTo(0,43,-20,28);ctx.quadraticCurveTo(-34,16,-29,-20);ctx.clip();if(imgs.face)ctx.drawImage(imgs.face,155,5,930,1130,-35,-43,70,85);if(hot>0){ctx.globalCompositeOperation='source-atop';ctx.fillStyle='#ff240859';ctx.fillRect(-40,-45,80,90)}ctx.restore();if(dead){ctx.strokeStyle='#fff';ctx.lineWidth=7;for(const x of [-13,13]){ctx.beginPath();ctx.moveTo(x-6,-5);ctx.lineTo(x+6,7);ctx.moveTo(x+6,-5);ctx.lineTo(x-6,7);ctx.stroke()}ctx.strokeStyle='#253b40';ctx.lineWidth=3;for(const x of [-13,13]){ctx.beginPath();ctx.moveTo(x-6,-5);ctx.lineTo(x+6,7);ctx.moveTo(x+6,-5);ctx.lineTo(x-6,7);ctx.stroke()}}else if(hot>0){for(const x of [-13,13]){ellipse(x,0,12,10,'#ffb4a8');ellipse(x,-1,10,8,'#fffdf2');ellipse(x,-1,4.5,6,'#bc9361');ctx.strokeStyle='#e94641';ctx.lineWidth=1;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*10,-3);ctx.lineTo(x+side*6,-1);ctx.lineTo(x+side*8,3);ctx.stroke()}}}ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);background();pipes.forEach(drawPipe);for(const s of snacks){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.sin(t*3+s.x)*.09);ctx.shadowColor=s.red?'#ff6435':'#fffab4';ctx.shadowBlur=20;ellipse(0,0,27,31,s.red?'#ffaf7277':'#fff8ac88');ctx.shadowBlur=0;const im=imgs[s.red?'red':'blue'];if(im){ctx.save();ctx.beginPath();ctx.moveTo(-20,-27);ctx.lineTo(20,-27);ctx.lineTo(18,-16);ctx.lineTo(18,17);ctx.lineTo(20,27);ctx.lineTo(-20,27);ctx.lineTo(-18,16);ctx.lineTo(-18,-16);ctx.closePath();ctx.clip();if(s.red)ctx.drawImage(im,155,50,690,900,-21,-28,42,56);else ctx.drawImage(im,80,15,356,490,-21,-28,42,56);ctx.restore()}ctx.restore()}drawEnemies();drawBird();for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*2);ellipse(p.x,p.y,3,3,p.c)}ctx.globalAlpha=1;for(const p of popups){ctx.save();ctx.globalAlpha=Math.min(1,p.life*2);ctx.font='700 26px Fredoka, sans-serif';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#fff9e5';ctx.strokeText(p.text,p.x,p.y);ctx.fillStyle=p.red?'#df442b':'#23747f';ctx.fillText(p.text,p.x,p.y);if(p.sub){ctx.font='700 10px sans-serif';ctx.fillText(p.sub,p.x,p.y+20)}ctx.restore()}}
function frame(now){const dt=Math.min((now-last)/1000||0,.033);last=now;update(dt);draw();requestAnimationFrame(frame)}
ready.then(()=>{assetsReady=true;el('play').disabled=false;el('play').textContent="Let's fly ↗";requestAnimationFrame(frame)}).catch(()=>{el('play').textContent='Image loading failed — tap to retry';el('play').disabled=false;el('play').onclick=()=>location.reload()});

// Enemies commit to a telegraphed straight-line charge, leaving time to dodge.
function spawnEnemy(side=Math.floor(Math.random()*4),mode=['horizontal','falling','charge'][Math.floor(Math.random()*3)]){
  const target={x:bird.x,y:Math.max(110,Math.min(H-145,bird.y+(Math.random()-.5)*90))};
  let x,y,vx,vy,gravity=0;
  const speed=190+Math.random()*45;
  if(mode==='horizontal'||mode==='falling'){
    side=Math.random()<.5?0:1;x=side===0?-60:W+60;
    vx=side===0?speed:-speed;
    if(mode==='horizontal'){y=target.y;vy=0}
    else{
      // Sideways flight curves downward; the dotted preview uses the same gravity.
      const flight=Math.abs((target.x-x)/vx);
      gravity=Math.min(45,210/(flight*flight));vy=12+Math.random()*10;
      y=target.y-vy*flight-.5*gravity*flight*flight;
    }
  }else{
    if(side===0){x=-60;y=70+Math.random()*400}
    else if(side===1){x=W+60;y=70+Math.random()*400}
    else{x=bird.x+(Math.random()<.5?-1:1)*(140+Math.random()*140);x=Math.max(-50,Math.min(W+50,x));y=side===2?-60:H+60}
    const distance=Math.hypot(target.x-x,target.y-y);vx=(target.x-x)/distance*speed;vy=(target.y-y)/distance*speed;
  }
  enemies.push({x,y,sx:x,sy:y,tx:target.x,ty:target.y,vx,vy,initialVy:vy,gravity,mode,warn:1.8,life:10,r:25,side});
  sound('red');
}
function updateEnemies(dt){
  attackTimer-=dt;
  if(attackTimer<=0&&enemies.length===0){spawnEnemy();attackTimer=4+Math.random()*3}
  for(const e of enemies){
    if(e.warn>0){e.warn=Math.max(0,e.warn-dt);continue}
    e.life-=dt;const ox=e.x,oy=e.y;e.x+=e.vx*dt;e.y+=e.vy*dt+.5*(e.gravity||0)*dt*dt;e.vy+=(e.gravity||0)*dt;
    // Swept circle test prevents fast charges from skipping the player.
    const dx=e.x-ox,dy=e.y-oy,u=Math.max(0,Math.min(1,((bird.x-ox)*dx+(bird.y-oy)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(ox+u*dx-bird.x,oy+u*dy-bird.y)<e.r+bird.r-5)die();
  }
  enemies=enemies.filter(e=>e.life>0&&e.x>-130&&e.x<W+130&&e.y>-130&&e.y<H+130);
}
function enemyFace(x,y,angle=0,scale=1){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
  ctx.shadowColor='#e94b36';ctx.shadowBlur=16;ellipse(0,3,35,38,'#e9553c');ctx.shadowBlur=0;
  wing(-1,false);wing(1,false);
  ctx.save();ctx.beginPath();ctx.ellipse(0,0,31,37,0,0,Math.PI*2);ctx.clip();
  if(imgs.enemy)ctx.drawImage(imgs.enemy,120,130,1110,1280,-34,-40,68,80);
  ctx.restore();
  // Exaggerated angry eyebrows keep the supplied face recognizable.
  ctx.strokeStyle='#251d20';ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-23,-9);ctx.lineTo(-7,-2);ctx.moveTo(7,-2);ctx.lineTo(23,-9);ctx.stroke();
  ctx.strokeStyle='#ff5034';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(23,-30);ctx.lineTo(23,-37);ctx.moveTo(27,-27);ctx.lineTo(34,-29);ctx.stroke();
  ctx.fillStyle='#ffd061';ctx.strokeStyle='#573e2c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-7,16);ctx.lineTo(7,16);ctx.lineTo(0,25);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function drawEnemies(){
  if(state==='ready'){
    enemyFace(W<650?W-64:W-190, W<650?150:205,Math.sin(t*2)*.12,W<650?.85:1.2);
    ctx.font='700 10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#b24430';ctx.fillText('WATCH OUT FOR THIS GUY',W<650?W-105:W-190,W<650?210:275);return;
  }
  for(const e of enemies){
    if(e.warn>0){
      const x=Math.max(25,Math.min(W-25,e.sx)),y=Math.max(28,Math.min(H-70,e.sy));
      ctx.save();ctx.globalAlpha=.45+Math.sin(t*18)*.18;ctx.strokeStyle='#d93631';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(e.sx,e.sy);for(let ahead=.05;ahead<9;ahead+=.05){const px=e.sx+e.vx*ahead,py=e.sy+e.initialVy*ahead+.5*e.gravity*ahead*ahead;ctx.lineTo(px,py);if(px < -80||px>W+80||py>H+80)break}ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=1;ellipse(x,y,19,19,'#ff6045');ctx.fillStyle='white';ctx.textAlign='center';ctx.font='700 25px sans-serif';ctx.fillText('!',x,y+9);
      ctx.font='700 12px sans-serif';ctx.fillStyle='#9a3025';ctx.fillText(e.mode==='falling'?'FALLING SWOOP!':e.mode==='horizontal'?'SIDE ATTACK!':'INCOMING!',Math.max(75,Math.min(W-75,x)),Math.max(55,y-28));ctx.fillStyle='#fffbed';ctx.fillRect(W/2-155,H-110,310,38);ctx.fillStyle='#9a3025';ctx.font='700 11px sans-serif';ctx.fillText('DODGE THE DOTTED PATH',W/2,H-95);ctx.font='10px sans-serif';ctx.fillText('Tap to rise · Release to drop',W/2,H-81);ctx.restore();
    }else{
      ctx.save();ctx.strokeStyle='#e75c4655';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(e.x-e.vx*.16,e.y-e.vy*.16);ctx.lineTo(e.x,e.y);ctx.stroke();ctx.restore();
      enemyFace(e.x,e.y,Math.atan2(e.vy,Math.abs(e.vx))*.22);
    }
  }
}