// EcodiaOS — Alive Aura Fragment Shader
// Atmospheric field surrounding the organism

const auraFrag = /* glsl */ `
uniform float uTime;
uniform float uHue;         // 0-360 from valence
uniform float uTurbulence;  // 0-1 from coherence_stress
uniform float uOpacity;     // 0-1 from mode preset
uniform float uSaturation;  // 0-1 from mode preset

varying vec3 vNormal;
varying vec3 vWorldPosition;

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
  // View-dependent fresnel for atmospheric glow
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0);

  // Base aura color from hue
  vec3 color = hsl2rgb(uHue / 360.0, 0.4 * uSaturation, 0.35);

  // Animated noise for turbulence
  float noise = sin(vWorldPosition.x * 4.0 + uTime * 0.5)
              * sin(vWorldPosition.y * 4.0 + uTime * 0.4)
              * sin(vWorldPosition.z * 4.0 + uTime * 0.6);
  float turbulenceEffect = noise * uTurbulence * 0.3;

  // Combine
  float alpha = fresnel * uOpacity * (0.3 + turbulenceEffect);
  alpha = clamp(alpha, 0.0, 0.6);

  gl_FragColor = vec4(color * (0.5 + fresnel * 0.5), alpha);
}
`;

export default auraFrag;
