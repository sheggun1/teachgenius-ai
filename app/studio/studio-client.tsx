"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Workspace = { id:string; name:string; type:string; role:string };
type Topic = { id:string; topic:string; subtopic?:string|null; term?:string|null; week?:string|null; curriculumTitle:string; subjectName?:string|null; className?:string|null };
type Curriculum = { id:string; title:string; subjectName?:string|null; className?:string|null; status:string; versions:Array<{topics:Array<{id:string;topic:string;subtopic?:string|null;term?:string|null;week?:string|null}>}> };
const types=[["LESSON_NOTE","Lesson note"],["LESSON_PLAN","Lesson plan"],["QUIZ","Quiz"],["ASSIGNMENT","Assignment"],["EXAMINATION","Examination"],["REVISION_NOTE","Revision note"]];

export default function StudioClient({displayName}:{displayName:string}) {
  const router=useRouter();
  const [workspaces,setWorkspaces]=useState<Workspace[]>([]);
  const [workspaceId,setWorkspaceId]=useState("");
  const [topics,setTopics]=useState<Topic[]>([]);
  const [topicId,setTopicId]=useState("");
  const [type,setType]=useState("LESSON_NOTE");
  const [title,setTitle]=useState("");
  const [instructions,setInstructions]=useState("");
  const [loading,setLoading]=useState(false);
  const [loadingTopics,setLoadingTopics]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/workspaces").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load workspaces");setWorkspaces(d.workspaces||[]);if(d.workspaces?.length)setWorkspaceId(d.workspaces[0].id);}).catch(e=>setError(e.message));
  },[]);
  useEffect(()=>{
    if(!workspaceId){setTopics([]);return;}
    let active=true;setLoadingTopics(true);setError("");setTopicId("");
    fetch("/api/workspaces/"+workspaceId+"/curricula").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load curriculum");
      const list:Topic[]=(d.curricula||[]).filter((c:Curriculum)=>c.status==="PUBLISHED").flatMap((c:Curriculum)=>(c.versions?.[0]?.topics||[]).map(t=>({...t,curriculumTitle:c.title,subjectName:c.subjectName,className:c.className})));
      if(active)setTopics(list);
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoadingTopics(false);});
    return()=>{active=false;};
  },[workspaceId]);
  const selectedTopic=useMemo(()=>topics.find(t=>t.id===topicId),[topics,topicId]);

  async function generate(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");
    if(!workspaceId||!topicId){setError("Choose a workspace and an approved curriculum topic.");return;}
    setLoading(true);
    try{
      const response=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:workspaceId,curriculumTopicId:topicId,type,title:title.trim()||undefined,additionalInstructions:instructions.trim()||undefined})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Document generation failed");
      router.push("/documents/"+data.document.id);router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Unable to generate document");}
    finally{setLoading(false);}
  }

  return <main className="tg-shell">
    <header className="tg-topbar"><Link href="/" className="tg-brand"><span className="tg-brand-mark">T</span><span><span className="tg-brand-name">TeachGenius AI</span><span className="tg-brand-sub" style={{display:"block"}}>Teaching and learning workspace</span></span></Link><div className="tg-top-actions"><Link className="tg-btn tg-btn-secondary" href="/">← Dashboard</Link></div></header>
    <div className="tg-page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:20,flexWrap:"wrap",marginBottom:26}}><div><div className="tg-eyebrow">AI-powered teaching resources</div><h1 className="tg-heading">Document Studio</h1><p className="tg-subtitle">Create curriculum-aligned resources, refine the content, and export polished Word or PDF documents.</p></div><div className="tg-card" style={{padding:"12px 16px"}}><div className="tg-eyebrow">Signed in as</div><strong style={{display:"block",marginTop:5}}>{displayName}</strong></div></div>
      <div className="tg-grid" style={{gridTemplateColumns:"minmax(0,1.2fr) minmax(260px,.8fr)",alignItems:"start"}}>
        <form className="tg-card tg-card-pad" onSubmit={generate} style={{display:"grid",gap:19}}>
          <div><h2 className="tg-section-title">Build a new teaching document</h2><p className="tg-subtitle" style={{marginTop:6}}>Select from the school’s published curriculum. AI generation remains restricted to approved topics.</p></div>
          {error&&<div className="tg-alert tg-alert-error" role="alert">{error}</div>}
          <div className="tg-field"><label className="tg-label" htmlFor="workspace">Workspace</label><select className="tg-select" id="workspace" value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)} required><option value="">Select workspace</option>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name} · {w.role.replaceAll("_"," ")}</option>)}</select></div>
          <div className="tg-field"><label className="tg-label" htmlFor="doctype">Document type</label><select className="tg-select" id="doctype" value={type} onChange={e=>setType(e.target.value)}>{types.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>
          <div className="tg-field"><label className="tg-label" htmlFor="topic">Approved curriculum topic</label><select className="tg-select" id="topic" value={topicId} onChange={e=>setTopicId(e.target.value)} disabled={loadingTopics||!topics.length} required><option value="">{loadingTopics?"Loading curriculum…":topics.length?"Choose a published topic":"No published topics available"}</option>{topics.map(t=><option key={t.id} value={t.id}>{[t.subjectName,t.className,t.topic,t.week?"Week "+t.week:null].filter(Boolean).join(" · ")}</option>)}</select><small style={{color:"#7b8ba1"}}>{topics.length} approved topic(s) available in this workspace.</small></div>
          <div className="tg-field"><label className="tg-label" htmlFor="title">Document title <span style={{fontWeight:400,color:"#8493a7"}}>(optional)</span></label><input className="tg-input" id="title" maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Introduction to Cell Structure"/></div>
          <div className="tg-field"><label className="tg-label" htmlFor="instructions">Additional teaching instructions <span style={{fontWeight:400,color:"#8493a7"}}>(optional)</span></label><textarea className="tg-textarea" id="instructions" rows={4} maxLength={2000} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Specify teaching approach, learner level, examples or assessment style…"/></div>
          {selectedTopic&&<div className="tg-alert tg-alert-info">Selected curriculum: <strong>{selectedTopic.curriculumTitle}</strong>{selectedTopic.subtopic?" · "+selectedTopic.subtopic:""}</div>}
          <button className="tg-btn" type="submit" disabled={loading||!workspaceId||!topicId}>{loading?"Generating your document…":"✦ Generate document"}</button>
        </form>
        <aside className="tg-grid">
          <div className="tg-card tg-card-pad"><div style={{width:42,height:42,borderRadius:13,background:"#edf4ff",color:"#155eef",display:"grid",placeItems:"center",fontSize:20}}>✦</div><h2 className="tg-section-title" style={{marginTop:16}}>Curriculum-led AI</h2><p className="tg-subtitle" style={{marginTop:8}}>Documents are grounded in the approved subject, class, term, week, topic and learning objectives selected above.</p></div>
          <div className="tg-card tg-card-pad"><h2 className="tg-section-title">Professional exports</h2><p className="tg-subtitle" style={{marginTop:8}}>Every saved document can be downloaded as an editable Microsoft Word file or printed to a clean A4 PDF.</p><div className="tg-divider"/><div style={{display:"flex",gap:9,flexWrap:"wrap"}}><span className="tg-btn tg-btn-quiet">.DOCX</span><span className="tg-btn tg-btn-quiet">PDF / A4</span></div></div>
          <div className="tg-card tg-card-pad"><h2 className="tg-section-title">Workflow</h2><ol style={{paddingLeft:19,color:"#64748b",fontSize:13,lineHeight:1.9,marginBottom:0}}><li>Choose an active workspace.</li><li>Select a published curriculum topic.</li><li>Review and edit the generated material.</li><li>Export a final copy for classroom use.</li></ol></div>
        </aside>
      </div>
    </div>
  </main>;
}
