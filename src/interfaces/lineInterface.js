import * as T from 'three';
import { Line3D } from "../3dLine";
import { FileUploader, Select, Checkbox, Button, Slider, Container, TextInput } from '../ui/pageElements';
import { animateRobot } from '../robotFunctions/animateRobot';

export class LineInterface {
    constructor(scene, interfaces) {

        this.scene = scene;
        this.allLines = [];
        this.currLine;
        this.newLineButton;
        this.clearAllLinesButton;
        this.interfaces = interfaces;
        this.focusJoint;

        this.newLineButton = new Button("Create New Line", "lineDiv", () => {
            this.createNewLine();
        })
        this.clearAllLinesButton = new Button("Clear All Lines", "lineDiv", () => {
            this.currLine = null;
            this.allLines.forEach(group => {
                group.line.clearLine();
                group.endButton.removeDiv();
            })
        });
    }

    createNewLine() {
        let color = new T.Color(Math.random(), Math.random(), Math.random());
        let line = new Line3D(this.scene, this.interfaces.robot.getRobot(), color);
        let lineGroup;
        let endButton = new Button("Stop Drawing", "lineDiv", () => {
            let index = this.allLines.indexOf(lineGroup);
            if (this.allLines[index].isDrawing) {
                this.allLines[index].endButton.button.innerHTML = "Delete Line"
                this.allLines[index].isDrawing = false;
                this.currLine = null;
            }
            else {
                this.allLines.splice(index, 1);
                line.clearLine();
                endButton.removeDiv();
            }
        })
        endButton.button.style.background = color.getStyle();
        lineGroup = {
            line: line,
            endButton: endButton,
            isDrawing: true
        }
        this.allLines.forEach(group => {
            group.endButton.button.innerHTML = "Delete Line";
            group.isDrawing = false;
        })
        this.allLines.push(lineGroup)
        this.currLine = line;
    }

    getCurrentLine() {
        return this.currLine;
    }

    getAllLineMeshes() {
        return this.allLines.map(group => group.line.mesh).filter(mesh => mesh != null);
    }

    getAllLines() {
        return this.allLines;
    }

    updateLine() {
        // if(this.currLine && !(this.endEffectorPosition.x == 0 && this.endEffectorPosition.y == 0  && this.endEffectorPosition.z == 0)) {
        //     this.currLine.updateLine(this.endEffectorPosition.clone());
        // }
        if(this.currLine) {
            this.currLine.updateLine(this.interfaces.robot.getFocusJoint().getWorldPosition(new T.Vector3()));
        }
    }

    endCurrentLine() {
        this.allLines.forEach(group => {
            group.endButton.button.innerHTML = "Delete Line";
            group.isDrawing = false;
        })
        this.currLine = null;
    }
}