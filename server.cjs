// SmartPort local server — no npm install needed. Run: node server.js
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const PORT=process.env.PORT||3000,ROOT=path.join(__dirname,"dist"),DB=path.join(__dirname,"data","users.json");
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".jpg":"image/jpeg",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon"};
const ROLES=["A","G","Y","D","B"],ADMIN_CODE="SMART-ADMIN",EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const hash=(p,salt=crypto.randomBytes(16).toString("hex"))=>({salt,h:crypto.scryptSync(p,salt,64).toString("hex")});
const same=(p,u)=>{const a=Buffer.from(crypto.scryptSync(p,u.salt,64).toString("hex")),b=Buffer.from(u.h);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
function load(){try{return JSON.parse(fs.readFileSync(DB,"utf8"))}catch(_e){return null}}
function save(u){fs.mkdirSync(path.dirname(DB),{recursive:true});fs.writeFileSync(DB,JSON.stringify(u,null,2))}
let users=load();
if(!users){users=[["Demo Admin","admin@smartport.pk","Admin@123","A"],["Demo Gate Officer","gate@smartport.pk","Gate@123","G"],["Demo Yard Supervisor","yard@smartport.pk","Yard@123","Y"],["Demo Documentation Clerk","docs@smartport.pk","Docs@123","D"],["Demo Billing Clerk","billing@smartport.pk","Bill@123","B"]].map(([n,e,p,r])=>({n,e,r,...hash(p)}));save(users)}
const pub=u=>({n:u.n,e:u.e,r:u.r});
const send=(res,code,obj)=>{res.writeHead(code,{"Content-Type":"application/json"});res.end(JSON.stringify(obj))};
function body(req){return new Promise((ok,no)=>{let b="";req.on("data",c=>{b+=c;if(b.length>1e4){no(new Error("too big"));req.destroy()}});req.on("end",()=>{try{ok(JSON.parse(b||"{}"))}catch(e){no(e)}});req.on("error",no)})}
async function api(req,res,url){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  let d;try{d=await body(req)}catch(_e){return send(res,400,{error:"Bad request."})}
  const email=String(d.email||"").trim().toLowerCase(),pw=String(d.password||"");
  if(url==="/api/login"){
    const u=users.find(x=>x.e===email);
    if(!u||!same(pw,u))return send(res,401,{error:"Email or password is incorrect."});
    return send(res,200,{user:pub(u)});
  }
  if(url==="/api/signup"){
    const name=String(d.name||"").trim(),role=String(d.role||"");
    if(name.length<2)return send(res,400,{error:"Enter your full name."});
    if(!EMAIL.test(email))return send(res,400,{error:"Enter a valid email address."});
    if(pw.length<8||!/[a-z]/i.test(pw)||!/\d/.test(pw))return send(res,400,{error:"Use 8+ characters with a letter and a number."});
    if(!ROLES.includes(role))return send(res,400,{error:"Pick a role."});
    if(role==="A"&&String(d.invite||"").trim()!==ADMIN_CODE)return send(res,400,{error:"Admin accounts need the invite code "+ADMIN_CODE+"."});
    if(users.some(x=>x.e===email))return send(res,409,{error:"That email already has an account."});
    const u={n:name,e:email,r:role,...hash(pw)};users.push(u);save(users);
    return send(res,201,{user:pub(u)});
  }
  send(res,404,{error:"Not found"});
}
http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split("?")[0]);
  if(url.startsWith("/api/"))return api(req,res,url).catch(()=>send(res,500,{error:"Server error."}));
  let f=path.normalize(path.join(ROOT,url==="/"?"index.html":url));
  const rel=path.relative(ROOT,f);
  if(rel.startsWith("..")||false){res.writeHead(403);return res.end("Forbidden")}
  fs.readFile(f,(err,buf)=>{
    if(err&&!path.extname(f)){ // SPA fallback: /dashboard, /login ... all serve index.html
      return fs.readFile(path.join(ROOT,"index.html"),(e2,b2)=>{
        if(e2){res.writeHead(404,{"Content-Type":"text/plain"});return res.end("Not found")}
        res.writeHead(200,{"Content-Type":MIME[".html"]});res.end(b2);
      });
    }
    if(err){res.writeHead(404,{"Content-Type":"text/plain"});return res.end("Not found")}
    res.writeHead(200,{"Content-Type":MIME[path.extname(f)]||"application/octet-stream"});res.end(buf);
  });
}).listen(PORT,()=>console.log(`\nSmartPort chal raha hai: http://localhost:${PORT}\n(Band karne ke liye Ctrl+C)\n`));
