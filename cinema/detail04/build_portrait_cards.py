from pathlib import Path
import hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'cinema/portraits-detail-24faa388955e.json'
OUT=ROOT/'cinema/assets/portrait-cards'
OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads(SRC.read_text())
total_before=total_after=0
for name,entry in manifest.items():
    if entry.get('kind')!='image' or not entry.get('url'): continue
    src=ROOT/entry['url'].removeprefix('./')
    slug=re.sub(r'[^a-z0-9]+','-',Path(src).stem.lower()).strip('-')
    dest=OUT/f'{slug}.webp'
    cmd=['ffmpeg','-loglevel','error','-y','-i',str(src),'-vf',"scale='min(720,iw)':-2",'-c:v','libwebp','-quality','72','-compression_level','6','-map_metadata','-1',str(dest)]
    subprocess.run(cmd,check=True)
    entry['cardUrl']='./'+str(dest.relative_to(ROOT))
    entry['cardBytes']=dest.stat().st_size
    total_before+=src.stat().st_size; total_after+=dest.stat().st_size
text=json.dumps(manifest,ensure_ascii=False,separators=(',',':'))
digest=hashlib.sha256(text.encode()).hexdigest()[:12]
target=ROOT/'cinema'/f'portraits-detail04-card-{digest}.json'
target.write_text(text)
pointer=ROOT/'cinema/detail04/PORTRAIT_CARD_MANIFEST.txt'
pointer.write_text(target.name+'\n')
print(json.dumps({'count':sum(1 for e in manifest.values() if e.get('cardUrl')),'beforeBytes':total_before,'afterBytes':total_after,'reduction':round(1-total_after/total_before,4),'manifest':str(target.relative_to(ROOT))},indent=2))
