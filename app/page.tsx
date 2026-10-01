import Brand from "@/components/Brand";
export default function Home(){
 return <main className="shell"><Brand/><section className="hero">
  <h1 className="big">Four Dogs Karaoke</h1>
  <p className="muted">Guest requests, live singer rotation, and KaraFun-powered playback.</p>
  <div className="nav">
   <a className="btn" href="/host">HOST DASHBOARD</a>
   <a className="btn secondary" href="/host/login">HOST LOGIN</a>
  </div>
 </section></main>;
}