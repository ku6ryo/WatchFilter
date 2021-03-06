import {
  AmbientLight,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
  Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Side,
  FrontSide,
  Vector2,
  Texture,
  Color,
} from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./global.css"
import Stats from "stats.js";
import { SupportedModels, createDetector } from "@tensorflow-models/hand-pose-detection"
const { MediaPipeHands } = SupportedModels
import style from "./style.module.scss"
import { Pane } from "tweakpane";
import { getUserMedia } from "./getUserMedia";
import appleWatchModelUrl from "../public/apple_watch.glb"
import { createAxes } from "./createAxes";
import { ScreenCanvas } from "./ScreenCanvas";

const stats = new Stats()
document.body.appendChild(stats.dom)

const container = document.createElement("div")
container.className = style.container
document.body.appendChild(container)

const buttonContainer = document.createElement("div")
buttonContainer.className = style.buttonContainer
document.body.appendChild(buttonContainer)

const watchScale = 0.006
const watchX = -0.3
const watchY = 0.04
const watchZ = 0.04
const watchRX = 71.93
const watchRY = 311.93
const watchRZ = 317.89

enum ColorVariant {
  Red = "red",
  Pink = "pink",
  Blue = "blue",
  White = "white",
  Green = "green",
}

const MaterialDict = {
  [ColorVariant.White]: {
    "Strap_Rubber": new MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5, metalness: 0.7 }),
  },
  [ColorVariant.Red]: {
    "Strap_Rubber": new MeshStandardMaterial({ color: 0xFF3333, roughness: 0.5, metalness: 0.7 }),
  },
  [ColorVariant.Pink]: {
    "Strap_Rubber": new MeshStandardMaterial({ color: 0xFF1e87, roughness: 0.5, metalness: 0.7 }),
  },
  [ColorVariant.Green]: {
    "Strap_Rubber": new MeshStandardMaterial({ color: 0x66FF66, roughness: 0.5, metalness: 0.7 }),
  },
  [ColorVariant.Blue]: {
    "Strap_Rubber": new MeshStandardMaterial({ color: 0x6666FF, roughness: 0.5, metalness: 0.7 }),
  }
}

async function loadModel(url: string): Promise<GLTF> {
  const loader = new GLTFLoader()
  return new Promise((resolve, reject) => {
    loader.load(url, (model) => {
      resolve(model)
    },
    undefined,
    (e) => {
      reject(e)
    })
  })
}

function isMesh(child: any): child is Mesh {
  return child.isMesh
}

async function changeColor(model: GLTF, colorPalette: { [key: string]: Material }) {
  model.scene.traverse((child) => {
    if (isMesh(child)) {
      const mat = colorPalette[child.name]
      if (mat) {
        child.material = mat
      }
      child.renderOrder = 2;
      if (child.name === "occluder") {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            m.colorWrite = false
          })
        } else {
          child.material.colorWrite = false
        }
        child.renderOrder = 1;
      }
    }
  })
}

const screenCanvas = new ScreenCanvas()
document.body.appendChild(screenCanvas.getCanvas())

;(async () => {
  const stream = await getUserMedia()
  if (!stream) {
    throw new Error("media stream not available")
  }
  const mainCanvas = document.createElement("canvas")
  mainCanvas.className = style.camera
  const mainContext = mainCanvas.getContext("2d")!
  container.appendChild(mainCanvas)
  const cameraVideo = document.createElement("video");

  cameraVideo.srcObject = stream;
  cameraVideo.play();
  await (new Promise((resolve, reject) => {
    cameraVideo.addEventListener("playing", () => {
      resolve(0)
    })
  }))
  const vw = cameraVideo.videoWidth
  const vh = cameraVideo.videoHeight
  mainCanvas.width = vw
  mainCanvas.height = vh
  mainCanvas.style.maxHeight = `calc(100vw * ${vh / vw})`
  mainCanvas.style.maxWidth = `calc(100vh * ${vw / vh})`

  const renderer = new WebGLRenderer()
  renderer.setClearAlpha(0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(90, vw / vh, 1, 10)
  camera.position.set(0, 0, 2);

  camera.aspect = vw / vh
  renderer.setSize(vw, vh)

  for (let i = 0; i < 6; i++) {
    const light = new DirectionalLight()
    light.position.set(
      Math.cos(Math.PI * 2 / 6 * i + Math.PI / 2) * 6,
      0,
      Math.sin(Math.PI * 2 / 6 * i + Math.PI / 2) * 6
    )
    light.intensity = 1
    light.lookAt(0, 0, 0)
    scene.add(light)
  }
  const amb = new AmbientLight(0xFFFFFF, 1)
  scene.add(amb)

  const appleWatch = await loadModel(appleWatchModelUrl)
  const watchContainer = new Group()
  const watch = appleWatch.scene

  watch.position.set(watchX, watchY, watchZ)
  watch.scale.set(0.3, 0.3, 0.3)
  watch.rotation.set(
    watchRX / 180 * Math.PI,
    watchRY / 180 * Math.PI,
    watchRZ / 180 * Math.PI,
  )
  watchContainer.add(watch)
  changeColor(appleWatch, MaterialDict[ColorVariant.White])

  Object.values(ColorVariant).forEach(color => {
    const button = document.createElement("button")
    button.className = style[color]
    button.dataset.color = color
    button.addEventListener("click", () => {
      changeColor(appleWatch, MaterialDict[color])
    })
    buttonContainer.appendChild(button)
  })

  const screen = appleWatch.scene.children.find(c => {
    return c.name === "screen"
  })
  const screenMaterial = (() => {
    return (screen as Mesh).material as MeshStandardMaterial
  })()
  scene.add(watchContainer)

  const axes = createAxes(1, 1)
  // watchContainer.add(axes)

  renderer.render(scene, camera)

  const detector = await createDetector(MediaPipeHands, {
    runtime: "mediapipe",
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/",
  })

  /*
  const balls = Array(21).fill(0).map((_, i) => {
    return new Mesh(
      new SphereGeometry(0.5, 32, 32),
      new MeshPhysicalMaterial()
    )
  })
  balls.forEach(b => {
    b.scale.multiplyScalar(0.2)
    scene.add(b)
  })
  const aBalls = Array(21).fill(0).map(() => {
    return new Mesh(
      new SphereGeometry(0.5, 32, 32),
      new MeshPhysicalMaterial()
    )
  })
  aBalls.forEach(b => {
    b.scale.multiplyScalar(0.2)
    scene.add(b)
  })
  aBalls[0].material.color = new Color(1, 0, 0)
  aBalls[1].material.color = new Color(0, 1, 0)
  aBalls[2].material.color = new Color(0, 0, 1)
  */

  const pane = new Pane()
  pane.addInput({
    x: watchX,
  }, "x", { min: -2, max: 2}).on("change", (e) => {
    watch.position.set(e.value, watch.position.y, watch.position.z)
  })
  pane.addInput({
    y: watchY,
  }, "y", { min: -2, max: 2}).on("change", (e) => {
    watch.position.set(watch.position.x, e.value, watch.position.z)
  })
  pane.addInput({
    z: watchZ,
  }, "z", { min: -2, max: 2 }).on("change", (e) => {
    watch.position.set(watch.position.x, watch.position.y, e.value)
  })
  pane.addInput({
    rx: watchRX,
  }, "rx", { min: 0, max: 360}).on("change", (e) => {
    watch.rotation.set(e.value / 180 * Math.PI, watch.rotation.y, watch.rotation.z)
  })
  pane.addInput({
    ry: watchRY,
  }, "ry", { min: 0, max: 360}).on("change", (e) => {
    watch.rotation.set(watch.rotation.x, e.value / 180 * Math.PI, watch.rotation.z)
  })
  pane.addInput({
    rz: watchRZ,
  }, "rz", { min: 0, max: 360}).on("change", (e) => {
    watch.rotation.set(watch.rotation.x, watch.rotation.y, e.value / 180 * Math.PI)
  })
  pane.element.classList.add(style.control)
  document.body.appendChild(pane.element)

  const loop = async () => {
    stats.begin()
    mainContext.drawImage(cameraVideo, 0, 0, mainCanvas.width, mainCanvas.height)
    const hands = await detector.estimateHands(mainCanvas, {
      flipHorizontal: false,
      staticImageMode: false,
    })
    if (hands.length > 0) {
      console.log("detected")
      const hand = hands[0]
      const { x: x0, y: y0, z: z0 } = hand.keypoints3D![0]
      const { x: x1, y: y1, z: z1 } = hand.keypoints3D![5]
      const { x: x2, y: y2, z: z2 } = hand.keypoints3D![17]

      const { x: x3, y: y3 } = hand.keypoints[0]
      const { x: x4, y: y4 } = hand.keypoints[17]
      const palmLen2D = Math.sqrt(Math.pow(x3 - x4, 2) + Math.pow(y3 - y4, 2))

      /*
      hands[0].keypoints3D!.forEach((p, i) => {
        balls[i].position.set(p.x * 10, - p.y * 10, - p.z! * 10)
      })
      */

      const p0 = new Vector3(x0, -y0, -z0!)
      const p1 = new Vector3(x1, -y1, -z1!)
      const p2 = new Vector3(x2, -y2, -z2!)

      const v0 = p1.clone().sub(p0)
      const v1 = p2.clone().sub(p0)

      const v12D = v1.clone().setZ(0) 
      const ratio = v1.length() / v12D.length()
      console.log(ratio, palmLen2D)
      const palmLen = ratio * palmLen2D

      const handX = v0.clone().normalize()
      const handY = (() => {
        if (hand.handedness === "Left") {
          return v1.clone().normalize().cross(v0).normalize()
        } else {
          return v0.clone().normalize().cross(v1).normalize()
        }
      })()
      /*
      aBalls[0].position.copy(handX.multiplyScalar(1))
      aBalls[1].position.copy(handY.multiplyScalar(1))
      aBalls[2].position.copy(handZ.multiplyScalar(1))
      */

      const modelX = new Vector3(1, 0, 0)
      const modelY = new Vector3(0, 1, 0)

      const ay = modelY.clone().cross(handY).normalize()
      const qy = new Quaternion().setFromAxisAngle(ay, Math.acos(handY.dot(modelY)))

      const modelX2 = modelX.clone().applyQuaternion(qy).normalize()
      const ax = modelX2.clone().cross(handX).normalize()
      const qx = new Quaternion().setFromAxisAngle(ax, Math.acos(handX.dot(modelX2)))

      const q = new Quaternion().multiplyQuaternions(qx, qy)
      watchContainer.rotation.setFromQuaternion(q)

      watchContainer.scale.set(palmLen * watchScale, palmLen * watchScale, palmLen * watchScale)
      const wrist = hand.keypoints[0]
      const pos = new Vector3(
        (wrist.x - cameraVideo.videoWidth / 2) * 4 / cameraVideo.videoHeight,
        - (wrist.y - cameraVideo.videoHeight / 2) * 4 / cameraVideo.videoHeight,
        0
      )
      watchContainer.position.lerp(pos, 0.5)
    }
    mainContext.drawImage(renderer.domElement, 0, 0, mainCanvas.width, mainCanvas.height)

    screenCanvas.update()
    const screenTex = new Texture(screenCanvas.getCanvas())
    screenTex.needsUpdate = true
    screenMaterial.map = screenTex

    renderer.render(scene, camera)
    stats.end()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
})()