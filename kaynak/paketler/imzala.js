// Paket imzalama aracı (sadece geliştirici makinesinde çalışır; özel anahtar repoya girmez)
const fs=require('fs'), path=require('path'), c=require('crypto');
const dir=process.argv[2], packName=process.argv[3]||'hd', version=+(process.argv[4]||1);
function walk(d,b=''){ return fs.readdirSync(d).flatMap(f=>{ const p=path.join(d,f), r=b?b+'/'+f:f; return fs.statSync(p).isDirectory()?walk(p,r):[r]; }); }
const files=walk(dir).filter(f=>f!=='manifest.json').sort().map(p=>{ const buf=fs.readFileSync(path.join(dir,p)); return {p, h:c.createHash('sha256').update(buf).digest('hex'), s:buf.length}; });
const body=JSON.stringify({pack:packName, version, created:new Date().toISOString(), files});
const key=c.createPrivateKey(fs.readFileSync('/workspace/keys/pack_private.pem'));
const sig=c.sign('sha256', Buffer.from(body), {key, dsaEncoding:'ieee-p1363'}).toString('base64');
fs.writeFileSync(path.join(dir,'manifest.json'), JSON.stringify({body, sig}));
console.log('imzalandı', files.length, 'dosya', files.reduce((a,f)=>a+f.s,0), 'bayt');
