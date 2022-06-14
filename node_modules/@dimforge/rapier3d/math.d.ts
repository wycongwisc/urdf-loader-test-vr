import { RawVector, RawRotation } from "./raw";
export interface Vector {
    x: number;
    y: number;
    z: number;
}
/**
 * A 3D vector.
 */
export declare class Vector3 implements Vector {
    x: number;
    y: number;
    z: number;
    constructor(x: number, y: number, z: number);
}
export declare class VectorOps {
    static new(x: number, y: number, z: number): Vector;
    static intoRaw(v: Vector): RawVector;
    static zeros(): Vector;
    static fromRaw(raw: RawVector): Vector;
}
export interface Rotation {
    x: number;
    y: number;
    z: number;
    w: number;
}
/**
 * A quaternion.
 */
export declare class Quaternion implements Rotation {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x: number, y: number, z: number, w: number);
}
export declare class RotationOps {
    static identity(): Rotation;
    static fromRaw(raw: RawRotation): Rotation;
    static intoRaw(rot: Rotation): RawRotation;
}
