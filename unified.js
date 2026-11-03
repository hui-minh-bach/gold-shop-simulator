(() => {
  'use strict';
  const D=window.__GOLD_DEBUG__; if(!D||!D.state)return;
  const state=D.state,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const short=n=>{n=Number(n)||0;const a=Math.abs(n);if(a>=1e9)return (n/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ';if(a>=1e6)return (n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu';return new Intl.NumberFormat('vi-VN').format(Math.round(n))+'đ'};
  const fmt=n=>new Intl.NumberFormat('vi-VN').format(Math.round(Number(n)||0))+'đ';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const titles={startup:'Tài khoản / Thiết lập / Khởi nghiệp',shop:'Quầy giao dịch & máy tính',inventory:'Kho / SKU / nguồn hàng',pawn:'Cầm đồ',finance:'Tài chính & dòng tiền',management:'Giá bán · công bán · nhân viên',customers:'Khách hàng / CRM',campaign:'Chiến dịch / Thành tựu',academy:'Học nghề',map:'Bản đồ thị trường',kbl:'Đối tác / Chành cung cấp',report:'Báo cáo kinh doanh'};
  const drawer=$('#unifiedDrawer'),body=$('#unifiedDrawerBody'),title=$('#unifiedDrawerTitle');
  const pages={};

  function adopt(view){
    const src=$(`#view-${view}`); if(!src)return;
    const page=document.createElement('div');page.className='drawer-page';page.dataset.drawerPage=view;
    while(src.firstChild)page.appendChild(src.firstChild);
    body.appendChild(page);pages[view]=page;
  }
  ['shop','inventory','pawn','finance','management','customers','campaign','academy','map'].forEach(adopt);

  function startupPage(){
    let page=pages.startup;
    if(!page){page=document.createElement('div');page.className='drawer-page startup-drawer-page';page.dataset.drawerPage='startup';body.appendChild(page);pages.startup=page;}
    const acc=window.__GOLD_AUTH__?.active?.();
    if(!state.started){
      page.innerHTML=`<div class="startup-panel"><span class="eyebrow">HỒ SƠ & KHỞI NGHIỆP</span><h2>${esc(acc?.displayName||'Người chơi')}</h2><p>Hồ sơ đã đăng nhập. Hãy hoàn tất tên tiệm, mặt bằng, phong cách, thiết bị, vốn và chính sách trước khi khai trương.</p><div class="startup-summary-grid"><div><span>Tên đăng nhập</span><strong>@${esc(acc?.username||'local')}</strong></div><div><span>Save</span><strong>Riêng theo hồ sơ</strong></div></div><div class="startup-actions"><button class="btn primary" data-startup-action="open-setup" type="button">MỞ THIẾT LẬP KHỞI NGHIỆP</button><button class="btn ghost" data-startup-action="logout" type="button">ĐĂNG XUẤT</button></div></div>`;
      return;
    }
    const loc=state.location?.name||'—',tier=state.tier?.name||'—',store=state.storeName||'Tiệm của bạn',owner=state.ownerName||acc?.displayName||'Bạn',alloc=state.allocations||{},pol=state.policies||{};
    const equip=[...(state.equipment||[])];
    page.innerHTML=`<div class="startup-panel live"><span class="eyebrow">TÀI KHOẢN & CÀI ĐẶT GAME</span><h2>${esc(store)}</h2><p class="startup-owner">Hồ sơ: ${esc(acc?.displayName||owner)} · @${esc(acc?.username||'local')}</p>
      <div class="startup-edit-grid"><label><span>Tên tiệm hiển thị</span><input id="settingsStoreName" maxlength="28" value="${esc(store)}"></label><label><span>Tên chủ tiệm hiển thị</span><input id="settingsOwnerName" maxlength="24" value="${esc(owner)}"></label></div>
      <div class="startup-toggles"><label><input id="settingsVoice" type="checkbox" ${state.settings?.voice?'checked':''}> <span>Giọng đọc tiếng Việt</span></label><label><input id="settingsTutorial" type="checkbox" ${state.settings?.tutorial!==false?'checked':''}> <span>Gợi ý / hướng dẫn nghề</span></label></div>
      <button class="btn primary" data-startup-action="save-settings" type="button">LƯU CÀI ĐẶT HIỂN THỊ</button>
      <h3>Cấu hình khởi nghiệp đã chọn</h3><p>Đây là cấu hình đang vận hành. Nếu muốn chọn lại mặt bằng, thiết bị, vốn và chính sách, hãy tạo game mới bằng nút bên dưới; hệ thống sẽ mở lại đầy đủ màn nhập thông tin ban đầu.</p><div class="startup-summary-grid">
      <div><span>Mặt bằng</span><strong>${esc(loc)}</strong></div><div><span>Phong cách</span><strong>${esc(tier)}</strong></div>
      <div><span>Vốn nhập hàng</span><strong>${short(alloc.inventory||0)}</strong></div><div><span>Quỹ cầm đồ</span><strong>${short(alloc.pawn||0)}</strong></div>
      <div><span>Marketing</span><strong>${short(alloc.marketing||0)}</strong></div><div><span>Dự phòng</span><strong>${short(alloc.reserve||0)}</strong></div>
      <div><span>Thiết bị</span><strong>${equip.length} mục</strong></div><div><span>Phí đổi</span><strong>${fmt(pol.exchangeFeePerChi||0)}/chỉ</strong></div>
      </div><div class="startup-policy-note">Cầm ≤20tr ${(Number(pol.pawnUpTo20||0)*100).toFixed(1)}% · 20–50tr ${(Number(pol.pawn20To50||0)*100).toFixed(1)}% · >50tr ${(Number(pol.pawnOver50||0)*100).toFixed(1)}% / tháng tổng.</div>
      <div class="startup-reconfigure"><h4>Muốn thay đổi thông tin đầu vào?</h4><p>Tạo game mới sẽ đưa bạn về đúng luồng: hồ sơ → tên tiệm → mặt bằng → phong cách → thiết bị → phân bổ 10 tỷ → chính sách cầm/đổi → khai trương.</p><button class="btn danger wide" data-startup-action="restart" type="button">TẠO GAME MỚI & MỞ LẠI THIẾT LẬP ĐẦU VÀO</button></div><div class="startup-actions"><button class="btn ghost" data-startup-action="close" type="button">TIẾP TỤC CHƠI</button><button class="btn ghost" data-startup-action="logout" type="button">ĐĂNG XUẤT</button></div></div>`;
  }


  function reportPage(){
    let page=pages.report;if(!page){page=document.createElement('div');page.className='drawer-page custom-report';page.dataset.drawerPage='report';body.appendChild(page);pages.report=page;}
    const h=state.history?.[0],d=state.daily||{};
    const net=h?.net ?? ((d.salesRevenue||0)+(d.serviceRevenue||0)+(d.pawnIncome||0)+(d.branchIncome||0)-(d.cogs||0)-(d.chanhLoss||0)-(d.repairCost||0)-(d.staffLoss||0)-(d.operatingExpense||0)-(d.branchExpense||0)-(d.oneOffExpense||0)-(d.interestExpense||0));
    page.innerHTML=`<div class="section-intro"><div><span class="eyebrow">BÁO CÁO NHANH</span><h2>Ngày ${state.day} · ${net>=0?'Đang có lãi':'Đang lỗ'}</h2><p>Xem kết quả ngay trong cửa hàng, không rời khỏi màn chơi.</p></div></div><div class="compact-report-grid">${[
      ['Tiền mặt',state.cash],['Giá trị kho',D.inventoryValue()],['Dư nợ cầm',D.pawnReceivable()],['Phải trả chành',D.supplierPayable()],['Nợ ngân hàng',state.bankDebt],['Tài sản ròng',D.netWorth()],['Doanh thu vàng',d.salesRevenue||0],['Lợi nhuận hiện tại',net]
    ].map(([a,b])=>`<div class="compact-report-card"><span>${a}</span><strong style="color:${a==='Lợi nhuận hiện tại'?(b>=0?'#7fe1a4':'#ff8f8f'):'#fff'}">${a==='Lợi nhuận hiện tại'&&b>=0?'+':''}${short(b)}</strong></div>`).join('')}</div>`;
  }
  function kblPage(){
    let page=pages.kbl;if(!page){page=document.createElement('div');page.className='drawer-page';page.dataset.drawerPage='kbl';body.appendChild(page);pages.kbl=page;}
    const suppliers=(state.suppliers||[]).slice();
    page.innerHTML=`<div class="section-intro"><div><span class="eyebrow">ĐỐI TÁC / CHÀNH CUNG CẤP</span><h2>Mạng lưới nguồn hàng của tiệm</h2><p>Không có giao diện dành riêng cho một chành. Mỗi chành là một đối tác trong cùng hệ thống và được so sánh theo nhóm hàng, uy tín gameplay, hạn mức và công nợ.</p></div></div>
      <div class="supplier-network-grid">${suppliers.map(s=>`<article class="supplier-network-card ${s.featured?'featured':''}"><h4>${esc(s.name)}</h4><p>${esc(s.focus||'Nguồn hàng tổng hợp')}</p><div class="supplier-network-metrics"><div><span>Uy tín</span><b>${Math.round(s.rating||0)}/100</b></div><div><span>Hạn mức</span><b>${short(s.creditLimit||0)}</b></div><div><span>Công nợ</span><b>${short(s.balance||0)}</b></div></div></article>`).join('')}</div>
      <div class="panel" style="margin-top:12px"><div class="panel-head compact"><h3>Thao tác nguồn hàng</h3></div><p style="color:var(--muted);line-height:1.6">Chọn chành ở khu Kho / SKU để nhập lô hàng bằng tiền mặt hoặc công nợ. Công nợ vẫn theo dõi riêng cho từng đối tác.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-open-drawer="inventory" type="button">Nhập hàng / xem SKU</button><button class="btn ghost" data-open-drawer="finance" type="button">Xem công nợ</button></div></div>`;
  }
  function prep(view){
    D.renderAll?.();
    if(view==='startup')startupPage();
    if(view==='inventory')D.renderInventory?.();
    if(view==='pawn')D.renderPawn?.();
    if(view==='finance')D.renderFinance?.();
    if(view==='customers')D.renderCustomers?.();
    if(view==='campaign')D.renderCampaign?.();
    if(view==='academy')D.renderAcademy?.();
    if(view==='map')D.renderMap?.();
    if(view==='report')reportPage(); if(view==='kbl')kblPage();
  }
  function open(view){
    if(!state.started && view!=='startup')return;
    prep(view); Object.values(pages).forEach(p=>p.classList.remove('active'));
    const page=pages[view]; if(!page)return; page.classList.add('active');
    title.textContent=titles[view]||'Cửa hàng'; drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');
    $$('.dock-btn').forEach(b=>b.classList.toggle('active',b.dataset.unified===view));
  }
  function close(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');$$('.dock-btn').forEach(b=>b.classList.remove('active'));}
  function showStartupScreen(){close();document.body.classList.remove('immersive-mode');$$('.view').forEach(v=>v.classList.remove('active'));$('#view-setup')?.classList.add('active');setTimeout(()=>window.dispatchEvent(new Event('resize')),30);}
  function enterImmersive(){
    if(!state.started)return;document.body.classList.add('immersive-mode');$$('.view').forEach(v=>v.classList.remove('active'));$('#view-store3d')?.classList.add('active');setTimeout(()=>window.dispatchEvent(new Event('resize')),30);
  }

  $$('.dock-btn').forEach(b=>b.addEventListener('click',()=>open(b.dataset.unified)));
  $('#startupQuickBtn')?.addEventListener('click',()=>{if(state.started)open('startup');else showStartupScreen();});
  $('#accountBtn')?.addEventListener('click',()=>open('startup'));
  $('#unifiedDrawerClose')?.addEventListener('click',close);
  body.addEventListener('click',e=>{
    const b=e.target.closest('[data-open-drawer]');if(b)open(b.dataset.openDrawer);
    const s=e.target.closest('[data-startup-action]');if(!s)return;
    const a=s.dataset.startupAction;
    if(a==='open-setup')showStartupScreen();
    if(a==='close')close();
    if(a==='logout')window.__GOLD_AUTH__?.logout?.();
    if(a==='save-settings'){const sn=$('#settingsStoreName'),on=$('#settingsOwnerName'),voice=$('#settingsVoice'),tut=$('#settingsTutorial');if(sn)state.storeName=String(sn.value||state.storeName).trim().replace(/\s+/g,' ').slice(0,28)||state.storeName;if(on)state.ownerName=String(on.value||state.ownerName).trim().replace(/\s+/g,' ').slice(0,24)||state.ownerName;state.settings=state.settings||{};if(voice)state.settings.voice=voice.checked;if(tut)state.settings.tutorial=tut.checked;D.renderAll?.();D.save?.(true);startupPage();}
    if(a==='restart')document.querySelector('#resetBtn')?.click();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  $('#startGameBtn')?.addEventListener('click',()=>setTimeout(enterImmersive,120));
  if(state.started)enterImmersive();

  // expose to v3 so station interactions open in-game drawer instead of leaving the scene.
  window.__GOLD_UI__={open,close,enterImmersive,showStartupScreen,pages};
})();
