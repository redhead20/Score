// PDFs live in this browser's IndexedDB, not on a server.
const DB='swipe-pdf-library',STORE='documents';
function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function operation(mode,fn){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(STORE,mode),store=tx.objectStore(STORE);let result;try{result=fn(store)}catch(e){database.close();reject(e);return}tx.oncomplete=()=>{database.close();resolve(result?.result)};tx.onerror=()=>{database.close();reject(tx.error)}})}
export const listDocuments=async()=> (await operation('readonly',s=>s.getAll())).sort((a,b)=>b.added-a.added);
export const getDocument=id=>operation('readonly',s=>s.get(id));
export const putDocument=doc=>operation('readwrite',s=>s.put(doc));
export const deleteDocument=id=>operation('readwrite',s=>s.delete(id));
export async function thumbnail(bytes){const doc=await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise;try{const page=await doc.getPage(1),v=page.getViewport({scale:1}),scale=Math.min(220/v.width,300/v.height),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;return canvas.toDataURL('image/jpeg',.8)}finally{await doc.destroy()}}
