import { Brick, PickAndPlaceBricksTabletop } from "./tasks/pickAndPlace"

import {
    getBrowser,
} from "./utils.js";

export class TaskManager {
    constructor(options) {
        this.scene = options.scene
        this.browser = getBrowser();
        this.study = new PickAndPlaceBricksTabletop({ scene: this.scene });
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
                this.study.bricks.push(new Brick( 
                    new THREE.Vector3(0.4, -0.1, 0.79), 0, 
                    new THREE.Vector3(0.3, 0.4, 0.75), 0x88dd88, "circle",
                    this.scene
                ));
                break;
            case 2:
                this.study.bricks.push(new Brick( 
                    new THREE.Vector3(0.5, 0.4, 0.79), 0, 
                    new THREE.Vector3(0.2, -0.2, 0.75), 0xdd88dd, "circle",
                    this.scene
                ));
                break;
            case 3:
                this.study.bricks.push(new Brick( 
                    new THREE.Vector3(0.2, -0.2, 0.79), 0, 
                    new THREE.Vector3(0.5, 0.3, 0.75), 0xdddd88, "circle",
                    this.scene
                ));
                break;
            case 4:
                this.study.bricks.push(new Brick( 
                    new THREE.Vector3(0.3, 0.4, 0.79), 0, 
                    new THREE.Vector3(0.2, -0.2, 0.75), 0xdddd88, "circle",
                    this.scene
                ));
                break;
            case 5:
                this.study.bricks.push(new Brick( 
                    new THREE.Vector3(0.4, -0.2, 0.79), 0, 
                    new THREE.Vector3(0.3, 0.3, 0.75), 0xdddd88, "circle",
                    this.scene
                ));
                break;
            default:
                console.log("unknown round number " + this.round);
        }

        this.pubTaskPrepare();
    }

    init() {
        this.study.init();
        this.pubTaskPrepare();
    }
}