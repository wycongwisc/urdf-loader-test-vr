import { v4 as id } from 'uuid';

export default class SceneObject {
    static async init(params) { 
        throw new Error('Override this method') 
    }

    constructor(name, params) { 
        this.name = name;
        
        Object.assign(this, params);

        this.id = id();
    }

    set(init) {
        if (this.loaded) this.destruct();

        this.initPosition = init.position ?? this.initPosition;
        this.initRotation = init.rotation ?? this.initRotation;
        this.initScale = init.scale ?? this.initScale;

        for (const mesh of this.meshes) {
            mesh.position.copy(this.initPosition);
            mesh.rotation.copy(this.initRotation);
            mesh.scale.copy(this.initScale);
        }

        this.load();
    }

    load() {
        throw new Error('Override this method') 
    }

    destruct() {
        throw new Error('Override this method') 
    }
    

    update() { }

    getState() {
        const state = [];
        for (const mesh of this.meshes) {
            state.push({
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
            });
        }
        return state;
    }
}