import Task from './Task'
import * as T from 'three';

export default class RemoteControlTutorial extends Task {
    static async init(params, condition, options = {}) {
        const task = new RemoteControlTutorial(params, condition, { numRounds: 2, resetAfterTrial: false });
        task.objects = {}
        return task;
    }

    constructor(params, condition, options) {
        super('remote-control-tutorial', params, condition, options, [
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
        this.activateInstructions = this.ui.createContainer('remote-control-activate-instructions', { 
            height: .4, width: .5, backgroundOpacity: 0 
        });
        this.activateInstructions.appendChild(
            this.ui.createText('To activate remote control, press the grip button.', { fontSize: 0.025 })
        );

        this.deactivateInstructions = this.ui.createContainer('remote-control-deactivate-instructions', { 
            height: .4, width: .5, backgroundOpacity: 0 
        });
        this.deactivateInstructions.appendChild(
            this.ui.createText('To deactivate remote control, press the grip button again.', { fontSize: 0.025 })
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

        if (this.condition?.fsm.is('REMOTE_CONTROL') && this.fsm.is('0')) {
            this.fsm.next();
        }

        if (this.condition?.fsm.is('IDLE') && this.fsm.is('1')) {
            this.fsm.next();
        }
    }
}