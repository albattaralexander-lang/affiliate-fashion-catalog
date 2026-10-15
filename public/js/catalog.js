(function(){
  var brand=document.body.dataset.brand, grid=document.getElementById("grid"),
      msg=document.getElementById("msg"), q=document.getElementById("q");
  function validUrl(u){try{var x=new URL(u);return x.protocol==="https:"||x.protocol==="http:"}catch(e){return false}}
  var cfg=window.APP_CONFIG||{}, live=!!(cfg.supabaseUrl&&cfg.supabaseAnonKey), data=[];
  function load(){
    if(!live){
      if(!Array.isArray(window.PRODUCTS))return Promise.reject(new Error("data"));
      return Promise.resolve(window.PRODUCTS.filter(function(p){return p.brand===brand&&p.status==="published"})
        .sort(function(a,b){return b.number-a.number}));
    }
    var u=cfg.supabaseUrl.replace(/\/$/,"")+"/rest/v1/products?select=number,name,image_url,affiliate_url&status=eq.published&brand=eq."+encodeURIComponent(brand)+"&order=number.desc";
    return fetch(u,{headers:{apikey:cfg.supabaseAnonKey,Authorization:"Bearer "+cfg.supabaseAnonKey}})
      .then(function(r){if(!r.ok)throw new Error("http");return r.json()})
      .then(function(d){if(!Array.isArray(d))throw new Error("data");return d});
  }
  function card(p){
    var link=validUrl(p.affiliate_url);
    var el=document.createElement(link?"a":"div");el.className="card";
    if(link){el.href=p.affiliate_url;el.target="_blank";el.rel="noopener noreferrer sponsored"}
    var img=document.createElement("div");img.className="img";
    if(p.image_url){var i=document.createElement("img");i.src=p.image_url;i.alt=p.name;i.loading="lazy";
      i.onerror=function(){img.textContent="Gambar tidak tersedia"};img.appendChild(i)}
    else img.textContent="Foto belum tersedia";
    var t=document.createElement("div");t.className="title";t.textContent=p.number+". "+p.name;
    el.appendChild(img);el.appendChild(t);return el}
  function render(){
    var t=q.value.trim().toLowerCase();
    var r=data.filter(function(p){return !t||(p.number+". "+p.name).toLowerCase().indexOf(t)>=0});
    grid.textContent="";r.forEach(function(p){grid.appendChild(card(p))});
    msg.textContent=r.length?"":"Produk tidak ditemukan.";
  }
  q.addEventListener("input",render);
  load().then(function(d){data=d;render()}).catch(function(){msg.textContent="Data produk gagal dimuat. Coba muat ulang halaman."});
})();
