CREATE TABLE IF NOT EXISTS public.kabita_lab_records (
 kind text NOT NULL CHECK (kind IN ('sheep','growth','readings')),
 id text NOT NULL,
 owner_id text NOT NULL,
 data jsonb NOT NULL CHECK (jsonb_typeof(data)='object'),
 PRIMARY KEY(kind,id)
);
CREATE INDEX IF NOT EXISTS kabita_records_owner ON public.kabita_lab_records(kind,owner_id);
INSERT INTO public.kabita_lab_records(kind,id,owner_id,data) VALUES
 ('sheep','sheep-a','farm-a','{"name":"Aruna","breed":"Garut","sex":"betina","ear_tag":"KBT-001","barn":"Kandang A","health":"Sehat","synthetic":true}'),
 ('sheep','sheep-b','farm-b','{"name":"Banyu","breed":"Merino","sex":"jantan","ear_tag":"KBT-002","barn":"Kandang B","health":"Sehat","synthetic":true}'),
 ('sheep','sheep-c','farm-a','{"name":"Cemara","breed":"Texel","sex":"betina","ear_tag":"KBT-003","barn":"Kandang A","health":"Sehat","synthetic":true}'),
 ('growth','growth-1','farm-a','{"sheep_id":"sheep-a","date":"2026-07-12","weight":28.2,"notes":"Data sintetis"}'),
 ('growth','growth-2','farm-a','{"sheep_id":"sheep-a","date":"2026-08-12","weight":32.5,"notes":"Data sintetis"}'),
 ('growth','growth-3','farm-a','{"sheep_id":"sheep-a","date":"2026-09-12","weight":36.8,"notes":"Data sintetis"}'),
 ('growth','growth-4','farm-a','{"sheep_id":"sheep-a","date":"2026-10-12","weight":40.6,"notes":"Data sintetis"}'),
 ('growth','growth-b1','farm-b','{"sheep_id":"sheep-b","date":"2026-09-12","weight":30.1,"notes":"Data sintetis"}'),
 ('growth','growth-b2','farm-b','{"sheep_id":"sheep-b","date":"2026-10-12","weight":34.4,"notes":"Data sintetis"}')
ON CONFLICT(kind,id) DO NOTHING;
