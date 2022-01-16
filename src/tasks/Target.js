import * as T from 'three';
import { TABLE_HEIGHT } from './globals';

export default class Target {
    constructor(params) {

        this.scene = params.scene;
        this.initPos = params.initPos ?? new T.Vector3(0.7, TABLE_HEIGHT, 0.75);
        this.size = params.size ?? 0.05;
        this.color = params.color ?? 0xFF0000;
        this.vel = params.vel;

        const mesh = new T.Mesh( 
            new T.TorusGeometry( this.size, 0.005, 64, 64),
            new T.MeshBasicMaterial({ color: this.color })
        );
        this.mesh = new T.Group();
        this.mesh.add(mesh);
        this.mesh.name = "circle";
        this.mesh.position.copy(params.initPos);
        this.mesh.rotation.x = Math.PI/2;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }
}
