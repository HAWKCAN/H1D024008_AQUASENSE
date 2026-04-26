

// ── FUZZY ENGINE ─────────────────────────────────────────

const PARAMS = [
  {
    key:'ph', label:'pH Air', unit:'',
    min:0, max:14, default:7.0, decimals:1, step:0.1,
    ranges:['Asam','Normal','Basa'], who:'WHO: 6.5–8.5',
    fuzzy: v => [
      v>6.5 ? Math.max(0,Math.min(1,(7.5-v)/1)) : 1,
      v<=7.5 ? Math.max(0,Math.min(1,(v-6.5)/1)) : Math.max(0,Math.min(1,(9-v)/.5)),
      v>8.5 ? Math.max(0,Math.min(1,(v-8.5)/1)) : 0,
    ],
    score: v => (v>=6.5&&v<=8.5)?100:(v<6.5?Math.max(0,(v/6.5)*80):Math.max(0,((14-v)/(14-8.5))*70)),
    weight: 0.25,
  },
  {
    key:'hardness', label:'Kekerasan', unit:'mg/L',
    min:0, max:500, default:200, decimals:0, step:1,
    ranges:['Lunak','Sedang','Keras'], who:'WHO: ≤300 mg/L',
    fuzzy: v => [
      v>150?Math.max(0,Math.min(1,(200-v)/50)):1,
      v<=200?Math.max(0,Math.min(1,(v-150)/50)):Math.max(0,Math.min(1,(350-v)/50)),
      v>300?Math.max(0,Math.min(1,(v-300)/50)):0,
    ],
    score: v => v<=300?Math.max(60,100-(v/300)*40):Math.max(20,60-((v-300)/200)*60),
    weight: 0.15,
  },
  {
    key:'solids', label:'TDS', unit:'ppm',
    min:0, max:50000, default:20000, decimals:0, step:100,
    ranges:['Rendah','Aman','Tinggi'], who:'WHO: ≤500 ppm',
    fuzzy: v => [
      v>500?Math.max(0,Math.min(1,(1000-v)/500)):1,
      v<=1000?Math.max(0,Math.min(1,(v-500)/500)):0,
      v>1000?Math.min(1,Math.max(0,(v-1000)/5000)):0,
    ],
    score: v => v<=500?100:(v<=1000?80:Math.max(0,80-((v-1000)/49000)*80)),
    weight: 0.15,
  },
  {
    key:'chloramines', label:'Kloramin', unit:'ppm',
    min:0, max:13, default:7, decimals:1, step:0.1,
    ranges:['Aman','Batas','Tinggi'], who:'WHO: ≤4 ppm',
    fuzzy: v => [
      v>4?Math.max(0,Math.min(1,(6-v)/2)):1,
      v<=6?Math.max(0,Math.min(1,(v-4)/2)):Math.max(0,Math.min(1,(10-v)/2)),
      v>8?Math.max(0,Math.min(1,(v-8)/2)):0,
    ],
    score: v => v<=4?100:(v<=8?80-((v-4)/4)*30:Math.max(0,50-((v-8)/5)*50)),
    weight: 0.15,
  },
  {
    key:'sulfate', label:'Sulfat', unit:'mg/L',
    min:0, max:500, default:300, decimals:0, step:1,
    ranges:['Rendah','Aman','Tinggi'], who:'WHO: ≤400 mg/L',
    fuzzy: v => [
      v>200?Math.max(0,Math.min(1,(250-v)/50)):1,
      v<=250?Math.max(0,Math.min(1,(v-200)/50)):Math.max(0,Math.min(1,(400-v)/50)),
      v>350?Math.max(0,Math.min(1,(v-350)/50)):0,
    ],
    score: v => v<=400?Math.max(50,100-v/400*50):Math.max(0,50-((v-400)/100)*50),
    weight: 0.10,
  },
  {
    key:'turbidity', label:'Turbidity', unit:'NTU',
    min:0, max:8, default:3, decimals:1, step:0.1,
    ranges:['Jernih','Sedang','Keruh'], who:'WHO: ≤4 NTU',
    fuzzy: v => [
      v>1?Math.max(0,Math.min(1,(2-v)/1)):1,
      v<=2?Math.max(0,Math.min(1,(v-1)/1)):Math.max(0,Math.min(1,(5-v)/1)),
      v>4?Math.max(0,Math.min(1,(v-4)/1)):0,
    ],
    score: v => v<=1?100:(v<=4?90-((v-1)/3)*30:Math.max(0,60-((v-4)/4)*60)),
    weight: 0.20,
  },
];

const fuzzyValues = {};

function computeFuzzy() {
  let total = 0;
  const breakdown = {}, memberships = {};
  PARAMS.forEach(p => {
    const v = fuzzyValues[p.key] ?? p.default;
    const sc = p.score(v);
    total += sc * p.weight;
    breakdown[p.key] = sc;
    memberships[p.key] = p.fuzzy(v);
  });
  const score = Math.min(100, Math.max(0, total));
  const sev = score >= 70 ? 'safe' : score >= 40 ? 'caution' : 'danger';
  return { score, sev, breakdown, memberships };
}

// ── EXPERT SYSTEM ────────────────────────────────────────

const SYMPTOMS = [
  {id:'S01',label:'Bau Tidak Sedap',       desc:'Bau telur busuk, klorin berlebih, atau amis'},
  {id:'S02',label:'Air Keruh / Berwarna',  desc:'Tampak keruh, kuning, hijau, atau kecoklatan'},
  {id:'S03',label:'Rasa Aneh (Pahit/Asin)',desc:'Terasa pahit, asin, atau seperti logam'},
  {id:'S04',label:'Endapan / Partikel',    desc:'Partikel melayang atau endapan di dasar'},
  {id:'S05',label:'Kerak di Peralatan',    desc:'Kerak putih di ketel, panci, atau pipa'},
  {id:'S06',label:'Sabun Sulit Berbusa',   desc:'Sabun tidak berbuih normal saat mandi/cuci'},
  {id:'S07',label:'Iritasi Kulit / Mata',  desc:'Gatal, kemerahan, atau perih setelah kontak'},
  {id:'S08',label:'Bau Klorin Kuat',       desc:'Aroma klorin sangat menyengat'},
  {id:'S09',label:'Air Berbusa Sendiri',   desc:'Busa muncul tanpa sabun saat mengalir'},
  {id:'S10',label:'pH < 6.5 (Asam)',       desc:'Diukur dengan pH meter / kertas lakmus'},
  {id:'S11',label:'pH > 8.5 (Basa)',       desc:'Diukur dengan pH meter / kertas lakmus'},
  {id:'S12',label:'TDS > 500 ppm',         desc:'Diukur dengan TDS meter'},
];

const RULES = [
  { id:'R01', name:'Kontaminasi Mikrobiologi',
    cond:{any:['S01','S02','S04'],all:[]}, turbGt:4, sev:'danger', conf:92,
    desc:'Kekeruhan > 4 NTU disertai bau/warna abnormal mengindikasikan kontaminasi mikrobiologi. Standar WHO: turbidity ≤ 4 NTU.',
    recs:['Pasang filter sedimen (pasir aktif / membran 0.2 µm)','Lakukan klorinasi atau UV sterilisasi','Uji mikrobiologi di laboratorium terakreditasi','Hentikan konsumsi langsung sampai hasil lab keluar'],
    ref:'WHO Guidelines for Drinking-water Quality, 4th Ed.' },
  { id:'R02', name:'Kesadahan Tinggi (Hard Water)',
    cond:{any:['S05','S06'],all:[]}, turbGt:null, sev:'caution', conf:88,
    desc:'Kerak dan sabun sulit berbusa adalah indikator klasik air sadah. Tidak langsung berbahaya namun merusak peralatan.',
    recs:['Pasang water softener sistem pertukaran ion','Gunakan anti-scale pada instalasi pipa','Pertimbangkan Reverse Osmosis (RO) untuk air minum','Target hardness: < 300 mg/L (WHO)'],
    ref:'SNI 3553:2015 — Air Minum Dalam Kemasan' },
  { id:'R03', name:'TDS Tinggi + Kontaminan',
    cond:{any:['S01','S03'],all:['S12']}, turbGt:null, sev:'danger', conf:95,
    desc:'TDS > 500 ppm disertai bau/rasa abnormal mengindikasikan padatan terlarut berbahaya. Kemungkinan ada logam berat atau bahan kimia berbahaya.',
    recs:['Wajib memasang sistem Reverse Osmosis (RO)','Uji kimia: logam berat (Pb, As, Hg), nitrat, fluorida','Jangan gunakan untuk minum atau memasak','Cek sumber: aktivitas industri/pertanian sekitar'],
    ref:'Permenkes No. 492/Menkes/Per/IV/2010' },
  { id:'R04', name:'Kloramin Berlebih',
    cond:{any:[],all:['S07','S08']}, turbGt:null, sev:'danger', conf:85,
    desc:'Iritasi kulit/mata + bau klorin kuat mengindikasikan kloramin melebihi batas aman (WHO: ≤ 4 mg/L).',
    recs:['Pasang filter karbon aktif granular (GAC)','Diamkan air di wadah terbuka ≥ 30 menit sebelum digunakan','Laporkan ke PDAM / Dinas Kesehatan','Target residual klorin: 0.2–0.5 mg/L (WHO)'],
    ref:'WHO Chloramines in Drinking-water' },
  { id:'R05', name:'pH Asam — Air Korosif',
    cond:{any:['S03'],all:['S10']}, turbGt:null, sev:'caution', conf:90,
    desc:'pH < 6.5 membuat air bersifat korosif — melarutkan logam dari pipa (Pb, Cu, Fe). Standar WHO: pH 6.5–8.5.',
    recs:['Tambahkan netralisator: kalsit (CaCO₃) atau soda ash (Na₂CO₃)','Pasang pH correction filter inline','Ganti pipa besi dengan HDPE/PVC','Monitor pH rutin dengan pH meter terkalibrasi'],
    ref:'WHO pH in Drinking-water' },
  { id:'R06', name:'pH Basa Tinggi',
    cond:{any:['S03','S09'],all:['S11']}, turbGt:null, sev:'caution', conf:78,
    desc:'pH > 8.5 dengan rasa pahit/busa mengindikasikan alkalinitas tinggi. Mengurangi efektivitas klorinasi.',
    recs:['Pasang sistem asidifikasi ringan atau filter CO₂','Uji alkalinitas total (target < 200 mg/L sbg CaCO₃)','Pertimbangkan RO jika alkalinitas sangat tinggi','Hindari konsumsi jangka panjang tanpa pengolahan'],
    ref:'SNI 01-3553-2006 — Syarat Air Minum' },
  { id:'R07', name:'Tidak Ada Gejala Signifikan',
    cond:{any:[],all:[]}, turbGt:null, sev:'safe', conf:70,
    desc:'Tidak ada gejala signifikan terdeteksi. Air kemungkinan layak dikonsumsi — pemeriksaan lab tetap disarankan berkala.',
    recs:['Pemantauan rutin setiap 6 bulan','Uji bakteriologi (coliform) minimal 1x per tahun','Simpan air dalam wadah tertutup dan bersih','Gunakan filter basic sebagai tindakan pencegahan'],
    ref:'Permenkes No. 736/2010' },
];

function runInference(selected, turb) {
  const sel = new Set(selected);
  const fired = RULES.filter(r => {
    if (r.id === 'R07') return false;
    const anyOk = !r.cond.any.length || r.cond.any.some(s => sel.has(s));
    const allOk = r.cond.all.every(s => sel.has(s));
    const turbOk = r.turbGt === null || (turb !== null && turb > r.turbGt);
    return anyOk && allOk && turbOk;
  });
  if (!fired.length) fired.push(RULES[RULES.length - 1]);
  fired.sort((a, b) => ({danger:0,caution:1,safe:2}[a.sev] - {danger:0,caution:1,safe:2}[b.sev]));
  return fired;
}

// ── SEVERITY CONFIG ──────────────────────────────────────

const SEV = {
  safe:    { dot:'bg-emerald-400', text:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200', badge:'bg-emerald-100 text-emerald-700', bar:'bg-emerald-500', label:'Air Layak Dikonsumsi', sub:'Parameter dalam batas aman WHO & SNI',           stroke:'#10b981' },
  caution: { dot:'bg-amber-400',   text:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200',   badge:'bg-amber-100 text-amber-700',   bar:'bg-amber-400',   label:'Perlu Pengolahan',        sub:'Beberapa parameter melampaui batas normal',      stroke:'#f59e0b' },
  danger:  { dot:'bg-red-400',     text:'text-red-700',     bg:'bg-red-50',     border:'border-red-200',     badge:'bg-red-100 text-red-700',       bar:'bg-red-500',     label:'Tidak Layak Konsumsi',    sub:'Parameter kritis — hindari konsumsi langsung', stroke:'#ef4444' },
};

const sevOf = sc => sc >= 70 ? 'safe' : sc >= 40 ? 'caution' : 'danger';

// ── FUZZY UI ─────────────────────────────────────────────

function initSliders() {
  const container = document.getElementById('sliderList');
  PARAMS.forEach(p => {
    fuzzyValues[p.key] = p.default;
    const row = document.createElement('div');
    row.className = 'sl-row fade-up bg-white border border-stone-200 rounded-2xl p-4';
    row.innerHTML = `
      <div class="flex justify-between items-center mb-3 gap-2">
        <div class="flex items-baseline gap-1.5 min-w-0">
          <span class="text-sm font-medium text-stone-800 truncate">${p.label}</span>
          ${p.unit ? `<span class="text-xs text-stone-400 flex-shrink-0">${p.unit}</span>` : ''}
        </div>
        <span class="text-[10px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full flex-shrink-0">${p.who}</span>
      </div>
      <div class="flex items-center gap-4 mb-3">
        <input type="range" id="sl-${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}" class="flex-1"/>
        <span class="font-serif text-xl w-14 text-right tabular-nums text-stone-900" id="slv-${p.key}">${p.default.toFixed(p.decimals)}</span>
      </div>
      <div class="flex gap-1.5 flex-wrap" id="slt-${p.key}">
        ${p.ranges.map((r,i) => `<span id="tag-${p.key}-${i}" class="text-[10px] font-mono px-2 py-0.5 rounded-full border ${
          ['border-red-200 text-red-500 bg-red-50','border-amber-200 text-amber-500 bg-amber-50','border-emerald-200 text-emerald-500 bg-emerald-50'][i]
        }">${r} μ=0.00</span>`).join('')}
      </div>
    `;
    container.appendChild(row);

    document.getElementById(`sl-${p.key}`).addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      fuzzyValues[p.key] = v;
      document.getElementById(`slv-${p.key}`).textContent = v.toFixed(p.decimals);
      updateFuzzy();
    });
  });
}

function updateFuzzy() {
  const { score, sev, breakdown, memberships } = computeFuzzy();
  const cfg = SEV[sev];

  // Score + color
  const scoreEl = document.getElementById('fuzzyScore');
  scoreEl.textContent = score.toFixed(1);
  scoreEl.className = `font-serif text-5xl leading-none ${cfg.text}`;

  // Gauge arc
  const fill = document.getElementById('gaugeFill');
  fill.style.strokeDashoffset = 220 - (score / 100) * 220;
  fill.style.stroke = cfg.stroke;

  const dot = document.getElementById('gaugeDot');
  const angle = Math.PI - (score / 100) * Math.PI;
  dot.setAttribute('cx', (80 + 70 * Math.cos(angle)).toFixed(1));
  dot.setAttribute('cy', (80 - 70 * Math.sin(angle)).toFixed(1));
  dot.setAttribute('fill', cfg.stroke);

  // Verdict
  document.getElementById('verdictDot').className = `w-2 h-2 rounded-full mt-1.5 flex-shrink-0 transition-colors ${cfg.dot}`;
  const vt = document.getElementById('verdictTitle');
  vt.textContent = cfg.label;
  vt.className = `font-medium text-sm ${cfg.text}`;
  document.getElementById('verdictSub').textContent = cfg.sub;

  // Membership tags
  PARAMS.forEach(p => {
    const mu = memberships[p.key] || [];
    p.ranges.forEach((r, i) => {
      const tag = document.getElementById(`tag-${p.key}-${i}`);
      if (tag) tag.textContent = `${r} μ=${(mu[i] || 0).toFixed(2)}`;
    });
  });

  // Breakdown bars
  const bdList = document.getElementById('breakdownList');
  if (!bdList.dataset.built) {
    bdList.innerHTML = '';
    PARAMS.forEach(p => {
      const sc = breakdown[p.key] ?? 0;
      const pcfg = SEV[sevOf(sc)];
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      row.innerHTML = `
        <span class="text-[11px] text-stone-400 w-20 truncate flex-shrink-0">${p.label}</span>
        <div class="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
          <div class="bd-fill h-full rounded-full ${pcfg.bar}" id="bdf-${p.key}" style="width:${sc}%"></div>
        </div>
        <span class="text-[11px] font-medium w-6 text-right tabular-nums ${pcfg.text}" id="bds-${p.key}">${Math.round(sc)}</span>
      `;
      bdList.appendChild(row);
    });
    bdList.dataset.built = '1';
  } else {
    PARAMS.forEach(p => {
      const sc = breakdown[p.key] ?? 0;
      const pcfg = SEV[sevOf(sc)];
      const f = document.getElementById(`bdf-${p.key}`);
      const s = document.getElementById(`bds-${p.key}`);
      if (f) { f.style.width = sc + '%'; f.className = `bd-fill h-full rounded-full ${pcfg.bar}`; }
      if (s) { s.textContent = Math.round(sc); s.className = `text-[11px] font-medium w-6 text-right tabular-nums ${pcfg.text}`; }
    });
  }
}

// ── EXPERT UI ────────────────────────────────────────────

const selectedSymptoms = new Set();

function initExpert() {
  const grid = document.getElementById('symptomGrid');
  SYMPTOMS.forEach(s => {
    const card = document.createElement('div');
    card.className = 'sym-card fade-up bg-white border border-stone-200 rounded-xl p-3.5 cursor-pointer select-none transition-all hover:border-stone-400';
    card.innerHTML = `
      <div class="flex items-start gap-2.5 mb-1">
        <div id="chk-${s.id}" class="w-4 h-4 mt-0.5 rounded-[4px] border border-stone-300 flex-shrink-0 flex items-center justify-center transition-all text-[9px]"></div>
        <div class="min-w-0">
          <span class="text-[9px] font-mono text-stone-400">${s.id} · </span>
          <span class="text-xs font-medium text-stone-800">${s.label}</span>
        </div>
      </div>
      <p class="text-[11px] text-stone-400 leading-snug pl-[26px]">${s.desc}</p>
    `;
    card.addEventListener('click', () => {
      const chk = document.getElementById(`chk-${s.id}`);
      if (selectedSymptoms.has(s.id)) {
        selectedSymptoms.delete(s.id);
        card.classList.remove('border-stone-900', 'bg-stone-50');
        chk.className = 'w-4 h-4 mt-0.5 rounded-[4px] border border-stone-300 flex-shrink-0 flex items-center justify-center transition-all text-[9px]';
        chk.textContent = '';
      } else {
        selectedSymptoms.add(s.id);
        card.classList.add('border-stone-900', 'bg-stone-50');
        chk.className = 'w-4 h-4 mt-0.5 rounded-[4px] bg-stone-900 border-stone-900 flex-shrink-0 flex items-center justify-center transition-all text-[9px] text-white';
        chk.textContent = '✓';
      }
    });
    grid.appendChild(card);
  });

  document.getElementById('inferBtn').addEventListener('click', doInfer);
}

function getNum(id) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? null : v;
}

function doInfer() {
  const ph = getNum('inp-ph'), turb = getNum('inp-turb');
  const tds = getNum('inp-tds'), chlor = getNum('inp-chlor');
  const btn = document.getElementById('inferBtn');
  btn.disabled = true;
  document.getElementById('btnArrow').textContent = '⏳';

  const auto = [];
  if (ph !== null && ph < 6.5) auto.push('S10');
  if (ph !== null && ph > 8.5) auto.push('S11');
  if (tds !== null && tds > 500) auto.push('S12');

  const rules = runInference([...selectedSymptoms, ...auto], turb);
  renderExpertResult(rules, { ph, turb, tds, chlor });

  btn.disabled = false;
  document.getElementById('btnArrow').textContent = '→';
}

function renderExpertResult(rules, numeric) {
  const wrap = document.getElementById('expertResult');
  wrap.innerHTML = '';

  const top = rules[0];
  const cfg = SEV[top.sev];

  // Verdict
  const vc = document.createElement('div');
  vc.className = `p-5 ${cfg.bg} border-b border-stone-100`;
  vc.innerHTML = `
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.badge}">${top.id}</span>
      <span class="text-[10px] font-mono text-stone-400">${top.conf}% confidence</span>
    </div>
    <p class="font-serif text-xl ${cfg.text} mb-1.5">${cfg.label}</p>
    <p class="text-xs text-stone-500 leading-relaxed">${top.desc}</p>
  `;
  wrap.appendChild(vc);

  // Chain
  const chain = document.createElement('div');
  chain.className = 'px-5 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-1.5 flex-wrap';
  ['Gejala Input', 'Evaluasi Rules', 'Pattern Match', 'Output'].forEach((s, i, arr) => {
    const el = document.createElement('span');
    el.className = 'text-[10px] font-medium text-stone-500 bg-white border border-stone-200 px-2 py-1 rounded-lg';
    el.textContent = s;
    chain.appendChild(el);
    if (i < arr.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'text-stone-300 text-xs';
      arrow.textContent = '→';
      chain.appendChild(arrow);
    }
  });
  wrap.appendChild(chain);

  // Rule label
  const rl = document.createElement('div');
  rl.className = 'px-5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-stone-400 font-medium';
  rl.textContent = `Rules Terpenuhi (${rules.length})`;
  wrap.appendChild(rl);

  // Rules
  rules.forEach(rule => {
    const rc = SEV[rule.sev];
    const card = document.createElement('div');
    card.className = 'border-b border-stone-100 last:border-0';
    card.innerHTML = `
      <div class="px-5 py-2.5 flex items-center gap-2 bg-stone-50/60">
        <span class="text-[10px] font-medium px-2 py-0.5 rounded-full ${rc.badge}">${rule.id}</span>
        <span class="text-xs font-medium text-stone-700 flex-1">${rule.name}</span>
        <span class="text-[10px] text-stone-400 font-mono">${rule.conf}%</span>
      </div>
      <div class="px-5 py-3 space-y-1.5">
        ${rule.recs.map(r => `
          <div class="flex gap-2 items-start">
            <span class="text-stone-300 text-xs mt-0.5 flex-shrink-0">▸</span>
            <span class="text-xs text-stone-500 leading-snug">${r}</span>
          </div>`).join('')}
        <p class="text-[10px] font-mono text-stone-300 pt-2 border-t border-stone-100 mt-2">Ref: ${rule.ref}</p>
      </div>
    `;
    wrap.appendChild(card);
  });

  // Numeric summary
  const pairs = [
    { label: 'pH',            val: numeric.ph,    lo: 6.5, hi: 8.5 },
    { label: 'Turbidity NTU', val: numeric.turb,  lo: 0,   hi: 4   },
    { label: 'TDS ppm',       val: numeric.tds,   lo: 0,   hi: 500 },
    { label: 'Klorin mg/L',   val: numeric.chlor, lo: 0,   hi: 4   },
  ].filter(p => p.val !== null);

  if (pairs.length) {
    const ns = document.createElement('div');
    ns.className = 'border-t border-stone-100';
    const label = document.createElement('div');
    label.className = 'px-5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-stone-400 font-medium';
    label.textContent = 'Nilai Terukur';
    ns.appendChild(label);

    pairs.forEach(p => {
      const ok = p.lo <= p.val && p.val <= p.hi;
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center px-5 py-2 border-b border-stone-50 last:border-0';
      row.innerHTML = `
        <span class="text-xs text-stone-500">${p.label}</span>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-medium ${ok ? 'text-emerald-600' : 'text-red-500'}">${p.val}</span>
          <span class="text-[10px] ${ok ? 'text-emerald-500' : 'text-red-400'}">${ok ? '✓ Normal' : '✗ Melebihi'}</span>
        </div>
      `;
      ns.appendChild(row);
    });
    wrap.appendChild(ns);
  }
}

// ── TAB SWITCHING ────────────────────────────────────────

document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => {
      b.classList.remove('bg-stone-900', 'text-white');
      b.classList.add('text-stone-500');
    });
    btn.classList.remove('text-stone-500');
    btn.classList.add('bg-stone-900', 'text-white');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

// ── INIT ─────────────────────────────────────────────────

initSliders();
updateFuzzy();
initExpert();
