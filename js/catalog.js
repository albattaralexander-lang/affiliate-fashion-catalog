(function(){
  var brand=document.body.dataset.brand, grid=document.getElementById("grid"),
      msg=document.getElementById("msg"), q=document.getElementById("q"), cat=document.getElementById("cat");
  function rupiah(n){return "Rp"+Number(n).toLocaleString("id-ID")}
  function validUrl(u){try{var x=new URL(u);return x.protocol==="https:"||x.protocol==="http:"}catch(e){return false}}
  var data;
  try{
    if(!Array.isArray(window.PRODUCTS))throw new Error("data");
    data=window.PRODUCTS.filter(function(p){return p.brand===brand&&p.status==="published"});
  }catch(e){msg.textContent="Data produk gagal dimuat. Coba muat ulang halaman.";return}
  var cats=[];data.forEach(function(p){if(cats.indexOf(p.category)<0)cats.push(p.category)});
  cats.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c;cat.appendChild(o)});
  function card(p){
    var li=document.createElement("article");li.className="card";
    var img=document.createElement("div");img.className="img";
    if(p.image_url){var i=document.createElement("img");i.src=p.image_url;i.alt=p.name;i.loading="lazy";
      i.onerror=function(){img.textContent="Gambar tidak tersedia"};img.appendChild(i)}
    else img.textContent="Foto belum tersedia";
    var info=document.createElement("div");info.className="info";
    [["code",p.product_code],["",p.name],["price",rupiah(p.price)]].forEach(function(r){
      var d=document.createElement("div");if(r[0])d.className=r[0];d.textContent=r[1];info.appendChild(d)});
    var n=document.createElement("div");n.className="note";n.textContent="Harga akhir mengikuti halaman marketplace.";info.appendChild(n);
    if(validUrl(p.affiliate_url)){
      var a=document.createElement("a");a.className="btn";a.href=p.affiliate_url;a.target="_blank";
      a.rel="noopener noreferrer sponsored";a.textContent="Lihat di "+(p.marketplace==="tiktok_shop"?"TikTok Shop":"Shopee");info.appendChild(a)}
    li.appendChild(img);li.appendChild(info);return li}
  function render(){
    var t=q.value.trim().toLowerCase(),c=cat.value;
    var r=data.filter(function(p){return (!c||p.category===c)&&(!t||(p.name+" "+p.product_code).toLowerCase().indexOf(t)>=0)});
    grid.textContent="";r.forEach(function(p){grid.appendChild(card(p))});
    msg.textContent=r.length?"":"Produk tidak ditemukan.";
  }
  q.addEventListener("input",render);cat.addEventListener("change",render);render();
})();
