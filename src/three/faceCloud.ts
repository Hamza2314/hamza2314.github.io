import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  MathUtils,
} from 'three'
import type { PointCloud } from './sampleFace'
import type { FrameContext, SceneItem } from './types'

/**
 * Scroll choreography, as four keyframes on normalised page progress:
 *
 *   0.0  scattered, drifting, turned ~65 deg off-axis. Unreadable.
 *   0.3  converging, rotating toward front. Becomes recognisable.
 *   0.6  settled, turned slightly away, dimmed so the writing leads.
 *   1.0  facing the viewer, fully resolved, still.
 *
 * Rotation is lerped on the Object3D in JS; scatter and alpha are uniforms.
 * One draw call, one material, no per-point timeline.
 */

const KEY_TURN = [1.13, 0.52, -0.18, 0.0] // radians, y-axis
const KEY_STOPS = [0.0, 0.3, 0.6, 1.0]
const KEY_DIM = [0.55, 0.9, 0.62, 1.0]

/** Piecewise-linear read across the keyframe table above. */
function keyed(values: number[], t: number): number {
  if (t <= KEY_STOPS[0]) return values[0]
  if (t >= KEY_STOPS[KEY_STOPS.length - 1]) return values[values.length - 1]

  for (let i = 0; i < KEY_STOPS.length - 1; i++) {
    const a = KEY_STOPS[i]
    const b = KEY_STOPS[i + 1]
    if (t >= a && t <= b) {
      return MathUtils.lerp(values[i], values[i + 1], (t - a) / (b - a))
    }
  }
  return values[values.length - 1]
}

const vertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute float aWeight;
  attribute vec3 aScatter;

  varying float vWeight;
  varying float vNear;

  void main() {
    // Scatter collapses as the page scrolls. The exponent holds the cloud
    // apart early and resolves it late, so the face arrives decisively.
    float s = pow(1.0 - uProgress, 2.2);

    // Drift is scaled by s, so the resolved face is perfectly still.
    vec3 drift = aScatter * sin(uTime * 0.35 + aScatter.x * 6.2831) * 0.07 * s;
    vec3 pos = position + aScatter * s * 0.5 + drift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = max(-mv.z, 0.1);
    vNear = clamp(1.0 - (dist - 2.0) / 2.4, 0.0, 1.0);
    vWeight = aWeight;

    // Perspective-correct, clamped so points never balloon near the camera.
    gl_PointSize = clamp(uSize * uPixelRatio / dist, 1.0, 9.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uProgress;
  uniform float uDim;

  varying float vWeight;
  varying float vNear;

  void main() {
    // Round sprite with a soft edge. Square points read as noise at this size.
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;

    float edge = smoothstep(0.25, 0.05, r2);
    float alpha = edge * vWeight * mix(0.45, 1.0, vNear) * (0.3 + uProgress * 0.7) * uDim;

    gl_FragColor = vec4(uColor, alpha);
  }
`

export function createFaceCloud(cloud: PointCloud, color: Color): SceneItem {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(cloud.positions, 3))
  geometry.setAttribute('aWeight', new BufferAttribute(cloud.weights, 1))
  geometry.setAttribute('aScatter', new BufferAttribute(cloud.scatter, 3))

  const material = new ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 4.4 },
      uPixelRatio: { value: 1 },
      uDim: { value: 1 },
      uColor: { value: color },
    },
    vertexShader,
    fragmentShader,
    // Normal blending, not additive: additive blows out to white on the light
    // theme. This has to read on both grounds.
    transparent: true,
    depthWrite: false,
  })

  const points = new Points(geometry, material)
  points.scale.setScalar(1.28)

  // Damped mouse parallax, tracked here rather than read raw each frame.
  let mx = 0
  let my = 0

  return {
    object: points,

    update(ctx: FrameContext) {
      const u = material.uniforms
      u.uProgress.value = ctx.progress
      u.uTime.value = ctx.time
      u.uPixelRatio.value = ctx.pixelRatio

      // Give way while a project object holds the frame. Both sit at the
      // origin, so the face has to recede rather than compete.
      u.uDim.value = keyed(KEY_DIM, ctx.progress) * (1 - 0.88 * ctx.projectPresence)
      points.position.z = -0.9 * ctx.projectPresence

      const turn = keyed(KEY_TURN, ctx.progress)

      if (ctx.reduced) {
        // One static frame: resolved, facing front, no parallax.
        points.rotation.set(0, 0, 0)
        return
      }

      // Damp toward the pointer rather than tracking it 1:1, and keep the
      // whole excursion inside about +/- 0.2 rad.
      mx += (ctx.mouseX - mx) * 0.055
      my += (ctx.mouseY - my) * 0.055

      points.rotation.y = turn + mx * 0.2
      points.rotation.x = my * 0.12
    },

    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
