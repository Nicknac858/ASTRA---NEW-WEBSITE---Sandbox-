"""Exercise the downloadable file and capture its real WebGL canvas on a Chromium browser."""
import asyncio
import base64
import json
import os
import shutil
import subprocess
from pathlib import Path
from playwright.async_api import async_playwright

HERE=Path(__file__).resolve().parent
OUT=Path(os.environ.get('NC_EVIDENCE','evidence')).resolve()
SOURCE=HERE.parent/'Night-Current.html'
async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    frames=OUT/'frames'
    frames.mkdir(exist_ok=True)
    error_messages=[]
    async with async_playwright() as p:
        binary=os.environ.get('CHROME_BIN') or shutil.which('google-chrome') or shutil.which('chromium')
        browser=await p.chromium.launch(executable_path=binary,headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
        page=await browser.new_page(viewport={'width':1152,'height':648},device_scale_factor=1)
        page.on('pageerror',lambda exc:error_messages.append(str(exc)))
        await page.goto(SOURCE.as_uri()+'?review')
        await page.wait_for_function('currentReview.ready()')
        await page.evaluate('document.fonts.ready')
        assert await page.locator('#stage').get_attribute('data-ready')=='WebGL 2'
        await page.get_by_role('button',name='Follow the wire').click()
        await page.get_by_role('button',name='Back to the knot').wait_for()
        y=await page.evaluate('scrollY')
        await page.get_by_role('button',name='Open Ideas and experiments').focus()
        await page.keyboard.press('Enter')
        await page.get_by_role('dialog').wait_for()
        await page.keyboard.press('Escape')
        await page.wait_for_function("!document.querySelector('dialog').open")
        assert abs(await page.evaluate('scrollY')-y)<2
        assert await page.evaluate("document.activeElement.dataset.panel")=='ideas'
        await page.get_by_role('button',name='Pause motion').click()
        await page.wait_for_timeout(250)
        t=await page.evaluate('currentReview.stats().clock')
        await page.wait_for_timeout(700)
        assert await page.evaluate('currentReview.stats().clock')==t
        await page.get_by_role('button',name='Play motion').click()
        await page.get_by_role('button',name='Back to the knot').click()
        await page.wait_for_function('scrollY<2')
        await page.wait_for_timeout(4000)
        report={'browser':browser.version,'desktop':await page.evaluate('currentReview.stats()')}
        await page.mouse.move(1,1)
        for i in range(168):
            t=i/24
            def ease(x):
                x=max(0,min(1,x))
                return x*x*(3-2*x)
            progress=ease((t-1.7)/2.4)*(1-ease((t-4.85)/2.))
            result=await page.evaluate("""([t,p])=>{
                currentReview.frame(t,p);
                const c=document.getElementById('scene'),light=document.getElementById('light');
                const dest=window.ncCapture??=document.createElement('canvas');
                if(dest.width!==c.width||dest.height!==c.height){dest.width=c.width;dest.height=c.height;}
                const ctx=dest.getContext('2d');ctx.drawImage(c,0,0);ctx.drawImage(light,0,0,dest.width,dest.height);
                return dest.toDataURL('image/jpeg',.95).split(',')[1];
            }""",[t,progress])
            (frames/f'{i:04}.jpg').write_bytes(base64.b64decode(result))
            if i in [0,57,104]:
                await page.screenshot(path=str(OUT/f'desktop-{i}.jpg'),type='jpeg',quality=92)
        await page.close()
        for name,kw in [('phone',dict(viewport={'width':390,'height':844},has_touch=True,reduced_motion='reduce')),('fallback',dict(viewport={'width':960,'height':540}))]:
            pg=await browser.new_page(**kw)
            await pg.goto(SOURCE.as_uri()+'?review'+('&compat' if name=='fallback' else ''))
            await pg.wait_for_function('currentReview.ready()')
            if name=='phone':
                await pg.get_by_role('button',name='Play motion').wait_for()
                assert await pg.evaluate('currentReview.stats().clock')==0
                await pg.get_by_role('button',name='Index').tap()
                await pg.get_by_role('button',name='Inspiration',exact=True).tap()
                await pg.get_by_role('heading',name='Inspiration').wait_for()
                await pg.get_by_role('button',name='Close panel').tap()
                await pg.wait_for_function("!document.querySelector('dialog').open")
                assert await pg.evaluate('document.documentElement.scrollWidth==innerWidth')
            else:
                assert await pg.locator('#stage').get_attribute('data-ready')=='Canvas 2D'
            await pg.evaluate('currentReview.frame(1.97,0.38)')
            await pg.screenshot(path=str(OUT/f'{name}.jpg'),type='jpeg',quality=91)
            report[name]=await pg.evaluate('currentReview.stats()')
            await pg.close()
        await browser.close()
    assert not error_messages,error_messages
    (OUT/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')
    def encode(*args):
        subprocess.run(['ffmpeg','-loglevel','error','-y','-framerate','24','-i',str(frames/'%04d.jpg'),*args],check=True)
    encode('-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'Night-Current-motion.mp4'))
    encode('-vf','fps=12,scale=640:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=4','-loop','0',str(OUT/'Night-Current-motion.gif'))
    print(json.dumps(report))
if __name__=='__main__':asyncio.run(main())
