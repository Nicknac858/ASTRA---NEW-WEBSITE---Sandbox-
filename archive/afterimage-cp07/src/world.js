import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { SoftwareRenderer } from './software.js';
import { surfaceGLSL } from './motion.js';

const vertex = `
uniform float uTime,uMotion,uSeed,uEnergy,uImpulse;
uniform vec2 uPointer;
varying vec2 vUv; varying vec3 vWorld; varying float vDepth;
${surfaceGLSL}
void main(){
 vUv=uv;
 vec3 p=deformSurface(position,uv,uTime,uSeed,uMotion,uEnergy,uImpulse,uPointer);
 vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;
 vec4 view=modelViewMatrix*vec4(p,1.);vDepth=-view.z;
 gl_Position=projectionMatrix*view;
}`;
const fragment = `
uniform sampler2D uImage;
uniform float uTime,uMotion,uTile,uOpacity,uSeed,uSlice,uSpan,uAspect,uBrightness,uEnergy;
varying vec2 vUv;varying vec3 vWorld;varying float vDepth;
float rand(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 imageAt(vec2 uv){return texture2D(uImage,vec2((uTile+clamp(uv.x,.002,.998))/3.,clamp(uv.y,.002,.998))).rgb;}
void main(){
 vec2 uv=vUv; uv.x=uSlice+uv.x*uSpan;
 if(uAspect>1.)uv.y=(uv.y-.5)/uAspect+.5;
 else uv.x=(uv.x-.5)*uAspect+.5;
 vec2 drift=vec2(sin(uTime*.38+uSeed)*.016,cos(uTime*.29+uSeed)*.012)*uMotion;
 uv+=drift;
 uv.x+=sin(uv.y*8.-uTime*.68+uSeed)*.009*uMotion;
 vec3 sampleColor=imageAt(uv);
 float lum=dot(sampleColor,vec3(.299,.587,.114));
 float weave=sin(vUv.x*1250.)*sin(vUv.y*1450.)*.012;
 float crease=sin(vUv.x*24.+sin(vUv.y*4.-uTime*.8)*1.2)*.035;
 // One traveling diagonal light field intersects every physical surface.
 float lightCoordinate=vWorld.x+vWorld.y*.58+vWorld.z*.18;
 float sweep=sin(uTime*.38)*8.;
 float beam=exp(-pow((lightCoordinate-sweep)/1.7,2.));
 float edgeLight=exp(-pow((lightCoordinate-sweep+.45)/.14,2.));
 float exposure=.91+sin(uTime*.52+uSeed)*.13*uMotion;
 float light=(beam*.27+edgeLight*.12)*uMotion;
 // A misregistered afterimage grows and dissolves instead of blinking.
 float ghost=(.5+.5*sin(uTime*.66+uSeed))*.17*uMotion;
 vec3 afterimage=imageAt(uv+vec2(.026+abs(uEnergy)*.018,-.008));
 float grain=(rand(gl_FragCoord.xy)-.5)*.019;
 vec3 tint=vec3(1.02,1.015,.925);
 vec3 color=(mix(sampleColor,afterimage,ghost)*uBrightness*exposure+vec3(.023+crease+weave+grain+light))*tint;
 float edge=smoothstep(0.,.012,vUv.x)*smoothstep(0.,.012,1.-vUv.x)*smoothstep(0.,.012,vUv.y)*smoothstep(0.,.012,1.-vUv.y);
 float alpha=(.17+pow(lum,.6)*.76)*uOpacity*edge;
 float fog=1.-exp(-max(0.,vDepth-7.)*.023);
 color=mix(color,vec3(.04,.048,.033),fog);
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

const lerp=THREE.MathUtils.lerp;
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);

export async function createWorld(canvas,onFail){
 const mobile=matchMedia('(max-width:700px)').matches;
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 }catch(e){
  // A failed WebGL initialization can reserve the original canvas context.
  const replacement=document.createElement('canvas');replacement.id=canvas.id;
  canvas.replaceWith(replacement);canvas=replacement;
  renderer=new SoftwareRenderer(canvas);
 }
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.7));
 renderer.setSize(innerWidth,innerHeight);
 renderer.setClearColor(0x0c0e0b,1);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.16;
 renderer.debug.onShaderError=()=>onFail('shader');
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(mobile?56:48,innerWidth/innerHeight,.08,150);
 const image=await new THREE.TextureLoader().loadAsync('/assets/projection-atlas.png').catch(()=>null);
 if(!image){renderer.dispose();onFail('texture');return null;}
 image.colorSpace=THREE.SRGBColorSpace;image.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
 const materials=[],panels=[];
 function scrim({x=0,y=2,z=0,w=7,h=7,rotation=0,tile=0,opacity=.9,brightness=1.12,slice=0,span=1,seed=0}){
  const material=new THREE.ShaderMaterial({
   vertexShader:vertex,fragmentShader:fragment,
   uniforms:{uImage:{value:image},uTime:{value:0},uMotion:{value:1},uEnergy:{value:0},uImpulse:{value:0},uPointer:{value:new THREE.Vector2(.5,.5)},uTile:{value:tile},uOpacity:{value:opacity},uSeed:{value:seed},uSlice:{value:slice},uSpan:{value:span},uAspect:{value:w/h/span},uBrightness:{value:brightness}},
   transparent:true,depthWrite:false,side:THREE.DoubleSide,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h,64,64),material);
  mesh.position.set(x,y,z);mesh.rotation.y=rotation;
  mesh.userData={x,y,z,rotation,opacity,seed};
  materials.push(material);panels.push(mesh);scene.add(mesh);
  // A quiet physical edge defines the fabric at close range.
  const edgeGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w/2,-h/2,0),new THREE.Vector3(-w/2,h/2,0)]);
  mesh.add(new THREE.Line(edgeGeometry,new THREE.LineBasicMaterial({color:0xb9c1a1,transparent:true,opacity:.12})));
  return mesh;
 }
 const hand=scrim({x:-2.8,y:2,z:.6,w:9.1,h:7.1,rotation:.29,tile:0,opacity:.97,brightness:1.18,seed:1});
 const echo=scrim({x:-4.5,y:2,z:-4.3,w:6.3,h:6.8,rotation:.36,tile:0,opacity:.31,brightness:.85,seed:4});
 const faces=[];
 for(let i=0;i<3;i++)faces.push(scrim({x:.6+i*2.1,y:1.95,z:-6.5,w:2.13,h:6.7,rotation:-.12,tile:1,slice:i/3,span:1/3,opacity:.91,brightness:1.15,seed:2+i*.2}));
 const gathering=scrim({x:.3,y:1.7,z:-16,w:12,h:6.2,rotation:.035,tile:2,opacity:.97,brightness:1.12,seed:6});
 const gatheringEcho=scrim({x:-6,y:1.8,z:-12.5,w:4.6,h:6.5,rotation:.75,tile:2,opacity:.35,brightness:.9,seed:7});
 const end=scrim({x:4.9,y:2,z:-25,w:9.8,h:7.1,rotation:-.32,tile:0,opacity:.8,brightness:1.16,seed:9});
 const endFace=scrim({x:7.5,y:1.9,z:-29,w:6,h:6.8,rotation:-.44,tile:1,opacity:.32,brightness:.7,seed:11});

 // A real planar reflection sees the independently animated surfaces.
 if(!renderer.isSoftware){
  const floor=new Reflector(new THREE.PlaneGeometry(160,160),{clipBias:.003,textureWidth:mobile?512:1024,textureHeight:mobile?512:1024,color:0x45483b});
  floor.rotation.x=-Math.PI/2;floor.position.y=-1.57;scene.add(floor);
 }
 // Very light roughness veil on top of the reflective plane.
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshBasicMaterial({color:0x080c07,transparent:true,opacity:.43,depthWrite:false}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-1.565;scene.add(ground);

 const portals=[];
 for(const [x,z,height] of [[6.5,-11.5,7],[-6.7,-24,7.5],[8.7,-31,8]]){
  const group=new THREE.Group();group.position.set(x,1.6,z);group.userData={x,z};
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(.035,height),new THREE.MeshBasicMaterial({color:0xff3f16,toneMapped:false,side:THREE.DoubleSide})));
  for(const [w,opacity]of [[.16,.09],[.5,.035],[1.1,.012]])group.add(new THREE.Mesh(new THREE.PlaneGeometry(w,height),new THREE.MeshBasicMaterial({color:0xff2800,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,toneMapped:false})));
  scene.add(group);portals.push(group);
 }
 const lineMaterial=new THREE.LineBasicMaterial({color:0xc3cebe,transparent:true,opacity:.23});
 const path=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-9,-1.55,6),new THREE.Vector3(4,-1.55,-9),new THREE.Vector3(7,-1.55,-29)]),lineMaterial);scene.add(path);

 // Fine optical framing belongs to the image, not an overlay card.
 const frameGroup=new THREE.Group();
 const frameMat=new THREE.LineBasicMaterial({color:0xe74928,transparent:true,opacity:0});
 const fw=6.35,fh=6.6;
 const frame=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-fw/2,-fh/2,0),new THREE.Vector3(fw/2,-fh/2,0),new THREE.Vector3(fw/2,fh/2,0),new THREE.Vector3(-fw/2,fh/2,0),new THREE.Vector3(-fw/2,-fh/2,0)]),frameMat);
 frameGroup.add(frame);frameGroup.position.set(2.7,1.95,-6.35);scene.add(frameGroup);

 const keys=[
  {p:0,pos:[.25,1.25,mobile?12:9.8],look:[-.65,1.65,-5]},
  {p:.32,pos:[1.2,1.25,mobile?4.5:2.5],look:[2.5,1.7,-7]},
  {p:.67,pos:[-.45,1.15,mobile?-4:-5.8],look:[.1,1.65,-17]},
  {p:1,pos:[-2.6,1.4,mobile?-14:-15],look:[-.2,1.5,-26]},
 ];
 const base=new THREE.Vector3(),look=new THREE.Vector3();
 function pose(progress){
  let a=keys[0],b=keys[1];for(let i=0;i<keys.length-1;i++){if(progress>=keys[i].p){a=keys[i];b=keys[i+1];}}
  const t=smooth(0,1,THREE.MathUtils.clamp((progress-a.p)/(b.p-a.p),0,1));
  base.set(...a.pos).lerp(new THREE.Vector3(...b.pos),t);look.set(...a.look).lerp(new THREE.Vector3(...b.look),t);
 }
 let disposed=false;
 function render({progress,time,pointerX=0,pointerY=0,ambient=true,reduced=false,energy=0,impulse=0}){
  if(disposed)return;
  let p=progress;
  if(reduced)p=progress<.17?0:progress<.5?.32:progress<.83?.67:1;
  pose(p);
  const motion=reduced?0:1;
  const parallax=ambient&&!reduced?1:0;
  const quiet=1-smooth(.82,1,p)*.62;
  camera.position.copy(base);
  camera.position.x+=(pointerX*.24*parallax+Math.sin(time*.23)*.105*motion)*quiet;
  camera.position.y-=pointerY*.09*parallax;
  look.x+=pointerX*.36*parallax;look.y-=pointerY*.15*parallax;camera.lookAt(look);
  for(const mesh of panels){
   const d=mesh.userData;
   mesh.position.set(d.x+Math.sin(time*.41+d.seed)*.18*motion*quiet,d.y,d.z+Math.sin(time*.36+d.seed)*.19*motion);
   mesh.rotation.y=d.rotation+Math.sin(time*.47+d.seed)*.065*motion*quiet;
   mesh.rotation.z=Math.sin(time*.32+d.seed)*.008*motion;
  }
  const split=Math.sin(smooth(.12,.44,p)*Math.PI)*.61;
  faces.forEach((mesh,i)=>{
   const breathing=(.13+.12*Math.sin(time*.69))*motion;
   mesh.position.x+=(i-1)*(split+breathing+Math.abs(energy)*.19*motion);
   mesh.position.z+=Math.abs(i-1)*split*1.6;
   mesh.rotation.y+=(i-1)*split*.22;
  });
  hand.rotation.y+=smooth(.06,.4,p)*.18;
  hand.position.x-=smooth(.07,.4,p)*1.5;
  echo.position.x-=Math.sin(time*.38+1)*.22*motion;
  echo.rotation.y+=Math.sin(time*.42+1.3)*.07*motion;
  gathering.rotation.y+=smooth(.76,1,p)*.27;
  gathering.position.x+=smooth(.76,1,p)*5.9;
  frameMat.opacity=(smooth(.16,.28,p)-smooth(.41,.53,p))*.6;
  frameGroup.position.z=-6.35+split*.25;
  frameGroup.rotation.z=Math.sin(time*.32)*.012*motion;
  for(const material of materials){
   const u=material.uniforms;
   u.uTime.value=time;u.uMotion.value=motion*quiet;u.uEnergy.value=energy;u.uImpulse.value=impulse;
   u.uPointer.value.set(pointerX*.5+.5,.5-pointerY*.5);
  }
  portals.forEach((portal,i)=>{
   portal.position.x=portal.userData.x+Math.sin(time*.3+i*2)*.17*motion;
   portal.children.forEach((mesh,j)=>{
    const breathe=.78+Math.sin(time*.67-i)*.22;
    if(j===0)mesh.material.color.setRGB(1,.11+breathe*.035,.018);
    else mesh.material.opacity=[0,.09,.035,.012][j]*(1+breathe*.65*motion+Math.abs(energy)*.35);
   });
  });
  lineMaterial.opacity=.18+(1+Math.sin(time*.72))*.055*motion;
  canvas.dataset.motionTime=time.toFixed(3);
  canvas.dataset.scrollEnergy=energy.toFixed(3);
  canvas.dataset.motionEdition='02';
  scene.userData.motionTime=time;
  renderer.render(scene,camera);
  document.documentElement.dataset.renderState=renderer.isSoftware?'software-3d':'webgl';
 }
 function resize(){
  camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?56:48;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:1.7));
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onFail('context-lost');});
 const stats=()=>({renderer:renderer.isSoftware?'software-3d':'webgl',three:THREE.REVISION,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,programs:renderer.info.programs?.length,canvas:[canvas.width,canvas.height]});
 return {software:renderer.isSoftware,render,resize,stats,dispose(){disposed=true;image.dispose();renderer.dispose();}};
}
