export class PDFViewer {
 constructor({stage,sheet,canvas,annotations,onPage,onReady}){this.stage=stage;this.sheet=sheet;this.canvas=canvas;this.ctx=canvas.getContext('2d');this.annotations=annotations;this.onPage=onPage;this.onReady=onReady;this.doc=null;this.page=1;this.zoom=1;this.serial=0;this.running=false;this.pending=false;this.activeRender=null;this.focus=null;}
 async open(bytes,page=1){const serial=++this.serial;const doc=await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise;if(serial!==this.serial){await doc.destroy();return}if(this.doc)await this.doc.destroy();this.doc=doc;this.page=Math.max(1,Math.min(doc.numPages,page));this.zoom=1;this.stage.scrollTo(0,0);this.sheet.hidden=false;this.onReady(doc.numPages);await this.render()}
 async close(){++this.serial;const doc=this.doc;this.doc=null;this.sheet.hidden=true;this.page=1;this.zoom=1;this.focus=null;this.stage.scrollTo(0,0);if(this.activeRender)try{this.activeRender.cancel()}catch{};if(doc)try{await doc.destroy()}catch{}}
 async render(){if(!this.doc)return;if(this.running){this.pending=true;if(this.activeRender)try{this.activeRender.cancel()}catch{};return}this.running=true;const serial=this.serial,doc=this.doc,number=this.page;try{const page=await doc.getPage(number);if(serial!==this.serial||doc!==this.doc)return;const base=page.getViewport({scale:1}),style=getComputedStyle(this.stage);const w=Math.max(1,this.stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),h=Math.max(1,this.stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom));// Use the complete viewport, without artificial padding or toolbar subtraction.
// Preserve PDF aspect ratio so no music is stretched or cropped.
const fit=Math.min(w/base.width,h/base.height),cssW=base.width*fit*this.zoom,cssH=base.height*fit*this.zoom,dpr=Math.min(devicePixelRatio||1,2);this.sheet.style.width=cssW+'px';this.sheet.style.height=cssH+'px';this.applyFocus();const viewport=page.getViewport({scale:fit*this.zoom*dpr});this.canvas.width=Math.round(viewport.width);this.canvas.height=Math.round(viewport.height);this.activeRender=page.render({canvasContext:this.ctx,viewport});await this.activeRender.promise;if(serial!==this.serial||doc!==this.doc||number!==this.page)return;this.annotations.setPage(number);this.annotations.resize(this.canvas.width,this.canvas.height);this.onPage(number,doc.numPages)}catch(e){if(e?.name!=='RenderingCancelledException')console.error('PDF render error',e)}finally{this.activeRender=null;this.running=false;if(this.pending){this.pending=false;this.render()}}}
 go(delta){if(!this.doc||this.annotations.active)return;const next=Math.max(1,Math.min(this.doc.numPages,this.page+delta));if(next===this.page)return;this.page=next;this.focus=null;this.stage.scrollTo(0,0);this.render()}
 applyFocus(){if(!this.focus)return;const f=this.focus;this.focus=null;
  // Preserve the point under the pinch center / viewport center as zoom changes.
  const rect=this.sheet.getBoundingClientRect(),stageRect=this.stage.getBoundingClientRect();
  const px=rect.left+f.u*rect.width,py=rect.top+f.v*rect.height;
  this.stage.scrollLeft+=px-f.x;this.stage.scrollTop+=py-f.y;
 }
 setZoom(zoom,anchor){if(!this.doc)return;
  const stageRect=this.stage.getBoundingClientRect(),rect=this.sheet.getBoundingClientRect();
  const x=anchor?.x??(stageRect.left+stageRect.width/2),y=anchor?.y??(stageRect.top+stageRect.height/2);
  this.focus={x,y,u:Math.max(0,Math.min(1,(x-rect.left)/Math.max(rect.width,1))),v:Math.max(0,Math.min(1,(y-rect.top)/Math.max(rect.height,1)))};
  this.zoom=zoom;this.render();
 }
}
