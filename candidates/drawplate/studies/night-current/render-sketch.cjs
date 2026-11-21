// Offline Gate 1 timing sketch. Run with standard Node.js.
function renderStudy() {
  const w=640,h=360,nFrames=90;
  const cyan=[18,212,255],pink=[255,39,148],citron=[195,248,43];
  const core=[270,114], contact=[231,99];
  const strands=[
    {rgb:cyan,phase:1,layers:0.63,pts:[[198,143,7],[209,110,12],contact.concat(5),core.concat(4),[323,78,15],[409,61,9],[488,39,16],[531,67,12],[518,110,7]]},
    {rgb:pink,phase:4,layers:0.68,pts:[[379,65,9],[339,31,13],[301,20,9],[269,36,8],[242,64,8],[237,89,7],[251,106,6],core.concat(3.5)],cue:[.12,1.50,23,3.2,1.0]},
    {rgb:pink,phase:8,layers:0.85,pts:[core.concat(3.5),[309,109,5],[347,120,7],[386,141,9],[425,145,10],[466,126,12],[499,91,15],[535,45,14],[538,8,12],[529,-14,7]]},
    {rgb:cyan,phase:6,layers:.49,pts:[[559,-12,7],[557,31,8],[544,65,12],[514,96,14],[475,120,12],[445,147,10],[408,165,12],[369,160,12],[321,140,9],core.concat(4)]},
    {rgb:pink,phase:2,layers:.87,pts:[[310,143,2],[311,167,2.8],[323,190,3],[351,210,3.3],[395,222,4.4],[436,236,5],[462,253,6],[485,278,5],[494,297,2.7]],cue:[2.04,3.78,27,3.9,1.05]},
    {rgb:citron,phase:3,layers:.77,pts:[[334,160,1.5],[344,181,2],[360,200,2],[384,214,2.1],[426,223,2.4],[468,236,2.3],[494,253,2.5],[508,280,2.7],[510,296,1.3]],cue:[2.87,4.65,20,2.6,1.15]},
    {rgb:cyan,phase:9,layers:1,pts:[core.concat(3.5),[287,135,4],[286,161,4.2],[291,184,5],[303,206,5.5],[326,229,6],[355,248,6],[394,265,7],[442,283,7],[488,302,8],[523,322,8],[560,348,9],[579,373,9]],cue:[1.50,3.85,36,4.8,1.34]},
    {rgb:cyan,phase:5,layers:.51,pts:[core.concat(3.3),[256,107,2.7],[244,104,1.6],contact.concat(1.6)],cue:[1.49,1.82,9,2.1,1]}
  ];
  const sparks=[[-115,-66,0,.60,pink],[-66,-105,.018,.67,cyan],[-116,-30,.05,.43,citron],[-86,-86,.076,.48,pink],[-38,-112,.096,.53,cyan],[-148,-52,.132,.56,pink],[-48,-86,.166,.38,citron]];
  const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
  const gaussian=x=>Math.exp(-.5*x*x);
  const curve=(a,b,c,d,t)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  const base=new Float32Array(w*h*3);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*3;
    const field=Math.exp(-((x-352)**2/(250**2)+(y-148)**2/(155**2)));
    base.set([2+field*2.8,4+field*4.7,10+field*6.8],i);
  }
  function drawMedia(quad,amp) {
    const [x,y,ww,hh,shear]=quad;
    for(let dx=0;dx<ww;dx++)for(let dy=0;dy<hh;dy++){
      const xx=Math.round(x+dx),yy=Math.round(y+dy+dx*shear);
      if(xx<0||xx>=w||yy<0||yy>=h)continue;
      const u=dx/ww,v=dy/hh;
      const edge=Math.min(dx,ww-dx,dy,hh-dy);
      const fold=.45+.25*Math.sin(6*u+.4)+.13*Math.sin(10*u);
      const silver=33*gaussian((v-fold)/.12)+26*gaussian((v-fold)/.018)+17*gaussian((v-.79+.24*Math.cos(u*6))/.038);
      const value=amp*(4+silver+(edge<1?31:0));const i=(yy*w+xx)*3;
      base.set([value*.86+2,value*.91+4,value+7],i);
    }
  }
  drawMedia([424,186,38,20,-.05],.25);
  drawMedia([145,116,119,80,.16],.62);
  const maps=[];
  for(const strand of strands){
    const nearest=new Map();let prior=null,length=0;
    for(let k=0;k<strand.pts.length-1;k++){
      const a=strand.pts[Math.max(0,k-1)],b=strand.pts[k],c=strand.pts[k+1],d=strand.pts[Math.min(strand.pts.length-1,k+2)];
      const steps=Math.max(3,Math.ceil(Math.hypot(c[1]-b[1],c[0]-b[0])/.52));
      for(let j=k?1:0;j<=steps;j++){
        const t=j/steps;const p=b.map((v,i)=>curve(a[i],v,c[i],d[i],t));
        const nx=curve(a[0],b[0],c[0],d[0],t+.001)-p[0],ny=curve(a[1],b[1],c[1],d[1],t+.001)-p[1];
        const norm=Math.hypot(nx,ny)||1;if(prior)length+=Math.hypot(p[0]-prior[0],p[1]-prior[1]);prior=p;
        const width=p[2],reach=width*2.45;
        for(let yy=Math.max(0,Math.floor(p[1]-reach));yy<=Math.min(h-1,Math.ceil(p[1]+reach));yy++){
          for(let xx=Math.max(0,Math.floor(p[0]-reach));xx<=Math.min(w-1,Math.ceil(p[0]+reach));xx++){
            const dx=xx-p[0],dy=yy-p[1],dist=Math.hypot(dx,dy)/width;
            if(dist>2.45)continue;const id=yy*w+xx,hit=nearest.get(id);
            if(!hit||hit.dist>dist)nearest.set(id,{dist,u:dist*Math.sign((-ny*dx+nx*dy)/norm||1),s:length});
          }
        }
      }
    }
    const mapped=[];
    for(const [id,p] of nearest){
      const x=p.u, s=p.s, inner=Math.abs(x)<1;
      const edge=gaussian((Math.abs(x)-.91)/.087);
      const fiber=gaussian((x-.31*Math.sin(s/49+strand.phase))/.108);
      const threads=(.5+.5*Math.cos(21*x+1.8*Math.sin(s/26)+strand.phase))**8;
      const wave=.56+.44*Math.cos(s/37+strand.phase)**2;
      const power=strand.layers*wave*(.035*gaussian(x/1.2)+.29*edge+(inner?.15*threads+.45*fiber+.05:0));
      for(let ch=0;ch<3;ch++)base[id*3+ch]+=strand.rgb[ch]*power+(26*edge+24*fiber)*wave*strand.layers;
      mapped.push([id*3,s,gaussian(x/.62)*(.75+.25*threads),gaussian(x/1.55)*.22]);
    }
    if(strand.cue)maps.push({strand,length,mapped});
  }
  function blob(buffer,x,y,r,color,gain){
    const radius=r*2.8;
    for(let yy=Math.max(0,Math.floor(y-radius));yy<=Math.min(h-1,Math.ceil(y+radius));yy++)for(let xx=Math.max(0,Math.floor(x-radius));xx<=Math.min(w-1,Math.ceil(x+radius));xx++){
      const amp=gaussian(Math.hypot(xx-x,yy-y)/r)*gain,i=(yy*w+xx)*3;
      for(let c=0;c<3;c++)buffer[i+c]+=amp*color[c];
    }
  }
  blob(base,core[0],core[1],7,[255,46,156],.28);blob(base,core[0],core[1],2,[255,223,241],.74);
  function frame(time) {
    const image=new Float32Array(base);
    for(const {strand,length,mapped} of maps){
      const [start,end,tail,nose,gain]=strand.cue, t=(time-start)/(end-start),head=t*length;
      if(t<0||head>length+3*tail)continue;
      for(const [idx,s,inside,halo] of mapped){
        const gap=s-head;if(gap < -3*tail || gap>3*nose)continue;
        const body=gaussian(gap/(gap>0?nose:tail)),tip=gaussian(gap/nose);
        for(let c=0;c<3;c++)image[idx+c]+=gain*Math.min(1,12*t)*(strand.rgb[c]*body*(inside+halo)+195*tip*inside);
      }
    }
    const age=time-1.82;
    if(age>-.22&&age<1.04){
      blob(image,...contact,7.5,pink,.70*gaussian(age/.09));
      blob(image,...contact,1.8,[255,255,245],1.5*gaussian(age/.11));
      for(const [vx,vy,delay,life,col] of sparks){
        const t=age-delay;if(t<0||t>=life)continue;
        const level=Math.min(1,t/.048)*(1-t/life)**.62;
        const point=u=>[contact[0]+vx*(1-Math.exp(-1.15*u))/1.15,contact[1]+vy*u+17*u*u];
        for(let j=0;j<6;j++){const p=point(Math.max(0,t-(5-j)*.009));blob(image,...p,.76,col,level*(.14+.20*j));}
        const p=point(t);blob(image,...p,1.2,[255,248,254],level*.92);blob(image,...p,2.6,col,level*.24);
      }
    }
    return image;
  }
  const palette=[[0,0,0]];
  function ramp(colors,steps){
    for(let i=0;i<steps;i++){const pos=i/(steps-1)*(colors.length-1),a=Math.min(colors.length-2,Math.floor(pos)),f=pos-a;
      palette.push(colors[a].map((v,j)=>Math.round(v*(1-f)+colors[a+1][j]*f)));}
  }
  ramp([[2,4,10],[20,27,38],[150,155,164],[255,255,253]],36);
  ramp([[2,5,12],[7,44,72],[9,145,206],[29,233,255],[209,255,255]],66);
  ramp([[6,4,13],[46,12,40],[154,11,85],[255,39,154],[255,213,242]],61);
  ramp([[3,6,11],[37,49,22],[105,142,28],[195,247,41],[245,255,190]],40);
  ramp([[9,8,20],[57,31,81],[140,87,151],[242,183,222]],28);
  ramp([[4,9,16],[27,46,66],[121,159,182],[238,248,251]],24);
  const lut=new Uint8Array(32*32*32);
  for(let key=0;key<lut.length;key++){const r=((key>>10)&31)*8+3,g=((key>>5)&31)*8+3,b=(key&31)*8+3;
    let best=1,error=1e9;for(let n=1;n<palette.length;n++){const p=palette[n],d=(r-p[0])**2+1.16*(g-p[1])**2+.78*(b-p[2])**2;if(d<error){error=d;best=n;}}lut[key]=best;}
  function indexed(t){
    const f=frame(t),out=new Uint8Array(w*h);for(let i=0;i<out.length;i++){const a=3*i;
      const key=(Math.min(31,f[a]>>3)<<10)|(Math.min(31,f[a+1]>>3)<<5)|Math.min(31,f[a+2]>>3);out[i]=lut[key];}
    return out;
  }
  function lzw(pix){
    let size=9,next=258,bits=0,acc=0,dict=new Map();const bytes=[];
    function code(n){acc|=n<<bits;bits+=size;while(bits>=8){bytes.push(acc&255);acc>>>=8;bits-=8;}}
    function after(){if(next===(1<<size)&&size<12)size++;}
    code(256);let p=pix[0];
    for(let i=1;i<pix.length;i++){const k=(p<<8)|pix[i],v=dict.get(k);if(v!==undefined){p=v;continue;}
      code(p);after();if(next<4096)dict.set(k,next++);else{code(256);next=258;size=9;dict.clear();}p=pix[i];}
    code(p);after();code(257);if(bits)bytes.push(acc&255);return bytes;
  }
  function encode(times,loop) {
    const out=[];const str=s=>{for(const c of s)out.push(c.charCodeAt(0));};const u16=n=>out.push(n&255,n>>8);
    str('GIF89a');u16(w);u16(h);out.push(247,1,0);for(const c of palette)out.push(...c);
    if(loop){out.push(33,255,11);str('NETSCAPE2.0');out.push(3,1,0,0,0);}
    let prev;
    for(let i=0;i<times.length;i++){
      const p=indexed(times[i]);let x0=w,y0=h,x1=-1,y1=-1;
      if(prev){for(let k=0;k<p.length;k++)if(p[k]!==prev[k]){const x=k%w,y=(k/w)|0;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
      else{x0=0;y0=0;x1=w-1;y1=h-1;}
      if(x1<0){x0=y0=x1=y1=0;}
      const ww=x1-x0+1,hh=y1-y0+1,part=new Uint8Array(ww*hh);
      for(let y=0;y<hh;y++)for(let x=0;x<ww;x++){const k=(y+y0)*w+x0+x;part[y*ww+x]=prev&&p[k]===prev[k]?0:p[k];}
      const delay=loop?Math.round((i+1)*600/nFrames)-Math.round(i*600/nFrames):0;
      out.push(33,249,4,5);u16(delay);out.push(0,0,44);u16(x0);u16(y0);u16(ww);u16(hh);out.push(0,8);
      const bytes=lzw(part);
      for(let k=0;k<bytes.length;k+=255){const n=Math.min(255,bytes.length-k);out.push(n,...bytes.slice(k,k+n));}out.push(0);prev=p;
    }
    out.push(59);return new Uint8Array(out);
  }
  return {animation:encode(Array.from({length:nFrames},(_,i)=>i/15),true),poster:encode([2.05],false),dim:[w,h],frames:nFrames};
}

const fs = require('node:fs');
const path = require('node:path');
const study = renderStudy();
fs.writeFileSync(path.join(__dirname, 'pulse.gif'), study.animation);
fs.writeFileSync(path.join(__dirname, 'contact-frame.gif'), study.poster);
