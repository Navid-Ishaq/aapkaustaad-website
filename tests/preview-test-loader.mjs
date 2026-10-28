import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
const read=p=>readFileSync(new URL('../supabase/functions/_shared/'+p,import.meta.url),'utf8');const url=s=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64');
export const addressURL=url(read('public-address.ts'));
export function previewModuleUrl({mockTransport=false}={}){const transport=mockTransport?url('export const safePublicFetch=(...args)=>globalThis.fetch(...args);'):url(read('public-fetch.ts').replace("'./public-address.ts'",JSON.stringify(addressURL)));return url(read('link-preview.ts').replace("'./public-address.ts'",JSON.stringify(addressURL)).replace("'./public-fetch.ts'",JSON.stringify(transport)));}
