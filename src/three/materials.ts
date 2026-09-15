import { Color, ShaderMaterial } from 'three'

/**
 * Two materials shared by every project object: round points and hairlines.
 *
 * Both take the theme colour by reference, so a light/dark switch needs no
 * rebuild, and both carry a uOpacity the stage cross-fades when a project
 * scrolls in or out.
 */

const pointVertex = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = aAlpha;
    gl_PointSize = clamp(uSize * uPixelRatio / max(-mv.z, 0.1), 1.0, 8.0);
  }
`

const pointFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    gl_FragColor = vec4(uColor, smoothstep(0.25, 0.05, r2) * vAlpha * uOpacity);
  }
`

const lineVertex = /* glsl */ `
  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lineFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);
  }
`

export function makePointMaterial(color: Color, size = 3.6): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
    },
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    // Normal blending, not additive: additive washes out on the light theme.
    transparent: true,
    depthWrite: false,
  })
}

export function makeLineMaterial(color: Color): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: 0 },
    },
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    transparent: true,
    depthWrite: false,
  })
}
