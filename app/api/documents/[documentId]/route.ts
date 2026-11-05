import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const contentSchema=z.object({title:z.string().min(1).max(180),topic:z.string().max(300).optional(),learningObjectives:z.array(z.string().max(1000)).max(30),sections:z.array(z.object({heading:z.string().min(1).max(180),body:z.string().min(1).max(12000)})).min(1).max(30),assessmentQuestions:z.array(z.object({question:z.string().min(1).max(3000),answer:z.string().max(3000).optional(),marks:z.number().min(0).max(100).optional()})).max(100)});
const updateSchema=z.object({title:z.string().trim().min(1).max(180),content:contentSchema});
type Context={params:Promise<{documentId:string}>};
async function accessibleDocument(userId:string,documentId:string){
 return prisma.generatedDocument.findFirst({where:{id:documentId,OR:[{ownerUserId:userId},{organization:{memberships:{some:{userId,status:"ACTIVE",role:{in:["SCHOOL_ADMIN","TEACHER"]}}}}}]}});
}
export async function GET(_request:NextRequest,context:Context){
 try{const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Authentication required"},{status:401});const {documentId}=await context.params;const document=await accessibleDocument(user.id,documentId);if(!document)return NextResponse.json({error:"Document not found"},{status:404});return NextResponse.json({document});}
 catch(error){console.error("Document retrieval failed:",error);return NextResponse.json({error:"Unable to load document"},{status:500});}
}
export async function PATCH(request:NextRequest,context:Context){
 try{
  const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const {documentId}=await context.params;const existing=await accessibleDocument(user.id,documentId);if(!existing)return NextResponse.json({error:"Document not found"},{status:404});
  const parsed=updateSchema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid document content",details:parsed.error.flatten()},{status:400});
  const content=parsed.data.content;
  const updated=await prisma.$transaction(async tx=>{
   const document=await tx.generatedDocument.update({where:{id:documentId},data:{title:parsed.data.title,content}});
   const latest=await tx.documentVersion.findFirst({where:{documentId},orderBy:{versionNumber:"desc"},select:{versionNumber:true}});
   await tx.documentVersion.create({data:{documentId,versionNumber:(latest?.versionNumber??0)+1,content,editedBy:user.id}});
   return document;
  });
  return NextResponse.json({success:true,document:updated});
 }catch(error){console.error("Document update failed:",error);return NextResponse.json({error:"Unable to save document"},{status:500});}
}
