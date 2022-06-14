import Module from "./Module";
import * as T from 'three';
import { getCtrlPose, getCurrEEPose, updateTargetCursor, updateRobot, resetRobot } from '../utils';


export class RemoteControl extends Module {
    constructor(params, options = {}) {
        super(params);
        Object.assign(this, params);
        this.name = 'RemoteControl'

        this.showOffsetIndicator = options.showOffsetIndicator ?? true;
        this.showInstructions = options.showInstructions ?? false;
        this.disabled = false;

        this.instructions = this.ui.createContainer('remote-control-instructions', {
            height: .4,
            width: .5,
            backgroundOpacity: 0,
        });
        this.instructions.appendChild(this.ui.createText('To activate remote control, click the trigger on your controller', { fontSize: 0.025 }));

        //

        const fsmConfig = this.fsmConfig;

        fsmConfig.transitions.push({ name: 'activateRemoteControl', from: 'IDLE', to: 'REMOTE_CONTROL' });
        fsmConfig.transitions.push({ name: 'deactivateRemoteControl', from: 'REMOTE_CONTROL', to: 'IDLE' });

        fsmConfig.methods['onActivateRemoteControl'] = () => {
            if (this.disabled) return;

            if (this.showInstructions) {
                this.instructions.hide();
                this.instructions = this.ui.createContainer('drag-control-deactivate-instructions', { height: .4, width: .5, backgroundOpacity: 0 });
                this.instructions.appendChild(this.ui.createText('To deactivate remote control, squeeze the trigger on your controller', { fontSize: 0.025 }));
                this.instructions.show();
            }
        };

        fsmConfig.methods['onDeactivateRemoteControl'] = () => {
            if (this.disabled) return;
            if (this.showInstructions) {
                this.instructions.hide();
                this.showInstructions = false;
            }

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

        if (this.showInstructions) {
            if (!this.instructions.visible) this.instructions.show();
            this.instructions.getObject().position.copy(data.ctrlPose.posi.clone().add(new T.Vector3(0, 0.2, 0)));
            this.instructions.getObject().lookAt(window.camera.position);
        }

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
