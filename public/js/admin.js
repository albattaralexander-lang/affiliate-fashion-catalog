(function(){
  var cfg=window.APP_CONFIG||{}, $=function(i){return document.getElementById(i)};
  var base=(cfg.supabaseUrl||"").replace(/\/$/,""), key=cfg.supabaseAnonKey||"", token=null, rt=null, exp=0, renewing=null, SK="admin_session", items=[], editing=null, busy=false, pending=null, uploaded=null, pvUrl=null,
      BUCKET="product-images", pub=base+"/storage/v1/object/public/product-images/";
    function ok(u){try{var x=new URL(u);return x.protocol==="https:"||x.protocol==="http:"}catch(e){return false}}
  function svg(p){return'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+p+'</svg>'}
  var ICON={
    edit:svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
    copy:svg('<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    eye:svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
    eyeoff:svg('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'),
    trash:svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>')};
  function say(el,t,c){el.textContent=t;el.className="msg "+(c||"")}
  if(!base||!key){say($("top"),"Konfigurasi Supabase belum diisi (js/config.js). Lihat README.");return}
  $("login").hidden=false;
  // ---- Sesi tersimpan: login sekali, token diperbarui otomatis ----
  function saveSess(d){token=d.access_token;rt=d.refresh_token;exp=Date.now()+(d.expires_in||3600)*1000;
    try{localStorage.setItem(SK,JSON.stringify({a:token,r:rt,e:exp}))}catch(e){}}
  function clearSess(){token=null;rt=null;exp=0;try{localStorage.removeItem(SK)}catch(e){}}
  function expired(){clearSess();items=[];show(false);say($("top"),"Sesi berakhir. Silakan masuk lagi.","bad")}
  function renew(){if(!rt)return Promise.reject(new Error("expired"));if(renewing)return renewing;
    renewing=fetch(base+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:rt})})
      .then(function(r){return r.json().then(function(d){
        if(r.ok&&d.access_token){saveSess(d);return}
        if(r.status>=400&&r.status<500){clearSess();throw new Error("expired")}
        throw new Error("Server sedang bermasalah, coba lagi.")},function(){throw new Error("Server sedang bermasalah, coba lagi.")})},
        function(){throw new Error("Tidak ada koneksi internet.")})
      .then(function(v){renewing=null;return v},function(x){renewing=null;throw x});
    return renewing}
  function fresh(){return token&&Date.now()>exp-60000?renew():Promise.resolve()}
  function api(path,opt){opt=opt||{};
    return fresh().then(function(){
      var h={apikey:key,Authorization:"Bearer "+(token||key),"Content-Type":"application/json"};
      if(opt.prefer)h.Prefer=opt.prefer;
      return fetch(base+path,{method:opt.method||"GET",headers:h,body:opt.body?JSON.stringify(opt.body):undefined})}).then(function(r){
      if(r.status===401&&token&&!opt.retried){opt.retried=true;return renew().then(function(){return api(path,opt)})}
      if(r.status===401)expired();
      return r.text().then(function(t){var d=t?JSON.parse(t):null;if(!r.ok){var e=new Error((d&&d.message)||"Permintaan gagal");e.status=r.status;e.code=d&&d.code;throw e}return d})})
      .catch(function(x){if(x&&x.message==="expired")expired();throw x})}
  function show(a){if(!a&&$("form").open)closeForm();$("login").hidden=a;$("app").hidden=!a}
  $("go").onclick=function(){
    if(busy)return;busy=true;say($("top"),"Masuk...");
    fetch(base+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email:$("em").value.trim(),password:$("pw").value})})
      .then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error("Email atau kata sandi salah.");return d})})
      .then(function(d){saveSess(d);$("pw").value="";show(true);say($("top"),"");return refresh()})
      .catch(function(e){say($("top"),e.message,"bad")}).then(function(){busy=false})};
  $("out").onclick=function(){var t=token;clearSess();items=[];show(false);say($("top"),"Kamu sudah keluar.","ok");
    if(t)fetch(base+"/auth/v1/logout",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+t}}).catch(function(){})};
  function refresh(){return api("/rest/v1/products?select=*&order=brand.asc,number.desc").then(function(d){items=d;render();
    if(!d.length)say($("top"),"Daftar kosong. Jika kamu belum terdaftar sebagai admin, data tidak akan tampil (lihat README).")})
    .catch(function(e){say($("top"),"Gagal memuat: "+e.message,"bad")})}
  function render(){
    var pub=items.filter(function(p){return p.status==="published"}).length;
    $("sum").textContent=pub+" terbit, "+(items.length-pub)+" nonaktif";
    var t=$("q").value.trim().toLowerCase(),b=$("fb").value,s=$("fs").value,L=$("list");L.textContent="";
    items.filter(function(p){return(!b||p.brand===b)&&(!s||p.status===s)&&(!t||(p.number+" "+p.name).toLowerCase().indexOf(t)>=0)}).forEach(function(p){
      var r=document.createElement("div");r.className="item";var i=document.createElement("div");
      i.textContent=p.number+". "+p.name+" ";
      var a=document.createElement("div");a.className="row";
      var pb=p.status==="published",sw=document.createElement("button");sw.type="button";sw.className="swr";
      sw.setAttribute("role","switch");sw.setAttribute("aria-checked",pb?"true":"false");sw.setAttribute("aria-label","Terbit nomor "+p.number);
      sw.innerHTML='<span class="sw"></span><span class="swt">'+(pb?"Terbit":"Nonaktif")+'</span>';sw.onclick=function(){toggle(p,sw)};a.appendChild(sw);
      [["Edit","edit",function(){open(p)}],["Duplikat","copy",function(){open(null,p)}],["Hapus","trash",function(){del(p)},"danger"]].forEach(function(x){
        var bt=document.createElement("button");bt.type="button";bt.className="btn ic "+(x[3]||"sec");bt.title=x[0];bt.setAttribute("aria-label",x[0]+" nomor "+p.number);bt.innerHTML=ICON[x[1]];bt.onclick=x[2];a.appendChild(bt)});
      r.appendChild(i);r.appendChild(a);L.appendChild(r)})}
  ["q","fb","fs"].forEach(function(i){$(i).addEventListener("input",render)});
  function nextNumber(brand){var m=0;items.forEach(function(p){if(p.brand===brand&&p.number>m)m=p.number});return m+1}
  function open(p,src){editing=p;var fm=$("form");if(!fm.open){if(fm.showModal)fm.showModal();else fm.setAttribute("open","")}$("ft").textContent=p?"Edit nomor "+p.number:src?"Duplikat dari nomor "+src.number:"Tambah produk";
    say($("fm"),src?"Nomor otomatis. Ubah seperlunya lalu klik Simpan.":"");
    var v=p||(src?{brand:src.brand,number:"",name:src.name,affiliate_url:src.affiliate_url,image_url:src.image_url,status:"draft"}:{brand:"boys",number:"",name:"",affiliate_url:"",image_url:"",status:"draft"});
    $("brand").value=v.brand;$("code").value=v.number;$("name").value=v.name;
    $("aff").value=v.affiliate_url;$("img").value=v.image_url;dropPending();$("file").value="";preview(v.image_url);upd();fm.scrollTop=0}
  function closeForm(){var fm=$("form");if(fm.close)fm.close();else fm.removeAttribute("open")}
  function upd(){var u=$("aff").value.trim();$("test").hidden=!ok(u);if(ok(u))$("test").href=u}
  $("aff").addEventListener("input",upd);$("new").onclick=function(){open(null)};$("cancel").onclick=$("x").onclick=function(){if(!busy)closeForm()};
  $("form").addEventListener("cancel",function(e){if(busy)e.preventDefault()});
  $("form").addEventListener("close",function(){dropPending()});
  // ---- Foto produk (Supabase Storage, bucket publik "product-images") ----
  function preview(u){if(pvUrl){URL.revokeObjectURL(pvUrl);pvUrl=null}
    if(u&&u.indexOf("blob:")===0)pvUrl=u;
    $("pvw").hidden=!u;if(u)$("prev").src=u}
  function removeFile(url){if(!token||!url||url.indexOf(pub)!==0)return;
    fetch(base+"/storage/v1/object/"+BUCKET+"/"+url.slice(pub.length),{method:"DELETE",headers:{apikey:key,Authorization:"Bearer "+token}}).catch(function(){})}
  function inUse(url,exceptId){return items.some(function(o){return o.id!==exceptId&&o.image_url===url})}
  function dropPending(){pending=null;if(uploaded){removeFile(uploaded.url);uploaded=null}}
  function shrink(f){return new Promise(function(res,rej){var u=URL.createObjectURL(f),im=new Image();
    im.onload=function(){URL.revokeObjectURL(u);var s=Math.min(1,1200/Math.max(im.width,im.height)),c=document.createElement("canvas");
      c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
      var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
      c.toBlob(function(b){b?res(b):rej(new Error("Gagal memproses foto."))},"image/jpeg",0.85)};
    im.onerror=function(){URL.revokeObjectURL(u);rej(new Error("Foto tidak bisa dibaca."))};im.src=u})}
  function upload(b,brand){
    var path=brand+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+".jpg";
    return fresh().then(function(){return fetch(base+"/storage/v1/object/"+BUCKET+"/"+path,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+token,"Content-Type":"image/jpeg","Cache-Control":"max-age=31536000"},body:b})})
      .then(function(r){if(r.status===401)expired();
        return r.json().catch(function(){return{}}).then(function(d){
          if(!r.ok)throw new Error(r.status===401?"sesi berakhir":(d&&d.message)||"upload gagal (cek bucket & izin admin, lihat README)");
          uploaded={blob:b,url:pub+path};return uploaded.url})})}
  $("file").addEventListener("change",function(){var f=this.files[0];if(!f)return;var inp=this;
    if(!/^image\/(jpeg|png|webp)$/.test(f.type)){say($("fm"),"Format harus JPG, PNG, atau WebP.","bad");inp.value="";return}
    if(f.size>20*1024*1024){say($("fm"),"File terlalu besar (maks 20 MB).","bad");inp.value="";return}
    say($("fm"),"Memproses foto...");
    shrink(f).then(function(b){dropPending();pending=b;$("img").value="";preview(URL.createObjectURL(b));
      say($("fm"),"Foto siap ("+Math.round(b.size/1024)+" KB). Klik Simpan untuk mengunggah.","ok")})
      .catch(function(e){inp.value="";say($("fm"),e.message,"bad")})});
  $("img").addEventListener("input",function(){var u=this.value.trim();if(pending||uploaded){dropPending();$("file").value=""}preview(ok(u)?u:"")});
  $("rmph").onclick=function(){dropPending();$("file").value="";$("img").value="";preview("");say($("fm"),"Foto dihapus dari form. Klik Simpan untuk menerapkan.","")};
  $("prev").onerror=function(){say($("fm"),"Pratinjau gambar gagal dimuat (cek URL).","bad")};
  function validate(v){
    if(!v.name)return"Nama wajib diisi.";
    if(!/^\d+$/.test(String(v.number))||parseInt(v.number,10)<1)return"Nomor produk harus angka bulat mulai 1.";
    if(v.affiliate_url&&!ok(v.affiliate_url))return"URL affiliate harus diawali http(s)://";
    if(v.image_url&&!ok(v.image_url))return"URL gambar harus diawali http(s)://";
    if(v.status==="published"&&!v.affiliate_url)return"Produk terbit wajib punya URL affiliate (atau nonaktifkan dulu).";return""}
  $("save").onclick=function(){
    if(busy)return;var brand=$("brand").value,v={brand:brand,number:$("code").value.trim()||String(nextNumber(brand)),name:$("name").value.trim(),
      affiliate_url:$("aff").value.trim(),image_url:$("img").value.trim()};
    v.status=editing?editing.status:(v.affiliate_url?"published":"draft");
    var e=validate(v);if(e){say($("fm"),e,"bad");return}v.number=parseInt(v.number,10);
    busy=true;$("save").disabled=true;
    var oldUrl=editing?editing.image_url:"",eid=editing?editing.id:null;
    var up;
    if(pending){say($("fm"),"Mengunggah foto...");
      up=(uploaded&&uploaded.blob===pending?Promise.resolve(uploaded.url):upload(pending,brand)).then(function(u){v.image_url=u})}
    else up=Promise.resolve();
    up.then(function(){say($("fm"),"Menyimpan...");
      return eid?api("/rest/v1/products?id=eq."+eid,{method:"PATCH",body:v,prefer:"return=representation"}):api("/rest/v1/products",{method:"POST",body:v,prefer:"return=representation"})})
      .then(function(d){if(!d||!d.length)throw new Error("Tidak ada perubahan tersimpan (cek izin admin).");
        pending=null;uploaded=null;$("file").value="";
        if(oldUrl&&oldUrl!==v.image_url&&!inUse(oldUrl,eid))removeFile(oldUrl);
        closeForm();say($("top"),!eid&&v.status==="draft"?"Disimpan sebagai Nonaktif karena URL affiliate masih kosong. Isi URL lalu aktifkan.":"Berhasil disimpan.",!eid&&v.status==="draft"?"":"ok");return refresh()})
      .catch(function(x){say($("fm"),x.code==="23505"?"Nomor produk sudah dipakai. Ganti nomornya.":"Gagal menyimpan: "+x.message+". Data form tetap aman, coba lagi.","bad")})
      .then(function(){busy=false;$("save").disabled=false})};
  function toggle(p,sw){var s=p.status==="published"?"draft":"published";
    if(s==="published"&&!p.affiliate_url){say($("top"),"Isi URL affiliate dulu sebelum mengaktifkan.","bad");return}
    if(sw){sw.disabled=true;sw.setAttribute("aria-checked",s==="published"?"true":"false")}
    api("/rest/v1/products?id=eq."+p.id,{method:"PATCH",body:{status:s},prefer:"return=representation"}).then(function(d){
      if(!d||!d.length)throw new Error("izin ditolak");say($("top"),s==="published"?"Produk terbit.":"Produk dinonaktifkan.","ok");return refresh()}).catch(function(x){say($("top"),"Gagal: "+x.message,"bad");return refresh()})}
  function del(p){if(!confirm("Hapus nomor "+p.number+" ("+p.name+") secara permanen?"))return;
    api("/rest/v1/products?id=eq."+p.id,{method:"DELETE",prefer:"return=representation"}).then(function(d){
      if(!d||!d.length)throw new Error("izin ditolak");if(!inUse(p.image_url,p.id))removeFile(p.image_url);say($("top"),"Produk dihapus.","ok");return refresh()}).catch(function(x){say($("top"),"Gagal menghapus: "+x.message,"bad")})}
  try{var s0=JSON.parse(localStorage.getItem(SK)||"null");if(s0&&s0.r){token=s0.a;rt=s0.r;exp=s0.e||0}}catch(e){}
  if(rt){$("login").hidden=true;say($("top"),"Memuat sesi...");
    fresh().then(function(){show(true);say($("top"),"");return refresh()})
      .catch(function(x){if(x&&x.message==="expired"){expired();return}show(false);say($("top"),(x&&x.message)||"Gagal memuat.","bad")})}
})();
