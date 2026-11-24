'use strict';
(function(){
 var ev=function(n,p){try{window.T&&T.ev(n,p)}catch(e){}};
 document.querySelectorAll('.ob').forEach(function(b){b.addEventListener('click',function(){var o=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',o);b.querySelector('span').textContent=o?'접기':'보기';document.getElementById(b.getAttribute('aria-controls')).hidden=!o;});});
 var f=new URLSearchParams(location.search).get('from')||'';try{if(/^(yt|tt)$/.test(f))sessionStorage.setItem('dwk_plat',f);f=sessionStorage.getItem('dwk_plat')||f}catch(e){}
 if(/^(yt|tt)$/.test(f)){document.querySelectorAll('.v-dm').forEach(function(e){e.hidden=true});document.querySelectorAll('.v-yt').forEach(function(e){e.hidden=false})}
 // 배경화면 받기: 큰 버튼 하나만. 화면 비율로 맞는 크기를 고르고, 다른 크기는 작은 글 링크로(세 개의 문: 버튼 두 개 · 받기 누름 적음)
 var r=Math.max(screen.width,screen.height)/Math.min(screen.width,screen.height)||2.16;
 document.querySelectorAll('.wpget').forEach(function(a){
  var tall=r>=1.95, main=a.querySelector('.btn'), alt=a.querySelector('.alt');if(!main||!alt)return;
  var big=main.dataset.big, small=main.dataset.small, n=main.dataset.n;
  main.href=tall?big:small; main.dataset.t='wp'+n+(tall?'_1290':'_1080');
  alt.href=tall?small:big; alt.dataset.t='wp'+n+(tall?'_1080':'_1290')+'_alt'; alt.textContent=tall?'다른 크기(9:16 · 1080×1920)':'다른 크기(세로로 긴 폰 · 1290×2796)';
 });
 // 미리보기 그림을 길게 눌러 저장하는 사람은 버튼 누름에 안 잡힌다(세 개의 문 기록의 빈칸) → 0.5초 이상 누름을 따로 센다
 document.querySelectorAll('img.pv').forEach(function(im){var t=null;
  im.addEventListener('touchstart',function(){t=setTimeout(function(){ev('click',{el:'wp'+im.dataset.n+'_press'})},500)},{passive:true});
  ['touchend','touchmove','touchcancel'].forEach(function(k){im.addEventListener(k,function(){clearTimeout(t)},{passive:true})});
  im.addEventListener('contextmenu',function(){ev('click',{el:'wp'+im.dataset.n+'_press'})});
 });
 // 긴 풀이 어디까지 읽었나(세 개의 문 1번 긴 풀이 스크롤 42% — 어느 문단에서 멈췄는지 몰랐다) → 머리말이 화면에 들어올 때 한 번씩
 if('IntersectionObserver' in window){var seen={};var io=new IntersectionObserver(function(es){es.forEach(function(e){var k=e.target.dataset.k;if(e.isIntersecting&&!seen[k]){seen[k]=1;ev('result',{el:'long_'+k})}})},{threshold:1});
  document.querySelectorAll('.read [data-k]').forEach(function(h){io.observe(h)});}
})();
