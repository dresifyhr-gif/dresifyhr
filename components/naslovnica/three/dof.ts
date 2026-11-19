// Dubinska oštrina (depth of field) za 3D trgovinu — kao fotografija otvorenim objektivom.
//
// Zašto ovako (a ne EffectComposer / BokehPass):
//  * Boje dresa moraju ostati identične fotografiji proizvoda (odjeća je neosvijetljena,
//    bez tone-mappinga). Scena se zato crta u 8-bitni MSAA cilj označen kao "izlazni"
//    (isXRRenderTarget + sRGB): three.js tada svakom materijalu primijeni ISTI tone-mapping
//    i sRGB kodiranje kao kad crta izravno na platno → sadržaj cilja = ono što bi bilo na
//    ekranu, bajt za bajt. Završni prolaz piksele u fokusu (CoC < ~0,5 px) prepiše
//    texelFetch-em bez ikakve pretvorbe → dres u fokusu je doslovno isti kao bez DOF-a.
//  * Mutno se računa na POLA rezolucije (1/4 piksela): prefilter (boja → linearno + CoC iz
//    dubine), "gather" bokeh s Vogelovom spiralom (16 uzoraka na mobitelu, 24 na računalu)
//    zarotiranom šumom po pikselu, pa mali tent filtar koji upije zrnatost. Uzorak doprinosi
//    samo ako njegov vlastiti CoC doseže do središta → oštar dres ne "curi" u mutni zid
//    (nema aureole oko siluete). Mutno se zbraja u linearnom prostoru (half-float ako ga
//    uređaj podržava) → svijetla slova natpisa daju meke, okrugle bokeh diskove, ne sivu mrlju.
//  * CoC: fizički dio (|dubina − fokus|, iza jače nego ispred) + mali "bočni" dio u visini
//    šipke (dresovi dalje niz luk su mekši i kad su na sličnoj dubini) — slijedi aktivni dres.
//  * Cijena na iPhoneu: 1 MSAA cilj pune rezolucije (inače bi ga imalo platno), 3 prolaza
//    na ¼ piksela i jedan prolaz pune rezolucije s 3 dohvata. Platno je tada bez antialiasa.
import * as THREE from "three";

const SHARED = /* glsl */ `
  uniform sampler2D tDepth;
  uniform mat4 uProjInv;
  uniform mat4 uCamWorld;
  uniform vec3 uFocusW;     // točka fokusa (svijet)
  uniform float uFocusD;    // dubina fokusa (m, pozitivno)
  uniform vec4 uK;          // x: iza (px/m), y: ispred (px/m), z: bočno (px/m), w: max CoC (px)
  uniform float uDead;      // zona potpune oštrine oko fokusa (m)
  uniform float uLatDead;   // bočna zona potpune oštrine (m od sredine dresa u fokusu)
  uniform vec3 uFwdH;       // vodoravni smjer pogleda (ravnina fokusa je okomita, kao "tilt" objektiv)
  uniform vec2 uWall;       // x: z stražnjeg zida (svijet), y: najveći CoC na zidu (px) — zid s grafitom ostaje čitljiv
  vec3 viewPos(vec2 uv, float d) {
    vec4 p = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    return p.xyz / p.w;
  }
  // CoC u pikselima ciljne rezolucije (uK je već skaliran na nju)
  float cocAt(vec2 uv, float d) {
    if (d >= 1.0) return uK.w;
    vec3 vp = viewPos(uv, d);
    vec3 wp = (uCamWorld * vec4(vp, 1.0)).xyz;
    // udaljenost od OKOMITE ravnine fokusa kroz dres u sredini: cijeli dres koji visi (od
    // ramena do ruba) je oštar iako kamera gleda malo odozgo
    float dz = dot(wp - uFocusW, uFwdH);
    float back = max(dz - uDead, 0.0) * uK.x;
    float front = max(-dz - uDead * 2.0, 0.0) * uK.y;
    // bočno: samo u zoni šipke s dresovima (ne stalci na podu ni pod)
    float zone = smoothstep(0.55, 0.95, wp.y) * (1.0 - smoothstep(2.3, 2.6, wp.y));
    float lat = max(abs(wp.x - uFocusW.x) - uLatDead, 0.0) * uK.z * zone;
    float c = min(back + front + lat, uK.w);
    return mix(c, min(c, uWall.y), 1.0 - smoothstep(uWall.x + 0.05, uWall.x + 0.3, wp.z));
  }
`;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// 1) ½ rezolucije: 4 dohvata boje (box) → linearno, alfa = CoC (u ½-px)
const PREFILTER = /* glsl */ `
  uniform sampler2D tColor;
  uniform vec2 uSrcTexel;
  varying vec2 vUv;
  ${SHARED}
  vec3 lin(vec3 c) {
  #ifdef LINEAR
    return pow(c, vec3(2.2));
  #else
    return c;
  #endif
  }
  void main() {
    // Blok 2×2 piksela pune rezolucije + prsten od 8 susjeda (samo dubina). Piksel koji je
    // oštar ILI dira oštar piksel (antialiasirani rub dresa: boja je pola dres, a dubina
    // zid) ne ulazi u boju mutnog teksela → nema svijetle aureole oko siluete na mutnom zidu.
    vec2 o = uSrcTexel;
    float r[12];
    // 0..3: unutarnji (-,-) (+,-) (-,+) (+,+); 4..11: prsten
    r[0] = cocAt(vUv + o * vec2(-0.5, -0.5), texture2D(tDepth, vUv + o * vec2(-0.5, -0.5)).r);
    r[1] = cocAt(vUv + o * vec2(0.5, -0.5), texture2D(tDepth, vUv + o * vec2(0.5, -0.5)).r);
    r[2] = cocAt(vUv + o * vec2(-0.5, 0.5), texture2D(tDepth, vUv + o * vec2(-0.5, 0.5)).r);
    r[3] = cocAt(vUv + o * vec2(0.5, 0.5), texture2D(tDepth, vUv + o * vec2(0.5, 0.5)).r);
    r[4] = cocAt(vUv + o * vec2(-1.5, -0.5), texture2D(tDepth, vUv + o * vec2(-1.5, -0.5)).r);
    r[5] = cocAt(vUv + o * vec2(-1.5, 0.5), texture2D(tDepth, vUv + o * vec2(-1.5, 0.5)).r);
    r[6] = cocAt(vUv + o * vec2(1.5, -0.5), texture2D(tDepth, vUv + o * vec2(1.5, -0.5)).r);
    r[7] = cocAt(vUv + o * vec2(1.5, 0.5), texture2D(tDepth, vUv + o * vec2(1.5, 0.5)).r);
    r[8] = cocAt(vUv + o * vec2(-0.5, -1.5), texture2D(tDepth, vUv + o * vec2(-0.5, -1.5)).r);
    r[9] = cocAt(vUv + o * vec2(0.5, -1.5), texture2D(tDepth, vUv + o * vec2(0.5, -1.5)).r);
    r[10] = cocAt(vUv + o * vec2(-0.5, 1.5), texture2D(tDepth, vUv + o * vec2(-0.5, 1.5)).r);
    r[11] = cocAt(vUv + o * vec2(0.5, 1.5), texture2D(tDepth, vUv + o * vec2(0.5, 1.5)).r);
    // najmanji CoC u križu oko svakog unutarnjeg piksela
    float d0 = min(min(r[0], r[1]), min(r[2], min(r[4], r[8])));
    float d1 = min(min(r[1], r[0]), min(r[3], min(r[6], r[9])));
    float d2 = min(min(r[2], r[3]), min(r[0], min(r[5], r[10])));
    float d3 = min(min(r[3], r[2]), min(r[1], min(r[7], r[11])));
    vec4 w = smoothstep(vec4(0.6), vec4(1.6), vec4(d0, d1, d2, d3)) + 1e-4;
    vec3 acc = lin(texture2D(tColor, vUv + o * vec2(-0.5, -0.5)).rgb) * w.x
             + lin(texture2D(tColor, vUv + o * vec2(0.5, -0.5)).rgb) * w.y
             + lin(texture2D(tColor, vUv + o * vec2(-0.5, 0.5)).rgb) * w.z
             + lin(texture2D(tColor, vUv + o * vec2(0.5, 0.5)).rgb) * w.w;
    float cmax = max(max(d0, d1), max(d2, d3));
    gl_FragColor = vec4(acc / dot(w, vec4(1.0)), cmax);
  }
`;

// 2) bokeh gather (Vogelova spirala, polumjer = CoC središta)
const GATHER = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec4 c0 = texture2D(tSrc, vUv);
    float R = c0.a;
    if (R < 0.5) { gl_FragColor = c0; return; }
    float rot = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853;
    vec3 acc = c0.rgb;
    float wsum = 1.0;
    for (int i = 0; i < TAPS; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / float(TAPS)) * R;
      float a = fi * 2.39996323 + rot;
      vec4 s = texture2D(tSrc, vUv + vec2(cos(a), sin(a)) * r * uTexel);
      // uzorak doprinosi samo ako njegov krug zamućenja doseže do ovog piksela
      float w = clamp((min(s.a, R) - r + 1.25) / 1.25, 0.0, 1.0);
      acc += s.rgb * w;
      wsum += w;
    }
    gl_FragColor = vec4(acc / wsum, R);
  }
`;

// 3) tent (4 bilinearna dohvata) — upije zrnatost rotiranog uzorka
const TENT = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec4 c0 = texture2D(tSrc, vUv);
    if (c0.a < 1.0) { gl_FragColor = c0; return; }
    // 3×3 tent, samo susjedi sličnog CoC-a (oštri ne ulaze u mutno)
    vec3 acc = c0.rgb * 4.0;
    float ws = 4.0;
    const vec2 OFF[8] = vec2[8](vec2(-1.0, -1.0), vec2(0.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 0.0), vec2(1.0, 0.0), vec2(-1.0, 1.0), vec2(0.0, 1.0), vec2(1.0, 1.0));
    for (int i = 0; i < 8; i++) {
      vec2 d = OFF[i];
      vec4 s = texture2D(tSrc, vUv + d * uTexel);
      float k = (d.x == 0.0 || d.y == 0.0) ? 2.0 : 1.0;
      float w = k * clamp(1.0 - abs(s.a - c0.a) / max(1.0, c0.a * 0.5), 0.0, 1.0);
      acc += s.rgb * w;
      ws += w;
    }
    gl_FragColor = vec4(acc / ws, c0.a);
  }
`;

// 4) puna rezolucija → platno. U fokusu: točno izvorni piksel (bez pretvorbe boje).
const COMPOSITE = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tBlur;
  varying vec2 vUv;
  ${SHARED}
  vec3 enc(vec3 c) {
  #ifdef LINEAR
    return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  #else
    return c;
  #endif
  }
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec4 sharp = texelFetch(tColor, p, 0);
    // dubina iz MSAA-a je jedan uzorak, a boja ruba je prosjek → najmanji CoC u križu 3×3
    // čuva antialiasirani rub oštrog dresa (inače bi rub postao stepeničast)
    ivec2 mx = textureSize(tDepth, 0) - 1;
    float d = texelFetch(tDepth, p, 0).r;
    float coc = cocAt(vUv, d);
    if (coc >= 0.75) {
      vec2 px = 1.0 / vec2(mx + 1);
      coc = min(coc, cocAt(vUv + vec2(px.x, 0.0), texelFetch(tDepth, min(p + ivec2(1, 0), mx), 0).r));
      coc = min(coc, cocAt(vUv - vec2(px.x, 0.0), texelFetch(tDepth, max(p - ivec2(1, 0), ivec2(0)), 0).r));
      coc = min(coc, cocAt(vUv + vec2(0.0, px.y), texelFetch(tDepth, min(p + ivec2(0, 1), mx), 0).r));
      coc = min(coc, cocAt(vUv - vec2(0.0, px.y), texelFetch(tDepth, max(p - ivec2(0, 1), ivec2(0)), 0).r));
    }
  #ifdef DEBUG
    gl_FragColor = vec4(vec3(coc / uK.w), 1.0); return;
  #endif
    if (coc < 0.75) { gl_FragColor = sharp; return; }
    // ručni bilinearni dohvat ½-rez. mutnog, težine prema sličnosti CoC-a (dres u fokusu
    // ne curi u mutni zid ni obrnuto)
    vec2 hs = vec2(textureSize(tBlur, 0));
    vec2 f = vUv * hs - 0.5;
    ivec2 b0 = ivec2(floor(f));
    vec2 t = f - floor(f);
    ivec2 hm = ivec2(hs) - 1;
    vec3 bsum = vec3(0.0);
    float bw = 0.0;
    for (int i = 0; i < 4; i++) {
      ivec2 o2 = ivec2(i & 1, i >> 1);
      vec4 s = texelFetch(tBlur, clamp(b0 + o2, ivec2(0), hm), 0);
      float wb = (o2.x == 1 ? t.x : 1.0 - t.x) * (o2.y == 1 ? t.y : 1.0 - t.y);
      float dc = abs(s.a * 2.0 - coc);
      float sim = 1e-4 + clamp(1.0 - dc / max(1.5, coc * 0.35), 0.0, 1.0);
      bsum += s.rgb * wb * sim;
      bw += wb * sim;
    }
    vec3 blur = enc(bsum / max(bw, 1e-5));
    gl_FragColor = vec4(mix(sharp.rgb, blur, smoothstep(0.75, 2.75, coc)), 1.0);
  }
`;

export type DofOptions = { mobile: boolean; debug?: boolean };

export class DepthOfField {
  private renderer: THREE.WebGLRenderer;
  readonly target: THREE.WebGLRenderTarget;
  private half: THREE.WebGLRenderTarget;
  private half2: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private pre: THREE.ShaderMaterial;
  private gather: THREE.ShaderMaterial;
  private tent: THREE.ShaderMaterial;
  private comp: THREE.ShaderMaterial;
  private shared: Record<string, THREE.IUniform>;
  private focus = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private Hdev = 1;
  /** jačine (udio visine kadra po metru) — podesivo */
  k = { back: 0.008, front: 0.0045, lat: 0.005, max: 0.0095, dead: 0.06, latDead: 0.42 };
  /** stražnji zid: z (svijet) i najveći CoC (udio visine); wall < 0 → bez posebnog ograničenja */
  wall = { z: -1e4, max: -1 };

  constructor(renderer: THREE.WebGLRenderer, opt: DofOptions) {
    this.renderer = renderer;
    const ext = renderer.extensions;
    const hf = ext.has("EXT_color_buffer_half_float") || ext.has("EXT_color_buffer_float");
    const depthTexture = new THREE.DepthTexture(2, 2, THREE.UnsignedInt248Type);
    depthTexture.format = THREE.DepthStencilFormat;
    const rt = new THREE.WebGLRenderTarget(2, 2, {
      samples: 4,
      depthBuffer: true,
      stencilBuffer: true,
      depthTexture,
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
    });
    rt.resolveStencilBuffer = false;
    // "izlazni" cilj: isti tone-mapping i sRGB kodiranje kao platno (vidi gore)
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    // obična RGBA8 pohrana (bez hardverskog sRGB dekodiranja) — i za MSAA međuspremnik i
    // za teksturu (inače bi tekstura bila SRGB8_ALPHA8 i razrješenje MSAA-a ne bi uspjelo)
    rt.texture.internalFormat = "RGBA8";
    (rt as unknown as { isXRRenderTarget: boolean }).isXRRenderTarget = true;
    this.target = rt;
    const halfOpts = {
      depthBuffer: false,
      stencilBuffer: false,
      type: hf ? THREE.HalfFloatType : THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
    };
    this.half = new THREE.WebGLRenderTarget(2, 2, halfOpts);
    this.half2 = new THREE.WebGLRenderTarget(2, 2, halfOpts);

    this.shared = {
      tDepth: { value: depthTexture },
      uProjInv: { value: new THREE.Matrix4() },
      uCamWorld: { value: new THREE.Matrix4() },
      uFocusW: { value: new THREE.Vector3() },
      uFocusD: { value: 5 },
      uK: { value: new THREE.Vector4() },
      uDead: { value: this.k.dead },
      uLatDead: { value: this.k.latDead },
      uFwdH: { value: new THREE.Vector3(0, 0, -1) },
      uWall: { value: new THREE.Vector2(-1e4, 1e4) },
    };
    const defines: Record<string, string> = hf ? { LINEAR: "" } : {};
    const mk = (frag: string, uniforms: Record<string, THREE.IUniform>, extra: Record<string, string> = {}) =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: frag,
        uniforms,
        defines: { ...defines, ...extra },
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
    this.pre = mk(PREFILTER, { ...this.shared, uK: { value: new THREE.Vector4() }, uWall: { value: new THREE.Vector2(-1e4, 1e4) }, tColor: { value: rt.texture }, uSrcTexel: { value: new THREE.Vector2() } });
    this.gather = mk(GATHER, { tSrc: { value: this.half.texture }, uTexel: { value: new THREE.Vector2() } }, { TAPS: String(opt.mobile ? 16 : 24) });
    this.tent = mk(TENT, { tSrc: { value: this.half2.texture }, uTexel: { value: new THREE.Vector2() } });
    this.comp = mk(COMPOSITE, { ...this.shared, tColor: { value: rt.texture }, tBlur: { value: this.half.texture } }, opt.debug ? { DEBUG: "" } : {});
    this.quad = new THREE.Mesh(new THREE.BufferGeometry(), this.comp);
    // jedan trokut preko cijelog ekrana
    this.quad.geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad.geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad.frustumCulled = false;
  }

  setSize(wDev: number, hDev: number) {
    const w = Math.max(2, Math.round(wDev));
    const h = Math.max(2, Math.round(hDev));
    this.Hdev = h;
    this.target.setSize(w, h);
    const hw = Math.max(2, Math.round(w / 2));
    const hh = Math.max(2, Math.round(h / 2));
    this.half.setSize(hw, hh);
    this.half2.setSize(hw, hh);
    (this.pre.uniforms.uSrcTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    (this.gather.uniforms.uTexel.value as THREE.Vector2).set(1 / hw, 1 / hh);
    (this.tent.uniforms.uTexel.value as THREE.Vector2).set(1 / hw, 1 / hh);
  }

  /** Točka fokusa (svijet). */
  setFocus(p: THREE.Vector3) {
    this.focus.copy(p);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    camera.updateMatrixWorld();
    // uniforme
    const s = this.shared;
    (s.uProjInv.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (s.uCamWorld.value as THREE.Matrix4).copy(camera.matrixWorld);
    (s.uFocusW.value as THREE.Vector3).copy(this.focus);
    s.uFocusD.value = -this.tmp.copy(this.focus).applyMatrix4(camera.matrixWorldInverse).z;
    camera.getWorldDirection(this.tmp);
    this.tmp.y = 0;
    (s.uFwdH.value as THREE.Vector3).copy(this.tmp.lengthSq() > 1e-6 ? this.tmp.normalize() : this.tmp.set(0, 0, -1));
    s.uDead.value = this.k.dead;
    s.uLatDead.value = this.k.latDead;
    const H = this.Hdev;
    const k = this.k;
    const wm = this.wall.max < 0 ? 1e4 : this.wall.max * H;
    (s.uWall.value as THREE.Vector2).set(this.wall.z, wm);
    (this.pre.uniforms.uWall.value as THREE.Vector2).set(this.wall.z, wm * 0.5);
    (s.uK.value as THREE.Vector4).set(k.back * H, k.front * H, k.lat * H, k.max * H);
    (this.pre.uniforms.uK.value as THREE.Vector4).set(k.back * H * 0.5, k.front * H * 0.5, k.lat * H * 0.5, k.max * H * 0.5);

    r.setRenderTarget(this.target);
    r.render(scene, camera);
    this.pass(this.pre, this.half);
    this.pass(this.gather, this.half2);
    this.pass(this.tent, this.half);
    this.pass(this.comp, prev);
  }

  private pass(mat: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget | null) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(to);
    this.renderer.render(this.quad, this.cam);
  }

  dispose() {
    this.target.depthTexture?.dispose();
    this.target.dispose();
    this.half.dispose();
    this.half2.dispose();
    this.quad.geometry.dispose();
    for (const m of [this.pre, this.gather, this.tent, this.comp]) m.dispose();
  }
}
