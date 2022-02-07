import PickAndPlace from "./tasks/PickAndPlace"
import state from "javascript-state-machine"
import * as T from 'three'

export class TaskControl {
    constructor(params) {
        this.scene = params.scene
        this.camera = params.camera;

        this.state = new state({
            init: 'inactive',
            transitions: [
                { name: 'stop', from: 'active', to: 'inactive'},
                { name: 'start', from: 'inactive', to: 'active'}
            ],
            methods: {
                onStop: function() { alert("Finished all tasks!") },
                onStart: function(e, task) { task.init() }
            }
        })

        this.task = new PickAndPlace({ scene: this.scene, state: this.state });
        
        this.state.start(this.task);
    }

    finishRound() {
        this.task.clearRound();

        if (this.task.currRound < this.task.rounds.length - 1) {
            this.task.currRound++;
            this.task.displayRound();
        } else {
           this.state.stop();
        }
    }

    // this is called in relaxedikDemo.js about every 5 ms
    update(ee_pose) {
        if (this.state.is('active')) this.task.update(ee_pose);
    }
}