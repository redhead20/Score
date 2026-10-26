// Flatten handwriting onto a downloadable copy of the original PDF.
export async function exportAnnotated(bytes,notes,filename){
 if(!window.PDFLib)throw Error('PDF export library did not load');
 const doc=await PDFLib.PDFDocument.load(bytes.slice(0));
 for(const [key,strokes] of Object.entries(notes)){
  const index=Number(key)-1;if(!Array.isArray(strokes)||index<0||index>=doc.getPageCount())continue;
  const page=doc.getPage(index),{width,height}=page.getSize();
  for(const stroke of strokes){const points=stroke.points||[],hex=/^#[0-9a-f]{6}$/i.test(stroke.color||'')?stroke.color:'#e53935',color=PDFLib.rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255),thickness=Math.max(1,(Number(stroke.thickness)||3)*width/1000);if(!points.length)continue;
   if(points.length===1){page.drawCircle({x:points[0].x*width,y:(1-points[0].y)*height,size:thickness/2,color});continue}
   for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];page.drawLine({start:{x:a.x*width,y:(1-a.y)*height},end:{x:b.x*width,y:(1-b.y)*height},thickness,color})}
  }
 }
 const output=await doc.save(),blob=new Blob([output],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename.replace(/\.pdf$/i,'')+'-annotated.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
