import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await mkdir('dist/assets/fonts',{recursive:true});
for (const [family,files] of [
  ['hanken-grotesk',['hanken-grotesk-latin-wght-normal.woff2']],
  ['bodoni-moda',['bodoni-moda-latin-standard-normal.woff2','bodoni-moda-latin-standard-italic.woff2']],
]) {
  for (const file of files) await cp(`node_modules/@fontsource-variable/${family}/files/${file}`,`dist/assets/fonts/${file}`);
  await cp(`node_modules/@fontsource-variable/${family}/LICENSE`,`dist/assets/fonts/${family}-LICENSE.txt`);
}
await build({entryPoints:['src/main.js'],outfile:'dist/app.js',bundle:true,minify:true,format:'esm',target:'es2022',sourcemap:true});
console.log('Afterimage built.');
