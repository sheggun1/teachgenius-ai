import type { Metadata } from "next";
import "./globals.css";
import "./responsive.css";
export const metadata:Metadata={title:"TeachGenius AI | Teaching Workspace",description:"A professional AI-powered teaching and learning workspace for educators and schools."};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}</body></html>;
}
