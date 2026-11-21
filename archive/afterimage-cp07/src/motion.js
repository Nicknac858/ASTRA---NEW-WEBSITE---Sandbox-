// Shared motion score. CPU compatibility and GPU surfaces follow this field.
export const surfaceGLSL = `
vec3 deformSurface(vec3 p, vec2 uv, float t, float seed, float motion, float energy, float impulse, vec2 pointer){
 float pin=sin(uv.y*3.14159265);
 float wave=sin(p.x*1.05-p.y*.24-t*.92+seed)*.27;
 float fold=sin(p.x*2.55+p.y*.48-t*1.32+seed*.7)*.095;
 float breath=sin(t*.53+seed+p.y*.36)*.13;
 float distance=length((uv-pointer)*vec2(1.,.82));
 float wake=sin(distance*20.-t*2.8)*exp(-distance*4.8)*impulse*.45;
 p.z+=(wave+fold+breath+wake)*pin*motion*(1.+abs(energy)*.65);
 p.x+=sin(p.y*.72-t*.58+seed)*.09*pin*motion;
 p.y+=sin(p.x*.8+t*.47+seed)*.045*pin*motion;
 return p;
}`;
export function deformSurface(x,y,u,v,t,seed,motion,energy=0,impulse=0,pointer={x:.5,y:.5}){
 const pin=Math.sin(v*Math.PI);
 const wave=Math.sin(x*1.05-y*.24-t*.92+seed)*.27;
 const fold=Math.sin(x*2.55+y*.48-t*1.32+seed*.7)*.095;
 const breath=Math.sin(t*.53+seed+y*.36)*.13;
 const distance=Math.hypot(u-pointer.x,(v-pointer.y)*.82);
 const wake=Math.sin(distance*20-t*2.8)*Math.exp(-distance*4.8)*impulse*.45;
 const nx=x+Math.sin(y*.72-t*.58+seed)*.09*pin*motion;
 return [nx,y+Math.sin(nx*.8+t*.47+seed)*.045*pin*motion,(wave+fold+breath+wake)*pin*motion*(1+Math.abs(energy)*.65)];
}
export function projectionShift(t,seed,motion){
 return {x:Math.sin(t*.38+seed)*.016*motion,y:Math.cos(t*.29+seed)*.012*motion};
}
