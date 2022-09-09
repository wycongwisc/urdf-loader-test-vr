import Task from '../Task'
import * as T from 'three';
import Grasping from '../../modules/Grasping';

export default class GraspingTutorial extends Task {
    static async init(params, condition, options = {}) {
        const task = new GraspingTutorial(params, condition, { numRounds: 2, resetAfterTrial: false });
        task.objects = {}
        return task;
    }

    constructor(params, condition, options) {
        super('grasping-tutorial', params, condition, options, [
            () => {
                this.closeInstructions.show();
            },
            () => {
                this.closeInstructions.hide();
                this.openInstructions.show();
            }
        ]);
    }

    onStart() {
        this.openInstructions = this.ui.createContainer('grasping-open-instructions', { 
            height: .4, width: .5, backgroundOpacity: 0 
        });
        this.openInstructions.appendChild(
            this.ui.createText('To open the gripper, squeeze the trigger again.', { fontSize: 0.025 })
        );

        this.closeInstructions = this.ui.createContainer('grasping-close-instructions', { 
            height: .4, width: .5, backgroundOpacity: 0 
        });
        this.closeInstructions.appendChild(
            this.ui.createText('To close the gripper, squeeze the trigger', { fontSize: 0.025 })
        );
    }

    onStop() {
        this.closeInstructions.hide()
        this.openInstructions.hide();
    }

    onUpdate(t, info) {
        this.openInstructions.getObject().position.copy(info.currEEAbsThree.posi.clone().add(new T.Vector3(0, 0.2, 0)));
        this.openInstructions.getObject().lookAt(window.camera.position);

        this.closeInstructions.getObject().position.copy(info.currEEAbsThree.posi.clone().add(new T.Vector3(0, 0.2, 0)));
        this.closeInstructions.getObject().lookAt(window.camera.position);

        const grasping = this.condition.modules.find((m) => m instanceof Grasping);

        if (grasping.lastAction === 'close' && this.fsm.is('0')) {
            if (grasping.controlMode === 'trigger-toggle' && !grasping.closed) return;
            this.fsm.next();
        } else if (grasping.lastAction === 'open' && this.fsm.is('1')) {
            if (grasping.controlMode === 'trigger-toggle' && grasping.closed) return;
            this.fsm.next();
        }
    }
}