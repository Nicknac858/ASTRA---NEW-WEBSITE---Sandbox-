"""Unwrap the approved photographic material into individually lit, flexible 3D surfaces."""
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.interpolate import CubicHermiteSpline
from scipy.ndimage import distance_transform_edt, gaussian_filter1d, map_coordinates

from shape import WIDE, PORTRAIT

HERE = Path(__file__).resolve().parent
STUDIES = HERE.parent / 'studies' / 'night-current'
OUT = HERE / 'textures'
SAMPLES, ROW, BORDER = 2048, 176, 3

def resample(points):
    points = np.array(points, dtype=float)
    u = np.r_[0, np.cumsum(np.linalg.norm(np.diff(points[:, :2], axis=0), axis=1))]
    deriv = np.gradient(points, u, axis=0)
    curve = CubicHermiteSpline(u, points, deriv)
    p = curve(np.linspace(0, u[-1], 3500))
    arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p[:, :2], axis=0), axis=1))]
    t = np.linspace(0, arc[-1], SAMPLES)
    p = np.stack([np.interp(t, arc, col) for col in p.T], axis=1)
    p[:, 3] = np.maximum(1, p[:, 3])*1.22
    return p

def sample(image, x, y):
    if image.ndim == 2:
        return map_coordinates(image, [y,x], order=1, mode='nearest', prefilter=False)
    return np.stack([sample(ch,x,y) for ch in image.transpose(2,0,1)], axis=-1)

def webp(path, pixels, quality=93):
    Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8)).save(path, format='WEBP', quality=quality, method=5, alpha_quality=100)

def panel_image(rgb, corners, large):
    a,b,c,d = np.array(corners)[:,:2]
    u,v = np.meshgrid(np.linspace(.003,.997,720 if large else 225),np.linspace(.004,.996,420 if large else 150))
    xy = (1-v[...,None])*((1-u[...,None])*a+u[...,None]*b)+v[...,None]*((1-u[...,None])*d+u[...,None]*c)
    tex = sample(rgb, xy[:,:,0], xy[:,:,1])
    chroma = np.ptp(tex,axis=2)
    bad = chroma > np.maximum(19.,tex.max(axis=2)*.36)
    if bad.any():
        iy,ix = distance_transform_edt(bad, return_distances=False, return_indices=True)
        tex[bad] = tex[iy[bad],ix[bad]]
    return tex

def bake(name, spec, source):
    image = Image.open(source).convert('RGB')
    w,h = spec['size']
    assert image.size == (w,h)
    rgb = np.asarray(image, dtype=np.float32)
    webp(OUT / (name+'-still.webp'),rgb,90)
    panel_mask = Image.new('L', (w,h))
    draw = ImageDraw.Draw(panel_mask)
    for i,quad in enumerate(spec['windows']):
        draw.polygon([(x,y) for x,y,_ in quad], fill=255)
        webp(OUT / (name+'-window-'+str(i)+'.webp'),panel_image(rgb,quad,i==0),94)
    mask = np.array(panel_mask)/255
    chroma = np.ptp(rgb,axis=2)
    field = np.clip((rgb.max(axis=2)-3)/15,0,1)
    field *= 1-mask*(1-np.clip((chroma-10)/24,0,1))
    # The seven flecks in the projected reference belong to the timed emitter.
    quiet = Image.new('L', (w,h))
    qd = ImageDraw.Draw(quiet)
    if name == 'wide':
        qd.polygon([(402,106),(500,107),(581,239),(574,247),(426,208)],fill=255)
    else:
        qd.polygon([(536,561),(651,460),(685,463),(697,643),(559,610)],fill=255)
    field *= 1-np.asarray(quiet)/255
    paths, weights = [], []
    for guide in spec['strands']:
        p = resample(guide['points'])
        paths.append(p)
        xi,yi = np.rint(p[:,:2]).astype(int).T
        good = (xi>=0)&(xi<w)&(yi>=0)&(yi<h)
        ids = np.full((h,w),-1,dtype=np.int32)
        ids[yi[good],xi[good]] = np.flatnonzero(good)
        dist,idx = distance_transform_edt(ids<0, return_indices=True)
        near = ids[idx[0],idx[1]]
        radial = dist/p[near,3]
        col = np.array(guide['color'])
        pigment = ((rgb-rgb.min(axis=2,keepdims=True))*col).sum(axis=2)/(np.maximum(chroma,1)*max(col.sum()-.2,1))
        geometric = np.maximum(0,1-np.clip((radial-.81)/.19,0,1))
        weight = geometric*np.exp(-2.3*radial**2)*(.48+2.3*pigment**2)*np.exp(p[near,2]/340)
        weights.append(weight.astype(np.float32))
    total = np.sum(weights,axis=0)
    atlas = np.zeros((len(paths)*ROW,SAMPLES,4),dtype=np.uint8)
    dg = []
    for i,(guide,p) in enumerate(zip(spec['strands'],paths)):
        n = np.gradient(p[:,:2],axis=0); n /= np.linalg.norm(n,axis=1,keepdims=True)
        a = np.linspace(-1,1,ROW-2*BORDER)[:,None]
        x = p[None,:,0] - n[None,:,1]*p[None,:,3]*a
        y = p[None,:,1] + n[None,:,0]*p[None,:,3]*a
        color = sample(rgb,x,y)
        ownership = np.clip(weights[i]/np.maximum(total,.00001),0,1)**.73
        alpha = sample((field*ownership).astype('float32'),x,y)*np.clip((1-abs(a))/.06,0,1)
        out_of_frame = (x<1)|(x>w-2)|(y<1)|(y>h-2)
        # Continue the actual material around the back of the fold beyond the reference crop.
        columns = np.arange(SAMPLES)
        for lane in range(len(a)):
            valid = np.flatnonzero(~out_of_frame[lane])
            if len(valid)<8:
                continue
            left,right = valid[0],valid[-1]
            reach = min(62,max(4,(right-left)//7))
            # Mirror the actual last visible fibers continuously, including their per-lane exit positions.
            distance = np.maximum(left-columns,columns-right).clip(min=0)
            reflection = reach-np.abs(np.mod(distance,2*reach)-reach)
            src = np.where(columns<left,left+reflection,np.where(columns>right,right-reflection,columns))
            outside = out_of_frame[lane]
            color[lane,outside] = color[lane,src[outside]]
            alpha[lane,outside] = alpha[lane,src[outside]]
        # Borrow a neighboring section of the same ribbon where another strand or panel obscured it in the painting.
        own_sample = sample(ownership.astype('float32'),x,y)
        panel_sample = sample(mask.astype('float32'),x,y)
        central = np.abs(a[:,0])<.56
        quality = np.median(own_sample[central],axis=0)*(1-np.mean(panel_sample[central],axis=0))
        clean = quality>.76
        if np.count_nonzero(clean)>18:
            nearest = distance_transform_edt(~clean,return_distances=False,return_indices=True)[0]
            neighbor_color = gaussian_filter1d(color[:,nearest,:],2,axis=1)
            neighbor_alpha = gaussian_filter1d(alpha[:,nearest],2,axis=1)
            missing = np.maximum((1-own_sample)**2*.65,panel_sample*.86)
            donor = neighbor_alpha*missing
            base_alpha = alpha
            alpha = base_alpha+donor*(1-base_alpha)
            color = (color*base_alpha[:,:,None]+neighbor_color*(donor*(1-base_alpha))[:,:,None])/np.maximum(alpha[:,:,None],.0001)
        # Reconstruct covered runs along each individual fiber when a media plane has moved away.
        for lane in range(len(a)):
            hole = (panel_sample[lane]>.04)&(~out_of_frame[lane])
            if not hole.any():
                continue
            clean_cols = np.flatnonzero((panel_sample[lane]<.01)&(~out_of_frame[lane]))
            if len(clean_cols)>5:
                target = np.flatnonzero(hole)
                weight = np.clip(panel_sample[lane,target]*1.15,0,1)
                old = color[lane,target].copy()
                for ch in range(3):
                    inferred = np.interp(target,clean_cols,color[lane,clean_cols,ch])
                    color[lane,target,ch] = old[:,ch]*(1-weight)+inferred*weight
                inferred_alpha = np.interp(target,clean_cols,alpha[lane,clean_cols])
                alpha[lane,target] = alpha[lane,target]*(1-weight)+inferred_alpha*weight
        if guide['name'] in ('crown','incoming','back-edge','sliver','tap'):
            taper=np.linspace(0,1,SAMPLES)
            if guide['name'] in ('crown','incoming','back-edge','tap'):
                alpha*=np.clip(taper/.041,0,1)[None,:]
            if guide['name'] in ('crown','back-edge','sliver'):
                alpha*=np.clip((1-taper)/.058,0,1)[None,:]
        row = np.concatenate([color,alpha[:,:,None]*255],axis=2)
        atlas[i*ROW+BORDER:(i+1)*ROW-BORDER] = np.clip(row,0,255).astype(np.uint8)
        metadata = {k:v for k,v in guide.items() if k!='points'}
        dense = np.unique(np.rint(np.linspace(0,SAMPLES-1,min(235,max(58,len(guide['points'])*11)))).astype(int))
        metadata['path'] = p[dense].round(3).tolist()
        dg.append(metadata)
    webp(OUT/(name+'-ribbons.webp'),atlas,94)
    result = {k:v for k,v in spec.items() if k!='strands'}
    result.update(strands=dg, row=ROW, border=BORDER)
    return result

if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    data = {n:bake(n,s,STUDIES/f) for n,s,f in [('wide',WIDE,'night-current.png'),('portrait',PORTRAIT,'portrait.png')]}
    (OUT/'guides.json').write_text(json.dumps(data,separators=(',',':')))
