'use strict';
// The compatibility renderer projects the same surfaces and camera in smaller textured patches.
function patch(ctx,image,sx,sy,sw,sh,q) {
  const a=q[0],b=q[1],c=q[2],d=q[3], expand=.32;
  function tri(p0,p1,p2,origin,vx,vy) {
    const middle=[(p0[0]+p1[0]+p2[0])/3,(p0[1]+p1[1]+p2[1])/3];
    const pts=[p0,p1,p2].map(p=>{const dx=p[0]-middle[0],dy=p[1]-middle[1],k=expand/(Math.hypot(dx,dy)||1);return [p[0]+dx*k,p[1]+dy*k];});
    ctx.save();ctx.beginPath();ctx.moveTo(...pts[0]);ctx.lineTo(...pts[1]);ctx.lineTo(...pts[2]);ctx.closePath();ctx.clip();
    ctx.transform(vx[0]/sw,vx[1]/sw,vy[0]/sh,vy[1]/sh,origin[0],origin[1]);
    ctx.drawImage(image,sx,sy,sw,sh,-.1,-.1,sw+.2,sh+.2);ctx.restore();
  }
  const right=sub(b,a),down=sub(c,b);tri(a,b,c,a,right,down);
  const lower=sub(c,d),left=sub(d,a);tri(a,c,d,a,lower,left);
}
function spot(ctx,p,r,color,a) {
  if(r<=0||a<=0)return;
  const c=color.map(v=>Math.round(v*255)).join(',');
  const g=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r);
  g.addColorStop(0,'rgba('+c+','+clamp(a)+')');
  g.addColorStop(.20,'rgba('+c+','+clamp(a*.60)+')');
  g.addColorStop(1,'rgba('+c+',0)');ctx.fillStyle=g;ctx.fillRect(p[0]-r,p[1]-r,2*r,2*r);
}
class WovenCanvas {
  constructor(canvas){this.ctx=canvas.getContext('2d',{alpha:false});this.kind='Canvas 2D';this.device='Canvas 2D compatibility renderer';}
  useScene(scene) {
    this.pieces=[];
    for(const g of scene.strands){
      const steps=Math.max(14,Math.ceil(g.path.length*.31));
      for(let i=0;i<steps;i++){
        const t0=i/steps,t1=(i+1)/steps,mid=(t0+t1)/2;
        this.pieces.push({g,mid,t0,t1,corners:[[t0,-1],[t1,-1],[t1,1],[t0,1]].map(([t,v])=>surfacePoint(scene,g,t,v)),
          center:surfacePoint(scene,g,mid,0)});
      }
    }
  }
  render(scene,view,time,active) {
    const ctx=this.ctx, ratio=ctx.canvas.width/view.width;
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#010309';ctx.fillRect(0,0,view.width,view.height);
    const image=scene.images.ribbons,items=[];
    for(const f of this.pieces)items.push({f,d:view.project(wave(f.center,time))[2]});
    for(let i=0;i<2;i++){
      const q=windowCorners(scene,i,view,time).map(p=>view.project(p));
      items.push({q,i,d:q.reduce((s,p)=>s+p[2],0)/4});
    }
    items.sort((a,b)=>b.d-a.d);
    for(const o of items){
      if(o.q){const img=scene.images.panels[o.i];patch(ctx,img,0,0,img.width,img.height,o.q);continue;}
      const f=o.f,q=f.corners.map(p=>view.project(wave(p,time)));
      if(q.every(p=>p[0]<0)||q.every(p=>p[0]>view.width)||q.every(p=>p[1]<0)||q.every(p=>p[1]>view.height))continue;
      const sw=(f.t1-f.t0)*image.width;
      patch(ctx,image,f.t0*image.width,scene.row*f.g.index+scene.border,sw,scene.row-2*scene.border,q);
      const packet=pulseAt(f.g,f.mid,time);
      if(packet>.055){
        const a=view.project(wave(surfacePoint(scene,f.g,f.t0,0),time));
        const b=view.project(wave(surfacePoint(scene,f.g,f.t1,0),time));
        ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
        const c=f.g.color.map(v=>Math.round(v*255)).join(',');
        ctx.strokeStyle='rgba('+c+','+(packet*.49)+')';
        ctx.lineWidth=Math.max(1.2,1.7*view.sc);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
        if(packet>.84)spot(ctx,b,5.5*view.sc,f.g.color,(packet-.84)*1.6);
        ctx.restore();
      }
    }
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(const l of sparkLines(scene,time)){
      const a=view.project(l.a),b=view.project(l.b);
      ctx.strokeStyle='rgba('+l.color.map(c=>Math.round(c*255)).join(',')+','+l.alpha+')';
      ctx.lineWidth=1.6*view.sc;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();spot(ctx,b,3*view.sc,l.color,l.alpha*.6);
    }
    ctx.restore();
  }
}
