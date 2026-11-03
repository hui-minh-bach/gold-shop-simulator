
(() => {
  'use strict';
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  function relabel(){
    const tap=q('#v3TapHint'); if(tap) tap.textContent='Tap sàn để đi · tap khách để nghe nhu cầu · tap quầy để xử lý trong một tab duy nhất';
    const title=q('.brand-title'); if(title) title.textContent='GOLD SHOP SIMULATOR';
    const sub=q('.brand-sub'); if(sub) sub.textContent=(window.__GOLD_DEBUG__?.state?.started?`${window.__GOLD_DEBUG__.state.storeName||'Tiệm của bạn'} · V6.0`:'V1.0 · Final Visual Real 3D');
    const badge=q('.v3-nav'); if(badge) badge.textContent='◆ V1.0 FULL 3D';
  }
  window.addEventListener('load',()=>setTimeout(relabel,80));
  setTimeout(relabel,80);
})();
