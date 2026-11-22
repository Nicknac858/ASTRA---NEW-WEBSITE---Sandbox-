'use strict';
(()=>{
  const byId=id=>document.getElementById(id),stage=byId('stage'),sheet=byId('sheet'),motion=byId('motion');
  const targets=[...document.querySelectorAll('.window-target')], light=byId('light'), lightContext=light.getContext('2d');
  const state={time:0,p:0,active:-1,pointer:[0,0],target:[0,0],scene:null,frame:0,previous:null,width:0,height:0,running:false,quality:1,lastLabel:null};
  const pref=matchMedia('(prefers-reduced-motion: reduce)'),query=new URLSearchParams(location.search);
  const review=query.has('review');
  let explicit=null,manual=false,initialized=false,modeToken=0,renderer,canvas=byId('scene'),returnFocus=null,priorScroll=0,dialogRoute=null;
  const cache=new Map(),frameTimes=[];
  const names={ideas:'Ideas & experiments',inspiration:'Inspiration',index:'Index'};
  const text={ideas:'A hand lifts a length of sheer fabric. Move along the wire to see how the image slips behind the cyan fold.',
    inspiration:'A second fragment hangs deeper in the knot. As you descend, it turns into view across the fuchsia return.'};
  const touchOnly=matchMedia('(pointer: coarse)').matches;
  const reduced=()=>pref.matches&&explicit!==true;
  const isPaused=()=>explicit===false||(explicit===null&&pref.matches);
  const isPlaying=()=>!isPaused()&&!sheet.open&&!document.hidden&&!manual;
  function updateMotion(){
    const pause=isPaused(),label=pause?'Play motion':'Pause motion';
    motion.toggleAttribute('data-paused',pause);motion.setAttribute('aria-label',label);motion.title=label;
    document.documentElement.dataset.motion=pause?'still':'live';
  }
  const readImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Image decode failed'));img.src=src;});
  async function assets(name){
    if(!cache.has(name))cache.set(name,(async()=>{
      const set=NC_ASSETS.images[name];
      const [ribbons,p0,p1]=await Promise.all([set.ribbons,...set.panels].map(readImage));
      return createScene(name,NC_ASSETS.guides[name],{ribbons,panels:[p0,p1]});
    })());
    return cache.get(name);
  }
  function useCompatibility() {
    const next=canvas.cloneNode(false);canvas.replaceWith(next);canvas=next;
    renderer=new WovenCanvas(canvas);
    if(state.scene)renderer.useScene(state.scene);
  }
  try{
    if(query.has('compat'))throw Error('Compatibility preview');
    renderer=new GlassRenderer(canvas);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();useCompatibility();resize(true);});
  }catch{useCompatibility();}
  function schedule(){
    if(!state.frame&&!document.hidden&&!manual)state.frame=requestAnimationFrame(tick);
  }
  function scrollUnits(){
    const max=document.documentElement.scrollHeight-innerHeight;
    return max>0?clamp(scrollY/max):0;
  }
  function scrollToProgress(p,animated=false){
    window.scrollTo({top:p*Math.max(0,document.documentElement.scrollHeight-innerHeight),behavior:animated&&!reduced()?'smooth':'instant'});
  }
  function targetBoxes(scene,view,t) {
    targets.forEach((btn,i)=>{
      const pts=windowCorners(scene,i,view,t).map(p=>view.project(p));
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
      const x=Math.min(...xs), y=Math.min(...ys),w=Math.max(1,Math.max(...xs)-x),h=Math.max(1,Math.max(...ys)-y);
      btn.style.cssText='left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;clip-path:polygon('+pts.map(p=>((p[0]-x)*100/w).toFixed(2)+'% '+((p[1]-y)*100/h).toFixed(2)+'%').join(',')+')';
    });
  }
  function render(){
    const s=state.scene;if(!s)return;
    const progress=reduced()?(state.p<.52?0:1):state.p;
    const view=camera(s,state.width,state.height,progress,state.time,state.pointer,reduced());
    renderer.render(s,view,state.time,state.active);targetBoxes(s,view,state.time);
    const ctx=lightContext,ratio=light.width/view.width;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,view.width,view.height);
    ctx.globalCompositeOperation='lighter';
    const center=view.project(wave(s.contact,state.time)),tip=view.project(wave(s.emitter,state.time));
    const phase=state.time%6;
    const main=Math.exp(-.5*((phase-1.5)/.14)**2),hit=Math.exp(-.5*((phase-1.82)/.115)**2);
    const unit=view.sc;
    spot(ctx,center,unit*(23+16*main),[1,.28,.62],.15+.39*main);
    spot(ctx,center,unit*(4+5*main),[1,.88,.95],.42+.42*main);
    spot(ctx,tip,unit*(10+18*hit),[1,.33,.70],.09+.57*hit);
    spot(ctx,tip,unit*(2.5+4*hit),[.83,.95,1],.22+.77*hit);
    ctx.globalCompositeOperation='source-over';
    state.view=view;stage.dataset.ready=renderer.kind;
    stage.style.setProperty('--progress',state.p);
    const label=state.p>.88?'Back to the knot':'Follow the wire';
    if(state.lastLabel!==label){byId('follow-word').textContent=label;state.lastLabel=label;}
  }
  function tick(now){
    state.frame=0;
    const live=isPlaying();
    if(live&&state.previous!==null){
      const ms=now-state.previous;state.time+=Math.min(ms,180)/1000;
      if(ms>0&&ms<850){frameTimes.push(ms);if(frameTimes.length>360)frameTimes.shift();}
    }
    state.previous=live?now:null;
    if(live){state.pointer=state.pointer.map((v,i)=>mix(v,state.target[i],.095));}
    state.p=scrollUnits();render();
    if(live)schedule();
  }
  async function resize(force=false){
    const w=stage.clientWidth,h=stage.clientHeight;
    const name=w/h<=.8?'portrait':'wide',token=++modeToken;
    if(!state.scene||state.scene.name!==name){
      const s=await assets(name);if(token!==modeToken)return;
      state.scene=s;renderer.useScene(s);
    }
    state.width=w;state.height=h;
    const budget=renderer.kind==='WebGL 2'?4700000:1600000;
    const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(budget/(w*h)))*state.quality;
    for(const el of [canvas,light]){
      const r=el===light?Math.min(ratio,1.5):ratio;
      const width=Math.max(1,Math.round(w*r)),height=Math.max(1,Math.round(h*r));
      if(el.width!==width||el.height!==height||force){el.width=width;el.height=height;}
    }
    state.p=scrollUnits();render();initialized=true;schedule();
  }
  function freezeScroll(on){
    if(on){priorScroll=scrollY;document.documentElement.style.overflow='hidden';}
    else {document.documentElement.style.overflow='';window.scrollTo({top:priorScroll,behavior:'instant'});}
  }
  function fillPanel(route){
    const body=byId('sheet-body');body.replaceChildren();
    const title=document.createElement('h2');title.id='sheet-title';title.textContent=names[route];body.append(title);
    if(route==='index'){
      const links=document.createElement('div');links.className='sheet-links';
      for(const [key,label] of [['opening','Opening knot'],['ideas',names.ideas],['inspiration',names.inspiration]]){
        const b=document.createElement('button');b.type='button';b.textContent=label;
        b.addEventListener('click',()=>{
          if(key==='opening'){closePanel();requestAnimationFrame(()=>scrollToProgress(0));return;}
          const idx=key==='ideas'?0:1;returnFocus=targets[idx];priorScroll=(idx?.88:.34)*(document.documentElement.scrollHeight-innerHeight);
          window.scrollTo({top:priorScroll,behavior:'instant'});state.p=scrollUnits();render();
          history.replaceState({nc:true},'', '#'+key);show(key);
        });links.append(b);
      }
      body.append(links);
    }else{
      const i=route==='ideas'?0:1,figure=document.createElement('figure'),im=document.createElement('img'),cap=document.createElement('figcaption');
      im.src=NC_ASSETS.images[state.scene?.name||'wide'].panels[i];
      im.alt=i?'A monochrome fold of sheer fabric.':'A monochrome hand suspended over sheer fabric.';
      cap.textContent='Concept imagery';figure.append(im,cap);body.append(figure);
      const p=document.createElement('p');p.textContent=text[route];body.append(p);
    }
  }
  function show(route){
    if(!names[route])return;
    if(!sheet.open){freezeScroll(true);sheet.showModal();}
    dialogRoute=route;fillPanel(route);state.previous=null;byId('close').focus({preventScroll:true});schedule();
  }
  function choose(route,opener){
    returnFocus=opener;
    if(location.hash!=='#'+route)history.pushState({nc:true},'', '#'+route);
    show(route);
  }
  function hide(){
    if(!sheet.open)return;
    sheet.close();dialogRoute=null;freezeScroll(false);state.previous=null;
    (returnFocus||byId('index')).focus({preventScroll:true});returnFocus=null;schedule();
  }
  function closePanel(){
    if(history.state?.nc){history.back();}
    else {history.replaceState(null,'',location.pathname+location.search);hide();}
  }
  const fromURL=()=>{const r=location.hash.slice(1);if(names[r])show(r);else hide();};
  window.addEventListener('popstate',fromURL);
  sheet.addEventListener('cancel',e=>{e.preventDefault();closePanel();});
  sheet.addEventListener('click',e=>{if(e.target===sheet){const box=sheet.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)closePanel();}});
  byId('close').onclick=closePanel;byId('index').onclick=e=>choose('index',e.currentTarget);
  byId('follow').onclick=()=>scrollToProgress(state.p>.88?0:1,true);
  byId('home').onclick=()=>scrollToProgress(0,true);
  motion.onclick=()=>{explicit=isPaused();state.previous=null;updateMotion();schedule();};
  pref.addEventListener('change',()=>{explicit=null;state.previous=null;updateMotion();schedule();});
  for(const [i,b] of targets.entries()){
    b.onclick=()=>choose(b.dataset.panel,b);
    for(const ev of ['pointerenter','focus'])b.addEventListener(ev,()=>{state.active=i;schedule();});
    for(const ev of ['pointerleave','blur'])b.addEventListener(ev,()=>{if(state.active===i)state.active=-1;schedule();});
  }
  addEventListener('pointermove',e=>{if(!touchOnly&&!sheet.open&&e.pointerType!=='touch'){state.target=[clamp(e.clientX/innerWidth)*2-1,clamp(e.clientY/innerHeight)*2-1];}},{passive:true});
  document.addEventListener('pointerleave',()=>{state.target=[0,0];});
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',()=>resize());document.addEventListener('visibilitychange',()=>{state.previous=null;if(!document.hidden)schedule();});
  if(review)window.currentReview={
    ready:()=>initialized,
    frame(time,progress){manual=true;if(state.frame)cancelAnimationFrame(state.frame);state.frame=0;state.time=time;state.p=progress;state.pointer=[0,0];render();},
    resume(){manual=false;state.previous=null;schedule();},
    stats(){const a=[...frameTimes].sort((x,y)=>x-y);return {renderer:renderer.kind,device:renderer.device,viewport:[state.width,state.height],buffer:[canvas.width,canvas.height],dpr:devicePixelRatio,scene:state.scene?.name,clock:state.time,progress:state.p,activeVideos:document.querySelectorAll('video').length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],count:a.length};},
    project(p){return state.view.project(p);},
  };
  updateMotion();
  resize().then(()=>{if(location.hash)fromURL();}).catch(e=>{stage.dataset.error=e.message;});
})();
