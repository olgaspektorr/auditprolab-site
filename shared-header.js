const v2SharedPaths=new Set([
  "/blog/",
  "/blog/pochemu-otdel-prodazh-ne-vypolnyaet-plan/",
  "/blog/kak-samostoyatelno-proverit-otdel-prodazh/",
  "/blog/klient-dumaet-zavisshie-sdelki/",
  "/audit-otdela-prodazh/"
]);
if(v2SharedPaths.has(location.pathname)){
  document.body.classList.add("theme-v2");
  if(!document.querySelector('link[href="/theme-v2.css"]')){
    const theme=document.createElement("link");
    theme.rel="stylesheet";theme.href="/theme-v2.css";
    document.head.appendChild(theme);
  }
}

const sharedMenu=document.querySelector(".apl-menu"),sharedNav=document.querySelector("#apl-nav");
sharedMenu?.addEventListener("click",()=>{const open=sharedNav.classList.toggle("open");sharedMenu.setAttribute("aria-expanded",String(open))});
sharedNav?.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{sharedNav.classList.remove("open");sharedMenu?.setAttribute("aria-expanded","false")}));
