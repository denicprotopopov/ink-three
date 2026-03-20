import { BufferGeometry, BufferAttribute, Vector3, Box3 } from "three";

export interface Triangle {
    a: Vector3;
    b: Vector3;
    c: Vector3;
}

export function extractTriangles(geometry: BufferGeometry): Triangle[] {
    const posAtt = geometry.attributes['position'] as BufferAttribute | undefined;
    if (!posAtt) return [];

    const triangles: Triangle[] = [];
    const getVertex = (i: number): Vector3 =>
        new Vector3(posAtt.getX(i), posAtt.getY(i), posAtt.getZ(i));

    if (geometry.index) {
        const idx = geometry.index;
        for (let i = 0; i < idx.count; i += 3) {
            triangles.push({
                a: getVertex(idx.getX(i)),
                b: getVertex(idx.getX(i + 1)),
                c: getVertex(idx.getX(i + 2)),
            });
        }
    } else {
        for (let i = 0; i < posAtt.count; i += 3) {
            triangles.push({
                a: getVertex(i),
                b: getVertex(i + 1),
                c: getVertex(i + 2),
            });
        }
    }


    return triangles;
}

export function normalizeGeometry(geometry: BufferGeometry): BufferGeometry {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new Box3();

    const center = new Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
        const scale = 2 / maxDim;
        geometry.scale(scale, scale, scale);
    }

    return geometry;
}