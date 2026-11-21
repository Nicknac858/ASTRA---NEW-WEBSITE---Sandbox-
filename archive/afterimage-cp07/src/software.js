import * as THREE from 'three';
import { deformSurface, projectionShift } from './motion.js';

// A Canvas2D triangle rasterizer for environments without a WebGL context.
// It projects the same Three scene and camera, including fabric deformation.
export class SoftwareRenderer {
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
  if(!this.ctx)throw new Error('No rendering context available');
  this.isSoftware=true;this.debug={};this.capabilities={getMaxAnisotropy:()=>1};
  this.info={render:{calls:0,triangles:0},programs:[]};this.ratio=1;this.cache=new Map();this.projectors=new WeakMap();this.lastPaint=0;
  this.vp=new THREE.Matrix4();this.tmp=new THREE.Vector3();this.eye=new THREE.Vector3();
 }
 setPixelRatio(r){this.ratio=Math.min(r,.8);}
 setSize(w,h){this.width=w;this.height=h;this.canvas.width=Math.round(w*this.ratio);this.canvas.height=Math.round(h*this.ratio);}
 setClearColor(){}
 dispose(){}
 prepareTile(image,tile){
  const key=tile;
  if(this.cache.has(key))return this.cache.get(key);
  const c=document.createElement('canvas');c.width=c.height=640;
  const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(image,tile*image.width/3,0,image.width/3,image.height,0,0,640,640);
  const data=x.getImageData(0,0,640,640),p=data.data;
  for(let i=0;i<p.length;i+=4){
   const l=(p[i]*.299+p[i+1]*.587+p[i+2]*.114)/255;
   p[i]=Math.min(255,p[i]*1.05+5);p[i+1]=Math.min(255,p[i+1]*1.045+6);p[i+2]=Math.min(255,p[i+2]*.95+3);
   p[i+3]=Math.round((.17+Math.pow(l,.6)*.76)*255);
  }
  x.putImageData(data,0,0);this.cache.set(key,c);return c;
 }
 projectedTile(mesh){
  const u=mesh.material.uniforms,source=this.prepareTile(u.uImage.value.image,u.uTile.value);
  let projection=this.projectors.get(mesh);
  if(!projection){const canvas=document.createElement('canvas');canvas.width=canvas.height=448;projection={canvas,ctx:canvas.getContext('2d'),time:-1};projection.ctx.scale(.7,.7);this.projectors.set(mesh,projection);}
  const t=u.uTime.value,m=u.uMotion.value,seed=u.uSeed.value;
  if(projection.time===t&&projection.motion===m)return projection.canvas;
  projection.time=t;projection.motion=m;
  const c=projection.ctx;c.clearRect(0,0,640,640);c.globalCompositeOperation='source-over';c.globalAlpha=1;c.drawImage(source,0,0);
  c.globalCompositeOperation='source-atop';
  // The delayed projection and moving light both stay inside the fabric image.
  c.globalAlpha=(.5+.5*Math.sin(t*.66+seed))*.17*m;
  c.drawImage(source,17+Math.abs(u.uEnergy.value)*12,-5);c.globalAlpha=1;
  const dim=(.5+.5*Math.sin(t*.52+seed))*.13*m;
  c.fillStyle=`rgba(2,5,1,${dim})`;c.fillRect(0,0,640,640);
  const center=.5+Math.sin(t*.38)*.64-seed*.018;
  const x=center*940-140;
  const light=c.createLinearGradient(x-115,660,x+210,-20);
  light.addColorStop(0,'rgba(240,242,218,0)');light.addColorStop(.3,`rgba(240,242,218,${.045*m})`);
  light.addColorStop(.48,`rgba(240,242,218,${.22*m})`);light.addColorStop(.5,`rgba(250,248,228,${.34*m})`);
  light.addColorStop(.52,`rgba(240,242,218,${.22*m})`);light.addColorStop(.75,`rgba(240,242,218,${.04*m})`);light.addColorStop(1,'rgba(240,242,218,0)');
  c.fillStyle=light;c.fillRect(0,0,640,640);
  c.globalCompositeOperation='source-over';return projection.canvas;
 }
 project(v,camera){
  this.eye.copy(v).applyMatrix4(camera.matrixWorldInverse);
  if(this.eye.z>-.12)return null;
  this.tmp.copy(v).applyMatrix4(this.vp);
  return {x:(this.tmp.x*.5+.5)*this.width,y:(-.5*this.tmp.y+.5)*this.height,z:-this.eye.z};
 }
 triangle(image,a,b,c,ta,tb,tc,opacity){
  if(!a||!b||!c)return;
  if(Math.max(a.x,b.x,c.x)<-10||Math.min(a.x,b.x,c.x)>this.width+10||Math.max(a.y,b.y,c.y)<-10||Math.min(a.y,b.y,c.y)>this.height+10)return;
  const ctx=this.ctx;
  const ux=tb.x-ta.x,uy=tb.y-ta.y,vx=tc.x-ta.x,vy=tc.y-ta.y,det=ux*vy-uy*vx;
  if(Math.abs(det)<.001)return;
  const dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y;
  const m0=(dx*vy-ex*uy)/det,m1=(dy*vy-ey*uy)/det,m2=(ex*ux-dx*vx)/det,m3=(ey*ux-dy*vx)/det;
  ctx.save();ctx.globalAlpha=opacity;
  const cx=(a.x+b.x+c.x)/3,cy=(a.y+b.y+c.y)/3;
  const edge=p=>{const dx=p.x-cx,dy=p.y-cy,scale=.45/Math.max(1,Math.hypot(dx,dy));return {x:p.x+dx*scale,y:p.y+dy*scale};};
  const aa=edge(a),bb=edge(b),cc=edge(c);
  ctx.beginPath();ctx.moveTo(aa.x,aa.y);ctx.lineTo(bb.x,bb.y);ctx.lineTo(cc.x,cc.y);ctx.closePath();ctx.clip();
  ctx.transform(m0,m1,m2,m3,a.x-m0*ta.x-m2*ta.y,a.y-m1*ta.x-m3*ta.y);
  const sx=Math.max(0,Math.min(ta.x,tb.x,tc.x)-1),sy=Math.max(0,Math.min(ta.y,tb.y,tc.y)-1);
  const sw=Math.min(image.width-sx,Math.max(ta.x,tb.x,tc.x)-sx+1),sh=Math.min(image.height-sy,Math.max(ta.y,tb.y,tc.y)-sy+1);
  ctx.drawImage(image,sx,sy,sw,sh,sx,sy,sw,sh);ctx.restore();this.info.render.triangles++;
 }
 drawScrim(mesh,camera,mirror=false){
  const u=mesh.material.uniforms;
  const tile=this.projectedTile(mesh);
  const w=mesh.geometry.parameters.width,h=mesh.geometry.parameters.height;
  const cols=mirror?3:7,rows=mirror?3:10;
  const points=[],uvs=[],t=u.uTime.value,seed=u.uSeed.value,motion=u.uMotion.value;
  const center=this.tmp.setFromMatrixPosition(mesh.matrixWorld).clone().applyMatrix4(camera.matrixWorldInverse);
  if(center.z>3||center.z< -45)return;
  const fog=Math.exp(-Math.max(0,-center.z-7)*.023);
  let opacity=u.uOpacity.value*fog*(mirror?.18:1);
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
   const ux=x/cols,uy=y/rows,vx=(ux-.5)*w,vy=(uy-.5)*h;
   const xyz=deformSurface(vx,vy,ux,uy,t,seed,motion,u.uEnergy.value,u.uImpulse.value,u.uPointer.value);
   const v=new THREE.Vector3(...xyz).applyMatrix4(mesh.matrixWorld);
   if(mirror)v.y=-3.14-v.y;
   points.push(this.project(v,camera));
   let tx=u.uSlice.value+ux*u.uSpan.value,ty=uy;
   const aspect=u.uAspect.value;if(aspect>1)ty=(ty-.5)/aspect+.5;else tx=(tx-.5)*aspect+.5;
   const shift=projectionShift(t,seed,motion);tx+=shift.x+Math.sin(ty*8-t*.68+seed)*.009*motion;ty+=shift.y;
   uvs.push({x:Math.max(.002,Math.min(.998,tx))*tile.width,y:(1-Math.max(.002,Math.min(.998,ty)))*tile.height});
  }
  const startTri=this.info.render.triangles;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;
   this.triangle(tile,points[a],points[b],points[c],uvs[a],uvs[b],uvs[c],opacity);
   this.triangle(tile,points[b],points[d],points[c],uvs[b],uvs[d],uvs[c],opacity);
  }
  if(this.info.render.triangles>startTri)this.info.render.calls++;
 }
 render(scene,camera){
  const now=performance.now();if(now-this.lastPaint<30)return;this.lastPaint=now;
  scene.updateMatrixWorld();camera.updateMatrixWorld();this.vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  const ctx=this.ctx;ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.globalAlpha=1;ctx.fillStyle='#0c0e0b';ctx.fillRect(0,0,this.width,this.height);
  this.info.render.calls=0;this.info.render.triangles=0;
  const scrims=[];scene.traverse(o=>{if(o.isMesh&&o.material?.uniforms?.uImage){const v=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);scrims.push({mesh:o,z:v.z});}});
  scrims.sort((a,b)=>a.z-b.z);
  for(const s of scrims)this.drawScrim(s.mesh,camera,true);
  const grad=ctx.createLinearGradient(0,this.height*.46,0,this.height);grad.addColorStop(0,'#080b0800');grad.addColorStop(1,'#080b0866');ctx.fillStyle=grad;ctx.fillRect(0,this.height*.46,this.width,this.height*.54);
  for(const s of scrims)this.drawScrim(s.mesh,camera);
  // Reproject all physical line work using the same camera.
  scene.traverse(o=>{
   if(!o.isLine||!o.material||o.material.opacity<=0)return;
   const pos=o.geometry.attributes.position;ctx.beginPath();let drawn=false;
   for(let i=0;i<pos.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld),p=this.project(v,camera);
    if(!p){drawn=false;continue;}if(!drawn){ctx.moveTo(p.x,p.y);drawn=true;}else ctx.lineTo(p.x,p.y);
   }
   ctx.strokeStyle='#'+o.material.color.getHexString();ctx.globalAlpha=o.material.opacity;ctx.lineWidth=.7;ctx.stroke();ctx.globalAlpha=1;
  });
  scene.traverse(o=>{
   if(!o.isMesh||!o.material?.isMeshBasicMaterial||o.geometry?.parameters?.width!==.035)return;
   const h=o.geometry.parameters.height;const a=this.project(new THREE.Vector3(0,-h/2,0).applyMatrix4(o.matrixWorld),camera),b=this.project(new THREE.Vector3(0,h/2,0).applyMatrix4(o.matrixWorld),camera);
   if(!a||!b)return;ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#ff421b';ctx.shadowColor='#ff2500';ctx.globalAlpha=.85+Math.sin((scene.userData.motionTime||0)*.67)*.15;ctx.shadowBlur=19;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
  });
  this.canvas.dataset.paintMs=(performance.now()-now).toFixed(1);
 }
}
