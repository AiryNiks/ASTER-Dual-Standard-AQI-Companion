// Live atmosphere — a WebGL fragment shader ported 1:1 from makeSky() in Aster.dc.html.
// This is the "Realistic Celestial Canvas" (Phase 2) + volumetric weather (clouds/fog/rain/snow/
// storm) in one loop. The shader inherently satisfies the conditional-celestial requirement:
//   • the sun (warm plasma core + corona) is gated on daylight and fades out with cloud/gloom;
//   • the moon (cool silver disc + halo) only appears at night and fades with cloud/fog;
//   • clouds drift via animated fbm, fog "breathes", rain/snow fall, storms flash — all inside rAF.
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
float stars(vec2 p,float t){vec2 g=p*130.0;vec2 id=floor(g);vec2 f=fract(g)-0.5;float h=hash21(id);vec2 off=(vec2(hash21(id+7.0),hash21(id+13.0))-0.5)*0.6;float s=smoothstep(0.06,0.0,length(f-off));s*=step(0.93,h);s*=0.55+0.45*sin(t*(0.8+h*2.5)+h*40.0);return s;}
void main(){vec2 uv=vUv;vec2 asp=vec2(uRes.x/max(uRes.y,1.0),1.0);vec2 p=uv*asp;float t=uTime;
float night=1.0-uDay;
float gloom=clamp(max(uRain*0.75,uStorm*0.9)+uFog*0.3,0.0,1.0);
float clearF=(1.0-smoothstep(0.18,0.55,uCloud))*(1.0-uFog)*(1.0-clamp(uRain*1.4,0.0,1.0))*(1.0-clamp(uSnow*1.2,0.0,1.0))*(1.0-uStorm);
vec3 dayTop=vec3(0.40,0.62,0.90);vec3 dayBot=vec3(0.82,0.90,0.98);vec3 nightTop=vec3(0.24,0.33,0.52);vec3 nightBot=vec3(0.48,0.58,0.74);
vec3 top=mix(nightTop,dayTop,uDay);vec3 bot=mix(nightBot,dayBot,uDay);
top=mix(top,vec3(0.64,0.71,0.80),gloom);bot=mix(bot,vec3(0.78,0.84,0.90),gloom);
float g=pow(1.0-uv.y,1.35);vec3 col=mix(top,bot,g);
col+=vec3(0.95,0.55,0.35)*uDusk*pow(1.0-uv.y,3.0)*0.5*(1.0-gloom*0.85);
vec3 mineral=col*vec3(0.16,0.18,0.235)+vec3(0.022,0.030,0.050);col=mix(col,mineral,uDark);
float starVis=max(night,uDark)*clearF;
col+=vec3(0.75,0.82,1.0)*stars(p,t)*starVis*0.9;
// Celestial geometry is normalized to canvas WIDTH (um) so bodies stay sane on tall shells.
float um=min(asp.x,1.0);
float sunGate=uDay*(1.0-uDark)*clearF;
if(sunGate>0.004){
  vec2 sunPos=vec2(0.60,0.925)*asp;float sd2=distance(p,sunPos)/um;
  float limb=1.0-smoothstep(0.0,0.075,sd2);
  // dense golden body: #FFFDE7 core -> #FBC02D rim, granulated
  vec3 sunSurf=mix(vec3(0.984,0.753,0.176),vec3(1.0,0.992,0.906),limb*limb);
  float gran=0.92+0.08*fbm(p*46.0+vec2(t*0.05,-t*0.03));
  sunSurf*=gran;
  float coreMask=smoothstep(0.075,0.058,sd2);
  col=mix(col,sunSurf,coreMask*sunGate);
  // soft warm plasma corona: rgba(255,152,0)
  float corona=exp(-sd2*sd2*16.0)*0.45+exp(-sd2*sd2*48.0)*0.5;
  float flare=pow(max(0.0,1.0-sd2*0.9),3.0)*0.10*(0.8+0.2*sin(t*0.8));
  float shim=1.0+0.045*sin(t*1.6)+0.03*sin(t*0.7+1.7);
  col+=(vec3(1.0,0.596,0.0)*corona*(1.0-coreMask)+vec3(1.0,0.85,0.6)*flare)*sunGate*shim;
}
float moonGate=max(night,uDark)*clearF;
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
float drift=0.55+uWind*1.3;float th=mix(0.80,0.26,uCloud);
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
cloudCol=mix(cloudCol,cloudCol*vec3(0.66,0.69,0.74),gloom*0.8*(1.0-uDark*0.5));
cloudCol+=vec3(1.0,0.98,1.15)*uFlash*(0.35+cd)*1.1;
col=mix(col,cloudCol,cd*0.92);
if(uRain>0.003){float slant=clamp(0.10+uWind*0.90,0.0,0.62);float wspd=1.0+uWind*1.15;float dens=0.30+0.55*uRain;float r=0.0;r+=rainLayer(uv,t,110.0,0.95*wspd,slant,dens*0.8,2.0)*0.30;r+=rainLayer(uv,t,64.0,1.35*wspd,slant,dens,7.0)*0.45;r+=rainLayer(uv,t,34.0,1.85*wspd,slant,dens,13.0)*0.60;col+=vec3(0.55,0.62,0.74)*r*uRain*(0.5+0.2*uDay+0.35*uDark+uFlash*2.0);col*=1.0-uRain*0.04;}
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
  fogCol=mix(fogCol,vec3(0.13,0.155,0.21),uDark);
  float breathe=0.82+0.18*sin(t*0.22+p.x*0.7);
  float fa=uFog*(0.5+0.5*fbm(p*2.2+vec2(t*0.018,sin(t*0.1)*0.05)));
  float band=0.35+0.35*fbm(vec2(p.x*1.1-t*0.025,uv.y*3.0));
  fa=max(fa,uFog*band*smoothstep(0.75,0.15,uv.y));
  fa*=(0.45+0.55*pow(1.0-uv.y,1.4))*breathe;
  col=mix(col,fogCol,clamp(fa,0.0,0.92));
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
  glc.attachShader(prog, mk(glc.VERTEX_SHADER, VS))
  glc.attachShader(prog, mk(glc.FRAGMENT_SHADER, FS))
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
    for (const k in cur) {
      const kk = k === 'day' || k === 'dusk' ? ks : kf
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
    },
  }
}

export function AtmosphereCanvas({ sky, style }: { sky: EffectiveSky; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const handle = useRef<SkyHandle | null>(null)
  // create once
  useEffect(() => {
    if (!ref.current) return
    handle.current = makeSky(ref.current, sky)
    return () => {
      handle.current?.destroy()
      handle.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // push updates on every sky change
  useEffect(() => {
    handle.current?.setTarget(sky)
  }, [sky])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', ...style }} />
}
