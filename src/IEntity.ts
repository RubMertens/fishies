import { Vector3 } from 'three'

export interface IEntity {
  position: Vector3
  direction: Vector3
  radius: number
  velocity: Vector3
  update(time: number): void
  checkBounds(): void
}
