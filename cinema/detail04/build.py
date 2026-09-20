from pathlib import Path
import hashlib,json,re,shutil
R=Path(__file__).resolve().parent; S=R.parent.parent; sha=lambda x:hashlib.sha256(x.encode()).hexdigest()[:12]
base_css=(S/'cinema/detail-c9ce3bd7f6e2.css').read_text()
base_js=(S/'cinema/detail-8302ac81f194.js').read_text()
extra=(R/'edition.js').read_text().replace('if(d4Keyboard){question.focus','if(d4Keyboard&&w.dataset.responding!==\'1\'){question.focus')
css=base_css+'\n'+(R/'edition.css').read_text()
a=base_js.index('function quizDetail(){');b=base_js.index('function sync(){',a)
js=base_js[:a]+extra+'\n'+base_js[b:]
assert 'materialSync();document.body' in js
js=js.replace('materialSync();document.body','materialSync();detailSurfaces();document.body').replace("revision:'detail-03'","revision:'detail-04'")
v=(S/'cinema/visual-runtime-8eac0684e234.js').read_text()
v=v.replace('if(!REDUCED)revealStop=startParticleMorph','if(!REDUCED&&document.body.dataset.edition!==\'detail-04\')revealStop=startParticleMorph')
files={'css':'cinema/detail04-'+sha(css)+'.css','js':'cinema/detail04-'+sha(js)+'.js','visual':'cinema/visual04-'+sha(v)+'.js'}
share=(S/'cinema/core-visual-v3-share-card-3a21b5764f97.js').read_text()
share=share.replace("function autoBuild(){", "function autoBuild(){\n  if(document.body.dataset.edition==='detail-04')return; // This edition has one authoritative poster renderer.")
files['share']='cinema/share04-'+sha(share)+'.js'
for key,text in [('css',css),('js',js),('visual',v),('share',share)]: (S/files[key]).write_text(text)
html=(S/'cinema-detail-03.html').read_text().replace('detail-c9ce3bd7f6e2.css',Path(files['css']).name).replace('detail-8302ac81f194.js',Path(files['js']).name).replace('visual-runtime-8eac0684e234.js',Path(files['visual']).name)
html=html.replace('core-visual-v3-share-card-3a21b5764f97.js',Path(files['share']).name)
html=html.replace('detail-03','detail-04').replace('Detail 03','Detail 04').replace('DETAIL / 03','DETAIL / 04').replace('DETAIL EDITION 03','DETAIL EDITION 04')
for name in ['cinema-detail-04.html','cinema-material-02.html','cinema-20260920.html']:(S/name).write_text(html)
sw=(S/'sw.js').read_text();sw=re.sub(r'const CACHE_NAME="[^"]+";', 'const CACHE_NAME="trader-dna-event-detail04-'+sha(html)+'";',sw);(S/'sw.js').write_text(sw)
source=S/'cinema/detail04';source.mkdir(exist_ok=True)
# Source already lives alongside this portable build script.
files.update({'entry':'cinema-detail-04.html','release':'detail-04-final','htmlSha256':hashlib.sha256(html.encode()).hexdigest(),'baseCommit':'983a90d74fdfcf293d6fea3a917767b32566fcf3'})
(source/'BUILD.json').write_text(json.dumps(files,indent=2)+'\n')
print(json.dumps(files,indent=2))
