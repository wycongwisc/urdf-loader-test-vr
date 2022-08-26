import { v4 as id } from 'uuid';

export default class SceneObject {
    static async init(params) { 
        throw new Error('Override this method') 
    }

    constructor(name, utilities) { 
        this.name = name;
        
        Object.assign(this, utilities);

        this.id = id();
    }

    set() {
        throw new Error('Override this method') 
    }

    load() {
        throw new Error('Override this method') 
    }

    destruct() {
        throw new Error('Override this method') 
    }

    update() { }
}