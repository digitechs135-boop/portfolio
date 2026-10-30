import * as THREE from 'three'
import trailFragment from './shaders/trail/fragment.glsl'
import trailVertex from './shaders/trail/vertex.glsl'

const canvas = document.getElementById('heroLiquidCanvas')

if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const sizes = { width: Math.max(window.innerWidth, 1), height: Math.max(window.innerHeight, 1) }
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1)
  camera.position.set(4, 4, 4)
  camera.lookAt(new THREE.Vector3(0, 2.5, 0))

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: window.devicePixelRatio < 2,
  })

  const bgGeometry = new THREE.BufferGeometry()
  bgGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
  )
  bgGeometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2)
  )

  const bgMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTrailMap;
      varying vec2 vUv;
      void main() {
        vec3 color = texture2D(uTrailMap, vUv).rgb;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    uniforms: { uTrailMap: new THREE.Uniform() },
    depthWrite: false,
  })
  const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial)
  bgMesh.renderOrder = -1
  scene.add(bgMesh)

  function createRenderTarget() {
    return new THREE.WebGLRenderTarget(sizes.width * 0.25, sizes.height * 0.25, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    })
  }

  let rt1 = createRenderTarget()
  let rt2 = createRenderTarget()
  let outputRT = rt2

  const trailMaterial = new THREE.ShaderMaterial({
    vertexShader: trailVertex,
    fragmentShader: trailFragment,
    uniforms: {
      uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * 0.25, sizes.height * 0.25)),
      uMap: new THREE.Uniform(),
      uPointer: new THREE.Uniform(new THREE.Vector2(0, 0)),
      uDt: new THREE.Uniform(0.0),
      uSpeed: new THREE.Uniform(0),
      uTime: new THREE.Uniform(0),
    },
  })
  const trailMesh = new THREE.Mesh(bgGeometry, trailMaterial)
  const sceneTrail = new THREE.Scene()
  sceneTrail.add(trailMesh)
  const pointer = new THREE.Vector2()
  let time = 0
  const clock = new THREE.Clock()

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return
    pointer.x = (event.clientX / sizes.width) * 2 - 1
    pointer.y = -(event.clientY / sizes.height) * 2 + 1
  }, { passive: true })

  function handleResize() {
    sizes.width = Math.max(window.innerWidth, 1)
    sizes.height = Math.max(window.innerHeight, 1)
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    trailMaterial.uniforms.uResolution.value.set(sizes.width * 0.25, sizes.height * 0.25)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(sizes.width, sizes.height)
    rt1.setSize(sizes.width * 0.25, sizes.height * 0.25)
    rt2.setSize(sizes.width * 0.25, sizes.height * 0.25)
  }

  function tic() {
    const dt = clock.getDelta()
    time += dt
    trailMaterial.uniforms.uTime.value = time
    const previousPointer = trailMaterial.uniforms.uPointer.value
    trailMaterial.uniforms.uSpeed.value = THREE.MathUtils.lerp(
      trailMaterial.uniforms.uSpeed.value,
      Math.sqrt((pointer.x - previousPointer.x) ** 2 + (pointer.y - previousPointer.y) ** 2),
      dt * 3
    )
    trailMaterial.uniforms.uPointer.value.lerp(pointer, dt * 15)
    trailMaterial.uniforms.uDt.value = dt

    renderer.setRenderTarget(outputRT)
    renderer.render(sceneTrail, camera)
    renderer.setRenderTarget(null)
    bgMaterial.uniforms.uTrailMap.value = outputRT.texture
    trailMaterial.uniforms.uMap.value = outputRT.texture
    renderer.render(scene, camera)

    outputRT = outputRT === rt1 ? rt2 : rt1
    requestAnimationFrame(tic)
  }

  handleResize()
  window.addEventListener('resize', handleResize, { passive: true })
  requestAnimationFrame(tic)
}
