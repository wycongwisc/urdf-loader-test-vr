import * as T from 'three';

export default class Goal {
    constructor(params) {
        this.obj = params.obj;
        this.pos = params.pos;
        this.ori = params.ori;

        this.obj.position.set(...this.pos);
        this.obj.rotation.set(...this.ori);
        this.obj.quaternion.normalize();

        this.obj.traverse((child) => {
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

        this.obj.add(new T.AxesHelper(0.2));
    }
}
