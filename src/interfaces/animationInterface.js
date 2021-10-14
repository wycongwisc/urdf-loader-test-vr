import { parseCSV, lerp, fetchFromURL } from '../helpers';
import { animateRobot } from '../robotFunctions/animateRobot';
import { Vector3 } from 'three';
import { Line3D } from '../3dLine';
import { JointInterface } from './jointInterface';
import { FileUploader, Select, Checkbox, Button, Slider, Container, TextInput } from '../ui/pageElements';

export class AnimationInterface {
    constructor(robot, scene, interfaces) {

        this.animationSpeeds = [-0.004 ,-0.002, -0.001, -0.0005, -0.00025, 0, 0.00025, 0.0005, 0.001, 0.002, 0.004];
        this.speedIndex = 5;
        this.robot = robot;
        this.scene = scene;
        this.allAnimations = [];
        this.currAnimationTable = [];
        this.inBetweenFrames = 1;
        this.interfaces = interfaces;

        let domElement = "bottomDiv"
        this.loader = new FileUploader("Upload Animation", domElement, [".csv", ".rmoo"]);
        this.animationPicker = new Select("Pick Animation File", domElement, []);
        this.topHalf = new Container("checkBlock", domElement);
        this.speedSlider = new Slider("Animation Speed", domElement, 0, this.animationSpeeds.length - 1, 1, this.speedIndex);
        this.loopCheck = new Checkbox("loop", domElement, true);
        this.playCheck = new Checkbox("play", domElement, false);
        this.urlInput = new TextInput("Animation URL", domElement);
        this.loadURL = new Button("Load", domElement, () => {
            fetchFromURL(this.urlInput.textInput.value, (blob) => {
                let linkText = this.urlInput.textInput.value;
                let fileName = linkText.substring(linkText.lastIndexOf("/") + 1,linkText.lastIndexOf("."));
                parseCSV(blob, (data) => {
                    createAnimationTable(data, fileName)
                });
            });
        })
        this.topHalf.addBlock(this.speedSlider, this.loopCheck, this.playCheck, this.loader, this.urlInput, this.loadURL, this.animationPicker);
        this.animationSlider = new Slider("Animation Time", domElement, 0, 1, this.animationSpeeds[this.speedIndex+1], 0);


        let createAnimationTable = (data, name = "") => {
            let table = [];
            data.forEach(config => {
                table.push(config);
            })
            let lastRow = table[table.length - 1];
            let endTime = lastRow[0];
            if (lastRow.length == 1) {
                table.pop();
                endTime = table[table.length - 1][0];
            }
            this.allAnimations.push(table);
            let optionName;
            if(name == "") {
                optionName = this.loader.getFiles()[0].name;
            } else {
                optionName = name;
            }
            this.animationPicker.addOption([optionName, table]);
            if(this.currAnimationTable.length == 0) {
                this.currAnimationTable = table;
            }
        }
        this.loader.fileUploader.onchange = () => {
            if (this.loader.getFiles().length > 0) {
                parseCSV(this.loader.getFiles()[0], createAnimationTable);
            }
        }

        this.animationPicker.select.onchange = () => {
            this.currAnimationTable = this.allAnimations[this.animationPicker.getSelectedIndex()];
        }

        this.speedSlider.label.innerHTML = "Animation Speed: Paused";
        this.speedSlider.slider.oninput = () => {
            this.speedIndex = this.speedSlider.slider.value;
            this.speedSlider.label.innerHTML = "Animation Speed: " + String(this.animationSpeeds[this.speedIndex]);
            if (this.animationSpeeds[this.speedIndex] == 0) {
                this.speedSlider.label.innerHTML = "Animation Speed: Paused";
            }
        }

        this.animationSlider.slider.oninput = () => {
            if(this.currAnimationTable.length == 0) {
                return;
            }
            let endTime = this.currAnimationTable[this.currAnimationTable.length - 1][0];
            let time = this.animationSlider.slider.value * endTime;
            this.animationSlider.label.innerHTML = "Animation Time: " + String(time);
            animateRobot(time, this.robot, this.currAnimationTable);
            this.interfaces.joints.updateSliders(this.robot);
            this.interfaces.lines.updateLine();
        }

        this.prerenderLineButton = new Button("Prerender Line", "bottomDiv", () => {
            if(this.currAnimationTable.length == 0) {
                console.log("No Animations Loaded");
                return;
            }
            this.interfaces.lines.createNewLine();
            let saveTime = this.getCurrentTime();
            let table = this.currAnimationTable;
            let prevTime = 0;
            let endTime = table[table.length - 1][0];
            let x = table.length / 5;
            for (let i = 0; i < x; i++) {
                let t = lerp(prevTime, endTime, i / x);
                animateRobot(t, robot, table);
                this.interfaces.lines.updateLine();
            }
            this.interfaces.lines.endCurrentLine();
            animateRobot(saveTime, robot, table);
        });
        this.topHalf.addBlock(this.prerenderLineButton);
    }

    animateSlider() {
        let inc = this.animationSpeeds[this.speedIndex];
        if (this.playCheck.checkbox.checked && inc != 0 && this.currAnimationTable.length > 0) {
            let endTime = this.currAnimationTable[this.currAnimationTable.length - 1][0];
            console.log(endTime);
            let prevTime = Number(this.animationSlider.slider.value);
            let nextTime = (Number(this.animationSlider.slider.value) + inc) % 1;
            if(!this.loopCheck.checkbox.checked) {
                if((nextTime < prevTime && inc > 0) || (nextTime > prevTime && inc < 0)) {
                    return;
                }
            }
            this.animationSlider.slider.value = nextTime;
            let currTime = this.animationSlider.slider.value * endTime;
            this.animationSlider.label.innerHTML = "Animation Time: " + String(currTime);
            if (this.interfaces.lines.getCurrentLine()) {
                for (let i = 0; i < this.inBetweenFrames; i++) {
                    let t = lerp(prevTime * endTime, currTime, i / this.inBetweenFrames);
                    animateRobot(t, this.robot, this.currAnimationTable);
                    this.interfaces.lines.updateLine();
                }
            }
            this.interfaces.joints.updateSliders();
            animateRobot(currTime, this.robot, this.currAnimationTable);
        }
    }

    setFocusJoint(newJoint) {
        this.focusJoint = newJoint;
    }

    getAnimationTable() {
        return this.currAnimationTable;
    }

    getCurrentTime() {
        return this.animationSlider.slider.value;
    }

    hideUI() {
        this.topHalf.removeDiv();
        this.animationSlider.removeDiv();
    }

    showUI() {
        this.topHalf.addDiv();
        this.animationSlider.addDiv();
    }
}