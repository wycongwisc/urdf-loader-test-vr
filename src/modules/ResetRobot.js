import Module from "./Module";
import * as T from 'three';
import { resetRobot } from "../utils";

export class ResetRobot extends Module {
    constructor(params, options = {}) {
        super({
            name: 'reset-robot'
        });
        Object.assign(this, params);

        this.disabled = false;

        this.instructions = this.ui.createContainer('reset-robot-instructions', {
            height: .4,
            width: .5,
            backgroundOpacity: 0,
        });
        this.instructions.appendChild(this.ui.createText('Press the grip button to reset the robot', { fontSize: 0.025 }));

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