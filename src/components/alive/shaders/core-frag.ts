// EcodiaOS — Alive Core Fragment Shader
// Affect-driven color: hue from valence, warmth from care, fresnel rim glow

const coreFrag = /* glsl */ `
uniform float uHue;          // 0-360 degrees from valence
uniform float uWarmth;       // 0-1 from care_activation
uniform float uTurbulence;   // 0-1 from coherence_stress
uniform float uSaturation;   // 0-1 from mode preset
uniform float uTime;
uniform float uBroadcastFlash;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;
varying float vFresnel;

// ── HSL to RGB ───────────────────────────────────────────────────

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c / 2.0;

  vec3 rgb;
  float hue = h * 6.0;
  if (hue < 1.0) rgb = vec3(c, x, 0.0);
  else if (hue < 2.0) rgb = vec3(x, c, 0.0);
  else if (hue < 3.0) rgb = vec3(0.0, c, x);
  else if (hue < 4.0) rgb = vec3(0.0, x, c);
  else if (hue < 5.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);

  return rgb + m;
}

void main() {
  // ── Base color from hue (valence → color) ──
  float h = uHue / 360.0;
  float s = 0.65 * uSaturation;
  float l = 0.45;
  vec3 baseColor = hsl2rgb(h, s, l);

  // ── Warmth overlay: blend toward warm amber when care is high ──
  vec3 warmColor = vec3(1.0, 0.72, 0.32);
  baseColor = mix(baseColor, warmColor, uWarmth * 0.45);

  // ── Emission: brighter at noise peaks, plus fresnel rim ──
  float emitStrength = 0.35 + vDisplacement * 2.5;
  emitStrength += vFresnel * 0.7;

  // ── Broadcast flash: momentary brightening ──
  emitStrength += uBroadcastFlash * 0.6;

  // ── Stress patterns: high-frequency visual noise when coherence_stress high ──
  float stressPattern = sin(vWorldPosition.x * 18.0 + uTime * 3.0)
                      * sin(vWorldPosition.y * 18.0 + uTime * 2.7)
                      * sin(vWorldPosition.z * 18.0 + uTime * 3.3);
  vec3 stressColor = vec3(0.12, 0.06, 0.18) * stressPattern * uTurbulence;

  // ── Compose final color ──
  vec3 color = baseColor * emitStrength + stressColor;

  // HDR: let bloom handle the overshoot
  gl_FragColor = vec4(color, 1.0);
}
`;

export default coreFrag;
