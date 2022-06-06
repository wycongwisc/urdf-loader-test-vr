import * as T from 'three';

export default class Goal {
    constructor(params) {
        this.mesh = params.mesh;
        this.pos = params.pos;
        this.ori = params.ori;

        this.mesh.position.set(...this.pos);
        this.mesh.rotation.set(...this.ori);
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
