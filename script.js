const { useState, useEffect, useRef } = React;
const CATS = ["Apps","Games","Media","Docs","Other"];
const fmtSize = b => !b ? "—" : b < 1024*1024 ? (b/1024).toFixed(0)+" KB" : (b/1024/1024).toFixed(1)+" MB";
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});

// Static store: this build has no server, so posts + files live in this browser's
// localStorage only. Uploads made here are NOT visible to other visitors or devices —
// see the note in the README this file ships alongside.
const STORE_KEY = "depot-posts";
const store = {
  list(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }catch{ return []; } },
  save(posts){ localStorage.setItem(STORE_KEY, JSON.stringify(posts)); },
  upsert(post){ const all = store.list().filter(p=>p.id!==post.id); all.push(post); store.save(all); },
  remove(id){ store.save(store.list().filter(p=>p.id!==id)); }
};
const readAsDataURL = file => new Promise((res,rej)=>{
  const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror = rej; r.readAsDataURL(file);
});

function Toast({ toasts }){
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" style={{paddingTop:"env(safe-area-inset-top,0px)"}}>
      {toasts.map(t => (
        <div key={t.id} className={"toast glass px-4 py-2.5 rounded-xl border shadow-lg text-sm font-medium " + (t.kind==="error"?"text-red-400 border-red-400/30":"text-emerald-400 border-emerald-400/30")}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Nav({ view, setView, theme, setTheme, search, setSearch, isAdmin, adminSession, setAdminSession }){
  return (
    <nav className="glass sticky top-0 z-40 border-b" style={{borderColor:"var(--border)", paddingTop:"env(safe-area-inset-top,0px)"}}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <button onClick={()=>setView("home")} className="disp text-xl font-bold flex items-center gap-2 shrink-0">
          <span style={{color:"var(--accent)"}}>◆</span> Depot
        </button>
        <div className="flex-1 min-w-[160px] relative">
          <input value={search} onChange={e=>{setSearch(e.target.value); setView("browse")}}
            placeholder="Search files…" className="w-full pill px-4 py-2 text-sm outline-none focus:ring-2" style={{ringColor:"var(--accent)"}} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={()=>setView("browse")} className={"btn px-3 py-2 text-sm " + (view==="browse"?"opacity-100":"opacity-70")}>Browse</button>
          <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} className="btn px-2.5 py-2 pill" style={{background:"var(--surface2)"}} aria-label="Toggle theme">
            {theme==="dark" ? "☀️" : "🌙"}
          </button>
          {isAdmin && adminSession && (
            <button onClick={()=>setView("dashboard")} className="btn px-3 py-2 text-sm pill" style={{background:"var(--accent)",color:"#1c1e22"}}>Dashboard</button>
          )}
          {isAdmin && !adminSession && (
            <button onClick={()=>setView("login")} className="btn px-3 py-2 text-sm pill border" style={{borderColor:"var(--border)"}}>Admin</button>
          )}
          {isAdmin && adminSession && (
            <button onClick={()=>{setAdminSession(false); setView("home")}} className="btn px-3 py-2 text-sm opacity-70">Log out</button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Card({ post, onOpen }){
  return (
    <div onClick={()=>onOpen(post)} className="card fade-in cursor-pointer overflow-hidden flex flex-col">
      <div className="aspect-video flex items-center justify-center text-3xl" style={{background:"var(--surface2)"}}>
        {post.thumbUrl ? <img src={post.thumbUrl} className="w-full h-full object-cover" /> : "📦"}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="text-xs font-semibold pill px-2 py-0.5 w-fit" style={{background:"var(--accent2)",color:"#0b1f1d"}}>{post.category}</span>
        <h3 className="font-semibold leading-snug line-clamp-2">{post.title}</h3>
        <p className="text-sm opacity-70 line-clamp-2 flex-1">{post.description}</p>
        <div className="flex justify-between text-xs opacity-60 pt-1">
          <span>{fmtSize(post.fileSize)}</span>
          <span>{fmtDate(post.uploadDate)}</span>
        </div>
      </div>
    </div>
  );
}

function Home({ posts, onOpen, setView }){
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 fade-in">
      <div className="mb-10">
        <h1 className="disp text-4xl font-bold mb-3">A clean drop point for your files.</h1>
        <p className="opacity-70 max-w-md mb-5">Browse and download apps, media and docs — organized, searchable, and always up to date.</p>
        <button onClick={()=>setView("browse")} className="btn px-5 py-2.5" style={{background:"var(--accent)",color:"#1c1e22"}}>Browse everything →</button>
      </div>
      <h2 className="disp text-lg font-bold mb-4 opacity-90">Latest</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.slice(0,6).map(p => <Card key={p.id} post={p} onOpen={onOpen} />)}
      </div>
      {posts.length===0 && <Empty text="Nothing uploaded yet." />}
    </div>
  );
}

function Empty({ text }){
  return <div className="text-center py-16 opacity-50"><div className="text-4xl mb-2">📭</div>{text}</div>;
}

function Browse({ posts, search, setSearch, cat, setCat, onOpen }){
  const filtered = posts.filter(p =>
    (cat==="All" || p.category===cat) &&
    (p.title+p.description).toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 fade-in">
      <div className="flex flex-wrap gap-2 mb-6">
        {["All",...CATS].map(c => (
          <button key={c} onClick={()=>setCat(c)} className={"btn pill px-4 py-1.5 text-sm border"} style={{borderColor: cat===c ? "var(--accent)" : "var(--border)", background: cat===c ? "var(--accent)" : "transparent", color: cat===c ? "#1c1e22" : "var(--text)"}}>{c}</button>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => <Card key={p.id} post={p} onOpen={onOpen} />)}
      </div>
      {filtered.length===0 && <Empty text="No files match your search." />}
    </div>
  );
}

function Details({ post, onClose }){
  if(!post) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 fade-in" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="card w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6">
        <div className="aspect-video rounded-lg mb-4 overflow-hidden flex items-center justify-center text-4xl" style={{background:"var(--surface2)"}}>
          {post.thumbUrl ? <img src={post.thumbUrl} className="w-full h-full object-cover"/> : "📦"}
        </div>
        <span className="text-xs font-semibold pill px-2 py-0.5" style={{background:"var(--accent2)",color:"#0b1f1d"}}>{post.category}</span>
        <h2 className="disp text-2xl font-bold mt-2 mb-2">{post.title}</h2>
        <p className="opacity-75 mb-4 whitespace-pre-wrap">{post.description}</p>
        <div className="flex gap-4 text-sm opacity-60 mb-5">
          <span>{fmtSize(post.fileSize)}</span><span>{fmtDate(post.uploadDate)}</span><span>{post.fileName}</span>
        </div>
        {post.fileUrl ? (
          <a href={post.fileUrl} download={post.fileName} className="btn block text-center py-3" style={{background:"var(--accent)",color:"#1c1e22"}}>Download</a>
        ) : <div className="opacity-50 text-sm">File unavailable.</div>}
        <button onClick={onClose} className="btn w-full mt-3 py-2 opacity-70">Close</button>
      </div>
    </div>
  );
}

function Login({ onSuccess, notify }){
  const [u,setU]=useState(""), [p,setP]=useState("");
  const submit = e => {
    e.preventDefault();
    if(u==="Adminjames" && p==="Adminpass"){ onSuccess(); }
    else notify("Incorrect username or password.","error");
  };
  return (
    <div className="max-w-sm mx-auto px-4 py-16 fade-in">
      <div className="card p-7">
        <h2 className="disp text-2xl font-bold mb-1">Admin sign in</h2>
        <p className="text-sm opacity-60 mb-5">Manage uploads for Depot.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input value={u} onChange={e=>setU(e.target.value)} placeholder="Username" className="px-3 py-2.5 rounded-lg text-sm"/>
          <input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Password" className="px-3 py-2.5 rounded-lg text-sm"/>
          <button className="btn py-2.5 mt-1" style={{background:"var(--accent)",color:"#1c1e22"}}>Sign in</button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ posts, notify, reload }){
  const [form, setForm] = useState({ title:"", description:"", category:CATS[0] });
  const [file, setFile] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const MAX_BYTES = 5*1024*1024; // keep well under typical localStorage quotas (~5-10MB total)

  const reset = () => { setForm({title:"",description:"",category:CATS[0]}); setFile(null); setThumb(null); setEditingId(null); };

  const publish = async () => {
    if(!form.title.trim()) return notify("Give it a title first.","error");
    if(!editingId && !file) return notify("Choose a file to upload.","error");
    if(file && file.size > MAX_BYTES) return notify("That file is too big for browser storage — keep uploads under 5 MB, or host large files elsewhere and link out.","error");
    setBusy(true);
    try{
      let fileMeta = {};
      if(file) fileMeta = { fileUrl: await readAsDataURL(file), fileName: file.name, fileSize: file.size };
      let thumbMeta = {};
      if(thumb) thumbMeta = { thumbUrl: await readAsDataURL(thumb) };
      const id = editingId || ("p_"+Date.now());
      const existing = posts.find(p=>p.id===id) || {};
      store.upsert({
        ...existing, id, title: form.title, description: form.description, category: form.category,
        uploadDate: existing.uploadDate || Date.now(), ...fileMeta, ...thumbMeta
      });
      notify(editingId ? "Post updated." : "Post published.");
      reset(); reload();
    }catch(err){ notify("Something went wrong publishing this — the browser's storage may be full.","error"); }
    setBusy(false);
  };

  const edit = p => { setEditingId(p.id); setForm({title:p.title, description:p.description, category:p.category}); window.scrollTo({top:0,behavior:"smooth"}); };
  const del = p => {
    if(!confirm("Delete \""+p.title+"\"?")) return;
    store.remove(p.id); notify("Post deleted."); reload();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 fade-in">
      <h2 className="disp text-2xl font-bold mb-5">{editingId ? "Edit post" : "Upload a new post"}</h2>
      <div className="card p-6 flex flex-col gap-3 mb-10">
        <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Title" className="px-3 py-2.5 rounded-lg text-sm"/>
        <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" rows="3" className="px-3 py-2.5 rounded-lg text-sm"/>
        <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="px-3 py-2.5 rounded-lg text-sm">
          {CATS.map(c=><option key={c}>{c}</option>)}
        </select>
        <label className="text-xs opacity-60">Thumbnail (image, optional)</label>
        <input type="file" accept="image/*" onChange={e=>setThumb(e.target.files[0])} className="text-sm"/>
        <label className="text-xs opacity-60">{editingId ? "Replace file (optional)" : "File (APK, ZIP, image, video…)"}</label>
        <input type="file" onChange={e=>setFile(e.target.files[0])} className="text-sm"/>
        <div className="flex gap-2 mt-2">
          <button onClick={publish} disabled={busy} className="btn px-5 py-2.5 flex items-center gap-2" style={{background:"var(--accent)",color:"#1c1e22"}}>
            {busy && <span className="spin">⟳</span>} {editingId ? "Save changes" : "Publish post"}
          </button>
          {editingId && <button onClick={reset} className="btn px-4 py-2.5 opacity-70">Cancel</button>}
        </div>
      </div>

      <h2 className="disp text-lg font-bold mb-4">All posts ({posts.length})</h2>
      <div className="flex flex-col gap-3">
        {posts.map(p => (
          <div key={p.id} className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-xl" style={{background:"var(--surface2)"}}>
              {p.thumbUrl ? <img src={p.thumbUrl} className="w-full h-full object-cover rounded-lg"/> : "📦"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.title}</div>
              <div className="text-xs opacity-60">{p.category} · {fmtSize(p.fileSize)}</div>
            </div>
            <button onClick={()=>edit(p)} className="btn px-3 py-1.5 text-sm opacity-80">Edit</button>
            <button onClick={()=>del(p)} className="btn px-3 py-1.5 text-sm text-red-400">Delete</button>
          </div>
        ))}
        {posts.length===0 && <Empty text="No posts yet — publish your first one above." />}
      </div>
    </div>
  );
}

function App(){
  const [view, setView] = useState("home");
  const [theme, setTheme] = useState(localStorage.getItem("depot-theme") || "dark");
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [openPost, setOpenPost] = useState(null);
  const [adminSession, setAdminSession] = useState(sessionStorage.getItem("depot-admin")==="1");
  const [toasts, setToasts] = useState([]);

  const notify = (msg, kind="ok") => {
    const id = Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg,kind}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3200);
  };

  const load = () => setPosts(store.list().sort((a,b)=>b.uploadDate-a.uploadDate));
  useEffect(load, []);

  useEffect(()=>{
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("depot-theme", theme);
  }, [theme]);

  const onLoginSuccess = () => { sessionStorage.setItem("depot-admin","1"); setAdminSession(true); setView("dashboard"); notify("Signed in."); };

  return (
    <>
      <Toast toasts={toasts} />
      <Nav view={view} setView={setView} theme={theme} setTheme={setTheme} search={search} setSearch={setSearch} isAdmin={true} adminSession={adminSession} setAdminSession={setAdminSession} />
      {view==="home" && <Home posts={posts} onOpen={setOpenPost} setView={setView} />}
      {view==="browse" && <Browse posts={posts} search={search} setSearch={setSearch} cat={cat} setCat={setCat} onOpen={setOpenPost} />}
      {view==="login" && <Login onSuccess={onLoginSuccess} notify={notify} />}
      {view==="dashboard" && adminSession && <Dashboard posts={posts} notify={notify} reload={load} />}
      <Details post={openPost} onClose={()=>setOpenPost(null)} />
      <footer className="text-center text-xs opacity-40 py-10">Depot — built for quick, organized file sharing.</footer>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
