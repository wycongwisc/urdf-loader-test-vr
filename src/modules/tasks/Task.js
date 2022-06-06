import * as T from 'three';
import { v4 as id } from 'uuid'
import Module from "../Module";

/**
 * Abstract Class Task
 */
export default class Task extends Module {
    constructor(params = {}) {
        super(params);
        this.name = params.name;
        this.data = params.data;
        this.ui = params.ui;

        this.id = id();
        this.clock = new T.Clock({ autoStart: false });
    }

    setFSM(fsm) { 
        return;
    }
}