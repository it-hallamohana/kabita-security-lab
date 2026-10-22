import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.mjs';

async function fixture(mode){
 const records=[{kind:'sheep',id:'sheep-a',owner_id:'farm-a',data:{name:'Aruna'}},{kind:'sheep',id:'sheep-b',owner_id:'farm-b',data:{name:'Banyu'}}];
 const store={async list(kind){return records.filter(r=>r.kind===kind);},async get(kind,id){return records.find(r=>r.kind===kind&&r.id===id)||null;},async put(row){const i=records.findIndex(r=>r.kind===row.kind&&r.id===row.id);if(i>=0)records[i]=row;else records.push(row);return row;}};
 const logs=[];const server=createApp(store,{LAB_MODE:mode,LAB_ACK:'ISOLATED_DUMMY_ONLY',ADMIN_PASSWORD:'admin-strong-password-test',OPERATOR_PASSWORD:'operator-strong-password-test',DEVICE_TOKEN:'device-strong-token-test',DB_BACKEND:'postgres'},line=>logs.push(JSON.parse(line)));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const req=(path,{method='GET',body,cookie,headers={}}={})=>fetch(base+'/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});
 const login=async(email='peternak.a@kabita.lab',password='operator-strong-password-test')=>{const r=await req('/login',{method:'POST',body:{email,password}});return {response:r,cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 return {req,login,logs,records,async close(){server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
for(const mode of ['vulnerable','hardened']){
 test(`${mode}: same attack requests prove V01–V04`,async()=>{
  const f=await fixture(mode);try{
   const weak=await f.login('legacy@kabita.lab','kabita123');assert.equal(weak.response.status,mode==='vulnerable'?200:401);
   const a=await f.login();assert.equal(a.response.status,200);assert.match(a.response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
   const own=await f.req('/sheep/sheep-a',{cookie:a.cookie});assert.equal(own.status,200);
   const other=await f.req('/sheep/sheep-b',{cookie:a.cookie});assert.equal(other.status,mode==='vulnerable'?200:404);
   const sensor=await f.req('/ingest',{method:'POST',body:{device_id:'sensor-a',value:44.2}});assert.equal(sensor.status,mode==='vulnerable'?201:401);
   const debug=await f.req('/debug/export');assert.equal(debug.status,mode==='vulnerable'?200:401);
   assert.ok(f.logs.some(x=>x.event==='login_success'));
   assert.ok(f.logs.some(x=>x.event===(mode==='vulnerable'?'sheep_detail':'object_access_denied')));
   assert.ok(f.logs.every(x=>!JSON.stringify(x).includes('strong-password')));
  }finally{await f.close();}
 });
 test(`${mode}: normal boundaries remain enforced`,async()=>{
  const f=await fixture(mode);try{
   assert.equal((await f.req('/sheep')).status,401);
   const a=await f.login();const list=await f.req('/sheep',{cookie:a.cookie});assert.equal((await list.json()).length,1);
   assert.equal((await f.req('/blue/status',{cookie:a.cookie})).status,403);
   assert.equal((await f.req('/growth',{method:'POST',cookie:a.cookie,body:{sheep_id:'sheep-b',date:'2026-01-01',weight:30}})).status,404);
   assert.equal((await f.req('/growth',{method:'POST',cookie:a.cookie,body:{sheep_id:'sheep-a',date:'2026-02-31',weight:30}})).status,400);
   assert.equal((await f.req('/ingest',{method:'POST',headers:{'x-device-token':'device-strong-token-test'},body:{device_id:'sensor-a',value:999}})).status,400);
   assert.equal((await f.req('/ingest',{method:'POST',headers:{'x-device-token':'device-strong-token-test'},body:{device_id:'sensor-a',value:36.2}})).status,201);
   const create=await f.req('/sheep',{method:'POST',cookie:a.cookie,body:{name:'Domba Uji',breed:'Texel',sex:'betina',owner_id:'farm-b',role:'admin'}});assert.equal(create.status,201);assert.equal((await create.json()).owner_id,'farm-a');
   const blocked=await f.req('/growth',{method:'POST',cookie:a.cookie,headers:{Origin:'https://evil.example'},body:{sheep_id:'sheep-a',weight:30,date:'2026-01-01'}});assert.equal(blocked.status,403);
   await f.req('/logout',{method:'POST',body:{},cookie:a.cookie});assert.equal((await f.req('/me',{cookie:a.cookie})).status,401);
   const health=await f.req('/health');assert.equal(health.headers.get('x-frame-options'),'DENY');assert.ok(health.headers.get('content-security-policy'));
  }finally{await f.close();}
 });
}
test('login attempts are bounded',async()=>{const f=await fixture('hardened');try{let r;for(let i=0;i<11;i++)r=(await f.login('nobody@kabita.lab','wrong')).response;assert.equal(r.status,429);}finally{await f.close();}});
test('unsafe startup configuration is refused',()=>{assert.throws(()=>createApp({}, {LAB_MODE:'vulnerable'}),/LAB_ACK/);assert.throws(()=>createApp({}, {LAB_MODE:'hardened'}),/ADMIN_PASSWORD/);});
