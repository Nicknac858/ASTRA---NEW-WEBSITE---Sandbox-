'use strict';
function glProgram(gl,vertex,fragment) {
  const p=gl.createProgram();
  for(const [type,src] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
    const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
    gl.attachShader(p,s);gl.deleteShader(s);
  }
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  return p;
}
function mesh(gl,vertices,indices,usage=gl.STATIC_DRAW) {
  const vao=gl.createVertexArray(); gl.bindVertexArray(vao);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),usage);
  const element=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,element);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  const sizes=[3,2,2,3];let offset=0;
  for(let i=0;i<sizes.length;i++){
    gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,sizes[i],gl.FLOAT,false,40,offset*4);offset+=sizes[i];
  }
  gl.bindVertexArray(null);
  return {vao,buffer,element,count:indices.length};
}
function texture(gl,image){
  const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  const ext=gl.getExtension('EXT_texture_filter_anisotropic');
  if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return tex;
}
function bodyGeometry(scene,g) {
  const vertices=[], indices=[], spans=[], rows=g.path.length, sides=15;
  const atlasH=scene.row*scene.strands.length;
  for(const back of [false,true]){
    const base=vertices.length/10;
    for(let i=0;i<rows;i++){
      const t=i/(rows-1),guide=guideSample(g,t);
      for(let j=0;j<sides;j++){
        const angle=-Math.PI/2+j*Math.PI/(sides-1), side=Math.sin(angle);
        const p=surfacePoint(scene,g,t,side,back);
        const n=norm([guide.nx*side*.68,guide.ny*side*.68,Math.cos(angle)*(back?-1:1)]);
        const v=(scene.row*g.index+scene.border+.5+(side*.5+.5)*(scene.row-2*scene.border-1))/atlasH;
        vertices.push(...p,t,v,t,side,...n);
      }
    }
    const step=15;
    for(let i=0;i<rows-1;i+=step){
      const last=Math.min(rows-1,i+step),start=indices.length;
      for(let k=i;k<last;k++)for(let j=0;j<sides-1;j++){
        const a=base+k*sides+j,b=a+sides;
        if(back)indices.push(a,b+1,b,a,a+1,b+1);
        else indices.push(a,b,b+1,a,b+1,a+1);
      }
      spans.push({start,count:indices.length-start,center:surfacePoint(scene,g,(i+last)/2/(rows-1),0,back)});
    }
  }
  return {vertices,indices,spans};
}
function fiberGeometry(scene,g){
  const vertices=[],indices=[],rings=4,steps=Math.max(72,g.path.length);
  for(let k=0;k<g.fibers;k++){
    const base=vertices.length/10, seed=k*2.399+g.index*.71;
    const laneAt=t=>(k-(g.fibers-1)/2)/Math.max(1,g.fibers)*.69+.101*Math.sin(t*8.5+seed)+.044*Math.sin(t*21-seed);
    for(let i=0;i<=steps;i++){
      const t=i/steps,lane=laneAt(t),curve=guideSample(g,t);
      const center=surfacePoint(scene,g,t,lane);
      // The embedded capillaries have a cross-section and follow the curvature of the optical sheath.
      const radius=Math.min(1.18,.24+curve.p[3]*.011)*(1+.16*Math.sin(t*40+seed));
      for(let j=0;j<rings;j++){
        const a=TAU*j/rings,n=[curve.nx*Math.cos(a),curve.ny*Math.cos(a),Math.sin(a)];
        vertices.push(...plus(center,scale3(n,radius)),0,0,t,k/g.fibers,...n);
      }
    }
    for(let i=0;i<steps;i++)for(let j=0;j<rings;j++){
      const a=base+i*rings+j,b=base+i*rings+(j+1)%rings;
      indices.push(a,a+rings,b+rings,a,b+rings,b);
    }
  }
  return {vertices,indices};
}
const quadIndices=[0,1,2,0,2,3], quadUV=[[0,0],[1,0],[1,1],[0,1]];
function quadVertices(corners){return corners.flatMap((p,i)=>[...p,...quadUV[i],0,0,0,0,1]);}
class GlassRenderer {
  constructor(canvas){
    this.gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    if(!this.gl)throw Error('WebGL 2 unavailable');
    const gl=this.gl;this.program=glProgram(gl,VERTEX,FRAGMENT);gl.useProgram(this.program);
    const names=['orientation','center','lens','offset','clock','mode','material','accent','opacity','timing','tint','depthOnly'];
    this.u=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(this.program,n)]));
    this.panel=mesh(gl,Array(40).fill(0),quadIndices,gl.DYNAMIC_DRAW);
    this.cache=new Map();
    this.kind='WebGL 2';
    const debug=gl.getExtension('WEBGL_debug_renderer_info');
    this.device=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  }
  useScene(scene){
    if(this.cache.has(scene.name)){this.assets=this.cache.get(scene.name);return;}
    const gl=this.gl;
    const strands=scene.strands.map(g=>{
      const body=bodyGeometry(scene,g), fiber=fiberGeometry(scene,g);
      return {guide:g,body:mesh(gl,body.vertices,body.indices),spans:body.spans,fiber:mesh(gl,fiber.vertices,fiber.indices)};
    });
    this.assets={strands,atlas:texture(gl,scene.images.ribbons),panels:scene.images.panels.map(p=>texture(gl,p))};
    this.cache.set(scene.name,this.assets);
  }
  drawMesh(m,count=m.count,start=0) {
    const gl=this.gl;gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_SHORT,start*2);
  }
  quad(points){
    const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.panel.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array(quadVertices(points)));
    this.drawMesh(this.panel);
  }
  render(scene,view,time,active) {
    const gl=this.gl,u=this.u,A=this.assets;
    gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
    gl.useProgram(this.program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
    gl.clearColor(.005,.012,.025,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix3fv(u.orientation,false,view.rotation);
    gl.uniform3fv(u.center,view.center);gl.uniform4f(u.lens,view.d,view.sc,view.width,view.height);gl.uniform2fv(u.offset,view.offset);
    gl.uniform1f(u.clock,time);gl.uniform1i(u.material,0);gl.uniform1f(u.opacity,1);
    gl.uniform1i(u.depthOnly,0);gl.uniform1i(u.mode,2);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
    for(let i=0;i<2;i++){
      gl.uniform1f(u.accent,active===i?1:0);gl.bindTexture(gl.TEXTURE_2D,A.panels[i]);
      this.quad(windowCorners(scene,i,view,time));
    }
    gl.bindTexture(gl.TEXTURE_2D,A.atlas);gl.enable(gl.CULL_FACE);gl.frontFace(gl.CW);
    gl.uniform1i(u.mode,0);gl.uniform1i(u.depthOnly,1);gl.colorMask(false,false,false,false);
    for(const s of A.strands)this.drawMesh(s.body);
    gl.colorMask(true,true,true,true);gl.uniform1i(u.depthOnly,0);gl.depthMask(false);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    const spans=[];
    for(const str of A.strands)for(const span of str.spans)spans.push({str,span,d:view.project(span.center)[2]});
    spans.sort((a,b)=>b.d-a.d);
    let previous=null;
    const useGuide=g=>{
      gl.uniform2fv(u.timing,g.timing);gl.uniform3fv(u.tint,g.color);
      gl.uniform1f(u.accent,(active===0&&g.name==='near')||(active===1&&g.name==='far')?.65:0);
    };
    for(const {str,span} of spans){
      if(str!==previous){useGuide(str.guide);previous=str;}
      this.drawMesh(str.body,span.count,span.start);
    }
    gl.disable(gl.CULL_FACE);gl.blendFunc(gl.ONE,gl.ONE);gl.uniform1i(u.mode,1);
    for(const s of A.strands){useGuide(s.guide);this.drawMesh(s.fiber);}
    // World-space spark trails stay attached to the moving junction and obey the scene depth.
    gl.uniform1i(u.mode,3);
    for(const line of sparkLines(scene,time)){
      const along=sub(line.b,line.a), normal=scale3(norm(cross(along,[0,0,1])),.78);
      gl.uniform3fv(u.tint,line.color);
      gl.uniform1f(u.opacity,line.alpha*.21);
      const halo=scale3(normal,3.1);
      this.quad([sub(line.a,halo),plus(line.a,halo),plus(line.b,halo),sub(line.b,halo)]);
      gl.uniform1f(u.opacity,line.alpha);
      this.quad([sub(line.a,normal),plus(line.a,normal),plus(line.b,normal),sub(line.b,normal)]);
    }
    gl.disable(gl.BLEND);gl.depthMask(true);gl.bindVertexArray(null);
  }
}
