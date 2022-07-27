import Module from "./Module";
import * as T from 'three';
import { getCtrlPose, getCurrEEPose, updateTargetCursor, updateRobot, resetRobot } from '../utils';

export class DragControl extends Module {
    constructor(params, options = {}) {
        super({
            name: 'drag-control'
        });
        Object.assign(this, params);

        this.activationRadius = options.activationRadius ?? 0.1;
        this.showOffsetIndicator = options.showOffsetIndicator ?? true;
        this.disabled = false;
        //

        const fsmConfig = this.fsmConfig;

        fsmConfig.transitions.push({ name: 'activateDragControl', from: 'IDLE', to: 'DRAG_CONTROL' });
        fsmConfig.transitions.push({ name: 'deactivateDragControl', from: 'DRAG_CONTROL', to: 'IDLE' });

        fsmConfig.methods['onActivateDragControl'] = () => {
            window.controllerGrip.traverse((child) => { if (child instanceof T.Mesh) child.visible = false });
        }

        fsmConfig.methods['onDeactivateDragControl'] = () => {
            if (this.disabled) return;

            window.controllerGrip.traverse((child) => { if (child instanceof T.Mesh) child.visible = true });
            window.targetCursor.material.color.setHex(0xFFFFFF);
            window.scene.remove(this.offsetIndicator);
            this.dragTimeout = true;
            setTimeout(() => this.dragTimeout = false, 1000);
        }

        //

        const eventConfig = this.eventConfig;

        eventConfig['select'].push(() => {
            if (this.disabled) return;

            if (this.fsm.is('DRAG_CONTROL')) {
                this.fsm.deactivateDragControl();
                return true;
            }
        })
    }

    disable() {
        if (this.fsm.is('DRAG_CONTROL')) {
            this.fsm.deactivateDragControl();
        }
        this.disabled = true;
    }

    enable() {
        this.disabled = false;
    }

    update(t, data) {
        if (this.disabled) return;

        if (this.fsm.is('IDLE') && !this.dragTimeout) {
            if (data.ctrlPose.posi.distanceTo(data.currEEAbsThree.posi) <= this.activationRadius) {
                this.fsm.activateDragControl();
            }
        }

        if (this.fsm.is('DRAG_CONTROL')) {

            const deltaPosi = new T.Vector3();
            deltaPosi.subVectors(data.ctrlPose.posi, window.initEEAbsThree.posi)
            window.goalEERelThree.posi.copy(deltaPosi);

            const deltaOri = new T.Quaternion();
            deltaOri.multiplyQuaternions(data.ctrlPose.ori, data.prevCtrlPose.ori.invert())
            window.goalEERelThree.ori.premultiply(deltaOri);

            this.showOffsetIndicator && this.updateOffsetIndicator(data.currEEAbsThree.posi, window.targetCursor.position);
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
