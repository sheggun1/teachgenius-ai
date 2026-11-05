import {notFound,redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import DocumentEditor from "./document-editor";
type Props={params:Promise<{documentId:string}>};
export default async function DocumentPage({params}:Props){
 const user=await getCurrentUser();if(!user)redirect("/login");
 const {documentId}=await params;
 const document=await prisma.generatedDocument.findFirst({where:{id:documentId,OR:[{ownerUserId:user.id},{organization:{memberships:{some:{userId:user.id,status:"ACTIVE",role:{in:["SCHOOL_ADMIN","TEACHER"]}}}}}]},include:{organization:{select:{name:true}}}});
 if(!document)notFound();
 return <DocumentEditor initialDocument={{id:document.id,title:document.title,type:document.type,subjectName:document.subjectName,className:document.className,topic:document.topic,organizationName:document.organization?.name??"Personal workspace",content:document.content as Record<string,unknown>,updatedAt:document.updatedAt.toISOString()}}/>;
}
