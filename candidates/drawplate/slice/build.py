"""Build an offline, single-file browser preview without external dependencies."""
import base64
import json
from pathlib import Path
from sys import argv
root=Path(__file__).resolve().parent
if not (root/'textures/guides.json').exists():
    import runpy
    runpy.run_path(str(root/'bake.py'),run_name='__main__')
out=Path(argv[1]).resolve() if len(argv)>1 else root/'Night-Current.html'
def data(path, mime):
    return 'data:'+mime+';base64,'+base64.b64encode((root/path).read_bytes()).decode('ascii')
images={}
html=(root/'shell.html').read_text()
for name in ['wide','portrait']:
    def img(s): return data('textures/'+name+'-'+s+'.webp','image/webp')
    images[name]=dict(ribbons=img('ribbons'),panels=[img('window-0'),img('window-1')])
    html=html.replace('__'+name.upper()+'_STILL__',img('still'))
fonts=root/'fonts'
style=(root/'style.css').read_text().replace('__SANS__',data('fonts/instrument-sans.woff2','font/woff2')).replace('__SERIF__',data('fonts/spectral.woff2','font/woff2'))
licenses='\n'.join((fonts/f).read_text() for f in ['instrument-sans-OFL.txt','spectral-OFL.txt'])
script='\n'.join((root/f).read_text() for f in ['world.js','shaders.js','render.js','software.js','app.js'])
assets='const NC_ASSETS='+json.dumps(dict(guides=json.loads((root/'textures/guides.json').read_text()),images=images),separators=(',',':'))+';'
html=html.replace('/*__STYLE__*/',style).replace('/*__ASSETS__*/',assets).replace('/*__SCRIPT__*/',script)
html=html.replace('</html>','<!-- Embedded typeface licenses\n'+licenses.replace('--','—')+'\n-->\n</html>')
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
print(out.name, out.stat().st_size)
