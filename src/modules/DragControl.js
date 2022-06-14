import Module from "./Module";
import * as T from 'three';
import { getCtrlPose, getCurrEEPose, updateTargetCursor, updateRobot, resetRobot } from '../utils';

export class DragControl extends Module {
    constructor(params, options = {}) {
        super(params);
        Object.assign(this, params);
        this.name = 'DragControl'

        this.activationRadius = options.activationRadius ?? 0.1;
        this.showOffsetIndicator = options.showOffsetIndicator ?? true;
        this.showInstructions = options.showInstructions ?? false;
        this.disabled = false;

        this.instructions = this.ui.createContainer('drag-control-activate-instructions', { height: .4, width: .5, backgroundOpacity: 0 });
        this.instructions.appendChild(this.ui.createText('To activate drag control, move your controller to the robot\'s end effector', { fontSize: 0.025 }));

        //

        const fsmConfig = this.fsmConfig;

        fsmConfig.transitions.push({ name: 'activateDragControl', from: 'IDLE', to: 'DRAG_CONTROL' });
        fsmConfig.transitions.push({ name: 'deactivateDragControl', from: 'DRAG_CONTROL', to: 'IDLE' });

        fsmConfig.methods['onActivateDragControl'] = () => {
            window.controllerGrip.traverse((child) => { if (child instanceof T.Mesh) child.visible = false });
            if (this.showInstructions) {
                this.instructions.hide();
                this.instructions = this.ui.createContainer('drag-control-deactivate-instructions', { height: .4, width: .5, backgroundOpacity: 0 });
                this.instructions.appendChild(this.ui.createText('To deactivate drag control, squeeze the trigger on your controller', { fontSize: 0.025 }));
                this.instructions.show();
            }
        }

        fsmConfig.methods['onDeactivateDragControl'] = () => {
            if (this.disabled) return;

            if (this.showInstructions) {
                this.instructions.hide();
                this.showInstructions = false;
            }
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

        if (this.showInstructions) {
            if (!this.instructions.visible) this.instructions.show();
            this.instructions.getObject().position.copy(data.currEEAbsThree.posi.clone().add(new T.Vector3(0, 0.2, 0)));
            this.instructions.getObject().lookAt(window.camera.position);
        }

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
