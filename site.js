if(!window.ym){
  window.ym=function(){(window.ym.a=window.ym.a||[]).push(arguments)};
  window.ym.l=Date.now();
  const metric=document.createElement("script");
  metric.async=true;metric.src="https://mc.yandex.ru/metrika/tag.js";
  document.head.appendChild(metric);
  window.ym(111017243,"init",{ssr:true,webvisor:true,clickmap:true,accurateTrackBounce:true,trackLinks:true});
}

const menu=document.querySelector(".menu"),nav=document.querySelector("#nav");
menu?.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open))});
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menu?.setAttribute("aria-expanded","false")}));

document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",()=>{if(window.ym){window.ym(111017243,"reachGoal","internal_cta_click")}}));
document.querySelectorAll("a,button").forEach(el=>el.addEventListener("click",()=>{
  const label=(el.textContent||"").trim().slice(0,120);
  const href=el.getAttribute("href")||"";
  if(window.ym)window.ym(111017243,"params",{interaction:{label,href,page:location.pathname,device:matchMedia("(max-width: 820px)").matches?"mobile":"desktop"}});
}));
document.querySelectorAll('a[href*="t.me"]').forEach(a=>a.addEventListener("click",()=>{if(window.ym){window.ym(111017243,"reachGoal","telegram_click")}}));
document.querySelectorAll('a[href^="mailto:"]').forEach(a=>a.addEventListener("click",()=>{if(window.ym){window.ym(111017243,"reachGoal","email_click")}}));
document.querySelectorAll('a[href="/approach/"]').forEach(a=>a.addEventListener("click",()=>window.ym?.(111017243,"reachGoal","approach_open")));
document.querySelectorAll('a[href="/audit-otdela-prodazh/"]').forEach(a=>a.addEventListener("click",()=>window.ym?.(111017243,"reachGoal","audit_page_open")));

const form=document.querySelector("#application"),status=form?.querySelector(".form__status");
document.querySelectorAll(".format-button").forEach(button=>button.addEventListener("click",()=>{
  const field=form?.querySelector('[name="selectedFormat"]');
  if(field)field.value=button.dataset.format||"Обсуждение ситуации";
  window.ym?.(111017243,"params",{selected_format:button.dataset.format||""});
}));
form?.addEventListener("focusin",()=>window.ym?.(111017243,"reachGoal","application_start"),{once:true});
form?.addEventListener("submit",async event=>{
  event.preventDefault();
  const button=form.querySelector(".form__submit"),data=new FormData(form),contact=String(data.get("contact")||"").trim();
  const isTelegram=contact.startsWith("@")||contact.includes("t.me/");
  const utm=[...new URLSearchParams(location.search)].filter(([k])=>k.toLowerCase().startsWith("utm_")).map(([k,v])=>`${k}=${v}`).join("&");
  const payload={
    name:data.get("name"),company:data.get("company"),position:data.get("position"),
    phone:isTelegram?"":contact,telegram:isTelegram?contact:"",
    contact,industry:data.get("industry"),site:data.get("site"),teamSize:data.get("teamSize"),
    situation:data.get("situation"),selectedFormat:data.get("selectedFormat"),website:data.get("website"),consent:data.get("consent")==="on",
    page:location.href,utm
  };
  button.disabled=true;status.textContent="Отправляю…";
  try{
    const response=await fetch("https://auditprolab-crm.olgaspektorr.workers.dev",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.ok)throw new Error(result.error||"request_failed");
    status.textContent="Спасибо. Заявка отправлена — я свяжусь с вами.";
    form.reset();
    if(window.ym)window.ym(111017243,"reachGoal","application_submit");
  }catch(error){
    console.error("Lead form submission failed",error);
    if(window.ym)window.ym(111017243,"reachGoal","application_error");
    status.textContent="Не удалось отправить заявку. Напишите мне в Telegram: @olga_auditpro";
  }finally{button.disabled=false}
});
