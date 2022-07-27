import Module from "./Module";
import * as T from 'three';

export class Grasping extends Module {
    constructor(params, options = {}) {
        super({
            name: 'grasping'
        });
        Object.assign(this, params);
    }

    update(t, data) {
        

        const pos1 = window.robot.links['right_gripper_l_finger_tip'].getWorldPosition(new T.Vector3());
        const pos2 = window.robot.links['right_gripper_r_finger_tip'].getWorldPosition(new T.Vector3());
        
        // opening
        if (this.controller.gamepad?.buttons[4].pressed && 
            pos1.distanceTo(pos2) >= .01) {
            const leftPosition = window.leftFinger.link.translateY(-0.001).getWorldPosition(new T.Vector3());
            window.leftFinger.rigidBody.setNextKinematicTranslation(leftPosition);
            const rightPosition = window.rightFinger.link.translateY(0.001).getWorldPosition(new T.Vector3());
            window.rightFinger.rigidBody.setNextKinematicTranslation(rightPosition);

            this.controller.gamepad?.hapticActuators[0].pulse(.25, 18);
        }

        // closing
        if (this.controller.gamepad?.buttons[5].pressed && 
            pos1.distanceTo(pos2) <= .08) {
            const leftPosition = window.leftFinger.link.translateY(0.001).getWorldPosition(new T.Vector3());
            window.leftFinger.rigidBody.setNextKinematicTranslation(leftPosition);
            const rightPosition = window.rightFinger.link.translateY(-0.001).getWorldPosition(new T.Vector3());
            window.rightFinger.rigidBody.setNextKinematicTranslation(rightPosition);

            this.controller.gamepad?.hapticActuators[0].pulse(.25, 18);
        }
    }
}