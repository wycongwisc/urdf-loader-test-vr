import { FileUploader, Select, Checkbox, Button, Slider, Container, TextInput } from '../ui/pageElements';

export class JointInterface {
    constructor(interfaces) {
        this.interfaces = interfaces;
        this.allRobots = [];
        this.jointGroups = [];
        this.jointContainers = [];
        this.robotIndex = 0;
        this.robot;
    }

    addRobot(robot) {
        this.allRobots.push(robot);
        if(this.allRobots.length == 0){
            this.robot = robot;
        }

        // create sliders
        let jointContainer = new Container("jointContainer-"+robot.name, "joints", true);
        jointContainer.removeDiv();
        let jointSliders = [];

        let createPositionSliders = (container, jointSliders, robot) => {
            const X_POS_OFFSET = 0;
            const Y_POS_OFFSET = 1;
            const Z_POS_OFFSET = 0
            const MAX_POSITION = 1;
    
            let xPosSlider = new Slider("X Position", "joints", -MAX_POSITION, MAX_POSITION, 0.01, 0);
            xPosSlider.slider.oninput = () => {
                xPosSlider.label.innerHTML = "X Position: " + String(xPosSlider.slider.value);
                robot.position.x = Number(xPosSlider.slider.value) + X_POS_OFFSET;
            }
            jointSliders.push(xPosSlider);
            container.addBlock(xPosSlider);
    
            let yPosSlider = new Slider("Y Position", "joints", -MAX_POSITION, MAX_POSITION, 0.01, 0);
            yPosSlider.slider.oninput = () => {
                yPosSlider.label.innerHTML = "Y Position: " + String(yPosSlider.slider.value);
                robot.position.y = Number(yPosSlider.slider.value) + Y_POS_OFFSET;
            }
            jointSliders.push(yPosSlider);
            container.addBlock(yPosSlider);
    
            let zPosSlider = new Slider("Z Position", "joints", -MAX_POSITION, MAX_POSITION, 0.01, 0);
            zPosSlider.slider.oninput = () => {
                zPosSlider.label.innerHTML = "Z Position: " + String(zPosSlider.slider.value);
                robot.position.z = Number(zPosSlider.slider.value) + Z_POS_OFFSET;
            }
            jointSliders.push(zPosSlider);
            container.addBlock(zPosSlider);
        }

        createPositionSliders(jointContainer, jointSliders, robot);

        let jointArr = Object.entries(robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
        jointArr.forEach(joint => {

            let sliderDiv = new Slider(joint[0], "joints", joint[1].limit.lower, joint[1].limit.upper, 0.01, joint[1].jointValue[0]);
            jointContainer.addBlock(sliderDiv);

            sliderDiv.slider.oninput = () => {
                sliderDiv.label.innerHTML = joint[0] + ": " + String(sliderDiv.slider.value);
                robot.setJointValue(joint[0], sliderDiv.slider.value);
            }
            jointSliders.push(sliderDiv);
        })

        this.jointContainers.push(jointContainer);
        this.jointGroups.push(jointSliders);

        if(this.jointContainers.length == 1) {
            jointContainer.addDiv();
        }
    }

    updateSliders() {
        let robot = this.interfaces.robot.getRobot();
        let index = this.allRobots.findIndex(bot => bot == robot);
        if(index < 0) { 
            console.log("robot not found");
            return;
        } else if(robot != this.robot) {
            // change robot
            this.robot = robot;
            this.jointContainers[this.robotIndex].removeDiv();
            this.robotIndex = index;
            this.jointContainers[this.robotIndex].addDiv();
        }

        let jointSliders = this.jointGroups[this.robotIndex];
        let jointArr = Object.entries(this.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
        jointArr.forEach(joint => {
            let sliderDiv = jointSliders.find(element => element.slider.id.trim() == `${joint[0]}-slider`);
            sliderDiv.slider.value = joint[1].jointValue[0];
            sliderDiv.label.innerHTML = joint[0] + ": " + String(sliderDiv.slider.value);
        })
    }
}