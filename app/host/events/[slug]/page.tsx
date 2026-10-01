"use client";
import {useEffect,useState} from "react";
import Brand from "@/components/Brand";
import {createSupabaseBrowser} from "@/lib/supabase";

const sb=createSupabaseBrowser();

type Req={
 id:string;
 event_slug:string;
 singer_name:string;
 song_catalog_id:string|null;
 song_title:string;
 artist:string;
 status:string;
 created_at:string;
};

export default function HostEvent({params}:{params:Promise<{slug:string}>}){
 const[slug,setSlug]=useState("");
 const[event,setEvent]=useState<any>(null);
 const[rows,setRows]=useState<Req[]>([]);
 const[msg,setMsg]=useState("Loading…");
 const[copied,setCopied]=useState("");

 useEffect(()=>{let channel:any;params.then(async x=>{
  setSlug(x.slug);
  if(!sb)return;
  const {data:{session}}=await sb.auth.getSession();
  if(!session){location.href="/host/login";return}
  await load(x.slug);
  channel=sb.channel(`karaoke-${x.slug}`)
   .on("postgres_changes",{event:"*",schema:"public",table:"karaoke_requests",filter:`event_slug=eq.${x.slug}`},()=>load(x.slug))
   .subscribe();
 });return()=>{if(channel&&sb)sb.removeChannel(channel)}},[params]);

 async function load(s:string){
  if(!sb)return;
  const {data:events,error:ee}=await sb.from("events").select("id,name,slug,requests_open,average_song_minutes").ilike("slug",s).limit(1);
  if(ee){setMsg(ee.message);return}
  if(!events||events.length===0){setMsg(`No event found for ${s}.`);return}
  setEvent(events[0]);
  const {data,error}=await sb.from("karaoke_requests").select("*").eq("event_slug",s).order("created_at",{ascending:true});
  if(error){setMsg(error.message);return}
  setRows((data||[]) as Req[]);
  setMsg("");
 }

 async function setStatus(id:string,status:string){
  if(!sb)return;
  const {error}=await sb.from("karaoke_requests").update({status}).eq("id",id);
  if(error)setMsg(error.message); else await load(slug);
 }

 async function toggle(){
  if(!sb||!event)return;
  const {error}=await sb.from("events").update({requests_open:!event.requests_open}).eq("id",event.id);
  if(error)setMsg(error.message); else await load(slug);
 }

 async function copySearch(r:Req){
  await navigator.clipboard.writeText(`${r.song_title} ${r.artist}`);
  setCopied(r.id);setTimeout(()=>setCopied(""),1200);
 }

 const pending=rows.filter(r=>r.status==="PENDING");
 const approved=rows.filter(r=>r.status==="APPROVED");
 const playing=rows.find(r=>r.status==="PLAYING");
 const completed=rows.filter(r=>r.status==="COMPLETED");

 if(!event)return <main className="shell"><Brand/><div className="card">{msg}</div></main>;

 return <main className="shell">
  <Brand/>
  <div className="row">
   <div><h1>{event.name}</h1><p className="muted">Four Dogs manages the rotation. KaraFun handles playback.</p></div>
   <span className="spacer"/>
   <a className="btn secondary" href="/host">All Events</a>
   <button className="btn secondary" onClick={toggle}>{event.requests_open?"Pause Requests":"Resume Requests"}</button>
  </div>

  <div className="nav">
   <a className="btn secondary" href={`/e/${slug}`} target="_blank">Guest Page</a>
   <a className="btn secondary" href={`/display/${slug}`} target="_blank">Audience Display</a>
   <a className="btn secondary" href={`/host/events/${slug}/qr`}>QR Code</a>
  </div>

  {msg&&<div className="card"><b>{msg}</b></div>}

  <h2>Now Singing</h2>
  <div className="card nowCard">
   {playing?<><span className="status">NOW SINGING</span><h2>{playing.singer_name}</h2><p>{playing.song_title}<br/><span className="muted">{playing.artist}</span></p>
    <div className="row">
     <button className="btn secondary" onClick={()=>copySearch(playing)}>{copied===playing.id?"COPIED":"COPY KARAFUN SEARCH"}</button>
     <button className="btn" onClick={()=>setStatus(playing.id,"COMPLETED")}>COMPLETE SONG</button>
    </div></>:<p className="muted">Nobody is singing right now.</p>}
  </div>

  <h2>New Requests <span className="countBadge">{pending.length}</span></h2>
  {pending.length===0&&<div className="card"><p className="muted">No requests waiting.</p></div>}
  {pending.map(r=><div className="card song" key={r.id}>
   <div><h3>{r.singer_name}</h3><p>{r.song_title}<br/><span className="muted">{r.artist}</span></p></div>
   <span className="spacer"/>
   <div className="hostActions">
    <button className="btn secondary" onClick={()=>copySearch(r)}>{copied===r.id?"COPIED":"COPY SEARCH"}</button>
    <button className="btn" onClick={()=>setStatus(r.id,"APPROVED")}>APPROVE</button>
    <button className="btn danger" onClick={()=>setStatus(r.id,"DECLINED")}>DECLINE</button>
   </div>
  </div>)}

  <h2>Approved Rotation</h2>
  {approved.length===0&&<div className="card"><p className="muted">Approve requests to build the rotation.</p></div>}
  <div className="queue">
   {approved.map((r,i)=><div className="card" key={r.id}>
    <span className="status">#{i+1}</span>
    <h3>{r.singer_name}</h3>
    <p>{r.song_title}</p>
    <button className="btn secondary" onClick={()=>copySearch(r)}>{copied===r.id?"COPIED":"COPY KARAFUN SEARCH"}</button>
    <button className="btn queuePlay" disabled={Boolean(playing)} onClick={()=>setStatus(r.id,"PLAYING")}>{playing?"FINISH CURRENT SONG":"START SINGER"}</button>
   </div>)}
  </div>

  <h2>Completed</h2>
  {completed.slice().reverse().map(r=><div className="card completedRow" key={r.id}><b>{r.singer_name}</b><span>{r.song_title}</span></div>)}
 </main>;
}