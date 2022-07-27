import Task from './Task'
import * as T from 'three';

export default class GraspingTutorial extends Task {
    constructor(params, options = {}) {
        super({
            name: 'grasping-tutorial',
            ui: params.ui,
            controller: params.controller
        }, {
            numRounds: 2,
            disableModules: options.disableModules
        });

        this.hand = params.hand;

        this.rounds = [
            {
                instruction: this.ui.createContainer(
                    'grasping-open-instructions', 
                    { height: .4, width: .5, backgroundOpacity: 0 }
                ).appendChild(
                    this.ui.createText(
                        `To open the gripper, hold ${this.hand === 'left' ? '(Y)' : '(B)'}`,
                        { fontSize: 0.025 }
                    )
                )
            },
            {
                instruction: this.ui.createContainer(
                    'grasping-close-instructions', 
                    { height: .4, width: .5, backgroundOpacity: 0 }
                ).appendChild(
                    this.ui.createText(
                        `To close the gripper, hold ${this.hand === 'left' ? '(X)' : '(A)'}`, 
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

        if (this.controller.gamepad?.buttons[5].pressed && this.fsm.is('1')) {
            this.fsm.next();
        }

        if (this.controller.gamepad?.buttons[4].pressed && this.fsm.is('2')) {
            this.fsm.next();
        }
    }
}