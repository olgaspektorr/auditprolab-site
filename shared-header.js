const sharedMenu=document.querySelector(".apl-menu"),sharedNav=document.querySelector("#apl-nav");
sharedMenu?.addEventListener("click",()=>{const open=sharedNav.classList.toggle("open");sharedMenu.setAttribute("aria-expanded",String(open))});
sharedNav?.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{sharedNav.classList.remove("open");sharedMenu?.setAttribute("aria-expanded","false")}));
