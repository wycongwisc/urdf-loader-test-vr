
/**
 * Abstract Class Task
 */
export default class Task {
    constructor() {
        if (this.constructor == Task) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    update() {
        throw new Error("Method 'update()' must be implemented");
    }

    destruct() {
        throw new Error("Method 'destruct()' must be implemented");
    }
}