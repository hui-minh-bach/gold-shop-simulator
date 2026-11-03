(() => {
  'use strict';

  const STARTING_CAPITAL = 10_000_000_000;
  const SAVE_BASE_KEY = 'goldShopSimV50';
  const LEGACY_SAVE_KEYS = ['goldShopSimV35','goldShopSimV2','goldShopSimV1','goldShopSimV06'];
  const SAVE_SCHEMA = 6;
  const activeAccountId=()=>localStorage.getItem('goldShopActiveAccount')||'guest';
  const saveKey=()=>`${SAVE_BASE_KEY}:${activeAccountId()}`;
  function activeAccount(){try{const list=JSON.parse(localStorage.getItem('goldShopAccountsV1')||'[]');return list.find(x=>x.id===activeAccountId())||null}catch{return null}}
  const GOLD_RULES = {
    sameTypeFeeOnAllOldWeight: true,
    chanhBase: 610,
    chanhFactors: {622: 0.012, 625: 0.015, 630: 0.020},
    bankAnnualInterest: 0.09,
    liquidationOverdueDays: 30
  };
  const DEFAULT_POLICIES = { pawnUpTo20: 0.03, pawn20To50: 0.025, pawnOver50: 0.02, exchangeFeePerChi: 150_000, chanh622:0.012, chanh625:0.015, chanh630:0.020 };
  const GOLD_TYPES = {
    '610': {name:'Vàng 610', buy:7_050_000, sell:7_420_000},
    '980': {name:'Vàng 980', buy:11_420_000, sell:11_790_000},
    '9999':{name:'Vàng 9999', buy:12_360_000, sell:12_710_000}
  };
  const LOCATIONS = [
    {id:'market', name:'Gần chợ', cost:420_000_000, dailyRent:1_100_000, traffic:88, trust:66, desc:'Khách vãng lai đông, cạnh tranh mạnh, giao dịch nhanh.'},
    {id:'residential', name:'Khu dân cư', cost:320_000_000, dailyRent:780_000, traffic:68, trust:82, desc:'Khách quen tốt, chi phí thấp, tăng trưởng bền.'},
    {id:'center', name:'Mặt tiền trung tâm', cost:850_000_000, dailyRent:2_150_000, traffic:96, trust:90, desc:'Uy tín cao, khách mạnh, nhưng chi phí mặt bằng lớn.'},
    {id:'newtown', name:'Khu đô thị mới', cost:560_000_000, dailyRent:1_350_000, traffic:74, trust:86, desc:'Khách trẻ, trang sức tốt, cần marketing đều.'}
  ];
  const TIERS = [
    {id:'basic', name:'Cơ bản', cost:260_000_000, appeal:55, dailyOps:650_000, desc:'Đủ vận hành, ít chi phí.'},
    {id:'standard', name:'Chuyên nghiệp', cost:520_000_000, appeal:76, dailyOps:1_100_000, desc:'Tủ đẹp, ánh sáng tốt, tăng niềm tin.'},
    {id:'luxury', name:'Sang trọng', cost:1_150_000_000, appeal:94, dailyOps:2_300_000, desc:'Hút khách VIP, nhưng burn rate cao.'}
  ];
  const EQUIPMENT = [
    {id:'safe', name:'Két + báo động', cost:180_000_000, required:true},
    {id:'camera', name:'Camera an ninh', cost:95_000_000, required:true},
    {id:'scale', name:'Cân điện tử', cost:45_000_000, required:true},
    {id:'software', name:'Phần mềm bán hàng', cost:65_000_000, required:true},
    {id:'computer', name:'Máy tính + máy in', cost:55_000_000, required:true},
    {id:'testing', name:'Bộ kiểm tra vàng', cost:90_000_000, required:true},
    {id:'vip', name:'Khu tiếp khách VIP', cost:180_000_000, required:false},
    {id:'backup', name:'Nguồn điện dự phòng', cost:70_000_000, required:false}
  ];
  const UPGRADES = [
    {id:'audit', name:'Module đối soát POS', cost:80_000_000, level:1, desc:'Giảm mạnh lỗi thu ngân và hỗ trợ khóa sổ.'},
    {id:'inventoryPro', name:'RFID / kiểm kho SKU', cost:180_000_000, level:2, desc:'Giảm xác suất mất lệch SKU khi kiểm kho.'},
    {id:'signage', name:'Bảng hiệu nhận diện nâng cao', cost:150_000_000, level:2, desc:'Tăng uy tín và sức hút cửa hàng.'},
    {id:'securityPlus', name:'Camera AI + kiểm soát kho', cost:120_000_000, level:2, desc:'Giảm rủi ro thất thoát.'},
    {id:'vipSuite', name:'Phòng khách VIP', cost:250_000_000, level:3, desc:'Tăng xác suất giao dịch lớn.'}
  ];
  const SUPPLIER_TEMPLATES = [
    {id:'sKBL', name:'Chành Kim Bảo Lâm', focus:'610 / trang sức / gia công', rating:95, creditLimit:1_500_000_000, balance:0},
    {id:'sA', name:'Chành An Phát', focus:'610 / trang sức', rating:88, creditLimit:1_000_000_000, balance:0},
    {id:'sB', name:'Chành Kim Thành', focus:'610 / 980', rating:82, creditLimit:800_000_000, balance:0},
    {id:'sC', name:'Nguồn 9999 Minh Tín', focus:'980 / 9999', rating:91, creditLimit:1_200_000_000, balance:0}
  ];
  const CATEGORY_NAMES = ['Nhẫn','Dây chuyền','Lắc tay','Vòng tay','Bông tai','Mặt dây','Nhẫn cưới','Kiềng'];
  const CUSTOMER_NAMES = ['Anh Minh','Chị Hương','Cô Lan','Anh Tuấn','Chị Ngọc','Anh Nam','Cô Mai','Chị Thảo','Anh Phúc','Chị Vy','Anh Hùng','Cô Hoa'];
  const PERSONALITIES = [
    {type:'Khách kỹ tính', mood:'Muốn nghe giải thích rõ từng khoản.', avatar:'🧑'},
    {type:'Khách vội', mood:'Ưu tiên nhanh và dễ khó chịu nếu chờ lâu.', avatar:'👨'},
    {type:'Khách quen', mood:'Tin tiệm nhưng nhớ rất lâu nếu bạn xử lý sai.', avatar:'👩'},
    {type:'Khách mới', mood:'Đang đánh giá uy tín cửa hàng.', avatar:'🧑‍🦱'},
    {type:'Khách lớn tuổi', mood:'Cần giải thích chậm, rõ và dễ hiểu.', avatar:'👵'},
    {type:'Khách VIP', mood:'Giá trị giao dịch cao, kỳ vọng dịch vụ tốt.', avatar:'🕴️'}
  ];
  const SPEECH = {
    location:'Vị trí quyết định lượng khách, uy tín và chi phí thuê. Vị trí đắt không đảm bảo có lời nếu vốn hàng và tiền mặt quá mỏng.',
    shopTier:'Cửa hàng đẹp tăng sức hút nhưng khóa vốn vào tài sản cố định. Hãy giữ đủ tiền cho hàng hóa và thanh khoản.',
    equipment:'Két, camera, cân, phần mềm và bộ kiểm tra là tài sản vận hành. Thiếu thiết bị bắt buộc thì không thể mở tiệm.',
    capital:'Mua hàng chỉ chuyển tiền thành tồn kho, không phải lỗ ngay. Quỹ cầm chuyển thành dư nợ khi giải ngân. Marketing được chi dần theo ngày.',
    pawn:'Mức phần trăm cầm là tổng thu đã bao gồm lãi và phí. Hợp đồng chốt mức tại ngày ký. Đóng kỳ chỉ ghi doanh thu phần thu cầm; hoàn gốc chỉ giảm dư nợ.',
    exchange:'Đổi cùng loại: phí đổi tính trên toàn bộ trọng lượng vàng cũ. Về kế toán, tiệm đang mua vàng cũ và bán vàng mới trong cùng một giao dịch.',
    inventory:'Mỗi món có SKU riêng, loại vàng, trọng lượng vàng thực, trọng lượng hột, giá vốn, nguồn hàng và tuổi tồn. Bán món nào thì giá vốn món đó mới đi vào chi phí.',
    supplier:'Nhập hàng tiền mặt làm giảm tiền và tăng kho. Nhập công nợ làm tăng kho và đồng thời tăng khoản phải trả chành.',
    finance:'Bảng cân đối cho biết tài sản và nợ. P và L cho biết lời lỗ. Dòng tiền cho biết bạn có đủ tiền để sống tiếp hay không. Ba thứ này không giống nhau.',
    staff:'Sai số nhỏ ở quầy vàng có thể thành thất thoát lớn. Nhân viên có kỹ năng và độ tin cậy khác nhau.',
    mission:'Mục tiêu của ngày là kiếm lời nhưng đồng thời phải giữ tiền mặt, kiểm kho và khóa sổ rõ ràng.',
    chanh:'Một số hàng 610 đang được mô phỏng quy 622, 625 hoặc 630 và khi về nền 610 phát sinh hao. Hệ số hiện tại chỉ là rule demo chờ công thức thực tế của tiệm.',
    customers:'Khách hàng có trí nhớ theo lượt ghé. Phục vụ đúng làm tăng tin tưởng và trung thành; xử lý sai làm giảm khả năng quay lại.',
    campaign:'Mục tiêu V1 là sống sót qua nhiều ngày, giữ thanh khoản, tăng tài sản ròng, đạt uy tín cao và mở được chuỗi cửa hàng.'
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const rng = (min,max)=>Math.random()*(max-min)+min;
  const pick = a=>a[Math.floor(Math.random()*a.length)];
  const fmt = n => new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+'đ';
  const short = n => { n=Number(n)||0; const a=Math.abs(n); if(a>=1e9)return (n/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ'; if(a>=1e6)return (n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu'; return fmt(n); };
  const pct = r => (Number(r)*100).toLocaleString('vi-VN',{maximumFractionDigits:2})+'%';
  const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  const state = {
    started:false, day:1, clockMinutes:480, location:null, tier:null, storeName:'', ownerName:'', ownerGender:'male',
    equipment:new Set(EQUIPMENT.filter(x=>x.required).map(x=>x.id)), upgrades:new Set(),
    allocations:{inventory:5.5e9,pawn:1e9,marketing:.3e9,reserve:.7e9}, policies:{...DEFAULT_POLICIES}, pricing:{goldSell:{'610':GOLD_TYPES['610'].sell,'980':GOLD_TYPES['980'].sell,'9999':GOLD_TYPES['9999'].sell},defaultLaborMarkup:1.8},
    cash:0, pawnFund:0, bankDebt:0, fixedAssets:0, reputation:50, xp:0, level:1,
    market:makeMarket(), suppliers:SUPPLIER_TEMPLATES.map(x=>({...x})), inventoryItems:[], pawnContracts:[], journal:[], ledger:[], history:[],
    staff:[
      {id:'st1',name:'Mai',gender:'female',role:'Bán hàng',skill:72,trust:81,salary:38_000_000},
      {id:'st2',name:'Tùng',gender:'male',role:'Thu ngân',skill:67,trust:76,salary:34_000_000},
      {id:'st3',name:'Hạnh',gender:'female',role:'Kho & kiểm hàng',skill:70,trust:84,salary:36_000_000}
    ],
    skuSeq:1, pawnSeq:1, receiptSeq:1, currentEvent:null, dayQueue:[], situationsToday:0, totalSituations:0, daily:null, stockAudit:'Chưa kiểm', calcHistory:[], calcLastResult:null,
    pendingSettlement:null, receipts:[], customers:[], branches:[], achievements:{}, campaign:{daysSurvived:0,score:0,completed:false},
    competitors:[
      {id:'cp1',name:'Kim Phát',reputation:82,assets:14.2e9,marketShare:26,priceIndex:.992,laborMarkup:1.55,exchangeFeePerChi:120_000,craftScore:82},
      {id:'cp2',name:'Phúc Lộc',reputation:77,assets:11.8e9,marketShare:22,priceIndex:1.006,laborMarkup:1.35,exchangeFeePerChi:95_000,craftScore:76},
      {id:'cp3',name:'Thành Tín',reputation:71,assets:9.3e9,marketShare:17,priceIndex:.985,laborMarkup:1.85,exchangeFeePerChi:180_000,craftScore:90}
    ],
    settings:{voice:true,tutorial:true}, saveSchema:SAVE_SCHEMA
  };

  function makeMarket(){
    const out={trend:'Ổn định'};
    Object.entries(GOLD_TYPES).forEach(([k,v])=>out[k]={buy:v.buy,sell:v.sell});
    return out;
  }
  function normalizePolicies(source){
    const p={...DEFAULT_POLICIES,...(source||{})};
    const num=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
    p.pawnUpTo20=clamp(num(p.pawnUpTo20,.03),0,.2); p.pawn20To50=clamp(num(p.pawn20To50,.025),0,.2); p.pawnOver50=clamp(num(p.pawnOver50,.02),0,.2); p.exchangeFeePerChi=clamp(num(p.exchangeFeePerChi,150000),0,2_000_000); p.chanh622=clamp(num(p.chanh622,.012),0,.2); p.chanh625=clamp(num(p.chanh625,.015),0,.2); p.chanh630=clamp(num(p.chanh630,.02),0,.2); return p;
  }
  function pawnRateFor(principal){ if(principal<=20e6)return state.policies.pawnUpTo20; if(principal<=50e6)return state.policies.pawn20To50; return state.policies.pawnOver50; }
  function policyBandFor(p){ return p<=20e6?'≤20 triệu':p<=50e6?'>20–50 triệu':'>50 triệu'; }
  function chanhRateFor(factor){return factor===622?state.policies.chanh622:factor===625?state.policies.chanh625:factor===630?state.policies.chanh630:0;}
  function clockText(){ const h=Math.floor(state.clockMinutes/60)%24,m=Math.round(state.clockMinutes%60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
  function toast(msg){ const el=$('#toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2600); }
  function speak(text){ if(state.settings&&!state.settings.voice){toast('Voice đang tắt.');return;} if(!('speechSynthesis' in window)){toast('Trình duyệt chưa hỗ trợ giọng đọc.');return;} speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='vi-VN'; u.rate=.94; speechSynthesis.speak(u); }
  function customerProfile(vip=false){
    const preferExisting=state.started&&state.customers?.length&&Math.random()<.42;
    if(preferExisting){const rec=pick(state.customers);const p=vip||rec.loyalty>=75?PERSONALITIES[5]:pick(PERSONALITIES.slice(0,5));return {name:rec.name,...p,customerId:rec.id,returning:true};}
    const p=vip?PERSONALITIES[5]:pick(PERSONALITIES.slice(0,5)); const name=pick(CUSTOMER_NAMES); let rec=state.customers?.find(c=>c.name===name);
    if(!rec&&state.customers){rec={id:'C-'+String(state.customers.length+1).padStart(4,'0'),name,visits:0,totalValue:0,loyalty:50,lastDay:0,notes:[],mistakes:0};state.customers.push(rec);}
    return {name,...p,customerId:rec?.id,returning:false};
  }
  function inventoryValue(){ return state.inventoryItems.filter(x=>x.status==='in_stock').reduce((s,x)=>s+x.bookCost,0); }
  function stockCount(){ return state.inventoryItems.filter(x=>x.status==='in_stock').length; }
  function pawnReceivable(){ return state.pawnContracts.filter(c=>['active','overdue'].includes(c.status)).reduce((s,c)=>s+c.principalBalance,0); }
  function supplierPayable(){ return state.suppliers.reduce((s,x)=>s+x.balance,0); }
  function totalAssets(){ return state.cash+state.pawnFund+inventoryValue()+pawnReceivable()+state.fixedAssets; }
  function totalLiabilities(){ return state.bankDebt+supplierPayable(); }
  function netWorth(){ return totalAssets()-totalLiabilities(); }
  function liquidityScore(){ const obligations=state.bankDebt*.08+supplierPayable()+100_000_000; return clamp(((state.cash+state.pawnFund*.35)/Math.max(1,obligations))*60+25,0,100); }
  function leverage(){ return totalAssets()?totalLiabilities()/totalAssets():0; }
  function currentDailyNet(){ if(!state.daily)return 0; const d=state.daily; return d.salesRevenue+d.serviceRevenue+d.pawnIncome+(d.branchIncome||0)-d.cogs-d.chanhLoss-d.repairCost-d.operatingExpense-d.interestExpense-d.staffLoss-d.complaintCost-(d.branchExpense||0)-(d.oneOffExpense||0); }

  function postJournal(label, entries){
    const debit=entries.reduce((s,e)=>s+(e.debit||0),0), credit=entries.reduce((s,e)=>s+(e.credit||0),0);
    if(Math.abs(debit-credit)>2) console.warn('Journal imbalance',label,debit,credit,entries);
    const id='J'+Date.now()+Math.floor(Math.random()*9999);
    entries.forEach(e=>state.journal.unshift({id,day:state.day,time:clockText(),label,account:e.account,debit:e.debit||0,credit:e.credit||0}));
    if(state.journal.length>1200)state.journal.length=1200;
  }
  function addLedger(label,amount,cls){ state.ledger.unshift({time:clockText(),label,amount,cls}); if(state.ledger.length>80)state.ledger.length=80; }

  function setupSpent(){
    const equipmentCost=EQUIPMENT.filter(x=>state.equipment.has(x.id)).reduce((s,x)=>s+x.cost,0);
    return (state.location?.cost||0)+(state.tier?.cost||0)+equipmentCost+state.allocations.inventory+state.allocations.pawn+state.allocations.marketing+state.allocations.reserve;
  }
  function fixedSetupCost(){ return (state.location?.cost||0)+(state.tier?.cost||0)+EQUIPMENT.filter(x=>state.equipment.has(x.id)).reduce((s,x)=>s+x.cost,0); }

  function createSku({goldType='610',netChi=1,stoneChi=0,category,source='supplier',supplierId='',bookCost=null,chanhFactor=null,day=state.day,name=null}){
    const market=state.market[goldType]||state.market['610'];
    const factor=chanhFactor ?? (goldType==='610'?pick([610,610,610,622,625,630]):Number(goldType));
    const rawGoldCost=netChi*market.buy*.965;
    const estimatedLaborCost=Math.round(clamp(netChi*85_000,45_000,260_000)/10_000)*10_000;
    const laborSell=Math.round(estimatedLaborCost*(state.pricing?.defaultLaborMarkup||1.8)/10_000)*10_000;
    const cost=Math.max(1,Math.round(bookCost ?? (rawGoldCost+estimatedLaborCost)));
    const laborCost=Math.min(Math.round(cost*.18),Math.max(30_000,Math.min(estimatedLaborCost,cost*.35)));
    const goldCost=Math.max(1,cost-laborCost);
    const sku='SKU-'+String(state.skuSeq++).padStart(5,'0');
    return {sku,name:name||`${category||pick(CATEGORY_NAMES)} ${goldType}`,category:category||pick(CATEGORY_NAMES),goldType:String(goldType),grossChi:Number((netChi+stoneChi).toFixed(3)),stoneChi:Number(stoneChi.toFixed(3)),netChi:Number(netChi.toFixed(3)),chanhFactor:factor,bookCost:cost,goldCost,laborCost,laborSell,laborAsk:laborSell,sellGoldPerChi:null,supplierId,source,acquiredDay:day,status:'in_stock',soldDay:null,chanhAdjusted:false};
  }

  function ensureSkuCosting(x){
    if(!x)return x;
    const cost=Math.max(1,Number(x.bookCost)||1);
    if(!Number.isFinite(Number(x.laborCost)))x.laborCost=Math.min(Math.round(cost*.18),Math.max(30_000,Math.round((Number(x.netChi)||1)*85_000/10_000)*10_000));
    if(!Number.isFinite(Number(x.goldCost)))x.goldCost=Math.max(1,cost-Number(x.laborCost||0));
    if(!Number.isFinite(Number(x.laborSell)))x.laborSell=Number(x.laborAsk)||Math.round(Number(x.laborCost||0)*(state.pricing?.defaultLaborMarkup||1.8));
    x.laborAsk=x.laborSell;
    if(!Number.isFinite(Number(x.sellGoldPerChi))||Number(x.sellGoldPerChi)<=0)x.sellGoldPerChi=null;
    return x;
  }
  function expectedExchangeCost(x){
    if(!x||x.chanhAdjusted||x.goldType!=='610')return 0;
    const f=Number(x.chanhFactor),rate=f===622?state.policies.chanh622:f===625?state.policies.chanh625:f===630?state.policies.chanh630:0;
    return Math.max(0,(Number(x.bookCost)||0)*rate);
  }
  function managerialCost(x){ensureSkuCosting(x);return Math.max(0,Number(x.goldCost||0)+Number(x.laborCost||0)+expectedExchangeCost(x));}
  function storeGoldSell(type,sku=null){const override=Number(sku?.sellGoldPerChi);return override>0?override:Number(state.pricing?.goldSell?.[String(type)])||state.market[String(type)]?.sell||0;}
  function playerCraftScore(){const avg=state.staff.length?state.staff.reduce((a,b)=>a+(Number(b.skill)||0),0)/state.staff.length:60;return clamp(avg*.58+(state.tier?.appeal||60)*.42,35,98);}
  function competitorQuote(sku,c){
    ensureSkuCosting(sku);const goldPerChi=Math.round((state.market[sku.goldType]?.sell||storeGoldSell(sku.goldType,sku))*(Number(c.priceIndex)||1)/10_000)*10_000;
    const labor=Math.round(Math.max(40_000,Number(sku.laborCost||0)*(Number(c.laborMarkup)||1.6))/10_000)*10_000;
    return {competitor:c,goldPerChi,labor,total:(Number(sku.netChi)||0)*goldPerChi+labor,exchangeFeePerChi:Number(c.exchangeFeePerChi)||150_000,craftScore:Number(c.craftScore)||75};
  }
  function compareOffer(sku,kind='sale'){
    const ours=retailComponents(sku),quotes=state.competitors.map(c=>competitorQuote(sku,c));
    const bestTotal=[...quotes].sort((a,b)=>a.total-b.total)[0],bestGold=[...quotes].sort((a,b)=>a.goldPerChi-b.goldPerChi)[0],bestLabor=[...quotes].sort((a,b)=>a.labor-b.labor)[0],bestFee=[...quotes].sort((a,b)=>a.exchangeFeePerChi-b.exchangeFeePerChi)[0],bestCraft=[...quotes].sort((a,b)=>b.craftScore-a.craftScore)[0];
    const phrases=[];
    if(bestGold&&ours.perChi>bestGold.goldPerChi*1.004)phrases.push(`Bên ${bestGold.competitor.name} báo vàng ${fmt(bestGold.goldPerChi)}/chỉ, rẻ hơn bên mình ${fmt(ours.perChi-bestGold.goldPerChi)}/chỉ.`);
    if(bestLabor&&ours.service>bestLabor.labor*1.08)phrases.push(`Tiền công bên ${bestLabor.competitor.name} chỉ khoảng ${fmt(bestLabor.labor)}, bên mình đang cao hơn.`);
    if(kind==='exchange'&&bestFee&&state.policies.exchangeFeePerChi>bestFee.exchangeFeePerChi*1.05)phrases.push(`Phí đổi bên ${bestFee.competitor.name} khoảng ${fmt(bestFee.exchangeFeePerChi)}/chỉ, thấp hơn bên mình.`);
    if(bestCraft&&playerCraftScore()+7<bestCraft.craftScore)phrases.push(`Tôi nghe ${bestCraft.competitor.name} làm công đẹp hơn, điểm tay nghề của họ đang cao.`);
    if(!phrases.length&&bestTotal)phrases.push(`Tôi đã hỏi ${bestTotal.competitor.name}; tổng giá bên mình hiện khá cạnh tranh.`);
    const priceGap=bestTotal?Math.max(-.2,Math.min(.5,(ours.total-bestTotal.total)/Math.max(1,bestTotal.total))):0;
    const repEdge=((state.reputation||50)-(bestTotal?.competitor.reputation||70))/100,craftEdge=(playerCraftScore()-(bestTotal?.craftScore||75))/100;
    const conversion=clamp(.72-priceGap*2.2+repEdge*.35+craftEdge*.25+(state.location?.traffic||70)/100*.07,0.12,.97);
    return {ours,quotes,bestTotal,bestGold,bestLabor,bestFee,bestCraft,phrases,priceGap,conversion};
  }
  function makeLostCustomer(customer,comparison,context='giao dịch'){
    const quote=comparison?.phrases?.[0]||'Tôi muốn tham khảo thêm chỗ khác.';
    return {type:'lostCustomer',customer,title:'Khách so giá rồi rời tiệm',desc:`${customer.name}: “${quote}” Khách chưa chốt ${context} hôm nay.`,voice:'Khách đang so sánh giá vàng, tiền công, phí đổi và chất lượng làm công giữa các tiệm.',hint:'Xem lại bảng giá bán, công bán, phí đổi, uy tín, tay nghề và marketing. Không phải lúc nào hạ giá cũng là đáp án đúng.',data:{reason:quote}};
  }

  function createBatch(targetAmount,supplierId='sA',source='supplier'){
    let remaining=Math.max(0,Number(targetAmount)||0), items=[], guard=0;
    while(remaining>4_000_000 && guard<450){
      guard++;
      const goldType=pick(['610','610','610','610','610','980','980','9999']);
      const m=state.market[goldType];
      let netChi=goldType==='9999'?rng(.15,1.2):rng(.35,2.8);
      let estimated=netChi*m.buy*.965+rng(40_000,220_000);
      if(estimated>remaining){ netChi=Math.max(.08,(remaining-20_000)/(m.buy*.965)); estimated=Math.min(remaining,netChi*m.buy*.965+20_000); }
      if(netChi<.07)break;
      const stone=Math.random()<.35?rng(.01,.18):0;
      const item=createSku({goldType,netChi,stoneChi:stone,category:pick(CATEGORY_NAMES),source,supplierId,bookCost:estimated});
      items.push(item); remaining-=item.bookCost;
    }
    return {items,total:items.reduce((s,x)=>s+x.bookCost,0),unused:remaining};
  }

  function ensureV1State(){
    state.policies=normalizePolicies(state.policies);
    state.storeName=String(state.storeName||'').trim().slice(0,28);
    state.ownerName=String(state.ownerName||'').trim().slice(0,24);
    state.ownerGender=state.ownerGender==='female'?'female':'male';
    const legacyFemale=new Set(['Mai','Hạnh','Linh','Thư','Yến','Trâm','Ngọc','Lan','Hoa','Vy']);state.staff=(state.staff||[]).map(x=>({...x,gender:(x.gender==='female'||x.gender==='male')?x.gender:(legacyFemale.has(x.name)?'female':'male')}));
    state.receipts=Array.isArray(state.receipts)?state.receipts:[]; state.customers=Array.isArray(state.customers)?state.customers:[]; state.branches=Array.isArray(state.branches)?state.branches:[];
    state.achievements=state.achievements||{}; state.campaign=state.campaign||{daysSurvived:0,score:0,completed:false}; state.settings={voice:true,tutorial:true,...(state.settings||{})};
    state.pricing=state.pricing||{};state.pricing.goldSell={...Object.fromEntries(Object.keys(GOLD_TYPES).map(k=>[k,state.market?.[k]?.sell||GOLD_TYPES[k].sell])),...(state.pricing.goldSell||{})};state.pricing.defaultLaborMarkup=clamp(Number(state.pricing.defaultLaborMarkup)||1.8,1,5);
    state.inventoryItems=(state.inventoryItems||[]).map(ensureSkuCosting);
    const currentSuppliers=Array.isArray(state.suppliers)?state.suppliers:[];
    state.suppliers=SUPPLIER_TEMPLATES.map(t=>({...t,...(currentSuppliers.find(s=>s.id===t.id)||{})}));
    const compDefaults=[{id:'cp1',name:'Kim Phát',reputation:82,assets:14.2e9,marketShare:26,priceIndex:.992,laborMarkup:1.55,exchangeFeePerChi:120_000,craftScore:82},{id:'cp2',name:'Phúc Lộc',reputation:77,assets:11.8e9,marketShare:22,priceIndex:1.006,laborMarkup:1.35,exchangeFeePerChi:95_000,craftScore:76},{id:'cp3',name:'Thành Tín',reputation:71,assets:9.3e9,marketShare:17,priceIndex:.985,laborMarkup:1.85,exchangeFeePerChi:180_000,craftScore:90}];
    state.competitors=Array.isArray(state.competitors)&&state.competitors.length?state.competitors:compDefaults;state.competitors=state.competitors.map((c,i)=>({...compDefaults[i%compDefaults.length],...c}));
    state.receiptSeq=Number(state.receiptSeq)||1; state.pendingSettlement=null; state.saveSchema=SAVE_SCHEMA;
  }
  function init(){
    const acc=activeAccount(); if(acc&&!state.ownerName)state.ownerName=acc.displayName||'';
    ensureV1State(); renderSetupOptions(); bind(); updateSetup(); syncPolicyInputs(); restore(); ensureV1State();
    if(acc&&!state.ownerName)state.ownerName=acc.displayName||'';
    renderAll(); updateVoiceButton();
  }
  function renderSetupOptions(){
    $('#locationOptions').innerHTML=LOCATIONS.map(x=>`<div class="option-card" data-location="${x.id}"><h3>${x.name}</h3><p>${x.desc}</p><div class="option-meta"><span>Setup ${short(x.cost)}</span><span>Traffic ${x.traffic}</span></div></div>`).join('');
    $('#tierOptions').innerHTML=TIERS.map(x=>`<div class="option-card" data-tier="${x.id}"><h3>${x.name}</h3><p>${x.desc}</p><div class="option-meta"><span>${short(x.cost)}</span><span>Hấp dẫn ${x.appeal}</span></div></div>`).join('');
    $('#equipmentList').innerHTML=EQUIPMENT.map(x=>`<label class="check-item"><input type="checkbox" data-equipment="${x.id}" ${state.equipment.has(x.id)?'checked':''} ${x.required?'disabled':''}><span>${x.name}${x.required?' · bắt buộc':''}</span><strong>${short(x.cost)}</strong></label>`).join('');
  }
  function bind(){
    $$('.nav-btn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
    $('#locationOptions').addEventListener('click',e=>{const c=e.target.closest('[data-location]');if(!c)return;state.location=LOCATIONS.find(x=>x.id===c.dataset.location);updateSetup();});
    $('#tierOptions').addEventListener('click',e=>{const c=e.target.closest('[data-tier]');if(!c)return;state.tier=TIERS.find(x=>x.id===c.dataset.tier);updateSetup();});
    $('#equipmentList').addEventListener('change',e=>{const id=e.target.dataset.equipment;if(!id)return;if(e.target.checked)state.equipment.add(id);else state.equipment.delete(id);updateSetup();});
    $('#storeNameInput')?.addEventListener('input',e=>{state.storeName=String(e.target.value||'').replace(/\s+/g,' ').slice(0,28);updateSetup();});
    $('#ownerNameInput')?.addEventListener('input',e=>{state.ownerName=String(e.target.value||'').replace(/\s+/g,' ').slice(0,24);updateSetup();});
    $('#ownerGenderChoice')?.addEventListener('click',e=>{const b=e.target.closest('[data-owner-gender]');if(!b)return;state.ownerGender=b.dataset.ownerGender==='female'?'female':'male';updateSetup();if(state.started)save(true);});
    [['#inventoryAlloc','inventory'],['#pawnAlloc','pawn'],['#marketingAlloc','marketing'],['#reserve','reserve']].forEach(([sel,key])=>$(sel).addEventListener('input',e=>{state.allocations[key]=Number(e.target.value)*1e9;updateSetup();}));
    document.addEventListener('change',e=>{if(e.target.matches('[data-policy]'))applyPolicyInput(e.target);if(e.target.matches('[data-pricing]'))applyPricingInput(e.target);if(e.target.matches('[data-sku-price],[data-sku-labor]'))applySkuPricingInput(e.target);});
    document.addEventListener('click',handleDelegatedClick);
    $('#startGameBtn').addEventListener('click',startGame); $('#nextCustomerBtn').addEventListener('click',nextSituation); $('#showHintBtn').addEventListener('click',()=>$('#hintBox').classList.toggle('hidden')); $('#eventSpeak').addEventListener('click',()=>{if(state.currentEvent)speak(state.currentEvent.voice||state.currentEvent.desc);});
    initCashierCalculator();
    $('#endDayBtn').addEventListener('click',endDay); $('#borrowBtn').addEventListener('click',borrow); $('#saveBtn').addEventListener('click',()=>save(false)); $('#resetBtn').addEventListener('click',resetGame);
    $('#voiceToggleBtn')?.addEventListener('click',toggleVoice); $('#exportBtn')?.addEventListener('click',exportSave); $('#importBtn')?.addEventListener('click',()=>$('#importFile')?.click()); $('#importFile')?.addEventListener('change',importSaveFile);
    $('#tenderInput')?.addEventListener('input',updateChangeDue); $('#exactTenderBtn')?.addEventListener('click',fillExactTender); $('#confirmSettlementBtn')?.addEventListener('click',confirmSettlement);
    $('#inventoryFilter').addEventListener('change',renderInventory); $('#inventorySearch').addEventListener('input',renderInventory); $('#supplierOrderBtn').addEventListener('click',placeSupplierOrder); $('#stockAuditBtn').addEventListener('click',stockAudit);
    $('#pawnFilter').addEventListener('change',renderPawn); $('#borrowFinanceBtn').addEventListener('click',borrow); $('#repayFinanceBtn').addEventListener('click',repayDebt);
    $('#customerFilter')?.addEventListener('change',renderCustomers); $('#hireStaffBtn')?.addEventListener('click',hireStaff); $('#openBranchBtn')?.addEventListener('click',openBranch); $('#syncMarketPriceBtn')?.addEventListener('click',syncStorePricesToMarket);
  }
  function handleDelegatedClick(e){
    const sp=e.target.closest('[data-speak]'); if(sp){speak(SPEECH[sp.dataset.speak]||'');return;}
    const up=e.target.closest('[data-upgrade]'); if(up){buyUpgrade(up.dataset.upgrade);return;}
    const choice=e.target.closest('[data-choice]'); if(choice){processChoice(choice.dataset.choice);return;}
    const contract=e.target.closest('[data-contract-action]'); if(contract){processContractAction(contract.dataset.contractAction,contract.dataset.contractId);return;}
    const paySup=e.target.closest('[data-pay-supplier]'); if(paySup){paySupplier(paySup.dataset.paySupplier);return;}
    const sku=e.target.closest('[data-sku-detail]'); if(sku){showSkuDetail(sku.dataset.skuDetail);return;}
    const train=e.target.closest('[data-train-staff]'); if(train){trainStaff(train.dataset.trainStaff);return;}
    const fire=e.target.closest('[data-fire-staff]'); if(fire){fireStaff(fire.dataset.fireStaff);return;}
    const receipt=e.target.closest('[data-receipt-id]'); if(receipt){showReceipt(receipt.dataset.receiptId);return;}
  }

  function updateSetup(){
    $$('#locationOptions .option-card').forEach(c=>c.classList.toggle('selected',state.location?.id===c.dataset.location)); $$('#tierOptions .option-card').forEach(c=>c.classList.toggle('selected',state.tier?.id===c.dataset.tier));
    if($('#storeNameInput') && document.activeElement!==$('#storeNameInput')) $('#storeNameInput').value=state.storeName||'';
    if($('#ownerNameInput') && document.activeElement!==$('#ownerNameInput')) $('#ownerNameInput').value=state.ownerName||'';
    $$('#ownerGenderChoice [data-owner-gender]').forEach(b=>b.classList.toggle('selected',b.dataset.ownerGender===state.ownerGender));
    $('#inventoryAllocLabel').textContent=short(state.allocations.inventory); $('#pawnAllocLabel').textContent=short(state.allocations.pawn); $('#marketingAllocLabel').textContent=short(state.allocations.marketing); $('#reserveLabel').textContent=short(state.allocations.reserve);
    const spent=setupSpent(), remaining=STARTING_CAPITAL-spent, freeCash=STARTING_CAPITAL-fixedSetupCost()-state.allocations.inventory-state.allocations.pawn;
    $('#setupSpent').textContent=short(spent); $('#setupRemaining').textContent=short(remaining); $('#setupCash').textContent=short(Math.max(0,freeCash));
    const missing=EQUIPMENT.filter(x=>x.required&&!state.equipment.has(x.id)); let warn='';
    if(!String(state.storeName||'').trim())warn='Hãy đặt tên cho cửa hàng.'; else if(!state.location)warn='Chưa chọn vị trí.'; else if(!state.tier)warn='Chưa chọn phong cách cửa hàng.'; else if(missing.length)warn='Thiếu thiết bị bắt buộc.'; else if(remaining<0)warn='Tổng ngân sách khóa vượt 10 tỷ.'; else if(freeCash<state.allocations.reserve)warn='Tiền tự do thấp hơn dự phòng bạn đặt.';
    $('#setupWarning').textContent=warn; $('#setupSummary').textContent=state.location&&state.tier&&state.storeName?`${state.storeName} · ${state.location.name} · ${state.tier.name} · tiền tự do ${short(freeCash)}`:'Đặt tên tiệm, chọn vị trí và phong cách.'; $('#startGameBtn').disabled=!!warn;
  }
  function syncPolicyInputs(){
    $$('[data-policy]').forEach(input=>{const k=input.dataset.policy;if(!(k in state.policies))return;input.value=input.dataset.kind==='percent'?state.policies[k]*100:state.policies[k];});
    $$('[data-policy-summary]').forEach(el=>el.textContent=`≤20tr ${pct(state.policies.pawnUpTo20)} · >20–50tr ${pct(state.policies.pawn20To50)} · >50tr ${pct(state.policies.pawnOver50)} · đổi ${fmt(state.policies.exchangeFeePerChi)}/chỉ · chành 622 ${pct(state.policies.chanh622)} · 625 ${pct(state.policies.chanh625)} · 630 ${pct(state.policies.chanh630)}`);
  }
  function applyPolicyInput(input){
    const key=input.dataset.policy; let v=Number(input.value); if(!Number.isFinite(v))return syncPolicyInputs(); if(input.dataset.kind==='percent')v=clamp(v/100,0,.2); else v=clamp(v,0,2e6); state.policies[key]=v; syncPolicyInputs(); refreshFutureEvents(); if(state.started)save(true); toast('Đã cập nhật chính sách cho giao dịch mới.');
  }

  function syncPricingInputs(){
    $$('[data-pricing]').forEach(input=>{const k=input.dataset.pricing;if(k.startsWith('gold-'))input.value=Math.round(state.pricing.goldSell[k.slice(5)]||0);else if(k==='laborMarkup')input.value=Number(state.pricing.defaultLaborMarkup||1.8).toFixed(2);});
    const el=$('#pricingSummary');if(el){const idx=averagePlayerPriceIndex();el.textContent=`610 ${fmt(state.pricing.goldSell['610'])}/chỉ · 980 ${fmt(state.pricing.goldSell['980'])}/chỉ · 9999 ${fmt(state.pricing.goldSell['9999'])}/chỉ · chỉ số giá ${idx.toFixed(3)}x thị trường`;}
  }
  function applyPricingInput(input){const key=input.dataset.pricing,v=Number(input.value);if(!Number.isFinite(v))return syncPricingInputs();if(key.startsWith('gold-'))state.pricing.goldSell[key.slice(5)]=clamp(Math.round(v/10_000)*10_000,500_000,100_000_000);else if(key==='laborMarkup')state.pricing.defaultLaborMarkup=clamp(v,1,5);syncPricingInputs();refreshFutureEvents();renderInventory(false);renderCompetitionPanel();if(state.started)save(true);toast('Đã cập nhật bảng giá bán của tiệm.');}
  function applySkuPricingInput(input){const id=input.dataset.skuPrice||input.dataset.skuLabor,sku=state.inventoryItems.find(x=>x.sku===id);if(!sku)return;const v=Number(input.value);if(!Number.isFinite(v)||v<0){renderInventory(false);return;}if(input.dataset.skuPrice)sku.sellGoldPerChi=v>0?Math.round(v/10_000)*10_000:null;if(input.dataset.skuLabor){sku.laborSell=Math.round(v/10_000)*10_000;sku.laborAsk=sku.laborSell;}refreshFutureEvents();renderInventory(false);if(state.started)save(true);}
  function syncStorePricesToMarket(){Object.keys(GOLD_TYPES).forEach(k=>state.pricing.goldSell[k]=state.market[k].sell);syncPricingInputs();refreshFutureEvents();renderInventory(false);renderCompetitionPanel();if(state.started)save(true);toast('Đã đồng bộ giá bán của tiệm theo bảng giá mô phỏng hiện tại.');}
  function averagePlayerPriceIndex(){const vals=Object.keys(GOLD_TYPES).map(k=>(state.pricing.goldSell[k]||state.market[k].sell)/Math.max(1,state.market[k].sell));return vals.reduce((a,b)=>a+b,0)/vals.length;}
  function averageCompetitorPriceIndex(){return state.competitors.reduce((a,c)=>a+(Number(c.priceIndex)||1),0)/Math.max(1,state.competitors.length);}
  function demandSnapshot(){const priceDelta=averagePlayerPriceIndex()-averageCompetitorPriceIndex(),feeAvg=state.competitors.reduce((a,c)=>a+(Number(c.exchangeFeePerChi)||150_000),0)/Math.max(1,state.competitors.length),feePenalty=Math.max(0,(state.policies.exchangeFeePerChi-feeAvg)/600_000),traffic=(state.location?.traffic||60)/100,rep=(state.reputation||50)/100,marketing=clamp((state.allocations.marketing||0)/600_000_000,0,1),craft=playerCraftScore()/100;const score=clamp(.34*traffic+.25*rep+.15*marketing+.12*craft+.14*clamp(1-priceDelta*5-feePenalty,0,1),.08,1),zeroChance=clamp(.015+(0.55-score)*.62,0.01,.38);return {score,zeroChance,priceDelta,feePenalty};}
  function renderCompetitionPanel(){const el=$('#competitionPanel');if(!el)return;const d=demandSnapshot();el.innerHTML=`<div class="competition-summary"><strong>Nhu cầu dự kiến ${(d.score*100).toFixed(0)}/100</strong><span>Khả năng ngày 0 khách vãng lai ${(d.zeroChance*100).toFixed(1)}%</span><span>Giá tiệm ${averagePlayerPriceIndex().toFixed(3)}x · đối thủ TB ${averageCompetitorPriceIndex().toFixed(3)}x thị trường</span></div>`+state.competitors.map(c=>`<div class="competitor-price-row"><div><strong>${esc(c.name)}</strong><small>Uy tín ${Math.round(c.reputation)}/100 · tay nghề ${Math.round(c.craftScore)}/100</small></div><div><span>610: ${fmt(state.market['610'].sell*c.priceIndex)}/chỉ</span><span>Công vốn × ${Number(c.laborMarkup).toFixed(2)}</span><span>Đổi ${fmt(c.exchangeFeePerChi)}/chỉ</span></div></div>`).join('');}

  function startGame(){
    state.storeName=String(state.storeName||'').trim().replace(/\s+/g,' ').slice(0,28); state.ownerName=String(state.ownerName||'').trim().replace(/\s+/g,' ').slice(0,24); if(setupSpent()>STARTING_CAPITAL||!state.location||!state.tier||!state.storeName){toast('Cấu hình khởi nghiệp chưa hợp lệ. Hãy đặt tên tiệm.');return;}
    state.started=true; state.day=1; state.clockMinutes=480; state.market=makeMarket(); state.fixedAssets=fixedSetupCost(); state.cash=STARTING_CAPITAL-state.fixedAssets-state.allocations.inventory-state.allocations.pawn; state.pawnFund=state.allocations.pawn; state.bankDebt=0; state.reputation=Math.round((state.location.trust+state.tier.appeal)/2); state.xp=0; state.level=1; state.inventoryItems=[]; state.pawnContracts=[]; state.journal=[]; state.ledger=[]; state.history=[]; state.receipts=[]; state.customers=[]; state.branches=[]; state.achievements={}; state.campaign={daysSurvived:0,score:0,completed:false}; state.pendingSettlement=null; state.suppliers=SUPPLIER_TEMPLATES.map(x=>({...x})); state.skuSeq=1; state.pawnSeq=1; state.receiptSeq=1; state.upgrades=new Set(); state.totalSituations=0; state.pricing={goldSell:{'610':state.market['610'].sell,'980':state.market['980'].sell,'9999':state.market['9999'].sell},defaultLaborMarkup:1.8};
    const initial=createBatch(state.allocations.inventory,'sA','opening'); state.inventoryItems.push(...initial.items); state.cash+=initial.unused;
    postJournal('Góp vốn ban đầu',[
      {account:'Tiền mặt',debit:state.cash},{account:'Quỹ cầm đồ',debit:state.pawnFund},{account:'Hàng tồn kho',debit:initial.total},{account:'Tài sản cố định',debit:state.fixedAssets},{account:'Vốn chủ sở hữu',credit:state.cash+state.pawnFund+initial.total+state.fixedAssets}
    ]);
    state.branches.push({id:'B-001',name:state.storeName||'Cửa hàng chính',location:state.location.name,openedDay:1,manager:state.ownerName||'Bạn',reputation:state.reputation,level:1,active:true,simulated:false});
    beginDay(); showView('store3d'); save(true); toast(`Đã mở tiệm V1.0 với ${stockCount()} SKU đầu tiên.`);
  }
  function beginDay(){
    refreshContractStatuses(); state.clockMinutes=480; state.situationsToday=0; state.currentEvent=null; state.pendingSettlement=null; state.ledger=[]; state.stockAudit='Chưa kiểm'; simulateCompetitors();
    const swing=rng(-.012,.012); Object.keys(GOLD_TYPES).forEach(k=>{ const base=GOLD_TYPES[k]; state.market[k]={buy:Math.round(base.buy*(1+swing)/10000)*10000,sell:Math.round(base.sell*(1+swing)/10000)*10000}; }); state.market.trend='Ổn định';
    state.daily={salesRevenue:0,serviceRevenue:0,pawnIncome:0,branchIncome:0,branchExpense:0,oneOffExpense:0,cogs:0,chanhLoss:0,repairCost:0,operatingExpense:0,interestExpense:0,staffLoss:0,complaintCost:0,lostCustomers:0,walkInsPlanned:0,demandScore:0,handled:0,correct:0,auditDone:false,auditResult:'Chưa kiểm',cashVariance:0};
    state.dayQueue=generateDayQueue(); resetCustomerCard(); $('#eventTitle').textContent='Sẵn sàng mở cửa'; $('#eventBody').textContent='Bấm “Tình huống tiếp” để bắt đầu ngày kinh doanh.'; $('#transactionArea').innerHTML=''; $('#hintBox').classList.add('hidden'); renderCashierCalculator(null); renderAll();
  }
  function showView(view){
    $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`)); $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    if(view==='inventory')renderInventory(); if(view==='pawn')renderPawn(); if(view==='finance')renderFinance(); if(view==='management')renderManagement(); if(view==='customers')renderCustomers(); if(view==='campaign')renderCampaign(); if(view==='academy')renderAcademy(); if(view==='report')renderReport(); if(view==='map')renderMap();
  }
  function advanceClock(){ state.clockMinutes=Math.min(1190,state.clockMinutes+Math.round(rng(32,62))); }

  function generateDayQueue(){
    const q=[],d=demandSnapshot();state.daily.demandScore=d.score;const zeroWalkIns=Math.random()<d.zeroChance;let walkIns=zeroWalkIns?0:clamp(Math.round(rng(1,7)*(.35+d.score*.95)),1,7);state.daily.walkInsPlanned=walkIns;
    const makers=[()=>makeSale(customerProfile()),()=>makeBuyback(customerProfile()),()=>makeExchangeSame(customerProfile()),()=>makeExchangeCross(customerProfile()),()=>makePawnOpen(customerProfile()),()=>makeServiceOrder(customerProfile())];
    for(let i=makers.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[makers[i],makers[j]]=[makers[j],makers[i]];}for(let i=0;i<walkIns;i++)q.push(makers[i%makers.length]());
    const due=state.pawnContracts.find(c=>['active','overdue'].includes(c.status)&&c.nextDueDay<=state.day);if(due)q.push(makePawnDue(due));
    if(zeroWalkIns)q.push({type:'quietDay',customer:{name:'Cửa hàng',type:'Ngày vắng khách',mood:'Không có khách vãng lai ghé trong ngày.',avatar:'🪑'},title:'Cả ngày cực vắng',desc:'Hôm nay không có khách vãng lai. Giá, vị trí, marketing, uy tín và ngẫu nhiên thị trường đều có thể góp phần. Tiệm vẫn phải chịu chi phí vận hành.',voice:'Kinh doanh thật có ngày không bán được đơn nào. Không được giả định ngày nào cũng có khách.',hint:'Xem lại bảng giá bán, tiền công, phí đổi, đối thủ, marketing và vị trí. Không nên hạ giá vô điều kiện nếu làm mất biên lợi nhuận.',data:{demand:d.score}});
    q.push(makePriceShock());q.push(makeSupplierScenario());q.push(makeStaffError());q.push(makeChanhEvent());q.push(makeAudit());return q;
  }
  function refreshFutureEvents(){ if(!Array.isArray(state.dayQueue))return; state.dayQueue.slice(state.situationsToday).forEach(ev=>{ if(ev.type==='exchangeSame'){ev.data.fee=state.policies.exchangeFeePerChi;ev.data.expected=exchangeExpected(ev.data.oldWeight,ev.data.newSku,ev.data.oldType,ev.data.fee);updateExchangeDesc(ev);} if(ev.type==='exchangeCross'){ev.data.expected=exchangeExpected(ev.data.oldWeight,ev.data.newSku,ev.data.oldType,0);updateCrossExchangeDesc(ev);} if(ev.type==='pawnOpen'){ev.data.rate=pawnRateFor(ev.data.principal);ev.data.charge=ev.data.principal*(ev.data.rate/30)*ev.data.termDays;updatePawnDesc(ev);} }); }

  function inStockByType(type){return state.inventoryItems.filter(x=>x.status==='in_stock'&&x.goldType===String(type));}
  function anyStock(){return state.inventoryItems.filter(x=>x.status==='in_stock');}
  function retailComponents(sku){ensureSkuCosting(sku);const perChi=storeGoldSell(sku.goldType,sku),gold=sku.netChi*perChi,service=Number(sku.laborSell??sku.laborAsk)||0,total=gold+service,cost=managerialCost(sku);return {gold,service,total,perChi,cost,margin:total-cost};}
  function makeSale(customer){
    const pool=anyStock();if(!pool.length)return makeNoStockEvent();const sku=pick(pool),r=retailComponents(sku),cmp=compareOffer(sku,'sale');
    if(Math.random()>cmp.conversion){return makeLostCustomer(customer,cmp,`món ${sku.sku}`);}
    const quote=cmp.phrases[0];return {type:'sale',customer,title:`Bán ${sku.name}`,desc:`${customer.name} chọn ${sku.sku}, ${sku.netChi} chỉ ${sku.goldType}. Giá bán của TIỆM ${fmt(r.perChi)}/chỉ, công bán ${fmt(r.service)}. ${quote?`Khách nói: “${quote}”`:''} Hãy tính tổng tiền khách trả.`,voice:'Người chơi được xem giá vàng vốn, công vốn và giá vốn quản trị; sau đó tự kê giá vàng bán và công bán. Khách sẽ so giá với cửa hàng khác.',hint:`Giá vốn vàng: ${fmt(sku.goldCost)} · công vốn: ${fmt(sku.laborCost)} · dự phòng hao/đổi: ${fmt(expectedExchangeCost(sku))}.
Giá vốn quản trị: ${fmt(managerialCost(sku))}.
Tổng thu = ${sku.netChi} × ${fmt(r.perChi)} + công bán ${fmt(r.service)} = ${fmt(r.total)}.
Lãi gộp dự kiến trước chi phí chung: ${fmt(r.margin)}.`,data:{skuId:sku.sku,expected:r.total}};
  }
  function makeNoStockEvent(){return {type:'info',customer:{name:'Hệ thống',type:'Cảnh báo kho',mood:'Không còn SKU để bán.',avatar:'📦'},title:'Kho trống',desc:'Không còn hàng tồn kho. Hãy nhập hàng ở tab Kho / SKU.',voice:SPEECH.inventory,hint:'Nhập lô hàng mới từ chành.',data:{}};}
  function makeBuyback(customer){
    const type=pick(['610','610','980','9999']); const weight=Number(rng(.3,type==='9999'?1.2:2.5).toFixed(3)); const expected=weight*state.market[type].buy; return {type:'buyback',customer,title:`Khách bán vàng cũ ${type}`,desc:`${customer.name} bán ${weight} chỉ ${type}. Giá mua ${fmt(state.market[type].buy)}/chỉ. Tiệm phải trả bao nhiêu?`,voice:'Mua vàng cũ làm giảm tiền mặt và tăng tồn kho. Không được đưa toàn bộ tiền mua vào chi phí trong ngày.',hint:`Tiền trả = trọng lượng × GIÁ MUA ${type}.\nSau giao dịch sẽ tạo một SKU vàng cũ mới trong kho.`,data:{goldType:type,weight,expected}};
  }
  function makeExchangeSame(customer){
    const types=['610','980'].filter(t=>inStockByType(t).length);if(!types.length)return makeSale(customer);const type=pick(types),sku=pick(inStockByType(type)),cmp=compareOffer(sku,'exchange');const oldWeight=Number(clamp(sku.netChi+rng(-.8,.8),.15,5).toFixed(3)),fee=state.policies.exchangeFeePerChi,expected=exchangeExpected(oldWeight,sku,type,fee),exchangePenalty=Math.max(0,(fee-(cmp.bestFee?.exchangeFeePerChi||fee))/600_000),conv=clamp(cmp.conversion-exchangePenalty,.08,.97);if(Math.random()>conv){return makeLostCustomer(customer,cmp,'giao dịch đổi vàng');}const ev={type:'exchangeSame',customer,title:`Đổi cùng loại ${type} → ${type}`,desc:'',voice:SPEECH.exchange,hint:'',data:{oldType:type,oldWeight,newSku:sku.sku,fee,expected,customerQuote:cmp.phrases[0]}};updateExchangeDesc(ev);return ev;
  }
  function exchangeExpected(oldWeight,skuOrId,type,fee){ const sku=typeof skuOrId==='string'?state.inventoryItems.find(x=>x.sku===skuOrId):skuOrId; if(!sku)return 0; const oldValue=oldWeight*state.market[type].buy; const r=retailComponents(sku); return r.total+oldWeight*fee-oldValue; }
  function makeExchangeCross(customer){const pool=anyStock();if(!pool.length)return makeSale(customer);const newSku=pick(pool),cmp=compareOffer(newSku,'sale'),oldTypes=['610','980','9999'].filter(t=>t!==newSku.goldType),oldType=pick(oldTypes),oldWeight=Number(rng(.25,2.2).toFixed(3)),expected=exchangeExpected(oldWeight,newSku,oldType,0);if(Math.random()>cmp.conversion){return makeLostCustomer(customer,cmp,'giao dịch đổi khác loại');}const ev={type:'exchangeCross',customer,title:`Đổi khác loại ${oldType} → ${newSku.goldType}`,desc:'',voice:'Đổi khác loại được xử lý như mua vàng cũ và bán món mới theo bảng giá của chính người chơi.',hint:'',data:{oldType,oldWeight,newSku:newSku.sku,fee:0,expected,customerQuote:cmp.phrases[0]}};updateCrossExchangeDesc(ev);return ev; }
  function updateCrossExchangeDesc(ev){ const sku=state.inventoryItems.find(x=>x.sku===ev.data.newSku); if(!sku)return; ev.desc=`${ev.customer.name} đổi ${ev.data.oldWeight} chỉ ${ev.data.oldType} cũ lấy ${sku.sku} ${sku.goldType} nặng ${sku.netChi} chỉ. ${ev.data.customerQuote?`Khách nói: “${ev.data.customerQuote}” `:''}Hãy tính số tiền ròng khách trả thêm; nếu âm là tiệm trả lại.`; ev.hint=`Đổi khác loại: không dùng phí đổi cùng loại.\nTiệm mua vàng cũ = ${ev.data.oldWeight} × giá mua ${ev.data.oldType}.\nTiệm bán món mới = ${sku.netChi} × giá bán ${sku.goldType} + tiền công.\nTiền ròng = bán mới − mua cũ.`; }
  function updateExchangeDesc(ev){ const sku=state.inventoryItems.find(x=>x.sku===ev.data.newSku); if(!sku)return; ev.desc=`${ev.customer.name} đổi ${ev.data.oldWeight} chỉ ${ev.data.oldType} cũ lấy ${sku.sku} nặng ${sku.netChi} chỉ. Phí đổi ${fmt(ev.data.fee)}/chỉ trên TOÀN BỘ vàng cũ. ${ev.data.customerQuote?`Khách nói: “${ev.data.customerQuote}” `:''}Hãy tính số tiền khách trả thêm; nếu âm là tiệm trả lại khách.`; ev.hint=`Kế toán hóa giao dịch:\n1) Tiệm mua vàng cũ = ${ev.data.oldWeight} × giá mua.\n2) Tiệm bán SKU mới = vàng theo giá bán + tiền công.\n3) Phí đổi = TOÀN BỘ vàng cũ × ${fmt(ev.data.fee)}.\nTiền ròng = bán mới + phí đổi − mua cũ.`; }
  function makePawnOpen(customer){
    const principal=Math.round(rng(10e6,85e6)/1e6)*1e6, termDays=pick([15,20,30]); const rate=pawnRateFor(principal), charge=principal*(rate/30)*termDays; const type=pick(['610','980','9999']); const collateralValue=principal*rng(1.35,1.7); const weight=collateralValue/state.market[type].buy; const ev={type:'pawnOpen',customer,title:'Mở hợp đồng cầm vàng',desc:'',voice:SPEECH.pawn,hint:'',data:{principal,termDays,rate,charge,goldType:type,collateralWeight:Number(weight.toFixed(3)),collateralValue}}; updatePawnDesc(ev); return ev;
  }
  function updatePawnDesc(ev){ ev.desc=`${ev.customer.name} cần ${fmt(ev.data.principal)} trong ${ev.data.termDays} ngày, cầm khoảng ${ev.data.collateralWeight} chỉ ${ev.data.goldType}. Mức thu tổng ${pct(ev.data.rate)}/tháng (${policyBandFor(ev.data.principal)}). Hãy tính khoản thu của kỳ đầu.`; ev.hint=`Khoản thu kỳ = gốc × (${pct(ev.data.rate)} / 30) × ${ev.data.termDays} ngày.\nĐây là mức TỔNG đã gồm lãi + phí.\nKhi mở hợp đồng: Quỹ cầm ↓, Dư nợ cầm ↑. Chưa ghi doanh thu.`; }
  function makePawnDue(contract){ return {type:'pawnDue',customer:{name:contract.customer,type:'Khách cầm đồ',mood:'Đến xử lý hợp đồng đang tới hạn.',avatar:'🧾'},title:'Hợp đồng cầm tới hạn',desc:`${contract.id} còn gốc ${fmt(contract.principalBalance)}, mức ${pct(contract.rate)}/tháng, kỳ ${contract.termDays} ngày. Chọn cách khách xử lý hôm nay.`,voice:SPEECH.pawn,hint:'Đóng kỳ = chỉ thu khoản thu kỳ. Bớt gốc = tiền gốc quay lại quỹ cầm và giảm dư nợ. Chuộc = hoàn toàn bộ gốc + khoản thu theo số ngày sử dụng.',data:{contractId:contract.id}}; }
  function makePriceShock(){ const dir=Math.random()>.45?1:-1,delta=Math.round(rng(80_000,220_000)/10000)*10000*dir; return {type:'priceShock',customer:{name:'Thị trường',type:'Biến động giá',mood:'Giá thay đổi giữa ngày.',avatar:'📈'},title:dir>0?'Giá vàng tăng':'Giá vàng giảm',desc:`Giá 610 biến động khoảng ${fmt(Math.abs(delta))}/chỉ. Cập nhật bảng giá hay giữ giá cũ?`,voice:'Bảng giá ảnh hưởng toàn bộ giao dịch phát sinh sau thời điểm cập nhật.',hint:'Cập nhật ngay giảm rủi ro định giá. Giữ giá cũ có thể tạo biên lợi nhuận hoặc rủi ro nhưng uy tín giảm.',data:{delta}}; }
  function makeSupplierScenario(){ const amount=Math.round(rng(100e6,260e6)/10e6)*10e6,s=pick(state.suppliers); return {type:'supplier',customer:{name:s.name,type:'Chành / nhà cung cấp',mood:'Đề nghị giao lô hàng mới.',avatar:'🏭'},title:'Chành đề nghị giao lô mới',desc:`${s.name} đề nghị lô khoảng ${fmt(amount)}. Có thể trả tiền mặt hoặc ghi công nợ.`,voice:SPEECH.supplier,hint:'Tiền mặt: Hàng tồn kho ↑, Tiền ↓.\nCông nợ: Hàng tồn kho ↑, Phải trả chành ↑.',data:{amount,supplierId:s.id}}; }
  function makeServiceOrder(customer){ const fee=Math.round(rng(350_000,900_000)/50_000)*50_000,cost=Math.round(fee*rng(.25,.5)/50_000)*50_000; return {type:'service',customer,title:'Khách sửa / làm mới trang sức',desc:`${customer.name} cần sửa/làm mới món vàng. Phí dịch vụ dự kiến ${fmt(fee)}, chi phí kỹ thuật ${fmt(cost)}. Nhận việc hay từ chối?`,voice:'Dịch vụ tạo doanh thu tiền công nhưng vẫn có chi phí kỹ thuật. Phải tách hai phần để biết lời thật.',hint:`Lãi gộp dịch vụ = phí khách trả − chi phí kỹ thuật.`,data:{fee,cost}}; }
  function makeStaffError(){ let loss=Math.round(rng(1.2e6,5.5e6)/100000)*100000; if(state.upgrades.has('audit'))loss*=.35; return {type:'staffError',customer:{name:'Thu ngân Tùng',type:'Nội bộ',mood:'POS và tiền có dấu hiệu lệch.',avatar:'🧑‍💼'},title:'Sai lệch thu ngân',desc:`Hệ thống cảnh báo khả năng lệch khoảng ${fmt(loss)}. Đối soát ngay hay để cuối ngày?`,voice:SPEECH.staff,hint:'Đối soát ngay giúp xác định và ghi nhận chênh lệch. Bỏ qua sẽ treo tới kiểm quỹ.',data:{loss}}; }
  function makeChanhEvent(){ const pool=inStockByType('610').filter(x=>[622,625,630].includes(Number(x.chanhFactor))); if(!pool.length)return makeServiceOrder(customerProfile()); const sku=pick(pool),factor=Number(sku.chanhFactor),loss=sku.bookCost*chanhRateFor(factor); return {type:'chanh',customer:{name:'Chành hàng',type:'Quy đổi chành',mood:'Đang đối chiếu hàng 610 theo quy.',avatar:'🏭'},title:`Hao chành ${sku.sku}: ${factor} → 610`,desc:`${sku.sku} có giá vốn ${fmt(sku.bookCost)}, quy ${factor}. Rule demo ghi giảm giá trị ${fmt(loss)} khi quy về 610.`,voice:SPEECH.chanh,hint:`Hao demo: ${factor} = ${pct(chanhRateFor(factor))} × giá vốn SKU.\nHệ số này chưa phải công thức tiệm thực tế.`,data:{skuId:sku.sku,factor,loss}}; }
  function makeAudit(){ return {type:'audit',customer:{name:'Cuối ngày',type:'Kiểm quỹ',mood:'Phải khóa tiền và sổ.',avatar:'🧮'},title:'Kiểm quỹ cuối ngày',desc:'Đếm tiền thực, xử lý mọi chênh lệch rồi mới đóng cửa.',voice:'Kiểm quỹ giúp phát hiện sai tiền, bỏ sót giao dịch và thất thoát.',hint:'Nếu có cash variance đang treo, phải ghi nhận trước khi khóa sổ.',data:{}}; }

  function nextSituation(){
    if(!state.started){showView('setup');toast('Hãy mở tiệm trước.');return;} if(state.currentEvent&&!state.currentEvent.done){toast('Hãy xử lý tình huống hiện tại trước.');return;} if(state.situationsToday>=state.dayQueue.length){toast('Đã hết tình huống. Hãy đóng cửa cuối ngày.');return;}
    state.currentEvent=state.dayQueue[state.situationsToday++]; state.totalSituations++; advanceClock(); renderEvent(state.currentEvent); renderAll();
  }
  function eventLabel(t){return ({sale:'BÁN',buyback:'MUA CŨ',exchangeSame:'ĐỔI CÙNG LOẠI',exchangeCross:'ĐỔI KHÁC LOẠI',pawnOpen:'CẦM',pawnDue:'CẦM ĐỒ',priceShock:'THỊ TRƯỜNG',supplier:'CHÀNH',service:'DỊCH VỤ',staffError:'NỘI BỘ',chanh:'HAO CHÀNH',audit:'KIỂM QUỸ',lostCustomer:'MẤT KHÁCH',quietDay:'VẮNG KHÁCH',info:'KHO'})[t]||t.toUpperCase();}
  function answerBox(ph='Nhập kết quả bằng đồng'){return `<div class="answer-row"><input id="answerInput" inputmode="decimal" placeholder="${ph}"><button id="checkAnswer" class="btn primary" type="button">KIỂM TRA</button></div>`;}
  function choiceBox(rows){return `<div class="choice-grid">${rows.map(([id,t,d])=>`<button class="choice-btn" data-choice="${id}" type="button"><strong>${t}</strong><span>${d}</span></button>`).join('')}</div>`;}
  function renderEvent(ev){
    $('#customerName').textContent=ev.customer.name; $('#customerType').textContent=ev.customer.type; $('#customerMood').textContent=ev.customer.mood; $('#customerFace').textContent=ev.customer.avatar; $('#customerAvatar').textContent=ev.customer.avatar; $('#eventTypeBadge').textContent=eventLabel(ev.type); $('#eventTitle').textContent=ev.title; $('#eventBody').textContent=ev.desc; $('#hintBox').textContent=ev.hint||''; $('#hintBox').classList.add('hidden'); $('#npcBubble').textContent=ev.desc;
    let html='';
    if(['sale','buyback','exchangeSame','exchangeCross','pawnOpen'].includes(ev.type)) html=answerBox();
    else if(ev.type==='pawnDue') html=choiceBox([['payCharge','Đóng kỳ','Chỉ trả khoản thu của kỳ, gốc giữ nguyên'],['partialPrincipal','Bớt 5 triệu gốc','Giảm dư nợ và hoàn gốc vào quỹ cầm'],['redeem','Chuộc toàn bộ','Trả gốc + khoản thu theo ngày sử dụng']]);
    else if(ev.type==='priceShock') html=choiceBox([['updatePrice','Cập nhật ngay','Đồng bộ mọi loại vàng và giao dịch sau'],['holdPrice','Giữ giá','Chấp nhận rủi ro / uy tín']]);
    else if(ev.type==='supplier') html=choiceBox([['supplierCash','Nhập tiền mặt','Giảm tiền, tăng kho'],['supplierCredit','Nhập công nợ','Tăng kho, tăng phải trả'],['supplierDecline','Từ chối','Không thay đổi vốn']]);
    else if(ev.type==='service') html=choiceBox([['acceptService','Nhận việc','Thu phí và chịu chi phí kỹ thuật'],['declineService','Từ chối','Không rủi ro nhưng mất cơ hội']]);
    else if(ev.type==='staffError') html=choiceBox([['auditNow','Đối soát ngay','Ghi nhận sai lệch vào sổ'],['auditLater','Để cuối ngày','Treo chênh lệch đến kiểm quỹ']]);
    else if(ev.type==='chanh') html=choiceBox([['applyChanh','Ghi nhận hao','Giảm giá trị SKU và ghi hao'],['skipChanh','Chưa đưa chành','Giữ món trong kho']]);
    else if(ev.type==='audit') html=choiceBox([['countCash','Kiểm quỹ','Xử lý chênh lệch và khóa sổ'],['skipAudit','Bỏ kiểm','Bị phạt uy tín và tự ghi nhận cuối ngày']]);
    else html=choiceBox([['ack','Đã hiểu','Tiếp tục']]);
    $('#transactionArea').innerHTML=html;
    $('#checkAnswer')?.addEventListener('click',checkAnswer);
    renderCashierCalculator(ev);
  }
  function transactionFormula(ev){
    if(!ev)return null;
    const n=v=>Number(v||0);
    if(ev.type==='sale'){
      const sku=state.inventoryItems.find(x=>x.sku===ev.data.skuId); if(!sku)return null;
      const r=retailComponents(sku),sell=r.perChi;
      return {expr:`(${sku.netChi}*${sell})+${r.service}`,explain:`BÁN ${sku.sku}\nGiá vốn vàng ${fmt(sku.goldCost)} + công vốn ${fmt(sku.laborCost)} + dự phòng hao/đổi ${fmt(expectedExchangeCost(sku))} = vốn quản trị ${fmt(managerialCost(sku))}\n${sku.netChi} chỉ × giá bán ${fmt(sell)}/chỉ + công bán ${fmt(r.service)}\n= số tiền khách phải trả`};
    }
    if(ev.type==='buyback'){
      const buy=state.market[ev.data.goldType].buy;
      return {expr:`${ev.data.weight}*${buy}`,explain:`MUA VÀNG CŨ ${ev.data.goldType}\n${ev.data.weight} chỉ × ${fmt(buy)}/chỉ\n= số tiền tiệm trả khách`};
    }
    if(ev.type==='exchangeSame'||ev.type==='exchangeCross'){
      const sku=state.inventoryItems.find(x=>x.sku===ev.data.newSku); if(!sku)return null;
      const r=retailComponents(sku),sell=r.perChi,buy=state.market[ev.data.oldType].buy,fee=n(ev.data.fee);
      const feeExpr=fee?`+(${ev.data.oldWeight}*${fee})`:'';
      return {expr:`((${sku.netChi}*${sell})+${r.service})${feeExpr}-(${ev.data.oldWeight}*${buy})`,explain:`${ev.type==='exchangeSame'?'ĐỔI CÙNG LOẠI':'ĐỔI KHÁC LOẠI'}\nVốn quản trị món mới ${fmt(managerialCost(sku))}\nBán món mới: ${sku.netChi} × ${fmt(sell)} + công bán ${fmt(r.service)}${fee?`\n+ phí đổi: ${ev.data.oldWeight} × ${fmt(fee)}`:''}\n− mua vàng cũ: ${ev.data.oldWeight} × ${fmt(buy)}\n= tiền ròng (âm = tiệm trả khách)`};
    }
    if(ev.type==='pawnOpen'){
      return {expr:`${ev.data.principal}*(${ev.data.rate}/30)*${ev.data.termDays}`,explain:`CẦM ĐỒ KỲ ĐẦU\nGốc ${fmt(ev.data.principal)} × (${pct(ev.data.rate)} / 30) × ${ev.data.termDays} ngày\n= tổng thu kỳ (đã gồm lãi + phí)`};
    }
    return null;
  }
  function initCashierCalculator(){
    const display=$('#calcDisplay'); if(!display)return;
    $$('#cashierCalculator [data-calc]').forEach(b=>b.addEventListener('click',()=>calcKey(b.dataset.calc)));
    $('#calcLoadFormula')?.addEventListener('click',()=>{const f=transactionFormula(state.currentEvent);if(!f){toast('Tình huống này không có công thức tiền tự động.');return;}display.value=f.expr;$('#calcStatus').textContent='Đã nạp công thức';display.focus();});
    $('#calcUseResult')?.addEventListener('click',()=>{let result=state.calcLastResult;if(!Number.isFinite(result)){result=calculateDisplay(false);}if(!Number.isFinite(result))return;const input=$('#answerInput');if(!input){toast('Tình huống hiện tại không có ô thu / chi.');return;}input.value=Math.round(result).toLocaleString('vi-VN');input.focus();toast('Đã điền kết quả vào ô thu / chi.');});
    $('#calcClearHistory')?.addEventListener('click',()=>{state.calcHistory=[];state.calcLastResult=null;renderCalcHistory();toast('Đã xóa lịch sử máy tính.');});
    display.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();calculateDisplay(true);}});
    $('#calcHistory')?.addEventListener('click',e=>{const item=e.target.closest('[data-calc-history]');if(!item)return;const h=state.calcHistory[Number(item.dataset.calcHistory)];if(!h)return;display.value=h.expr;state.calcLastResult=h.result;$('#calcStatus').textContent=fmt(h.result);});
    renderCashierCalculator(state.currentEvent);
  }
  function calcKey(key){const d=$('#calcDisplay');if(!d)return;if(key==='C'){d.value='';state.calcLastResult=null;$('#calcStatus').textContent='Sẵn sàng';return;}if(key==='back'){d.value=d.value.slice(0,-1);return;}if(key==='='){calculateDisplay(true);return;}d.value+=key;d.focus();}
  function safeCalculate(expr){
    const clean=String(expr||'').replace(/×/g,'*').replace(/÷/g,'/').replace(/,/g,'').trim();
    if(!clean||clean.length>240||!/^[0-9+\-*/().\s]+$/.test(clean))return NaN;
    try{const v=Function(`"use strict";return (${clean})`)();return Number.isFinite(v)?v:NaN;}catch{return NaN;}
  }
  function calculateDisplay(saveHistory=true){
    const d=$('#calcDisplay');if(!d)return NaN;const expr=d.value.trim();const result=safeCalculate(expr);if(!Number.isFinite(result)){toast('Phép tính chưa hợp lệ.');$('#calcStatus').textContent='Lỗi công thức';return NaN;}
    state.calcLastResult=result;$('#calcStatus').textContent=fmt(result);
    if(saveHistory){state.calcHistory.unshift({expr,result,label:state.currentEvent?.title||'Tính tự do',day:state.day,time:clockText()});state.calcHistory=state.calcHistory.slice(0,30);renderCalcHistory();save(true);}
    return result;
  }
  function renderCashierCalculator(ev){
    const guide=$('#calcFormulaGuide');if(!guide)return;const f=transactionFormula(ev);guide.textContent=f?f.explain:'Máy tính luôn sẵn sàng. Khi có giao dịch bán / mua cũ / đổi / cầm đồ, công thức sẽ hiện ở đây để khách và nhân viên cùng xem.';$('#calcLoadFormula').disabled=!f;renderCalcHistory();
  }
  function renderCalcHistory(){
    const el=$('#calcHistory');if(!el)return;el.innerHTML=state.calcHistory.length?state.calcHistory.map((h,i)=>`<button class="calc-history-item" data-calc-history="${i}" type="button"><small>Ngày ${h.day} · ${h.time} · ${esc(h.label)}</small><code>${esc(h.expr)}</code><strong>${fmt(h.result)}</strong><span>Bấm để nạp lại phép tính</span></button>`).join(''):'<div class="muted">Chưa có phép tính. Lịch sử sẽ giữ các bước trước để xem lại ngay tại quầy.</div>';
  }

  function parseAnswer(){ const raw=$('#answerInput')?.value||''; return Number(raw.replace(/[.\s,₫đ]/gi,'')); }
  function checkAnswer(){
    const ev=state.currentEvent;if(!ev||ev.done)return; const ans=parseAnswer(); if(!Number.isFinite(ans)){toast('Nhập một số tiền hợp lệ.');return;} const expected=Number(ev.data.expected??ev.data.charge); const tolerance=Math.max(10_000,Math.abs(expected)*.012); if(Math.abs(ans-expected)>tolerance){state.reputation=clamp(state.reputation-.5,0,100); recordCustomerMistake(ev.customer,'Tính tiền sai tại quầy'); $('#hintBox').classList.remove('hidden'); toast(`Chưa đúng. Sai lệch khoảng ${short(ans-expected)}.`);return;}
    state.daily.correct++; gainXP(10); prepareSettlement(ev,expected); toast('Tính đúng. Chuyển sang bước thu / chi tại POS.');
  }

  function applySale(ev){
    const sku=state.inventoryItems.find(x=>x.sku===ev.data.skuId&&x.status==='in_stock'); if(!sku){toast('SKU không còn trong kho.');return false;} const r=retailComponents(sku); state.cash+=r.total; state.daily.salesRevenue+=r.gold; state.daily.serviceRevenue+=r.service; state.daily.cogs+=sku.bookCost; sku.status='sold';sku.soldDay=state.day;
    postJournal(`Bán ${sku.sku}`,[{account:'Tiền mặt',debit:r.total},{account:'Doanh thu bán vàng',credit:r.gold},{account:'Doanh thu tiền công',credit:r.service},{account:'Giá vốn hàng bán',debit:sku.bookCost},{account:'Hàng tồn kho',credit:sku.bookCost}]); addLedger(`Bán ${sku.sku}`,r.total,'plus'); return true;
  }
  function applyBuyback(ev){
    if(state.cash<ev.data.expected){toast('Tiền mặt không đủ mua vàng cũ.');return false;} state.cash-=ev.data.expected; const sku=createSku({goldType:ev.data.goldType,netChi:ev.data.weight,stoneChi:0,source:'buyback',supplierId:'',bookCost:ev.data.expected,name:`Vàng cũ ${ev.data.goldType}`}); state.inventoryItems.push(sku); postJournal(`Mua vàng cũ ${sku.sku}`,[{account:'Hàng tồn kho',debit:sku.bookCost},{account:'Tiền mặt',credit:sku.bookCost}]); addLedger(`Mua vàng cũ ${sku.sku}`,-sku.bookCost,'minus'); return true;
  }
  function applyExchange(ev){
    const sku=state.inventoryItems.find(x=>x.sku===ev.data.newSku&&x.status==='in_stock'); if(!sku){toast('SKU đổi đã hết.');return false;} const oldValue=ev.data.oldWeight*state.market[ev.data.oldType].buy, r=retailComponents(sku), fee=ev.data.oldWeight*ev.data.fee, saleTotal=r.total+fee, delta=saleTotal-oldValue; if(delta<0&&state.cash<Math.abs(delta)){toast('Tiền mặt không đủ trả phần dư cho khách.');return false;}
    state.cash+=delta; state.daily.salesRevenue+=r.gold; state.daily.serviceRevenue+=r.service+fee; state.daily.cogs+=sku.bookCost; sku.status='sold';sku.soldDay=state.day; const oldSku=createSku({goldType:ev.data.oldType,netChi:ev.data.oldWeight,source:'exchange',bookCost:oldValue,name:`Vàng đổi cũ ${ev.data.oldType}`}); state.inventoryItems.push(oldSku);
    const entries=[{account:'Hàng tồn kho',debit:oldValue},{account:'Giá vốn hàng bán',debit:sku.bookCost},{account:'Doanh thu bán vàng',credit:r.gold},{account:'Doanh thu tiền công & phí đổi',credit:r.service+fee},{account:'Hàng tồn kho',credit:sku.bookCost}]; if(delta>=0)entries.push({account:'Tiền mặt',debit:delta}); else entries.push({account:'Tiền mặt',credit:Math.abs(delta)}); postJournal(`${ev.type==='exchangeCross'?'Đổi khác loại':'Đổi cùng loại'} ${ev.data.oldType}`,entries); addLedger(ev.type==='exchangeCross'?'Đổi vàng khác loại':'Đổi vàng cùng loại',delta,delta>=0?'plus':'minus'); return true;
  }
  function applyPawnOpen(ev){
    if(state.pawnFund<ev.data.principal){toast('Quỹ cầm đồ không đủ.');return false;} state.pawnFund-=ev.data.principal; const id='P-'+String(state.pawnSeq++).padStart(4,'0'); state.pawnContracts.push({id,customer:ev.customer.name,goldType:ev.data.goldType,collateralWeight:ev.data.collateralWeight,collateralValue:ev.data.collateralValue,originalPrincipal:ev.data.principal,principalBalance:ev.data.principal,rate:ev.data.rate,termDays:ev.data.termDays,startDay:state.day,lastChargeDay:state.day,nextDueDay:state.day+ev.data.termDays,status:'active',payments:[]}); postJournal(`Giải ngân ${id}`,[{account:'Dư nợ cầm đồ',debit:ev.data.principal},{account:'Quỹ cầm đồ',credit:ev.data.principal}]); addLedger(`Giải ngân ${id}`,-ev.data.principal,'minus'); return true;
  }

  function processChoice(choice){
    const ev=state.currentEvent;if(!ev||ev.done)return;
    if(ev.type==='lostCustomer'){state.daily.lostCustomers=(state.daily.lostCustomers||0)+1;touchCustomer(ev.customer,0,false);state.reputation=clamp(state.reputation-.15,0,100);ev.done=true;state.daily.handled++;gainXP(1);toast('Khách rời tiệm sau khi so sánh thị trường.');renderAll();save(true);return;}
    if(ev.type==='quietDay'){state.reputation=clamp(state.reputation-.05,0,100);completeEvent('Đã ghi nhận một ngày vắng khách. Chi phí vận hành vẫn phát sinh.');return;}
    if(ev.type==='pawnDue'){ const c=findContract(ev.data.contractId); if(!c)return; if(choice==='payCharge')payPawnCharge(c); else if(choice==='partialPrincipal')payPawnPrincipal(c,5_000_000); else if(choice==='redeem')redeemPawn(c); completeEvent('Đã cập nhật hợp đồng cầm.'); return; }
    if(ev.type==='priceShock'){ if(choice==='updatePrice'){applyMarketDelta(ev.data.delta,true);state.reputation=clamp(state.reputation+1,0,100);gainXP(10);completeEvent('Đã cập nhật giá thị trường và bảng giá bán của tiệm.');} else {state.market.trend='Giữ giá cũ';state.reputation=clamp(state.reputation-2,0,100);gainXP(3);completeEvent('Bạn giữ giá cũ, uy tín giảm nhẹ.');} return; }
    if(ev.type==='supplier'){ if(choice==='supplierDecline'){completeEvent('Đã từ chối lô hàng.');return;} const ok=receiveSupplierBatch(ev.data.supplierId,ev.data.amount,choice==='supplierCredit'?'credit':'cash'); if(ok){gainXP(10);completeEvent('Đã nhập lô hàng và ghi đúng nguồn vốn.');} return; }
    if(ev.type==='service'){ if(choice==='acceptService'){ if(state.cash<ev.data.cost){toast('Không đủ tiền xử lý chi phí kỹ thuật.');return;} state.cash+=ev.data.fee-ev.data.cost; state.daily.serviceRevenue+=ev.data.fee; state.daily.repairCost+=ev.data.cost; postJournal('Dịch vụ sửa/làm mới',[{account:'Tiền mặt',debit:ev.data.fee},{account:'Doanh thu dịch vụ',credit:ev.data.fee},{account:'Chi phí sửa hàng',debit:ev.data.cost},{account:'Tiền mặt',credit:ev.data.cost}]); addLedger('Dịch vụ sửa hàng',ev.data.fee-ev.data.cost,'plus');gainXP(9);completeEvent('Đã nhận và hoàn thành dịch vụ.');} else completeEvent('Đã từ chối dịch vụ.'); return; }
    if(ev.type==='staffError'){ state.daily.cashVariance-=ev.data.loss; if(choice==='auditNow'){settleVariance('Đối soát sai lệch thu ngân');state.reputation=clamp(state.reputation+1,0,100);gainXP(12);completeEvent('Đã ghi nhận sai lệch.');} else {state.reputation=clamp(state.reputation-1,0,100);completeEvent('Sai lệch đang treo tới cuối ngày.');} return; }
    if(ev.type==='chanh'){ if(choice==='applyChanh'){const sku=state.inventoryItems.find(x=>x.sku===ev.data.skuId&&x.status==='in_stock');if(!sku){toast('SKU không còn tồn.');return;} const loss=Math.min(sku.bookCost*.5,ev.data.loss); sku.bookCost-=loss;sku.goldCost=Math.max(1,(Number(sku.goldCost)||sku.bookCost)-loss);sku.chanhAdjusted=true; state.daily.chanhLoss+=loss; postJournal(`Hao chành ${sku.sku}`,[{account:'Hao chành',debit:loss},{account:'Hàng tồn kho',credit:loss}]);addLedger(`Hao chành ${sku.sku}`,-loss,'minus');gainXP(10);completeEvent('Đã ghi nhận hao chành vào giá trị kho.');} else completeEvent('Chưa đưa SKU lên chành.'); return; }
    if(ev.type==='audit'){ if(choice==='countCash'){ if(state.daily.cashVariance)settleVariance('Đối soát cuối ngày'); state.daily.auditDone=true;state.daily.auditResult='Đã khóa sổ';gainXP(14);completeEvent('Đã kiểm quỹ.');} else {state.daily.auditDone=true;state.daily.auditResult='Bỏ kiểm';state.reputation=clamp(state.reputation-4,0,100);completeEvent('Bạn bỏ kiểm quỹ.');} return; }
    completeEvent('Đã ghi nhận.');
  }
  function settleVariance(label){ const v=state.daily.cashVariance;if(!v)return; state.cash+=v; if(v<0)state.daily.staffLoss+=Math.abs(v); const entries=v<0?[{account:'Thất thoát',debit:Math.abs(v)},{account:'Tiền mặt',credit:Math.abs(v)}]:[{account:'Tiền mặt',debit:v},{account:'Thu nhập khác',credit:v}]; postJournal(label,entries); addLedger(label,v,v>=0?'plus':'minus'); state.daily.cashVariance=0; }
  function completeEvent(msg){ if(state.currentEvent){state.currentEvent.done=true; touchCustomer(state.currentEvent.customer,state.currentEvent.settlementValue||0,true);} state.daily.handled++;toast(msg);updateAchievements();renderAll();if(state.started)save(true); }

  function applyMarketDelta(delta610,syncStore=false){
    const ratios={'610':1,'980':1.55,'9999':1.7};Object.keys(ratios).forEach(k=>{const d=delta610*ratios[k];state.market[k].buy=Math.max(1e6,state.market[k].buy+d);state.market[k].sell=Math.max(state.market[k].buy+150000,state.market[k].sell+d);if(syncStore)state.pricing.goldSell[k]=Math.max(state.market[k].buy+50_000,(state.pricing.goldSell[k]||state.market[k].sell)+d);});state.market.trend=delta610>0?'Tăng':'Giảm';syncPricingInputs();refreshFutureEvents();renderCompetitionPanel();
  }

  function findContract(id){return state.pawnContracts.find(c=>c.id===id);}
  function chargeForDays(c,days){return c.principalBalance*(c.rate/30)*Math.max(1,days);}
  function payPawnCharge(c){ const days=Math.max(1,Math.min(c.termDays,state.day-c.lastChargeDay||c.termDays)),charge=chargeForDays(c,days); state.cash+=charge; state.daily.pawnIncome+=charge; c.payments.push({day:state.day,type:'charge',amount:charge}); c.lastChargeDay=state.day;c.nextDueDay=state.day+c.termDays;c.status='active'; postJournal(`Thu kỳ ${c.id}`,[{account:'Tiền mặt',debit:charge},{account:'Doanh thu cầm đồ',credit:charge}]);addLedger(`Thu kỳ ${c.id}`,charge,'plus');gainXP(8); }
  function payPawnPrincipal(c,amount){ const pay=Math.min(c.principalBalance,amount); if(pay<=0)return; state.pawnFund+=pay;c.principalBalance-=pay;c.payments.push({day:state.day,type:'principal',amount:pay});postJournal(`Bớt gốc ${c.id}`,[{account:'Quỹ cầm đồ',debit:pay},{account:'Dư nợ cầm đồ',credit:pay}]);addLedger(`Hoàn gốc ${c.id}`,pay,'plus');if(c.principalBalance<=1){c.principalBalance=0;c.status='redeemed';}gainXP(6); }
  function redeemPawn(c){ if(!['active','overdue'].includes(c.status))return; const days=Math.max(1,state.day-c.lastChargeDay),charge=chargeForDays(c,days),principal=c.principalBalance; state.pawnFund+=principal;state.cash+=charge;state.daily.pawnIncome+=charge;c.payments.push({day:state.day,type:'redeem',principal,charge});c.principalBalance=0;c.status='redeemed';postJournal(`Chuộc ${c.id}`,[{account:'Quỹ cầm đồ',debit:principal},{account:'Tiền mặt',debit:charge},{account:'Dư nợ cầm đồ',credit:principal},{account:'Doanh thu cầm đồ',credit:charge}]);addLedger(`Chuộc ${c.id}`,charge,'plus');gainXP(12); }
  function extendPawn(c){ if(!['active','overdue'].includes(c.status))return; const charge=chargeForDays(c,c.termDays);state.cash+=charge;state.daily.pawnIncome+=charge;c.payments.push({day:state.day,type:'extend',amount:charge});c.lastChargeDay=state.day;c.nextDueDay=state.day+c.termDays;c.status='active';postJournal(`Gia hạn ${c.id}`,[{account:'Tiền mặt',debit:charge},{account:'Doanh thu cầm đồ',credit:charge}]);addLedger(`Gia hạn ${c.id}`,charge,'plus'); }
  function liquidatePawn(c){ const overdue=state.day-c.nextDueDay;if(c.status!=='overdue'||overdue<GOLD_RULES.liquidationOverdueDays){toast(`Rule game yêu cầu quá hạn ít nhất ${GOLD_RULES.liquidationOverdueDays} ngày.`);return;} const value=c.principalBalance; const sku=createSku({goldType:c.goldType,netChi:c.collateralWeight,source:'pawn_liquidation',bookCost:value,name:`Hàng cầm chuyển kho ${c.goldType}`});state.inventoryItems.push(sku);c.principalBalance=0;c.status='liquidated';postJournal(`Chuyển tài sản cầm ${c.id} sang kho`,[{account:'Hàng tồn kho',debit:value},{account:'Dư nợ cầm đồ',credit:value}]);addLedger(`Chuyển ${c.id} sang kho`,0,'plus');toast('Đã chuyển tài sản sang hàng chờ xử lý theo rule mô phỏng, chưa ghi lợi nhuận.');renderAll(); }
  function processContractAction(action,id){ const c=findContract(id);if(!c)return; if(action==='charge')payPawnCharge(c);if(action==='principal')payPawnPrincipal(c,5e6);if(action==='redeem')redeemPawn(c);if(action==='extend')extendPawn(c);if(action==='liquidate')liquidatePawn(c);save(true);renderAll();renderPawn();renderFinance(); }
  function refreshContractStatuses(){ state.pawnContracts.forEach(c=>{if(c.status==='active'&&state.day>c.nextDueDay)c.status='overdue';}); }

  function receiveSupplierBatch(supplierId,amount,mode){
    const sup=state.suppliers.find(s=>s.id===supplierId);if(!sup)return false; const batch=createBatch(amount,supplierId,'supplier');if(batch.total<=0){toast('Không tạo được lô hàng.');return false;} if(mode==='cash'){if(state.cash<batch.total+state.allocations.reserve*.35){toast('Tiền mặt quá mỏng để nhập lô này.');return false;}state.cash-=batch.total;postJournal(`Nhập hàng ${sup.name}`,[{account:'Hàng tồn kho',debit:batch.total},{account:'Tiền mặt',credit:batch.total}]);addLedger(`Nhập hàng ${sup.name}`,-batch.total,'minus');}
    else {if(sup.balance+batch.total>sup.creditLimit){toast('Vượt hạn mức công nợ của chành.');return false;}sup.balance+=batch.total;postJournal(`Nhập công nợ ${sup.name}`,[{account:'Hàng tồn kho',debit:batch.total},{account:'Phải trả chành',credit:batch.total}]);addLedger(`Nhập công nợ ${sup.name}`,0,'plus');}
    state.inventoryItems.push(...batch.items);toast(`Đã nhập ${batch.items.length} SKU, giá vốn ${short(batch.total)}.`);return true;
  }
  function placeSupplierOrder(){ if(!state.started){toast('Hãy mở tiệm trước.');return;} const amount=Number($('#supplierOrderAmount').value),supplierId=$('#supplierSelect').value,mode=$('#supplierPayMode').value;if(!Number.isFinite(amount)||amount<10e6){toast('Ngân sách nhập tối thiểu 10 triệu.');return;} if(receiveSupplierBatch(supplierId,amount,mode)){renderAll();renderInventory();renderFinance();save(true);} }
  function paySupplier(id){ const s=state.suppliers.find(x=>x.id===id);if(!s||s.balance<=0)return;const pay=Math.min(100e6,s.balance);if(state.cash<pay+100e6){toast('Không đủ thanh khoản an toàn để trả công nợ.');return;}state.cash-=pay;s.balance-=pay;postJournal(`Thanh toán ${s.name}`,[{account:'Phải trả chành',debit:pay},{account:'Tiền mặt',credit:pay}]);addLedger(`Trả chành ${s.name}`,-pay,'minus');toast(`Đã trả ${short(pay)} cho ${s.name}.`);renderAll();renderFinance();renderInventory(); }
  function stockAudit(){ if(!state.started)return; const stock=anyStock();if(!stock.length){state.stockAudit='Kho trống';renderInventory();return;} const risk=(state.upgrades.has('inventoryPro')?.06:.14)*(state.upgrades.has('securityPlus')?.55:1); if(Math.random()<risk){const item=pick(stock);item.status='missing';state.daily.staffLoss+=item.bookCost;postJournal(`Lệch kho ${item.sku}`,[{account:'Thất thoát kho',debit:item.bookCost},{account:'Hàng tồn kho',credit:item.bookCost}]);state.stockAudit=`Lệch 1 SKU: ${item.sku}, giá vốn ${fmt(item.bookCost)} đã ghi thất thoát.`;state.reputation=clamp(state.reputation-1,0,100);}else{state.stockAudit=`Khớp ${stock.length} SKU đang tồn. Không phát hiện chênh.`;gainXP(8);}renderInventory();renderAll(); }
  function showSkuDetail(id){const x=state.inventoryItems.find(i=>i.sku===id);if(!x)return;ensureSkuCosting(x);const r=retailComponents(x);toast(`${x.sku} · vàng vốn ${fmt(x.goldCost)} + công vốn ${fmt(x.laborCost)} + dự phòng hao/đổi ${fmt(expectedExchangeCost(x))} = vốn quản trị ${fmt(managerialCost(x))} · bán dự kiến ${fmt(r.total)} · lãi gộp ${fmt(r.margin)}`);}

  function borrow(){ if(!state.started)return;if(state.bankDebt>=5e9){toast('Giới hạn vay mô phỏng hiện tại là 5 tỷ.');return;}state.bankDebt+=1e9;state.cash+=1e9;postJournal('Vay ngân hàng',[{account:'Tiền mặt',debit:1e9},{account:'Nợ ngân hàng',credit:1e9}]);addLedger('Vay ngân hàng',1e9,'plus');toast('Đã vay 1 tỷ.');renderAll();renderFinance(); }
  function repayDebt(){ const pay=Math.min(500e6,state.bankDebt);if(pay<=0){toast('Không có nợ ngân hàng.');return;}if(state.cash<pay+state.allocations.reserve*.4){toast('Thanh khoản không đủ an toàn để trả nợ.');return;}state.cash-=pay;state.bankDebt-=pay;postJournal('Trả nợ ngân hàng',[{account:'Nợ ngân hàng',debit:pay},{account:'Tiền mặt',credit:pay}]);addLedger('Trả nợ ngân hàng',-pay,'minus');renderAll();renderFinance(); }
  function buyUpgrade(id){ const u=UPGRADES.find(x=>x.id===id);if(!u||state.upgrades.has(id))return;if(state.level<u.level){toast(`Cần Level ${u.level}.`);return;}if(state.cash<u.cost+state.allocations.reserve*.4){toast('Không đủ tiền mặt an toàn.');return;}state.cash-=u.cost;state.fixedAssets+=u.cost;state.upgrades.add(id);postJournal(`Nâng cấp ${u.name}`,[{account:'Tài sản cố định',debit:u.cost},{account:'Tiền mặt',credit:u.cost}]);if(id==='signage')state.reputation=clamp(state.reputation+2,0,100);toast(`Đã mua ${u.name}.`);renderAll();renderManagement(); }

  function operatingCostBreakdown(){
    if(!state.started)return[]; const payroll=state.staff.reduce((s,x)=>s+x.salary,0)/30,software=350_000,security=state.upgrades.has('securityPlus')?650_000:500_000,utilities=state.tier.id==='luxury'?1_300_000:state.tier.id==='standard'?850_000:600_000,insurance=250_000,marketing=state.allocations.marketing/30; return [['Thuê mặt bằng',state.location.dailyRent],['Lương nhân viên',payroll],['Phần mềm',software],['An ninh',security],['Điện nước',utilities],['Bảo hiểm mô phỏng',insurance],['Marketing',marketing],['Vận hành cửa hàng',state.tier.dailyOps]];
  }
  function endDay(){
    if(!state.started)return;const required=Math.min(8,state.dayQueue.length);if(state.daily.handled<required){toast(`Hãy xử lý ít nhất ${required} tình huống của ngày hôm nay.`);return;}if(!state.daily.auditDone){toast('Chưa xử lý kiểm quỹ cuối ngày.');return;}if(state.daily.cashVariance)settleVariance('Tự ghi chênh lệch cuối ngày');
    const costs=operatingCostBreakdown(),operating=costs.reduce((s,x)=>s+x[1],0),interest=state.bankDebt*GOLD_RULES.bankAnnualInterest/365,totalCash=operating+interest; if(state.cash<totalCash){toast('Tiền mặt không đủ trả chi phí cuối ngày. Cần vay hoặc giải phóng vốn.');return;}state.cash-=totalCash;state.daily.operatingExpense=operating;state.daily.interestExpense=interest; costs.forEach(([n,v])=>postJournal(n,[{account:'Chi phí vận hành',debit:v},{account:'Tiền mặt',credit:v}])); if(interest)postJournal('Lãi vay ngân hàng',[{account:'Chi phí lãi vay',debit:interest},{account:'Tiền mặt',credit:interest}]);
    const branchNet=simulateBranchDay(); if(branchNet){state.cash+=branchNet; state.daily.branchIncome+=Math.max(0,branchNet); if(branchNet<0)state.daily.branchExpense+=Math.abs(branchNet); postJournal('Kết quả chi nhánh mô phỏng',[{account:'Tiền mặt',debit:Math.max(0,branchNet)},{account:'Chi phí chi nhánh',debit:Math.max(0,-branchNet)},{account:'Thu nhập chi nhánh',credit:Math.max(0,branchNet)},{account:'Tiền mặt',credit:Math.max(0,-branchNet)}].filter(x=>x.debit||x.credit));}
    const net=currentDailyNet(); state.campaign.daysSurvived=(state.campaign.daysSurvived||0)+1; updateCampaignScore(); updateAchievements(); state.history.unshift({day:state.day,net,branchNet,cash:state.cash,pawnFund:state.pawnFund,inventory:inventoryValue(),receivable:pawnReceivable(),bankDebt:state.bankDebt,supplierPayable:supplierPayable(),rep:state.reputation,daily:{...state.daily}}); if(net>=0){state.reputation=clamp(state.reputation+1,0,100);gainXP(25);}else state.reputation=clamp(state.reputation-2,0,100); state.day++;save(true);renderReport();showView('report');toast(net>=0?'Đã khóa sổ: ngày có lãi.':'Đã khóa sổ: ngày đang lỗ.');
  }
  function newDay(){beginDay();showView('store3d');}

  function gainXP(x){ state.xp+=x;const t=[0,100,250,450,700,1000,1400,1900,2500,3300,4200,5200];let lvl=1;for(let i=1;i<t.length;i++)if(state.xp>=t[i])lvl=i+1;if(lvl>state.level){state.level=lvl;state.reputation=clamp(state.reputation+2,0,100);toast(`Lên Level ${lvl}!${lvl===3?' Đã mở bản đồ.':lvl===5?' Đã mở chi nhánh.':''}`);updateAchievements();} }
  function resetCustomerCard(){ $('#customerName').textContent='Chưa có khách';$('#customerType').textContent='Khách hàng';$('#customerMood').textContent='Hãy đón tình huống đầu tiên.';$('#customerFace').textContent='👤';$('#customerAvatar').textContent='👤';$('#eventTypeBadge').textContent='—';$('#npcBubble').textContent='Mở cửa để đón tình huống đầu tiên.'; state.pendingSettlement=null; renderSettlement(); }


  function touchCustomer(customer,value=0,successful=true){
    if(!customer?.name||['Thị trường','Cuối ngày','Chành hàng','Thu ngân Tùng'].includes(customer.name)||['Biến động giá','Nội bộ','Kiểm quỹ','Quy đổi chành','Chành / nhà cung cấp'].includes(customer.type))return;
    let rec=state.customers.find(c=>c.id===customer.customerId)||state.customers.find(c=>c.name===customer.name);
    if(!rec){rec={id:'C-'+String(state.customers.length+1).padStart(4,'0'),name:customer.name,visits:0,totalValue:0,loyalty:50,lastDay:0,notes:[],mistakes:0};state.customers.push(rec);}
    rec.visits+=1;rec.totalValue+=Math.abs(Number(value)||0);rec.lastDay=state.day;rec.loyalty=clamp(rec.loyalty+(successful?2:-4),0,100);customer.customerId=rec.id;
  }
  function recordCustomerMistake(customer,note){if(!customer?.name||['Biến động giá','Nội bộ','Kiểm quỹ','Quy đổi chành','Chành / nhà cung cấp'].includes(customer.type))return;let rec=state.customers.find(c=>c.name===customer.name);if(!rec){rec={id:'C-'+String(state.customers.length+1).padStart(4,'0'),name:customer.name,visits:0,totalValue:0,loyalty:50,lastDay:state.day,notes:[],mistakes:0};state.customers.push(rec);customer.customerId=rec.id;}rec.mistakes=(rec.mistakes||0)+1;rec.loyalty=clamp(rec.loyalty-3,0,100);rec.notes.unshift(`N${state.day}: ${note}`);rec.notes=rec.notes.slice(0,5);}
  function prepareSettlement(ev,answerExpected){
    let amount=answerExpected,direction='collect',explain='Thu tiền khách theo kết quả vừa tính.';
    if(ev.type==='buyback'){direction='pay';amount=Math.abs(answerExpected);explain='Tiệm trả tiền mua vàng cũ cho khách.';}
    if(ev.type==='exchangeSame'||ev.type==='exchangeCross'){direction=answerExpected>=0?'collect':'pay';amount=Math.abs(answerExpected);explain=direction==='collect'?'Khách bù phần chênh lệch.':'Tiệm trả phần dư cho khách.';}
    if(ev.type==='pawnOpen'){direction='pay';amount=ev.data.principal;explain=`Giải ngân ${fmt(amount)}. Khoản thu kỳ dự kiến ${fmt(answerExpected)} sẽ thu theo hợp đồng, không thu ngay khi mở cầm.`;}
    state.pendingSettlement={eventType:ev.type,direction,amount,answerExpected,explain,eventTitle:ev.title,customer:ev.customer};renderSettlement();
  }
  function renderSettlement(){const box=$('#posSettlement');if(!box)return;const p=state.pendingSettlement;if(!p){box.classList.add('hidden');if(state.receipts.length)renderLastReceipt(state.receipts[0]);else $('#lastReceipt')?.classList.add('hidden');return;}box.classList.remove('hidden');$('#posTitle').textContent=p.eventTitle;$('#posDirection').textContent=p.direction==='collect'?'THU KHÁCH':'CHI KHÁCH';$('#posAmount').textContent=fmt(p.amount);$('#posExplanation').textContent=p.explain;$('#tenderWrap').classList.toggle('hidden',p.direction!=='collect');$('#exactTenderBtn').classList.toggle('hidden',p.direction!=='collect');if(p.direction!=='collect')$('#tenderInput').value='';updateChangeDue();}
  function parseMoneyInput(v){return Number(String(v||'').replace(/[^0-9-]/g,''))||0;}
  function updateChangeDue(){const p=state.pendingSettlement;if(!p)return;const tender=parseMoneyInput($('#tenderInput')?.value);const change=p.direction==='collect'?Math.max(0,tender-p.amount):0;$('#changeAmount').textContent=fmt(change);$('#posCashHint').textContent=p.direction==='collect'?(tender<p.amount?`Còn thiếu ${fmt(p.amount-tender)}`:`Thối khách ${fmt(change)}`):'Xác nhận xuất tiền từ quầy / quỹ phù hợp.';}
  function fillExactTender(){const p=state.pendingSettlement;if(!p||p.direction!=='collect')return;$('#tenderInput').value=Math.round(p.amount).toLocaleString('vi-VN');updateChangeDue();}
  function confirmSettlement(){
    const p=state.pendingSettlement,ev=state.currentEvent;if(!p||!ev||ev.done)return;
    if(p.direction==='collect'){const tender=parseMoneyInput($('#tenderInput').value);if(tender<p.amount){toast('Tiền khách đưa chưa đủ.');return;}}
    let ok=false;if(ev.type==='sale')ok=applySale(ev);if(ev.type==='buyback')ok=applyBuyback(ev);if(ev.type==='exchangeSame'||ev.type==='exchangeCross')ok=applyExchange(ev);if(ev.type==='pawnOpen')ok=applyPawnOpen(ev);if(!ok)return;
    const change=p.direction==='collect'?Math.max(0,parseMoneyInput($('#tenderInput').value)-p.amount):0;
    const receipt={id:'R-'+String(state.receiptSeq++).padStart(5,'0'),day:state.day,time:clockText(),customer:ev.customer.name,type:eventLabel(ev.type),title:ev.title,direction:p.direction,amount:p.amount,tender:p.direction==='collect'?parseMoneyInput($('#tenderInput').value):0,change,formula:transactionFormula(ev)?.explain||'',answer:p.answerExpected};
    state.receipts.unshift(receipt);state.receipts=state.receipts.slice(0,200);ev.settlementValue=p.amount;state.pendingSettlement=null;renderSettlement();renderLastReceipt(receipt);gainXP(12);completeEvent(`Đã ${p.direction==='collect'?'thu':'chi'} ${fmt(p.amount)} và in phiếu ${receipt.id}.`);save(true);
  }
  function renderLastReceipt(r){const el=$('#lastReceipt');if(!el||!r)return;el.classList.remove('hidden');el.innerHTML=`<div class="receipt-head"><strong>${r.id} · ${esc(r.type)}</strong><span>${r.direction==='collect'?'THU':'CHI'} ${fmt(r.amount)}</span></div><div>${esc(r.customer)}${r.tender?` · Khách đưa ${fmt(r.tender)}`:''}${r.change?` · Thối ${fmt(r.change)}`:''}</div>${r.formula?`<div class="receipt-formula">${esc(r.formula)}</div>`:''}`;}
  function showReceipt(id){const r=state.receipts.find(x=>x.id===id);if(!r)return;toast(`${r.id} · ${r.customer} · ${fmt(r.amount)} · ${r.title}`);}

  function renderCustomers(){
    if(!state.started)return;const f=$('#customerFilter')?.value||'all';let rows=[...state.customers];if(f==='vip')rows=rows.filter(c=>c.loyalty>=70||c.totalValue>=100e6);if(f==='risk')rows=rows.filter(c=>c.loyalty<45||c.mistakes>=2);
    const vip=state.customers.filter(c=>c.loyalty>=70).length,total=state.customers.reduce((s,c)=>s+c.totalValue,0),avg=state.customers.length?state.customers.reduce((s,c)=>s+c.loyalty,0)/state.customers.length:0;
    $('#customerStats').innerHTML=[['Hồ sơ khách',state.customers.length],['Khách trung thành',vip],['Giá trị giao dịch CRM',total],['Tin tưởng TB',Math.round(avg)]].map(([n,v],i)=>`<div class="report-card"><span>${n}</span><strong>${i===2?short(v):i===3?v+'/100':v}</strong></div>`).join('');
    $('#customerList').innerHTML=rows.length?rows.sort((a,b)=>b.loyalty-a.loyalty).map(c=>`<div class="crm-card"><div class="crm-top"><h3>${esc(c.name)}</h3><span class="tag">${c.loyalty>=75?'VIP':c.visits>=3?'Khách quen':'Khách'}</span></div><p>${c.notes?.[0]?esc(c.notes[0]):'Chưa có ghi chú xấu.'}</p><div class="crm-metrics"><div><span>Lượt ghé</span><strong>${c.visits}</strong></div><div><span>Giao dịch</span><strong>${short(c.totalValue)}</strong></div><div><span>Tin tưởng</span><strong>${Math.round(c.loyalty)}/100</strong></div></div></div>`).join(''):'<div class="empty-state">Chưa có hồ sơ phù hợp.</div>';
    $('#receiptHistory').innerHTML=state.receipts.length?state.receipts.slice(0,80).map(r=>`<button class="receipt-row choice-btn" data-receipt-id="${r.id}" type="button"><strong>${r.id}</strong><div><b>${esc(r.customer)}</b><small>Ngày ${r.day} · ${r.time} · ${esc(r.title)}</small></div><span>${r.direction==='collect'?'Thu':'Chi'}</span><strong>${fmt(r.amount)}</strong></button>`).join(''):'<div class="empty-state">Chưa có phiếu tại quầy.</div>';
  }

  function hireStaff(){if(!state.started)return;if(state.cash<25e6+state.allocations.reserve*.2){toast('Tiền mặt chưa đủ an toàn để tuyển.');return;}const names=['Linh','Khánh','Thư','Duy','Yến','Khoa','Trâm','Hoàng'];const roles=['Bán hàng','Thu ngân','Kho & kiểm hàng','Chăm khách'];const name=pick(names),femaleNames=new Set(['Linh','Thư','Yến','Trâm']);const s={id:'st'+Date.now(),name,gender:femaleNames.has(name)?'female':'male',role:pick(roles),skill:Math.round(rng(55,76)),trust:Math.round(rng(62,86)),salary:Math.round(rng(30e6,45e6)/1e6)*1e6};state.cash-=25e6;state.staff.push(s);if(state.daily)state.daily.oneOffExpense+=25e6;postJournal(`Tuyển ${s.name}`,[{account:'Chi phí tuyển dụng',debit:25e6},{account:'Tiền mặt',credit:25e6}]);toast(`Đã tuyển ${s.name} · ${s.role}.`);renderManagement();renderAll();save(true);}
  function trainStaff(id){const s=state.staff.find(x=>x.id===id);if(!s)return;if(state.cash<20e6+state.allocations.reserve*.2){toast('Không đủ tiền đào tạo an toàn.');return;}state.cash-=20e6;if(state.daily)state.daily.oneOffExpense+=20e6;s.skill=clamp(s.skill+Math.round(rng(4,9)),0,100);s.trust=clamp(s.trust+Math.round(rng(1,4)),0,100);postJournal(`Đào tạo ${s.name}`,[{account:'Chi phí đào tạo',debit:20e6},{account:'Tiền mặt',credit:20e6}]);gainXP(5);renderManagement();save(true);}
  function fireStaff(id){if(state.staff.length<=2){toast('Cần ít nhất 2 nhân viên để vận hành.');return;}const i=state.staff.findIndex(x=>x.id===id);if(i<0)return;const s=state.staff[i];state.staff.splice(i,1);toast(`${s.name} đã nghỉ việc.`);renderManagement();save(true);}

  function openBranch(){if(!state.started)return;if(state.level<5){toast('Cần Level 5 để mở chi nhánh.');return;}const cost=1.5e9;if(state.cash<cost+state.allocations.reserve*.5){toast('Cần 1,5 tỷ và vẫn phải giữ dự phòng.');return;}const loc=pick(LOCATIONS.filter(x=>x.id!==state.location.id));state.cash-=cost;state.fixedAssets+=cost;const b={id:'B-'+String(state.branches.length+1).padStart(3,'0'),name:`Chi nhánh ${state.branches.length}`,location:loc.name,openedDay:state.day,manager:pick(state.staff).name,reputation:Math.max(55,state.reputation-8),level:1,active:true,simulated:true};state.branches.push(b);postJournal(`Mở ${b.name}`,[{account:'Tài sản cố định',debit:cost},{account:'Tiền mặt',credit:cost}]);gainXP(90);toast(`Đã mở ${b.name} tại ${b.location}.`);updateAchievements();renderManagement();renderCampaign();save(true);}
  function simulateBranchDay(){let net=0;state.branches.filter(b=>b.simulated&&b.active).forEach(b=>{const staffBonus=state.staff.reduce((s,x)=>s+x.skill,0)/Math.max(1,state.staff.length)/100;const revenue=rng(12e6,42e6)*(b.reputation/75)*(0.8+staffBonus*.35);const cost=rng(8e6,28e6);const n=revenue-cost;net+=n;b.lastNet=n;b.reputation=clamp(b.reputation+(n>0?.25:-.45),40,98);});return net;}

  const MILESTONES=[
    {id:'m1',name:'Sống sót 7 ngày',desc:'Khóa sổ đủ 7 ngày kinh doanh.',test:()=>state.campaign.daysSurvived>=7},
    {id:'m2',name:'Uy tín 75+',desc:'Đạt uy tín cửa hàng ít nhất 75/100.',test:()=>state.reputation>=75},
    {id:'m3',name:'Tài sản ròng 11 tỷ',desc:'Tăng vốn chủ lên ít nhất 11 tỷ.',test:()=>netWorth()>=11e9},
    {id:'m4',name:'Mở chi nhánh',desc:'Có ít nhất 2 cơ sở.',test:()=>state.branches.length>=2},
    {id:'m5',name:'Sống sót 30 ngày',desc:'Duy trì doanh nghiệp đủ 30 ngày.',test:()=>state.campaign.daysSurvived>=30},
    {id:'m6',name:'Chuỗi tiệm mạnh',desc:'3 cơ sở, uy tín 85+, tài sản ròng 15 tỷ.',test:()=>state.branches.length>=3&&state.reputation>=85&&netWorth()>=15e9}
  ];
  const ACHIEVEMENTS=[
    ['firstReceipt','Phiếu đầu tiên',()=>state.receipts.length>=1],['hundredSku','Kho chuyên nghiệp',()=>stockCount()>=100],['pawnMaster','Quản lý cầm đồ',()=>state.pawnContracts.length>=5],['cleanBooks','Sổ sách chuẩn',()=>state.history.length>=5&&state.history.slice(0,5).every(h=>h.daily.auditDone)],['crm50','50 lượt khách',()=>state.customers.reduce((s,c)=>s+c.visits,0)>=50],['branchBoss','Chủ chuỗi',()=>state.branches.length>=2]
  ];
  function updateAchievements(){ACHIEVEMENTS.forEach(([id,name,test])=>{if(!state.achievements[id]&&test()){state.achievements[id]={day:state.day,name};toast(`Thành tựu: ${name}`);}});}
  function updateCampaignScore(){const ms=MILESTONES.filter(m=>m.test()).length;state.campaign.score=Math.round(ms*120+state.reputation*3+state.level*25+Math.max(0,(netWorth()-STARTING_CAPITAL)/1e7)+state.branches.length*100);if(MILESTONES.every(m=>m.test()))state.campaign.completed=true;}
  function renderCampaign(){if(!state.started)return;updateCampaignScore();const done=MILESTONES.filter(m=>m.test()).length;$('#campaignHero').innerHTML=`<div><span class="v1-badge">CAREER MODE V1.0</span><h2>${state.campaign.completed?'ĐÃ HOÀN THÀNH CHIẾN DỊCH V1.0':'Đang xây dựng đế chế tiệm vàng'}</h2><p>Ngày ${state.day} · ${state.branches.length} cơ sở · uy tín ${Math.round(state.reputation)}/100 · tài sản ròng ${short(netWorth())}</p></div><div><span class="eyebrow">CAREER SCORE</span><div class="campaign-score">${state.campaign.score}</div><small>${done}/${MILESTONES.length} cột mốc</small></div>`;
    $('#milestoneList').innerHTML=MILESTONES.map((m,i)=>{const ok=m.test();return `<div class="milestone ${ok?'done':''}"><div class="milestone-icon">${ok?'✓':i+1}</div><div><strong>${m.name}</strong><small>${m.desc}</small></div><span>${ok?'Hoàn thành':'Đang làm'}</span></div>`;}).join('');
    $('#achievementList').innerHTML=ACHIEVEMENTS.map(([id,name])=>`<div class="achievement ${state.achievements[id]?'unlocked':''}"><strong>${state.achievements[id]?'🏆':'○'} ${name}</strong><small>${state.achievements[id]?`Mở ngày ${state.achievements[id].day}`:'Chưa mở khóa'}</small></div>`).join('');
    $('#branchList').innerHTML=state.branches.map(b=>`<div class="branch-card"><h3>${esc(b.name)}</h3><small>${esc(b.location)} · mở ngày ${b.openedDay}</small><small>Quản lý: ${esc(b.manager)}</small><small>Uy tín: ${Math.round(b.reputation)}/100</small><strong>${b.simulated?`Kết quả gần nhất ${short(b.lastNet||0)}`:'Cửa hàng người chơi trực tiếp vận hành'}</strong></div>`).join('');
  }

  function toggleVoice(){state.settings.voice=!state.settings.voice;if(!state.settings.voice&&'speechSynthesis' in window)speechSynthesis.cancel();updateVoiceButton();save(true);}
  function updateVoiceButton(){const b=$('#voiceToggleBtn');if(!b)return;b.textContent=state.settings.voice?'🔊 Voice: Bật':'🔇 Voice: Tắt';document.body.classList.toggle('voice-off',!state.settings.voice);}
  function exportSave(){if(!state.started){toast('Chưa có game để xuất.');return;}const blob=new Blob([JSON.stringify(serializableState(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`GoldShopSimulator_V1.0_Day${state.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  async function importSaveFile(e){const file=e.target.files?.[0];if(!file)return;try{const s=JSON.parse(await file.text());Object.assign(state,s);state.equipment=new Set(s.equipment||[]);state.upgrades=new Set(s.upgrades||[]);ensureV1State();state.policies=normalizePolicies(s.policies);save(true);location.reload();}catch{toast('File save không hợp lệ.');}finally{e.target.value='';}}

  function renderAll(){
    renderMarket();renderHud();renderMission();renderRiskAlerts();renderLedger();renderMeters();renderSettlement();syncPolicyInputs();syncPricingInputs();renderCompetitionPanel();updateVoiceButton(); if(state.started){renderInventory(false);renderPawn(false);renderFinance(false);renderManagement(false);} $('#shopLocationTag').textContent=state.location?.name||'Chưa mở';$('#shopName').textContent=state.storeName||'TIỆM VÀNG CỦA BẠN';document.querySelectorAll('.brand-title').forEach(el=>el.textContent=state.started?(state.storeName||'TIỆM VÀNG CỦA BẠN'):'GOLD SHOP SIMULATOR');document.querySelectorAll('.brand-sub').forEach(el=>el.textContent=state.started?`${state.ownerName?`Chủ: ${state.ownerName} · `:''}Gold Shop Simulator V1.0`:'V1.0 · Complete 3D');$('#customerCount').textContent=`${state.situationsToday} tình huống`;$('#topClock').textContent=clockText();const thresholds=[0,100,250,450,700,1000,1400,1900,2500,3300,4200,5200],base=thresholds[state.level-1]||0,next=thresholds[state.level]||base+600,p=(state.xp-base)/(next-base)*100;$('#xpText').textContent=`${state.xp} / ${next} XP`;$('#xpBar').style.width=clamp(p,0,100)+'%';$('#mapLock').textContent=state.level>=3?'':'🔒'; }
  function renderMarket(){
    const el=$('#marketStrip');if(!el)return; const quotes=Object.keys(GOLD_TYPES).map(k=>`<div class="quote"><span>${k} mua / bán</span><strong>${short(state.market[k].buy)} / ${short(state.market[k].sell)}</strong></div>`).join(''); el.innerHTML=`<div class="market-title"><span class="pulse-dot"></span><strong>BẢNG GIÁ MÔ PHỎNG</strong><small>${state.market.trend}</small></div>${quotes}<div class="quote"><span>Giờ</span><strong>${clockText()}</strong></div>`;
  }
  function renderHud(){ const el=$('#hudGrid');if(!el)return; const cards=[['Ngày',state.day],['Tiền mặt',short(state.cash)],['Kho / SKU',`${short(inventoryValue())} · ${stockCount()} món`],['Quỹ cầm',short(state.pawnFund)],['Dư nợ cầm',short(pawnReceivable())],['Phải trả chành',short(supplierPayable())],['Nợ ngân hàng',short(state.bankDebt)],['Uy tín / Level',`${Math.round(state.reputation)}/100 · L${state.level}`]];el.innerHTML=cards.map(([a,b])=>`<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join(''); }
  function renderMission(){const required=Math.min(8,state.dayQueue?.length||8);const list=[[`Xử lý ≥ ${required} tình huống`,state.daily?.handled>=required],['Có ít nhất 1 giao dịch vàng',state.daily&&(state.daily.salesRevenue>0||state.daily.cogs>0)],['Kiểm quỹ cuối ngày',state.daily?.auditDone],['Thanh khoản > 35/100',liquidityScore()>35]];$('#missionList').innerHTML=list.map(([n,ok])=>`<div class="mission-item ${ok?'done':''}"><span>${ok?'✓':'○'}</span><strong>${n}</strong></div>`).join(''); }
  function renderRiskAlerts(){ const a=[];if(!state.started)a.push('Chưa mở tiệm.');else{if(state.cash<state.allocations.reserve*.6)a.push('Tiền mặt thấp hơn 60% dự phòng mục tiêu.');if(leverage()>.45)a.push('Tỷ lệ nợ đang cao so với tài sản.');if(supplierPayable()>state.cash*.8)a.push('Công nợ chành lớn so với tiền mặt.');if(inventoryValue()>totalAssets()*.72)a.push('Quá nhiều vốn đang nằm trong tồn kho.');const old=anyStock().filter(x=>state.day-x.acquiredDay>=30).length;if(old)a.push(`${old} SKU tồn từ 30 ngày trở lên.`);if(state.pawnContracts.some(c=>c.status==='overdue'))a.push('Có hợp đồng cầm quá hạn cần xử lý.');}if(!a.length)a.push('Chưa có cảnh báo lớn.');$('#riskAlerts').innerHTML=a.map(x=>`<div class="risk-item">${x}</div>`).join(''); }
  function renderLedger(){ $('#ledger').innerHTML=state.ledger.length?state.ledger.map(x=>`<div class="ledger-row"><span>${x.time}</span><span>${esc(x.label)}</span><strong class="${x.cls}">${x.amount>=0?'+':''}${fmt(x.amount)}</strong></div>`).join(''):'<div class="empty-state">Chưa có giao dịch.</div>'; }
  function renderMeters(){ const rows=[['Thanh khoản',Math.round(liquidityScore())],['Uy tín',Math.round(state.reputation)],['Chất lượng kho',Math.round(clamp(100-(anyStock().filter(x=>state.day-x.acquiredDay>=30).length/Math.max(1,stockCount()))*70,0,100))],['Đòn bẩy',Math.round((1-clamp(leverage(),0,1))*100)]];$('#businessMeters').innerHTML=rows.map(([n,v])=>`<div class="meter"><div><span>${n}</span><strong>${v}/100</strong></div><div class="progress"><div class="progress-bar" style="width:${v}%"></div></div></div>`).join(''); }

  function renderInventory(full=true){
    if(!state.started){if(full)$('#inventoryTable').innerHTML='<tr><td colspan="9">Chưa mở tiệm.</td></tr>';return;} const filter=$('#inventoryFilter')?.value||'all',q=($('#inventorySearch')?.value||'').toLowerCase(); let items=state.inventoryItems.slice(); if(filter==='610'||filter==='980'||filter==='9999')items=items.filter(x=>x.goldType===filter);if(filter==='aged')items=items.filter(x=>x.status==='in_stock'&&state.day-x.acquiredDay>=30);if(filter==='chanh')items=items.filter(x=>x.status==='in_stock'&&[622,625,630].includes(Number(x.chanhFactor)));if(q)items=items.filter(x=>(x.sku+' '+x.name).toLowerCase().includes(q)); items=items.slice(0,180);
    $('#inventoryStats').innerHTML=[['Giá trị kho kế toán',inventoryValue()],['SKU đang tồn',stockCount()],['Tồn ≥30 ngày',anyStock().filter(x=>state.day-x.acquiredDay>=30).length],['Phải trả chành',supplierPayable()],['Khách mất hôm nay',state.daily?.lostCustomers||0],['Nhu cầu hôm nay',Math.round((state.daily?.demandScore||0)*100)]].map(([n,v],i)=>`<div class="report-card"><span>${n}</span><strong>${i===1||i===2||i===4||i===5?v+(i===5?'/100':''):short(v)}</strong></div>`).join('');
    $('#inventoryTable').innerHTML=items.map(x=>{ensureSkuCosting(x);const r=retailComponents(x),reserve=expectedExchangeCost(x),m=managerialCost(x);return `<tr><td><button class="sku-action" data-sku-detail="${x.sku}">${x.sku}</button></td><td>${esc(x.name)}</td><td>${x.goldType}<br><small>${x.netChi} chỉ</small></td><td>${fmt(x.goldCost)}</td><td>${fmt(x.laborCost)}</td><td>${fmt(reserve)}</td><td><strong>${fmt(m)}</strong><br><small>Kế toán ${fmt(x.bookCost)}</small></td><td><input class="inline-price" data-sku-price="${x.sku}" type="number" step="10000" min="0" value="${Math.round(x.sellGoldPerChi||state.pricing.goldSell[x.goldType])}"><small>đ/chỉ</small></td><td><input class="inline-price" data-sku-labor="${x.sku}" type="number" step="10000" min="0" value="${Math.round(x.laborSell)}"></td><td class="${r.margin>=0?'profit-cell':'loss-cell'}">${r.margin>=0?'+':''}${fmt(r.margin)}</td><td>${x.chanhFactor}${x.chanhAdjusted?' ✓':''}</td><td><span class="status-pill ${x.status==='in_stock'?'status-in':x.status==='missing'?'status-warn':'status-out'}">${x.status}</span></td></tr>`;}).join('')||'<tr><td colspan="12">Không có SKU phù hợp.</td></tr>';
    $('#supplierSelect').innerHTML=state.suppliers.map(s=>`<option value="${s.id}">${s.name} · uy tín ${s.rating}/100</option>`).join(''); $('#stockAuditResult').textContent=state.stockAudit; $('#supplierDebtList').innerHTML=state.suppliers.map(s=>`<div class="mini-row"><div><strong>${s.name}</strong><small>${s.focus} · uy tín ${s.rating}/100 · hạn mức ${short(s.creditLimit)}</small></div><span>${short(s.balance)}</span></div>`).join('');
  }

  function renderPawn(full=true){
    if(!state.started){if(full)$('#pawnContracts').innerHTML='<div class="empty-state">Chưa mở tiệm.</div>';return;}refreshContractStatuses(); const f=$('#pawnFilter')?.value||'all';const list=state.pawnContracts.filter(c=>f==='all'||c.status===f);const active=state.pawnContracts.filter(c=>['active','overdue'].includes(c.status));const overdue=state.pawnContracts.filter(c=>c.status==='overdue');$('#pawnStats').innerHTML=[['Quỹ cầm còn lại',state.pawnFund],['Dư nợ đang cầm',pawnReceivable()],['Hợp đồng đang mở',active.length],['Quá hạn',overdue.length]].map(([n,v],i)=>`<div class="report-card"><span>${n}</span><strong>${i>=2?v:short(v)}</strong></div>`).join('');
    $('#pawnContracts').innerHTML=list.map(c=>{const od=Math.max(0,state.day-c.nextDueDay),charge=chargeForDays(c,c.termDays);return `<article class="contract-card ${c.status==='overdue'?'overdue':''}"><div class="contract-top"><div><span class="contract-id">${c.id}</span><h3>${esc(c.customer)}</h3></div><span class="status-pill ${c.status==='overdue'?'status-warn':c.status==='active'?'status-in':'status-out'}">${c.status}</span></div><div class="contract-grid-stats"><div><span>Gốc còn</span><strong>${fmt(c.principalBalance)}</strong></div><div><span>Mức tổng</span><strong>${pct(c.rate)}/tháng</strong></div><div><span>Tài sản</span><strong>${c.collateralWeight} chỉ ${c.goldType}</strong></div><div><span>Kỳ dự kiến</span><strong>${fmt(charge)}</strong></div><div><span>Đến hạn</span><strong>Ngày ${c.nextDueDay}</strong></div><div><span>Quá hạn</span><strong>${od} ngày</strong></div></div><div class="contract-actions">${['active','overdue'].includes(c.status)?`<button class="btn ghost" data-contract-action="charge" data-contract-id="${c.id}" type="button">Đóng kỳ</button><button class="btn ghost" data-contract-action="principal" data-contract-id="${c.id}" type="button">Bớt gốc 5tr</button><button class="btn primary" data-contract-action="redeem" data-contract-id="${c.id}" type="button">Chuộc</button><button class="btn ghost" data-contract-action="extend" data-contract-id="${c.id}" type="button">Gia hạn</button>${c.status==='overdue'?`<button class="btn danger ghost" data-contract-action="liquidate" data-contract-id="${c.id}" type="button">Chuyển hàng chờ xử lý</button>`:''}`:''}</div></article>`;}).join('')||'<div class="empty-state">Chưa có hợp đồng phù hợp.</div>';
  }

  function renderFinance(full=true){
    if(!state.started)return; const equity=netWorth(),assets=totalAssets(),liab=totalLiabilities(),d=state.daily||{}; const bs=[['Tiền mặt',state.cash],['Quỹ cầm đồ',state.pawnFund],['Hàng tồn kho',inventoryValue()],['Dư nợ cầm đồ',pawnReceivable()],['Tài sản cố định',state.fixedAssets],['TỔNG TÀI SẢN',assets],['Nợ ngân hàng',state.bankDebt],['Phải trả chành',supplierPayable()],['TỔNG NỢ',liab],['VỐN CHỦ',equity]]; $('#balanceSheet').innerHTML=bs.map(([n,v])=>`<div class="statement-row ${n.startsWith('TỔNG')||n==='VỐN CHỦ'?'total':''}"><span>${n}</span><strong>${fmt(v)}</strong></div>`).join('');
    const pnl=[['Doanh thu vàng',d.salesRevenue||0],['Tiền công / dịch vụ',d.serviceRevenue||0],['Thu cầm đồ',d.pawnIncome||0],['Thu chi nhánh',d.branchIncome||0],['Giá vốn hàng bán',-(d.cogs||0)],['Hao chành',-(d.chanhLoss||0)],['Chi phí sửa hàng',-(d.repairCost||0)],['Thất thoát',-(d.staffLoss||0)],['Chi phí vận hành',-(d.operatingExpense||0)],['Chi phí chi nhánh',-(d.branchExpense||0)],['Chi phí một lần',-(d.oneOffExpense||0)],['Lãi vay',-(d.interestExpense||0)],['LỢI NHUẬN TẠM TÍNH',currentDailyNet()]];$('#profitLoss').innerHTML=pnl.map(([n,v])=>`<div class="statement-row ${n.startsWith('LỢI')?'total':''}"><span>${n}</span><strong style="color:${v<0?'var(--red)':'var(--green)'}">${v>=0?'+':''}${fmt(v)}</strong></div>`).join('');
    const flow=[['Tiền tự do',state.cash],['Thanh khoản',Math.round(liquidityScore())+'/100'],['Tỷ lệ nợ / tài sản',(leverage()*100).toFixed(1)+'%'],['Lãi vay/ngày',fmt(state.bankDebt*GOLD_RULES.bankAnnualInterest/365)],['Công nợ chành',fmt(supplierPayable())],['Dự phòng mục tiêu',fmt(state.allocations.reserve)]];$('#cashFlowPanel').innerHTML=flow.map(([n,v])=>`<div class="statement-row"><span>${n}</span><strong>${v}</strong></div>`).join('');
    $('#bankHealth').textContent=`Nợ ${short(state.bankDebt)} · lãi mô phỏng ${(GOLD_RULES.bankAnnualInterest*100).toFixed(0)}%/năm · lãi ngày ${fmt(state.bankDebt*GOLD_RULES.bankAnnualInterest/365)} · thanh khoản ${Math.round(liquidityScore())}/100.`;
    $('#supplierPaymentList').innerHTML=state.suppliers.map(s=>`<div class="mini-row"><div><strong>${s.name}</strong><small>Chành / đối tác · phải trả ${short(s.balance)}</small></div><button class="btn ghost" data-pay-supplier="${s.id}" type="button" ${s.balance<=0?'disabled':''}>Trả 100tr</button></div>`).join('');
    const rows=state.journal.slice(0,220);$('#journalTable').innerHTML=rows.map(r=>`<tr><td>N${r.day} ${r.time}</td><td>${esc(r.label)}</td><td>${esc(r.account)}</td><td>${r.debit?fmt(r.debit):''}</td><td>${r.credit?fmt(r.credit):''}</td></tr>`).join(''); const db=state.journal.reduce((s,r)=>s+r.debit,0),cr=state.journal.reduce((s,r)=>s+r.credit,0),ok=Math.abs(db-cr)<5;$('#journalBalance').textContent=ok?'Cân sổ':'Lệch sổ';$('#journalBalance').className=`tag ${ok?'journal-balanced':'journal-error'}`;
  }

  function renderManagement(full=true){
    if(!state.started)return; $('#managementStats').innerHTML=[['Tài sản ròng',netWorth()],['Tiền mặt',state.cash],['Kho',inventoryValue()],['Dư nợ cầm',pawnReceivable()],['Tổng nợ',totalLiabilities()],['Thanh khoản',Math.round(liquidityScore())]].map(([n,v],i)=>`<div class="report-card"><span>${n}</span><strong>${i===5?v+'/100':short(v)}</strong></div>`).join('');
    $('#staffList').innerHTML=state.staff.map(s=>`<div class="staff-card"><div class="staff-avatar">🧑‍💼</div><div><strong>${s.name} · ${s.role}</strong><span>Kỹ năng ${s.skill}/100 · Tin cậy ${s.trust}/100 · ${short(s.salary)}/tháng</span></div></div>`).join('');
    if($('#staffActions'))$('#staffActions').innerHTML=state.staff.map(s=>`<div class="staff-action-row"><div><strong>${esc(s.name)} · ${esc(s.role)}</strong><small>Kỹ năng ${s.skill} · Tin cậy ${s.trust}</small></div><div><button class="btn ghost tiny" data-train-staff="${s.id}" type="button">Đào tạo 20tr</button>${state.staff.length>2?`<button class="btn danger ghost tiny" data-fire-staff="${s.id}" type="button">Nghỉ việc</button>`:''}</div></div>`).join('');
    if($('#branchSummary'))$('#branchSummary').innerHTML=`<div class="branch-chip"><span>Số cơ sở</span><strong>${state.branches.length}</strong></div><div class="branch-chip"><span>Điều kiện mở mới</span><strong>Level 5 · 1,5 tỷ tiền mặt</strong></div><div class="branch-chip"><span>Lợi nhuận mô phỏng chi nhánh gần nhất</span><strong>${short(state.history[0]?.branchNet||0)}</strong></div>`;
    if($('#openBranchBtn'))$('#openBranchBtn').disabled=state.level<5||state.cash<1.5e9;
    $('#operatingCosts').innerHTML=operatingCostBreakdown().map(([n,v])=>`<div class="operating-chip"><span>${n}</span><strong>${fmt(v)}/ngày</strong></div>`).join('');
    renderCompetitionPanel();syncPricingInputs();$('#upgradeList').innerHTML=UPGRADES.map(u=>{const owned=state.upgrades.has(u.id),locked=state.level<u.level;return `<div class="upgrade-card ${owned?'owned':''}"><div><span class="tag">Level ${u.level}</span><h3>${u.name}</h3><p>${u.desc}</p><strong>${short(u.cost)}</strong></div><button class="btn ${owned?'ghost':'primary'}" data-upgrade="${u.id}" type="button" ${owned||locked?'disabled':''}>${owned?'ĐÃ MUA':locked?'CHƯA MỞ':'MUA NÂNG CẤP'}</button></div>`;}).join('');syncPolicyInputs();
  }

  function renderAcademy(){
    const cards=[
      ['Mua vàng cũ','Mua vàng cũ là đổi tiền mặt lấy hàng tồn kho. Không ghi toàn bộ tiền mua thành lỗ ngay.','Nợ Hàng tồn kho / Có Tiền mặt'],
      ['Định giá SKU','Game cho người chơi biết vàng vốn + công vốn + dự phòng hao/đổi. Người chơi tự kê giá vàng bán/chỉ và công bán.','Giá vốn quản trị = vàng vốn + công vốn + dự phòng hao/đổi\nLãi gộp dự kiến = tiền bán − giá vốn quản trị'],
      ['Đổi cùng loại',SPEECH.exchange,'Phí đổi = toàn bộ vàng cũ × mức phí setup\nTiền ròng = bán vàng mới + công + phí đổi − mua vàng cũ'],
      ['Cầm đồ',SPEECH.pawn,'Khoản thu kỳ = Gốc còn × (mức tổng / 30) × số ngày\nMức tổng đã gồm lãi + phí\nTrả gốc ≠ doanh thu'],
      ['Công nợ chành',SPEECH.supplier,'Nhập công nợ: Tồn kho ↑ và Phải trả chành ↑\nTrả nợ: Tiền ↓ và Phải trả ↓'],
      ['Chành 610 / 622 / 625 / 630',SPEECH.chanh,`Rule đang setup: 622 = ${pct(state.policies.chanh622)} · 625 = ${pct(state.policies.chanh625)} · 630 = ${pct(state.policies.chanh630)}\nCác hệ số này vẫn là mô phỏng cho tới khi nhập đúng công thức chành thực tế.`],
      ['P&L vs Dòng tiền',SPEECH.finance,'Có lãi chưa chắc có tiền.\nMua hàng làm tiền ↓ nhưng không làm lợi nhuận ↓ ngay.\nVay làm tiền ↑ nhưng không làm lợi nhuận ↑.'],
      ['Bảng cân đối','Tài sản = Tiền + quỹ cầm + kho + dư nợ cầm + tài sản cố định. Nợ = ngân hàng + công nợ chành.','Vốn chủ = Tài sản − Nợ']
    ];
    $('#academyCards').innerHTML=cards.map((c,i)=>`<article class="academy-card"><h3>${c[0]}</h3><p>${c[1]}</p><div class="formula">${c[2]}</div><div class="academy-actions"><button class="speak tiny" data-academy="${i}" type="button">🔊 Nghe</button></div></article>`).join('');$$('[data-academy]').forEach((b,i)=>b.addEventListener('click',()=>speak(cards[i][1])));
  }
  function renderReport(){
    const last=state.history[0];if(!last){$('#reportHeadline').textContent='Chưa khóa sổ ngày nào';$('#reportSub').textContent='Đóng cửa cuối ngày để xem báo cáo.';$('#lastProfit').textContent='0đ';$('#reportCards').innerHTML='';$('#dayHistory').innerHTML='';return;}$('#reportHeadline').textContent=`Ngày ${last.day}: ${last.net>=0?'CÓ LÃI':'ĐANG LỖ'}`;$('#reportSub').textContent=`Tiền ${short(last.cash)} · Kho ${short(last.inventory)} · Dư nợ cầm ${short(last.receivable)} · Tổng nợ ${short(last.bankDebt+last.supplierPayable)} · Chi nhánh ${last.branchNet>=0?'+':''}${short(last.branchNet||0)}`;$('#lastProfit').textContent=(last.net>=0?'+':'')+fmt(last.net);$('#lastProfit').style.color=last.net>=0?'var(--green)':'var(--red)';const d=last.daily;const rows=[['Doanh thu vàng',d.salesRevenue],['Tiền công/dịch vụ',d.serviceRevenue],['Thu cầm đồ',d.pawnIncome],['Thu chi nhánh',d.branchIncome||0],['Giá vốn',-d.cogs],['Hao chành',-d.chanhLoss],['Chi phí sửa',-d.repairCost],['Thất thoát',-d.staffLoss],['Vận hành',-d.operatingExpense],['Chi nhánh',-(d.branchExpense||0)],['Chi phí một lần',-(d.oneOffExpense||0)],['Lãi vay',-d.interestExpense],['Lợi nhuận thực',last.net]];$('#reportCards').innerHTML=rows.map(([n,v])=>`<div class="report-card"><span>${n}</span><strong style="color:${v<0?'var(--red)':'var(--green)'}">${v>=0?'+':''}${fmt(v)}</strong></div>`).join('');$('#dayHistory').innerHTML=state.history.map(h=>`<div class="history-row"><strong>Ngày ${h.day}</strong><span>Kho ${short(h.inventory)}</span><span>Nợ ${short(h.bankDebt+h.supplierPayable)}</span><span style="color:${h.net>=0?'var(--green)':'var(--red)'}">${h.net>=0?'+':''}${short(h.net)}</span></div>`).join('')+`<button id="nextDayBtn" class="btn primary" type="button">MỞ CỬA NGÀY ${state.day}</button>`;$('#nextDayBtn')?.addEventListener('click',newDay);
  }
  function simulateCompetitors(){
    if(!state.started)return; state.competitors.forEach(c=>{const swing=rng(-.018,.02);c.assets=Math.max(3e9,c.assets*(1+swing));c.reputation=clamp(c.reputation+rng(-.5,.7),45,96);c.marketShare=clamp(c.marketShare+rng(-.6,.6),8,35);c.priceIndex=clamp((Number(c.priceIndex)||1)+rng(-.003,.003),.96,1.05);c.laborMarkup=clamp((Number(c.laborMarkup)||1.6)+rng(-.04,.04),1.15,2.3);c.exchangeFeePerChi=clamp((Number(c.exchangeFeePerChi)||150000)+Math.round(rng(-15000,15000)/5000)*5000,50_000,350_000);c.craftScore=clamp((Number(c.craftScore)||75)+rng(-.4,.5),55,96);});
  }
  function playerMarketShare(){const base=12+(state.reputation-50)*.18+state.branches.length*2.5+state.level*.45;return clamp(base,4,38);}
  function renderMap(){const unlocked=state.level>=3;$('#mapLocked').classList.toggle('hidden',unlocked);$('#mapUnlocked').classList.toggle('hidden',!unlocked);if(!unlocked)return;const comp=[...state.competitors.map(x=>({n:x.name,r:x.reputation,a:x.assets,share:x.marketShare,price:state.market['610'].sell*x.priceIndex,labor:x.laborMarkup,fee:x.exchangeFeePerChi,craft:x.craftScore})),{n:state.storeName||'Tiệm của bạn',r:state.reputation,a:netWorth(),share:playerMarketShare(),price:state.pricing.goldSell['610'],labor:state.pricing.defaultLaborMarkup,fee:state.policies.exchangeFeePerChi,craft:playerCraftScore(),you:true}].sort((a,b)=>(b.r*.55+b.a/1e9*.3+b.share*.15)-(a.r*.55+a.a/1e9*.3+a.share*.15));$('#rankBoard').innerHTML=`<div class="panel-head compact"><h3>Xếp hạng & so sánh thị trường</h3></div>${comp.map((x,i)=>`<div class="rank-row"><span>#${i+1} ${x.n}</span><strong>${Math.round(x.r)} uy tín · ${short(x.a)} · ${x.share.toFixed(1)}% thị phần</strong></div>`).join('')}<div class="map-competitors">${comp.map(x=>`<div class="competitor-card ${x.you?'you':''}"><strong>${esc(x.n)}</strong><small>610 bán ${fmt(x.price)}/chỉ</small><small>Công: ${x.you?'người chơi tự kê':'vốn × '+Number(x.labor).toFixed(2)}</small><small>Phí đổi ${fmt(x.fee)}/chỉ</small><small>Tay nghề ${Math.round(x.craft)}/100</small></div>`).join('')}</div>`;}

  function serializableState(){return {...state,equipment:[...state.equipment],upgrades:[...state.upgrades],pendingSettlement:null,saveSchema:SAVE_SCHEMA};}
  function save(silent=false){ if(!state.started){if(!silent)toast('Chưa có game để lưu.');return;} localStorage.setItem(saveKey(),JSON.stringify(serializableState()));if(!silent)toast('Đã lưu game V1.0.'); }
  function restore(){
    try{let raw=localStorage.getItem(saveKey());let migrated=false,legacyKey='';const freshProfile=localStorage.getItem(`goldShopNewProfile:${activeAccountId()}`)==='1';if(!raw&&!freshProfile){for(const k of LEGACY_SAVE_KEYS){raw=localStorage.getItem(k);if(raw){migrated=true;legacyKey=k;break;}}}if(freshProfile)localStorage.removeItem(`goldShopNewProfile:${activeAccountId()}`);if(!raw)return;const s=JSON.parse(raw);Object.assign(state,s);state.equipment=new Set(s.equipment||[]);state.upgrades=new Set(s.upgrades||[]);state.policies=normalizePolicies(s.policies);state.location=LOCATIONS.find(x=>x.id===s.location?.id)||s.location;state.tier=TIERS.find(x=>x.id===s.tier?.id)||s.tier;state.suppliers=(s.suppliers||[]).map(x=>({...x}));state.inventoryItems=s.inventoryItems||[];state.pawnContracts=s.pawnContracts||[];state.journal=s.journal||[];state.market=s.market||makeMarket();state.calcHistory=Array.isArray(s.calcHistory)?s.calcHistory.slice(0,30):[];state.calcLastResult=Number.isFinite(Number(s.calcLastResult))?Number(s.calcLastResult):null;ensureV1State();const acc=activeAccount();if(acc&&!state.ownerName)state.ownerName=acc.displayName||'';if(migrated&&state.started){state.branches=state.branches.length?state.branches:[{id:'B-001',name:state.storeName||'Cửa hàng chính',location:state.location?.name||'Cửa hàng chính',openedDay:1,manager:state.ownerName||'Bạn',reputation:state.reputation,level:1,active:true,simulated:false}];save(true);if(legacyKey)localStorage.setItem('goldShopLegacyMigrated','1');}if(state.started){renderSetupOptions();updateSetup();showView('store3d');toast(migrated?'Đã nâng save cũ vào hồ sơ V1.0.':'Đã khôi phục save V1.0.');}}
    catch(err){console.warn(err);toast('Save không hợp lệ, chưa thể khôi phục.');}
  }
  function resetGame(){ if(!confirm('Xóa save của hồ sơ hiện tại và khởi nghiệp lại?'))return;localStorage.removeItem(saveKey());location.reload(); }

  window.__GOLD_DEBUG__={state,activeAccount,saveKey,startGame,beginDay,nextSituation,showView,renderAll,receiveSupplierBatch,retailComponents,managerialCost,expectedExchangeCost,demandSnapshot,compareOffer,borrow,repayDebt,endDay,renderFinance,renderInventory,renderPawn,renderCustomers,renderCampaign,renderAcademy,renderMap,inventoryValue,pawnReceivable,supplierPayable,netWorth,applySale,applyBuyback,applyExchange,applyPawnOpen,payPawnCharge,payPawnPrincipal,redeemPawn,liquidatePawn,postJournal,currentDailyNet,checkAnswer,prepareSettlement,confirmSettlement,processChoice,openBranch,hireStaff,trainStaff,save,serializableState,updateCampaignScore,updateAchievements};
  init();
})();
