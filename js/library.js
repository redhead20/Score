// PDFs live in this browser's IndexedDB, not on a server.
const DB='swipe-pdf-library',STORE='documents',FOLDERS='folders';
function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,2);req.onupgradeneeded=()=>{const database=req.result;if(!database.objectStoreNames.contains(STORE))database.createObjectStore(STORE,{keyPath:'id'});if(!database.objectStoreNames.contains(FOLDERS))database.createObjectStore(FOLDERS,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function operation(mode,fn,storeName=STORE){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(storeName,mode),store=tx.objectStore(storeName);let result;try{result=fn(store)}catch(e){database.close();reject(e);return}tx.oncomplete=()=>{database.close();resolve(result?.result)};tx.onerror=()=>{database.close();reject(tx.error)}})}
export const listDocuments=async()=> (await operation('readonly',s=>s.getAll())).sort((a,b)=>(b.lastViewed??0)-(a.lastViewed??0)|| (b.added??0)-(a.added??0));
export const getDocument=id=>operation('readonly',s=>s.get(id));
export const putDocument=doc=>operation('readwrite',s=>s.put(doc));
export async function markDocumentViewed(id){
 const doc=await getDocument(id);
 if(!doc)return;
 doc.lastViewed=Date.now();
 await putDocument(doc);
}
export const deleteDocument=id=>operation('readwrite',s=>s.delete(id));
export const listFolders=async()=> (await operation('readonly',s=>s.getAll(),FOLDERS)).sort((a,b)=>a.name.localeCompare(b.name));
export const addFolder=async name=>{
 const folder={id:'folder-'+Date.now()+'-'+Math.random().toString(36).slice(2),name};
 await operation('readwrite',s=>s.put(folder),FOLDERS);return folder;
};
export const renameFolder=async (id,name)=>{
 const folders=await listFolders(),folder=folders.find(f=>f.id===id);
 if(!folder)throw new Error('Folder not found');
 folder.name=name;await operation('readwrite',s=>s.put(folder),FOLDERS);
};
export const moveDocument=async(id,folderId)=>{
 const doc=await getDocument(id);if(!doc)throw new Error('PDF not found');
 doc.folderId=folderId||null;await putDocument(doc);
};
export const removeFolder=async id=>{
 // Move contents to All Scores first; never delete a PDF when deleting a folder.
 const docs=await listDocuments();
 for(const doc of docs.filter(d=>d.folderId===id)){doc.folderId=null;await putDocument(doc)}
 await operation('readwrite',s=>s.delete(id),FOLDERS);
};

export async function thumbnail(bytes){const doc=await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise;try{const page=await doc.getPage(1),v=page.getViewport({scale:1}),scale=Math.min(220/v.width,300/v.height),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;return canvas.toDataURL('image/jpeg',.8)}finally{await doc.destroy()}}
