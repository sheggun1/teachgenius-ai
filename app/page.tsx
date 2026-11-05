import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import LogoutButton from "@/app/components/logout-button";

export default async function HomePage(){
 const user=await getCurrentUser();if(!user)redirect("/login");
 if(user.platformRole==="PLATFORM_ADMIN")redirect("/platform-admin");
 const memberships=await prisma.membership.findMany({where:{userId:user.id,status:"ACTIVE"},include:{organization:true},orderBy:{createdAt:"asc"}});
 const membership=memberships[0]??null;const workspace=membership?.organization??null;
 const canViewWorkspaceDocuments=membership?.role==="SCHOOL_ADMIN"||membership?.role==="TEACHER";
 const documentWhere=workspace&&canViewWorkspaceDocuments?{OR:[{ownerUserId:user.id},{organizationId:workspace.id}]}:{ownerUserId:user.id};
 const [documentCount,recentDocuments,publishedCurriculumCount]=await Promise.all([
  prisma.generatedDocument.count({where:documentWhere}),
  prisma.generatedDocument.findMany({where:documentWhere,orderBy:{updatedAt:"desc"},take:6,select:{id:true,title:true,type:true,status:true,updatedAt:true,subjectName:true,className:true}}),
  workspace?prisma.curriculumDocument.count({where:{organizationId:workspace.id,status:"PUBLISHED"}}):Promise.resolve(0)
 ]);
 const displayName=user.displayName?.trim()||user.email||"Teacher";
 const roleLabel=membership?.role==="SCHOOL_ADMIN"?"School Admin":membership?.role==="STUDENT"?"Student":"Teacher";
 return <main className="tg-shell">
  <header className="tg-topbar"><Link href="/" className="tg-brand"><span className="tg-brand-mark">T</span><span><span className="tg-brand-name">TeachGenius AI</span><span className="tg-brand-sub" style={{display:"block"}}>Teaching and learning workspace</span></span></Link><div className="tg-top-actions"><span style={{fontSize:12,color:"#64748b"}}>{user.email}</span><LogoutButton/></div></header>
  <div className="tg-page">
   <section style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:20,flexWrap:"wrap",marginBottom:28}}>
    <div><div className="tg-eyebrow">Your teaching workspace</div><h1 className="tg-heading">Welcome back, {displayName}</h1><p className="tg-subtitle">Plan lessons, create curriculum-aligned resources and keep your teaching documents organised.</p></div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link href="/resources" className="tg-btn tg-btn-secondary">Resource Library</Link><Link href="/studio" className="tg-btn">✦ Create a document</Link>{membership?.role==="SCHOOL_ADMIN"&&<Link href="/platform-admin" className="tg-btn tg-btn-secondary">Administration</Link>}</div>
   </section>
   <section className="tg-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(205px,1fr))",marginBottom:22}}>
    <article className="tg-card tg-stat"><div className="tg-stat-label">Current workspace</div><div style={{font:"750 19px Manrope,sans-serif",marginTop:10}}>{workspace?.name??"No active workspace"}</div><div className="tg-stat-note">{workspace?.type==="SCHOOL"?"School workspace":"Personal teacher workspace"}</div></article>
    <article className="tg-card tg-stat"><div className="tg-stat-label">Teaching documents</div><div className="tg-stat-value">{documentCount}</div><div className="tg-stat-note">Saved in your workspace</div></article>
    <article className="tg-card tg-stat"><div className="tg-stat-label">Approved curriculum items</div><div className="tg-stat-value">{publishedCurriculumCount}</div><div className="tg-stat-note">Available to guide AI generation</div></article>
    <article className="tg-card tg-stat"><div className="tg-stat-label">Account role</div><div className="tg-stat-value" style={{fontSize:23}}>{roleLabel}</div><div className="tg-stat-note">Active workspace membership</div></article>
   </section>
   <section className="tg-card tg-card-pad" style={{marginBottom:22,background:"linear-gradient(110deg,#123b75,#155eef)",color:"#fff",border:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:22,flexWrap:"wrap"}}>
    <div style={{maxWidth:700}}><div style={{fontSize:11,fontWeight:800,letterSpacing:".14em",color:"#c8dcff"}}>TEACHING RESOURCE CREATION</div><h2 style={{font:"800 24px Manrope,sans-serif",margin:"9px 0"}}>Turn your approved curriculum into classroom-ready documents.</h2><p style={{fontSize:13,lineHeight:1.7,color:"#e0ebff",margin:0}}>Generate lesson notes, lesson plans, quizzes, assignments and revision materials. Edit the content and export professional Word or A4 PDF copies.</p></div>
    <Link href="/studio" className="tg-btn" style={{background:"#fff",color:"#123b75",whiteSpace:"nowrap"}}>Open Document Studio →</Link>
   </section>
   <section className="tg-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(245px,1fr))",marginBottom:24}}>
    {[["AI Document Studio","Create structured teaching resources from published curriculum topics.","/studio","Open studio"],["Resource & Curriculum Library","Upload schemes, lesson materials and references; review and share approved resources.","/resources","Manage resources"],["Document Library","Review, edit, save and export your generated teaching materials.","#documents","View documents"]].map(([title,desc,href,label])=><article className="tg-card tg-card-pad" key={title}><div style={{width:38,height:38,borderRadius:11,background:"#edf4ff",color:"#155eef",display:"grid",placeItems:"center",fontWeight:800}}>✦</div><h3 className="tg-section-title" style={{marginTop:14}}>{title}</h3><p className="tg-subtitle" style={{margin:"7px 0 15px"}}>{desc}</p><Link href={href} style={{fontSize:13,fontWeight:750,color:"#155eef",textDecoration:"none"}}>{label} →</Link></article>)}
   </section>
   <section id="documents" className="tg-card tg-card-pad">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h2 className="tg-section-title">Recent documents</h2><p className="tg-subtitle" style={{marginTop:5}}>Your latest saved teaching resources.</p></div><Link href="/studio" className="tg-btn tg-btn-secondary">＋ New document</Link></div>
    {recentDocuments.length===0?<div className="tg-empty"><div style={{fontSize:28,marginBottom:8}}>▤</div><strong style={{color:"#334b69"}}>Your document library is ready</strong><p className="tg-subtitle" style={{margin:"6px 0 16px"}}>Create your first curriculum-aligned teaching resource to see it here.</p><Link href="/studio" className="tg-btn">Create first document</Link></div>:<div style={{overflowX:"auto",marginTop:16}}><table className="tg-table"><thead><tr><th>Document</th><th>Type</th><th>Status</th><th>Last updated</th><th></th></tr></thead><tbody>{recentDocuments.map(d=><tr key={d.id}><td><strong>{d.title}</strong><div style={{fontSize:11,color:"#8392a7",marginTop:4}}>{[d.subjectName,d.className].filter(Boolean).join(" · ")}</div></td><td>{d.type.replaceAll("_"," ")}</td><td>{d.status}</td><td>{d.updatedAt.toLocaleDateString()}</td><td><Link href={"/documents/"+d.id} style={{fontWeight:700,color:"#155eef",textDecoration:"none"}}>Open →</Link></td></tr>)}</tbody></table></div>}
   </section>
   <footer className="tg-footer"><span>TeachGenius AI · Your teaching workspace</span><Link href="/api/health">System status</Link></footer>
  </div>
 </main>;
}
