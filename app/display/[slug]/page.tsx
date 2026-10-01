"use client";
import {useEffect,useState} from "react";
import Brand from "@/components/Brand";
import {createSupabaseBrowser} from "@/lib/supabase";
const sb=createSupabaseBrowser();

export default function Display({params}:{params:Promise<{slug:string}>}){
 const[slug,setSlug]=useState(""),[state,setState]=useState<any>(null);
 useEffect(()=>{let c:any;params.then(async x=>{setSlug(x.slug);await load(x.slug);if(sb)c=sb.channel(`display-${x.slug}`).on("postgres_changes",{event:"*",schema:"public",table:"requests"},()=>load(x.slug)).on("postgres_changes",{event:"*",schema:"public",table:"rotation_entries"},()=>load(x.slug)).subscribe()});return()=>{if(c&&sb)sb.removeChannel(c)}},[params]);
 async function load(s:string){if(!sb)return;const{data}=await sb.rpc("get_public_display",{p_slug:s});setState(data)}
 const p=state?.playing,n=state?.next;
 return <main className="display"><div className="displayPanel"><Brand/><h1>FOUR DOGS KARAOKE</h1>
  {p?<><p className="status">NOW SINGING</p><h2>{p.singer}</h2><p className="displaySong">{p.title}</p></>:<><p className="status">REQUEST A SONG</p><h2>Ready to sing?</h2></>}
  {n&&<div className="upNext"><p className="status">UP NEXT</p><h3>{n.singer}</h3><p>{n.title}</p></div>}
  {!n&&!p&&<p className="muted">Scan the QR code to join the rotation.</p>}
  {slug&&<div className="displayQr"><img src={`/api/qr?slug=${encodeURIComponent(slug)}`} width="220" alt="Event QR"/><p>Scan to request a song</p></div>}
 </div></main>;
}