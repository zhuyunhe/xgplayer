/**
 * @author fuyuhao
 */
import * as THREE from 'three'
let instance = null
const getDefaultOpts = () => ({
  fov: 75,
  radius: 500,
  width: 600,
  height: 337.5,
  heightSegments: 32,
  widthSegments: 32,
  dpr: window.devicePixelRatio || 2
})
const getDefaultVideoOpts = () => ({
  cameraRadius: 0,
  verAngle: 0,
  horAngle: 0
})
class Panoramic {
  constructor (options) {
    if (instance !== null) {
      return instance
    }
    this._options = Object.assign(getDefaultOpts(), options)
    this._GL = {
      camera: null,
      mesh: null,
      texture: null,
      material: null,
      renderer: null,
      geometry: null,
      scene: null
    }
    this._VIDEO = getDefaultVideoOpts()
    this._RAF = null
    instance = this
    this.isInited = false
  }
  init (videoEl) {
    const {
      width,
      height,
      fov,
      devicePixelRatio,
      radius,
      heightSegments,
      widthSegments
    } = this._options
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000)
    camera.target = new THREE.Vector3(0, 0, 0)
    const scene = new THREE.Scene()
    // scene.add(axes)
    const texture = new THREE.VideoTexture(videoEl)
    const geometry = new THREE.SphereBufferGeometry(radius, widthSegments, heightSegments)
    geometry.scale(-1, 1, 1)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.format = THREE.RGBFormat
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    const renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(devicePixelRatio)
    renderer.setSize(width, height)
    // camera.target = scene.position
    this._GL = {
      camera,
      scene,
      texture,
      geometry,
      material,
      mesh,
      renderer
    }
    this.isInited = true
    return renderer.domElement
  }
  start () {
    if (this.isInited) {
      this._doAnimate()
    }
  }
  stop () {
    window.cancelAnimationFrame(this._RAF)
  }
  static _degToRad (deg) {
    console.log(deg, THREE.Math.degToRad(deg))
    return THREE.Math.degToRad(deg)
  }
  _doAnimate () {
    this._RAF = window.requestAnimationFrame(this._doAnimate.bind(this))
    const { renderer, scene, camera } = this._GL
    const { radius } = this._options
    const { verAngle, horAngle } = this._VIDEO

    const yPos = radius * Math.sin(Panoramic._degToRad(horAngle))
    const xzRadius = Math.abs(yPos * (1 / Math.tan(Panoramic._degToRad(horAngle))))
    const xPos = xzRadius * Math.cos(Panoramic._degToRad(verAngle))
    const zPos = xzRadius * Math.sin(Panoramic._degToRad(verAngle))
    camera.target = new THREE.Vector3(xPos, yPos, zPos)
    console.log(xPos, yPos, zPos)
    camera.position.x = 0
    camera.position.y = 0
    camera.position.z = 0
    camera.lookAt(camera.target)
    renderer.render(scene, camera)
  }
}

export default Panoramic
