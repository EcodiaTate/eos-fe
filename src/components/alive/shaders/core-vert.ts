// EcodiaOS — Alive Core Vertex Shader
// Organic noise displacement + turbulence + rhythmic pulse

const coreVert = /* glsl */ `
uniform float uTime;
uniform float uTurbulence;   // 0-1 from coherence_stress
uniform float uScale;        // 0.7-1.2 from confidence
uniform float uPulseRate;    // multiplier from arousal
uniform float uBroadcastFlash; // 0-1 decaying flash on broadcast

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;
varying float vFresnel;

// Include simplex noise
// NOISE_PLACEHOLDER (replaced at build time by concatenation)

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Base position scaled by confidence
  vec3 pos = position * uScale;

  // ── Primary organic noise ──
  float noiseSpeed = 0.3 * uPulseRate;
  float n = snoise3(pos * 1.5 + uTime * noiseSpeed);

  // ── Turbulence: higher-frequency detail when stressed ──
  float turbNoise = snoise3(pos * 3.5 + uTime * 0.6) * uTurbulence;
  float turbNoise2 = snoise3(pos * 6.0 + uTime * 0.9) * uTurbulence * 0.4;

  // ── Rhythmic pulse synchronized to cognitive cycle ──
  float pulse = sin(uTime * uPulseRate * 6.28318) * 0.025;
  // Flash brightens the pulse on workspace broadcasts
  pulse += uBroadcastFlash * 0.05 * sin(uTime * 12.0);

  // ── Combined displacement ──
  float displacement = n * 0.1 * (1.0 + uTurbulence * 0.5)
                      + turbNoise * 0.06
                      + turbNoise2 * 0.03
                      + pulse;

  vDisplacement = displacement;

  pos += normal * displacement;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  // Fresnel for rim glow
  vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vFresnel = pow(1.0 - max(dot(worldNormal, viewDir), 0.0), 3.0);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export default coreVert;
