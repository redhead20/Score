import {documentKey,readJSON,writeJSON} from './storage.js';
import {Annotations} from './annotations.js';
import {PDFViewer} from './pdf-viewer.js';
import {Zoom} from './zoom.js';
import {exportAnnotated} from './export.js';
import {listDocuments,getDocument,putDocument,markDocumentViewed,deleteDocument,thumbnail,listFolders,addFolder,renameFolder,moveDocument,removeFolder} from './library.js';
const $=id=>document.getElementById(id);
const stage=$('stage'),sheet=$('sheet'),toolbar=$('toolbar'),info=$('pageInfo'),toggle=$('toolsToggle');
let toolsOpen=false;
function setTools(open){toolsOpen=!!open;toolbar.classList.toggle('collapsed',!toolsOpen);toggle.setAttribute('aria-expanded',String(toolsOpen));toggle.textContent=toolsOpen?'✕ Hide tools':'✎ Tools';toggle.setAttribute('aria-label',toolsOpen?'Hide drawing toolbar':'Show drawing toolbar')}
toggle.onclick=()=>setTools(!toolsOpen);
function updateHistory(){ $('undoBtn').disabled=!annotations.getStrokes().length;$('redoBtn').disabled=!annotations.canRedo() }

let source=null,filename='',key='',wake=null,flashTimer=null,loadVersion=0;
let activeFolder=null;
const annotations=new Annotations($('inkCanvas'),sheet,()=>{if(key)writeJSON(key+':notes',annotations.notes);updateHistory()});
const viewer=new PDFViewer({stage,sheet,canvas:$('pdfCanvas'),annotations,onReady:()=>{},onPage:(n,total)=>{info.textContent=`${n} / ${total}`;if(key)writeJSON(key+':page',n);updateHistory()}});
let zoomAnchor=null;const zoom=new Zoom(value=>{viewer.setZoom(value,zoomAnchor);zoomAnchor=null;$('zoomValue').textContent=Math.round(value*100)+'%';$('zoomDial').value=Math.round(value*100);showControls()});
function showControls(pageOnly=false){info.classList.remove('collapsed');clearTimeout(flashTimer);flashTimer=setTimeout(()=>info.classList.add('collapsed'),3500)}
function pick(){$('file').click()}
$('openBtn').onclick=pick;$('openAnother').onclick=pick;
async function requestWake(){try{if('wakeLock'in navigator)wake=await navigator.wakeLock.request('screen')}catch{}}
async function close(){++loadVersion;await viewer.close();source=null;filename='';key='';annotations.active=null;annotations.pointer=null;annotations.setEnabled(false);annotations.setNotes({});zoom.value=1;$('zoomValue').textContent='100%';$('zoomDial').value=100;$('drawBtn').classList.remove('selected');$('drawBtn').setAttribute('aria-pressed','false');$('drawBtn').textContent='✎ Draw';toolbar.hidden=true;toggle.hidden=true;$('closeBtn').hidden=true;setTools(false);info.hidden=true;$('welcome').hidden=false;clearTimeout(flashTimer);try{await wake?.release()}catch{}wake=null;await renderLibrary()}
$('closeBtn').onclick=close;
async function openDocument(bytes,name,docKey){
 const version=++loadVersion;
 try{
  const page=readJSON(docKey+':page',1),notes=readJSON(docKey+':notes',{});
  await viewer.open(bytes,page);if(version!==loadVersion)return;
  source=bytes;filename=name;key=docKey;annotations.setNotes(notes);annotations.setPage(viewer.page);annotations.setEnabled(false);
  zoom.value=1;$('zoomValue').textContent='100%';$('zoomDial').value=100;
  $('drawBtn').classList.remove('selected');$('drawBtn').setAttribute('aria-pressed','false');$('drawBtn').textContent='✎ Draw';
  $('title').textContent=name.replace(/\\.pdf$/i,'');$('welcome').hidden=true;toolbar.hidden=false;toggle.hidden=false;$('closeBtn').hidden=false;
  setTools(false);updateHistory();info.hidden=false;info.textContent=`${viewer.page} / ${viewer.doc.numPages}`;
  viewer.render();showControls();requestWake();
  try{await markDocumentViewed(docKey)}catch(e){console.warn('Could not save recent viewing order',e)}
 }catch(err){console.error(err);alert('Could not open this PDF. Please try another file.')}
}
async function renderLibrary(){
 const grid=$('libraryGrid'),status=$('libraryStatus'),nav=$('folderNav');
 grid.replaceChildren();nav.replaceChildren();
 grid.parentElement.querySelectorAll('.folder-heading').forEach(e=>e.remove());
 try{
  const [docs,folders]=await Promise.all([listDocuments(),listFolders()]);
  if(activeFolder!==null&&!folders.some(f=>f.id===activeFolder))activeFolder=null;
  const navButton=(name,id,count)=>{
   const b=document.createElement('button');b.type='button';b.textContent=`${name} (${count})`;
   b.classList.toggle('active',activeFolder===id);b.setAttribute('aria-current',activeFolder===id?'page':'false');
   b.onclick=()=>{activeFolder=id;renderLibrary()};nav.append(b);
  };
  navButton('All Scores',null,docs.length);
  for(const folder of folders)navButton('📁 '+folder.name,folder.id,docs.filter(d=>d.folderId===folder.id).length);
  const selected=folders.find(f=>f.id===activeFolder);
  if(selected){
   const heading=document.createElement('div');heading.className='folder-heading';
   const title=document.createElement('h2');title.textContent='📁 '+selected.name;
   const rename=document.createElement('button');rename.textContent='Rename Folder';
   rename.onclick=async()=>{
    const value=prompt('New folder name:',selected.name);if(value===null)return;
    const name=value.trim();if(!name)return alert('Enter a folder name.');
    if(folders.some(f=>f.id!==selected.id&&f.name.toLowerCase()===name.toLowerCase()))return alert('A folder with that name already exists.');
    try{await renameFolder(selected.id,name);await renderLibrary()}catch(e){alert('Could not rename folder.')}
   };
   const del=document.createElement('button');del.textContent='Delete Folder';
   del.onclick=async()=>{
    if(!confirm(`Delete folder "${selected.name}"? Its PDFs will be moved to All Scores, not deleted.`))return;
    try{await removeFolder(selected.id);activeFolder=null;await renderLibrary()}catch(e){alert('Could not delete folder.')}
   };
   heading.append(title,rename,del);grid.before(heading);
  }
  const visible=activeFolder===null?docs:docs.filter(d=>d.folderId===activeFolder);
  status.textContent=visible.length?`${visible.length} score${visible.length===1?'':'s'} · Most recently viewed first`:'No scores here yet. Use Move to Folder on a score to organize it.';
  for(const doc of visible){
   const card=document.createElement('article');card.className='library-card';
   const open=document.createElement('button');open.className='library-open';open.type='button';open.setAttribute('aria-label',`Open ${doc.name}`);
   if(doc.preview){const img=document.createElement('img');img.src=doc.preview;img.alt=`First page of ${doc.name}`;open.append(img)}
   else{const placeholder=document.createElement('div');placeholder.className='library-placeholder';placeholder.textContent='📄';open.append(placeholder)}
   open.onclick=async()=>{const saved=await getDocument(doc.id);if(saved)await openDocument(saved.bytes,saved.name,saved.id)};
   const meta=document.createElement('div');meta.className='library-meta';
   const name=document.createElement('span');name.className='library-name';name.textContent=doc.name;name.title=doc.name;
   const actions=document.createElement('div');actions.className='library-actions';
   const save=document.createElement('button');save.textContent='Save PDF';save.onclick=async()=>{save.disabled=true;save.textContent='Saving…';try{const saved=await getDocument(doc.id);await exportAnnotated(saved.bytes,readJSON(doc.id+':notes',{}),saved.name)}catch(e){console.error(e);alert('Unable to save this PDF.')}finally{save.disabled=false;save.textContent='Save PDF'}};
   const move=document.createElement('button');move.className='move';move.textContent='Move to Folder';
   move.onclick=async()=>{
    const choices=['0 — All Scores (no folder)',...folders.map((f,i)=>`${i+1} — ${f.name}`)];
    const choice=prompt(`Move "${doc.name}" to which folder?\\n\\n${choices.join('\\n')}\\n\\nEnter a number:`,String(Math.max(0,folders.findIndex(f=>f.id===doc.folderId)+1)));
    if(choice===null)return;
    const number=Number(choice.trim());
    if(!Number.isInteger(number)||number<0||number>folders.length||!choice.trim())return alert('Enter one of the listed folder numbers.');
    try{await moveDocument(doc.id,number===0?null:folders[number-1].id);await renderLibrary()}catch(e){console.error(e);alert('Could not move the PDF.')}
   };
   const remove=document.createElement('button');remove.className='delete';remove.textContent='Remove';remove.onclick=async()=>{if(!confirm(`Remove "${doc.name}" from this device?`))return;await deleteDocument(doc.id);await renderLibrary()};
   actions.append(save,move,remove);meta.append(name,actions);card.append(open,meta);grid.append(card);
  }
 }catch(e){console.error(e);status.textContent='Library unavailable. Check browser storage permissions.'}
}
$('newFolderBtn').onclick=async()=>{
 const value=prompt('Name your new folder:');if(value===null)return;
 const name=value.trim();if(!name)return alert('Enter a folder name.');
 try{
  const folders=await listFolders();
  if(folders.some(f=>f.name.toLowerCase()===name.toLowerCase()))return alert('A folder with that name already exists.');
  const folder=await addFolder(name);activeFolder=folder.id;await renderLibrary();
 }catch(e){console.error(e);alert('Could not create folder.')}
};
$('file').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 const status=$('libraryStatus');status.textContent='Importing PDF…';
 try{
  const bytes=await file.arrayBuffer(),id=documentKey(file);
  let preview='';try{preview=await thumbnail(bytes)}catch(e){console.warn('Thumbnail unavailable',e)}
  const previous=await getDocument(id);
  await putDocument({id,name:file.name,bytes,preview,added:previous?.added??Date.now(),lastViewed:previous?.lastViewed??0,folderId:previous?.folderId??activeFolder??null});
  await renderLibrary();await openDocument(bytes,file.name,id);
 }catch(e){console.error(e);status.textContent='Import failed. Your device may be out of storage.';alert('Unable to import PDF.')}
});
renderLibrary();
$('zoomDial').addEventListener('input',e=>zoom.set(Number(e.target.value)/100));$('zoomIn').onclick=()=>zoom.in();$('zoomOut').onclick=()=>zoom.out();$('fitBtn').onclick=()=>zoom.fit();
let penColor='#e53935',penSize=3;annotations.setPen(penColor,penSize);
$('penSize').addEventListener('input',e=>{penSize=Number(e.target.value);$('penSizeValue').textContent=penSize;annotations.setPen(penColor,penSize)});
document.querySelectorAll('.swatch').forEach(btn=>btn.addEventListener('click',()=>{penColor=btn.dataset.color;annotations.setPen(penColor,penSize);document.querySelectorAll('.swatch').forEach(b=>{b.classList.toggle('chosen',b===btn);b.setAttribute('aria-pressed',String(b===btn))})}));
$('drawBtn').onclick=()=>{annotations.setEnabled(!annotations.enabled);$('drawBtn').classList.toggle('selected',annotations.enabled);$('drawBtn').setAttribute('aria-pressed',String(annotations.enabled));$('drawBtn').textContent=annotations.enabled?'✓ Drawing':'✎ Draw';showControls()};
$('undoBtn').onclick=()=>{annotations.undo();showControls()};$('redoBtn').onclick=()=>{annotations.redo();showControls()};$('clearBtn').onclick=()=>{if(annotations.getStrokes().length&&confirm('Erase notes on this page?'))annotations.clear()};

stage.addEventListener('click',e=>{if(!viewer.doc||annotations.enabled||e.target.closest('button'))return;if(!sheet.contains(e.target))return;if(zoom.value>1.01){showControls();return}const x=e.clientX/window.innerWidth;if(x>.7)viewer.go(1);else if(x<.3)viewer.go(-1);else setTools(!toolsOpen);showControls(true)});
window.addEventListener('keydown',e=>{if(!viewer.doc||e.target.matches('input,textarea'))return;if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();viewer.go(1);showControls(true)}else if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();viewer.go(-1);showControls(true)}else if(e.key==='Escape')close()});
window.addEventListener('resize',()=>viewer.render());window.addEventListener('orientationchange',()=>setTimeout(()=>viewer.render(),250));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&viewer.doc)requestWake()});

// Two-finger pinch, including while the drawing tool is active.
let pinch=null,ignoreTapUntil=0;
const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
stage.addEventListener('touchstart',e=>{
 if(!viewer.doc||e.touches.length!==2)return;
 annotations.cancelStroke();const [a,b]=e.touches;
 pinch={distance:Math.max(1,distance(a,b)),zoom:zoom.value};sheet.classList.add('pinching');ignoreTapUntil=Date.now()+500;e.preventDefault();
},{capture:true,passive:false});
stage.addEventListener('touchmove',e=>{
 if(!pinch)return;if(e.touches.length<2)return;
 zoomAnchor={x:(e.touches[0].clientX+e.touches[1].clientX)/2,y:(e.touches[0].clientY+e.touches[1].clientY)/2};zoom.set(pinch.zoom*distance(e.touches[0],e.touches[1])/pinch.distance);
 ignoreTapUntil=Date.now()+500;e.preventDefault();
},{capture:true,passive:false});
const endPinch=e=>{if(pinch&&e.touches.length<2){pinch=null;sheet.classList.remove('pinching');ignoreTapUntil=Date.now()+500}};
stage.addEventListener('touchend',endPinch,true);stage.addEventListener('touchcancel',endPinch,true);
stage.addEventListener('click',e=>{if(Date.now()<ignoreTapUntil){e.stopImmediatePropagation();e.preventDefault()}},true);
