import Task from './Task'
import * as T from 'three';

export default class RemoteControlTutorial extends Task {
    constructor(params, options = {}) {
        super({
            name: 'remote-control-tutorial',
            ui: params.ui,
        }, {
            numRounds: 2,
            disableModules: options.disableModules
        });

        this.rounds = [
            {
                instruction: this.ui.createContainer(
                    'remote-control-activate-instructions', 
                    { height: .4, width: .5, backgroundOpacity: 0 }
                ).appendChild(
                    this.ui.createText(
                        'To activate remote control, squeeze the trigger on your controller',
                        { fontSize: 0.025 }
                    )
                )
            },
            {
                instruction: this.ui.createContainer(
                    'remote-control-deactivate-instructions', 
                    { height: .4, width: .5, backgroundOpacity: 0 }
                ).appendChild(
                    this.ui.createText(
                        'To deactivate remote control, squeeze the trigger on your controller again', 
                        { fontSize: 0.025 }
                    )
                )
            }
        ]

    }

    update(t, data) {
        const instruction = this.round.instruction;
        instruction.getObject().position.copy(data.ctrlPose.posi.clone().add(new T.Vector3(0, 0.2, 0)));
        instruction.getObject().lookAt(window.camera.position);

        if (window.fsm.is('REMOTE_CONTROL') && this.fsm.is('1')) {
            this.fsm.next();
        }

        if (window.fsm.is('IDLE') && this.fsm.is('2')) {
            this.fsm.next();
        }
    }
}