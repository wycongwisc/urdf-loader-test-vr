import ThreeMeshUI from 'three-mesh-ui'
import * as T from 'three'
import Container from './ui/Container'
import Element from './ui/Element'
import Text from './ui/Text'
import Button from './ui/Button'

export class UI {
    constructor() {
        this.FONT_FAMILY = (location.hostname === 'localhost') ? 
            './assets/Roboto-msdf.json' : '/urdf-loader-test-vr/assets/Roboto-msdf.json';
        this.FONT_TEXTURE = (location.hostname === 'localhost') ? 
            './assets/Roboto-msdf.png' : '/urdf-loader-test-vr/assets/Roboto-msdf.png';

        this.elements = [];
    }

    createContainer(name, options = {}) {
        const container = new Container(name, options);
        this.elements.push(container)
        return container;
    }

    createText(content, options = {}) {
        const text = new Text(content, options);
        this.elements.push(text)
        return text;
    }

    createButton(content, options = {}) {
        const button = new Button(content, options);
        this.elements.push(button)
        return button;
    }

    update(raycaster, isSelect) {
        const intersect = this.raycast(raycaster);
        if (intersect && intersect.object.isUI) {
            intersect.object.setState(isSelect ? 'selected' : 'hovered');
            return true;
        }

        this.elements.forEach((element) => {
            if (
                element instanceof Button
                && (!intersect || element.object !== intersect.object)
                && element.object.isUI
            ) {
                element.object.setState('idle');
            }
        })
        return false;
    }

    raycast(raycaster) {
        const buttons = this.elements.filter((element) => element instanceof Button).map((element) => element.object)
        return buttons.reduce((closestIntersection, obj) => {
            const intersection = raycaster.intersectObject(obj, true);
            if (!intersection[0]) return closestIntersection;
            if (!closestIntersection || intersection[0].distance < closestIntersection.distance) {
                intersection[0].object = obj;
                return intersection[0];
            }
            return closestIntersection;
        }, null);
    }
}

