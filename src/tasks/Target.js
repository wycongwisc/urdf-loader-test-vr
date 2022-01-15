import * as T from 'three';
import { TABLE_HEIGHT } from './globals';

export default class Target {
    constructor(params) {
        const mesh = new T.Mesh( 
            new T.TorusGeometry( 0.05, 0.005, 64, 64),
            new T.MeshBasicMaterial( { color: params.color } )
        );
        this.mesh = new T.Group();
        this.mesh.add(mesh);
        this.mesh.name = "circle";
        this.mesh.position.copy((params.pos.y += TABLE_HEIGHT, params.pos));
        this.mesh.rotation.x = Math.PI/2;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.velocity = params.velocity;
        this.scene = params.scene;
    }
}
