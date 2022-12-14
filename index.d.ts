export type Point = {
  latitude: Decimal | number
  longitude: Decimal | number
}

export type GeoCallback<TReply> = (err: Error, reply: TReply) => void

export type NearbyOptions = {
  withCoordinates: boolean // Will provide coordinates with locations, default false
  withHashes: boolean // Will provide a 52bit Geohash Integer, default false
  withDistances: boolean // Will provide distance from query, default false
  order: 'ASC' | 'DESC' // or 'DESC' or true (same as 'ASC'), default false
  units: 'm' | 'km' | 'mi' | 'ft' // or 'km', 'mi', 'ft', default 'm'
  count: number // Number of results to return, default undefined
  accurate: boolean // Useful if in emulated mode and accuracy is important, default false
}

export type NearbyKey = string

export type NearbyObjectBase = {
  key: string
}
export type WithDistance = { distance: number }
export type WithCoordiantes = Point
export type WithHash = { hash: number }
export type NearbyD = NearbyObjectBase & WithDistance
export type NearbyDC = NearbyD & WithCoordiantes
export type NearbyDCH = NearbyDC & WithHash
export type NearbyC = NearbyObjectBase & WithCoordiantes
export type NearbyCH = NearbyC & WithHash
export type NearbyH = NearbyObjectBase & WithHash
export type NearbyObject =
  | NearbyD
  | NearbyDC
  | NearbyDCH
  | NearbyC
  | NearbyCH
  | NearbyH

export type NearbyReturnTypes = NearbyKey | NearbyObject

export type LocationSet = {
  [key: string]: WithCoordiantes
}

export type RecordsUpdated = number

export type GeoRedis = {
  addSet(setName: string): GeoRedis
  delete(callback?: (err: Error) => void): void
  removeLocations(
    locationNames: string[],
    callback?: GeoCallback<boolean>
  ): void
  addLocation(
    locationName: string,
    position: Point,
  ): Promise<RecordsUpdated>,
  addLocations(locationSet: LocationSet): Promise<RecordsUpdated>,
  nearby(
    location: Point,
    radius: number,
    options?: Partial<NearbyOptions>,
  ): Promise<NearbyReturnTypes[]>
}

export function initialize(client: any): GeoRedis
