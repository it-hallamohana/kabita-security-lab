import http from 'node:http';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.mjs';

const failure=(status,message)=>Object.assign(Error(message),{status});
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
export function createApp(store,env=process.env,logger=console.log){
 const vulnerable=env.LAB_MODE==='vulnerable';
 if(!['hardened','vulnerable'].includes(env.LAB_MODE))throw Error('Set LAB_MODE=hardened or vulnerable');
 if(vulnerable&&env.LAB_ACK!=='ISOLATED_DUMMY_ONLY')throw Error('Vulnerable mode requires LAB_ACK=ISOLATED_DUMMY_ONLY');
 for(const name of ['ADMIN_PASSWORD','OPERATOR_PASSWORD','DEVICE_TOKEN'])if(!env[name]||env[name].length<16)throw Error(`${name} must contain at least 16 characters`);
 const sessions=new Map(),attempts=new Map();
 const accounts=[['blue@kabita.lab',env.ADMIN_PASSWORD,'admin','blue'],['peternak.a@kabita.lab',env.OPERATOR_PASSWORD,'operator','farm-a'],['peternak.b@kabita.lab',env.OPERATOR_PASSWORD,'operator','farm-b']].map(([email,password,role,owner])=>{const salt=randomBytes(16);return {email,role,owner,salt,hash:scryptSync(password,salt,32)};});
 const fakeSalt=randomBytes(16);
 const audit=(event,req,extra={})=>logger(JSON.stringify({time:new Date().toISOString(),event,source_ip:(["127.0.0.1","::1","::ffff:127.0.0.1"].includes(req.socket.remoteAddress)?req.headers["x-real-ip"]:null)||req.socket.remoteAddress,method:req.method,path:req.url?.split('?')[0],mode:env.LAB_MODE,...extra}));
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
 const user=req=>{const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('kabita_session='))?.slice(15);const session=sessions.get(token);if(!session||session.expires<Date.now()){sessions.delete(token);throw failure(401,'Silakan masuk.');}return session;};
 const admin=req=>{const u=user(req);if(u.role!=='admin')throw failure(403,'Akses Blue Team diperlukan.');return u;};
 const body=async req=>{let value='';for await(const chunk of req){value+=chunk;if(Buffer.byteLength(value)>16384)throw failure(413,'Payload terlalu besar.');}try{return JSON.parse(value||'{}');}catch{throw failure(400,'JSON tidak valid.');}};
 const rate=(req,key,max)=>{const now=Date.now();for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);const k=`${req.socket.remoteAddress}:${key}`;const v=attempts.get(k)||{count:0,until:now+60000};v.count++;attempts.set(k,v);if(v.count>max){audit('rate_limit',req);throw failure(429,'Terlalu banyak percobaan. Tunggu satu menit.');}};
 const owned=(row,u)=>row&&(u.role==='admin'||row.owner_id===u.owner);
 const jsonRow=r=>({...r.data,id:r.id,owner_id:r.owner_id});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if(vulnerable)res.setHeader('X-Lab-Banner','KABITA training baseline');
  try{
   const path=new URL(req.url,'http://localhost').pathname;
   if(path.startsWith('/api/'))rate(req,'api',120);
   if(['POST','PUT','DELETE','PATCH'].includes(req.method)&&req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host)throw failure(403,'Origin tidak diizinkan.');}
   if(path==='/api/health'&&req.method==='GET')return send(res,200,{status:'ok',project:'KABITA LAB',backend:env.DB_BACKEND||'postgres'});
   if(path==='/api/login'&&req.method==='POST'){
    rate(req,'login',10);const b=await body(req);
    if(typeof b.email!=='string'||typeof b.password!=='string'||b.password.length>256)throw failure(400,'Input login tidak valid.');
    const a=accounts.find(a=>a.email===b.email.toLowerCase());const hash=scryptSync(b.password,a?.salt||fakeSalt,32);
    let identity=a&&timingSafeEqual(hash,a.hash)?{email:a.email,role:a.role,owner:a.owner}:null;
    // V01: a deliberately weak, synthetic account; never an OS/database account.
    if(vulnerable&&b.email==='legacy@kabita.lab'&&b.password==='kabita123')identity={email:b.email,role:'operator',owner:'farm-a'};
    if(!identity){audit('login_failed',req);throw failure(401,'Email atau kata sandi salah.');}
    const token=randomBytes(32).toString('hex');for(const [k,v]of sessions)if(v.expires<Date.now())sessions.delete(k);
    sessions.set(token,{...identity,expires:Date.now()+3600000});
    res.setHeader('Set-Cookie',`kabita_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${env.COOKIE_SECURE==='true'?'; Secure':''}`);
    audit('login_success',req,{actor:identity.email});return send(res,200,identity);
   }
   if(path==='/api/logout'&&req.method==='POST'){const t=(req.headers.cookie||'').match(/kabita_session=([^;]+)/)?.[1];sessions.delete(t);res.setHeader('Set-Cookie','kabita_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true});}
   if(path==='/api/me'&&req.method==='GET'){const u=user(req);return send(res,200,{email:u.email,role:u.role,owner:u.owner,backend:env.DB_BACKEND,mode:env.LAB_MODE});}
   if(path==='/api/debug/export'&&req.method==='GET'){
    // V04: only synthetic inventory is returned. Never environment variables or credentials.
    if(!vulnerable)admin(req);audit('debug_export',req);return send(res,200,{synthetic:true,records:(await store.list('sheep')).map(jsonRow)});
   }
   if(path==='/api/ingest'&&req.method==='POST'){
    rate(req,'ingest',30);
    // V03: missing device authentication in baseline mode.
    if(!vulnerable&&!equal(req.headers['x-device-token'],env.DEVICE_TOKEN)){audit('device_auth_denied',req);throw failure(401,'Token perangkat diperlukan.');}
    const b=await body(req);
    if(b.device_id!=='sensor-a'||typeof b.value!=='number'||!Number.isFinite(b.value)||b.value<=0||b.value>250)throw failure(400,'Perangkat atau berat tidak valid (0–250 kg).');
    const row={kind:'readings',id:randomUUID(),owner_id:'farm-a',data:{device_id:'sensor-a',sheep_id:'sheep-a',value:b.value,unit:'kg',recorded_at:new Date().toISOString(),is_simulated:true}};
    await store.put(row);audit('sensor_ingest',req,{device_id:b.device_id,authenticated:!!req.headers['x-device-token']&&equal(req.headers['x-device-token'],env.DEVICE_TOKEN)});return send(res,201,jsonRow(row));
   }
   if(path==='/api/sheep'&&req.method==='GET'){const u=user(req);return send(res,200,(await store.list('sheep')).filter(r=>owned(r,u)).map(jsonRow));}
   const match=path.match(/^\/api\/sheep\/([a-zA-Z0-9-]+)$/);
   if(match&&req.method==='GET'){
    const u=user(req),row=await store.get('sheep',match[1]);
    // V02: object ownership deliberately skipped only on this detail endpoint.
    if(!row||(!vulnerable&&!owned(row,u))){audit('object_access_denied',req,{actor:u.email,object:match[1]});throw failure(404,'Data tidak ditemukan.');}
    audit('sheep_detail',req,{actor:u.email,object:row.id,cross_owner:!owned(row,u)});return send(res,200,jsonRow(row));
   }
   if(path==='/api/sheep'&&req.method==='POST'){
    const u=user(req),b=await body(req);if(typeof b.name!=='string'||b.name.length<2||b.name.length>80||!['Garut','Merino','Texel'].includes(b.breed)||!['jantan','betina'].includes(b.sex))throw failure(400,'Nama, ras, atau jenis kelamin tidak valid.');
    const row={kind:'sheep',id:randomUUID(),owner_id:u.owner==='blue'?'farm-a':u.owner,data:{name:b.name,breed:b.breed,sex:b.sex,ear_tag:'LAB-'+randomBytes(3).toString('hex'),barn:'Kandang Lab',health:'Sehat',synthetic:true}};await store.put(row);audit('sheep_created',req,{actor:u.email,object:row.id});return send(res,201,jsonRow(row));
   }
   if(['/api/growth','/api/readings'].includes(path)&&req.method==='GET'){const u=user(req);return send(res,200,(await store.list(path.endsWith('growth')?'growth':'readings')).filter(r=>owned(r,u)).map(jsonRow));}
   if(path==='/api/growth'&&req.method==='POST'){
    const u=user(req),b=await body(req),sheep=typeof b.sheep_id==='string'?await store.get('sheep',b.sheep_id):null;
    if(!owned(sheep,u))throw failure(404,'Ternak tidak ditemukan.');
    if(typeof b.weight!=='number'||!Number.isFinite(b.weight)||b.weight<=0||b.weight>250||typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||new Date(b.date).toISOString().slice(0,10)!==b.date||b.date>new Date().toISOString().slice(0,10))throw failure(400,'Tanggal atau berat tidak valid.');
    const row={kind:'growth',id:randomUUID(),owner_id:sheep.owner_id,data:{sheep_id:sheep.id,weight:b.weight,date:b.date,notes:String(b.notes||'').slice(0,500)}};await store.put(row);audit('growth_created',req,{actor:u.email,object:sheep.id});return send(res,201,jsonRow(row));
   }
   if(path==='/api/blue/status'&&req.method==='GET'){admin(req);return send(res,200,{mode:env.LAB_MODE,backend:env.DB_BACKEND,synthetic:true,vulnerabilities:vulnerable?['V01_DEFAULT_ACCOUNT','V02_IDOR','V03_SENSOR_AUTH','V04_DEBUG_EXPORT']:[],controls:{default_account:!vulnerable,object_authorization:!vulnerable,device_auth:!vulnerable,debug_authorization:!vulnerable,input_validation:true,parameterized_queries:true,security_headers:true,audit_logs:true,rate_limit:true}});}
   if(path.startsWith('/api/'))throw failure(404,'Endpoint tidak ditemukan.');
   if(req.method!=='GET')throw failure(405,'Metode tidak didukung.');
   const root=resolve(env.STATIC_DIR||'dist');let filename=resolve(root,'.'+decodeURIComponent(path));if(!filename.startsWith(root+sep)&&filename!==root)throw failure(404,'Tidak ditemukan.');
   try{if(!(await stat(filename)).isFile())filename=resolve(root,'index.html');}catch{filename=resolve(root,'index.html');}
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
   if(!types[extname(filename)])throw failure(404,'Tidak ditemukan.');res.setHeader('Content-Type',types[extname(filename)]);res.end(await readFile(filename));
  }catch(e){const status=e.status||500;if(status===500)audit('server_error',req,{code:e.code||'internal'});else if(status>=400)audit('request_denied',req,{status});if(!res.headersSent)send(res,status,{error:status===500?'Kesalahan server. Periksa log Blue Team.':e.message});else res.end();}
 });
 server.requestTimeout=10000;server.headersTimeout=12000;server.keepAliveTimeout=5000;
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const store=await createStore();await store.list('sheep');const server=createApp(store);
 server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(JSON.stringify({event:'server_started',mode:process.env.LAB_MODE,port:process.env.PORT||3000,backend:process.env.DB_BACKEND})));
 const stop=()=>server.close(async()=>{await store.close();process.exit(0);});process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
