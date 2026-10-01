"use client";
import {useEffect,useRef,useState} from "react";
import Brand from "@/components/Brand";
import {createSupabaseBrowser} from "@/lib/supabase";
import {Song,Event} from "@/lib/types";

const sb=createSupabaseBrowser();

export default function Guest({params}:{params:Promise<{slug:string}>}){
 const[slug,setSlug]=useState(""),[event,setEvent]=useState<Event|null>(null),[q,setQ]=useState(""),[songs,setSongs]=useState<Song[]>([]),[pick,setPick]=useState<Song|null>(null),[name,setName]=useState(""),[manualArtist,setManualArtist]=useState(""),[confirmation,setConfirmation]=useState<any>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[searching,setSearching]=useState(false),[searched,setSearched]=useState(false),[submitting,setSubmitting]=useState(false);
 const requestRef=useRef<HTMLDivElement>(null);
 const tipUrl=process.env.NEXT_PUBLIC_STRIPE_TIP_URL||"";

 useEffect(()=>{params.then(async({slug})=>{setSlug(slug);if(sb){const {data}=await sb.rpc("get_public_event",{p_slug:slug});if(data){setEvent({id:data.id,slug:data.slug,name:data.name,venue:data.venue,date:data.eventDate,requestsOpen:data.requestsOpen,openYouTube:data.openYouTube,rating:data.rating,averageSongMinutes:Number(data.averageSongMinutes||4.5),newSingerPolicy:data.newSingerPolicy});await loadCurated(slug,"");}setLoading(false)}})},[params]);
 useEffect(()=>{if(pick)requestAnimationFrame(()=>requestRef.current?.scrollIntoView({behavior:"smooth",block:"center"}))},[pick]);

 async function loadCurated(s:string,query:string){
  if(!sb)return;
  const term=query.trim();
  if(term.length<2){setSongs([]);return}

  const base=()=>sb
   .from("karafun_catalog")
   .select("id,title,artist,year,duo,explicit,styles,languages")
   .gte("year",1970)
   .lte("year",1989)
   .limit(30);

  const [{data:byTitle,error:titleError},{data:byArtist,error:artistError}]=await Promise.all([
   base().ilike("title",`%${term}%`),
   base().ilike("artist",`%${term}%`)
  ]);

  if(titleError||artistError){
   setSongs([]);
   setError(titleError?.message||artistError?.message||"KaraFun catalog search failed.");
   return;
  }

  const merged=[...(byTitle||[]),...(byArtist||[])];
  const unique=Array.from(new Map(merged.map((x:any)=>[x.id,x])).values()).slice(0,50);

  setSongs(unique.map((x:any)=>({
   id:`karafun:${x.id}`,
   title:x.title,
   artist:`${x.artist} (${x.year})`,
   videoId:`karafun:${x.id}`,
   channel:x.artist,
   thumbnail:"",
   genre:x.styles||"Karaoke",
   rating:x.explicit?"21+":"GENERAL",
   tags:[],
   source:"KARAFUN",
   verified:true
  })));
 }

 async function search(){
  setError("");setPick(null);setSearching(true);
  await loadCurated(slug,q);
  setSearched(true);
  setSearching(false);
 }

 async function submitManual(){
  if(!q.trim()||!name.trim()||!event||!sb)return;
  setError("");setSubmitting(true);
  try{
   const manualId=`manual:${Date.now()}`;
   const {data,error}=await sb.rpc("submit_youtube_request",{p_slug:slug,p_singer:name.trim(),p_video_id:manualId,p_title:q.trim(),p_channel:manualArtist.trim()||"Artist not specified",p_thumbnail:null});
   if(error)throw error;
   const result=Array.isArray(data)?data[0]:data;
   setConfirmation({name:name.trim(),title:q.trim(),position:Number(result?.position||1),wait:Number(result?.waitMinutes||result?.wait_minutes||0)});
   setName("");setManualArtist("");window.scrollTo({top:0,behavior:"smooth"});
  }catch(e:any){
   setError(e?.message||"Could not submit your request. Please see the Four Dogs host.");
  }finally{
   setSubmitting(false);
  }
 }

 async function submit(){
  if(!pick||!name.trim()||!event||!sb)return;
  setError("");setSubmitting(true);
  try{
   let data:any,error:any;
   if(pick.source==="KARAFUN"||pick.source==="YOUTUBE"){
    ({data,error}=await sb.rpc("submit_youtube_request",{p_slug:slug,p_singer:name.trim(),p_video_id:pick.videoId,p_title:pick.title,p_channel:pick.channel,p_thumbnail:pick.thumbnail||null}));
   }else{
    ({data,error}=await sb.rpc("submit_guest_request",{p_slug:slug,p_singer:name.trim(),p_song_id:pick.id}));
   }
   if(error)throw error;
   const result=Array.isArray(data)?data[0]:data;
   setConfirmation({name:name.trim(),title:pick.title,position:Number(result?.position||1),wait:Number(result?.waitMinutes||result?.wait_minutes||0)});
   setPick(null);setName("");window.scrollTo({top:0,behavior:"smooth"});
  }catch(e:any){
   setError(e?.message||"Could not join the rotation. Please see the Four Dogs host.");
  }finally{
   setSubmitting(false);
  }
 }

 function selectSong(s:Song){setPick(s);setConfirmation(null)}

 if(loading)return <main className="shell"><Brand/><div className="card">Loading event…</div></main>;
 if(!event)return <main className="shell"><Brand/><div className="card">Event not found.</div></main>;
 const results=songs;

 return <main className="shell">
  <Brand/>
  <div className="card">
   <h1>{event.name}</h1>
   <p>{event.venue}</p>
   <p className="muted">Request your song here. Your Four Dogs host will load approved requests into KaraFun.</p>
  </div>
  {!event.requestsOpen&&<div className="card"><b>Song requests are temporarily paused.</b></div>}
  {error&&<div className="card"><b>{error}</b></div>}
  {confirmation&&<div className="card successCard">
   <span className="status">REQUEST RECEIVED</span>
   <h2>You're in the rotation, {confirmation.name}!</h2>
   <p>{confirmation.title}</p>
   <p>Approximate position: <b>#{confirmation.position}</b><br/>Estimated wait: <b>{confirmation.wait} minutes</b></p>
   {tipUrl&&<a className="btn tipBtn" href={tipUrl} target="_blank" rel="noreferrer">TIP YOUR KARAOKE HOST</a>}
  </div>}
  <div className="card">
   <label>What do you want to sing?</label>
   <input className="input" value={q} onChange={x=>setQ(x.target.value)} onKeyDown={x=>x.key==="Enter"&&search()} placeholder="Song title or artist"/>
   <button className="btn" disabled={searching||!event.requestsOpen} onClick={search}>{searching?"SEARCHING…":"SEARCH SONGS"}</button>
   <p className="muted">Search the Four Dogs 70s & 80s KaraFun catalog by song title or artist.</p>
  </div>
  {searched&&results.length===0&&q.trim()&&<div className="card selectedCard" ref={requestRef}>
   <span className="status">NO MATCH FOUND</span>
   <h2>Request "{q.trim()}" anyway</h2>
   <p className="muted">Your host will verify the song in KaraFun before your turn.</p>
   <label>Artist (optional)</label>
   <input className="input" value={manualArtist} onChange={x=>setManualArtist(x.target.value)} placeholder="Artist name"/>
   <label>Your singer name</label>
   <input className="input" value={name} onChange={x=>setName(x.target.value)} maxLength={40} placeholder="Enter your name"/>
   <button className="btn" disabled={!name.trim()||!event.requestsOpen||submitting} onClick={submitManual}>{submitting?"SUBMITTING…":"REQUEST THIS SONG"}</button>
  </div>}
  {pick&&<div className="card selectedCard" ref={requestRef}>
   <span className="status">YOUR SONG</span>
   <h2>{pick.title}</h2>
   <p>{pick.artist}</p>
   <label>Your singer name</label>
   <input autoFocus className="input" value={name} onChange={x=>setName(x.target.value)} onKeyDown={x=>x.key==="Enter"&&name.trim()&&submit()} maxLength={40} placeholder="Enter your name"/>
   <div className="row">
    <button className="btn" disabled={!name.trim()||!event.requestsOpen||submitting} onClick={submit}>{submitting?"JOINING…":"JOIN THE ROTATION"}</button>
    <button className="btn secondary" onClick={()=>setPick(null)}>Choose Another</button>
   </div>
  </div>}
  {results.map(s=><div className="card song" key={s.id}>
   {s.thumbnail&&<img src={s.thumbnail} alt=""/>}
   <div><b>{s.title}</b><div>{s.artist}</div><span className="pill">{s.verified?"KARAFUN CATALOG":"SONG MATCH"}</span></div>
   <span className="spacer"/>
   <button className="btn" onClick={()=>selectSong(s)}>{pick?.id===s.id?"SELECTED":"SELECT SONG"}</button>
  </div>)}
  {tipUrl&&<div className="card tipCard"><h3>Having a Doggone Good Time?</h3><p className="muted">Tips are never required, but they're always appreciated.</p><a className="btn secondary" href={tipUrl} target="_blank" rel="noreferrer">TIP YOUR HOST</a></div>}
 </main>;
}