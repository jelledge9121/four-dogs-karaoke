"use client";
import {useEffect,useState} from "react";
import Brand from "@/components/Brand";
import {createSupabaseBrowser} from "@/lib/supabase";

const sb=createSupabaseBrowser();

type Req={
 id:string;
 singer_name:string;
 song_title:string;
 artist:string;
 status:string;
 created_at:string;
};

export default function Display({params}:{params:Promise<{slug:string}>}){
 const[slug,setSlug]=useState("");
 const[playing,setPlaying]=useState<Req|null>(null);
 const[next,setNext]=useState<Req|null>(null);
 const[msg,setMsg]=useState("");

 useEffect(()=>{let c:any;params.then(async x=>{
  setSlug(x.slug);
  await load(x.slug);
  if(sb)c=sb.channel(`display-${x.slug}`)
   .on("postgres_changes",{event:"*",schema:"public",table:"karaoke_requests",filter:`event_slug=eq.${x.slug}`},()=>load(x.slug))
   .subscribe();
 });return()=>{if(c&&sb)sb.removeChannel(c)}},[params]);

 async function load(s:string){
  if(!sb)return;
  const {data,error}=await sb
   .from("karaoke_requests")
   .select("id,singer_name,song_title,artist,status,created_at")
   .eq("event_slug",s)
   .in("status",["APPROVED","PLAYING"])
   .order("created_at",{ascending:true});
  if(error){setMsg(error.message);return}
  const rows=(data||[]) as Req[];
  setPlaying(rows.find(r=>r.status==="PLAYING")||null);
  setNext(rows.find(r=>r.status==="APPROVED")||null);
  setMsg("");
 }

 return <main className="display"><div className="displayPanel">
  <Brand/>
  <h1>FOUR DOGS KARAOKE</h1>
  {msg&&<p className="muted">Queue display temporarily unavailable.</p>}
  {playing?<><p className="status">NOW SINGING</p><h2>{playing.singer_name}</h2><p className="displaySong">{playing.song_title}</p></>:<><p className="status">REQUEST A SONG</p><h2>Ready to sing?</h2></>}
  {next&&<div className="upNext"><p className="status">UP NEXT</p><h3>{next.singer_name}</h3><p>{next.song_title}</p></div>}
  {!next&&!playing&&<p className="muted">Scan the QR code to join the rotation.</p>}
  {slug&&<div className="displayQr"><img src={`/api/qr?slug=${encodeURIComponent(slug)}`} width="220" alt="Event QR"/><p>Scan to request a song</p></div>}
 </div></main>;
}