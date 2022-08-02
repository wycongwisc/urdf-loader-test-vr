import Module from "./Module";
import * as T from 'three';

export class Teleport extends Module {
    constructor(teleportvr, options = {}) {
        super({ name: 'teleport' });
        this.teleportvr = teleportvr;
        this.teleportvr.enabled = true;
    }

    setFSM(fsm) {
        this.teleportvr.setFSM(fsm);
    }
}