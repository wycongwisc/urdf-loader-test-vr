
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

    init(num) {
        throw new Error("Method 'init' must be implemented");
    }

    clearRound() {
        throw new Error("Method 'clearRound()' must be implemented");
    }

    displayRound() {
        throw new Error("Method 'displayRound()' must be implemented");
    }

}