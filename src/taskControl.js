import PickAndPlaceStatic from "./tasks/PickAndPlaceStatic"
import PickAndPlaceDynamic from "./tasks/PickAndPlaceDynamic"
import PickAndPlaceMoving from "./tasks/PickAndPlaceMoving"
import * as T from 'three'

import {
    getBrowser, threejsVector3ToMathjsMat,
} from "./utils.js";

export class TaskControl {
    constructor(options) {
        this.scene = options.scene
        this.browser = getBrowser();
        this.task = new PickAndPlaceDynamic({ scene: this.scene });
        this.camera = options.camera;
        this.round = 0;

        document.querySelector('#tasks-select').addEventListener('change', (e) => {
            switch(e.target.value) {
                case 'PickAndPlaceStatic':
                    this.task.reset();
                    this.task = new PickAndPlaceStatic({ scene: this.scene });
                    break;
                case 'PickAndPlaceDynamic':
                    this.task.reset();
                    this.task = new PickAndPlaceDynamic({ scene: this.scene });
                    break;
                case 'PickAndPlaceMoving':
                    this.task.reset();
                    this.task = new PickAndPlaceMoving({ scene: this.scene });
                    break;
                default:
                    break;
            }

            this.init();
        });
    }

    finishRound() {
        this.task.reset();

        if (this.round < this.task.rounds.length - 1) {
            this.round++;
            this.task.setRound(this.round);
        } else {
            this.task.finished = true;
            alert('All tasks are completed');
        }
    }

    // pubTaskPrepare() {
    //     this.study.pubTaskPrepare();
    // }

    // pubRound() {
    //     let that = this;
    //     this.study.removeBricks();
    //     this.study.bricks = [];
    
    //     this.rounds[this.round - 1].forEach((brick) => {
    //         this.study.bricks.push(brick);
    //     });

    //     this.study.pubTaskPrepare();
    // }

    init() {
        this.round = 0
        // this.pubRound();
        this.task.setRound(this.round);
        // this.pubTaskPrepare();
        // this.camera.position.set(2, 1.5, 0);
        // this.camera.lookAt(new T.Vector3(0, 1.5, 0));
    }

    // this is called about every 5 ms
    update(ee_pose) {
        if (!this.task.finished) this.task.update(ee_pose);
    }
}