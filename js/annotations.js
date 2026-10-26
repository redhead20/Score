export class Annotations {
 constructor(canvas,sheet,onChange){this.canvas=canvas;this.sheet=sheet;this.ctx=canvas.getContext('2d');this.onChange=onChange;this.notes={};this.page=1;this.active=null;this.pointer=null;this.enabled=false;this.redoStacks={};this.color="#e53935";this.thickness=3;
 canvas.addEventListener('pointerdown',e=>this.start(e));canvas.addEventListener('pointermove',e=>this.move(e));canvas.addEventListener('pointerup',e=>this.end(e));canvas.addEventListener('pointercancel',e=>this.end(e));}
 setPen(color,size){this.color=color;this.thickness=size}
 cancelStroke(){this.active=null;this.pointer=null;this.redraw()}
 setEnabled(value){this.enabled=value;this.sheet.classList.toggle('drawing',value)}
 setNotes(notes){this.redoStacks={};this.notes=notes&&typeof notes==='object'?notes:{};this.redraw()}
 setPage(page){this.page=page;this.redraw()}
 getStrokes(page=this.page){return Array.isArray(this.notes[page])?this.notes[page]:[]}
 resize(width,height){this.canvas.width=width;this.canvas.height=height;this.redraw()}
 point(e){const r=this.canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}}
 start(e){if(!this.enabled||this.pointer!==null||e.pointerType==='touch')return;this.pointer=e.pointerId;this.active={color:this.color,thickness:this.thickness,points:[this.point(e)]};this.canvas.setPointerCapture(e.pointerId);this.redraw();e.preventDefault()}
 move(e){if(e.pointerId!==this.pointer||!this.active)return;this.active.points.push(this.point(e));this.redraw();e.preventDefault()}
 end(e){if(e.pointerId!==this.pointer)return;if(this.active){this.active.points.push(this.point(e));this.notes[this.page]=[...this.getStrokes(),this.active];this.redoStacks[this.page]=[];this.onChange()}this.active=null;this.pointer=null;this.redraw()}
 undo(){const lines=this.getStrokes();if(!lines.length)return;this.redoStacks[this.page]??=[];this.redoStacks[this.page].push(lines[lines.length-1]);this.notes[this.page]=lines.slice(0,-1);this.redraw();this.onChange()}
 canRedo(){return !!this.redoStacks[this.page]?.length}
 redo(){const stack=this.redoStacks[this.page];if(!stack?.length)return;this.notes[this.page]=[...this.getStrokes(),stack.pop()];this.redraw();this.onChange()}
 clear(){if(!this.getStrokes().length)return;this.redoStacks[this.page]=[];this.notes[this.page]=[];this.redraw();this.onChange()}
 paint(stroke){const pts=stroke.points;if(!Array.isArray(pts)||!pts.length)return;const c=this.ctx,w=this.canvas.width,h=this.canvas.height;c.strokeStyle=stroke.color||'#e53935';c.fillStyle=c.strokeStyle;c.lineWidth=Math.max(1,(Number(stroke.thickness)||3)*w/1000);c.lineCap='round';c.lineJoin='round';if(pts.length===1){c.beginPath();c.arc(pts[0].x*w,pts[0].y*h,c.lineWidth/2,0,2*Math.PI);c.fill();return}c.beginPath();c.moveTo(pts[0].x*w,pts[0].y*h);for(const p of pts.slice(1))c.lineTo(p.x*w,p.y*h);c.stroke()}
 redraw(){this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);for(const stroke of this.getStrokes())this.paint(stroke);if(this.active)this.paint(this.active)}
}
