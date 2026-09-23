import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const normalize=(v:string)=>v.trim().toLowerCase().replace(/\s+/g," ");
export async function GET(req:Request){
 const raw=new URL(req.url).searchParams.get("q")||"",q=normalize(raw);
 if(q.length<2)return NextResponse.json({error:"Enter at least 2 characters."},{status:400});
 if(q.length>80)return NextResponse.json({error:"Search is too long."},{status:400});
 const key=process.env.YOUTUBE_API_KEY;
 if(!key)return NextResponse.json({error:"YouTube search is not configured."},{status:503});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const sb=url&&anon?createClient(url,anon,{auth:{persistSession:false}}):null;
 if(sb){const {data}=await sb.rpc("get_youtube_cache",{p_query:q});if(data)return NextResponse.json({...data,cached:true});}
 const search=new URL("https://www.googleapis.com/youtube/v3/search");
 for(const [k,v] of Object.entries({part:"snippet",type:"video",videoEmbeddable:"true",safeSearch:"moderate",maxResults:"8",q:`${q} karaoke`,key}))search.searchParams.set(k,v);
 const r=await fetch(search,{cache:"no-store"});
 if(!r.ok)return NextResponse.json({error:r.status===403?"YouTube quota or API restriction blocked this search.":"YouTube search failed."},{status:r.status});
 const data=await r.json(),ids=(data.items||[]).map((x:any)=>x.id?.videoId).filter(Boolean);let durations:Record<string,string>={};
 if(ids.length){const v=new URL("https://www.googleapis.com/youtube/v3/videos");v.searchParams.set("part","contentDetails,status");v.searchParams.set("id",ids.join(","));v.searchParams.set("key",key);const vr=await fetch(v,{cache:"no-store"});if(vr.ok){const vd=await vr.json();for(const x of vd.items||[])if(x.status?.embeddable!==false)durations[x.id]=x.contentDetails?.duration||"";}}
 const results=(data.items||[]).filter((x:any)=>x.id?.videoId&&Object.prototype.hasOwnProperty.call(durations,x.id.videoId)).map((x:any)=>({videoId:x.id.videoId,title:x.snippet.title,channel:x.snippet.channelTitle,thumbnail:x.snippet.thumbnails?.medium?.url||"",duration:durations[x.id.videoId],source:"YOUTUBE",verified:false}));
 const payload={results};if(sb)await sb.rpc("put_youtube_cache",{p_query:q,p_response:payload,p_minutes:360});return NextResponse.json(payload);
}