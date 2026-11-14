import json, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
OUT="data/raw/lane"
BASE="https://raw.githubusercontent.com/cltk/arabic_text_perseus/master/Lane/opensource/"
FILES=["$0.xml","_0.xml","_A0.xml","_D0.xml","_E0.xml","_H0.xml","_S0.xml","_T0.xml","_Y0.xml","_Y1.xml","_Z0.xml","b0.xml","d0.xml","f0.xml","g0.xml","h0.xml","h1.xml","j0.xml","k0.xml","k1.xml","l0.xml","l1.xml","m0.xml","m1.xml","n0.xml","n1.xml","q0.xml","q1.xml","r0.xml","s0.xml","t0.xml","v0.xml","w0.xml","w1.xml","x0.xml","z0.xml"]
def get(name):
    path=os.path.join(OUT,name)
    if os.path.exists(path) and os.path.getsize(path)>1000: return name,'cached'
    req=urllib.request.Request(BASE+name,headers={'User-Agent':'MushafAlMadinah/1.0'})
    with urllib.request.urlopen(req,timeout=120) as r: data=r.read()
    open(path,'wb').write(data)
    return name,f'{len(data)/1e6:.1f}MB'
with ThreadPoolExecutor(max_workers=6) as ex:
    for name,msg in ex.map(get,FILES): print(name,msg,flush=True)
