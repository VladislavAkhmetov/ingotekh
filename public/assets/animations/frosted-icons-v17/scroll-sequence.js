/* Reference scroll player: fixed camera, bounded decode cache, correct alpha blending. */
(() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ease=t=>t*t*(3-2*t);
  class FrostedScrollSequence {
    constructor(section,baseURL='./') {
      this.section=section;this.baseURL=baseURL;
      this.object=section.querySelector('[data-sequence-object]');
      this.canvas=section.querySelector('canvas');this.context=this.canvas.getContext('2d',{alpha:true});
      this.label=section.querySelector('[data-sequence-status]');
      this.bitmaps=new Map();this.blobs=new Map();this.busy=new Set();this.failed=new Set();
      this.queue=[];this.active=0;this.position=1;this.raf=0;this.limit=20;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.schedule=this.schedule.bind(this);this.resize=this.resize.bind(this);
    }
    async init() {
      const response=await fetch(new URL('manifest.json',new URL(this.baseURL,location.href)));
      if(!response.ok)throw new Error(`manifest: ${response.status}`);
      this.manifest=await response.json();this.count=this.manifest.frameCount;
      this.size=innerWidth<900?768:1280;this.canvas.width=this.canvas.height=this.size;
      addEventListener('scroll',this.schedule,{passive:true});addEventListener('resize',this.resize);
      this.reduced.addEventListener('change',this.resize);this.resize();
    }
    resize() {
      this.travel=Math.round(clamp(1200*innerWidth/1440,900,2100));
      this.section.style.setProperty('--travel',`${this.travel}px`);this.schedule();
    }
    schedule() {if(!this.raf)this.raf=requestAnimationFrame(()=>{this.raf=0;this.update();});}
    update() {
      const p=this.reduced.matches?0:clamp(-this.section.getBoundingClientRect().top/this.travel,0,1);
      this.position=1+p*(this.count-1);
      const move=ease(clamp((this.position-60)/120,0,1));
      const offset=innerWidth<900?innerWidth*.045:Math.min(innerWidth*.19,340);
      this.object.style.transform=`translate3d(${offset*(1-2*move)}px,0,0)`;
      const center=Math.round(this.position),wanted=[Math.floor(this.position),Math.ceil(this.position)];
      if(!this.reduced.matches)for(let d=1;d<=9;d++)wanted.push(center+d,center-d);
      this.queue=[...new Set(wanted)].filter(f=>f>=1&&f<=this.count&&!this.bitmaps.has(f)&&!this.busy.has(f)&&!this.failed.has(f));
      this.pump();this.draw();
    }
    pump() {
      while(this.active<3&&this.queue.length) {
        const f=this.queue.shift();if(this.bitmaps.has(f)||this.busy.has(f))continue;
        this.active++;this.busy.add(f);
        this.load(f).catch(error=>{this.failed.add(f);if(this.label)this.label.textContent=`Не удалось загрузить кадр ${f}`;console.error(error);})
          .finally(()=>{this.active--;this.busy.delete(f);this.pump();this.schedule();});
      }
    }
    async load(f) {
      let blob=this.blobs.get(f);
      if(!blob) {
        const name=`webp_${this.size}/frame_${String(f).padStart(4,'0')}.webp`;
        const response=await fetch(new URL(name,new URL(this.baseURL,location.href)));
        if(!response.ok)throw new Error(`${name}: ${response.status}`);
        blob=await response.blob();this.blobs.set(f,blob);
      }
      if(Math.abs(f-this.position)>12&&!this.reduced.matches)return;
      const bitmap=await createImageBitmap(blob);
      this.bitmaps.set(f,bitmap);
      while(this.bitmaps.size>this.limit) {
        const far=[...this.bitmaps.keys()].sort((a,b)=>Math.abs(b-this.position)-Math.abs(a-this.position))[0];
        this.bitmaps.get(far).close();this.bitmaps.delete(far);
      }
    }
    draw() {
      const low=Math.floor(this.position),high=Math.min(this.count,low+1),t=this.position-low;
      const a=this.bitmaps.get(low),b=this.bitmaps.get(high),ctx=this.context;
      let fallback;
      if(!a||(!b&&t>0)) {
        const nearest=[...this.bitmaps.keys()].sort((x,y)=>Math.abs(x-this.position)-Math.abs(y-this.position))[0];
        fallback=this.bitmaps.get(nearest);if(!fallback)return;
      }
      ctx.clearRect(0,0,this.size,this.size);ctx.globalCompositeOperation='source-over';
      if(fallback){ctx.globalAlpha=1;ctx.drawImage(fallback,0,0,this.size,this.size);}
      else {
        ctx.globalAlpha=1-t;ctx.drawImage(a,0,0,this.size,this.size);
        if(t>0&&b){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=t;ctx.drawImage(b,0,0,this.size,this.size);}
      }
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      if(this.label&&!this.failed.size)this.label.textContent=`${String(Math.round(this.position)).padStart(3,'0')} / ${this.count}`;
    }
    destroy() {
      removeEventListener('scroll',this.schedule);removeEventListener('resize',this.resize);
      this.reduced.removeEventListener('change',this.resize);cancelAnimationFrame(this.raf);
      for(const bitmap of this.bitmaps.values())bitmap.close();this.bitmaps.clear();this.blobs.clear();
    }
  }
  window.FrostedScrollSequence=FrostedScrollSequence;
  const section=document.querySelector('[data-frosted-sequence]');
  if(section)new FrostedScrollSequence(section).init().catch(e=>{
    const label=section.querySelector('[data-sequence-status]');if(label)label.textContent='Откройте просмотр через HTTP-сервер';console.error(e);
  });
})();
