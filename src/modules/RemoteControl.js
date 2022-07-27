import Module from "./Module";
import * as T from 'three';
import { getCtrlPose, getCurrEEPose, updateTargetCursor, updateRobot, resetRobot } from '../utils';


export class RemoteControl extends Module {
    constructor(params, options = {}) {
        super({
            name: 'remote-control'
        });
        Object.assign(this, params);

        this.showOffsetIndicator = options.showOffsetIndicator ?? true;
        this.disabled = false;

        //

        const fsmConfig = this.fsmConfig;

        fsmConfig.transitions.push({ name: 'activateRemoteControl', from: 'IDLE', to: 'REMOTE_CONTROL' });
        fsmConfig.transitions.push({ name: 'deactivateRemoteControl', from: 'REMOTE_CONTROL', to: 'IDLE' });

        fsmConfig.methods['onActivateRemoteControl'] = () => {
            if (this.disabled) return;
        };

        fsmConfig.methods['onDeactivateRemoteControl'] = () => {
            if (this.disabled) return;

            window.scene.remove(this.offsetIndicator);
            window.targetCursor.material.color.setHex(0xFFFFFF);
        };

        //

        const eventConfig = this.eventConfig;

        eventConfig['select'].push(() =>{
            if (this.disabled) return;

            if (this.fsm.is('IDLE')) {
                this.fsm.activateRemoteControl();
                return true;
            }

            if (this.fsm.is('REMOTE_CONTROL')) {
                this.fsm.deactivateRemoteControl();
                return true;
            }
        })
    }

    disable() {
        console.log('disable remote control')
        if (this.fsm.is('REMOTE_CONTROL')) {
            this.fsm.deactivateRemoteControl();
        }
        this.disabled = true;
    }

    enable() {
        this.disabled = false;
    }

    update(t, data) {
        if (this.disabled) return;

        if (this.fsm.is('REMOTE_CONTROL')) {
            const deltaPosi = new T.Vector3(); 
            deltaPosi.subVectors(data.ctrlPose.posi, data.prevCtrlPose.posi)
            window.goalEERelThree.posi.add(deltaPosi);

            const deltaOri = new T.Quaternion();
            deltaOri.multiplyQuaternions(data.ctrlPose.ori.clone(), data.prevCtrlPose.ori.clone().invert())
            window.goalEERelThree.ori.premultiply(deltaOri);

            this.showOffsetIndicator && this.updateOffsetIndicator(data.currEEAbsThree.posi, window.targetCursor.position);
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
