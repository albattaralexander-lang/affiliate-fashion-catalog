(function(){
  var cfg=window.APP_CONFIG||{}, $=function(i){return document.getElementById(i)};
  var base=(cfg.supabaseUrl||"").replace(/\/$/,""), key=cfg.supabaseAnonKey||"", token=null, items=[], editing=null, busy=false, pending=null, uploaded=null, pvUrl=null,
      BUCKET="product-images", pub=base+"/storage/v1/object/public/product-images/";
    function ok(u){try{var x=new URL(u);return x.protocol==="https:"||x.protocol==="http:"}catch(e){return false}}
  function say(el,t,c){el.textContent=t;el.className="msg "+(c||"")}
  if(!base||!key){say($("top"),"Konfigurasi Supabase belum diisi (js/config.js). Lihat README.");return}
  $("login").hidden=false;
  function api(path,opt){opt=opt||{};var h={apikey:key,Authorization:"Bearer "+(token||key),"Content-Type":"application/json"};
    if(opt.prefer)h.Prefer=opt.prefer;
    return fetch(base+path,{method:opt.method||"GET",headers:h,body:opt.body?JSON.stringify(opt.body):undefined}).then(function(r){
      if(r.status===401){token=null;show(false);say($("top"),"Sesi berakhir. Silakan masuk lagi.","bad")}
      return r.text().then(function(t){var d=t?JSON.parse(t):null;if(!r.ok){var e=new Error((d&&d.message)||"Permintaan gagal");e.status=r.status;e.code=d&&d.code;throw e}return d})})}
  function show(a){$("login").hidden=a;$("app").hidden=!a}
  $("go").onclick=function(){
    if(busy)return;busy=true;say($("top"),"Masuk...");
    fetch(base+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email:$("em").value.trim(),password:$("pw").value})})
      .then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error("Email atau kata sandi salah.");return d})})
      .then(function(d){token=d.access_token;$("pw").value="";show(true);say($("top"),"");return refresh()})
      .catch(function(e){say($("top"),e.message,"bad")}).then(function(){busy=false})};
  $("out").onclick=function(){var t=token;token=null;items=[];show(false);say($("top"),"Kamu sudah keluar.","ok");
    if(t)fetch(base+"/auth/v1/logout",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+t}}).catch(function(){})};
  function refresh(){return api("/rest/v1/products?select=*&order=brand.asc,number.desc").then(function(d){items=d;render();
    if(!d.length)say($("top"),"Daftar kosong. Jika kamu belum terdaftar sebagai admin, data tidak akan tampil (lihat README).")})
    .catch(function(e){say($("top"),"Gagal memuat: "+e.message,"bad")})}
  function render(){
    var pub=items.filter(function(p){return p.status==="published"}).length;
    $("sum").textContent=pub+" terbit, "+(items.length-pub)+" draft";
    var t=$("q").value.trim().toLowerCase(),b=$("fb").value,s=$("fs").value,L=$("list");L.textContent="";
    items.filter(function(p){return(!b||p.brand===b)&&(!s||p.status===s)&&(!t||(p.number+" "+p.name).toLowerCase().indexOf(t)>=0)}).forEach(function(p){
      var r=document.createElement("div");r.className="item";var i=document.createElement("div");
      i.textContent=p.number+". "+p.name+" ";var g=document.createElement("span");g.className="tag";g.textContent=p.status==="published"?"Terbit":"Draft";i.appendChild(g);
      var a=document.createElement("div");a.className="row";
      [["Edit",function(){open(p)}],[p.status==="published"?"Nonaktifkan":"Terbitkan",function(){toggle(p)}],["Hapus",function(){del(p)},"danger"]].forEach(function(x){
        var bt=document.createElement("button");bt.type="button";bt.className="btn "+(x[2]||"sec");bt.textContent=x[0];bt.onclick=x[1];a.appendChild(bt)});
      r.appendChild(i);r.appendChild(a);L.appendChild(r)})}
  ["q","fb","fs"].forEach(function(i){$(i).addEventListener("input",render)});
  function nextNumber(brand){var m=0;items.forEach(function(p){if(p.brand===brand&&p.number>m)m=p.number});return m+1}
  function open(p){editing=p;$("form").hidden=false;$("ft").textContent=p?"Edit nomor "+p.number:"Tambah produk";say($("fm"),"");
    var v=p||{brand:"boys",number:"",name:"",affiliate_url:"",image_url:"",status:"draft"};
    $("brand").value=v.brand;$("code").value=v.number;$("name").value=v.name;
    $("aff").value=v.affiliate_url;$("img").value=v.image_url;$("st").value=v.status;dropPending();$("file").value="";preview(v.image_url);upd();$("form").scrollIntoView()}
  function upd(){var u=$("aff").value.trim();$("test").hidden=!ok(u);if(ok(u))$("test").href=u}
  $("aff").addEventListener("input",upd);$("new").onclick=function(){open(null)};$("cancel").onclick=function(){dropPending();$("form").hidden=true};
  // ---- Foto produk (Supabase Storage, bucket publik "product-images") ----
  function preview(u){if(pvUrl){URL.revokeObjectURL(pvUrl);pvUrl=null}
    if(u&&u.indexOf("blob:")===0)pvUrl=u;
    $("pvw").hidden=!u;if(u)$("prev").src=u}
  function removeFile(url){if(!token||!url||url.indexOf(pub)!==0)return;
    fetch(base+"/storage/v1/object/"+BUCKET+"/"+url.slice(pub.length),{method:"DELETE",headers:{apikey:key,Authorization:"Bearer "+token}}).catch(function(){})}
  function dropPending(){pending=null;if(uploaded){removeFile(uploaded.url);uploaded=null}}
  function shrink(f){return new Promise(function(res,rej){var u=URL.createObjectURL(f),im=new Image();
    im.onload=function(){URL.revokeObjectURL(u);var s=Math.min(1,1200/Math.max(im.width,im.height)),c=document.createElement("canvas");
      c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
      var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
      c.toBlob(function(b){b?res(b):rej(new Error("Gagal memproses foto."))},"image/jpeg",0.85)};
    im.onerror=function(){URL.revokeObjectURL(u);rej(new Error("Foto tidak bisa dibaca."))};im.src=u})}
  function upload(b,brand){
    var path=brand+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+".jpg";
    return fetch(base+"/storage/v1/object/"+BUCKET+"/"+path,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+token,"Content-Type":"image/jpeg","Cache-Control":"max-age=31536000"},body:b})
      .then(function(r){if(r.status===401){token=null;show(false);say($("top"),"Sesi berakhir. Silakan masuk lagi.","bad")}
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
    if(v.status==="published"&&!v.affiliate_url)return"Produk terbit wajib punya URL affiliate.";return""}
  $("save").onclick=function(){
    if(busy)return;var brand=$("brand").value,v={brand:brand,number:$("code").value.trim()||String(nextNumber(brand)),name:$("name").value.trim(),
      affiliate_url:$("aff").value.trim(),image_url:$("img").value.trim(),status:$("st").value};
    var e=validate(v);if(e){say($("fm"),e,"bad");return}v.number=parseInt(v.number,10);
    busy=true;$("save").disabled=true;
    var oldUrl=editing?editing.image_url:"";
    var up;
    if(pending){say($("fm"),"Mengunggah foto...");
      up=(uploaded&&uploaded.blob===pending?Promise.resolve(uploaded.url):upload(pending,brand)).then(function(u){v.image_url=u})}
    else up=Promise.resolve();
    up.then(function(){say($("fm"),"Menyimpan...");
      return editing?api("/rest/v1/products?id=eq."+editing.id,{method:"PATCH",body:v,prefer:"return=representation"}):api("/rest/v1/products",{method:"POST",body:v,prefer:"return=representation"})})
      .then(function(d){if(!d||!d.length)throw new Error("Tidak ada perubahan tersimpan (cek izin admin).");
        pending=null;uploaded=null;$("file").value="";
        if(oldUrl&&oldUrl!==v.image_url)removeFile(oldUrl);
        $("form").hidden=true;say($("top"),"Berhasil disimpan.","ok");return refresh()})
      .catch(function(x){say($("fm"),x.code==="23505"?"Nomor produk sudah dipakai. Ganti nomornya.":"Gagal menyimpan: "+x.message+". Data form tetap aman, coba lagi.","bad")})
      .then(function(){busy=false;$("save").disabled=false})};
  function toggle(p){var s=p.status==="published"?"draft":"published";
    if(s==="published"&&!p.affiliate_url){say($("top"),"Isi URL affiliate dulu sebelum menerbitkan.","bad");return}
    api("/rest/v1/products?id=eq."+p.id,{method:"PATCH",body:{status:s},prefer:"return=representation"}).then(function(d){
      if(!d||!d.length)throw new Error("izin ditolak");say($("top"),"Status diubah.","ok");return refresh()}).catch(function(x){say($("top"),"Gagal: "+x.message,"bad")})}
  function del(p){if(!confirm("Hapus nomor "+p.number+" ("+p.name+") secara permanen?"))return;
    api("/rest/v1/products?id=eq."+p.id,{method:"DELETE",prefer:"return=representation"}).then(function(d){
      if(!d||!d.length)throw new Error("izin ditolak");removeFile(p.image_url);say($("top"),"Produk dihapus.","ok");return refresh()}).catch(function(x){say($("top"),"Gagal menghapus: "+x.message,"bad")})}
})();
