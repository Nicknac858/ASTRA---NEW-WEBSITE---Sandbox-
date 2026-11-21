import { createWorld } from './world.js';

const $=s=>document.querySelector(s);
const chapters=[
 {id:'arrival',name:'AFTERIMAGE',caption:'A study in presence',sub:'An image is only the beginning.'},
 {id:'response',name:'THE RESPONSE',caption:'Web design / Experiments',sub:'An image becomes an interaction.'},
 {id:'gathering',name:'THE GATHERING',caption:'Events / Live experiences',sub:'Illustrative concept environment'},
 {id:'studio',name:'THE STUDIO',caption:'',sub:''},
];
const positions=[0,.3214,.6667,1];
const query=matchMedia('(prefers-reduced-motion:reduce)');
let reduced=query.matches,ambient=!reduced,target=0,progress=0,current=-1,time=0,last=performance.now(),world=null,failed=false;
let pointerX=0,pointerY=0,px=0,py=0,frames=0,statsTime=last;
let activeDialog=null,returnFocus=null;
let lockedY=0,previousTarget=0,energy=0,impulse=0;
const detailAnimations=new Map();

function maxScroll(){return Math.max(1,document.documentElement.scrollHeight-innerHeight);}
function readScroll(){target=Math.min(1,Math.max(0,scrollY/maxScroll()));}
function goTo(index){
 const el=document.getElementById(chapters[index].id);
 el.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
 history.replaceState(null,'','#'+chapters[index].id);
}
function nearest(p){return p<.16?0:p<.5?1:p<.84?2:3;}
function setCurrent(index){
 if(index===current)return;
 current=index;
 $('#chapter-number').textContent=String(index+1).padStart(2,'0');
 $('#chapter-name').textContent=chapters[index].name;
 $('#scene-kicker').textContent=chapters[index].caption;
 $('#scene-sub').textContent=chapters[index].sub;
 $('#scroll-text').textContent=index===3?'Back to the beginning':'Scroll to explore';
 $('.arrow').textContent=index===3?'↑':'↓';
 $('#next-scene').setAttribute('aria-label',index===3?'Return to the beginning':'Explore the next scene');
 document.querySelectorAll('[data-scene]').forEach((b,i)=>{
  if(i===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
 });
 document.documentElement.dataset.chapter=String(index+1);
}
function syncMotion(){
 $('#motion-label').textContent=ambient?'Pause motion':'Enable motion';
 $('.motion-icon').innerHTML=ambient?'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2v8M8 2v8"/></svg>':'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 2 7 4-7 4Z"/></svg>';
 $('#motion-toggle').setAttribute('aria-pressed',String(!ambient));
 document.documentElement.dataset.motion=ambient?'running':'paused';
 if(!ambient) for(const animation of detailAnimations.values()) animation.finish();
}
$('#motion-toggle').addEventListener('click',()=>{ambient=!ambient;reduced=ambient?false:query.matches;syncMotion();});
query.addEventListener('change',e=>{reduced=e.matches;ambient=!reduced;syncMotion();});
$('#next-scene').addEventListener('click',()=>goTo(current===3?0:current+1));
document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>goTo(Number(b.dataset.scene))));

function openDialog(dialog){
 if(activeDialog)return;
 returnFocus=document.activeElement;lockedY=scrollY;activeDialog=dialog;
 dialog.showModal();document.body.style.overflow='hidden';
 dialog.querySelector('.close-dialog').focus();
}
function closeDialog(dialog){dialog.close();}
for(const dialog of document.querySelectorAll('dialog')){
 dialog.querySelector('.close-dialog').addEventListener('click',()=>closeDialog(dialog));
 dialog.addEventListener('close',()=>{document.body.style.overflow='';activeDialog=null;returnFocus?.focus({preventScroll:true});readScroll();});
}
$('#index-open').addEventListener('click',()=>openDialog($('#index-dialog')));
$('#contact-open').addEventListener('click',()=>openDialog($('#contact-dialog')));
$('#studio-contact').addEventListener('click',()=>openDialog($('#contact-dialog')));
document.querySelectorAll('#index-dialog a').forEach(a=>a.addEventListener('click',e=>{
 e.preventDefault();const index=chapters.findIndex(c=>'#'+c.id===a.hash);
 closeDialog($('#index-dialog'));requestAnimationFrame(()=>goTo(index));
}));
$('.wordmark[href]').addEventListener('click',e=>{e.preventDefault();goTo(0);});
$('.skip').addEventListener('click',e=>{e.preventDefault();goTo(3);});
$('#copy-email').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText('n.young@higherrankmedia.com');$('#copy-status').textContent='Email address copied.';}
 catch{$('#copy-status').textContent='Select the email address above to copy it.';}
});
function revealDiscipline(button,open){
 const detail=document.getElementById(button.getAttribute('aria-controls'));
 const previous=detailAnimations.get(detail);
 if(button.getAttribute('aria-expanded')===String(open)&&!previous)return;
 const initial=detail.hidden?{height:'0px',opacity:0,paddingTop:'0px',paddingBottom:'0px'}:{height:detail.getBoundingClientRect().height+'px',opacity:getComputedStyle(detail).opacity,paddingTop:getComputedStyle(detail).paddingTop,paddingBottom:getComputedStyle(detail).paddingBottom};
 previous?.cancel();detailAnimations.delete(detail);
 button.setAttribute('aria-expanded',String(open));
 if(!ambient||reduced||query.matches){detail.hidden=!open;return;}
 detail.hidden=false;
 const natural=getComputedStyle(detail);
 const destination=open?{height:detail.getBoundingClientRect().height+'px',opacity:1,paddingTop:natural.paddingTop,paddingBottom:natural.paddingBottom}:{height:'0px',opacity:0,paddingTop:'0px',paddingBottom:'0px'};
 const animation=detail.animate([initial,destination],{duration:420,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
 detailAnimations.set(detail,animation);
 animation.onfinish=()=>{if(detailAnimations.get(detail)!==animation)return;detail.hidden=!open;detailAnimations.delete(detail);animation.cancel();};
}
document.querySelectorAll('[data-discipline]').forEach(button=>button.addEventListener('click',()=>{
 const open=button.getAttribute('aria-expanded')!=='true';
 document.querySelectorAll('[data-discipline]').forEach(b=>revealDiscipline(b,b===button&&open));
}));
addEventListener('scroll',readScroll,{passive:true});
function readPointer(e,kick=0){
 if(!ambient||reduced)return;
 const x=e.clientX/innerWidth*2-1,y=e.clientY/innerHeight*2-1;
 if(ambient&&!reduced)impulse=Math.min(1,impulse+Math.hypot(x-pointerX,y-pointerY)*.7+kick);
 pointerX=x;pointerY=y;
}
addEventListener('pointermove',e=>{if(e.pointerType==='mouse')readPointer(e);},{passive:true});
addEventListener('pointerdown',e=>{if(!e.target.closest('button,a,dialog'))readPointer(e,.8);},{passive:true});
addEventListener('pointerout',e=>{if(!e.relatedTarget){pointerX=0;pointerY=0;}});
addEventListener('resize',()=>{world?.resize();readScroll();},{passive:true});
document.addEventListener('visibilitychange',()=>{last=performance.now();});

function fallback(reason){
 failed=true;document.body.classList.remove('ready');document.body.classList.add('still-edition');
 $('#edition').textContent='AFTERIMAGE / STILL EDITION';
 document.documentElement.dataset.renderState='fallback';
 document.documentElement.dataset.fallbackReason=reason;
}
function frame(now){
 const elapsed=Math.min((now-last)/1000,.75),dt=Math.min(elapsed,.08);last=now;
 if(!document.hidden){
  const smoothing=(reduced||world?.software)?1:1-Math.exp(-dt*9);
  progress+=(target-progress)*smoothing;
  if(Math.abs(target-progress)<.0001)progress=target;
  if(ambient){px+=(pointerX-px)*Math.min(1,dt*4);py+=(pointerY-py)*Math.min(1,dt*4);}
  if(ambient&&!activeDialog){
   time+=elapsed;
   const speed=Math.max(-1,Math.min(1,(target-previousTarget)/Math.max(elapsed,.016)*3));
   energy+=(speed-energy)*(1-Math.exp(-elapsed*5));
   impulse*=Math.exp(-elapsed*1.9);
  }
  previousTarget=target;
  setCurrent(nearest(progress));
  $('#progress').style.width=(progress*100).toFixed(2)+'%';
  const atStudio=progress>.865;
  document.body.classList.toggle('at-studio',atStudio);
  $('#studio-content').inert=!atStudio;
  $('#scene-copy').style.opacity=atStudio?'0':'1';
  if(world&&!failed){
   try{world.render({progress,time,pointerX:px,pointerY:py,ambient,reduced,energy,impulse});}
   catch(e){console.error('Afterimage render failure',e);fallback('render');}
  }else{
   $('#fallback').style.filter=atStudio?'brightness(.35)':'none';
   $('.still-hand').style.opacity=progress<.2?'.9':progress<.5?'.25':'.1';
   $('.still-face').style.opacity=progress<.2?'.5':progress<.5?'.9':'.25';
   $('.still-live').style.opacity=progress>.5?'.85':'.3';
  }
  frames++;
  if(now-statsTime>2000){
   document.documentElement.dataset.observedFps=String(Math.round(frames*1000/(now-statsTime)));
   if(world&&!failed){const s=world.stats();$('#world').dataset.drawCalls=s.drawCalls;$('#world').dataset.triangles=s.triangles;$('#world').dataset.three=s.three;}
   frames=0;statsTime=now;
  }
 }
 requestAnimationFrame(frame);
}
const canvas=$('#world');
syncMotion();readScroll();progress=target;setCurrent(nearest(progress));requestAnimationFrame(frame);
try{
 world=await createWorld(canvas,fallback);
 if(world&&!failed){
  world.render({progress,time:0,ambient,reduced});
  if(!failed){document.body.classList.add('ready');document.documentElement.dataset.appReady='true';}
 }
}catch(e){console.error('Afterimage initialization failed',e);fallback('initialization');}
document.documentElement.dataset.appReady='true';
