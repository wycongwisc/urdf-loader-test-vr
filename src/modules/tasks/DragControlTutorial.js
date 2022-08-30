import Task from './Task'
import * as T from 'three';

export default class DragControlTutorial extends Task {
    static async init(params, condition, options = {}) {
        const task = new DragControlTutorial(params, condition, { numRounds: 2, resetAfterTrial: false });
        task.objects = {}
        return task;
    }

    constructor(params, condition, options) {
        super('drag-control-tutorial', params, condition, options, [
            () => {
                this.activateInstructions.show();
            },
            () => {
                this.activateInstructions.hide();
                this.deactivateInstructions.show();
            }
        ]);
    }

    onStart() {
        this.activateInstructions = this.ui.createContainer('drag-control-activate-instructions', { 
            height: .4, width: .5, backgroundOpacity: 0 
        });
        this.activateInstructions.appendChild(
            this.ui.createText('To activate drag control, move your controller to the robot\'s end effector and press the grip button.', { fontSize: 0.025 })
        );

        this.deactivateInstructions = this.ui.createContainer('drag-control-deactivate-instructions', { 
            height: .4, width: .5, backgroundOpacity: 0 
        });
        this.deactivateInstructions.appendChild(
            this.ui.createText('To deactivate drag control, press the grip button again.', { fontSize: 0.025 })
        );
    }

    onStop() {
        this.activateInstructions.hide()
        this.deactivateInstructions.hide();
    }

    onUpdate(t, info) {
        this.activateInstructions.getObject().position.copy(info.currEEAbsThree.posi.clone().add(new T.Vector3(0, 0.2, 0)));
        this.activateInstructions.getObject().lookAt(window.camera.position);

        this.deactivateInstructions.getObject().position.copy(info.currEEAbsThree.posi.clone().add(new T.Vector3(0, 0.2, 0)));
        this.deactivateInstructions.getObject().lookAt(window.camera.position);

        if (this.condition?.fsm.is('DRAG_CONTROL') && this.fsm.is('0')) {
            this.fsm.next();
        }

        if (this.condition?.fsm.is('IDLE') && this.fsm.is('1')) {
            this.fsm.next();
        }
    }
}