"use client";
import {useEffect,useMemo,useState} from "react";
import Brand from "@/components/Brand";
import {createSupabaseBrowser} from "@/lib/supabase";

const sb=createSupabaseBrowser();
type Row={id:string,status:string,created_at:string,provider_payload:any,singers:any,songs:any};
const info=(r:Row)=>({singer:r.singers?.display_name||"Singer",title:r.songs?.title||r.provider_payload?.title||"Unknown song",artist:r.songs?.artist||r.provider_payload?.channel||"",thumbnail:r.songs?.thumbnail||r.provider_payload?.thumbnail||""});

export default function Host({params}:{params:Promise<{slug:string}>}){
 const[slug,setSlug]=useState(""),[event,setEvent]=useState<any>(null),[rows,setRows]=useState<Row[]>([]),[rotation,setRotation]=useState<any[]>([]),[msg,setMsg]=useState("Loading…"),[copied,setCopied]=useState("");
 const tipUrl=process.env.NEXT_PUBLIC_STRIPE_TIP_URL||"";

 useEffect(()=>{let channel:any;params.then(async x=>{setSlug(x.slug);if(!sb)return;const {data:{session}}=await sb.auth.getSession();if(!session){location.href="/host/login";return}await load(x.slug);channel=sb.channel(`host-${x.slug}`).on("postgres_changes",{event:"*",schema:"public",table:"requests"},()=>load(x.slug)).on("postgres_changes",{event:"*",schema:"public",table:"rotation_entries"},()=>load(x.slug)).subscribe()});return()=>{if(channel&&sb)sb.removeChannel(channel)}},[params]);

 async function load(s:string){
  if(!sb)return;
  const {data:e,error:ee}=await sb.from("events").select("id,name,slug,requests_open,average_song_minutes,venues(name)").ilike("slug",s).single();
  if(ee){setMsg(ee.message);return}
  setEvent(e);
  const {data:r,error}=await sb.from("requests").select("id,status,created_at,provider_payload,singers(display_name),songs(title,artist,provider_song_id,thumbnail)").eq("event_id",e.id).order("created_at");
  if(error){setMsg(error.message);return}
  setRows((r||[]) as any);
  const {data:re}=await sb.from("rotation_entries").select("request_id,round,position").eq("event_id",e.id).order("position");
  setRotation(re||[]);setMsg("");
 }

 async function status(id:string,s:string){if(!sb)return;const {error}=await sb.rpc("host_set_request_status",{p_request_id:id,p_status:s});if(error)setMsg(error.message);else await load(slug)}
 async function play(id:string){if(!sb)return;const {error}=await sb.rpc("host_start_request",{p_request_id:id});if(error)setMsg(error.message);else await load(slug)}
 async function toggle(){if(!sb||!event)return;const{error}=await sb.from("events").update({requests_open:!event.requests_open}).eq("id",event.id);if(error)setMsg(error.message);else await load(slug)}
 async function copySearch(r:Row){const d=info(r);await navigator.clipboard.writeText(`${d.title} ${d.artist}`.trim());setCopied(r.id);setTimeout(()=>setCopied(""),1500)}

 const pending=rows.filter(r=>r.status==="PENDING"),playing=rows.find(r=>r.status==="PLAYING"),done=rows.filter(r=>r.status==="COMPLETED"),byId=useMemo(()=>new Map(rows.map(r=>[r.id,r])),[rows]);
 const queue=rotation.map(x=>({...x,row:byId.get(x.request_id)})).filter(x=>x.row&&!["COMPLETED","DECLINED","CANCELLED","NO_SHOW"].includes(x.row.status));
 const next=queue.find(x=>x.row.status!=="PLAYING");

 if(!event)return <main className="shell"><Brand/><div className="card">{msg}</div></main>;

 return <main className="shell">
  <Brand/>
  <div className="row"><div><h1>{event.name}</h1><p className="muted">Four Dogs controls the rotation. KaraFun handles playback.</p></div><span className="spacer"/><button className="btn secondary" onClick={toggle}>{event.requests_open?"Pause Requests":"Resume Requests"}</button></div>
  <div className="nav"><a className="btn secondary" href={`/e/${slug}`} target="_blank">Guest Page</a><a className="btn secondary" href={`/display/${slug}`} target="_blank">Audience Display</a><a className="btn secondary" href={`/host/events/${slug}/qr`}>QR Code</a>{tipUrl&&<a className="btn secondary" href={tipUrl} target="_blank" rel="noreferrer">Tip Page</a>}</div>
  {msg&&<div className="card">{msg}</div>}

  <h2>Live Controls</h2>
  <div className="grid grid2">
   <div className="card nowCard">
    <span className="status">NOW SINGING</span>
    {playing?<><h2>{info(playing).singer}</h2><p>{info(playing).title}<br/><span className="muted">{info(playing).artist}</span></p><div className="row"><button className="btn secondary" onClick={()=>copySearch(playing)}>{copied===playing.id?"COPIED":"COPY KARAFUN SEARCH"}</button><button className="btn" onClick={()=>status(playing.id,"COMPLETED")}>COMPLETE SONG</button></div></>:<><h3>Nobody is singing yet.</h3><p className="muted">Approve a request and start the next singer.</p></>}
   </div>
   <div className="card nextCard">
    <span className="status">UP NEXT</span>
    {next?<><h2>{info(next.row).singer}</h2><p>{info(next.row).title}<br/><span className="muted">{info(next.row).artist}</span></p><div className="row"><button className="btn secondary" onClick={()=>copySearch(next.row)}>{copied===next.row.id?"COPIED":"COPY KARAFUN SEARCH"}</button><button className="btn" disabled={Boolean(playing)} onClick={()=>play(next.row.id)}>{playing?"FINISH CURRENT SONG":"START NEXT SINGER"}</button></div></>:<><h3>Queue is clear.</h3><p className="muted">New approved requests will appear here.</p></>}
   </div>
  </div>

  <h2>New Requests <span className="countBadge">{pending.length}</span></h2>
  {pending.length===0&&<div className="card"><p className="muted">No requests waiting for approval.</p></div>}
  {pending.map(r=>{const d=info(r);return <div className="card song" key={r.id}>{d.thumbnail&&<img src={d.thumbnail} alt=""/>}<div><h3>{d.singer}</h3><p>{d.title}<br/><span className="muted">{d.artist}</span></p></div><span className="spacer"/><div className="hostActions"><button className="btn secondary" onClick={()=>copySearch(r)}>{copied===r.id?"COPIED":"COPY SEARCH"}</button><button className="btn" onClick={()=>status(r.id,"APPROVED")}>APPROVE</button><button className="btn danger" onClick={()=>status(r.id,"DECLINED")}>DECLINE</button></div></div>})}

  <h2>Current Rotation</h2>
  <div className="queue">{queue.map(x=>{const d=info(x.row);return <div className={`card ${x.row.status==="PLAYING"?"activeQueue":""}`} key={x.row.id}><span className="status">#{x.position} · Round {x.round}</span><h3>{d.singer}</h3><p>{d.title}</p><button className="btn secondary" onClick={()=>copySearch(x.row)}>{copied===x.row.id?"COPIED":"COPY KARAFUN SEARCH"}</button>{x.row.status!=="PLAYING"&&<button className="btn queuePlay" disabled={Boolean(playing)} onClick={()=>play(x.row.id)}>START</button>}</div>})}</div>

  <h2>Completed</h2>
  {done.slice().reverse().map(r=><div className="card completedRow" key={r.id}><b>{info(r).singer}</b><span>{info(r).title}</span></div>)}
 </main>;
}