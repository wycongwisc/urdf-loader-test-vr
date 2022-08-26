import Module from "./Module";
import * as T from 'three';
import { getCurrEEPose, updateTargetCursor, updateRobot, resetRobot } from '../utils';


export class RemoteControl extends Module {
    constructor(utilities, options = {}) {
        super('remote-control', utilities);

        // ========== options ==========
        this.showOffsetIndicator = options.showOffsetIndicator ?? true;
        this.controlMode = options.controlMode ?? 'grip-toggle';
        // =============================

        this.click = new Audio('./assets/click.wav');
    }

    load(config) {
        config.transitions.push({ name: 'activateRemoteControl', from: 'IDLE', to: 'REMOTE_CONTROL' });
        config.transitions.push({ name: 'deactivateRemoteControl', from: 'REMOTE_CONTROL', to: 'IDLE' });
        config.methods['onActivateRemoteControl'] = () => { 
            this.click.play() 
        };
        config.methods['onDeactivateRemoteControl'] = () => {
            window.scene.remove(this.offsetIndicator);
            window.targetCursor.material.color.setHex(0xFFFFFF);
        };

        this.loadControlMode(this.controlMode);
    }

    loadControlMode(mode) {
        if (!['grip-toggle', 'grip-hold', 'trigger-hold', 'trigger-toggle'].includes(mode)) throw new Error(`Control mode \"${mode}\" does not exist for Remote Control`);

        this.controller.removeButtonAction('grip', 'remote-control');
        this.controller.removeButtonAction('gripstart', 'remote-control');
        this.controller.removeButtonAction('gripend', 'remote-control');
        this.controller.removeButtonAction('trigger', 'remote-control');
        this.controller.removeButtonAction('triggerstart', 'remote-control');
        this.controller.removeButtonAction('triggerend', 'remote-control');

        switch(mode) {
            case 'grip-hold': 
                this.controller.addButtonAction('gripstart', 'remote-control', () => {
                    if (this.fsm.is('IDLE')) this.fsm.activateRemoteControl();
                })

                this.controller.addButtonAction('gripend', 'remote-control', () => {
                    if (this.fsm.is('REMOTE_CONTROL')) this.fsm.deactivateRemoteControl();
                })
                this.modeInstructions = 'Activate: Press and hold the grip button.\nDeactivate: Release the grip button.';
                break;
            case 'grip-toggle':
                this.controller.addButtonAction('grip', 'remote-control', () => {
                    if (this.fsm.is('IDLE')) {
                        this.fsm.activateRemoteControl();
                    } else if (this.fsm.is('REMOTE_CONTROL')) {
                        this.fsm.deactivateRemoteControl();
                    }
                })
                this.modeInstructions = 'Activate: Press the grip button.\nDeactivate: Press the grip button again.';
                break;
            case 'trigger-hold': 
                this.controller.addButtonAction('triggerstart', 'remote-control', () => {
                    if (this.fsm.is('IDLE')) this.fsm.activateRemoteControl();
                })

                this.controller.addButtonAction('triggerend', 'remote-control', () => {
                    if (this.fsm.is('REMOTE_CONTROL')) this.fsm.deactivateRemoteControl();
                })
                this.modeInstructions = 'Activate: Squeeze and hold the trigger.\nDeactivate: Release the trigger.';
                break;
            case 'trigger-toggle':
                this.controller.addButtonAction('trigger', 'remote-control', () => {
                    if (this.fsm.is('IDLE')) {
                        this.fsm.activateRemoteControl();
                    } else if (this.fsm.is('REMOTE_CONTROL')) {
                        this.fsm.deactivateRemoteControl();
                    }
                })
                this.modeInstructions = 'Activate: Squeeze the trigger.\nDeactivate: Squeeze the trigger again.';
                break;
            default: 
                break;
        }
    }

    reset() {
        if (this.fsm.is('REMOTE_CONTROL')) this.fsm.deactivateRemoteControl();
    }

    update(t, info) {
        if (this.fsm.is('REMOTE_CONTROL')) {
            const deltaPosi = new T.Vector3(); 
            deltaPosi.subVectors(info.ctrlPose.posi, info.prevCtrlPose.posi)
            window.goalEERelThree.posi.add(deltaPosi);

            const deltaOri = new T.Quaternion();
            deltaOri.multiplyQuaternions(info.ctrlPose.ori.clone(), info.prevCtrlPose.ori.clone().invert())
            window.goalEERelThree.ori.premultiply(deltaOri);

            this.showOffsetIndicator && this.updateOffsetIndicator(info.currEEAbsThree.posi, window.targetCursor.position);
            updateTargetCursor(window.goalEERelThree);
            updateRobot(window.goalEERelThree);
        }
    }

    // this method should only be called when remote control is active
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
