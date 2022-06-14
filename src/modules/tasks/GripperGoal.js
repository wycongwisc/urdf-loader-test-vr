import * as T from 'three';

export default class GripperGoal {
    constructor(params) {
        this.position = params.position;
        this.rotation = params.rotation;

        window.robot.traverse((child) => {
            if (child.name === 'right_gripper_base') {
                this.mesh = child.clone();
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.material = child.material instanceof Array ? 
                            child.material.map((material) => material.clone()) : 
                            child.material.clone();
                    }
                })
            }
        })

        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        this.mesh.quaternion.normalize();

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                if (child.material instanceof Array) {
                    child.material.forEach((item) => {
                        item.transparent = true;
                        item.opacity = 0.4;
                    })
                } else {
                    child.material.transparent = true;
                    child.material.opacity = 0.4;
                }
            }
        })

        this.mesh.add(new T.AxesHelper(0.2));
    }
}
