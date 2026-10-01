"use client";
import {useEffect,useState} from "react";
import Brand from "@/components/Brand";
import {createSupabaseBrowser} from "@/lib/supabase";

const sb=createSupabaseBrowser();

type HostEvent={
  id:string;
  name:string;
  slug:string;
  requests_open:boolean;
  venues:any;
};

export default function HostHome(){
  const[events,setEvents]=useState<HostEvent[]>([]);
  const[loading,setLoading]=useState(true);
  const[msg,setMsg]=useState("");

  useEffect(()=>{load()},[]);

  async function load(){
    if(!sb){setMsg("Supabase is not configured.");setLoading(false);return}
    const {data:{session}}=await sb.auth.getSession();
    if(!session){window.location.href="/host/login";return}

    const {data,error}=await sb
      .from("events")
      .select("id,name,slug,requests_open,venues(name)")
      .order("name");

    if(error){setMsg(error.message);setLoading(false);return}
    setEvents((data||[]) as HostEvent[]);
    setLoading(false);
  }

  async function signOut(){
    if(sb)await sb.auth.signOut();
    window.location.href="/host/login";
  }

  const active=events.filter(e=>e.requests_open);
  const inactive=events.filter(e=>!e.requests_open);

  if(loading)return <main className="shell"><Brand/><div className="card">Loading events…</div></main>;

  return <main className="shell">
    <div className="row">
      <Brand/>
      <span className="spacer"/>
      <button className="btn secondary" onClick={signOut}>Sign Out</button>
    </div>

    <div className="hero">
      <h1>Host Dashboard</h1>
      <p className="muted">Choose the event you are running.</p>
    </div>

    {msg&&<div className="card"><b>{msg}</b></div>}

    <h2>Active Events</h2>
    {active.length===0
      ? <div className="card"><p className="muted">No events currently have requests open.</p></div>
      : <div className="grid grid2">
          {active.map(e=><a className="card eventCard" key={e.id} href={`/host/events/${encodeURIComponent(e.slug)}`}>
            <span className="status">ACTIVE</span>
            <h2>{e.name}</h2>
            <p>{e.venues?.name||"Four Dogs Karaoke"}</p>
            <div className="btn">OPEN HOST CONTROLS</div>
          </a>)}
        </div>
    }

    {inactive.length>0&&<>
      <h2>Other Events</h2>
      <div className="grid grid2">
        {inactive.map(e=><a className="card eventCard" key={e.id} href={`/host/events/${encodeURIComponent(e.slug)}`}>
          <span className="status">REQUESTS PAUSED</span>
          <h3>{e.name}</h3>
          <p>{e.venues?.name||"Four Dogs Karaoke"}</p>
          <div className="btn secondary">OPEN EVENT</div>
        </a>)}
      </div>
    </>}
  </main>;
}
