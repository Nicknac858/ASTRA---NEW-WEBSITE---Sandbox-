'use strict';
function spot(ctx,p,r,color,a) {
  if(r<=0||a<=0)return;
  const c=color.map(v=>Math.round(v*255)).join(',');
  const g=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r);
  g.addColorStop(0,'rgba('+c+','+clamp(a)+')');
  g.addColorStop(.20,'rgba('+c+','+clamp(a*.60)+')');
  g.addColorStop(1,'rgba('+c+',0)');ctx.fillStyle=g;ctx.fillRect(p[0]-r,p[1]-r,2*r,2*r);
}
// A small z-buffered scan converter keeps adjacent glass triangles watertight in Canvas-only browsers.
function readablePixels(image){
  const el=document.createElement('canvas');el.width=image.width;el.height=image.height;
  const c=el.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  return {bytes:c.getImageData(0,0,el.width,el.height).data,w:el.width,h:el.height};
}
function softStrip(scene,g,material) {
  const verts=[],faces=[],steps=Math.max(32,Math.round(g.path.length*.57)),bands=8;
  for(let i=0;i<=steps;i++)for(let j=0;j<=bands;j++){
    const t=i/steps,side=-Math.cos(Math.PI*j/bands);
    verts.push({p:surfacePoint(scene,g,t,side),u:t*(material.w-1),
      v:g.index*scene.row+scene.border+.5+(side*.5+.5)*(scene.row-2*scene.border-1)});
  }
  for(let i=0;i<steps;i++)for(let j=0;j<bands;j++){
    const a=i*(bands+1)+j,b=a+bands+1;faces.push([a,b,b+1],[a,b+1,a+1]);
  }
  return {verts,faces,g,mat:material};
}
class WovenCanvas {
  constructor(canvas){
    this.ctx=canvas.getContext('2d',{alpha:false});
    this.kind='Canvas 2D';this.device='Canvas 2D software rasterizer';this.cache=new Map();
  }
  useScene(scene) {
    if(!this.cache.has(scene.name)){
      const material=readablePixels(scene.images.ribbons);
      this.cache.set(scene.name,{mesh:scene.strands.map(g=>softStrip(scene,g,material)),
        panels:scene.images.panels.map(readablePixels)});
    }
    this.assets=this.cache.get(scene.name);
  }
  raster(f,W,H){
    const [a,b,c]=f.points,x0=a[0],y0=a[1],dx1=b[0]-x0,dy1=b[1]-y0,dx2=c[0]-x0,dy2=c[1]-y0;
    const det=dx1*dy2-dy1*dx2;if(Math.abs(det)<.0001)return;
    const inv=1/det,loX=Math.max(0,Math.floor(Math.min(x0,b[0],c[0]))),hiX=Math.min(W-1,Math.ceil(Math.max(x0,b[0],c[0])));
    const loY=Math.max(0,Math.floor(Math.min(y0,b[1],c[1]))),hiY=Math.min(H-1,Math.ceil(Math.max(y0,b[1],c[1])));
    const xStep1=dy2*inv,xStep2=-dy1*inv,source=f.mat.bytes,tw=f.mat.w,th=f.mat.h;
    const out=this.image.data,depth=this.depth,c1=f.tint;
    for(let y=loY;y<=hiY;y++){
      const dy=y+.5-y0,dx=loX+.5-x0;let v=(dx*dy2-dy*dx2)*inv,w=(dy*dx1-dx*dy1)*inv;
      for(let x=loX;x<=hiX;x++,v+=xStep1,w+=xStep2){
        const u=1-v-w;if(Math.min(u,v,w)<-.000003)continue;
        const id=y*W+x, z=u*a[2]+v*b[2]+w*c[2];if(z>depth[id]+.18)continue;
        const tx=clamp(u*a[3]+v*b[3]+w*c[3],0,tw-1.001),ty=clamp(u*a[4]+v*b[4]+w*c[4],0,th-1.001);
        const ix=tx|0,iy=ty|0,fx=tx-ix,fy=ty-iy, ti=(iy*tw+ix)*4,below=ti+tw*4;
        const k0=(1-fx)*(1-fy),k1=fx*(1-fy),k2=(1-fx)*fy,k3=fx*fy;
        const alpha=(source[ti+3]*k0+source[ti+7]*k1+source[below+3]*k2+source[below+7]*k3)/255;
        if(alpha<.012)continue;
        const o=id*4,old=1-alpha;
        const rr=source[ti]*k0+source[ti+4]*k1+source[below]*k2+source[below+4]*k3;
        const gg=source[ti+1]*k0+source[ti+5]*k1+source[below+1]*k2+source[below+5]*k3;
        const bb=source[ti+2]*k0+source[ti+6]*k1+source[below+2]*k2+source[below+6]*k3;
        const l=Math.max(rr,gg,bb),packet=f.light?f.light[ix]:0;
        const gain=f.gain+.42*packet,emission=packet*(8+.43*l);
        out[o]=out[o]*old+(rr*gain+c1[0]*emission)*alpha;
        out[o+1]=out[o+1]*old+(gg*gain+c1[1]*emission)*alpha;
        out[o+2]=out[o+2]*old+(bb*gain+c1[2]*emission)*alpha;
        if(!f.light||(alpha>.78&&l>98))depth[id]=z;
      }
    }
  }
  render(scene,view,time,active){
    const ctx=this.ctx,W=ctx.canvas.width,H=ctx.canvas.height,ratio=W/view.width;
    if(!this.image||this.image.width!==W||this.image.height!==H){
      this.image=ctx.createImageData(W,H);this.packed=new Uint32Array(this.image.data.buffer);this.depth=new Float32Array(W*H);
    }
    this.packed.fill(0xff070301);this.depth.fill(1e10);
    const faces=[],project=(p,u,v)=>{const q=view.project(p);return [q[0]*ratio,q[1]*ratio,q[2],u,v];};
    function add(points,mat,tint,light,gain){
      if(points.every(v=>v[0]<0)||points.every(v=>v[0]>W)||points.every(v=>v[1]<0)||points.every(v=>v[1]>H))return;
      faces.push({points,mat,tint,light,gain,z:points.reduce((n,v)=>n+v[2],0)/3});
    }
    for(const s of this.assets.mesh){
      const points=s.verts.map(v=>project(wave(v.p,time),v.u,v.v));
      const wavefront=new Float32Array(s.mat.w);
      for(let i=0;i<wavefront.length;i++)wavefront[i]=pulseAt(s.g,i/(wavefront.length-1),time);
      const gain=1.04+.035*Math.sin(time*.7+s.g.index*.45);
      for(const [a,b,c] of s.faces)add([points[a],points[b],points[c]],s.mat,s.g.color,wavefront,gain);
    }
    for(let i=0;i<2;i++){
      const mat=this.assets.panels[i],q=windowCorners(scene,i,view,time).map((p,k)=>project(p,quadUV[k][0]*(mat.w-1),quadUV[k][1]*(mat.h-1)));
      add([q[0],q[1],q[2]],mat,[0,0,0],null,1);add([q[0],q[2],q[3]],mat,[0,0,0],null,1);
    }
    faces.sort((a,b)=>b.z-a.z);for(const f of faces)this.raster(f,W,H);
    ctx.setTransform(1,0,0,1,0,0);ctx.putImageData(this.image,0,0);
    ctx.save();ctx.scale(ratio,ratio);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(const l of sparkLines(scene,time)){
      const a=view.project(l.a),b=view.project(l.b),id=(Math.round(b[1]*ratio)*W)+Math.round(b[0]*ratio);
      if(b[2]>this.depth[id]+1)continue;
      ctx.strokeStyle='rgba('+l.color.map(c=>Math.round(c*255)).join(',')+','+l.alpha+')';
      ctx.lineWidth=Math.max(1,1.7*view.sc);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();spot(ctx,b,3*view.sc,l.color,l.alpha*.6);
    }
    ctx.restore();
  }
}
