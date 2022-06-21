import * as T from 'three';

export default class Block {
    constructor(params) {
        this.target = params.target;

        this.initPos = params.initPos ?? new T.Vector3(1, 1, 1);
        this.initAngle = params.initAngle ?? 0;
        this.color = params.color ?? 0xFF0000;
        this.vel = params.vel;
        
        // [width, height, depth]
        this.size = params.size ?? [0.03, 0.03, 0.03];

        this.drawn = false;
        
        // const HEIGHT = 0.08;
        // this.handle_offset = new T.Vector3(0, 0, HEIGHT/2);
        // this.bottom_offset = new T.Vector3(0, 0, -HEIGHT/2);

        // create the brick
        this.mesh = new T.Mesh( 
            new T.BoxGeometry( 
                this.size[0],
                this.size[1],
                this.size[2],
                1, 1, 1 
            ),
            new T.MeshStandardMaterial({ color: this.color })
        );

        this.initPos.y += this.size[1] / 2;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.reset();
    }

    reset() {
        this.grasped = false;
        this.released = false;
        this.grasp_offset = undefined;

        this.mesh.position.copy(this.initPos);
        this.mesh.rotation.z = this.initAngle; 

        this.mesh.updateMatrixWorld();
    }
}
