export const columns = ['code','name','market','sector','asOf','period','source','price','marketCap','revenue','previousRevenue','operatingProfit','previousOperatingProfit','netIncome','equity','previousEquity','liabilities','operatingCashFlow','capex','dividendYield'];
export const numericColumns = columns.slice(7);
export const presets = {
  balanced: {name:'균형 발굴', description:'수익성, 성장, 가격을 균형 있게', roe:10, growth:5, per:20, debt:150, cash:true},
  quality: {name:'우량 성장', description:'현금이 따라오는 이익 성장', roe:15, growth:15, per:30, debt:100, cash:true},
  value: {name:'가치 탐색', description:'이익과 자본 대비 낮은 가격', roe:8, growth:0, per:12, debt:120, cash:true},
  all: {name:'전체 탐색', description:'조건 없이 재무 지표 비교', roe:'', growth:'', per:'', debt:'', cash:false}
};
export function parseCSV(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"'){cell+='"';i++;} else if(!quoted && cell.length){throw new Error('CSV 따옴표 위치가 올바르지 않습니다.');} else quoted=!quoted; }
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('CSV의 따옴표가 닫히지 않았습니다.');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.length<2)throw new Error('헤더와 최소 한 개의 종목이 필요합니다.');
  const header=rows.shift().map(v=>v.trim());
  if(new Set(header).size!==header.length)throw new Error('중복된 열 이름이 있습니다.');
  const missing=columns.filter(c=>!header.includes(c));
  if(missing.length)throw new Error('필수 열 누락: '+missing.join(', '));
  if(rows.length>5000)throw new Error('한 번에 최대 5,000개 종목을 업로드할 수 있습니다.');
  const seen=new Set();
  return rows.map((values,i)=> {
    if(values.length!==header.length)throw new Error(`${i+2}행: 열 개수가 헤더와 다릅니다.`);
    const s=Object.fromEntries(header.map((k,j)=>[k,values[j].trim()]));
    if(!/^\d{6}$/.test(s.code))throw new Error(`${i+2}행: 종목코드는 6자리 숫자여야 합니다. 앞자리 0을 보존하세요.`);
    if(seen.has(s.code))throw new Error(`${i+2}행: 중복 종목코드 ${s.code}`);seen.add(s.code);
    if(!s.name||!s.source||!s.sector)throw new Error(`${i+2}행: 종목명·업종·출처를 입력하세요.`);
    if(!['KOSPI','KOSDAQ','KONEX'].includes(s.market))throw new Error(`${i+2}행: 시장은 KOSPI, KOSDAQ, KONEX 중 하나입니다.`);
    if(!/^\d{4}-FY$/.test(s.period))throw new Error(`${i+2}행: 재무기간은 2025-FY 같은 연간 형식이어야 합니다. 분기와 연간 수치는 혼용하지 않습니다.`);
    const d=new Date(s.asOf+'T00:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s.asOf)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s.asOf)throw new Error(`${i+2}행: 기준일은 실제 날짜 YYYY-MM-DD 형식이어야 합니다.`);
    const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
    if(s.asOf>today)throw new Error(`${i+2}행: 기준일이 미래입니다.`);
    for(const k of numericColumns) {
      if(s[k]===''||s[k]==='NA'||s[k]==='N/A'){s[k]=null;continue;}
      const clean=s[k].replace(/,/g,'');
      if(!/^-?\d+(\.\d+)?$/.test(clean))throw new Error(`${i+2}행: ${k}에 숫자 또는 빈칸을 입력하세요.`);
      s[k]=Number(clean);if(!Number.isFinite(s[k]))throw new Error(`${i+2}행: ${k} 값이 너무 큽니다.`);
    }
    for(const k of ['price','marketCap','revenue','previousRevenue','liabilities','capex','dividendYield'])if(s[k]!==null&&s[k]<0)throw new Error(`${i+2}행: ${k}는 음수일 수 없습니다. capex는 지출의 양수 절댓값입니다.`);
    return s;
  });
}
const ratio=(a,b)=>a!==null&&b!==null&&b>0?a/b:null;
export function metrics(s) {
  const avgEquity=s.equity!==null&&s.previousEquity!==null?(s.equity+s.previousEquity)/2:null;
  const growth=s.previousRevenue>0&&s.revenue!==null?(s.revenue/s.previousRevenue-1)*100:null;
  const profitGrowth=s.previousOperatingProfit>0&&s.operatingProfit!==null?(s.operatingProfit/s.previousOperatingProfit-1)*100:null;
  return {per:s.netIncome>0?ratio(s.marketCap,s.netIncome):null,pbr:ratio(s.marketCap,s.equity),roe:s.netIncome!==null&&avgEquity>0&&s.equity>0&&s.previousEquity>0?ratio(s.netIncome,avgEquity)*100:null,growth,profitGrowth,margin:ratio(s.operatingProfit,s.revenue)===null?null:ratio(s.operatingProfit,s.revenue)*100,debt:ratio(s.liabilities,s.equity)===null?null:ratio(s.liabilities,s.equity)*100,fcf:s.operatingCashFlow!==null&&s.capex!==null?s.operatingCashFlow-s.capex:null};
}
export function score(s) {
  const m=metrics(s), clamp=(v)=>Math.max(0,Math.min(1,v));
  const inputs=[m.roe,m.margin,m.growth,m.per,m.fcf,s.marketCap];
  if(inputs.some(v=>v===null)||s.marketCap<=0)return null;
  const value=clamp((25-m.per)/20)*25;
  const quality=clamp(m.roe/20)*20+clamp(m.margin/20)*15;
  const growth=clamp(m.growth/25)*25;
  const cash=clamp((m.fcf/s.marketCap)/0.08)*15;
  return {total:Math.round(value+quality+growth+cash),value:Math.round(value),quality:Math.round(quality),growth:Math.round(growth),cash:Math.round(cash)};
}
export function warnings(s) {
  const m=metrics(s), w=[];
  if(s.netIncome!==null&&s.netIncome<=0)w.push('적자·PER 산출 불가');
  if(s.previousRevenue===0||s.previousRevenue===null)w.push('매출 성장률 산출 불가');
  if(s.previousOperatingProfit!==null&&s.previousOperatingProfit<=0)w.push('이익 성장률 산출 불가·기저효과 검토');
  if(s.operatingCashFlow!==null&&s.operatingCashFlow<=0)w.push('영업현금흐름 비양수');
  if(m.fcf!==null&&m.fcf<0)w.push('잉여현금흐름 음수');
  if(m.debt!==null&&m.debt>150)w.push('부채비율 150% 초과');
  if(s.equity!==null&&s.equity<=0)w.push('자본총계 비양수');
  if(numericColumns.some(k=>s[k]===null))w.push('일부 재무 항목 누락');
  const age=(Date.now()-new Date(s.asOf+'T00:00:00Z').getTime())/86400000;
  if(age>45)w.push('가격 기준일 45일 경과');
  if(/금융|은행|보험|증권/.test(s.sector))w.push('금융업: 일반기업 지표로 단순 비교 주의');
  return w;
}
export function filterStocks(stocks,f,watch=[]) {
  return stocks.filter(s=> {
    const m=metrics(s);
    if(f.query&&!`${s.name} ${s.code} ${s.sector}`.toLowerCase().includes(f.query.toLowerCase()))return false;
    if(f.market!=='전체'&&s.market!==f.market)return false;
    if(f.sector!=='전체'&&s.sector!==f.sector)return false;
    if(f.period!=='전체'&&s.period!==f.period)return false;
    if(f.watch&&!watch.includes(s.code))return false;
    for(const [k,op] of [['roe','min'],['growth','min'],['per','max'],['debt','max']]) {
      if(f[k]!==''&&f[k]!==undefined) {
        if(m[k]===null)return false;
        if(op==='min'?m[k]<Number(f[k]):m[k]>Number(f[k]))return false;
      }
    }
    if(f.cash&&(m.fcf===null||m.fcf<=0))return false;
    return true;
  });
}
export function serializeCSV(stocks) {
  const safe=(v)=>{let t=String(v??'');if(/^[=+@\t\r]/.test(t)||(/^-[^\d]/.test(t)))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
  return '\uFEFF'+[columns,...stocks.map(s=>columns.map(c=>s[c]))].map(row=>row.map(safe).join(',')).join('\r\n');
}
export const examples=Array.from({length:12},(_,i)=>({code:String(900001+i),name:['예시 반도체','예시 자동화','예시 소비재','예시 소프트웨어','예시 산업재','예시 바이오','예시 자동차','예시 소재','예시 식품','예시 건설','예시 금융','예시 전력'][i],market:i%3===0?'KOSDAQ':'KOSPI',sector:['반도체','산업재','소비재','소프트웨어','산업재','바이오','자동차','소재','소비재','건설','금융','전력'][i],asOf:'2026-10-13',period:'2025-FY',source:'기능 확인용 가상 데이터. 실제 기업·시세가 아닙니다.',price:10000+i*3500,marketCap:1200+i*500,revenue:1800+i*450,previousRevenue:1500+i*410,operatingProfit:180+i*52,previousOperatingProfit:i===5?-20:140+i*40,netIncome:i===5?-100:120+i*40,equity:1000+i*320,previousEquity:900+i*290,liabilities:i===9?5000:400+i*160,operatingCashFlow:i===5?-50:200+i*70,capex:70+i*25,dividendYield:i%5+0.5}));
