import * as T from 'three';
import { rotQuaternion } from "../utils.js";
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET } from "./globals"

const TABLE_HEIGHT = 1.05;

export default class Block {
    constructor(params) {
        this.init_posi = (params.init_posi.y += TABLE_HEIGHT, params.init_posi);
        this.init_angle = params.init_angle;
        this.target = params.target;
        this.drawn = false;
        
        const HEIGHT = 0.08;
        this.handle_offset = new T.Vector3(0, 0, HEIGHT/2);
        this.bottom_offset = new T.Vector3(0, 0, -HEIGHT/2);

        // create the brick
        const height = params.dimensions?.height ?? 0.03;
        this.mesh = new T.Mesh( 
            new T.BoxGeometry( 
                params.dimensions?.width ?? 0.03,
                height,
                params.dimensions?.depth ?? 0.03,
                1, 1, 1 
            ),
            new T.MeshStandardMaterial({ color: params.color })
        );

        this.init_posi.y += height / 2;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.reset();
    }

    reset() {
        this.grasped = false;
        this.released = false;
        this.grasp_offset = undefined;

        this.mesh.position.copy(this.init_posi);
        this.mesh.rotation.z = this.init_angle; 

        this.mesh.updateMatrixWorld();
    }
}
