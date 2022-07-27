export interface AssetData {
        name: string,
        resourceId: string,
        dimensions: { width: number, height: number, depth: number },
        offset?: { x: number, y: number, z: number },
        rotation?: { x: number, y: number, z: number },
}