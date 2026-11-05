"use client";
import Link from "next/link";
import { useState } from "react";
import { AlignmentType,Document as WordDocument,Footer,Header,HeadingLevel,Packer,PageNumber,Paragraph,TextRun } from "docx";
type Content={title?:string;topic?:string;learningObjectives?:string[];sections?:Array<{heading:string;body:string}>;assessmentQuestions?:Array<{question:string;answer?:string;marks?:number}>};
type Doc={id:string;title:string;type:string;subjectName:string|null;className:string|null;topic:string|null;organizationName:string;content:Record<string,unknown>;updatedAt:string};
export default function DocumentEditor({initialDocument}:{initialDocument:Doc}){
 const [doc]=useState(initialDocument);const [content,setContent]=useState<Content>(initialDocument.content as Content);const [title,setTitle]=useState(initialDocument.title);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 const objectives=content.learningObjectives||[];const sections=content.sections||[];const questions=content.assessmentQuestions||[];
 async function save(){setSaving(true);setMessage("");setError("");try{const r=await fetch("/api/documents/"+doc.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,content})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to save document");setMessage("Your changes have been saved.");}catch(e){setError(e instanceof Error?e.message:"Unable to save document");}finally{setSaving(false);}}
 async function exportWord(){
  setError("");setMessage("");
  try{
   const blue="123B75";const children:Paragraph[]=[
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:120},children:[new TextRun({text:"TEACHGENIUS AI",bold:true,color:blue,size:22})]}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:100},children:[new TextRun({text:title,bold:true,color:blue,size:34})]}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:320},children:[new TextRun({text:[doc.subjectName,doc.className,doc.topic].filter(Boolean).join("  |  "),color:"64748B",size:20})]})
   ];
   if(objectives.length){children.push(new Paragraph({text:"LEARNING OBJECTIVES",heading:HeadingLevel.HEADING_1}));objectives.forEach(o=>children.push(new Paragraph({text:o,bullet:{indent:360}})));}
   sections.forEach(s=>{children.push(new Paragraph({text:s.heading,heading:HeadingLevel.HEADING_1,spacing:{before:260,after:100}}));s.body.split(/\n+/).filter(Boolean).forEach(line=>children.push(new Paragraph({text:line,spacing:{after:100,line:360}})));});
   if(questions.length){children.push(new Paragraph({text:"ASSESSMENT QUESTIONS",heading:HeadingLevel.HEADING_1}));questions.forEach((q,i)=>{children.push(new Paragraph({spacing:{before:100,after:60},children:[new TextRun({text:(i+1)+". "+q.question,bold:true})]}));if(q.marks!==undefined)children.push(new Paragraph({text:"Marks: "+q.marks}));if(q.answer)children.push(new Paragraph({children:[new TextRun({text:"Suggested answer: ",bold:true}),new TextRun(q.answer)]}));});}
   const word=new WordDocument({creator:"TeachGenius AI",title,description:"Curriculum-aligned teaching document",styles:{default:{document:{run:{font:"Arial",size:22,color:"24364B"},paragraph:{spacing:{line:340,after:100}}}},paragraphStyles:[{id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",run:{font:"Arial",bold:true,color:blue,size:28},paragraph:{spacing:{before:240,after:100},outlineLevel:0}}]},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,right:1134,bottom:1134,left:1134}}},headers:{default:new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:"TEACHGENIUS AI  |  TEACHING RESOURCE",size:16,color:"8191A5"})]})]})},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:["Page ",PageNumber.CURRENT],size:16,color:"8191A5"})]})]})},children}]});
   const blob=await Packer.toBlob(word);const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(title.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"")||"teaching-document")+".docx";a.click();URL.revokeObjectURL(url);setMessage("Word document exported.");
  }catch(e){setError(e instanceof Error?e.message:"Word export failed");}
 }
 return <main className="tg-shell">
  <header className="tg-topbar no-print"><Link href="/" className="tg-brand"><span className="tg-brand-mark">T</span><span><span className="tg-brand-name">TeachGenius AI</span><span className="tg-brand-sub" style={{display:"block"}}>Document workspace</span></span></Link><div className="tg-top-actions"><Link href="/studio" className="tg-btn tg-btn-secondary">＋ New document</Link><Link href="/" className="tg-btn tg-btn-secondary">Dashboard</Link></div></header>
  <div className="tg-page" style={{maxWidth:1200}}>
   <div className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:20}}><div><div className="tg-eyebrow">Document editor</div><h1 className="tg-heading" style={{fontSize:28}}>Review and export</h1><p className="tg-subtitle">Edit your material, save changes, then export to Word or A4 PDF.</p></div><div style={{display:"flex",gap:9,flexWrap:"wrap"}}><button className="tg-btn tg-btn-secondary" onClick={()=>window.print()}>↓ Export PDF</button><button className="tg-btn tg-btn-secondary" onClick={exportWord}>↓ Export Word</button><button className="tg-btn" onClick={save} disabled={saving}>{saving?"Saving…":"Save changes"}</button></div></div>
   <div className="no-print" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 290px",gap:16,alignItems:"start",marginBottom:18}}>
    <div className="tg-card tg-card-pad" style={{display:"grid",gap:13}}>
     <div className="tg-field"><label className="tg-label" htmlFor="doc-title">Document title</label><input id="doc-title" className="tg-input" value={title} onChange={e=>setTitle(e.target.value)} maxLength={180}/></div>
     <div className="tg-field"><label className="tg-label">Learning objectives (one per line)</label><textarea className="tg-textarea" rows={Math.max(3,objectives.length)} value={objectives.join("\n")} onChange={e=>setContent({...content,learningObjectives:e.target.value.split("\n")})}/></div>
     {sections.map((s,i)=><div className="tg-field" key={i}><label className="tg-label">Section {i+1} heading</label><input className="tg-input" value={s.heading} onChange={e=>setContent({...content,sections:sections.map((x,j)=>j===i?{...x,heading:e.target.value}:x)})}/><label className="tg-label">Section content</label><textarea className="tg-textarea" rows={6} value={s.body} onChange={e=>setContent({...content,sections:sections.map((x,j)=>j===i?{...x,body:e.target.value}:x)})}/></div>)}
     {questions.length>0&&<div className="tg-field"><label className="tg-label">Assessment questions (one per line)</label><textarea className="tg-textarea" rows={Math.max(4,questions.length)} value={questions.map(q=>q.question).join("\n")} onChange={e=>setContent({...content,assessmentQuestions:e.target.value.split("\n").filter(Boolean).map((question,i)=>({...questions[i],question}))})}/></div>}
     {error&&<div className="tg-alert tg-alert-error">{error}</div>}{message&&<div className="tg-alert tg-alert-success">{message}</div>}
    </div>
    <aside className="tg-card tg-card-pad"><h2 className="tg-section-title">Document details</h2><div className="tg-divider"/>{[["Document type",doc.type.replaceAll("_"," ")],["Workspace",doc.organizationName],["Subject",doc.subjectName||"—"],["Class",doc.className||"—"],["Topic",doc.topic||"—"]].map(([k,v])=><div key={k} style={{marginBottom:14}}><div className="tg-eyebrow">{k}</div><div style={{fontSize:13,fontWeight:650,marginTop:4}}>{v}</div></div>)}<div className="tg-divider"/><p className="tg-subtitle">PDF export opens your browser’s print dialog. Choose “Save as PDF” and paper size A4.</p></aside>
   </div>
   <article className="tg-doc-preview" id="print-document"><div style={{textAlign:"center",borderBottom:"3px solid #123b75",paddingBottom:16,marginBottom:22}}><div style={{fontSize:11,fontWeight:800,letterSpacing:".16em",color:"#52739b"}}>TEACHGENIUS AI</div><h1 style={{marginTop:12}}>{title}</h1><p style={{margin:"5px 0",color:"#64748b",fontSize:12}}>{doc.organizationName}</p></div>
    <div className="tg-doc-meta">{[["SUBJECT",doc.subjectName||"—"],["CLASS",doc.className||"—"],["TOPIC",doc.topic||content.topic||"—"]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
    {objectives.length>0&&<><h2>Learning Objectives</h2><ul>{objectives.map((o,i)=><li key={i}>{o}</li>)}</ul></>}
    {sections.map((s,i)=><section key={i}><h2>{s.heading}</h2>{s.body.split(/\n+/).filter(Boolean).map((line,j)=><p key={j}>{line}</p>)}</section>)}
    {questions.length>0&&<><h2>Assessment Questions</h2><ol>{questions.map((q,i)=><li key={i}>{q.question}{q.marks!==undefined?" ("+q.marks+" marks)":""}{q.answer&&<p><strong>Suggested answer:</strong> {q.answer}</p>}</li>)}</ol></>}
    <div style={{marginTop:40,borderTop:"1px solid #dce6f2",paddingTop:12,fontSize:10,color:"#8191a5",display:"flex",justifyContent:"space-between"}}><span>Prepared with TeachGenius AI</span><span>{new Date(doc.updatedAt).toLocaleDateString()}</span></div>
   </article>
  </div>
 </main>;
}
