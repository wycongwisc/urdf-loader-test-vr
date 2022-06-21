import Module from "./Module";
import * as T from 'three';

export class Teleport extends Module {
    constructor(params, options = {}) {
        super({
            name: 'teleport'
        });
        Object.assign(this, params);

        this.controllerGrip1.addEventListener('connected', e => {
            this.teleportvr.add(0, this.controllerGrip1, this.controller1, e.data.gamepad);
        });
        this.controllerGrip2.addEventListener('connected', e => {
            this.teleportvr.add(1, this.controllerGrip2, this.controller2, e.data.gamepad);
        });
    }

    setFSM(fsm) {
        this.teleportvr.setFSM(fsm);
    }
}