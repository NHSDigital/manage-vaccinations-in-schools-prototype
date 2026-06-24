export interface BaseModelOptions {
  createdAt?: Date
  createdBy_uid?: string
  updatedAt?: Date
  updatedBy_uid?: string
}

export class BaseModel {
  static contextKey: string
  static foreignKeys: Record<string, () => typeof BaseModel>
  static identifierKey: string
  static ns: string

  context: object | undefined
  createdAt: Date | undefined
  createdBy_uid: string | undefined
  updatedAt: Date | undefined
  updatedBy_uid: string | undefined

  constructor(options: object, context?: object)

  get ns(): string
  get createdBy(): User
  get createdBy_(): object | string
  get updatedBy(): User

  set createdAt_(object: object): void

  toJSON(): Omit<this, 'context'>

  static relate(key: string, getModel: () => typeof BaseModel, as: string): void

  static findAll<T extends typeof BaseModel>(
    this: T,
    context: object
  ): InstanceType<T>[]

  static findOne<T extends typeof BaseModel>(
    this: T,
    id: string,
    context: object
  ): InstanceType<T> | undefined

  static create<T extends typeof BaseModel>(
    this: T,
    options: object,
    context: object
  ): InstanceType<T> | undefined

  static update<T extends typeof BaseModel>(
    this: T,
    id: string,
    updates: object,
    context: object
  ): InstanceType<T> | undefined

  static delete<T extends typeof BaseModel>(id: string, context: object): void
}
