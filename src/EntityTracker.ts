import { Vector3 } from 'three'
import { IEntity } from './IEntity'

export class EntityTracker {
  public entities: IEntity[] = []

  getLocalEntities(position: Vector3, radius: number) {
    return this.entities.filter((e) => {
      const distance = position.distanceTo(e.position)
      return distance !== 0 && distance < radius
    })
  }
}
