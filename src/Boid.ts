import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  SphereBufferGeometry,
  Vector3,
} from 'three'
import { EntityTracker } from './EntityTracker'
import { IEntity } from './IEntity'
const BOID_WANDER_FORCE = 5
const BOID_MAX_STEERING_FORCE = 0.1
const BOID_SEPARATION_FORCE = 0.0001
const BOID_ALIGNMENT_FORCE = 5
const BOID_COHESION_FORCE = 4
export class Boid implements IEntity {
  mesh: Mesh | Group
  group: Group
  direction: Vector3
  velocity: Vector3
  wanderAngle: number
  accelleration: number
  maxSpeed: number
  maxSteeringForce: number
  public radius: number
  debugMesh?: Mesh<SphereBufferGeometry, MeshStandardMaterial>
  debugLines: Object3D[] = []
  debugLinegroup: Group = new Group()

  get position() {
    return this.group.position
  }
  constructor(
    private scene: Scene,
    mesh: Mesh | Group,
    private tracker: EntityTracker,
    private isDebug: boolean = false
  ) {
    this.mesh = mesh
    this.group = new Group()
    this.group.add(this.mesh)
    const spawnBoxRange = 150
    this.group.position.set(
      randomRange(-spawnBoxRange, spawnBoxRange),
      randomRange(-spawnBoxRange, spawnBoxRange),
      randomRange(-spawnBoxRange, spawnBoxRange)
    )
    this.direction = new Vector3(randomRange(-1, 1), 0, randomRange(-1, 1))
    this.velocity = this.direction.clone()

    this.radius = 15

    this.accelleration = 1
    scene.add(this.group)
    this.wanderAngle = 0

    this.maxSpeed = 10
    this.maxSteeringForce = BOID_MAX_STEERING_FORCE

    if (this.isDebug) {
      this.debugMesh = new Mesh(
        new SphereBufferGeometry(this.radius, 32, 32),
        new MeshStandardMaterial({
          color: 'red',
          transparent: true,
          opacity: 0.1,
        })
      )
      scene.add(this.debugMesh)
      // scene.add(this.debugLinegroup)
    }
  }

  public checkBounds() {
    const maxDist = 300
    const axes: (keyof Pick<Vector3, 'x' | 'z'>)[] = ['x', 'z']

    axes.forEach((a) => {
      if (this.group.position[a] > maxDist) this.group.position[a] = -maxDist
      if (this.group.position[a] < -maxDist) this.group.position[a] = maxDist
    })
  }

  public update(deltaTime: number) {
    const locals = this.tracker.getLocalEntities(this.position, this.radius)
    this.applySteering(deltaTime, locals)

    const frameVelocity = this.velocity.clone()
    frameVelocity.multiplyScalar(deltaTime)
    this.group.position.add(frameVelocity)

    const direction = this.direction
    const m = new Matrix4()
    m.lookAt(new Vector3(0, 0, 0), direction, new Vector3(0, 1, 0))
    this.group.quaternion.setFromRotationMatrix(m)

    if (this.isDebug) {
      this.updateDebug(locals)
    }
  }

  private updateDebug(locals: IEntity[]) {
    const { x, y, z } = this.group.position
    this.debugMesh?.position.set(x, y, z)
    this.scene.remove(this.debugLinegroup)
    this.debugLinegroup = new Group()
    const whiteLineMat = new LineBasicMaterial({
      color: 'white',
    })
    const redLineMat = new LineBasicMaterial({
      color: 'red',
    })
    //add distance lines
    for (const l of locals) {
      //distance
      const lineGeom = new BufferGeometry()
      lineGeom.setFromPoints([this.position, l.position])
      this.debugLinegroup.add(new Line(lineGeom, whiteLineMat))

      //set velocity vector on locals
      const velocityLine = new BufferGeometry()
      velocityLine.setFromPoints([l.position, l.position.clone().add(l.velocity)])
      this.debugLinegroup.add(new Line(velocityLine, redLineMat))
    }

    //add own direction w velocity
    const ownVelocityGeom = new BufferGeometry()
    ownVelocityGeom.setFromPoints([this.position, this.position.clone().add(this.velocity)])
    this.debugLinegroup.add(new Line(ownVelocityGeom, redLineMat))

    this.scene.add(this.debugLinegroup)
  }

  private applySteering(deltaTime: number, locals: IEntity[]) {
    const steeringForce = new Vector3(0, 0, 0)

    const forces = {
      separation: this.applySeparation(locals),
      alignment: this.applyAlignment(locals),
      cohesion: this.applyCohesion(locals),
      wander: this.applyWander(),
    }

    steeringForce.add(forces.wander)
    steeringForce.add(forces.separation)
    steeringForce.add(forces.alignment)
    steeringForce.add(forces.cohesion)
    steeringForce.multiplyScalar(this.accelleration * deltaTime)
    steeringForce.multiply(new Vector3(1, 0.1, 1))

    steeringForce.normalize()
    steeringForce.multiplyScalar(this.maxSteeringForce)
    this.velocity.add(steeringForce)

    this.velocity.normalize()
    this.velocity.multiplyScalar(this.maxSpeed)
    this.direction = this.velocity.clone()
    this.direction.normalize()
  }

  private applyWander() {
    this.wanderAngle += 0.1 * randomRange(-2 * Math.PI, 2 * Math.PI)
    const randomPointOnCircle = new Vector3(
      Math.cos(this.wanderAngle),
      Math.cos(this.wanderAngle),
      Math.cos(this.wanderAngle)
    )
    const pointAhead = this.direction.clone()
    pointAhead.multiplyScalar(2)
    pointAhead.add(randomPointOnCircle)
    pointAhead.normalize()
    return pointAhead.multiplyScalar(BOID_WANDER_FORCE)
  }

  private applySeparation(locals: IEntity[]) {
    if (locals.length === 0) return new Vector3(0, 0, 0)
    const force = new Vector3(0, 0, 0)
    for (const l of locals) {
      const distanceToEntity = Math.max(l.position.distanceTo(this.position) - (this.radius + l.radius), 0.001)
      const directionFromEntity = new Vector3().subVectors(this.position, l.position).normalize()

      const multiplier = BOID_SEPARATION_FORCE * ((this.radius + l.radius) / distanceToEntity)
      force.add(directionFromEntity.multiplyScalar(multiplier))
    }
    return force
  }

  private applyAlignment(locals: IEntity[]) {
    if (locals.length === 0) return new Vector3(0, 0, 0)
    const force = new Vector3(0, 0, 0)
    for (const l of locals) {
      force.add(l.direction)
    }
    force.normalize()
    force.multiplyScalar(BOID_ALIGNMENT_FORCE)

    return force
  }

  private applyCohesion(locals: IEntity[]) {
    if (locals.length === 0) return new Vector3(0, 0, 0)
    const avgPosition = new Vector3(0, 0, 0)
    for (const l of locals) {
      avgPosition.add(l.position)
    }
    avgPosition.multiplyScalar(1 / locals.length)
    const directionToAveragePosition = avgPosition.clone().sub(this.position)
    directionToAveragePosition.normalize()
    directionToAveragePosition.multiplyScalar(BOID_COHESION_FORCE)
    return directionToAveragePosition
  }
}

export const randomRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min
}
