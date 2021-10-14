import * as T from 'three';
import URDFLoader from 'urdf-loader';
// import { createFileUploader, createSlider, createButton, createFolderUploader, createTextInput, createCheckbox, createSelect } from './ui/inputAdders';
import { parseCSV, exportToCsv, fetchFromURL, lerp } from './helpers';
import { initScene } from './sceneInit';
import { Line3D } from './3dLine.js'
import { getURDFFromURL, getWedModifiedURDF } from './robotFunctions/loaderHelper';
import { animateRobot } from './robotFunctions/animateRobot';
import { AnimationInterface } from './interfaces/animationInterface';
import { LineInterface } from './interfaces/lineInterface';
import { JointInterface } from './interfaces/jointInterface';
import { FileUploader, Select, Checkbox, Button, Slider, Container, TextInput } from './ui/pageElements';
import { RobotInterface } from './interfaces/robotInterface';

export function simpleURDFTest() {

    let scene, camera, renderer, controls;
    let raycaster = new T.Raycaster();
    let mouse = new T.Vector2();

    let init = initScene();
    scene = init[0];
    camera = init[1];
    renderer = init[2];
    controls = init[3];

    // references
    let focusJointBall;
    let endEffectorPosition = new T.Vector3();
    let endEffectorRotation = new T.Quaternion();

    // reference to the current line
    // call the below line to update the line
    // currLine.updateLine(focusJoint.getWorldPosition(new T.Vector3()));
    let currLine;

    // ui references
    let interfaces = {
        animation: null,
        lines: null,
        joints: null,
        robot: null,
    }
    let robotInterface = new RobotInterface(scene, interfaces);
    interfaces.robot = robotInterface;

    // raycast
    raycaster.params.Line.threshold = 0.0025;
    let sphereInter = new T.Mesh(
        new T.SphereGeometry(0.005),
        new T.MeshBasicMaterial({ color: 0xff0000 })
    );
    sphereInter.visible = false;
    scene.add(sphereInter);

    // end effector
    let geom = new T.ConeGeometry(0.01, 0.03, 8);
    let mat = new T.MeshStandardMaterial({
        color: "blue"
    });
    focusJointBall = new T.Mesh(geom, mat);
    focusJointBall.visible = false;
    scene.add(focusJointBall);

    // set the joints given an array of all movable joints
    // to get such an array call this:
    // Object.entries(robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
    // currently unused/untested function, but should be handy for people who need it
    let setJoints = (config) => {
        let robot = this.interfaces.robot.getRobot();
        let jointArr = Object.entries(robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
        for (let i = 0; i < animationTable[0].length; i++) {
            robot.setJointValue(jointArr[i][0], config[0])
        }
    }

    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    // when the user clicks
    function onMouseDown(event) {
        raycaster.setFromCamera(mouse, camera);
        if(interfaces.lines) {
            let lineMeshes = interfaces.lines.getAllLineMeshes();
            if (lineMeshes.length > 0) {
                let lineExists = false;
                lineMeshes.forEach(mesh => {
                    if(mesh != null) {
                        lineExists = true;
                    }
                })
                if(lineExists) {
                    let intersects = raycaster.intersectObjects(lineMeshes, false);
                    if (intersects.length > 0) {
                        let lineGroup = interfaces.lines.getAllLines().find(group => group.line.mesh == intersects[0].object);
                        lineGroup.line.setRobotConfig(intersects[0].point);
                    }
                }
            }
        }
    }

    // animation loop
    function render() {
        let focusJoint = interfaces.robot.getFocusJoint();
        if (interfaces.animation) {
            interfaces.animation.animateSlider();
        }
        if (focusJointBall && focusJoint) {
            focusJointBall.visible = true;
            
            let focusPos = focusJoint.getWorldPosition(endEffectorPosition);
            let focusRotation = focusJoint.getWorldQuaternion(endEffectorRotation);

            focusJointBall.position.set(focusPos.x, focusPos.y, focusPos.z);
            focusJointBall.quaternion.copy(focusRotation);
        }

        // raycast
        raycaster.setFromCamera(mouse, camera);
        sphereInter.visible = false;
        if(interfaces.lines) {
            let lineMeshes = interfaces.lines.getAllLineMeshes();
            if (lineMeshes.length > 0) {
                let intersects = raycaster.intersectObjects(lineMeshes, false);
                if (intersects.length > 0) {
                    sphereInter.visible = true;
                    sphereInter.position.copy(intersects[0].point);
                }
            } 
        } 
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    window.addEventListener('mousemove', onMouseMove, false);
    document.body.addEventListener('click', onMouseDown, true);
    render();
}

