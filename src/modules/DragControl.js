import Module from "./Module";
import * as T from 'three';
import { getCurrEEPose, updateTargetCursor, updateRobot, resetRobot } from '../utils';

export class DragControl extends Module {
    constructor(utilities, options = {}) {
        super('drag-control', utilities);

        // ========== options ==========
        this.activationRadius = options.activationRadius ?? 0.1;
        this.showOffsetIndicator = options.showOffsetIndicator ?? true;
        this.controlMode = options.controlMode ?? 'grip-auto';
        // =============================

        this.click = new Audio('./assets/click.wav');
    }

    load(config) {
        config.transitions.push({ name: 'activateDragControl', from: 'IDLE', to: 'DRAG_CONTROL' });
        config.transitions.push({ name: 'deactivateDragControl', from: 'DRAG_CONTROL', to: 'IDLE' });
        config.methods['onActivateDragControl'] = () => {
            this.click.play();
            this.controller.get().grip.traverse((child) => { if (child instanceof T.Mesh) child.visible = false });
        }
        config.methods['onDeactivateDragControl'] = () => {
            this.click.play();
            this.controller.get().grip.traverse((child) => { if (child instanceof T.Mesh) child.visible = true });
            window.targetCursor.material.color.setHex(0xFFFFFF);
            window.scene.remove(this.offsetIndicator);
            this.dragTimeout = true;
            setTimeout(() => this.dragTimeout = false, 1000);
        }

        this.loadControlMode(this.controlMode);
    }

    loadControlMode(mode) {
        if (!['grip-auto', 'grip-toggle', 'grip-hold', 'trigger-auto', 'trigger-toggle', 'trigger-hold'].includes(mode)) throw new Error(`Control mode \"${mode}\" does not exist for Drag Control`);

        this.controller.removeButtonAction('grip', 'drag-control');
        this.controller.removeButtonAction('gripstart', 'drag-control');
        this.controller.removeButtonAction('gripend', 'drag-control');
        this.controller.removeButtonAction('trigger', 'drag-control');
        this.controller.removeButtonAction('triggerstart', 'drag-control');
        this.controller.removeButtonAction('triggerend', 'drag-control');

        switch(mode) {
            case 'grip-hold': 
                this.controller.addButtonAction('gripstart', 'drag-control', () => {
                    if (
                        this.fsm.is('IDLE') 
                        && this.controller.getPose().posi.distanceTo(getCurrEEPose().posi) <= this.activationRadius
                    ) {
                        this.fsm.activateDragControl();
                    }
                })

                this.controller.addButtonAction('gripend', 'drag-control', () => {
                    if (this.fsm.is('DRAG_CONTROL')) this.fsm.deactivateDragControl();
                })
                this.modeInstructions = 'Activate: Move the controller to the gripper and hold the grip button\nDeactivate: Release the grip button.';
                break;
            case 'grip-toggle':
                this.controller.addButtonAction('grip', 'drag-control', () => {
                    if (
                        this.fsm.is('IDLE') 
                        && this.controller.getPose().posi.distanceTo(getCurrEEPose().posi) <= this.activationRadius
                    ) {
                        this.fsm.activateDragControl();
                    } else if (this.fsm.is('DRAG_CONTROL')) {
                        this.fsm.deactivateDragControl();
                    }

                })
                this.modeInstructions = 'Activate: Move the controller to the gripper and press the grip button\nDeactivate: Press the grip button.';
                break;
            case 'grip-auto': 
                this.controller.addButtonAction('grip', 'drag-control', () => {
                    if (this.fsm.is('DRAG_CONTROL')) this.fsm.deactivateDragControl();
                })
                this.modeInstructions = 'Activate: Move the controller to the gripper.\nDeactivate: Press the grip button.';
                break;
            case 'trigger-hold': 
                this.controller.addButtonAction('triggerstart', 'drag-control', () => {
                    if (
                        this.fsm.is('IDLE') 
                        && this.controller.getPose().posi.distanceTo(getCurrEEPose().posi) <= this.activationRadius
                    ) {
                        this.fsm.activateDragControl();
                    }
                })

                this.controller.addButtonAction('triggerend', 'drag-control', () => {
                    if (this.fsm.is('DRAG_CONTROL')) this.fsm.deactivateDragControl();
                })
                this.modeInstructions = 'Activate: Move the controller to the gripper, then squeeze and hold the trigger.\nDeactivate: Release the trigger.';
                break;
            case 'trigger-toggle':
                this.controller.addButtonAction('trigger', 'drag-control', () => {
                    if (
                        this.fsm.is('IDLE') 
                        && this.controller.getPose().posi.distanceTo(getCurrEEPose().posi) <= this.activationRadius
                    ) {
                        this.fsm.activateDragControl();
                    } else if (this.fsm.is('DRAG_CONTROL')) {
                        this.fsm.deactivateDragControl();
                    }

                })
                this.modeInstructions = 'Activate: Move the controller to the gripper and squeeze the trigger.\nDeactivate: Squeeze the trigger again.';
                break;
            case 'trigger-auto': 
                this.controller.addButtonAction('trigger', 'drag-control', () => {
                    if (this.fsm.is('DRAG_CONTROL')) this.fsm.deactivateDragControl();
                })
                this.modeInstructions = 'Activate: Move the controller to the gripper.\nDeactivate: Squeeze the trigger.';
                break;
            default: 
                break;
        }
    }

    reset() {
        if (this.fsm.is('DRAG_CONTROL')) this.fsm.deactivateDragControl();
    }

    update(t, info) {
        if (
            ['trigger-auto', 'grip-auto'].includes(this.controlMode)
            && this.fsm.is('IDLE') 
            && !this.dragTimeout
            && info.ctrlPose.posi.distanceTo(info.currEEAbsThree.posi) <= this.activationRadius
        ) {
            this.fsm.activateDragControl();
        }

        if (this.fsm.is('DRAG_CONTROL')) {

            const deltaPosi = new T.Vector3();
            deltaPosi.subVectors(info.ctrlPose.posi, window.initEEAbsThree.posi)
            window.goalEERelThree.posi.copy(deltaPosi);

            const deltaOri = new T.Quaternion();
            deltaOri.multiplyQuaternions(info.ctrlPose.ori, info.prevCtrlPose.ori.invert())
            window.goalEERelThree.ori.premultiply(deltaOri);

            this.showOffsetIndicator && this.updateOffsetIndicator(info.currEEAbsThree.posi, window.targetCursor.position);
            updateTargetCursor(window.goalEERelThree);
            updateRobot(window.goalEERelThree);
        }
    }

    // this method should only be called when drag control is active
    updateOffsetIndicator(p0, p1) { 
        window.scene.remove(this.offsetIndicator);

        const length = p0.distanceTo(p1);

        let color;
        if (length < 0.1) color = 0x00FF00;
        else if (length < 0.2) color = 0xffcc00;
        else color = 0xff0000;

        this.offsetIndicator = new T.Line(
            new T.BufferGeometry().setFromPoints([p0, p1]), 
            new T.LineBasicMaterial({ transparent: true, opacity: 1, color })
        )

        window.targetCursor.material.color.setHex(color);
        window.scene.add(this.offsetIndicator);
    }
}
