'use strict';
const VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec2 uv;
layout(location=2) in vec2 lane;
layout(location=3) in vec3 normal;
uniform mat3 orientation;
uniform vec3 center;
uniform vec4 lens;
uniform vec2 offset;
uniform float clock;
uniform int mode;
out vec2 vUv;
out vec2 vLane;
out vec3 vNormal;
out vec3 vWorld;
vec3 deform(vec3 p) {
 float a=p.x*.0045+p.y*.0031, b=p.y*.006-p.z*.003;
 return p+vec3(12.*(sin(clock*.81+a)-sin(a))+4.*(sin(clock*1.49-b)-sin(-b)),
   9.*(sin(clock*.64+b)-sin(b))+4.*(sin(clock*1.12+a)-sin(a)),
   17.*(sin(clock*.71+a-b)-sin(a-b)));
}
void main(){
 vec3 p=mode<2?deform(position):position;
 vec3 view=orientation*(p-center);
 float d=lens.x-view.z;
 vec2 screen=view.xy*lens.x*lens.y+offset*d;
 gl_Position=vec4(screen.x*2./lens.z,-screen.y*2./lens.w,1.03666*d-183.299,d);
 vUv=uv;vLane=lane;vWorld=p;vNormal=orientation*normal;
}`;
const FRAGMENT=`#version 300 es
precision highp float;
in vec2 vUv; in vec2 vLane; in vec3 vNormal; in vec3 vWorld;
uniform sampler2D material;
uniform float clock,accent,opacity;
uniform vec2 timing;
uniform vec3 tint;
uniform int mode,depthOnly;
out vec4 frag;
float gauss(float x){return exp(-.5*x*x);}
float packet(float t,float when){
 float head=(mod(clock,6.)-timing.x)/(timing.y-timing.x);
 float gap=t-head;
 return gauss(gap/(gap>0.?.019:.092))*smoothstep(-.012,.075,head)*when;
}
void main(){
 if(mode==3){frag=vec4(tint*opacity,opacity);return;}
 vec4 tex=texture(material,vUv);
 if(mode==2){
   float edge=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y));
   float hair=1.-smoothstep(.0015,.0055,edge);
   vec3 panel=tex.rgb*(.98+.06*sin(clock*.43+vUv.x*.7));
   frag=vec4(mix(panel,vec3(.50,.55,.58),hair*(.38+.52*accent)),1.);return;
 }
 vec3 N=normalize(vNormal);
 float p=packet(vLane.x,1.);
 float echo=accent*gauss((vLane.x-fract(clock*.54))/.065);
 float localGain=p+echo*.68;
 if(mode==1){
    float shine=.3+.7*pow(abs(dot(N,normalize(vec3(-.55,-.54,.68)))),6.);
    float grain=.44+.56*pow(.5+.5*sin(vLane.x*173.+vLane.y*47.-clock*1.65),3.);
    float k=(.022+.68*localGain)*(.34+.66*shine)*grain*opacity;
    frag=vec4(mix(tint,vec3(.96,.99,1.),.47*p)*k,k);return;
 }
 float a=tex.a;
 if(a<.012)discard;
 vec3 base=tex.rgb;
 float lightness=max(base.r,max(base.g,base.b));
 if(depthOnly==1){
   if(a<.78||lightness<.39)discard;
   frag=vec4(0.);return;
 }
 float rim=pow(1.-abs(N.z),2.);
 vec3 lamp=normalize(vec3(-.49+.3*sin(clock*.41),-.37+.15*cos(clock*.49),.72));
 float glint=pow(max(0.,dot(reflect(-lamp,N),vec3(0.,0.,1.))),13.);
 float internal=.5+.5*sin(vLane.x*96.-clock*3.6+vLane.y*4.6);
 float surfaceLight=.98+.10*glint+.075*rim+.035*internal+.05*sin(clock*.7+vLane.x*8.);
 float fiber=smoothstep(.045,.52,lightness);
 vec3 radiance=base*surfaceLight+localGain*(.48*base+tint*(.045+.45*fiber)+vec3(.14)*pow(fiber,3.));
 radiance+=tint*(rim*.020+glint*.018)*fiber;
 frag=vec4(radiance*a,a);
}`;
