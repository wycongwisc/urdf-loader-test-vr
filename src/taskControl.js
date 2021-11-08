import { Brick, PickAndPlaceBricksTabletop } from "./tasks/pickAndPlace"
import * as T from 'three'

import {
    getBrowser, threejsVector3ToMathjsMat,
} from "./utils.js";

export class TaskControl {
    constructor(options) {
        this.scene = options.scene
        this.browser = getBrowser();
        this.study = new PickAndPlaceBricksTabletop({ scene: this.scene });
        this.camera = options.camera;

    }

    pubTaskPrepare() {
        this.study.pubTaskPrepare();
    }

    pubRound() {
        let that = this;
        this.study.removeBricks();
        this.study.bricks = [];
        switch (this.round) {
            case 1:
                this.study.bricks.push(new Brick({
                    init_posi: new T.Vector3(0.4, -0.1, 0.79),
                    init_angle: 0,
                    target_posi: new T.Vector3(0.3, 0.4, 0.75),
                    color: 0x88dd88,
                    target_object: "circle",
                    scene: this.scene
                }));
                break;
            // case 2:
            //     this.study.bricks.push(new Brick( 
            //         new T.Vector3(0.5, 0.4, 0.79), 0, 
            //         new T.Vector3(0.2, -0.2, 0.75), 0xdd88dd, "circle",
            //         this.scene
            //     ));
                
            //     break;
            // case 3:
            //     this.study.bricks.push(new Brick( 
            //         new T.Vector3(0.2, -0.2, 0.79), 0, 
            //         new T.Vector3(0.5, 0.3, 0.75), 0xdddd88, "circle",
            //         this.scene
            //     ));
            //     break;
            // case 4:
            //     this.study.bricks.push(new Brick( 
            //         new T.Vector3(0.3, 0.4, 0.79), 0, 
            //         new T.Vector3(0.2, -0.2, 0.75), 0xdddd88, "circle",
            //         this.scene
            //     ));
            //     break;
            // case 5:
            //     this.study.bricks.push(new Brick( 
            //         new T.Vector3(0.4, -0.2, 0.79), 0, 
            //         new T.Vector3(0.3, 0.3, 0.75), 0xdddd88, "circle",
            //         this.scene
            //     ));
            //     break;
            default:
                console.log("unknown round number " + this.round);
        }

        this.pubTaskPrepare();
    }

    init() {
        this.study.init();
        this.round = 1
        this.pubTaskPrepare();
        this.pubRound();
        // this.camera.position.set(2, 1.5, 0);
        // this.camera.lookAt(new T.Vector3(0, 1.5, 0));
    }
}