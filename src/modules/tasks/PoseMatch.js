import * as T from 'three';
import Task from './Task'
import GripperGoal from './objects/GripperGoal';
import { recursiveSearch } from '../../utils';
import { Vector3 } from 'three';
import { Euler } from 'three';

export default class PoseMatch extends Task {
    constructor(params, options = {}) {
        super({
            name: 'pose-match',
            ui: params.ui,
            data: params.data,
        }, {
            numRounds: options.numRounds,
            disableModules: options.disableModules 
        });

        this.rounds = [
            {
                goal: new GripperGoal({ 
                    position: new Vector3(1, 1, 0),
                    rotation: new Euler(0, Math.PI/2, Math.PI/2, 'XYZ')
                })
            },
            {
                goal: new GripperGoal({
                    position: new Vector3(.5, 1, .5),
                    rotation: new Euler(0, 0, Math.PI/4, 'XYZ')
                })
            },
            {
                goal: new GripperGoal({
                    position: new Vector3(.5, 1, -.5),
                    rotation: new Euler(Math.PI/3, Math.PI/2, 0, 'XYZ')
                })
            }
        ];

    }

    update(t, data) {
        if (this.fsm.is('COMPLETE')) return;
        
        const round = this.round;
        const goal = round.goal;

        // https://gamedev.stackexchange.com/questions/75072/how-can-i-compare-two-quaternions-for-logical-equality
        if (
            data.currEEAbsThree.posi.distanceTo(goal.mesh.position) < 0.02
            && Math.abs(data.currEEAbsThree.ori.dot(goal.mesh.quaternion)) > 1 - .02
        ) {
            this.fsm.next();
        }
    }

    log(t) {
        const goal = this.round.goal.mesh;

        this.data.log(t, [
            this.id,
            this.fsm.state,
            goal.position.x + ' ' + goal.position.y + ' ' + goal.position.z + ' ',
            goal.quaternion.x + ' ' + goal.quaternion.y + ' ' + goal.quaternion.z + ' ' + goal.quaternion.w
        ], this.name);
    }
}