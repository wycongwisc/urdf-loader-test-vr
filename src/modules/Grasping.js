import Module from "./Module";
import * as T from 'three';

export class Grasping extends Module {
    constructor(controller, options = {}) {
        super({ name: 'grasping' });
        this.controller = controller;
        this.setMode(options.mode ?? 'ab-hold');
        this.disabled = false;
    }

    setMode(mode) {
        if (!['ab-hold', 'trigger-toggle', 'trigger-hold'].includes(mode)) throw new Error(`Control mode \"${mode}\" does not exist for Grasping`);
        this.mode = mode;

        this.controller.removeButtonAction('a', 'grasping');
        this.controller.removeButtonAction('b', 'grasping');
        this.controller.removeButtonAction('trigger', 'grasping');
        this.controller.removeButtonAction('triggerpressed', 'grasping');
        this.controller.removeButtonAction('triggerreleased', 'grasping');
        this.controller.removeButtonAction('triggerstart', 'grasping');
        this.controller.removeButtonAction('triggerend', 'grasping');

        const open = () => {
            if (this.disabled) return;

            const pos1 = window.robot.links['right_gripper_l_finger_tip'].getWorldPosition(new T.Vector3());
            const pos2 = window.robot.links['right_gripper_r_finger_tip'].getWorldPosition(new T.Vector3());
            if (pos1.distanceTo(pos2) <= .08) {
                const leftPosition = window.leftFinger.link.translateY(0.001).getWorldPosition(new T.Vector3());
                window.leftFinger.rigidBody.setNextKinematicTranslation(leftPosition);
                const rightPosition = window.rightFinger.link.translateY(-0.001).getWorldPosition(new T.Vector3());
                window.rightFinger.rigidBody.setNextKinematicTranslation(rightPosition);
                this.controller.get().gamepad?.hapticActuators[0].pulse(.25, 18);
            } else {
                return true;
            }
        }

        const close = () => {
            if (this.disabled) return;

            const pos1 = window.robot.links['right_gripper_l_finger_tip'].getWorldPosition(new T.Vector3());
            const pos2 = window.robot.links['right_gripper_r_finger_tip'].getWorldPosition(new T.Vector3());
            if (pos1.distanceTo(pos2) >= .01 && !window.grasped) {
                const leftPosition = window.leftFinger.link.translateY(-0.001).getWorldPosition(new T.Vector3());
                window.leftFinger.rigidBody.setNextKinematicTranslation(leftPosition);
                const rightPosition = window.rightFinger.link.translateY(0.001).getWorldPosition(new T.Vector3());
                window.rightFinger.rigidBody.setNextKinematicTranslation(rightPosition);
                this.controller.get().gamepad?.hapticActuators[0].pulse(.25, 18);
            } else {
                return true;
            }
        }

        switch(mode) {
            case 'trigger-hold': 
                this.controller.addButtonAction('triggerpressed', 'grasping', close);
                this.controller.addButtonAction('triggerreleased', 'grasping', open);
                this.modeInstructions = 'Close: Squeeze and hold the trigger.\nOpen: Release the trigger.';
                break;
            case 'trigger-toggle':
                let closed = false;
                this.controller.addButtonAction('trigger', 'grasping', () => {
                    if (closed) {
                        this.controller.addButtonAction('triggerreleased', 'grasping', () => {
                            if (open()) closed = false;
                        });
                    } else {
                        this.controller.addButtonAction('triggerreleased', 'grasping', () => {
                            if (close()) closed = true;
                        });
                    }
                });
                this.modeInstructions = 'Close: Squeeze the trigger.\nOpen: Squeeze the trigger again.';
                break;
            case 'ab-hold': 
                this.controller.addButtonAction('b', 'grasping', open);
                this.controller.addButtonAction('a', 'grasping', close);
                this.modeInstructions = 'Close: Press and hold (a.\nOpen: Press and hold (b).';
                break;
            default: 
                break;
        }
    }

    disable() {
        this.disabled = true;
    }

    enable() {
        this.disabled = false;
    }
}