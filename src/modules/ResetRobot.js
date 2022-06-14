import Module from "./Module";
import * as T from 'three';
import { resetRobot } from "../utils";

export class ResetRobot extends Module {
    constructor(params, options = {}) {
        super(params);
        Object.assign(this, params);
        this.name = 'ResetRobot';

        this.disabled = false;

        const eventConfig = this.eventConfig;
        eventConfig['squeeze'].push(() => {
            if (this.disabled) return;
            if (this.fsm.is('DRAG_CONTROL')) this.fsm.deactivateDragControl();
            if (this.fsm.is('REMOTE_CONTROL')) this.fsm.deactivateRemoteControl();
            resetRobot();
            return true;
        })
    }

    disable() {
        this.disable = true;
    }

    enable() {
        this.disable = false;
    }
}