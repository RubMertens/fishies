import {
  AmbientLight,
  Clock,
  CubeTextureLoader,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  ObjectLoader,
  PerspectiveCamera,
  PlaneBufferGeometry,
  PlaneGeometry,
  Scene,
  TextureLoader,
  WebGLRenderer,
} from 'three'
import { Boid } from './Boid'
import { EntityTracker } from './EntityTracker'
import { IEntity } from './IEntity'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'

import bkUrl from './assets/bg/uw_bk.jpg'
import dnUrl from './assets/bg/uw_dn.jpg'
import ftUrl from './assets/bg/uw_ft.jpg'
import lfUrl from './assets/bg/uw_lf.jpg'
import rtUrl from './assets/bg/uw_rt.jpg'
import upUrl from './assets/bg/uw_up.jpg'

import fish1ObjUrl from './assets/fish1.obj?url'
import fish1MtlUrl from './assets/fish1.mtl?url'

import fish2ObjUrl from './assets/fish2.obj?url'
import fish2MtlUrl from './assets/fish2.mtl?url'

import fish3ObjUrl from './assets/fish3.obj?url'
import fish3MtlUrl from './assets/fish3.mtl?url'

async function init() {
  // create a scene, that will hold all our elements such as objects, cameras and lights.
  let scene = new Scene()
  // create a camera, which defines where we're looking at
  let camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000)
  // tell the camera where to look
  camera.position.set(100, -50, 100)
  camera.lookAt(0, 0, 0)
  const light = new AmbientLight('white', 0.5)
  const sunlight = new DirectionalLight('white', 1)
  sunlight.position.set(0, 10, 0)
  scene.add(sunlight)
  scene.add(light)
  // create a render and set the size
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  }

  const objLoader = new OBJLoader()
  const mtlLoader = new MTLLoader()

  const fish1Mtl = await mtlLoader.loadAsync(fish1MtlUrl)
  fish1Mtl.preload()
  objLoader.setMaterials(fish1Mtl)
  const fish1 = await objLoader.loadAsync(fish1ObjUrl)
  fish1.rotateY(Math.PI)

  const fish2Mtl = await mtlLoader.loadAsync(fish2MtlUrl)
  fish2Mtl.preload()
  objLoader.setMaterials(fish2Mtl)
  const fish2 = await objLoader.loadAsync(fish2ObjUrl)
  fish2.rotateY(Math.PI)

  const fish3Mtl = await mtlLoader.loadAsync(fish3MtlUrl)
  fish3Mtl.preload()
  objLoader.setMaterials(fish3Mtl)
  const fish3 = await objLoader.loadAsync(fish3ObjUrl)
  fish3.rotateY(Math.PI)

  const cubeTextureLoader = new CubeTextureLoader()

  const texture = cubeTextureLoader.load([ftUrl, bkUrl, upUrl, dnUrl, rtUrl, lfUrl])
  scene.background = texture

  let renderer = new WebGLRenderer()
  renderer.setSize(sizes.width, sizes.height)
  // add the output of the render function to the HTML
  document.body.appendChild(renderer.domElement)

  const entities = new Array<IEntity>()
  const tracker = new EntityTracker()

  function randomFish() {
    const fishes = [fish1, fish2, fish3]

    return fishes[Math.floor(Math.random() * fishes.length)].clone()
  }

  for (let i = 0; i < 1000; i++) {
    let boid
    const mesh = randomFish()
    console.log(mesh)
    if (i === 0) {
      boid = new Boid(scene, mesh, tracker, true)
    } else {
      boid = new Boid(scene, mesh, tracker)
    }

    entities.push(boid)
    tracker.entities.push(boid)
  }
  const controls = new OrbitControls(camera, renderer.domElement)
  const clock = new Clock()

  function tick() {
    const delta = clock.getDelta()
    requestAnimationFrame(tick)
    renderer.render(scene, camera)
    entities.forEach((e) => e.update(delta))
    entities.forEach((e) => e.checkBounds())
    controls.update()
  }
  tick()
}
init()
