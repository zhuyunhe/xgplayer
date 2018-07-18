/**
 * @author fuyuhao
 */
import {
  PerspectiveCamera,
  VideoTexture,
  Vector3,
  LinearFilter,
  SphereBufferGeometry,
  RGBFormat,
  Scene,
  MeshBasicMaterial,
  WebGLRenderer,
  Mesh,
  DoubleSide,
  Math as THREEMath
} from 'three'

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
  scale: 0,
  verAngle: 0,
  horAngle: 0
})

class Panoramic {
  constructor (options, player) {
    this.player = player
    if (instance !== null) {
      return instance
    }
    instance = this
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
    this._CAMERA = getDefaultVideoOpts()
    this._RAF = null

    this.state = {
      isInited: false,
      isFullScreen: false,
      isStopped: false
    }
    this.dom = null
    this.listeners = []

    this.handleFullScreen = () => {
      if (!this.state.isFullScreen) {
        this._GL.renderer.setSize(window.innerWidth, window.innerHeight)
        this._GL.camera.aspect = window.innerWidth / window.innerHeight
        this._GL.camera.updateProjectionMatrix()
      } else {
        this._GL.renderer.setSize(this._options.width, this._options.height)
        this._GL.camera.aspect = this._options.width / this._options.height
        this._GL.camera.updateProjectionMatrix()
      }
      this.state.isFullScreen = !this.state.isFullScreen
    }
    this.initFullScreenEvents()
  }

  init (videoEl) {
    if (this.state.isInited) return
    const {
      width,
      height,
      fov,
      devicePixelRatio,
      radius,
      heightSegments,
      widthSegments
    } = this._options
    const camera = new PerspectiveCamera(fov, width / height, 0.1, 1000)
    camera.target = new Vector3(0, 0, 0)
    const scene = new Scene()
    // scene.add(axes)
    const texture = new VideoTexture(videoEl)
    const geometry = new SphereBufferGeometry(radius, widthSegments, heightSegments)
    geometry.scale(-1, 1, 1)
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.format = RGBFormat
    const material = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide
    })
    const mesh = new Mesh(geometry, material)
    scene.add(mesh)
    const renderer = new WebGLRenderer()
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
    this.state.isInited = true
    this.dom = renderer.domElement
    this.dom.classList.add('xgplayer-panoramic')
    if (this.listeners.length) {
      this.flushEventListeners()
    }
    return renderer.domElement
  }

  start () {
    if (this.state.isInited && this._RAF === null) {
      this._doRender()
    }
    this.state.isStopped = false
  }

  cameraMove (movements) {
    // if (this.state.isStopped) return
    const {_CAMERA} = this
    if (_CAMERA.verAngle + movements.verAngle >= 90) {
      movements.verAngle = 0
    }
    if (_CAMERA.verAngle + movements.verAngle <= -90) {
      movements.verAngle = 0
    }
    for (let k in movements) {
      this._CAMERA[k] = movements[k] + this._CAMERA[k]
    }
  }

  flushEventListeners () {
    this.listeners.forEach((args) => {
      this.dom.addEventListener(...args)
    })
    this.listeners.length = 0
  }

  addEventListener (...args) {
    if (this.state.isInited) {
      this.dom.addEventListener(...args)
    } else {
      this.listeners.push(args)
    }
  }
  removeEventListener (...args) {
    this.dom.removeEventListener(...args)
  }

  stop () {
    this.state.isStopped = true
    window.cancelAnimationFrame(this._RAF)
    this._RAF = null
  }

  static _degToRad (deg) {
    return THREEMath.degToRad(deg)
  }

  _doRender () {
    if (this.isStopped) return
    this._RAF = window.requestAnimationFrame(this._doRender.bind(this))
    const {renderer, scene, camera} = this._GL
    const {radius} = this._options
    let {verAngle, horAngle} = this._CAMERA
    const yPos = radius * Math.sin(Panoramic._degToRad(verAngle))

    const xzRadius = yPos === 0 ? radius : Math.abs(yPos * (1 / Math.tan(Panoramic._degToRad(verAngle))))
    const xPos = xzRadius * Math.cos(Panoramic._degToRad(horAngle))
    const zPos = xzRadius * Math.sin(Panoramic._degToRad(horAngle))
    camera.target = new Vector3(xPos, yPos, zPos)
    camera.position.x = 0
    camera.position.y = 0
    camera.position.z = 0
    camera.lookAt(camera.target)
    renderer.render(scene, camera)
  }

  destroy () {
    this._GL = null
    this._options = null
    this.state = null
    this.dom = null
    this._CAMERA = null
    this.listeners = null
    window.cancelAnimationFrame(this._RAF)
    this._RAF = null
    this.unbindEvents()
    instance = null
  }

  unbindEvents () {
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(item => {
      document.removeEventListener(item, this.handleFullScreen)
    })
  }

  initFullScreenEvents () {
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(item => {
      document.addEventListener(item, this.handleFullScreen)
    })
    this.player.once('destroy', () => {
      ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(item => {
        document.removeEventListener(item, this.handleFullScreen)
        this.destroy()
      })
    })
  }

  get angle () {
    return {
      ver: this._CAMERA.verAngle,
      hor: this._CAMERA.horAngle
    }
  }
}
export default Panoramic
