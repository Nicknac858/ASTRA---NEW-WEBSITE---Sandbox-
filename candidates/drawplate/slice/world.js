'use strict';
const TAU = 2 * Math.PI;
const clamp = (n, a=0, b=1) => Math.max(a, Math.min(b,n));
const mix = (a,b,t) => a+(b-a)*t;
const smooth = t => { t=clamp(t); return t*t*(3-2*t); };
const xyz = (a,b,t) => a.map((v,k)=>mix(v,b[k],t));
const norm = v => { const l=Math.hypot(...v)||1; return v.map(n=>n/l); };
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const plus = (a,b) => a.map((v,i)=>v+b[i]);
const scale3 = (a,v) => a.map(x=>x*v);
const sub = (a,b) => a.map((v,i)=>v-b[i]);

function restPoint(scene,x,y,z) {
  const k=1-z/scene.distance;
  return [(x-scene.size[0]/2)*k,(y-scene.size[1]/2)*k,z];
}
function guideSample(guide,t) {
  const end=guide.path.length-1, at=clamp(t)*end, i=Math.min(Math.floor(at),end-1);
  const p=xyz(guide.path[i],guide.path[i+1],at-i);
  const a=guide.path[Math.max(0,i-1)], b=guide.path[Math.min(end,i+2)];
  const l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
  return {p, nx:-(b[1]-a[1])/l, ny:(b[0]-a[0])/l};
}
function surfacePoint(scene,guide,t,side,back=false) {
  const {p,nx,ny}=guideSample(guide,t);
  const r=Math.sqrt(Math.max(0,1-side*side));
  const z=p[2]+p[3]*(r*(back?-.26:.26)+side*(.18*Math.sin(TAU*t+guide.index*.73)));
  return restPoint(scene,p[0]+nx*p[3]*side,p[1]+ny*p[3]*side,z);
}
function wave(p,t) {
  const a=p[0]*.0045+p[1]*.0031, b=p[1]*.006-p[2]*.003;
  return [p[0]+12*(Math.sin(t*.81+a)-Math.sin(a))+4*(Math.sin(t*1.49-b)-Math.sin(-b)),
          p[1]+9*(Math.sin(t*.64+b)-Math.sin(b))+4*(Math.sin(t*1.12+a)-Math.sin(a)),
          p[2]+17*(Math.sin(t*.71+a-b)-Math.sin(a-b))];
}
function camera(scene,width,height,progress,time,pointer,reduced) {
  const u=smooth(progress),portrait=scene.size[1]>scene.size[0], d=scene.distance;
  const fit=Math.min(width/scene.size[0],height/scene.size[1]);
  const fill=Math.max(width/scene.size[0],height/scene.size[1]);
  const sc=Math.min(fill,fit*(portrait?1.14:1.29))*(1+.085*u);
  const drift=reduced?0:1;
  const yaw=.24*u+drift*(Math.sin(time*.237)*.100+pointer[0]*.051);
  const pitch=-.066*u+drift*(Math.sin(time*.33)*.020+pointer[1]*.022);
  const roll=.016*u+drift*.007*Math.sin(time*.28);
  const cy=Math.cos(yaw), sy=Math.sin(yaw), cx=Math.cos(pitch), sx=Math.sin(pitch);
  const cz=Math.cos(roll), sz=Math.sin(roll);
  const rotate=([x,y,z])=>{
    const xx=cy*x+sy*z, zz=-sy*x+cy*z, yy=cx*y-sx*zz;
    return [xx*cz-yy*sz,xx*sz+yy*cz,y*sx+zz*cx];
  };
  const rotation=[...rotate([1,0,0]),...rotate([0,1,0]),...rotate([0,0,1])];
  const center=scene.move.map(n=>n*u);
  const offset=[0,portrait?Math.min(height*.052,44)*(1-u):0];
  return {width,height,sc,d,rotation,center,offset,rotate,u,
    project(p) {
      const q=rotate(sub(p,center)), distance=d-q[2], k=d*sc/distance;
      return [width/2+offset[0]+q[0]*k,height/2+offset[1]+q[1]*k,distance];
    }};
}
function windowCorners(scene,index,view,time) {
  const raw=scene.windows[index].map(q=>restPoint(scene,...q)),u=view.u;
  const center=raw.reduce((a,p)=>plus(a,scale3(p,.25)),[0,0,0]);
  const portrait=scene.size[0]<scene.size[1];
  const turn=(index?-.32:.20)*u+.018*Math.sin(time*.43+index)*Math.min(time,1);
  const growth=1+(index?1.35:.32)*u;
  const drift=index?[(portrait?-120:-144)*u,113*u,360*u]:[(portrait?-7:-63)*u,126*u,115*u];
  return raw.map(p=>{
    const d=scale3(sub(p,center),growth);
    const rot=[Math.cos(turn)*d[0]+Math.sin(turn)*d[2], d[1],-Math.sin(turn)*d[0]+Math.cos(turn)*d[2]];
    return plus(plus(plus(center,rot),drift),[3*Math.sin(time*.51+index)*Math.min(time,1),3*Math.sin(time*.47+index)*Math.min(time,1),0]);
  });
}
function pulseAt(guide,t,clock) {
  const phase=clock%6, head=(phase-guide.timing[0])/(guide.timing[1]-guide.timing[0]), gap=t-head;
  if(head<-.02||head>1.40)return 0;
  const width = gap>0?.019:.092;
  return Math.exp(-.5*(gap/width)**2)*smooth((head+.012)*14);
}
function sparkLines(scene,clock) {
  const p=restPoint(scene,...scene.spark), age=clock%6-1.82, portrait=scene.size[0]<scene.size[1];
  const vel=[[-229,-134,65],[-146,-201,-29],[-252,-64,10],[-192,-161,58],[-79,-209,34],[-287,-108,-36],[-105,-162,100]];
  const cols=[[1,.25,.59],[.08,.82,1],[.78,1,.16],[1,.68,.82],[.30,.84,1],[1,.22,.52],[.78,.96,.30]];
  const delays=[0,.019,.05,.075,.096,.132,.166], lives=[.60,.67,.43,.48,.53,.56,.38];
  const lines=[];
  for(let i=0;i<7;i++) {
    const a=age-delays[i],life=lives[i]; if(a<0||a>=life)continue;
    const velocity=vel[i],sign=portrait?-1:1, origin=wave(p,clock);
    const point=u=>[origin[0]+velocity[0]*sign*(1-Math.exp(-u*1.15))/1.15,
                    origin[1]+velocity[1]*(portrait?.77:1)*u+39*u*u, origin[2]+velocity[2]*u];
    lines.push({a:point(Math.max(0,a-.048)),b:point(a),color:cols[i],
      alpha:Math.min(1,a/.045)*(1-a/life)**.68});
  }
  return lines;
}
function createScene(name,description,images){
  const scene={...description,name,images};
  scene.strands=description.strands.map((s,i)=>({...s,index:i}));
  scene.contact=restPoint(scene,...description.focal);
  scene.emitter=restPoint(scene,...description.spark);
  return scene;
}
