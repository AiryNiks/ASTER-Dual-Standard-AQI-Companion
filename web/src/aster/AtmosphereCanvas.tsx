// Live atmosphere — a WebGL fragment shader (origin: makeSky() in Aster.dc.html, since
// upgraded). Celestial pass + volumetric weather (clouds/fog/rain/snow/storm) in one loop:
//   • the sun (light theme + clear): limb-darkened photosphere with drifting granulation,
//     chromosphere ring, and a 3-layer volumetric corona broken up by noise wisps;
//   • the moon (dark theme + clear): cool cratered disc + halo;
//   • stars (dark theme + clear): three lattice depths + hero stars with colour
//     temperature, soft 4-point flares, and per-star organic twinkle;
//   • clouds drift via animated fbm, fog "breathes", rain/snow fall, storms flash — all in rAF.
import { useEffect, useRef } from 'react'
import { hexToRgb, type EffectiveSky } from './engine'

interface SkyHandle {
  setTarget(s: Partial<EffectiveSky>): void
  destroy(): void
}

const VS =
  'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}'

const FS = `precision highp float;varying vec2 vUv;uniform float uTime;uniform vec2 uRes;uniform float uDay;uniform float uDusk;uniform float uCloud;uniform float uRain;uniform float uSnow;uniform float uFog;uniform float uStorm;uniform float uWind;uniform float uFlash;uniform vec3 uHazeColor;uniform float uHaze;uniform float uDark;
float hash11(float n){return fract(sin(n)*43758.5453123);}
float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i);float b=hash21(i+vec2(1.0,0.0));float c=hash21(i+vec2(0.0,1.0));float d=hash21(i+vec2(1.0,1.0));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;mat2 r=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*vnoise(p);p=r*p;a*=0.5;}return v;}
float rainLayer(vec2 uv,float t,float cols,float speed,float slant,float density,float seed){vec2 q=uv;q.x+=(1.0-q.y)*slant;q.x*=cols;float colId=floor(q.x);float h=hash11(colId*0.913+seed);float on=step(1.0-density,hash11(colId*1.371+seed+5.0));float x=fract(q.x)-0.5;float y=fract(q.y*2.0+t*speed*(0.8+0.4*h)+h*17.0);float len=mix(0.22,0.42,h);float body=smoothstep(len,len*0.1,y)*smoothstep(-0.02,0.02,y);float thick=0.045+0.09*h;float line=smoothstep(thick,thick*0.2,abs(x));return body*line*on;}
float flakes(vec2 uv,float t,float n,float speed,float sway,float seed){
  vec2 q=uv*n;
  q.y+=t*speed*n*0.16;
  q.x+=t*speed*n*0.06*sway+sin(t*0.5+uv.y*5.0+seed)*0.30;
  vec2 id=floor(q);vec2 f=fract(q)-0.5;
  float h=hash21(id+seed);
  vec2 off=(vec2(hash21(id+1.3+seed),hash21(id+4.7+seed))-0.5)*0.5;
  off.x+=sin(t*(0.6+h*1.8)+h*44.0)*0.13;
  off.y+=cos(t*(0.4+h*1.2)+h*23.0)*0.05;
  float r=0.045+h*0.055;
  float d=length(f-off);
  float m=smoothstep(r,r*0.2,d);
  return m*step(0.74,h)*(0.35+0.65*h);
}
// One star lattice layer. Per cell: presence hash, jittered position, size, brightness,
// and an individual twinkle (rate + phase + depth from two beating sines) so no two
// stars shimmer alike. seed offsets the grid so layers never align.
float starLayer(vec2 p,float t,float scale,float thresh,float rMin,float rMax,float twk,float seed){
  vec2 g=p*scale+seed;
  vec2 id=floor(g);
  vec2 f=fract(g)-0.5;
  float h=hash21(id);
  float on=step(thresh,h);
  vec2 off=(vec2(hash21(id+7.0),hash21(id+13.0))-0.5)*0.7;
  float hs=hash21(id+3.1);
  float r=mix(rMin,rMax,hs*hs);
  float d=length(f-off);
  float core=smoothstep(r,r*0.25,d);
  float rate=0.5+2.9*hash21(id+5.7);
  float ph=h*6.2831;
  float w=0.5+0.5*sin(t*rate+ph);
  w=mix(w,0.5+0.5*sin(t*rate*1.7+ph*2.3),0.4);
  float depth=twk*(0.25+0.75*hash21(id+9.3));
  return core*on*(0.55+0.45*hs)*(1.0-depth*w);
}
// Three depths of stars: dense faint dust, a mid field, and sparse hero stars that
// carry a colour temperature (cool blue-white vs warm) and a soft 4-point flare.
vec3 starfield(vec2 p,float t){
  vec3 acc=vec3(0.68,0.77,1.0)*starLayer(p,t,190.0,0.84,0.11,0.18,0.35,17.3)*0.55;
  acc+=vec3(0.84,0.90,1.0)*starLayer(p,t,120.0,0.86,0.13,0.24,0.60,4.7)*0.9;
  vec2 g=p*64.0;
  vec2 id=floor(g);
  vec2 f=fract(g)-0.5;
  float h=hash21(id);
  float on=step(0.90,h);
  vec2 q=f-(vec2(hash21(id+7.0),hash21(id+13.0))-0.5)*0.55;
  float d=length(q);
  float hs=hash21(id+3.1);
  float core=smoothstep(0.16+0.13*hs,0.04,d);
  float rate=0.6+2.4*hash21(id+5.7);
  float ph=h*6.2831;
  float w=0.5+0.5*sin(t*rate+ph);
  w=mix(w,0.5+0.5*sin(t*rate*1.61+ph*2.3),0.35);
  float tw=1.0-(0.20+0.55*hash21(id+9.3))*w;
  float fl=exp(-abs(q.x)*24.0)*exp(-abs(q.y)*6.0)+exp(-abs(q.y)*24.0)*exp(-abs(q.x)*6.0);
  fl*=smoothstep(0.5,0.05,d);
  vec3 tint=mix(vec3(0.74,0.83,1.0),vec3(1.0,0.93,0.74),step(0.62,hash21(id+11.7))*0.9);
  acc+=tint*on*(core*1.3+fl*0.42)*tw;
  return acc;
}
void main(){vec2 uv=vUv;vec2 asp=vec2(uRes.x/max(uRes.y,1.0),1.0);vec2 p=uv*asp;float t=uTime;
// Celestial mapping is THEME-driven (not real clock): light theme = day sky + SUN,
// dark theme = night sky + MOON + stars. In light theme the sky is always day-lit even
// if it is really night outside, so dayF is forced to 1 whenever uDark is 0.
float dayF=max(uDay,1.0-uDark);
float night=1.0-dayF;
float gloom=clamp(max(uRain*0.75,uStorm*0.9)+uFog*0.3,0.0,1.0);
float clearF=(1.0-smoothstep(0.18,0.55,uCloud))*(1.0-uFog)*(1.0-clamp(uRain*1.4,0.0,1.0))*(1.0-clamp(uSnow*1.2,0.0,1.0))*(1.0-uStorm);
vec3 dayTop=vec3(0.40,0.62,0.90);vec3 dayBot=vec3(0.82,0.90,0.98);vec3 nightTop=vec3(0.24,0.33,0.52);vec3 nightBot=vec3(0.48,0.58,0.74);
vec3 top=mix(nightTop,dayTop,dayF);vec3 bot=mix(nightBot,dayBot,dayF);
top=mix(top,vec3(0.64,0.71,0.80),gloom);bot=mix(bot,vec3(0.78,0.84,0.90),gloom);
float g=pow(1.0-uv.y,1.35);vec3 col=mix(top,bot,g);
col+=vec3(0.95,0.55,0.35)*uDusk*pow(1.0-uv.y,3.0)*0.5*(1.0-gloom*0.85)*(1.0-uDark);
vec3 mineral=col*vec3(0.16,0.18,0.235)+vec3(0.022,0.030,0.050);col=mix(col,mineral,uDark);
// starVis is uniform-derived, so this branch is coherent: light mode pays zero star cost.
float starVis=uDark*clearF;
if(starVis>0.004){col+=starfield(p,t)*starVis;}
// Celestial geometry is normalized to canvas WIDTH (um) so bodies stay sane on tall shells.
float um=min(asp.x,1.0);
// SUN gates on the LIGHT theme (dayF is 1 there), never the dark theme.
float sunGate=(1.0-uDark)*clearF;
if(sunGate>0.004){
  // Anchor by shell shape: phone-narrow canvases (asp<0.55) keep the top-right corner;
  // wider desktop shells put the sun in the open sky band between the hero columns.
  vec2 sunPos=(asp.x<0.55?vec2(0.76,0.88):vec2(0.56,0.87))*asp;
  vec2 sv=(p-sunPos)/um;
  float sd=length(sv);
  float R=0.072;
  float shim=1.0+0.030*sin(t*1.35)+0.020*sin(t*0.57+1.7);
  // Volumetric corona = three falloffs. Cartesian noise wisps break the ring symmetry
  // (angular noise would seam at the atan wrap); the branch skips the fbm for the ~90%
  // of pixels the mid halo cannot reach.
  float wisp=1.0;
  if(sd<0.42){wisp=0.78+0.44*fbm(sv*3.4+vec2(t*0.020,-t*0.013));}
  float aura=exp(-sd*7.5)*0.42;
  float mid=exp(-sd*sd*95.0)*0.58*wisp;
  float bloom=exp(-sd*sd*260.0)*0.85;
  // Additive orange on a bright pastel sky washes to white, so the WIDE glow tints the
  // sky toward amber (pulls blue down); only the inner layers add light on top.
  col=mix(col,vec3(1.0,0.63,0.22),clamp((aura+mid)*shim,0.0,1.0)*0.70*sunGate);
  col+=vec3(1.0,0.60,0.20)*mid*0.18*sunGate*shim;
  col+=vec3(1.0,0.83,0.54)*bloom*0.30*sunGate*shim;
  // Photosphere: limb-darkened disc — near-white cream core through gold to a deep
  // amber rim (mu = cosine of the emergent angle), two-scale drifting granulation,
  // and a thin chromosphere ring hugging the limb. Edge is smoothstep-antialiased.
  float disc=1.0-smoothstep(R-0.0028,R+0.0028,sd);
  if(disc>0.001){
    float mu=sqrt(max(1.0-(sd*sd)/(R*R),0.0));
    float limbD=0.46+0.54*pow(mu,0.62);
    vec3 sc=mix(vec3(0.998,0.86,0.34),vec3(1.0,0.99,0.94),pow(mu,1.35));
    sc=mix(vec3(0.97,0.62,0.14),sc,smoothstep(0.0,0.40,mu));
    float gr1=fbm(sv*150.0+vec2(t*0.016,-t*0.011));
    float gr2=fbm(sv*52.0+vec2(-t*0.009,t*0.007)+5.2);
    float gran=0.965+0.08*(gr1-0.5)+0.06*(gr2-0.5);
    vec3 sunSurf=sc*limbD*gran;
    sunSurf+=vec3(0.98,0.45,0.14)*smoothstep(R*0.84,R,sd)*0.30;
    col=mix(col,sunSurf,disc*sunGate);
  }
  // Hot rim light hugging the limb from outside ((sd-R) squared by multiplication —
  // pow() with a negative base is undefined in GLSL).
  float dr=(sd-R)*34.0;
  float rim=exp(-dr*dr)*(1.0-disc);
  col+=vec3(1.0,0.75,0.40)*rim*0.20*sunGate*shim;
}
// MOON gates on the DARK theme only (never light).
float moonGate=uDark*clearF;
if(moonGate>0.004){
  vec2 moonPos=vec2(0.24,0.94)*asp;float md2=distance(p,moonPos)/um;
  float mdisc=smoothstep(0.085,0.074,md2);
  vec2 mp=(p-moonPos)/(0.08*um);
  float mar=fbm(mp*2.6+7.3);
  float crat=fbm(mp*7.5+2.1);
  float tex=0.80+0.20*mar;
  tex-=0.22*smoothstep(0.52,0.78,crat);
  float lit=0.66+0.34*clamp(0.5+0.62*mp.x-0.30*mp.y,0.0,1.0);
  vec3 mcol=vec3(0.90,0.93,1.0)*tex*lit*1.12;
  float mhalo=exp(-md2*md2*13.0)*0.4+exp(-md2*md2*3.5)*0.10;
  col+=(mcol*mdisc+vec3(0.50,0.60,0.90)*mhalo)*moonGate;
}
float drift=0.55+uWind*1.3;
// In pure CLOUDS mode (high cloud, no rain/storm/snow/fog) drive a clearly visible drift.
// Scoped via cloudsMode (≈1 only in clouds mode, ≈0 in rain/storm/snow/fog) so every other
// mode keeps its exact existing cloud motion. Only translates the noise — structure/colour
// are untouched. Applies equally in light and dark (drift is theme-independent).
float cloudsMode=smoothstep(0.45,0.68,uCloud*(1.0-uRain)*(1.0-uStorm)*(1.0-uSnow)*(1.0-uFog));
drift+=cloudsMode*2.0;
float th=mix(0.80,0.26,uCloud);
vec2 q1=p*1.5+vec2(t*0.014*drift,t*0.0015)+3.7;float f1=fbm(q1+vnoise(q1*2.1)*0.45);float c1=smoothstep(th,th+0.45,f1);
vec2 q2=p*3.0+vec2(t*0.030*drift,-t*0.002)+11.9;float f2=fbm(q2+vnoise(q2*1.9)*0.35);float c2=smoothstep(th+0.04,th+0.40,f2);
float cd=clamp(c1*0.72+c2*0.45,0.0,1.0);cd*=mix(1.0,smoothstep(0.06,0.42,uv.y),0.30);
vec3 cloudLight=mix(vec3(1.0,1.0,1.0),vec3(0.60,0.66,0.77),clamp(c2*0.9+gloom*0.4,0.0,1.0));
vec3 cloudDeep=mix(vec3(0.165,0.19,0.26),vec3(0.085,0.10,0.15),c2);
float darkSky=max(night,uDark);
vec3 cloudCol=mix(cloudLight,cloudDeep,darkSky);
// billow shading keeps drifting structure visible even at full overcast (no flat sheet)
float billow=0.84+0.34*(f1-0.5)+0.20*(f2-0.5);
cloudCol*=clamp(billow,0.62,1.18);
// Lift night clouds in CLOUDS mode only (scoped by cloudsMode → rain/storm dark clouds
// untouched) so their drift is clearly visible against the dark sky, as in light mode.
cloudCol*=1.0+cloudsMode*uDark*0.6;
cloudCol=mix(cloudCol,cloudCol*vec3(0.66,0.69,0.74),gloom*0.8*(1.0-uDark*0.5));
cloudCol+=vec3(1.0,0.98,1.15)*uFlash*(0.35+cd)*1.1;
col=mix(col,cloudCol,cd*0.92);
if(uRain>0.003){float slant=clamp(0.10+uWind*0.90,0.0,0.62);float wspd=1.0+uWind*1.15;float dens=0.30+0.55*uRain;float r=0.0;r+=rainLayer(uv,t,110.0,0.95*wspd,slant,dens*0.8,2.0)*0.30;r+=rainLayer(uv,t,64.0,1.35*wspd,slant,dens,7.0)*0.45;r+=rainLayer(uv,t,34.0,1.85*wspd,slant,dens,13.0)*0.60;col+=vec3(0.55,0.62,0.74)*r*uRain*(0.5+0.2*dayF+0.35*uDark+uFlash*2.0);col*=1.0-uRain*0.04;}
if(uSnow>0.003){
  float wsway=0.4+uWind*2.2;
  float s=0.0;
  s+=flakes(uv,t,26.0,0.075,wsway,15.0)*0.22;
  s+=flakes(uv,t,17.0,0.105,wsway,7.0)*0.34;
  s+=flakes(uv,t,10.0,0.150,wsway,2.0)*0.50;
  s+=flakes(uv,t,6.0,0.205,wsway,23.0)*0.62;
  col+=vec3(0.96,0.975,1.0)*s*uSnow*(0.85+0.25*uDark);
  col=mix(col,vec3(0.82,0.86,0.92),uSnow*0.05*(1.0-uDark));
}
if(uFog>0.003){
  vec3 fogCol=mix(vec3(0.42,0.47,0.55),vec3(0.80,0.84,0.90),uDay*0.7);
  // Night fog is lit ambient grey (glows with city light), not near-black — dark enough
  // to read as night, light enough that its drifting wisps are actually visible.
  fogCol=mix(fogCol,vec3(0.32,0.36,0.44),uDark);
  float breathe=0.82+0.18*sin(t*0.20+p.x*0.7);
  // Two fog banks drifting at different speeds/directions.
  float d1=fbm(p*2.3+vec2(t*0.060,sin(t*0.12)*0.06));
  float d2=fbm(p*1.5+vec2(-t*0.042,t*0.014)+9.0);
  // Patchy density — clear-ish gaps and dense wisps that drift, so the fog visibly ROLLS
  // instead of sitting as a flat wash of fogCol (the original static-looking bug).
  float n=smoothstep(0.2,0.8,0.6*d1+0.4*d2);
  float fa=uFog*(0.32+0.68*n);
  float band=0.35+0.35*fbm(vec2(p.x*1.1-t*0.06,uv.y*3.0));
  fa=max(fa,uFog*band*smoothstep(0.75,0.15,uv.y));
  fa*=(0.5+0.5*pow(1.0-uv.y,1.4))*breathe;
  // Drifting luminance wisps (centred on 1.0 → average brightness preserved in both
  // light and dark) give the rolling structure real contrast, dark palette included.
  float wisp=clamp(1.0+0.70*(d1-0.5)-0.40*(d2-0.5),0.45,1.6);
  col=mix(col,fogCol*wisp,clamp(fa,0.0,0.94));
}
float hz=pow(1.0-uv.y,4.5)*uHaze;hz*=0.6+0.4*fbm(vec2(p.x*2.4+t*0.02,uv.y*5.0));col=mix(col,uHazeColor,clamp(hz,0.0,1.0)*0.30*(1.0-uDark*0.45));
col+=vec3(0.85,0.9,1.1)*uFlash*0.22;
float vig=smoothstep(1.35,0.4,length(uv-vec2(0.5,0.45)));col*=mix(0.92,1.0,vig);
col+=(hash21(gl_FragCoord.xy+fract(t)*61.7)-0.5)*(1.5/255.0);
gl_FragColor=vec4(col,1.0);}`

function makeSky(canvas: HTMLCanvasElement, init: EffectiveSky): SkyHandle {
  let gl: WebGLRenderingContext | null = null
  try {
    gl =
      (canvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: true,
      }) as WebGLRenderingContext) || (canvas.getContext('experimental-webgl') as WebGLRenderingContext)
  } catch (e) {
    /* noop */
  }
  if (!gl) return { setTarget() {}, destroy() {} }
  const glc = gl
  const mk = (ty: number, s: string) => {
    const sh = glc.createShader(ty)!
    glc.shaderSource(sh, s)
    glc.compileShader(sh)
    if (!glc.getShaderParameter(sh, glc.COMPILE_STATUS)) {
      // Surface shader failures loudly instead of silently rendering nothing.
      console.error('[Aster] shader compile failed:', glc.getShaderInfoLog(sh))
    }
    return sh
  }
  const prog = glc.createProgram()!
  const vsh = mk(glc.VERTEX_SHADER, VS)
  const fsh = mk(glc.FRAGMENT_SHADER, FS)
  glc.attachShader(prog, vsh)
  glc.attachShader(prog, fsh)
  glc.linkProgram(prog)
  glc.useProgram(prog)
  const buf = glc.createBuffer()
  glc.bindBuffer(glc.ARRAY_BUFFER, buf)
  glc.bufferData(glc.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), glc.STATIC_DRAW)
  const ap = glc.getAttribLocation(prog, 'aPos')
  glc.enableVertexAttribArray(ap)
  glc.vertexAttribPointer(ap, 2, glc.FLOAT, false, 0, 0)
  const U = (n: string) => glc.getUniformLocation(prog, n)
  const u = {
    t: U('uTime'), res: U('uRes'), day: U('uDay'), dusk: U('uDusk'), cloud: U('uCloud'),
    rain: U('uRain'), snow: U('uSnow'), fog: U('uFog'), storm: U('uStorm'), wind: U('uWind'),
    flash: U('uFlash'), hc: U('uHazeColor'), haze: U('uHaze'), dk: U('uDark'),
  }
  const cur: Record<string, number> = {
    day: init.day, dusk: init.dusk, cloud: init.cloud, rain: 0, snow: 0, fog: 0, storm: 0,
    wind: init.wind, haze: 0, dark: init.dark || 0,
  }
  const tgt: Record<string, number> = {
    day: init.day, dusk: init.dusk, cloud: init.cloud, rain: init.rain, snow: init.snow,
    fog: init.fog, storm: init.storm, wind: init.wind, haze: init.haze, dark: init.dark || 0,
  }
  let curC = hexToRgb(init.hazeColor)
  let tgtC = hexToRgb(init.hazeColor)
  const isMobile = window.innerWidth < 768
  function size() {
    const w = canvas.clientWidth || (canvas.parentElement && canvas.parentElement.clientWidth) || 600
    const h = canvas.clientHeight || (canvas.parentElement && canvas.parentElement.clientHeight) || 600
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5)
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
    glc.viewport(0, 0, canvas.width, canvas.height)
  }
  size()
  let ro: ResizeObserver | null = null
  try {
    ro = new ResizeObserver(size)
    ro.observe(canvas)
  } catch (e) {
    /* noop */
  }
  window.addEventListener('resize', size)
  let raf = 0
  let last = performance.now()
  let tt = 0
  let fenv = 0
  let nextF = 4 + Math.random() * 5
  let reflashAt = 0
  let reflashPend = false
  const f1 = (l: WebGLUniformLocation | null, v: number) => glc.uniform1f(l, v)
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (document.hidden) {
      last = now
      return
    }
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    tt += dt
    const kf = 1 - Math.exp(-dt * 1.6)
    const ks = 1 - Math.exp(-dt * 0.7)
    // dark tracks the 0.45s CSS theme cross-fade (τ≈0.29s ⇒ ~80% at 0.45s) so the sky
    // never visibly lags the page chrome when the theme flips.
    const kd = 1 - Math.exp(-dt * 3.4)
    for (const k in cur) {
      const kk = k === 'day' || k === 'dusk' ? ks : k === 'dark' ? kd : kf
      cur[k] += (tgt[k] - cur[k]) * kk
    }
    for (let i = 0; i < 3; i++) curC[i] += (tgtC[i] - curC[i]) * kf
    if (tgt.storm > 0.5 && tt > nextF) {
      fenv = 1
      nextF = tt + 4 + Math.random() * 5
      reflashPend = true
      reflashAt = tt + 0.09 + Math.random() * 0.09
    }
    if (reflashPend && tt >= reflashAt) {
      fenv = Math.max(fenv, 0.62 + 0.3 * Math.random())
      reflashPend = false
    }
    fenv *= Math.exp(-dt * 6.5)
    const flash = fenv > 0.01 ? fenv * (0.72 + 0.28 * Math.random()) : 0
    f1(u.t, tt)
    glc.uniform2f(u.res, canvas.width, canvas.height)
    f1(u.day, cur.day)
    f1(u.dusk, cur.dusk)
    f1(u.cloud, cur.cloud)
    f1(u.rain, cur.rain)
    f1(u.snow, cur.snow)
    f1(u.fog, cur.fog)
    f1(u.storm, cur.storm)
    f1(u.wind, cur.wind)
    f1(u.haze, cur.haze)
    f1(u.flash, flash)
    f1(u.dk, cur.dark)
    glc.uniform3f(u.hc, curC[0], curC[1], curC[2])
    glc.drawArrays(glc.TRIANGLES, 0, 3)
  }
  raf = requestAnimationFrame(frame)
  return {
    setTarget(s) {
      ;(['day', 'dusk', 'cloud', 'rain', 'snow', 'fog', 'storm', 'wind', 'haze', 'dark'] as const).forEach((k) => {
        if (s[k] != null) tgt[k] = s[k] as number
      })
      if (s.hazeColor) tgtC = hexToRgb(s.hazeColor)
    },
    destroy() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', size)
      if (ro) ro.disconnect()
      // Free GPU objects — the canvas element outlives this handle when the sky is
      // rebuilt (context restore, StrictMode remount), so GC can't be relied on.
      glc.deleteProgram(prog)
      glc.deleteShader(vsh)
      glc.deleteShader(fsh)
      glc.deleteBuffer(buf)
    },
  }
}

export function AtmosphereCanvas({ sky, style }: { sky: EffectiveSky; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const handle = useRef<SkyHandle | null>(null)
  const skyRef = useRef(sky)
  // create once + survive WebGL context loss (mobile tab discard / GPU reset would
  // otherwise blank the sky permanently). preventDefault on `lost` opts into the
  // `restored` event, where a fresh program is compiled on the recovered context.
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    handle.current = makeSky(canvas, skyRef.current)
    const onLost = (e: Event) => {
      e.preventDefault()
      handle.current?.destroy()
      handle.current = null
    }
    const onRestored = () => {
      handle.current?.destroy()
      handle.current = makeSky(canvas, skyRef.current)
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      handle.current?.destroy()
      handle.current = null
    }
  }, [])
  // push updates on every sky change (kept in a ref so a context rebuild starts current)
  useEffect(() => {
    skyRef.current = sky
    handle.current?.setTarget(sky)
  }, [sky])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', ...style }} />
}
