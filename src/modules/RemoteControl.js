import Module from "./Module";
import * as T from 'three';
import { getCtrlPose, getCurrEEPose, updateTargetCursor, updateRobot, resetRobot } from '../utils';


export class RemoteControl extends Module {
    constructor(params, options = {}) {
        super(params);
        Object.assign(this, params);

        this.showOffsetIndicator = options.showOffsetIndicator ?? true;

        //

        const fsmConfig = this.fsmConfig;

        fsmConfig.transitions.push({ name: 'activateRemoteControl', from: 'IDLE', to: 'REMOTE_CONTROL' });
        fsmConfig.transitions.push({ name: 'deactivateRemoteControl', from: 'REMOTE_CONTROL', to: 'IDLE' });

        fsmConfig.methods['onActivateRemoteControl'] = () => {};

        fsmConfig.methods['onDeactivateRemoteControl'] = () => {
            window.scene.remove(this.offsetIndicator);
            window.targetCursor.material.color.setHex(0xFFFFFF);
        };

        //

        const eventConfig = this.eventConfig;

        eventConfig['select'].push(() =>{
            if (this.fsm.is('IDLE')) {
                this.fsm.activateRemoteControl();
                return true;
            }

            if (this.fsm.is('REMOTE_CONTROL')) {
                this.fsm.deactivateRemoteControl();
                return true;
            }
        })

        eventConfig['squeeze'].push(() => {
            if (this.fsm.is('REMOTE_CONTROL')) {
                this.fsm.deactivateRemoteControl();
            }
            this.prevCtrlPose = null;
        })
    }

    update(t) {
        const ctrlPose = getCtrlPose();
        const prevCtrlPose = this.prevCtrlPose;
        this.prevCtrlPose = ctrlPose;

        if (this.fsm.is('REMOTE_CONTROL')) {
            const currEEAbsThree = getCurrEEPose();
            const goalEERelThree = window.goalEERelThree;
            
            const deltaPosi = new T.Vector3(); 
            deltaPosi.subVectors(ctrlPose.posi, prevCtrlPose.posi)
            goalEERelThree.posi.add(deltaPosi);

            const deltaOri = new T.Quaternion();
            deltaOri.multiplyQuaternions(ctrlPose.ori.clone(), prevCtrlPose.ori.clone().invert())
            goalEERelThree.ori.premultiply(deltaOri);

            this.showOffsetIndicator && this.updateOffsetIndicator(currEEAbsThree.posi, window.targetCursor.position);
            updateTargetCursor(goalEERelThree);
            updateRobot(goalEERelThree);
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
