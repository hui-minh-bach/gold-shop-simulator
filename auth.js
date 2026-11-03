(() => {
  'use strict';
  const ACCOUNTS_KEY='goldShopAccountsV1';
  const ACTIVE_KEY='goldShopActiveAccount';
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const norm=s=>String(s||'').trim().replace(/\s+/g,' ');
  const userNorm=s=>norm(s).toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,24);
  function hash(v){let h=2166136261;for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function read(){try{return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||'[]')}catch{return []}}
  function write(a){localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(a))}
  function active(){const id=localStorage.getItem(ACTIVE_KEY);return read().find(x=>x.id===id)||null}
  function setMessage(id,msg,ok=false){const el=q(id);if(!el)return;el.textContent=msg||'';el.classList.toggle('ok',!!ok)}
  function showGate(){q('#authGate')?.classList.remove('hidden');document.body.classList.add('auth-locked')}
  function hideGate(){q('#authGate')?.classList.add('hidden');document.body.classList.remove('auth-locked')}
  function renderProfiles(){
    const el=q('#authProfileList');if(!el)return;const accounts=read();
    el.innerHTML=accounts.length?`<span>Hồ sơ đã tạo trên máy này</span>${accounts.slice(0,4).map(a=>`<button type="button" data-quick-account="${a.id}"><b>${a.displayName}</b><small>@${a.username}</small></button>`).join('')}`:'';
  }
  function activate(id){localStorage.setItem(ACTIVE_KEY,id);location.reload()}
  function init(){
    const gate=q('#authGate');if(!gate)return;
    qa('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>{qa('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));qa('[data-auth-panel]').forEach(p=>p.classList.toggle('active',p.dataset.authPanel===b.dataset.authTab))}));
    q('#loginForm')?.addEventListener('submit',e=>{e.preventDefault();const u=userNorm(q('#loginUser')?.value),pin=String(q('#loginPin')?.value||'');const acc=read().find(a=>a.username===u);if(!acc||acc.pinHash!==hash(pin)){setMessage('#loginMessage','Sai tên đăng nhập hoặc PIN.');return}setMessage('#loginMessage','Đăng nhập thành công.',true);activate(acc.id)});
    q('#registerForm')?.addEventListener('submit',e=>{e.preventDefault();const display=norm(q('#registerName')?.value).slice(0,28),u=userNorm(q('#registerUser')?.value),pin=String(q('#registerPin')?.value||'');if(display.length<2){setMessage('#registerMessage','Tên người chơi cần ít nhất 2 ký tự.');return}if(u.length<3){setMessage('#registerMessage','Tên đăng nhập cần ít nhất 3 ký tự, dùng a-z, số, dấu _ . -');return}if(!/^\d{4,8}$/.test(pin)){setMessage('#registerMessage','PIN cần 4–8 chữ số.');return}const accounts=read();if(accounts.some(a=>a.username===u)){setMessage('#registerMessage','Tên đăng nhập đã tồn tại trên máy này.');return}const id='p_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);accounts.push({id,username:u,displayName:display,pinHash:hash(pin),createdAt:Date.now()});write(accounts);localStorage.setItem(ACTIVE_KEY,id);localStorage.setItem(`goldShopNewProfile:${id}`,'1');location.reload()});
    q('#authProfileList')?.addEventListener('click',e=>{const b=e.target.closest('[data-quick-account]');if(!b)return;const acc=read().find(a=>a.id===b.dataset.quickAccount);if(!acc)return;qa('[data-auth-tab]').find(x=>x.dataset.authTab==='login')?.click();if(q('#loginUser'))q('#loginUser').value=acc.username;q('#loginPin')?.focus()});
    renderProfiles();
    const a=active();if(a)hideGate();else showGate();
  }
  window.__GOLD_AUTH__={read,active,hash,activate,logout(){localStorage.removeItem(ACTIVE_KEY);location.reload()},accountsKey:ACCOUNTS_KEY,activeKey:ACTIVE_KEY};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
